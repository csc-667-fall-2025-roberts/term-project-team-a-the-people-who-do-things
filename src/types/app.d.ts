import type { Request as ExRequest } from "express-serve-static-core";
import type { SessionData as ExpressSessionData, Session } from "express-session";

export type AppUser = {
  id?: string;
  display_name?: string;
  email?: string;
};

export type AppSession = Session &
  ExpressSessionData & {
    userId?: string;
    user?: AppUser | null;
    [key: string]: unknown;
  };

export type AppRequest = ExRequest & {
  session?: AppSession | null;
  users?: AppUser | null;
};
