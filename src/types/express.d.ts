import "express";
import type { Users } from "./users";
import type {Participants} from "./participants";
import type {Games} from "./games";
import type {ChatMessages} from "./chat";
import type {Scores} from "./scores";
import type {Moves} from "./moves";
import type {GameState} from "./gameState";
import {UserSettings} from "./user_settings.js";
//import type {SocketEvents} from "./socket-events.ts";

declare global {
  namespace Express {
    interface Request {
        chat_messages?: ChatMessages;
        gameState?: GameState;
        game_participants?: Participants;
        games?: Games;
        moves?: Moves;
        scores?: Scores;
        users?: Users;
        user_settings?: UserSettings;
    }
  }
}
