
import { createClient, type Client } from '@libsql/client';

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

  if (!url) {
    throw new Error('FATAL: TURSO_DATABASE_URL environment variable is not defined for production.');
  }
  if (!authToken) {
    throw new Error('FATAL: TURSO_AUTH_TOKEN environment variable is not defined for production.');
  }
  
  db = createClient({ url, authToken });
  console.log('✅ Production: Turso database client configured.');

} else {
  // In development, use a global variable to preserve the client
  // across module reloads caused by HMR (Hot Module Replacement).
  if (!global.db) {
    const url = process.env.TURSO_DATABASE_URL;
    const authToken = process.env.TURSO_AUTH_TOKEN;

    // Check for placeholder values to prevent crashes
    if (url && !url.includes('<') && authToken && !authToken.includes('<')) {
        console.log('✅ Development: Connecting to Turso database.');
        global.db = createClient({ url, authToken });
    } else {
        console.log('✅ Development: Turso env vars not found or are placeholders. Falling back to local file: arbitros.db');
        global.db = createClient({ url: 'file:arbitros.db' });
    }
  }
  db = global.db;
}

export { db };
