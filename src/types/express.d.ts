import "express";
import type { User } from "./user";
import {Participants} from "./participants";
import {Games} from "./games.js";

declare global {
  namespace Express {
    interface Request {
      user?: User;
      participants?: Participants;
      games?: Games;
    }
  }
}