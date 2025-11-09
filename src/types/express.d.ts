import "express";
import type { User } from "./user";

declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}