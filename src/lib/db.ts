import { createClient, type Client } from '@libsql/client';
import 'dotenv/config';

// Declare a global variable to hold the database client in development
declare global {
  // eslint-disable-next-line no-var
  var db: Client | undefined;
}

let db: Client;

// This logic ensures that in a production environment (like Vercel),
// the app strictly connects to Turso and fails loudly if secrets are missing.
if (process.env.NODE_ENV === 'production') {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!url || url.includes('<')) {
    throw new Error('FATAL: TURSO_DATABASE_URL environment variable is not defined or is a placeholder for production.');
  }
  if (!authToken || authToken.includes('<')) {
    throw new Error('FATAL: TURSO_AUTH_TOKEN environment variable is not defined or is a placeholder for production.');
  }
  
  db = createClient({ url, authToken });
  console.log('✅ Connected to Turso database in production.');

} else {
  // For local development, we use a singleton pattern to prevent multiple
  // connections during hot-reloading. It will try to use Turso if env vars
  // are present, otherwise it will fall back to a local file.
  if (!global.db) {
    const url = process.env.TURSO_DATABASE_URL;
    const authToken = process.env.TURSO_AUTH_TOKEN;

    if (url && authToken) {
      // Check for placeholder values to prevent crashes
      if (url.includes('tu_url_de_turso') || authToken.includes('tu_token_de_turso')) {
        console.warn('⚠️ WARNING: Placeholder values detected for Turso in your .env file.');
        console.warn('Falling back to local database file (arbitros.db).');
        console.warn('To connect to Turso locally, provide real credentials in .env. To use the local DB, remove or comment out the TURSO variables.');
        global.db = createClient({ url: 'file:arbitros.db' });
        console.log('✅ Connected to local database: arbitros.db');
      } else {
        global.db = createClient({ url, authToken });
        console.log('✅ Connected to Turso database in development.');
      }
    } else {
      global.db = createClient({ url: 'file:arbitros.db' });
      console.log('✅ Connected to local database: arbitros.db');
    }
  }
  db = global.db;
}

export { db };
