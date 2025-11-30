import type { Request, Response, NextFunction } from "express";
import pool from "../config/database";

export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  if (!req.session.userId) {
    if (req.xhr || req.headers.accept?.includes("json")) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    return res.redirect("/login");
  }
  next();
};

export const attachUser = async (req: Request, res: Response, next: NextFunction) => {
  res.locals.NODE_ENV = process.env.NODE_ENV;
    if (req.session.userId) {
    try {
      const result = await pool.query(
        "SELECT id, email, display_name FROM users WHERE id = $1",
        [req.session.userId]
      );
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