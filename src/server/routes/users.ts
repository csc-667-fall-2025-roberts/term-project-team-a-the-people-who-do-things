import bcrypt from "bcrypt";
import express from "express";
import pool from "../config/database.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

router.put("/update", requireAuth, async (req, res) => {
  const { displayName, email } = req.body;

  try {
    const result = await pool.query(
      `UPDATE users
       SET display_name = $1, email = $2, updated_at = now()
       WHERE id = $3
       RETURNING id, email, display_name`,
      [displayName, email, req.session.userId],
    );

    res.json({ user: result.rows[0] });
  } catch (error) {
    if ((error as any).code !== "23505") {
      //FIXME: we could check for database like error
      console.error("Update user error:", error);
      res.status(500).json({ error: "Server error" });
    } else {
      return res.status(400).json({ error: "Email already exists" });
    }
  }
});

router.get("/preferences", requireAuth, async (req, res) => {
  try {
    const result = await pool.query("SELECT preferences FROM user_settings WHERE user_id = $1", [
      req.session.userId,
    ]);

    const preferences = result.rows.length > 0 ? result.rows[0].preferences : {};

    res.json({ preferences });
  } catch (error) {
    console.error("Get preferences error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

router.put("/preferences", requireAuth, async (req, res) => {
  const { preferences } = req.body;

  try {
    await pool.query(
      `INSERT INTO user_settings (user_id, preferences)
       VALUES ($1, $2)
       ON CONFLICT (user_id)
       DO UPDATE SET preferences = $2, updated_at = now()`,
      [req.session.userId, JSON.stringify(preferences)],
    );

    res.json({ success: true });
  } catch (error) {
    console.error("Update preferences error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

router.put("/password", requireAuth, async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  try {
    const result = await pool.query("SELECT password_hash FROM users WHERE id = $1", [
      req.session.userId,
    ]);

    const user = result.rows[0];
    const valid = await bcrypt.compare(currentPassword, user.password_hash);

    if (!valid) {
      return res.status(401).json({ error: "Current password is incorrect" });
    }

    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    await pool.query("UPDATE users SET password_hash = $1, updated_at = now() WHERE id = $2", [
      newPasswordHash,
      req.session.userId,
    ]);

    res.json({ success: true });
  } catch (error) {
    console.error("Change password error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
