
'use server';
import 'server-only';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import type { User } from '@/types';
import { db } from './db';

function getKey() {
    const secretKey = process.env.SESSION_SECRET;
    if (!secretKey) {
        console.error('SESSION_SECRET environment variable is not set');
        throw new Error('La configuración de sesión del servidor está incompleta.');
    }
    return new TextEncoder().encode(secretKey);
}

// Encrypt just the userId into the session
async function encrypt(payload: { userId: string, expires: Date }) {
  const key = getKey();
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1d')
    .sign(key);
}

// Decrypt the session and return the userId
async function decrypt(input: string): Promise<{ userId: string } | null> {
  const key = getKey();
  try {
    const { payload } = await jwtVerify(input, key, {
      algorithms: ['HS256'],
    });
    return payload as { userId: string };
  } catch (error) {
    // This can happen if the token is expired or invalid
    return null;
  }
}

// Create a new session with the user's ID
export async function createSession(userId: string) {
  const cookieStore = cookies();
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 1 day
  const session = await encrypt({ userId, expires });

  cookieStore.set('session', session, { expires, httpOnly: true });
}

export async function deleteSession() {
  const cookieStore = cookies();
  cookieStore.set('session', '', { expires: new Date(0) });
}

// Get the user from the current session cookie by re-fetching from DB
export async function getUserFromSession(): Promise<User | null> {
    const sessionCookie = cookies().get('session')?.value;
    if (!sessionCookie) return null;

    const decryptedPayload = await decrypt(sessionCookie);
    
    if (!decryptedPayload?.userId) {
        return null;
    }

    try {
      const user = await getFullUserFromDb(decryptedPayload.userId);
      return user;
    } catch (error) {
      console.error("Failed to fetch user from DB for session:", error);
      return null;
    }
}

// Helper to cast rows to a specific type, needed by getFullUserFromDb
function rowsToType<T>(rows: any[]): T[] {
    return rows.map(row => {
        const newRow: { [key: string]: any } = {};
        for (const key in row) {
            const camelCaseKey = key.replace(/_([a-z])/g, g => g[1].toUpperCase());
            newRow[camelCaseKey] = row[key];
        }
        return newRow as T;
    });
}

// Utility to fetch the full user object from DB (now used by session management)
export async function getFullUserFromDb(userId: string): Promise<User | null> {
     try {
        const userResult = await db.execute({
            sql: `
                SELECT u.id, u.name, u.email, u.role, c.id as administered_club_id
                FROM users u
                LEFT JOIN clubs c ON u.id = c.admin_user_id
                WHERE u.id = ?
            `,
            args: [userId]
        });
        
        if (userResult.rows.length === 0) return null;
        const user = rowsToType<User>(userResult.rows)[0];
        
        if (user.role === 'referee') {
            const memberClubsResult = await db.execute({
                sql: 'SELECT club_id FROM user_clubs_membership WHERE user_id = ?',
                args: [user.id]
            });
            user.memberClubIds = memberClubsResult.rows.map(mc => mc.club_id as string);
        }

        // Make sure to not leak the password hash if it ever gets selected by accident.
        delete user.password;

        return user;
    } catch(e) {
        console.error("Error fetching user from db:", e);
        return null;
    }
}

    