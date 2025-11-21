import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
	connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/scrabble_game',
	max: 20,
	idleTimeoutMillis: 30000,
	connectionTimeoutMillis: 2000,
});

pool.on('error', (err: Error) => {
	console.error('Unexpected error on idle client', err);
	process.exit(-1);
});

export default pool;



// import { Pool, PoolConfig } from 'pg';
// import dotenv from 'dotenv';

// const poolConfig: PoolConfig = {
//   host: process.env.DB_HOST || 'localhost',
//   port: Number(process.env.DB_PORT) || 5432,
//   database: process.env.DB_NAME || 'scrabble_game',
//   user: process.env.DB_USER || 'postgres',
//   password: process.env.DB_PASSWORD || 'postgres',
//   max: 20,
//   idleTimeoutMillis: 30000,
//   connectionTimeoutMillis: 2000,
// };

// const pool = new Pool(poolConfig);

// pool.on('error', (err: Error) => {
// 	console.error('Unexpected error on idle client', err);
// 	process.exit(-1);
// });

// export default pool;