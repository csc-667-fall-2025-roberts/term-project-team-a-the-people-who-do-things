import express from "express";
import { Server } from "socket.io";
import { z } from "zod";
import pool from "../config/database.js";
import { requireAuth } from "../middleware/auth.js";
import { ScrabbleGame } from "../services/scrabbleEngine.js";

export default function gamesRouter(io: Server) {
  const router = express.Router();

  router.get("/lobby", requireAuth, async (_req, res) => {
    try {
      const result = await pool.query(
        `SELECT g.id, g.game_type, g.status, g.max_players, g.created_at,
              u.display_name as creator_name,
              COUNT(gp.user_id) as current_players
       FROM games g
       JOIN users u ON g.created_by = u.id
       LEFT JOIN game_participants gp ON g.id = gp.game_id
       WHERE g.status = 'waiting'
       GROUP BY g.id, g.game_type, g.status, g.max_players, g.created_at, u.display_name
       ORDER BY g.created_at DESC`,
        [],
      );

      res.json({ games: result.rows });
    } catch (error) {
      console.error("Get lobby error:", error);
      res.status(500).json({ error: "Failed to retrieve lobby games" });
    }
  });

  // Create new game
  const createGameSchema = z.object({
    maxPlayers: z.number().int().min(2).max(4).default(2),
    settings: z.record(z.string(), z.unknown()).optional().default({}),
  });

  router.post("/create", requireAuth, async (req, res) => {
    const validation = createGameSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: validation.error.issues });
    }
    const { maxPlayers, settings } = validation.data;

    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const gameResult = await client.query(
        `INSERT INTO games (game_type, status, max_players, settings_json, created_by)
       VALUES ('scrabble', 'waiting', $1, $2, $3)
       RETURNING id, game_type, status, max_players, created_at`,
        [maxPlayers, JSON.stringify(settings), req.session.userId],
      );

      const game = gameResult.rows[0];

      await client.query(
        `INSERT INTO game_participants (game_id, user_id, is_host)
       VALUES ($1, $2, true)`,
        [game.id, req.session.userId],
      );

      const gameLogic = new ScrabbleGame(game.id, [req.session.userId!]);

      //Transfer generated tiles into the tile bag in DB
      if (gameLogic.tileBag.length > 0) {
        const bagValues = gameLogic.tileBag
          .map((letter) => `('${game.id}', '${letter}')`)
          .join(",");

        await client.query(`INSERT INTO tile_bag (game_id, letter) VALUES ${bagValues}`);
      }

      const hostHand = gameLogic.playerHands[req.session.userId!];

      //Transfer generated hand into hand in DB
      if (hostHand && hostHand.length > 0) {
        const handValues = hostHand
          .map((letter) => `('${game.id}', '${req.session.userId}', '${letter}')`)
          .join(",");

        await client.query(
          `INSERT INTO player_tiles (game_id, user_id, letter) VALUES ${handValues}`,
        );
      }

      await client.query("COMMIT");

      res.json({ game });
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("Create game error:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to create game";
      res.status(500).json({ error: errorMessage });
    } finally {
      client.release();
    }
  });

  // Join game
  router.post("/:gameId/join", requireAuth, async (req, res) => {
    const { gameId } = req.params;

    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      // Check if game exists and has space with row lock
      const gameResult = await client.query(
        `SELECT g.*, COUNT(gp.user_id) as player_count
         FROM games g
                  LEFT JOIN game_participants gp ON g.id = gp.game_id
         WHERE g.id = $1
         GROUP BY g.id`,
        [gameId],
      );

      if (gameResult.rows.length === 0) {
        await client.query("ROLLBACK");
        return res.status(404).json({ error: "Game not found" });
      }

      const game = gameResult.rows[0];

      if (game.status !== "waiting") {
        await client.query("ROLLBACK");
        return res.status(400).json({ error: "Game already started" });
      }

      if (game.player_count >= game.max_players) {
        await client.query("ROLLBACK");
        return res.status(400).json({ error: "Game is full" });
      }

      const joinResult = await client.query(
        `INSERT INTO game_participants (game_id, user_id)
       VALUES ($1, $2)
       ON CONFLICT (game_id, user_id) DO NOTHING
       RETURNING user_id`,
        [gameId, req.session.userId],
      );

      await client.query("COMMIT");

      if (joinResult.rows.length === 0) {
        return res.json({ success: true, alreadyJoined: true });
      }

      res.json({ success: true, alreadyJoined: false });
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("Join game error:", error);
      res.status(500).json({ error: "Failed to join game" });
    } finally {
      client.release();
    }
  });

  // Get game details
  router.get("/:gameId", requireAuth, async (req, res) => {
    const { gameId } = req.params;

    try {
      const gameResult = await pool.query(
        "SELECT id, game_type, status, max_players, created_at, started_at, ended_at, created_by FROM games WHERE id = $1",
        [gameId],
      );

      if (gameResult.rows.length === 0) {
        return res.status(404).json({ error: "Game not found" });
      }

      const participantsResult = await pool.query(
        `SELECT gp.user_id as id, gp.user_id, gp.is_host, gp.joined_at, u.display_name
       FROM game_participants gp
       JOIN users u ON gp.user_id = u.id
       WHERE gp.game_id = $1
       ORDER BY gp.joined_at`,
        [gameId],
      );

      console.log(
        `[GET /api/games/${gameId}] Found ${participantsResult.rows.length} participants`,
      );
      console.log("Participants:", participantsResult.rows);

      const scoresResult = await pool.query(
        `SELECT s.user_id, s.value, s.recorded_at, u.display_name
       FROM scores s
       JOIN users u ON s.user_id = u.id
       WHERE s.game_id = $1
       ORDER BY s.value DESC`,
        [gameId],
      );

      const response = {
        game: gameResult.rows[0],
        game_participants: participantsResult.rows,
        scores: scoresResult.rows,
      };

      console.log(
        `[GET /api/games/${gameId}] Sending response:`,
        JSON.stringify(response, null, 2),
      );
      res.json(response);
    } catch (error) {
      console.error("Get game error:", error);
      res.status(500).json({ error: "Failed to retrieve game details" });
    }
  });

  // Start game
  router.post("/:gameId/start", requireAuth, async (req, res) => {
    const { gameId } = req.params;
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      console.log(`[POST /api/games/${gameId}/start] User ID:`, req.session.userId);

      // check if user is host
      const hostCheck = await client.query(
        `SELECT is_host FROM game_participants
       WHERE game_id = $1 AND user_id = $2`,
        [gameId, req.session.userId],
      );

      console.log(`[POST /api/games/${gameId}/start] Host check result:`, hostCheck.rows);

      if (hostCheck.rows.length === 0) {
        await client.query("ROLLBACK");
        console.log(`[POST /api/games/${gameId}/start] User is not a participant`);
        return res.status(403).json({ error: "You are not a participant in this game" });
      }

      if (!hostCheck.rows[0].is_host) {
        await client.query("ROLLBACK");
        console.log(`[POST /api/games/${gameId}/start] User is not the host`);
        return res.status(403).json({ error: "Only host can start a waiting game" });
      }

      // Check player count
      const gameCheckResult = await client.query(
        `SELECT g.max_players, COUNT(gp.user_id) as player_count
	       FROM games g
	       LEFT JOIN game_participants gp ON g.id = gp.game_id
	       WHERE g.id = $1
	       GROUP BY g.id, g.max_players`,
        [gameId],
      );

      if (gameCheckResult.rows.length === 0) {
        await client.query("ROLLBACK");
        console.log(`[POST /api/games/${gameId}/start] Game not found`);
        return res.status(404).json({ error: "Game not found" });
      }

      const { max_players, player_count } = gameCheckResult.rows[0];

      if (player_count > max_players) {
        await client.query("ROLLBACK");
        console.log(
          `[POST /api/games/${gameId}/start] Too many players: ${player_count}/${max_players}`,
        );
        return res.status(400).json({
          error: `Cannot start game: Too many players (${player_count}/${max_players})`,
        });
      }

      const result = await client.query(
        `UPDATE games
	       SET status = 'in_progress', started_at = now()
	       WHERE id = $1
	         AND status = 'waiting'
	       RETURNING id`,
        [gameId],
      );

      if (result.rows.length === 0) {
        await client.query("ROLLBACK");
        console.log(`[POST /api/games/${gameId}/start] Game not found or not in waiting status`);
        return res.status(403).json({ error: "Game not found or already started" });
      }

      const participantsResult = await client.query(
        `SELECT user_id FROM game_participants WHERE game_id = $1 ORDER BY joined_at`,
        [gameId],
      );

      const participants = participantsResult.rows.map((r: any) => r.user_id);

      // Set the first player as the current turn
      const firstPlayerId = participants[0];
      await client.query(`UPDATE games SET current_turn_user_id = $1 WHERE id = $2`, [
        firstPlayerId,
        gameId,
      ]);

      // Load tile bag from DB
      const tileBagResult = await client.query(
        `SELECT letter FROM tile_bag WHERE game_id = $1 ORDER BY id`,
        [gameId],
      );

      const tileBag = tileBagResult.rows.map((r: any) => r.letter);

      // Deal 7 tiles to each player
      for (const userId of participants) {
        const existingTiles = await client.query(
          `SELECT COUNT(*) as count FROM player_tiles WHERE game_id = $1 AND user_id = $2`,
          [gameId, userId],
        );

        if (parseInt(existingTiles.rows[0].count) === 0 && tileBag.length >= 7) {
          const hand = tileBag.splice(0, 7);

          // Save to player_tiles
          if (hand.length > 0) {
            const handValues = hand
              .map((letter: string) => `('${gameId}', '${userId}', '${letter}')`)
              .join(",");
            await client.query(
              `INSERT INTO player_tiles (game_id, user_id, letter) VALUES ${handValues}`,
            );
          }
        }
      }

      // Update tile bag in DB (remove dealt tiles)
      if (tileBagResult.rows.length > tileBag.length) {
        const tilesToRemove = tileBagResult.rows.length - tileBag.length;
        await client.query(
          `DELETE FROM tile_bag
         WHERE id IN (
           SELECT id FROM tile_bag
           WHERE game_id = $1
           ORDER BY id
           LIMIT $2
         )`,
          [gameId, tilesToRemove],
        );
      }

      await client.query("COMMIT");

      io.to(gameId).emit("game-started", { gameId });

      res.json({ success: true });
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("Start game error:", error);
      res.status(500).json({ error: "Failed to start game" });
    } finally {
      client.release();
    }
  });

  // Submit move
  const submitMoveSchema = z.object({
    tiles: z
      .array(
        z.object({
          letter: z.string().length(1),
          row: z.number().int().min(0).max(14),
          col: z.number().int().min(0).max(14),
        }),
      )
      .min(1),
    words: z.array(z.string()).min(1),
    score: z.number().int().min(0),
  });

  router.post("/:gameId/move", requireAuth, async (req, res) => {
    const { gameId } = req.params;

    const validation = submitMoveSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: validation.error.issues });
    }

    const { tiles, words, score } = validation.data;

    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const participantCheck = await client.query(
        `SELECT gp.user_id, g.status, g.current_turn_user_id
       FROM game_participants gp
       JOIN games g ON gp.game_id = g.id
       WHERE gp.game_id = $1 AND gp.user_id = $2`,
        [gameId, req.session.userId],
      );

      if (participantCheck.rows.length === 0) {
        await client.query("ROLLBACK");
        return res.status(403).json({ error: "Not a participant in this game" });
      }

      const { status, current_turn_user_id } = participantCheck.rows[0];

      if (status !== "in_progress") {
        await client.query("ROLLBACK");
        return res.status(400).json({ error: "Game is not in progress" });
      }

      if (current_turn_user_id && current_turn_user_id !== req.session.userId) {
        await client.query("ROLLBACK");
        return res.status(403).json({ error: "Not your turn" });
      }

      // Get current turn number
      const turnResult = await client.query(
        "SELECT COALESCE(MAX(turn_number), 0) as max_turn FROM moves WHERE game_id = $1",
        [gameId],
      );

      const turnNumber = turnResult.rows[0].max_turn + 1;

      // Insert move
      await client.query(
        `INSERT INTO moves (game_id, user_id, turn_number, payload)
       VALUES ($1, $2, $3, $4)`,
        [gameId, req.session.userId, turnNumber, JSON.stringify({ tiles, words, score })],
      );

      // Update score
      await client.query(
        `INSERT INTO scores (game_id, user_id, value)
       VALUES ($1, $2, $3)
       ON CONFLICT (game_id, user_id)
       DO UPDATE SET value = scores.value + $3`,
        [gameId, req.session.userId, score],
      );

      await client.query("COMMIT");

      res.json({ success: true, turnNumber });
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("Submit move error:", error);
      res.status(500).json({ error: "Failed to submit move" });
    } finally {
      client.release();
    }
  });

  return router;
}
