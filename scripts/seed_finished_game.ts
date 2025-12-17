// scripts/seed_finished_game.ts
import pg from "pg";
import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

async function seed() {
  const client = await pool.connect();
  try {
    console.log("🌱 Seeding finished game...");
    await client.query("BEGIN");

    // 1. Create Users (Dummy Winner and Loser)
    // We use ON CONFLICT to avoid crashing if you run this script twice
    const userA = (await client.query(`
      INSERT INTO users (email, password_hash, display_name)
      VALUES ('winner@example.com', '$2b$10$FakeHashForSeedingTheDb123', 'Winner Will')
      ON CONFLICT (email) DO UPDATE SET display_name = 'Winner Will'
      RETURNING id
    `)).rows[0].id;

    const userB = (await client.query(`
      INSERT INTO users (email, password_hash, display_name)
      VALUES ('loser@example.com', '$2b$10$FakeHashForSeedingTheDb123', 'Loser Larry')
      ON CONFLICT (email) DO UPDATE SET display_name = 'Loser Larry'
      RETURNING id
    `)).rows[0].id;

    console.log(`👤 Created Users: ${userA} (Winner), ${userB} (Loser)`);

    // 2. Create a "Finished" Game
    // We manually generate a Game ID (e.g., "11111111-1111-1111-1111-111111111111") so it's easy to find URL
    const gameId = "11111111-1111-1111-1111-111111111111";
    
    // Delete existing test game if it exists to start fresh
    await client.query(`DELETE FROM games WHERE id = $1`, [gameId]);

    await client.query(`
      INSERT INTO games (id, game_type, status, max_players, created_by, started_at, ended_at)
      VALUES ($1, 'scrabble', 'finished', 2, $2, NOW() - INTERVAL '1 hour', NOW())
    `, [gameId, userA]);

    // 3. Add Participants
    await client.query(`
      INSERT INTO game_participants (game_id, user_id, is_host)
      VALUES ($1, $2, true), ($1, $3, false)
    `, [gameId, userA, userB]);

    // 4. Add Final Scores
    // Winner gets 150, Loser gets 85
    await client.query(`
      INSERT INTO scores (game_id, user_id, value)
      VALUES ($1, $2, 150), ($1, $3, 85)
    `, [gameId, userA, userB]);

    // 5. Add Moves (History for Stats)
    // We insert JSON payloads so your UI can calculate "Longest Word", etc.
    
    // Move 1: Winner plays "HELLO" (25 points)
    await client.query(`
      INSERT INTO moves (game_id, user_id, turn_number, payload)
      VALUES ($1, $2, 1, $3)
    `, [gameId, userA, JSON.stringify({
      words: ["HELLO"],
      score: 25,
      tiles: [{letter:'H'},{letter:'E'},{letter:'L'},{letter:'L'},{letter:'O'}]
    })]);

    // Move 2: Loser plays "HI" (5 points)
    await client.query(`
      INSERT INTO moves (game_id, user_id, turn_number, payload)
      VALUES ($1, $2, 2, $3)
    `, [gameId, userB, JSON.stringify({
      words: ["HI"],
      score: 5,
      tiles: [{letter:'H'},{letter:'I'}]
    })]);

    // Move 3: Winner plays "QUARTZ" (Longest word - 50 points)
    await client.query(`
      INSERT INTO moves (game_id, user_id, turn_number, payload)
      VALUES ($1, $2, 3, $3)
    `, [gameId, userA, JSON.stringify({
      words: ["QUARTZ"],
      score: 50,
      tiles: [{letter:'Q'},{letter:'U'},{letter:'A'},{letter:'R'},{letter:'T'},{letter:'Z'}]
    })]);

    await client.query("COMMIT");
    console.log(`✅ Game Created Successfully!`);
    console.log(`➡️  Test URL: http://localhost:3000/game/${gameId}/results`);

  } catch (e) {
    await client.query("ROLLBACK");
    console.error("❌ Seeding Failed:", e);
  } finally {
    client.release();
    pool.end();
  }
}

seed();