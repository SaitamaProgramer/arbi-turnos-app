
'use server';
import 'server-only';

import { db } from './db';
import type { Club, ClubSpecificMatch, MatchAssignment, RegisterUserPayload, ShiftRequest, ShiftRequestWithMatches, User } from '@/types';
import { createSession, deleteSession } from './session';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { isPostulationEditable } from './utils';
import type { ResultSet } from '@libsql/client';
import { createHmac } from 'crypto';

// This is a utility for hashing passwords. We'll use the built-in crypto module.
async function hashPassword(password: string): Promise<string> {
    const secret = process.env.PASSWORD_SECRET;
    if (!secret) {
        throw new Error('PASSWORD_SECRET environment variable is not set');
    }
    // Using HMAC for keyed hashing, which is a good practice.
    const hash = createHmac('sha256', secret)
                   .update(password)
                   .digest('hex');
    return hash;
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
    const hashedPassword = await hashPassword(password);
    return hashedPassword === hash;
}

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(['admin', 'referee']),
  clubName: z.string().optional(),
  clubIdToJoin: z.string().optional(),
});


export async function registerUser(payload: RegisterUserPayload) {
    const validation = registerSchema.safeParse(payload);
    if (!validation.success) {
        return { error: 'Datos de registro inválidos.' };
    }
    const { name, email, password, role, clubName, clubIdToJoin } = validation.data;

    try {
        const existingUserResult = await db.execute({
            sql: 'SELECT id FROM users WHERE email = ?',
            args: [email]
        });
        if (existingUserResult.rows.length > 0) {
            return { error: 'El correo electrónico ya está registrado.' };
        }

        const hashedPassword = await hashPassword(password);
        const newUserId = `user_${crypto.randomUUID()}`;
        
        const tx = await db.transaction('write');
        try {
            if (role === 'admin') {
                if (!clubName) throw new Error('El nombre del club es requerido para administradores.');
                
                const newClubId = `club_${crypto.randomUUID()}`;

                await tx.execute({
                    sql: 'INSERT INTO users (id, name, email, password, role) VALUES (?, ?, ?, ?, ?)',
                    args: [newUserId, name, email, hashedPassword, role]
                });
                await tx.execute({
                    sql: 'INSERT INTO clubs (id, name, admin_user_id) VALUES (?, ?, ?)',
                    args: [newClubId, name, newUserId]
                });

            } else { // role === 'referee'
                if (!clubIdToJoin) throw new Error('El código de club es requerido para árbitros.');

                const clubResult = await tx.execute({ sql: 'SELECT id FROM clubs WHERE id = ?', args: [clubIdToJoin] });
                if (clubResult.rows.length === 0) {
                    throw new Error('El código de club no es válido.');
                }
                
                await tx.execute({
                    sql: 'INSERT INTO users (id, name, email, password, role) VALUES (?, ?, ?, ?, ?)',
                    args: [newUserId, name, email, hashedPassword, role]
                });
                await tx.execute({
                    sql: 'INSERT INTO user_clubs_membership (user_id, club_id) VALUES (?, ?)',
                    args: [newUserId, clubIdToJoin]
                });
            }
            await tx.commit();
        } catch (err: any) {
            await tx.rollback();
            // This will catch the specific error message from the transaction block
            return { error: err.message || 'Ocurrió un error en la base de datos.' };
        }

        await createSession(newUserId);
        return { success: true };

    } catch (e: any) {
        console.error("Registration error:", e);
        return { error: 'Ocurrió un error en el servidor.' };
    }
}


const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function login(payload: z.infer<typeof loginSchema>) {
    const validation = loginSchema.safeParse(payload);
    if (!validation.success) {
        return { error: 'Datos de inicio de sesión inválidos.' };
    }
    const { email, password } = validation.data;

    try {
        const result = await db.execute({
            sql: 'SELECT id, password FROM users WHERE email = ?',
            args: [email]
        });
        const user = result.rows[0] as User | undefined;
        
        if (!user || !user.password) {
            return { error: 'Correo electrónico o contraseña incorrectos.' };
        }

        const passwordMatch = await verifyPassword(password, user.password);
        if (!passwordMatch) {
            return { error: 'Correo electrónico o contraseña incorrectos.' };
        }

        await createSession(user.id);
        
    } catch (e: any) {
        console.error("Login error:", e);
        return { error: 'Ocurrió un error en el servidor.' };
    }
    redirect('/');
}

export async function logout() {
    await deleteSession();
    redirect('/login');
}

// Helper to cast rows to a specific type
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

export async function getAdminPageData(clubId: string) {
    try {
        const clubResult = await db.execute({ sql: 'SELECT * FROM clubs WHERE id = ?', args: [clubId] });
        const club = rowsToType<Club>(clubResult.rows)[0];
        if (!club) return null;

        const refereesResult = await db.execute({
            sql: `
                SELECT u.id, u.name, u.email, u.role
                FROM users u
                JOIN user_clubs_membership ucm ON u.id = ucm.user_id
                WHERE ucm.club_id = ? AND u.role = 'referee'
            `,
            args: [clubId]
        });
        const referees = rowsToType<User>(refereesResult.rows);
        
        const shiftRequestsRawResult = await db.execute({
            sql: `
                SELECT 
                    sr.id, sr.user_id, sr.club_id, sr.has_car, sr.notes, sr.status, sr.submitted_at,
                    srm.match_id
                FROM shift_requests sr
                JOIN shift_request_matches srm ON sr.id = srm.request_id
                WHERE sr.club_id = ?
            `,
            args: [clubId]
        });
        const shiftRequestsRaw = shiftRequestsRawResult.rows;

        const definedMatchesResult = await db.execute({
            sql: 'SELECT * FROM club_matches WHERE club_id = ? ORDER BY match_date, match_time',
            args: [clubId]
        });
        const definedMatches = rowsToType<ClubSpecificMatch>(definedMatchesResult.rows);
        
        const matchAssignmentsResult = await db.execute({
            sql: 'SELECT match_id, assigned_referee_id FROM match_assignments WHERE club_id = ?',
            args: [clubId]
        });
        const matchAssignments = rowsToType<Omit<MatchAssignment, 'clubId' | 'assignedAt' | 'id'>>(matchAssignmentsResult.rows);

        // Process shift requests to group matches by request ID
        const requestsMap = new Map<string, ShiftRequestWithMatches>();
        for (const row of shiftRequestsRaw) {
            const match = definedMatches.find(m => m.id === row.match_id);
            if (!match) continue;

            const typedRow = rowsToType<any>([row])[0];

            if (requestsMap.has(typedRow.id as string)) {
                requestsMap.get(typedRow.id as string)!.selectedMatches.push(match);
            } else {
                requestsMap.set(typedRow.id as string, {
                    id: typedRow.id as string,
                    userId: typedRow.userId as string,
                    clubId: typedRow.clubId as string,
                    hasCar: !!typedRow.hasCar,
                    notes: typedRow.notes as string,
                    status: typedRow.status as 'pending' | 'completed',
                    submittedAt: typedRow.submittedAt as string,
                    selectedMatches: [match],
                });
            }
        }
        const shiftRequests = Array.from(requestsMap.values());


        return {
            club,
            referees,
            shiftRequests,
            definedMatches,
            matchAssignments
        };

    } catch (e: any) {
        console.error("getAdminPageData error:", e);
        return null;
    }
}

export async function saveClubDefinedMatches(clubId: string, matches: Omit<ClubSpecificMatch, 'clubId'>[]) {
    const tx = await db.transaction('write');
    try {
        await tx.execute({ sql: 'DELETE FROM club_matches WHERE club_id = ?', args: [clubId] });
        
        for (const match of matches) {
            await tx.execute({
                sql: 'INSERT INTO club_matches (id, club_id, description, match_date, match_time, location) VALUES (?, ?, ?, ?, ?, ?)',
                args: [match.id, clubId, match.description, match.date, match.time, match.location]
            });
        }
        await tx.commit();
        return { success: true };
    } catch(e: any) {
        await tx.rollback();
        console.error("saveClubDefinedMatches error", e);
        return { error: 'No se pudieron guardar los partidos.' };
    }
}


export async function getAvailabilityFormData(userId: string) {
    try {
        const memberClubIdsResult = await db.execute({
            sql: 'SELECT club_id FROM user_clubs_membership WHERE user_id = ?',
            args: [userId]
        });
        const memberClubIds = memberClubIdsResult.rows.map(r => r.club_id as string);
        if (memberClubIds.length === 0) return null;

        const clubsResult = await db.execute({
            sql: `SELECT id, name FROM clubs WHERE id IN (${memberClubIds.map(() => '?').join(',')})`,
            args: [...memberClubIds]
        });
        const clubs = rowsToType<{id: string, name: string}>(clubsResult.rows);
        
        const data: any = {
            activeClubId: memberClubIds[0],
            clubs: {}
        };
        
        for (const club of clubs) {
             const matchesResult = await db.execute({
                 sql: 'SELECT * FROM club_matches WHERE club_id = ? ORDER BY match_date, match_time',
                 args: [club.id]
             });
             const matches = rowsToType<ClubSpecificMatch>(matchesResult.rows);
             
             const assignmentsResult = await db.execute({
                 sql: 'SELECT match_id, assigned_referee_id FROM match_assignments WHERE club_id = ? AND assigned_referee_id = ?',
                 args: [club.id, userId]
             });
             const assignments = rowsToType<MatchAssignment>(assignmentsResult.rows);
             
             const postulationResult = await db.execute({
                 sql: `SELECT * FROM shift_requests WHERE user_id = ? AND club_id = ? AND status = 'pending'`,
                 args: [userId, club.id]
             });
             const postulationRow = rowsToType<ShiftRequest>(postulationResult.rows)[0];
             
             let postulationWithMatches: ShiftRequestWithMatches | null = null;
             if(postulationRow) {
                const postulatedMatchIdsResult = await db.execute({
                    sql: 'SELECT match_id FROM shift_request_matches WHERE request_id = ?',
                    args: [postulationRow.id]
                });
                const postulatedMatchIds = postulatedMatchIdsResult.rows.map(r => r.match_id as string);
                const selectedMatches = matches.filter(m => postulatedMatchIds.includes(m.id));
                postulationWithMatches = { 
                    ...postulationRow, 
                    hasCar: !!postulationRow.hasCar,
                    selectedMatches 
                };
             }

             data.clubs[club.id] = {
                id: club.id,
                name: club.name,
                matches,
                assignments,
                postulation: postulationWithMatches,
             };
        }
        
        return data;

    } catch (e: any) {
        console.error("getAvailabilityFormData error:", e);
        return null;
    }
}


const availabilitySchema = z.object({
  selectedMatchIds: z.array(z.string()).min(1),
  hasCar: z.string().transform(s => s === 'true'),
  notes: z.string().optional(),
  selectedClubId: z.string(),
});

export async function submitAvailability(payload: z.infer<typeof availabilitySchema>) {
    const validation = availabilitySchema.safeParse(payload);
    if (!validation.success) {
        return { error: 'Datos de postulación inválidos.' };
    }
    const { selectedMatchIds, hasCar, notes, selectedClubId } = validation.data;
    
    const session = await createSession(); // Gets current user or redirects
    const userId = session.userId;

    try {
        const existingResult = await db.execute({
            sql: `SELECT id FROM shift_requests WHERE user_id = ? AND club_id = ? AND status = 'pending'`,
            args: [userId, selectedClubId]
        });
        if (existingResult.rows.length > 0) {
            return { error: "Ya tienes una postulación pendiente para este club. Por favor, edítala." };
        }

        const requestId = `req_${crypto.randomUUID()}`;
        const submittedAt = new Date().toISOString();

        const tx = await db.transaction('write');
        try {
            await tx.execute({
                sql: 'INSERT INTO shift_requests (id, user_id, club_id, has_car, notes, status, submitted_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
                args: [requestId, userId, selectedClubId, hasCar ? 1 : 0, notes, 'pending', submittedAt]
            });
            for (const matchId of selectedMatchIds) {
                await tx.execute({
                    sql: 'INSERT INTO shift_request_matches (request_id, match_id) VALUES (?, ?)',
                    args: [requestId, matchId]
                });
            }
            await tx.commit();
        } catch (err) {
            await tx.rollback();
            throw err;
        }

        return { success: true };
    } catch(e: any) {
        console.error("submitAvailability error:", e);
        return { error: 'No se pudo guardar la postulación.' };
    }
}


export async function updateAvailability(requestId: string, payload: z.infer<typeof availabilitySchema>) {
    const validation = availabilitySchema.safeParse(payload);
    if (!validation.success) {
        return { error: 'Datos de postulación inválidos.' };
    }
    const { selectedMatchIds, hasCar, notes, selectedClubId } = validation.data;
    
    const session = await createSession();
    const userId = session.userId;

    try {
        const requestResult = await db.execute({
            sql: `SELECT * FROM shift_requests WHERE id = ? AND user_id = ?`,
            args: [requestId, userId]
        });
        const request = rowsToType<ShiftRequest>(requestResult.rows)[0];

        if (!request) {
            return { error: 'Postulación no encontrada o no tienes permiso para editarla.' };
        }

        const matchesInRequestResult = await db.execute({
            sql: 'SELECT match_id FROM shift_request_matches WHERE request_id = ?',
            args: [requestId]
        });
        const matchIdsInRequest = matchesInRequestResult.rows.map(r => r.match_id as string);

        if (matchIdsInRequest.length > 0) {
            const matchesInRequestDataResult = await db.execute({
                sql: `SELECT * FROM club_matches WHERE id IN (${matchIdsInRequest.map(() => '?').join(',')})`,
                args: [...matchIdsInRequest]
            });
            const matchesInRequest = rowsToType<ClubSpecificMatch>(matchesInRequestDataResult.rows);

            const assignmentsForUserResult = await db.execute({
                sql: 'SELECT match_id, assigned_referee_id FROM match_assignments WHERE club_id = ? AND assigned_referee_id = ?',
                args: [selectedClubId, userId]
            });
            const assignmentsForUser = rowsToType<MatchAssignment>(assignmentsForUserResult.rows);
            
            if (!isPostulationEditable(matchesInRequest, assignmentsForUser)) {
                return { error: 'La postulación no es editable porque uno o más partidos están muy próximos o ya han sido asignados.' };
            }
        }

        const tx = await db.transaction('write');
        try {
            await tx.execute({
                sql: 'UPDATE shift_requests SET has_car = ?, notes = ?, submitted_at = ? WHERE id = ?',
                args: [hasCar ? 1 : 0, notes, new Date().toISOString(), requestId]
            });
            await tx.execute({
                sql: 'DELETE FROM shift_request_matches WHERE request_id = ?',
                args: [requestId]
            });
            for (const matchId of selectedMatchIds) {
                await tx.execute({
                    sql: 'INSERT INTO shift_request_matches (request_id, match_id) VALUES (?, ?)',
                    args: [requestId, matchId]
                });
            }
            await tx.commit();
        } catch(err) {
            await tx.rollback();
            throw err;
        }

        return { success: true };
    } catch(e: any) {
        console.error("updateAvailability error:", e);
        return { error: 'No se pudo actualizar la postulación.' };
    }
}


export async function assignRefereeToMatch(clubId: string, matchId: string, refereeId: string) {
    try {
        const matchToAssignResult = await db.execute({
            sql: 'SELECT * FROM club_matches WHERE id = ?',
            args: [matchId]
        });
        const matchToAssign = rowsToType<ClubSpecificMatch>(matchToAssignResult.rows)[0];
        if (!matchToAssign) {
            return { error: "El partido a asignar no fue encontrado." };
        }

        const refereeAssignmentsResult = await db.execute({
            sql: `
                SELECT m.description, m.match_date, m.match_time
                FROM match_assignments a
                JOIN club_matches m ON a.match_id = m.id
                WHERE a.assigned_referee_id = ? AND a.club_id = ?
            `,
            args: [refereeId, clubId]
        });

        for (const row of refereeAssignmentsResult.rows) {
             const currentAsg = rowsToType<any>([row])[0];
             if (currentAsg.matchDate === matchToAssign.date && currentAsg.matchTime === matchToAssign.time) {
                return { error: `Este árbitro ya está asignado a "${currentAsg.description}" a la misma fecha y hora.` };
             }
        }
        
        const existingAssignmentResult = await db.execute({
            sql: 'SELECT id FROM match_assignments WHERE match_id = ?',
            args: [matchId]
        });
        const existingAssignment = existingAssignmentResult.rows[0];

        if (existingAssignment) {
            await db.execute({
                sql: 'UPDATE match_assignments SET assigned_referee_id = ?, assigned_at = ? WHERE match_id = ?',
                args: [refereeId, new Date().toISOString(), matchId]
            });
        } else {
            await db.execute({
                sql: 'INSERT INTO match_assignments (club_id, match_id, assigned_referee_id, assigned_at) VALUES (?, ?, ?, ?)',
                args: [clubId, matchId, refereeId, new Date().toISOString()]
            });
        }

        return { success: true };
    } catch(e: any) {
        console.error("assignRefereeToMatch error:", e);
        return { error: 'No se pudo asignar al árbitro.' };
    }
}

export async function unassignRefereeFromMatch(clubId: string, matchId: string) {
    try {
        await db.execute({
            sql: 'DELETE FROM match_assignments WHERE club_id = ? AND match_id = ?',
            args: [clubId, matchId]
        });
        return { success: true };
    } catch(e: any) {
        console.error("unassignRefereeFromMatch error:", e);
        return { error: 'No se pudo quitar la asignación.' };
    }
}
