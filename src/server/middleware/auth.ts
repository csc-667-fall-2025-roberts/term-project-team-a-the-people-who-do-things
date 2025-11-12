import type { Request, Response, NextFunction } from "express";
import type { Pool } from "pg";

// Protect routes
export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  if (!req.session.userId) {
    if (req.xhr || req.headers.accept?.includes("json")) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    return res.redirect("/login");
  }
  next();
};

// Attach req.user and res.locals.user if logged in
export const attachUser = async (req: Request, res: Response, next: NextFunction) => {
  if (req.session.userId) {
    try {
      // dynamic import avoids circular deps with index.ts
      const { default: pool }: { default: Pool } = await import("../config/database.js");
      const result = await pool.query(
        "SELECT id, email, display_name FROM users WHERE id = $1",
        [req.session.userId]
      );
      if (result.rows.length > 0) {
        req.user = result.rows[0];
        res.locals.user = req.user;
      }
    } catch (err) {
      console.error("Error attaching user:", err);
    }
  }
  next();
};