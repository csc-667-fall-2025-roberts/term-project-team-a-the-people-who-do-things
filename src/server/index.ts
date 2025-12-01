import pgSession from "connect-pg-simple";
import express, { Request, RequestHandler, Response } from "express";
import session from "express-session";
import { createServer } from "http";
import path from "path";
import { Server, Socket } from "socket.io";
import { fileURLToPath } from "url";
import pool from "./config/database.js";
import { attachUser, requireAuth } from "./middleware/auth.js";
import authRoutes from "./routes/auth.js";
import chatRoutes from "./routes/chat.js";
import gameRoutes from "./routes/games.js";
import usersRoutes from "./routes/users.js";
import gameManager from "./services/gameManager.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer);

if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1); // trust first proxy
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
app.use("/api/games", gameRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/users", usersRoutes);

// Page routes
app.get("/", (req, res) => {
  res.render("screens/landing", { users: req.users });
});

app.get("/signup", (req, res) => {
  if (req.users) return res.redirect("/lobby");
  res.render("screens/signup");
});

app.get("/login", (req, res) => {
  if (req.users) return res.redirect("/lobby");
  res.render("screens/login");
});

app.get("/lobby", requireAuth, (req, res) => {
  res.render("screens/lobby", { user: req.users });
});

app.get("/game/:gameId", requireAuth, (req, res) => {
  console.log("Game route hit:", req.params.gameId, "User:", req.users?.id);
  res.render("screens/gameRoom", {
    user: req.users,
    gameId: req.params.gameId,
  });
});

app.get("/game/:gameId/results", requireAuth, (req, res) => {
  res.render("screens/gameResults", {
    user: req.users,
    gameId: req.params.gameId,
  });
});

app.get("/settings", requireAuth, (req, res) => {
  res.render("screens/settings", { user: req.users });
});

app.get("/error", (req, res) => {
  res.render("screens/error", { user: req.users });
});

// src/server/index.ts

app.get("/settings", requireAuth, (req, res) => {
  const safeUser = req.users || {
    display_name: "Ghost User",
    email: "error@example.com",
  };

  res.render("screens/settings", {
    user: safeUser,
    NODE_ENV: process.env.NODE_ENV,
  });
});

app.get(/.*\.map$/, (req, res) => {
  res.status(404).end();
});

app.use((req, res) => {
  res.status(404).render("screens/error", { user: req.users, message: "Page Not Found" });
});

// Socket config
function wrap(middleware: RequestHandler) {
  return (socket: Socket, next: (err?: Error) => void) => {
    middleware(socket.request as Request, {} as Response, next as any);
  };
}

io.use(wrap(sessionMiddleware));

io.on("connection", (socket: Socket) => {
  const userId = (socket.request as any).session?.userId;

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

  // Join game room
  socket.on("join-game", async (gameId: string) => {
    socket.join(gameId);

    let games = gameManager.getGame(gameId);
    if (!games) {
      // Fetch participants from db
      const result = await pool.query(
        "SELECT user_id FROM game_participants WHERE game_id = $1 ORDER BY joined_at",
        [gameId],
      );

      const game_participants: string[] = result.rows.map((r: any) => String(r.user_id));

      games = gameManager.getGame(gameId);
      if (!games) {
        games = gameManager.createGame(gameId, game_participants);
      }
    }

    // Fetch tile data from DB
    try {
      const dbHandResult = await pool.query(
        "SELECT letter FROM player_tiles WHERE game_id = $1 AND user_id = $2",
        [gameId, userId],
      );

      // If DB has tiles, force the in-memory game to match the DB
      if (dbHandResult.rows.length > 0) {
        const hand = dbHandResult.rows.map((r: any) => r.letter);
        games.playerHands[userId] = hand;
      }
    } catch (e) {
      console.error("Error syncing hand from DB:", e);
    }

    // Send game state
    const gameState = games.getGameState();
    const playerHand = games.getPlayerHand(userId);

    socket.emit("game-state", {
      ...gameState,
      hand: playerHand,
    });

    socket.to(gameId).emit("player-joined", { userId });
  });

  socket.on("make-move", async ({ gameId, tiles, words, scores }) => {
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
        `INSERT INTO scores (game_id, user_id, value)
         VALUES ($1, $2, $3)
         ON CONFLICT (game_id, user_id) DO UPDATE
         SET value = scores.value + $3`,
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

      // Remove used tiles from hand in DB
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

      // Add new tiles to DB hand
      if (result.newTiles.length > 0) {
        const newHand = result.newTiles.map((l) => `('${gameId}', '${userId}', '${l}')`).join(",");

        await pool.query(
          `INSERT INTO player_tiles (game_id, user_id, letter) 
        VALUES ${newHand}`,
        );
      }

      // Remove drawn tiles from DB bag
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
    } catch (error) {
      console.error("Error saving move:", error);
    }
  });

  socket.on("pass-turn", async ({ gameId }) => {
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
        scores: game.scores,
      });
    } else {
      io.to(gameId).emit("turn-passed", {
        userId,
        currentPlayer: result.currentPlayer,
      });
    }
  });

  socket.on("exchange-tiles", async ({ gameId, tiles }) => {
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
  });

  // Chat
  socket.on("send-message", async ({ gameId, message }) => {
    try {
      const isLobby = gameId === "lobby" || gameId === null;
      const dbGameId = isLobby ? null : gameId;

      const result = await pool.query(
        "INSERT INTO chat_messages (game_id, user_id, message) VALUES ($1, $2, $3) RETURNING *",
        [dbGameId, userId, message],
      );

      const userResult = await pool.query("SELECT display_name FROM users WHERE id = $1", [userId]);

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
