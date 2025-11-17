import express from 'express';
import pool from '../config/database.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

router.get('/:gameId', requireAuth, async (req, res) => {
    const { gameId } = req.params;
    const { limit = 50, before } = req.query;

    try {
        // Handle lobby chat (gameId is 'lobby')
        const isLobby = gameId === 'lobby';
        
        let query = `
      SELECT cm.*, u.display_name
      FROM chat_messages cm
      JOIN users u ON cm.user_id = u.id
      WHERE ${isLobby ? 'cm.game_id IS NULL' : 'cm.game_id = $1'}
    `;
        const params: any[] = [];
        
        if (!isLobby) {
            params.push(gameId);
        }

        if (before) {
            query += ` AND cm.created_at < $${params.length + 1}`;
            params.push(before);
        }

        query += ` ORDER BY cm.created_at DESC LIMIT $${params.length + 1}`;
        params.push(limit);

        const result = await pool.query(query, params);

        res.json({ messages: result.rows.reverse() });
    } catch (error) {
        console.error('Get chat messages error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Post chat message
router.post('/:gameId', requireAuth, async (req, res) => {
    const { gameId } = req.params;
    const { message } = req.body;

    if (!message || message.trim().length === 0) {
        return res.status(400).json({ error: 'Message cannot be empty' });
    }

    try {
        // Handle lobby chat (gameId is 'lobby')
        const isLobby = gameId === 'lobby';
        const dbGameId = isLobby ? null : gameId;

        const result = await pool.query(
            `INSERT INTO chat_messages (game_id, user_id, message)
       VALUES ($1, $2, $3)
       RETURNING *`,
            [dbGameId, req.session.userId, message.trim()]
        );

        const userResult = await pool.query(
            'SELECT display_name FROM users WHERE id = $1',
            [req.session.userId]
        );

        const chatMessage = {
            ...result.rows[0],
            display_name: userResult.rows[0].display_name
        };

        res.json({ message: chatMessage });
    } catch (error) {
        console.error('Post chat message error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

export default router;