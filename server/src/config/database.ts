import knex from 'knex';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const isProduction = process.env.NODE_ENV === 'production';

const db = knex({
  client: 'pg',
  connection: isProduction
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false },
      }
    : process.env.DATABASE_URL || 'postgresql://localhost:5432/merchfin',
  pool: { min: 2, max: 10 },
});

export default db;
