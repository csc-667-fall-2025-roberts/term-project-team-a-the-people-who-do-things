import "express-session";

declare module "express-session" {
  type SessionData = {
    userId?: string;
  }
}
