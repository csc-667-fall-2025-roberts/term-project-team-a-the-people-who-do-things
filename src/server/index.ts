import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

import pgSession from "connect-pg-simple";
import express, { Request, Response } from "express";
import session from "express-session";
import { Server } from "socket.io";

import pool from "./config/database.js";
import { attachUser, requireAuth } from "./middleware/auth.js";
import authRoutes from "./routes/auth.js";
import chatRoutes from "./routes/chat.js";
import dictionaryRoutes from "./routes/dictionary.js";
import gameRoutes from "./routes/games.js";
import usersRoutes from "./routes/users.js";
import { registerSocketHandlers } from "./socket/handlers.js";

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

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "../public")));
} else {
  app.use(express.static(path.join(__dirname, "../public")));
}

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
    maxAge: 30 * 24 * 60 * 60 * 1000,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  },
});

app.use(sessionMiddleware);
app.use(attachUser);

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "../views"));

app.use((req, res, next) => {
  res.locals.NODE_ENV = process.env.NODE_ENV;
  next();
});

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
  });
});

app.get("/game/:gameId", requireAuth, (req: AppRequest, res: Response) => {
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

app.get("/error", (req: AppRequest, res: Response) => {
  res.render("screens/error", { user: req.users });
});

app.get("/settings", requireAuth, (req: AppRequest, res: Response) => {
  const safeUser = req.users || {
    display_name: "Ghost User",
    email: "error@example.com",
  };

  res.render("screens/settings", {
    user: safeUser,
  });
});

app.get(/.*\.map$/, (req: AppRequest, res: Response) => {
  res.status(404).end();
});

app.use((req: AppRequest, res: Response) => {
  res.status(404).render("screens/error", { user: req.users, message: "Page Not Found" });
});

registerSocketHandlers(io, sessionMiddleware);

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
  console.log(`http://localhost:${PORT}`);
});
