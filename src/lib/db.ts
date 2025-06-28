
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

let isLocalDb = false;
// Developer-friendly fallback to a local file database if Turso URL is not set or is a placeholder
if (!url || url.includes('your-db-name')) {
  isLocalDb = true;
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

if (isLocalDb) {
  console.log('✅ Base de datos local conectada: arbitros.db. Si cambias las claves secretas (.env), borra este archivo para reiniciar.');
} else {
  console.log('✅ Conectado a la base de datos de Turso.');
}
