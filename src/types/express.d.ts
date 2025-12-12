import "express";

import type { ChatMessages } from "./chat";
import type { Games } from "./games";
import type { GameState } from "./gameState";
import type { Moves } from "./moves";
import type { Participants } from "./participants.js";
import type { Scores } from "./scores";
import type { SocketEvents } from "./socket-events.js";
import type { UserSettings } from "./user_settings.js";
import type { Users } from "./users";

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
