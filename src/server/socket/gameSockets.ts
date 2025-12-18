import type { Server, Socket } from "socket.io";

import pool from "../config/database.js";
import gameManager from "../services/gameManager.js";
import {
  ExchangeTilesSchema,
  JoinGameSchema,
  MakeMoveSchema,
  PassTurnSchema,
  SendMessageSchema,
  validateOrEmitError,
} from "./validators.js";

export function registerGameSockets(io: Server, socket: Socket, userId: string) {
  socket.on("join-game", (payload) => {
    const data = validateOrEmitError(socket, JoinGameSchema, payload);
    if (!data) return;
    const { gameId } = data;

    (async () => {
      socket.join(gameId);

      try {
        let game = gameManager.getGame(gameId);

        if (!game) {
          console.log(`[Game Restore] Loading game ${gameId} from database...`);

          const gameInfoResult = await pool.query(
            "SELECT current_turn_user_id, settings_json FROM games WHERE id = $1",
            [gameId],
          );
          const currentPlayerId = gameInfoResult.rows[0]?.current_turn_user_id || null;
          const settings = gameInfoResult.rows[0]?.settings_json || {};

          const participantsResult = await pool.query(
            "SELECT user_id FROM game_participants WHERE game_id = $1 ORDER BY joined_at",
            [gameId],
          );
          const players: string[] = participantsResult.rows.map((r: { user_id: unknown }) =>
            String(r.user_id),
          );

          const boardResult = await pool.query(
            "SELECT row, col, letter FROM board_tiles WHERE game_id = $1",
            [gameId],
          );
          const boardState: (string | null)[][] = Array(15)
            .fill(null)
            .map(() => Array(15).fill(null));
          for (const tile of boardResult.rows) {
            boardState[(tile as any).row][(tile as any).col] = (tile as any).letter;
          }

          const tileBagResult = await pool.query(
            "SELECT letter FROM tile_bag WHERE game_id = $1 ORDER BY id",
            [gameId],
          );
          const tileBag: string[] = tileBagResult.rows.map((r: { letter: string }) => r.letter);

          const playerHands: Record<string, string[]> = {};
          for (const playerId of players) {
            const handResult = await pool.query(
              "SELECT letter FROM player_tiles WHERE game_id = $1 AND user_id = $2",
              [gameId, playerId],
            );
            playerHands[playerId] = handResult.rows.map((r: { letter: string }) => r.letter);
          }

          const scoresResult = await pool.query(
            "SELECT user_id, value FROM scores WHERE game_id = $1",
            [gameId],
          );
          const scores: Record<string, number> = {};
          for (const row of scoresResult.rows) {
            scores[String(row.user_id)] = row.value;
          }
          for (const playerId of players) {
            if (typeof scores[playerId] === "undefined") {
              scores[playerId] = 0;
            }
          }

          game = gameManager.restoreGame(
            gameId,
            players,
            {
              board: boardState,
              tileBag,
              playerHands,
              scores,
              currentPlayerId,
            },
            settings,
          );
        }

        const gameState = game.getGameState();
        const playerHand = userId ? game.getPlayerHand(userId) : [];
        let turnEndsAt = gameManager.getTurnEndTime(gameId);

        if (!turnEndsAt) {
          const timeLimit = Number(game.settings.timeLimit) || 60;
          gameManager.startTurnTimer(gameId, io, timeLimit);
          turnEndsAt = gameManager.getTurnEndTime(gameId);
        }

        socket.emit("game-state", {
          ...gameState,
          hand: playerHand,
          turnEndsAt,
        });

        io.to(gameId).emit("player-joined", { userId });
      } catch (e) {
        console.error("Error joining game:", e);
        socket.emit("error", { message: "Failed to join game" });
      }
    })();
  });

  socket.on("make-move", (payload) => {
    const data = validateOrEmitError(socket, MakeMoveSchema, payload);
    if (!data) return;

    (async () => {
      const { gameId, tiles, words } = data;
      const game = gameManager.getGame(gameId);
      if (!game) {
        return socket.emit("error", { message: "Game not found" });
      }

      const validation = game.validateMove(userId, tiles);
      if (!validation.valid) {
        return socket.emit("error", { message: validation.error });
      }

      const calculatedScore = game.calculateScore(tiles);
      const result = game.applyMove(userId, tiles, calculatedScore);

      const timeLimit = Number(game.settings.timeLimit) || 60;
      const turnEndsAt = Date.now() + timeLimit * 1000;

      io.to(gameId).emit("move-made", {
        userId,
        tiles,
        score: calculatedScore,
        currentPlayer: result.currentPlayer,
        gameState: game.getGameState(),
        turnEndsAt,
      });

      if (!result.gameOver) {
        gameManager.startTurnTimer(gameId, io, timeLimit);
      }

      socket.emit("new-tiles", { tiles: game.getPlayerHand(userId) });

      try {
        await pool.query(
          "INSERT INTO moves (game_id, user_id, turn_number, payload) VALUES ($1, $2, $3, $4)",
          [
            gameId,
            userId,
            game.currentPlayerIndex,
            JSON.stringify({ tiles, words, score: calculatedScore }),
          ],
        );

        await pool.query(
          `INSERT INTO scores (game_id, user_id, value)
         VALUES ($1, $2, $3)
         ON CONFLICT (game_id, user_id) DO UPDATE
         SET value = scores.value + $3`,
          [gameId, userId, calculatedScore],
        );

        const boardInsert = tiles
          .map((t: any) => `('${gameId}', ${t.row}, ${t.col}, '${t.letter}', '${userId}')`)
          .join(",");

        await pool.query(
          `INSERT INTO board_tiles (game_id, row, col, letter, placed_by)
        VALUES ${boardInsert}
        ON CONFLICT (game_id, row, col) DO NOTHING`,
        );

        for (const t of tiles) {
          await pool.query(
            `DELETE FROM player_tiles
        WHERE id IN (
        SELECT id FROM player_tiles
        WHERE game_id = $1 AND user_id = $2 AND letter = $3
        LIMIT 1
        )`,
            [gameId, userId, t.letter],
          );
        }

        if (result.newTiles.length > 0) {
          const newHand = result.newTiles
            .map((l) => `('${gameId}', '${userId}', '${l}')`)
            .join(",");

          await pool.query(
            `INSERT INTO player_tiles (game_id, user_id, letter)
        VALUES ${newHand}`,
          );
        }

        if (result.newTiles.length > 0) {
          await pool.query(
            `DELETE FROM tile_bag
            WHERE id IN (
            SELECT id FROM tile_bag
            WHERE game_id = $1
            LIMIT $2
            )`,
            [gameId, result.newTiles.length],
          );
        }

        if (result.gameOver) {
          console.log(`[Game Over] Game ${gameId} ended - player ${userId} used all tiles!`);

          await pool.query("UPDATE games SET status = $1, ended_at = now() WHERE id = $2", [
            "finished",
            gameId,
          ]);

          const finalScores = game.getGameState().scores;
          for (const [odId, finalScore] of Object.entries(finalScores)) {
            await pool.query(
              `INSERT INTO scores (game_id, user_id, value)
               VALUES ($1, $2, $3)
               ON CONFLICT (game_id, user_id) DO UPDATE SET value = $3`,
              [gameId, odId, finalScore],
            );
          }

          io.to(gameId).emit("game-over", {
            winner: userId,
            reason: "Player used all tiles!",
            scores: finalScores,
          });
        } else {
          await pool.query("UPDATE games SET current_turn_user_id = $1 WHERE id = $2", [
            result.currentPlayer,
            gameId,
          ]);
        }
      } catch (error) {
        console.error("Error saving move:", error);
      }
    })();
  });

  socket.on("pass-turn", (payload) => {
    const data = validateOrEmitError(socket, PassTurnSchema, payload);
    if (!data) return;
    const { gameId } = data;

    (async () => {
      const game = gameManager.getGame(gameId);
      if (!game) {
        return socket.emit("error", { message: "Game not found" });
      }

      const result = game.pass(userId);
      if (!result.valid) {
        return socket.emit("error", { message: result.error });
      }

      if (result.gameOver) {
        console.log(`[Game Over] Game ${gameId} ended - all players passed!`);

        await pool.query("UPDATE games SET status = $1, ended_at = now() WHERE id = $2", [
          "finished",
          gameId,
        ]);

        io.to(gameId).emit("game-over", {
          reason: "All players passed",
          scores: game.scores,
        });
      } else {
        await pool.query("UPDATE games SET current_turn_user_id = $1 WHERE id = $2", [
          result.currentPlayer,
          gameId,
        ]);

        const timeLimit = Number(game.settings.timeLimit) || 60;
        const turnEndsAt = Date.now() + timeLimit * 1000;
        io.to(gameId).emit("turn-passed", {
          userId,
          currentPlayer: result.currentPlayer,
          turnEndsAt,
        });
        if (!result.gameOver) {
          gameManager.startTurnTimer(gameId, io, timeLimit);
        }
      }
    })();
  });

  socket.on("exchange-tiles", (payload) => {
    const data = validateOrEmitError(socket, ExchangeTilesSchema, payload);
    if (!data) return;
    const { gameId, tiles } = data;

    (async () => {
      const game = gameManager.getGame(gameId);
      if (!game) {
        return socket.emit("error", { message: "Game not found" });
      }

      const result = game.exchangeTiles(userId, tiles);
      if (!result.valid) {
        return socket.emit("error", { message: result.error });
      }

      try {
        for (const letter of tiles) {
          await pool.query(
            `DELETE FROM player_tiles
             WHERE id IN (
               SELECT id FROM player_tiles
               WHERE game_id = $1 AND user_id = $2 AND letter = $3
               LIMIT 1
             )`,
            [gameId, userId, letter],
          );
        }

        if (result.newTiles && result.newTiles.length > 0) {
          const handValues = result.newTiles
            .map((letter) => `('${gameId}', '${userId}', '${letter}')`)
            .join(",");

          await pool.query(
            `INSERT INTO player_tiles (game_id, user_id, letter)
             VALUES ${handValues}`,
          );
        }

        if (result.newTiles && result.newTiles.length > 0) {
          await pool.query(
            `DELETE FROM tile_bag
             WHERE id IN (
               SELECT id FROM tile_bag
               WHERE game_id = $1
               LIMIT $2
             )`,
            [gameId, result.newTiles.length],
          );
        }

        if (tiles.length > 0) {
          const bagValues = tiles.map((letter) => `('${gameId}', '${letter}')`).join(",");
          await pool.query(
            `INSERT INTO tile_bag (game_id, letter)
             VALUES ${bagValues}`,
          );
        }

        if (result.currentPlayer) {
          await pool.query("UPDATE games SET current_turn_user_id = $1 WHERE id = $2", [
            result.currentPlayer,
            gameId,
          ]);
        }
      } catch (error) {
        console.error("Error persisting tile exchange:", error);
      }

      socket.emit("tiles-exchanged", {
        newTiles: result.newTiles,
      });
      const timeLimit = Number(game.settings.timeLimit) || 60;
      const turnEndsAt = Date.now() + timeLimit * 1000;
      io.to(gameId).emit("turn-changed", {
        currentPlayer: result.currentPlayer,
        turnEndsAt,
      });
      gameManager.startTurnTimer(gameId, io, timeLimit);
    })();
  });

  socket.on("send-message", (payload) => {
    const data = validateOrEmitError(socket, SendMessageSchema, payload);
    if (!data) return;
    const { gameId, message } = data;

    (async () => {
      try {
        const isLobby = gameId === "lobby" || gameId === null;
        const dbGameId = isLobby ? null : gameId;

        const result = await pool.query(
          "INSERT INTO chat_messages (game_id, user_id, message) VALUES ($1, $2, $3) RETURNING *",
          [dbGameId, userId, message],
        );

        const userResult = await pool.query("SELECT display_name FROM users WHERE id = $1", [
          userId,
        ]);

        const chatMessage = {
          ...result.rows[0],
          display_name: userResult.rows[0].display_name,
          game_id: result.rows[0].game_id,
        };

        if (isLobby) {
          io.to("lobby").emit("new-message", chatMessage);
        } else {
          io.to(gameId).emit("new-message", chatMessage);
        }
      } catch (error) {
        console.error("Error sending message:", error);
      }
    })();
  });

  socket.on("leave-game", (gameId) => {
    socket.leave(gameId);
    socket.to(gameId).emit("player-left", { userId });
  });
}
