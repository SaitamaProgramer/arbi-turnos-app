import Database from 'better-sqlite3';
import 'dotenv/config';

const dbPath = process.env.DATABASE_PATH || './arbitros.db';

// Use a singleton pattern to ensure a single database connection.
// In a serverless environment like Next.js, this prevents creating multiple
// connections during development with hot-reloading.
declare global {
  // allow global `var` declarations
  // eslint-disable-next-line no-var
  var db: Database.Database | undefined;
}

export const db =
  global.db || new Database(dbPath);

if (process.env.NODE_ENV !== 'production') global.db = db;

console.log(`Database connected at ${dbPath}`);
