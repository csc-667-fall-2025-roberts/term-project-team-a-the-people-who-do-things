/**
 * App-level Request & Session type declarations
 *
 * This file provides lightweight, shared types for the application to reference
 * in route handlers and middleware. It intentionally avoids changing global
 * ambient types and instead exports `AppRequest` / `AppSession` for explicit use.
 *
 * Usage:
 *   import type { AppRequest } from "../types/app.d";
 *   router.get("/", (req: AppRequest, res) => { ... });
 */

import type { Request as ExRequest } from "express-serve-static-core";
import type { Session,SessionData as ExpressSessionData } from "express-session";

/**
 * Minimal user snapshot shape used in session / request attachments.
 */
export type AppUser = {
  id?: string;
  display_name?: string;
  email?: string;
};

/**
 * Application session shape (extends express-session types).
 * Add any additional runtime session fields your app relies on here.
 */
export type AppSession = Session &
  ExpressSessionData & {
    userId?: string;
    user?: AppUser | null;
    [key: string]: unknown;
  };

/**
 * Application Request type used in route handlers/middleware when you want
 * typed access to `req.session` and `req.users`.
 */
export type AppRequest = ExRequest & {
  session?: AppSession | null;
  users?: AppUser | null;
};
