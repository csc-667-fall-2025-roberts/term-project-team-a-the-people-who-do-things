import type { Request, RequestHandler, Response } from "express";
import type { Server, Socket } from "socket.io";

import { registerGameSockets } from "./gameSockets.js";
import { registerLobbySockets } from "./lobbySockets.js";

type AppSession = import("express-session").Session & {
  userId?: string;
  user?: { id?: string; display_name?: string; email?: string } | null;
  [key: string]: unknown;
};

type AppRequest = Request & {
  session?: AppSession | null;
  users?: { id?: string; display_name?: string; email?: string } | null;
};

function wrap(middleware: RequestHandler) {
  return (socket: Socket, next: (err?: Error) => void) => {
    middleware(socket.request as unknown as Request, {} as Response, next as any);
  };
}

export function registerSocketHandlers(io: Server, sessionMiddleware: RequestHandler) {
  io.use(wrap(sessionMiddleware));

  io.on("connection", (socket: Socket) => {
    const req = socket.request as unknown as AppRequest;
    const userId = String(req.session?.userId ?? "");
    const displayName = req.session?.user?.display_name || "Unknown";

    socket.data.userId = userId;

    registerLobbySockets(io, socket, userId, displayName);
    registerGameSockets(io, socket, userId);

    socket.on("disconnect", () => {
      // No-op; hook kept for future use
    });
  });
}
