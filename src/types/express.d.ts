/* eslint-disable @typescript-eslint/consistent-type-definitions */
import "express";

import type { Request as ExRequest } from "express-serve-static-core";
import type { SessionData as ExpressSessionData, Session } from "express-session";

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
    interface SessionData extends ExpressSessionData {
      userId?: string;
      user?: {
        id?: string;
        display_name?: string;
        email?: string;
      };
      [key: string]: unknown;
    }

    interface Request extends ExRequest {
      session?: Session & SessionData;
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
