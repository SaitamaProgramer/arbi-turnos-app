import { createClient } from '@libsql/client';
import 'dotenv/config';

// Use a singleton pattern to ensure a single database connection.
// In a serverless environment like Next.js, this prevents creating multiple
// connections during development with hot-reloading.
declare global {
  // allow global `var` declarations
  // eslint-disable-next-line no-var
  var db: ReturnType<typeof createClient> | undefined;
}

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url) {
  throw new Error('TURSO_DATABASE_URL environment variable is not defined');
}

if (!authToken && process.env.NODE_ENV === 'production') {
    throw new Error('TURSO_AUTH_TOKEN environment variable is not defined for production');
}

export const db =
  global.db || createClient({
    url,
    authToken,
  });

if (process.env.NODE_ENV !== 'production') global.db = db;

console.log(`Database connected via Turso.`);
