
'use server';
import 'server-only';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import type { User } from '@/types';
import { db } from './db';
import { rowsToType } from './utils';

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
  const cookieStore = await cookies();
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 1 day
  const session = await encrypt({ userId, expires });

  cookieStore.set('session', session, { expires, httpOnly: true });
}

export async function deleteSession() {
  const cookieStore = await cookies();
  cookieStore.set('session', '', { expires: new Date(0) });
}

// Get the user from the current session cookie by re-fetching from DB
export async function getUserFromSession(): Promise<User | null> {
    const sessionCookie = (await cookies()).get('session')?.value;
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


// Utility to fetch the full user object from DB (now used by session management)
export async function getFullUserFromDb(userId: string): Promise<User | null> {
     try {
        const userResult = await db.execute({
            sql: 'SELECT id, name, email, role FROM users WHERE id = ?',
            args: [userId]
        });
        
        if (userResult.rows.length === 0) return null;
        
        const user = rowsToType<User>(userResult.rows)[0];
        
        const membershipsResult = await db.execute({
            sql: 'SELECT club_id, role_in_club FROM user_clubs_membership WHERE user_id = ?',
            args: [user.id]
        });
        
        user.memberClubIds = [];
        user.administeredClubIds = [];

        for (const row of membershipsResult.rows) {
            const membership = rowsToType<{clubId: string, roleInClub: 'admin' | 'referee'}>([row])[0];
            user.memberClubIds.push(membership.clubId);
            if (membership.roleInClub === 'admin') {
                user.administeredClubIds.push(membership.clubId);
            }
        }

        // Add the isDeveloper flag based on the environment variable
        if (user.role === 'admin' && process.env.DEVELOPER_EMAIL) {
            user.isDeveloper = user.email === process.env.DEVELOPER_EMAIL;
        }

        // Make sure to not leak the password hash if it ever gets selected by accident.
        delete user.password;

        return user;
    } catch(e) {
        console.error("Error fetching user from db:", e);
        return null;
    }
}
