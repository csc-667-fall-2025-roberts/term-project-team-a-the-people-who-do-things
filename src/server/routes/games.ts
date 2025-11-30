import express from 'express';
import pool from '../config/database.js';
import { requireAuth } from '../middleware/auth.js';
import { z } from 'zod';

const router = express.Router();

// Get lobby games
router.get('/lobby', requireAuth, async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT g.id, g.game_type, g.status, g.max_players, g.created_at,
              u.display_name as creator_name,
              COUNT(gp.user_id) as current_players
       FROM games g
       JOIN users u ON g.created_by = u.id
       LEFT JOIN game_participants gp ON g.id = gp.game_id
       WHERE g.status = 'waiting'
       GROUP BY g.id, g.game_type, g.status, g.max_players, g.created_at, u.display_name
       ORDER BY g.created_at DESC`,
      []
    );

    res.json({ games: result.rows });
  } catch (error) {
    console.error('Get lobby error:', error);
    res.status(500).json({ error: 'Failed to retrieve lobby games' });
  }
});

// Create new game
const createGameSchema = z.object({
  maxPlayers: z.number().int().min(2).max(4).default(2),
  settings: z.record(z.string(), z.unknown()).optional().default({})
});

router.post('/create', requireAuth, async (req, res) => {
  const validation = createGameSchema.safeParse(req.body);
  if (!validation.success) {
    return res.status(400).json({ error: validation.error.issues });
  }
  const { maxPlayers, settings } = validation.data;

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const gameResult = await client.query(
      `INSERT INTO games (game_type, status, max_players, settings_json, created_by)
       VALUES ('scrabble', 'waiting', $1, $2, $3)
       RETURNING id, game_type, status, max_players, created_at`,
      [maxPlayers, JSON.stringify(settings), req.session.userId]
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
    const errorMessage = error instanceof Error ? error.message : 'Failed to create game';
    res.status(500).json({ error: errorMessage });
  } finally {
    client.release();
  }
});

// Join game
router.post('/:gameId/join', requireAuth, async (req, res) => {
  const { gameId } = req.params;

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Check if game exists and has space with row lock
    const gameResult = await client.query(
        `SELECT g.*, COUNT(gp.user_id) as player_count
         FROM games g
                  LEFT JOIN game_participants gp ON g.id = gp.game_id
         WHERE g.id = $1
         GROUP BY g.id`,
        [gameId]
    );

    if (gameResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Game not found' });
    }

    const game = gameResult.rows[0];

    if (game.status !== 'waiting') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Game already started' });
    }

    if (game.current_players >= game.max_players) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Game is full' });
    }

    const joinResult = await client.query(
      `INSERT INTO game_participants (game_id, user_id)
       VALUES ($1, $2)
       ON CONFLICT (game_id, user_id) DO NOTHING
       RETURNING user_id`,
      [gameId, req.session.userId]
    );

    await client.query('COMMIT');

    if (joinResult.rows.length === 0) {
      return res.json({ success: true, alreadyJoined: true });
    }

    res.json({ success: true, alreadyJoined: false });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Join game error:', error);
    res.status(500).json({ error: 'Failed to join game' });
  } finally {
    client.release();
  }
});

// Get game details
router.get('/:gameId', requireAuth, async (req, res) => {
  const { gameId } = req.params;

  try {
    const gameResult = await pool.query(
      'SELECT id, game_type, status, max_players, created_at, started_at, ended_at FROM games WHERE id = $1',
      [gameId]
    );

    if (gameResult.rows.length === 0) {
      return res.status(404).json({ error: 'Game not found' });
    }

    const participantsResult = await pool.query(
      `SELECT gp.user_id, gp.is_host, gp.joined_at, u.display_name
       FROM game_participants gp
       JOIN users u ON gp.user_id = u.id
       WHERE gp.game_id = $1
       ORDER BY gp.joined_at`,
      [gameId]
    );

    const scoresResult = await pool.query(
      `SELECT s.user_id, s.value, s.recorded_at, u.display_name
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
    res.status(500).json({ error: 'Failed to retrieve game details' });
  }
});

// Start game
router.post('/:gameId/start', requireAuth, async (req, res) => {
  const { gameId } = req.params;

  try {
    const result = await pool.query(
      `UPDATE games
       SET status = 'in_progress', started_at = now()
       WHERE id = $1 
         AND status = 'waiting'
         AND EXISTS (
           SELECT 1 FROM game_participants 
           WHERE game_id = $1 AND user_id = $2 AND is_host = true
         )
       RETURNING id`,
      [gameId, req.session.userId]
    );

    if (result.rows.length === 0) {
      return res.status(403).json({ error: 'Only host can start a waiting game' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Start game error:', error);
    res.status(500).json({ error: 'Failed to start game' });
  }
});

// Submit move
const submitMoveSchema = z.object({
  tiles: z.array(z.object({
    letter: z.string().length(1),
    row: z.number().int().min(0).max(14),
    col: z.number().int().min(0).max(14)
  })).min(1),
  words: z.array(z.string()).min(1),
  score: z.number().int().min(0)
});

router.post('/:gameId/move', requireAuth, async (req, res) => {
  const { gameId } = req.params;

  const validation = submitMoveSchema.safeParse(req.body);
  if (!validation.success) {
    return res.status(400).json({ error: validation.error.issues });
  }

  const { tiles, words, score } = validation.data;

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Verify user is participant and game is in progress
    const participantCheck = await client.query(
      `SELECT gp.user_id, g.status, g.current_turn_user_id
       FROM game_participants gp
       JOIN games g ON gp.game_id = g.id
       WHERE gp.game_id = $1 AND gp.user_id = $2`,
      [gameId, req.session.userId]
    );

    if (participantCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'Not a participant in this game' });
    }

    const { status, current_turn_user_id } = participantCheck.rows[0];

    if (status !== 'in_progress') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Game is not in progress' });
    }

    if (current_turn_user_id && current_turn_user_id !== req.session.userId) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'Not your turn' });
    }

    // Get current turn number
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
    res.status(500).json({ error: 'Failed to submit move' });
  } finally {
    client.release();
  }
});

export default router;
