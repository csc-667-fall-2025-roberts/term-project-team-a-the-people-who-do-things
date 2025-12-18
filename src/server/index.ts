import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

import pgSession from "connect-pg-simple";
import express, { Request, RequestHandler, Response } from "express";
import session from "express-session";
import { Server, Socket } from "socket.io";

import pool from "./config/database.js";
import { attachUser, requireAuth } from "./middleware/auth.js";
import authRoutes from "./routes/auth.js";
import chatRoutes from "./routes/chat.js";
import dictionaryRoutes from "./routes/dictionary.js";
import gameRoutes from "./routes/games.js";
import usersRoutes from "./routes/users.js";
import gameManager from "./services/gameManager.js";
import {
  ExchangeTilesSchema,
  JoinGameLobbySchema,
  JoinGameSchema,
  MakeMoveSchema,
  PassTurnSchema,
  SendMessageSchema,
  validateOrEmitError,
} from "./socket-validators.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

type AppSession = import("express-session").Session & {
  userId?: string; // pii-ignore-next-line
  user?: { id?: string; display_name?: string; email?: string } | null; // pii-ignore-next-line
  [key: string]: unknown;
};

type AppRequest = Request & {
  session?: AppSession | null;
  users?: { id?: string; display_name?: string; email?: string } | null; // pii-ignore-next-line
};

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer);

if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static
if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "../public")));
} else {
  app.use(express.static(path.join(__dirname, "../public")));
}

// Session config
const PgSession = pgSession(session);
const sessionMiddleware = session({
  store: new PgSession({
    pool,
    tableName: "user_sessions",
  }),
  secret: process.env.SESSION_SECRET || "scrabble-secret-key-change-in-production",
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  },
});

app.use(sessionMiddleware);
app.use(attachUser);

// View engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "../views"));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/dictionary", dictionaryRoutes);
app.use("/api/games", gameRoutes(io));
app.use("/api/chat", chatRoutes);
app.use("/api/users", usersRoutes);

app.get("/", (req: AppRequest, res: Response) => {
  res.render("screens/landing", { users: req.users });
});

app.get("/signup", (req: AppRequest, res: Response) => {
  if (req.users) return res.redirect("/lobby");
  res.render("screens/signup");
});

app.get("/login", (req: AppRequest, res: Response) => {
  if (req.users) return res.redirect("/lobby");
  res.render("screens/login");
});

app.get("/lobby", requireAuth, (req: AppRequest, res: Response) => {
  res.render("screens/lobby", { user: req.users });
});

app.get("/game/:gameId/lobby", requireAuth, (req: AppRequest, res: Response) => {
  res.render("screens/gameLobby", {
    user: req.users,
    gameId: req.params.gameId,
    NODE_ENV: process.env.NODE_ENV,
  });
});

app.get("/game/:gameId", requireAuth, (req: AppRequest, res: Response) => {
  //console.log("Game route hit:", req.params.gameId, "User:", req.users?.id);
  res.render("screens/gameRoom", {
    user: req.users,
    gameId: req.params.gameId,
  });
});

app.get("/game/:gameId/results", requireAuth, (req: AppRequest, res: Response) => {
  res.render("screens/gameResults", {
    user: req.users,
    gameId: req.params.gameId,
  });
});

app.get("/settings", requireAuth, (req: AppRequest, res: Response) => {
  res.render("screens/settings", { user: req.users });
});

app.get("/error", (req: AppRequest, res: Response) => {
  res.render("screens/error", { user: req.users });
});

// src/server/index.ts

app.get("/settings", requireAuth, (req: AppRequest, res: Response) => {
  const safeUser = req.users || {
    display_name: "Ghost User", // pii-ignore-next-line
    email: "error@example.com", // pii-ignore-next-line
  };

  res.render("screens/settings", {
    user: safeUser,
    NODE_ENV: process.env.NODE_ENV,
  });
});

app.get(/.*\.map$/, (req: AppRequest, res: Response) => {
  res.status(404).end();
});

app.use((req: AppRequest, res: Response) => {
  res.status(404).render("screens/error", { user: req.users, message: "Page Not Found" }); // pii-ignore-next-line
});

function wrap(middleware: RequestHandler) {
  return (socket: Socket, next: (err?: Error) => void) => {
    middleware(socket.request as unknown as Request, {} as Response, next as any);
  };
}

io.use(wrap(sessionMiddleware));

io.on("connection", (socket: Socket) => {
  const req = socket.request as unknown as AppRequest;
  const userId = String(req.session?.userId ?? ""); // pii-ignore-next-line

  //console.log("User connected:", userId);

  socket.data.userId = userId; // pii-ignore-next-line

  // Join lobby room
  socket.on("join-lobby", () => {
    socket.join("lobby");
    //console.log("User joined lobby:", userId);
  });

  // Leave lobby room
  socket.on("leave-lobby", () => {
    socket.leave("lobby");
    //console.log("User left lobby:", userId);
  });

  // Join game lobby room
  socket.on("join-game-lobby", (payload) => {
    const data = validateOrEmitError(socket, JoinGameLobbySchema, payload);
    if (!data) return;
    const { gameId } = data;

    socket.join(gameId);
    //console.log("User joined game lobby:", userId, "gameId:", gameId);

    // Notify others in the lobby
    socket.to(gameId).emit("player-joined-lobby", {
      userId, // pii-ignore-next-line
      displayName: req.session?.user?.display_name || "Unknown", // pii-ignore-next-line
      isHost: false,
    });
  });

  // Leave game lobby room
  socket.on("leave-game-lobby", async (gameId: string) => {
    socket.leave(gameId);
    //console.log("User left game lobby:", userId, "gameId:", gameId);

    try {
      // 1. Check if the game is still in 'waiting' status
      const gameResult = await pool.query(
        "SELECT status, created_by FROM games WHERE id = $1",
        [gameId]
      );

      // If game doesn't exist or is already started, don't remove player
      if (gameResult.rows.length === 0 || gameResult.rows[0].status !== 'waiting') {
        console.log("Game already started or doesn't exist, not removing player");
        return;
      }

      // 2. HOST MIGRATION LOGIC
      // Check if the leaving user is the host
      const participantResult = await pool.query(
        "SELECT is_host FROM game_participants WHERE game_id = $1 AND user_id = $2",
        [gameId, userId]
      );

      const isHost = participantResult.rows.length > 0 && participantResult.rows[0].is_host;

      // 3. Remove the player
      await pool.query(
        "DELETE FROM game_participants WHERE game_id = $1 AND user_id = $2",
        [gameId, userId]
      );
      console.log("Removed player from game_participants:", userId, "gameId:", gameId);

      // 4. If they were host, promote the next oldest player
      if (isHost) {
        // Find the oldest remaining player
        const nextHostResult = await pool.query(
          "SELECT user_id FROM game_participants WHERE game_id = $1 ORDER BY joined_at ASC LIMIT 1",
          [gameId]
        );

        if (nextHostResult.rows.length > 0) {
          const newHostId = nextHostResult.rows[0].user_id;
          console.log(`Host left. Promoting user ${newHostId} to host.`);

          // Set is_host = true for the new person
          await pool.query(
            "UPDATE game_participants SET is_host = true WHERE game_id = $1 AND user_id = $2",
            [gameId, newHostId]
          );

          // Update the game's creator (so the lobby logic recognizes them as owner)
          await pool.query(
            "UPDATE games SET created_by = $1 WHERE id = $2",
            [newHostId, gameId]
          );
        }
      }

      // 5. Get updated player count for notification
      const countResult = await pool.query(
        "SELECT COUNT(*) as count FROM game_participants WHERE game_id = $1",
        [gameId]
      );
      const playerCount = parseInt(countResult.rows[0].count);

      // Notify others in the game lobby
      socket.to(gameId).emit("player-left-lobby", { userId, playerCount });

      // Notify the main lobby to refresh the games list
      io.to("lobby").emit("lobby-updated");

      // If no players left, delete the game
      if (playerCount === 0) {
        await pool.query("DELETE FROM games WHERE id = $1", [gameId]);
        console.log("Deleted empty game:", gameId);
      }
    } catch (error) {
      console.error("Error removing player from game:", error);
    }
  });

  // Join game room - with full game state restoration from database
  socket.on("join-game", (payload) => {
    const data = validateOrEmitError(socket, JoinGameSchema, payload);
    if (!data) return;
    const { gameId } = data; // pii-ignore-next-line

    (async () => {
      socket.join(gameId);

      try {
        // Check if game already exists in memory
        let game = gameManager.getGame(gameId);
        
        if (!game) {
          // Game not in memory - restore from database
          console.log(`[Game Restore] Loading game ${gameId} from database...`);
          
          // 1. Get game info (current turn)
          const gameInfoResult = await pool.query(
            "SELECT current_turn_user_id, settings_json FROM games WHERE id = $1",
            [gameId]
          );
          const currentPlayerId = gameInfoResult.rows[0]?.current_turn_user_id || null;
          const settings = gameInfoResult.rows[0]?.settings_json || {};

          // 2. Get participants
          const participantsResult = await pool.query(
            "SELECT user_id FROM game_participants WHERE game_id = $1 ORDER BY joined_at",
            [gameId],
          );
          const players: string[] = participantsResult.rows.map((r: { user_id: unknown }) =>
            String(r.user_id),
          );

          // 3. Get board state
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

          // 4. Get tile bag
          const tileBagResult = await pool.query(
            "SELECT letter FROM tile_bag WHERE game_id = $1 ORDER BY id",
            [gameId],
          );
          const tileBag: string[] = tileBagResult.rows.map((r: { letter: string }) => r.letter);

          // 5. Get all player hands
          const playerHands: Record<string, string[]> = {};
          for (const playerId of players) {
            const handResult = await pool.query(
              "SELECT letter FROM player_tiles WHERE game_id = $1 AND user_id = $2",
              [gameId, playerId],
            );
            playerHands[playerId] = handResult.rows.map((r: { letter: string }) => r.letter);
          }

          // 6. Get scores
          const scoresResult = await pool.query(
            "SELECT user_id, value FROM scores WHERE game_id = $1",
            [gameId],
          );
          const scores: Record<string, number> = {};
          for (const row of scoresResult.rows) {
            scores[String(row.user_id)] = row.value;
          }
          // Initialize scores for players without entries
          for (const playerId of players) {
            if (typeof scores[playerId] === "undefined") {
              scores[playerId] = 0;
            }
          }

          // 7. Restore the game
          game = gameManager.restoreGame(gameId, players, {
            board: boardState,
            tileBag,
            playerHands,
            scores,
            currentPlayerId,
          },
          settings
        );
        }

        // Send current game state to the joining player
        const gameState = game.getGameState();
        const playerHand = userId ? game.getPlayerHand(userId) : []; // pii-ignore-next-line

        socket.emit("game-state", {
          ...gameState,
          hand: playerHand,
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

      io.to(gameId).emit("move-made", {
        userId, // pii-ignore-next-line
        tiles,
        score: calculatedScore,
        currentPlayer: result.currentPlayer,
        gameState: game.getGameState(),
      });

      socket.emit("new-tiles", { tiles: game.getPlayerHand(userId) }); // pii-ignore-next-line

      try {
        await pool.query(
          "INSERT INTO moves (game_id, user_id, turn_number, payload) VALUES ($1, $2, $3, $4)",
          [
            gameId,
            userId, // pii-ignore-next-line
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
        // Save tiles to board in DB
        const boardInsert = tiles
          .map((t: any) => `('${gameId}', ${t.row}, ${t.col}, '${t.letter}', '${userId}')`) // pii-ignore-next-line
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
            [gameId, userId, t.letter], // pii-ignore-next-line
          );
        }

        if (result.newTiles.length > 0) {
          const newHand = result.newTiles
            .map((l) => `('${gameId}', '${userId}', '${l}')`) // pii-ignore-next-line
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

        // Check if game is over (player used all tiles with empty bag)
        if (result.gameOver) {
          console.log(`[Game Over] Game ${gameId} ended - player ${userId} used all tiles!`);
          
          // Update game status to finished
          await pool.query("UPDATE games SET status = $1, ended_at = now() WHERE id = $2", [
            "finished",
            gameId,
          ]);

          // Update final scores in database
          const finalScores = game.getGameState().scores;
          for (const [odId, finalScore] of Object.entries(finalScores)) {
            await pool.query(
              `INSERT INTO scores (game_id, user_id, value)
               VALUES ($1, $2, $3)
               ON CONFLICT (game_id, user_id) DO UPDATE SET value = $3`,
              [gameId, odId, finalScore]
            );
          }

          // Emit game over event
          io.to(gameId).emit("game-over", {
            winner: userId,
            reason: "Player used all tiles!",
            scores: finalScores,
          });
        } else {
          // Update turn for next player
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

      const result = game.pass(userId); // pii-ignore-next-line
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

        io.to(gameId).emit("turn-passed", {
          userId, // pii-ignore-next-line
          currentPlayer: result.currentPlayer,
        });
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

      const result = game.exchangeTiles(userId, tiles); // pii-ignore-next-line
      if (!result.valid) {
        return socket.emit("error", { message: result.error });
      }

      socket.emit("tiles-exchanged", {
        newTiles: result.newTiles,
      });

      io.to(gameId).emit("turn-changed", {
        currentPlayer: result.currentPlayer,
      });
    })();
  });

  // Chat
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
          [dbGameId, userId, message], // pii-ignore-next-line
        );

        const userResult = await pool.query("SELECT display_name FROM users WHERE id = $1", [
          userId, // pii-ignore-next-line
        ]);

        const chatMessage = {
          ...result.rows[0],
          display_name: userResult.rows[0].display_name,
          game_id: result.rows[0].game_id,
        };

        //console.log("Sending chat message:", chatMessage);

        if (isLobby) {
          console.log("Emitting to lobby room");
          io.to("lobby").emit("new-message", chatMessage);
        } else {
          io.to(gameId).emit("new-message", chatMessage);
        }
      } catch (error) {
        console.error("Error sending message:", error);
      }
    })();
  });

  // Leave game
  socket.on("leave-game", (gameId) => {
    socket.leave(gameId);
    socket.to(gameId).emit("player-left", { userId }); // pii-ignore-next-line
  });

  socket.on("disconnect", () => {
    //console.log("User disconnected:", userId);
  });
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
  //   console.log(`Environment: ${NODE_ENV}`);
  console.log(`http://localhost:${PORT}`);
});
