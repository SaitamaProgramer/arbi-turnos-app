
'use server';
import 'server-only';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { User } from '@/types';
import { db } from './db';

const secretKey = process.env.SESSION_SECRET || 'fallback-secret-for-dev-only-must-be-32-bytes';
if (process.env.NODE_ENV === 'production' && secretKey === 'fallback-secret-for-dev-only-must-be-32-bytes') {
    console.warn('WARNING: SESSION_SECRET is not set in production. Using a default, insecure key.');
}
const key = new TextEncoder().encode(secretKey);

export async function encrypt(payload: any) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1d') // Session expires in 1 day
    .sign(key);
}

export async function decrypt(input: string): Promise<any> {
  try {
    const { payload } = await jwtVerify(input, key, {
      algorithms: ['HS256'],
    });
    return payload;
  } catch (error) {
    // This can happen if the token is expired or invalid
    return null;
  }
}

export async function createSession(userId?: string) {
  const sessionCookie = cookies().get('session')?.value;
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
  cookies().set('session', session, { expires, httpOnly: true });
  return { userId };
}

export async function deleteSession() {
  cookies().set('session', '', { expires: new Date(0) });
}

export async function getUserFromSession(): Promise<User | null> {
    const session = cookies().get('session')?.value;
    if (!session) return null;

    const payload = await decrypt(session);
    if (!payload?.userId) return null;
    
    try {
        const user = db.prepare(`
            SELECT u.id, u.name, u.email, u.role, c.id as administeredClubId
            FROM users u
            LEFT JOIN clubs c ON u.id = c.admin_user_id
            WHERE u.id = ?
        `).get(payload.userId) as any;
        
        if (!user) return null;

        if (user.role === 'referee') {
            const memberClubs = db.prepare('SELECT club_id FROM user_clubs_membership WHERE user_id = ?').all(user.id) as {club_id: string}[];
            user.memberClubIds = memberClubs.map(mc => mc.club_id);
        }

        return user as User;
    } catch(e) {
        console.error("Error fetching user from session:", e);
        return null;
    }
}
