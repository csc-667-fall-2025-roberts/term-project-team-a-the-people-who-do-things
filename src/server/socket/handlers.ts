import type { RequestHandler } from "express";
import type { Server } from "socket.io";

import { registerSocketHandlers as baseRegisterSocketHandlers } from "./index.js";

export function registerSocketHandlers(io: Server, sessionMiddleware: RequestHandler) {
  // Thin wrapper so callers can import from 'server/socket/handlers'
  return baseRegisterSocketHandlers(io, sessionMiddleware);
}
