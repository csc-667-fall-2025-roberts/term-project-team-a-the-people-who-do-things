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
  userId?: string;
  user?: { id?: string; display_name?: string; email?: string } | null;
  [key: string]: unknown;
};

type AppRequest = Request & {
  session?: AppSession | null;
  users?: { id?: string; display_name?: string; email?: string } | null;
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
  console.log("Game route hit:", req.params.gameId, "User:", req.users?.id);
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
    display_name: "Ghost User",
    email: "error@example.com",
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
  res.status(404).render("screens/error", { user: req.users, message: "Page Not Found" });
});

function wrap(middleware: RequestHandler) {
  return (socket: Socket, next: (err?: Error) => void) => {
    middleware(socket.request as unknown as Request, {} as Response, next as any);
  };
}

io.use(wrap(sessionMiddleware));

io.on("connection", (socket: Socket) => {
  const req = socket.request as unknown as AppRequest;
  const userId = String(req.session?.userId ?? "");

  console.log("User connected:", userId);

  socket.data.userId = userId;

  // Join lobby room
  socket.on("join-lobby", () => {
    socket.join("lobby");
    console.log("User joined lobby:", userId);
  });

  // Leave lobby room
  socket.on("leave-lobby", () => {
    socket.leave("lobby");
    console.log("User left lobby:", userId);
  });

  // Join game lobby room
  socket.on("join-game-lobby", (payload) => {
    const data = validateOrEmitError(socket, JoinGameLobbySchema, payload);
    if (!data) return;
    const { gameId } = data;

    socket.join(gameId);
    console.log("User joined game lobby:", userId, "gameId:", gameId);

    // Notify others in the lobby
    socket.to(gameId).emit("player-joined-lobby", {
      userId,
      displayName: req.session?.user?.display_name || "Unknown",
      isHost: false,
    });
  });

  // Leave game lobby room
  socket.on("leave-game-lobby", (gameId: string) => {
    socket.leave(gameId);
    console.log("User left game lobby:", userId, "gameId:", gameId);

    socket.to(gameId).emit("player-left-lobby", { userId });
  });

  // Join game room
  socket.on("join-game", (payload) => {
    const data = validateOrEmitError(socket, JoinGameSchema, payload);
    if (!data) return;
    const { gameId } = data;

    (async () => {
      socket.join(gameId);

      try {
        const participantsResult = await pool.query(
          "SELECT user_id FROM game_participants WHERE game_id = $1 ORDER BY joined_at",
          [gameId],
        );
        const game_participants: string[] = participantsResult.rows.map((r: { user_id: unknown }) =>
          String(r.user_id),
        );

        const boardResult = await pool.query(
          "SELECT row, col, letter FROM board_tiles WHERE game_id = $1",
          [gameId],
        );

        let boardState: (string | null)[][] | null = null;

        if (boardResult.rows.length > 0) {
          boardState = Array(15)
            .fill(null)
            .map(() => Array(15).fill(null));

          for (const tile of boardResult.rows) {
            boardState[(tile as any).row][(tile as any).col] = (tile as any).letter;
          }
        }

        let game = gameManager.getGame(gameId);
        if (!game) {
          game = gameManager.createGame(gameId, game_participants, boardState);
          console.log(`Game ${gameId} loaded from DB with ${boardResult.rows.length} tiles.`);
        } else {
          if (game.players.length !== game_participants.length) {
            game.players = game_participants;
            game.players.forEach((id) => {
              if (typeof game!.scores[id] === "undefined") game!.scores[id] = 0;
              if (!game!.playerHands[id]) game!.playerHands[id] = [];
            });
          }
        }

        try {
          const dbHandResult = await pool.query(
            "SELECT letter FROM player_tiles WHERE game_id = $1 AND user_id = $2",
            [gameId, userId],
          );

          if (dbHandResult.rows.length > 0) {
            const hand = dbHandResult.rows.map((r: { letter: string }) => r.letter);
            if (userId) game.playerHands[userId] = hand;
          } else {
            console.log(`Player ${userId} has no tiles. Drawing starting hand...`);
            const newHand = game.drawTiles(7);
            if (userId) game.playerHands[userId] = newHand;

            if (newHand.length > 0 && userId) {
              const handValues = newHand
                .map((letter) => `('${gameId}', '${userId}', '${letter}')`)
                .join(",");

              await pool.query(
                `INSERT INTO player_tiles (game_id, user_id, letter) VALUES ${handValues}`,
              );
            }
          }
        } catch (e) {
          console.error("Error syncing hand:", e);
        }

        const gameState = game.getGameState();
        const playerHand = userId ? game.getPlayerHand(userId) : [];

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
        userId,
        tiles,
        score: calculatedScore,
        currentPlayer: result.currentPlayer,
        gameState: game.getGameState(),
      });

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
          `INSERT INTO _scores (game_id, user_id, value)
         VALUES ($1, $2, $3)
         ON CONFLICT (game_id, user_id) DO UPDATE
         SET value = _scores.value + $3`,
          [gameId, userId, calculatedScore],
        );
        // Save tiles to board in DB
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

        // Update turn
        await pool.query("UPDATE games SET current_turn_user_id = $1 WHERE id = $2", [
          result.currentPlayer,
          gameId,
        ]);
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
        await pool.query("UPDATE games SET status = $1, ended_at = now() WHERE id = $2", [
          "finished",
          gameId,
        ]);

        io.to(gameId).emit("game-over", {
          _scores: game.scores,
        });
      } else {
        await pool.query("UPDATE games SET current_turn_user_id = $1 WHERE id = $2", [
          result.currentPlayer,
          gameId,
        ]);

        io.to(gameId).emit("turn-passed", {
          userId,
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

      const result = game.exchangeTiles(userId, tiles);
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

        console.log("Sending chat message:", chatMessage);

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
    socket.to(gameId).emit("player-left", { userId });
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", userId);
  });
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
  //   console.log(`Environment: ${NODE_ENV}`);
  console.log(`http://localhost:${PORT}`);
});
