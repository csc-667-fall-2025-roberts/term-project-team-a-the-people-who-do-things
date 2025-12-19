// Helper script to create dummy data

import dotenv from "dotenv";
import pg from "pg";

dotenv.config();

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

async function seed() {
  const client = await pool.connect();
  try {
    console.log("Seeding finished game...");
    await client.query("BEGIN");

    const userA = (
      await client.query(`
      INSERT INTO users (email, password_hash, display_name)
      VALUES ('winner@example.com', '$2b$10$FakeHashForSeedingTheDb123', 'Winner Will')
      ON CONFLICT (email) DO UPDATE SET display_name = 'Winner Will'
      RETURNING id
    `)
    ).rows[0].id;

    const userB = (
      await client.query(`
      INSERT INTO users (email, password_hash, display_name)
      VALUES ('loser@example.com', '$2b$10$FakeHashForSeedingTheDb123', 'Loser Larry')
      ON CONFLICT (email) DO UPDATE SET display_name = 'Loser Larry'
      RETURNING id
    `)
    ).rows[0].id;

    console.log(`Created Users: ${userA} (Winner), ${userB} (Loser)`);

    const gameId = "11111111-1111-1111-1111-111111111111";

    await client.query(`DELETE FROM games WHERE id = $1`, [gameId]);

    await client.query(
      `
      INSERT INTO games (id, game_type, status, max_players, created_by, started_at, ended_at)
      VALUES ($1, 'scrabble', 'finished', 2, $2, NOW() - INTERVAL '1 hour', NOW())
    `,
      [gameId, userA],
    );

    await client.query(
      `
      INSERT INTO game_participants (game_id, user_id, is_host)
      VALUES ($1, $2, true), ($1, $3, false)
    `,
      [gameId, userA, userB],
    );

    await client.query(
      `
      INSERT INTO scores (game_id, user_id, value)
      VALUES ($1, $2, 150), ($1, $3, 85)
    `,
      [gameId, userA, userB],
    );

    await client.query(
      `
      INSERT INTO moves (game_id, user_id, turn_number, payload)
      VALUES ($1, $2, 1, $3)
    `,
      [
        gameId,
        userA,
        JSON.stringify({
          words: ["HELLO"],
          score: 25,
          tiles: [
            { letter: "H" },
            { letter: "E" },
            { letter: "L" },
            { letter: "L" },
            { letter: "O" },
          ],
        }),
      ],
    );

    await client.query(
      `
      INSERT INTO moves (game_id, user_id, turn_number, payload)
      VALUES ($1, $2, 2, $3)
    `,
      [
        gameId,
        userB,
        JSON.stringify({
          words: ["HI"],
          score: 5,
          tiles: [{ letter: "H" }, { letter: "I" }],
        }),
      ],
    );

    await client.query(
      `
      INSERT INTO moves (game_id, user_id, turn_number, payload)
      VALUES ($1, $2, 3, $3)
    `,
      [
        gameId,
        userA,
        JSON.stringify({
          words: ["QUARTZ"],
          score: 50,
          tiles: [
            { letter: "Q" },
            { letter: "U" },
            { letter: "A" },
            { letter: "R" },
            { letter: "T" },
            { letter: "Z" },
          ],
        }),
      ],
    );

    await client.query("COMMIT");
    console.log(`Game Created Successfully!`);
    console.log(`Test URL: http://localhost:3000/game/${gameId}/results`);
  } catch (e) {
    await client.query("ROLLBACK");
    console.error("Seeding Failed:", e);
  } finally {
    client.release();
    pool.end();
  }
}

seed();
