import bcrypt from "bcrypt";
import express from "express";

import type { AppRequest } from "../../types/app.d";
import pool from "../config/database.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

router.put("/update", requireAuth, async (req: express.Request, res: express.Response) => {
  const r = req as AppRequest;
  const { displayName, email } = req.body;

  if (!r.session || !r.session.userId) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  try {
    const result = await pool.query(
      `UPDATE users
       SET display_name = $1, email = $2, updated_at = now()
       WHERE id = $3
       RETURNING id, email, display_name`,
      [displayName, email, r.session.userId],
    );

    return res.json({ user: result.rows[0] });
  } catch (error) {
    if ((error as any).code !== "23505") {
      console.error("Update user error:", error);
      return res.status(500).json({ error: "Server error" });
    } else {
      return res.status(400).json({ error: "Email already exists" });
    }
  }
});

router.get("/preferences", requireAuth, async (req: express.Request, res: express.Response) => {
  const r = req as AppRequest;

  if (!r.session || !r.session.userId) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  try {
    const result = await pool.query("SELECT preferences FROM user_settings WHERE user_id = $1", [
      r.session.userId,
    ]);

    const preferences = result.rows.length > 0 ? result.rows[0].preferences : {};

    return res.json({ preferences });
  } catch (error) {
    console.error("Get preferences error:", error);
    return res.status(500).json({ error: "Server error" });
  }
});

router.put("/preferences", requireAuth, async (req: express.Request, res: express.Response) => {
  const r = req as AppRequest;
  const { preferences } = req.body;

  if (!r.session || !r.session.userId) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  try {
    await pool.query(
      `INSERT INTO user_settings (user_id, preferences)
       VALUES ($1, $2)
       ON CONFLICT (user_id)
       DO UPDATE SET preferences = $2, updated_at = now()`,
      [r.session.userId, JSON.stringify(preferences)],
    );

    return res.json({ success: true });
  } catch (error) {
    console.error("Update preferences error:", error);
    return res.status(500).json({ error: "Server error" });
  }
});

router.put("/password", requireAuth, async (req: express.Request, res: express.Response) => {
  const r = req as AppRequest;
  const { currentPassword, newPassword } = req.body;

  if (!r.session || !r.session.userId) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  try {
    const result = await pool.query("SELECT password_hash FROM users WHERE id = $1", [
      r.session.userId,
    ]);

    const user = result.rows[0];
    const valid = await bcrypt.compare(currentPassword, user.password_hash);

    if (!valid) {
      return res.status(401).json({ error: "Current password is incorrect" });
    }

    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    await pool.query("UPDATE users SET password_hash = $1, updated_at = now() WHERE id = $2", [
      newPasswordHash,
      r.session.userId,
    ]);

    return res.json({ success: true });
  } catch (error) {
    console.error("Change password error:", error);
    return res.status(500).json({ error: "Server error" });
  }
});

export default router;
