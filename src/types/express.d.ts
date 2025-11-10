import "express";
import type { User } from "./user";
import {Participants} from "./participants";
import {Games} from "./games.js";
import {ChatMessages} from "./chat.js";
import {Scores} from "./scores.js";
import {Moves} from "./moves.js";

declare global {
  namespace Express {
    interface Request {
      user?: User;
      game_participants?: Participants;
      games?: Games;
      chat_messages?: ChatMessages;
      scores?: Scores;
      moves?: Moves;
    }
  }
}