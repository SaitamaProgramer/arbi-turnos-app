
'use server';
import 'server-only';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { User } from '@/types';
import { db } from './db';

function getKey() {
    const secretKey = process.env.SESSION_SECRET;
    if (!secretKey) {
        throw new Error('SESSION_SECRET environment variable is not set');
    }
    return new TextEncoder().encode(secretKey);
}

export async function encrypt(payload: any) {
  const key = getKey();
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1d') // Session expires in 1 day
    .sign(key);
}

export async function decrypt(input: string): Promise<any> {
  const key = getKey();
  try {
    const { payload } = await jwtVerify(input, key, {
      algorithms: ['HS256'],
    });
    return payload;
  } catch (error) {
    // This can happen if the token is expired or invalid
    console.error('Failed to verify session', error);
    return null;
  }
}

export async function createSession(userId?: string) {
  const cookieStore = cookies();
  const sessionCookie = cookieStore.get('session')?.value;
  if (!userId && sessionCookie) {
      const existingSession = await decrypt(sessionCookie);
      if(existingSession?.userId) userId = existingSession.userId;
  }
  
  if (!userId) {
    redirect('/login');
  }

  // Create the session
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 1 day
  const session = await encrypt({ userId, expires });

  // Save the session in a cookie
  cookieStore.set('session', session, { expires, httpOnly: true });
  return { userId };
}

export async function deleteSession() {
  const cookieStore = cookies();
  cookieStore.set('session', '', { expires: new Date(0) });
}

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

export async function getUserFromSession(): Promise<User | null> {
    const cookieStore = cookies();
    const session = cookieStore.get('session')?.value;
    if (!session) return null;

    const payload = await decrypt(session);
    if (!payload?.userId) return null;
    
    try {
        const userResult = await db.execute({
            sql: `
                SELECT u.id, u.name, u.email, u.role, c.id as administered_club_id
                FROM users u
                LEFT JOIN clubs c ON u.id = c.admin_user_id
                WHERE u.id = ?
            `,
            args: [payload.userId]
        });
        
        const user = rowsToType<User>(userResult.rows)[0];
        
        if (!user) return null;

        if (user.role === 'referee') {
            const memberClubsResult = await db.execute({
                sql: 'SELECT club_id FROM user_clubs_membership WHERE user_id = ?',
                args: [user.id]
            });
            user.memberClubIds = memberClubsResult.rows.map(mc => mc.club_id as string);
        }

        return user;
    } catch(e) {
        console.error("Error fetching user from session:", e);
        return null;
    }
}
