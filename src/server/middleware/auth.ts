import type { NextFunction, Request, Response } from "express";
import type { Session } from "express-session";

import pool from "../config/database.js";

type AppSession = Session & {
  userId?: string;
  user?: { id?: string; display_name?: string; email?: string } | null;
  [key: string]: unknown;
};

type AppRequest = Request & {
  session?: AppSession | null;
  users?: { id?: string; display_name?: string; email?: string } | null;
};

export const requireAuth = (req: AppRequest, res: Response, next: NextFunction) => {
  if (!req.session?.userId) {
    if (req.xhr || req.headers.accept?.includes("json")) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    return res.redirect("/login");
  }
  next();
};

export const attachUser = async (req: AppRequest, res: Response, next: NextFunction) => {
  res.locals.NODE_ENV = process.env.NODE_ENV;
  if (req.session?.userId) {
    try {
      const result = await pool.query("SELECT id, email, display_name FROM users WHERE id = $1", [
        req.session.userId,
      ]);
      if (result.rows.length > 0) {
        req.users = result.rows[0];
        res.locals.users = req.users;
      }
    } catch (err) {
      console.error("Error attaching users:", err);
    }
  }
  next();
};
