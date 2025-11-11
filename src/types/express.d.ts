import "express";
import type { User } from "./user";
import {Participants} from "./participants";
import {Games} from "./games";
import {ChatMessages} from "./chat";
import {Scores} from "./scores";
import {Moves} from "./moves";
import {GameState} from "./gameState";

declare global {
  namespace Express {
    interface Request {
        chat_messages?: ChatMessages;
        gameState?: GameState;
        game_participants?: Participants;
        games?: Games;
        moves?: Moves;
        scores?: Scores;
        user?: User;
    }
  }
}