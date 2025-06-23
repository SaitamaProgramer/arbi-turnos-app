
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

let url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

// Developer-friendly fallback to a local file database if Turso URL is not set or is a placeholder
if (!url || url.includes('your-db-name')) {
  console.log('TURSO_DATABASE_URL not set or is a placeholder, falling back to local file: arbitros.db');
  url = 'file:arbitros.db';
}

// In production, if not using a local file DB, the auth token is required.
if (!authToken && process.env.NODE_ENV === 'production' && !url.startsWith('file:')) {
    throw new Error('TURSO_AUTH_TOKEN environment variable is not defined for production');
}

export const db =
  global.db || createClient({
    url,
    authToken,
  });

if (process.env.NODE_ENV !== 'production') global.db = db;

console.log(`Database client configured for: ${url.startsWith('file:') ? 'Local SQLite File' : 'Turso'}`);
