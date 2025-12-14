import "express-session";

declare module "express-session" {
  // MUST be an interface to merge correctly, not a 'type'
  interface SessionData {
    userId?: string;
  }
}