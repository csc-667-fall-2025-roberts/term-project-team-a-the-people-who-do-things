import "express";
import type { Users } from "./users";
import type {Participants} from "./participants.js";
import type {Games} from "./games";
import type {ChatMessages} from "./chat";
import type {Scores} from "./scores";
import type {Moves} from "./moves";
import type {GameState} from "./gameState";
import type {UserSettings} from "./user_settings.js";
import type {SocketEvents} from "./socket-events.js";

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
        socketEvents?: SocketEvents;
    }
  }
}
