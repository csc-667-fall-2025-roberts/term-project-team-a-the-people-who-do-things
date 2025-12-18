import type { Request as ExRequest } from "express-serve-static-core";
import type { Session, SessionData as ExpressSessionData } from "express-session";

export type AppUser = {
  id?: string;
  display_name?: string;
  email?: string;
};

export type AppSession = Session &
  ExpressSessionData & {
    user_ID?: string;
    user?: AppUser | null;
    [key: string]: unknown;
  };

export type AppRequest = ExRequest & {
  session?: AppSession | null;
  users?: AppUser | null;
};
