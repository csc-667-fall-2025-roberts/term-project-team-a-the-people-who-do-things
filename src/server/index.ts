import pgSession from "connect-pg-simple";
import dotenv from "dotenv";
import express from "express";
import { Request, RequestHandler, Response } from "express";
import session from "express-session";
import { createServer } from "http";
import path from "path";
import { Server, Socket } from "socket.io";
import { fileURLToPath } from "url";
import pool from "./config/database.ts";
import { attachUser, requireAuth } from "./middleware/auth.ts";
import authRoutes from "./routes/auth.ts";
import chatRoutes from "./routes/chat.ts";
import gameRoutes from "./routes/games.ts";
import usersRoutes from "./routes/users.ts";
import gameManager from "./services/gameManager.ts";
import { User } from "../types/client/dom.ts";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files - in production, serve from dist/public, in dev serve from src/public
if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "../public")));
} else {
  // In development, Vite serves the frontend
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

app.get("/games/:gameId", requireAuth, (req, res) => {
  res.render("screens/gameRoom", {
    user: req.users,
    gameId: req.params.gameId,
  });
});

app.get("/games/:gameId/results", requireAuth, (req, res) => {
  res.render("screens/gameResults", {
    user: req.users,
    gameId: req.params.gameId,
  });
});

app.get("/settings", requireAuth, (req, res) => {
  res.render("screens/settings", { user: req.users });
});

interface SocketSession extends Socket {
  request: Request & {
    response: Response;
    session: {
      userId: keyof User | null;
    };
  };
}
  
// Socket config
function wrap(middleware: RequestHandler) {
  return (socket: Socket, next: (err?: Error) => void) => {
    middleware(socket.request as Request, {} as Response, next as any);
  };
}

io.use(wrap(sessionMiddleware));

io.on("connection", (socket: Socket) => {
  const userId = (socket.request as any).session?.userId;

  if (!userId) {
    socket.disconnect();
    return;
  }

  console.log("User connected:", userId);
  
  socket.data.userId = userId;
  
  socket.on('disconnect', () => {
    console.log('User disconnected:', userId);
  });

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

      const game_participants: number[] = result.rows.map((r: any) => r.user_id);
      games = gameManager.createGame(gameId, userId);
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

    socket.emit("new-tiles", { tiles: result.newTiles });

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
