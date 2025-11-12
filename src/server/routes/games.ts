import express from 'express';
import pool from '../config/database.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// (lobby)
router.get('/lobby', requireAuth, async (_req, res) => {
    try {
        const result = await pool.query(
            `SELECT g.*, 
              u.display_name as creator_name,
              COUNT(gp.user_id) as current_players
       FROM games g
       JOIN users u ON g.created_by = u.id
       LEFT JOIN game_participants gp ON g.id = gp.game_id
       WHERE g.status = 'waiting'
       GROUP BY g.id, u.display_name
       ORDER BY g.created_at DESC`,
            []
        );

        res.json({ games: result.rows });
    } catch (error) {
        console.error('Get lobby error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// new game
router.post('/create', requireAuth, async (req, res) => {
    const { maxPlayers = 2, user_settings} = req.body;
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const gameResult = await client.query(
            `INSERT INTO games (game_type, status, max_players, settings_json, created_by)
       VALUES ('scrabble', 'waiting', $1, $2, $3)
       RETURNING *`,
            [maxPlayers, JSON.stringify(user_settings), req.session.userId]
        );

        const game = gameResult.rows[0];

        await client.query(
            `INSERT INTO game_participants (game_id, user_id, is_host)
       VALUES ($1, $2, true)`,
            [game.id, req.session.userId]
        );

        await client.query('COMMIT');

        res.json({ game });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Create game error:', error);
        res.status(500).json({ error: 'Server error' });
    } finally {
        client.release();
    }
});

// Join game
router.post('/:gameId/join', requireAuth, async (req, res) => {
    const { gameId } = req.params;

    try {
        // Check if game exists and has space
        const gameResult = await pool.query(
            `SELECT g.*, COUNT(gp.user_id) as current_players
       FROM games g
       LEFT JOIN game_participants gp ON g.id = gp.game_id
       WHERE g.id = $1 AND g.status = 'waiting'
       GROUP BY g.id`,
            [gameId]
        );

        if (gameResult.rows.length === 0) {
            return res.status(404).json({ error: 'Game not found or already started' });
        }

        const game = gameResult.rows[0];
        if (game.current_players >= game.max_players) {
            return res.status(400).json({ error: 'Game is full' });
        }

        await pool.query(
            `INSERT INTO game_participants (game_id, user_id)
       VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
            [gameId, req.session.userId]
        );

        res.json({ success: true });
    } catch (error) {
        console.error('Join game error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

router.get('/:gameId', requireAuth, async (req, res) => {
    const { gameId } = req.params;

    try {
        const gameResult = await pool.query(
            'SELECT * FROM games WHERE id = $1',
            [gameId]
        );

        if (gameResult.rows.length === 0) {
            return res.status(404).json({ error: 'Game not found' });
        }

        const participantsResult = await pool.query(
            `SELECT gp.*, u.display_name 
       FROM game_participants gp
       JOIN users u ON gp.user_id = u.id
       WHERE gp.game_id = $1
       ORDER BY gp.joined_at`,
            [gameId]
        );

        const scoresResult = await pool.query(
            `SELECT s.*, u.display_name
       FROM scores s
       JOIN users u ON s.user_id = u.id
       WHERE s.game_id = $1
       ORDER BY s.value DESC`,
            [gameId]
        );

        res.json({
            game: gameResult.rows[0],
            game_participants: participantsResult.rows,
            scores: scoresResult.rows
        });
    } catch (error) {
        console.error('Get game error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});


router.post('/:gameId/start', requireAuth, async (req, res) => {
    const { gameId } = req.params;

    try {
        // Verify user is host
        const hostCheck = await pool.query(
            `SELECT * FROM "game_participants" 
       WHERE game_id = $1 AND user_id = $2 AND is_host = true`,
            [gameId, req.session.userId]
        );

        if (hostCheck.rows.length === 0) {
            return res.status(403).json({ error: 'Only host can start the game' });
        }

        await pool.query(
            `UPDATE games 
       SET status = 'in_progress', started_at = now()
       WHERE id = $1`,
            [gameId]
        );

        res.json({ success: true });
    } catch (error) {
        console.error('Start game error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

//  move
router.post('/:gameId/move', requireAuth, async (req, res) => {
    const { gameId } = req.params;
    const { tiles, words, score } = req.body;

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // current turn number
        const turnResult = await client.query(
            'SELECT COALESCE(MAX(turn_number), 0) as max_turn FROM moves WHERE game_id = $1',
            [gameId]
        );

        const turnNumber = turnResult.rows[0].max_turn + 1;

        // Insert move
        await client.query(
            `INSERT INTO moves (game_id, user_id, turn_number, payload)
       VALUES ($1, $2, $3, $4)`,
            [gameId, req.session.userId, turnNumber, JSON.stringify({ tiles, words, score })]
        );

        // Update score
        await client.query(
            `INSERT INTO scores (game_id, user_id, value)
       VALUES ($1, $2, $3)
       ON CONFLICT (game_id, user_id) 
       DO UPDATE SET value = scores.value + $3`,
            [gameId, req.session.userId, score]
        );

        await client.query('COMMIT');

        res.json({ success: true, turnNumber });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Submit move error:', error);
        res.status(500).json({ error: 'Server error' });
    } finally {
        client.release();
    }
});

export default router;