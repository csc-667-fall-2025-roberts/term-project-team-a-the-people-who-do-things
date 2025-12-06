import express from "express";
import pool from "../config/database.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

router.get("/:gameId", requireAuth, async (req, res) => {
  const { gameId } = req.params;
  const { limit = 50, before } = req.query;

  try {
    const isLobby = gameId === "lobby";
    const limitNum = Math.min(Number(limit) ?? 50, 100);
    const beforeCursor = typeof before === "string" ? before : undefined;

    let query: string;
    let params: (string | number)[];

    if (beforeCursor) {
      query = isLobby
        ? `SELECT cm.*, u.display_name FROM chat_messages cm
           JOIN users u ON cm.user_id = u.id
           WHERE cm.game_id IS NULL AND cm.created_at < $1
           ORDER BY cm.created_at DESC LIMIT $2`
        : `SELECT cm.*, u.display_name FROM chat_messages cm
           JOIN users u ON cm.user_id = u.id
           WHERE cm.game_id = $1 AND cm.created_at < $2
           ORDER BY cm.created_at DESC LIMIT $3`;
      params = isLobby ? [beforeCursor, limitNum] : [gameId, beforeCursor, limitNum];
    } else {
      query = isLobby
        ? `SELECT cm.*, u.display_name FROM chat_messages cm
           JOIN users u ON cm.user_id = u.id
           WHERE cm.game_id IS NULL
           ORDER BY cm.created_at DESC LIMIT $1`
        : `SELECT cm.*, u.display_name FROM chat_messages cm
           JOIN users u ON cm.user_id = u.id
           WHERE cm.game_id = $1
           ORDER BY cm.created_at DESC LIMIT $2`;
      params = isLobby ? [limitNum] : [gameId, limitNum];
    }

    const result = await pool.query(query, params);

    res.json({ messages: result.rows.reverse() });
  } catch (error) {
    console.error("Get chat messages error:", error);
    res.status(500).json({ error: "Failed to retrieve chat messages" });
  }
});

router.post("/:gameId", requireAuth, async (req, res) => {
  const { gameId } = req.params;
  const { message } = req.body;

  if (!message || message.trim().length === 0) {
    return res.status(400).json({ error: "Message cannot be empty" });
  }

  if (message.trim().length > 1000) {
    return res.status(400).json({ error: "Message too long (max 1000 characters)" });
  }

  try {
    const isLobby = gameId === "lobby";
    const dbGameId = isLobby ? null : gameId;

    const result = await pool.query(
      `INSERT INTO chat_messages (game_id, user_id, message)
       VALUES ($1, $2, $3)
       RETURNING *, (SELECT display_name FROM users WHERE id = $2) as display_name`,
      [dbGameId, req.session.userId, message.trim()],
    );

    res.json({ message: result.rows[0] });
  } catch (error) {
    console.error("Post chat message error:", error);
    res.status(500).json({ error: "Failed to post chat message" });
  }
});

export default router;
