
'use server';
import 'server-only';

import { db } from './db';
import type { Club, ClubSpecificMatch, MatchAssignment, RegisterUserPayload, ShiftRequest, ShiftRequestWithMatches, Suggestion, User, UserStats } from '@/types';
import { getUserFromSession, createSession, deleteSession, getFullUserFromDb } from './session';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { isPostulationEditable, rowsToType } from './utils';
import { createHmac, randomBytes } from 'crypto';
import { isBefore, parseISO, startOfDay, formatISO } from 'date-fns';

// This is a utility for hashing passwords. We'll use the built-in crypto module.
async function hashPassword(password: string): Promise<string> {
    const secret = process.env.PASSWORD_SECRET;
    if (!secret) {
        console.error('PASSWORD_SECRET environment variable is not set');
        throw new Error('La configuración del servidor está incompleta. No se pudo procesar la contraseña.');
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
  password: z.string().min(6)
    .regex(/^(?=.*[A-Z])(?=.*\d).+$/, { message: "La contraseña debe contener al menos una letra mayúscula y un número." }),
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
    const newUserId = `user_${randomBytes(8).toString('hex')}`;
    let userRoleForRedirect: 'admin' | 'referee';

    try {
        const existingUserResult = await db.execute({
            sql: 'SELECT id FROM users WHERE email = ?',
            args: [email]
        });
        if (existingUserResult.rows.length > 0) {
            return { error: 'El correo electrónico ya está registrado.' };
        }

        const hashedPassword = await hashPassword(password);
        
        const tx = await db.transaction('write');
        try {
            if (role === 'admin') {
                if (!clubName) throw new Error('El nombre de la asociación es requerido para administradores.');
                userRoleForRedirect = 'admin';
                const newClubId = `club_${randomBytes(4).toString('hex')}`;

                await tx.execute({
                    sql: 'INSERT INTO users (id, name, email, password, role) VALUES (?, ?, ?, ?, ?)',
                    args: [newUserId, name, email, hashedPassword, role]
                });
                await tx.execute({
                    sql: 'INSERT INTO clubs (id, name) VALUES (?, ?)',
                    args: [newClubId, clubName]
                });
                await tx.execute({
                    sql: 'INSERT INTO user_clubs_membership (user_id, club_id, role_in_club) VALUES (?, ?, ?)',
                    args: [newUserId, newClubId, 'admin']
                });

            } else { // role === 'referee'
                if (!clubIdToJoin) throw new Error('El código de asociación es requerido para árbitros.');
                userRoleForRedirect = 'referee';
                const clubResult = await tx.execute({ sql: 'SELECT id FROM clubs WHERE id = ?', args: [clubIdToJoin] });
                if (clubResult.rows.length === 0) {
                    throw new Error('El código de asociación no es válido.');
                }
                
                await tx.execute({
                    sql: 'INSERT INTO users (id, name, email, password, role) VALUES (?, ?, ?, ?, ?)',
                    args: [newUserId, name, email, hashedPassword, role]
                });
                await tx.execute({
                    sql: 'INSERT INTO user_clubs_membership (user_id, club_id, role_in_club) VALUES (?, ?, ?)',
                    args: [newUserId, clubIdToJoin, 'referee']
                });
            }
            await tx.commit();
        } catch (err: any) {
            await tx.rollback();
            return { error: err.message || 'Ocurrió un error en la base de datos.' };
        }

        await createSession(newUserId);

    } catch (e: any) {
        console.error("Error en registerUser:", e.message);
        return { error: `Ocurrió un error en el servidor: ${e.message}` };
    }

    const destination = userRoleForRedirect === 'admin' ? '/admin' : '/';
    return { success: true, redirectUrl: destination };
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
    let userFromDb: User;

    try {
        const result = await db.execute({
            sql: 'SELECT id, password, role FROM users WHERE email = ?',
            args: [email]
        });
        
        if (result.rows.length === 0) {
            return { error: 'Correo electrónico o contraseña incorrectos.' };
        }
        
        userFromDb = rowsToType<User>(result.rows)[0];

        const passwordMatch = await verifyPassword(password, userFromDb.password as string);
        if (!passwordMatch) {
            return { error: 'Correo electrónico o contraseña incorrectos.' };
        }
        
        await createSession(userFromDb.id);
        
    } catch (e: any) {
        console.error("Error en login:", e.message);
        return { error: `Ocurrió un error en el servidor: ${e.message}` };
    }
    
    const redirectUrl = userFromDb.role === 'admin' ? '/admin' : '/';
    return { success: true, redirectUrl };
}

export async function logout() {
    await deleteSession();
    redirect('/login');
}

export async function getAdminPageData(clubId: string) {
    try {
        // Run queries in parallel for better performance
        const [
            clubResult,
            refereesResult,
            shiftRequestsRawResult,
            definedMatchesResult,
            matchAssignmentsResult,
        ] = await Promise.all([
            db.execute({ sql: 'SELECT * FROM clubs WHERE id = ?', args: [clubId] }),
            db.execute({
                sql: `
                    SELECT u.id, u.name, u.email, u.role
                    FROM users u
                    JOIN user_clubs_membership ucm ON u.id = ucm.user_id
                    WHERE ucm.club_id = ? AND u.role = 'referee'
                `,
                args: [clubId]
            }),
            db.execute({
                sql: `
                    SELECT 
                        sr.id, sr.user_id, sr.club_id, sr.has_car, sr.notes, sr.status, sr.submitted_at,
                        srm.match_id
                    FROM shift_requests sr
                    LEFT JOIN shift_request_matches srm ON sr.id = srm.request_id
                    WHERE sr.club_id = ?
                `,
                args: [clubId]
            }),
            db.execute({
                sql: 'SELECT id, club_id, description, match_date as date, match_time as time, location, status FROM club_matches WHERE club_id = ? ORDER BY date, time',
                args: [clubId]
            }),
            db.execute({
                sql: 'SELECT id, club_id, match_id, assigned_referee_id, assigned_at FROM match_assignments WHERE club_id = ?',
                args: [clubId]
            }),
        ]);

        const club = rowsToType<Club>(clubResult.rows)[0];
        if (!club) return null;

        const referees = rowsToType<User>(refereesResult.rows);
        const shiftRequestsRaw = shiftRequestsRawResult.rows;
        const definedMatches = rowsToType<ClubSpecificMatch>(definedMatchesResult.rows);
        const matchAssignments = rowsToType<MatchAssignment>(matchAssignmentsResult.rows);

        // Process shift requests to group matches by request ID
        const requestsMap = new Map<string, ShiftRequestWithMatches>();
        for (const row of shiftRequestsRaw) {
             const typedRow = rowsToType<any>([row])[0];
            
            if (!typedRow.id) continue;

            if (requestsMap.has(typedRow.id as string)) {
                if (typedRow.matchId) {
                    const match = definedMatches.find(m => m.id === typedRow.matchId);
                    if (match) {
                        requestsMap.get(typedRow.id as string)!.selectedMatches.push(match);
                    }
                }
            } else {
                const selectedMatches = [];
                if (typedRow.matchId) {
                    const match = definedMatches.find(m => m.id === typedRow.matchId);
                    if (match) selectedMatches.push(match);
                }

                requestsMap.set(typedRow.id as string, {
                    id: typedRow.id as string,
                    userId: typedRow.userId as string,
                    clubId: typedRow.clubId as string,
                    hasCar: !!typedRow.hasCar,
                    notes: typedRow.notes as string,
                    status: typedRow.status as 'pending' | 'completed',
                    submittedAt: typedRow.submittedAt as string,
                    selectedMatches,
                });
            }
        }
        const shiftRequests = Array.from(requestsMap.values());

        return {
            club,
            referees,
            shiftRequests,
            definedMatches,
            matchAssignments,
        };

    } catch (e: any) {
        console.error("getAdminPageData error:", e.message);
        return null;
    }
}

export async function getSuggestions(): Promise<Suggestion[]> {
    const user = await getUserFromSession();
    // Extra security: only fetch if the user is truly the developer.
    if (!user?.isDeveloper) {
        return [];
    }
    try {
        const suggestionsResult = await db.execute({ 
            sql: 'SELECT id, user_id, user_name, suggestion_text, submitted_at FROM suggestions ORDER BY submitted_at DESC',
            args: [] 
        });
        return rowsToType<Suggestion>(suggestionsResult.rows);
    } catch (error) {
        console.error("Error fetching suggestions:", error);
        return [];
    }
}


export async function saveClubDefinedMatches(clubId: string, matches: Omit<ClubSpecificMatch, 'clubId'>[]) {
    const user = await getUserFromSession();
    if (!user || user.role !== 'admin' || !user.administeredClubIds?.includes(clubId)) {
        return { success: false, error: 'No tienes permiso para realizar esta acción.' };
    }
    
    const tx = await db.transaction('write');
    try {
        const existingMatchesResult = await tx.execute({ sql: 'SELECT id FROM club_matches WHERE club_id = ?', args: [clubId]});
        const existingMatchIds = new Set(existingMatchesResult.rows.map(r => r.id as string));
        const incomingMatchIds = new Set(matches.map(m => m.id));

        const matchesToDelete = [...existingMatchIds].filter(id => !incomingMatchIds.has(id));

        if (matchesToDelete.length > 0) {
            const deleteAssignmentsSql = `DELETE FROM match_assignments WHERE match_id IN (${matchesToDelete.map(() => '?').join(',')})`;
            await tx.execute({ sql: deleteAssignmentsSql, args: matchesToDelete });

            const deleteMatchesSql = `DELETE FROM club_matches WHERE id IN (${matchesToDelete.map(() => '?').join(',')})`;
            await tx.execute({ sql: deleteMatchesSql, args: matchesToDelete });
        }
        
        for (const match of matches) {
            const matchDate = match.date;
            const matchTime = match.time;
            const matchStatus = match.status;

            if (existingMatchIds.has(match.id)) {
                 await tx.execute({
                    sql: 'UPDATE club_matches SET description = ?, match_date = ?, match_time = ?, location = ?, status = ? WHERE id = ? AND club_id = ?',
                    args: [match.description, matchDate, matchTime, match.location, matchStatus, match.id, clubId]
                });
            } else {
                await tx.execute({
                    sql: 'INSERT INTO club_matches (id, club_id, description, match_date, match_time, location, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
                    args: [match.id, clubId, match.description, matchDate, matchTime, match.location, matchStatus]
                });
            }
        }
        await tx.commit();
        return { success: true };
    } catch(e: any) {
        await tx.rollback();
        console.error("saveClubDefinedMatches error", e.message);
        return { success: false, error: 'No se pudieron guardar los partidos.' };
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
        
        // Fetch data for all clubs in parallel
        const clubDataPromises = clubs.map(async (club) => {
            const [matchesResult, assignmentsResult, postulationResult] = await Promise.all([
                db.execute({
                    sql: 'SELECT id, club_id, description, match_date as date, match_time as time, location, status FROM club_matches WHERE club_id = ? ORDER BY date, time',
                    args: [club.id]
                }),
                db.execute({
                    sql: 'SELECT match_id, assigned_referee_id FROM match_assignments WHERE club_id = ? AND assigned_referee_id = ?',
                    args: [club.id, userId]
                }),
                db.execute({
                    sql: `SELECT * FROM shift_requests WHERE user_id = ? AND club_id = ? AND status = 'pending'`,
                    args: [userId, club.id]
                })
            ]);

            const matches = rowsToType<ClubSpecificMatch>(matchesResult.rows);
            const assignments = rowsToType<Omit<MatchAssignment, 'id'| 'clubId' | 'assignedAt'>>(assignmentsResult.rows);
            const postulationRow = rowsToType<ShiftRequest>(postulationResult.rows)[0];
            
            let postulationWithMatches: ShiftRequestWithMatches | null = null;
            if (postulationRow) {
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

            return {
                id: club.id,
                data: {
                    id: club.id,
                    name: club.name,
                    matches,
                    assignments,
                    postulation: postulationWithMatches,
                }
            };
        });

        const allClubData = await Promise.all(clubDataPromises);
        allClubData.forEach(cd => {
            data.clubs[cd.id] = cd.data;
        });
        
        return data;

    } catch (e: any) {
        console.error("getAvailabilityFormData error:", e.message);
        return null;
    }
}


const availabilitySchema = z.object({
  selectedMatchIds: z.array(z.string()).refine((value) => value.length > 0, {
    message: "Debes seleccionar al menos un partido/turno.",
  }),
  hasCar: z.boolean(),
  notes: z.string().max(500, "Las notas no pueden exceder los 500 caracteres.").optional(),
  selectedClubId: z.string(),
});

export async function submitAvailability(payload: z.infer<typeof availabilitySchema>) {
    const validation = availabilitySchema.safeParse(payload);
    if (!validation.success) {
        return { error: 'Datos de postulación inválidos.' };
    }
    const { selectedMatchIds, hasCar, notes, selectedClubId } = validation.data;
    
    const user = await getUserFromSession();
    if (!user) {
        return { error: 'Sesión no válida. Por favor, inicie sesión de nuevo.' };
    }
    const userId = user.id;

    try {
        const existingResult = await db.execute({
            sql: `SELECT id FROM shift_requests WHERE user_id = ? AND club_id = ? AND status = 'pending'`,
            args: [userId, selectedClubId]
        });
        if (existingResult.rows.length > 0) {
            return { error: "Ya tienes una postulación pendiente para esta asociación. Por favor, edítala." };
        }

        const requestId = `req_${randomBytes(6).toString('hex')}`;
        const submittedAt = new Date().toISOString();

        const tx = await db.transaction('write');
        try {
            await tx.execute({
                sql: 'INSERT INTO shift_requests (id, user_id, club_id, has_car, notes, status, submitted_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
                args: [requestId, userId, selectedClubId, hasCar ? 1 : 0, notes ?? null, 'pending', submittedAt]
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
        console.error("submitAvailability error:", e.message);
        return { error: 'No se pudo guardar la postulación.' };
    }
}

export async function updateAvailability(requestId: string, payload: z.infer<typeof availabilitySchema>) {
    const validation = availabilitySchema.safeParse(payload);
    if (!validation.success) {
        return { error: 'Datos de postulación inválidos.' };
    }
    const { selectedMatchIds, hasCar, notes, selectedClubId } = validation.data;
    
    const user = await getUserFromSession();
    if (!user) {
        return { error: 'Sesión no válida. Por favor, inicie sesión de nuevo.' };
    }
    const userId = user.id;

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
                sql: `SELECT id, club_id, description, match_date as date, match_time as time, location, status FROM club_matches WHERE id IN (${matchIdsInRequest.map(() => '?').join(',')})`,
                args: [...matchIdsInRequest]
            });
            const matchesInRequest = rowsToType<ClubSpecificMatch>(matchesInRequestDataResult.rows);

            const assignmentsForUserResult = await db.execute({
                sql: 'SELECT match_id, assigned_referee_id FROM match_assignments WHERE club_id = ? AND assigned_referee_id = ?',
                args: [selectedClubId, userId]
            });
            const assignmentsForUser = rowsToType<Omit<MatchAssignment, 'id'| 'clubId' | 'assignedAt'>>(assignmentsForUserResult.rows);
            
            if (!isPostulationEditable(matchesInRequest, assignmentsForUser)) {
                return { error: 'La postulación no es editable porque uno o más partidos están muy próximos o ya han sido asignados.' };
            }
        }

        const tx = await db.transaction('write');
        try {
            await tx.execute({
                sql: 'UPDATE shift_requests SET has_car = ?, notes = ?, submitted_at = ? WHERE id = ?',
                args: [hasCar ? 1 : 0, notes ?? null, new Date().toISOString(), requestId]
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
        console.error("updateAvailability error:", e.message);
        return { error: 'No se pudo actualizar la postulación.' };
    }
}

export async function assignRefereeToMatch(clubId: string, matchId: string, refereeId: string) {
    const user = await getUserFromSession();
    if (!user || user.role !== 'admin' || !user.administeredClubIds?.includes(clubId)) {
        return { success: false, error: 'No tienes permiso para realizar esta acción.' };
    }

    try {
        const [matchToAssignResult, refereeAssignmentsResult] = await Promise.all([
             db.execute({
                sql: 'SELECT id, club_id, description, match_date as date, match_time as time, location, status FROM club_matches WHERE id = ?',
                args: [matchId]
            }),
             db.execute({
                sql: `
                    SELECT m.description, m.match_date as date, m.match_time as time
                    FROM match_assignments a
                    JOIN club_matches m ON a.match_id = m.id
                    WHERE a.assigned_referee_id = ? AND a.club_id = ? AND m.status = 'scheduled'
                `,
                args: [refereeId, clubId]
            })
        ]);
        
        const matchToAssign = rowsToType<ClubSpecificMatch>(matchToAssignResult.rows)[0];
        if (!matchToAssign) {
            return { error: "El partido a asignar no fue encontrado." };
        }

        for (const row of refereeAssignmentsResult.rows) {
             const currentAsg = rowsToType<any>([row])[0];
             if (currentAsg.date === matchToAssign.date && currentAsg.time === matchToAssign.time) {
                return { error: `Este árbitro ya está asignado a "${currentAsg.description}" a la misma fecha y hora.` };
             }
        }
        
        await db.execute({
            sql: `
                INSERT INTO match_assignments (club_id, match_id, assigned_referee_id, assigned_at) 
                VALUES (?, ?, ?, ?)
                ON CONFLICT(match_id) DO UPDATE SET
                assigned_referee_id = excluded.assigned_referee_id,
                assigned_at = excluded.assigned_at
            `,
            args: [clubId, matchId, refereeId, new Date().toISOString()]
        });

        return { success: true };
    } catch(e: any) {
        console.error("assignRefereeToMatch error:", e.message);
        return { error: 'No se pudo asignar al árbitro.' };
    }
}

export async function unassignRefereeFromMatch(clubId: string, matchId: string) {
    const user = await getUserFromSession();
    if (!user || user.role !== 'admin' || !user.administeredClubIds?.includes(clubId)) {
        return { success: false, error: 'No tienes permiso para realizar esta acción.' };
    }
    try {
        await db.execute({
            sql: 'DELETE FROM match_assignments WHERE club_id = ? AND match_id = ?',
            args: [clubId, matchId]
        });
        return { success: true };
    } catch(e: any) {
        console.error("unassignRefereeFromMatch error:", e.message);
        return { error: 'No se pudo quitar la asignación.' };
    }
}


const suggestionSchema = z.string().min(10, { message: "La sugerencia debe tener al menos 10 caracteres."}).max(1000, { message: "La sugerencia no puede exceder los 1000 caracteres."});

export async function submitSuggestion(suggestionText: string) {
    const validation = suggestionSchema.safeParse(suggestionText);
    if (!validation.success) {
        return { success: false, error: validation.error.errors[0].message };
    }

    try {
        const user = await getUserFromSession();
        
        const newSuggestionId = `sug_${randomBytes(6).toString('hex')}`;
        const submittedAt = new Date().toISOString();
        const userId = user?.id ?? null;
        const userName = user?.name ?? 'Anónimo';

        await db.execute({
            sql: 'INSERT INTO suggestions (id, user_id, user_name, suggestion_text, submitted_at) VALUES (?, ?, ?, ?, ?)',
            args: [newSuggestionId, userId, userName, validation.data, submittedAt]
        });
        
        return { success: true };
    } catch(e: any) {
        console.error("submitSuggestion error:", e.message);
        return { success: false, error: "Ocurrió un error al enviar tu sugerencia." };
    }
}

export async function joinAnotherClub(clubIdToJoin: string) {
    const user = await getUserFromSession();
    if (!user || user.role !== 'referee') {
        return { success: false, error: 'Solo los árbitros pueden unirse a asociaciones.' };
    }
    const userId = user.id;

    const clubIdToJoinTrimmed = clubIdToJoin.trim();
    if (!clubIdToJoinTrimmed) {
        return { success: false, error: 'El código de asociación no puede estar vacío.' };
    }

    try {
        const tx = await db.transaction('write');
        try {
            const clubResult = await tx.execute({ sql: 'SELECT id FROM clubs WHERE id = ?', args: [clubIdToJoinTrimmed] });
            if (clubResult.rows.length === 0) {
                await tx.rollback();
                return { success: false, error: 'El código de asociación no es válido.' };
            }

            const membershipResult = await tx.execute({
                sql: 'SELECT user_id FROM user_clubs_membership WHERE user_id = ? AND club_id = ?',
                args: [userId, clubIdToJoinTrimmed]
            });

            if (membershipResult.rows.length > 0) {
                await tx.rollback();
                return { success: false, error: 'Ya eres miembro de esta asociación.' };
            }

            await tx.execute({
                sql: 'INSERT INTO user_clubs_membership (user_id, club_id, role_in_club) VALUES (?, ?, ?)',
                args: [userId, clubIdToJoinTrimmed, 'referee']
            });
            await tx.commit();
        } catch (err: any) {
            await tx.rollback();
            throw err;
        }

        return { success: true, newClubId: clubIdToJoinTrimmed };

    } catch (e: any) {
        console.error("joinAnotherClub error:", e.message);
        return { success: false, error: 'Ocurrió un error al intentar unirte a la asociación.' };
    }
}

const changePasswordSchema = z.object({
  currentPassword: z.string(),
  newPassword: z.string().min(6),
});

export async function changePassword(payload: z.infer<typeof changePasswordSchema>) {
    const user = await getUserFromSession();
    if (!user) {
        return { success: false, error: "Debes iniciar sesión para cambiar tu contraseña." };
    }

    const validation = changePasswordSchema.safeParse(payload);
    if (!validation.success) {
        return { success: false, error: "Los datos proporcionados no son válidos." };
    }
    
    const { currentPassword, newPassword } = validation.data;
    
    try {
        const userWithPasswordResult = await db.execute({
            sql: 'SELECT password FROM users WHERE id = ?',
            args: [user.id]
        });
        
        const userWithPassword = rowsToType<{password: string}>(userWithPasswordResult.rows)[0];
        if (!userWithPassword) {
            return { success: false, error: "No se encontró al usuario." };
        }
        
        const isPasswordCorrect = await verifyPassword(currentPassword, userWithPassword.password);
        if (!isPasswordCorrect) {
            return { success: false, error: "La contraseña actual es incorrecta." };
        }
        
        const newHashedPassword = await hashPassword(newPassword);
        
        await db.execute({
            sql: 'UPDATE users SET password = ? WHERE id = ?',
            args: [newHashedPassword, user.id]
        });
        
        return { success: true };

    } catch (e: any) {
        console.error("changePassword error:", e.message);
        return { success: false, error: "Ocurrió un error al cambiar la contraseña." };
    }
}

export async function getAccountPageData(userId: string): Promise<{ user: User, stats: UserStats }> {
    const sessionUser = await getUserFromSession();
    if (!sessionUser || sessionUser.id !== userId) {
        throw new Error("No autorizado");
    }

    try {
        const associationsPromise = db.execute({
            sql: `SELECT COUNT(club_id) as count FROM user_clubs_membership WHERE user_id = ?`,
            args: [userId]
        });

        const assignedMatchesPromise = db.execute({
            sql: `SELECT m.status, m.match_date 
                  FROM match_assignments as a
                  JOIN club_matches as m ON a.match_id = m.id
                  WHERE a.assigned_referee_id = ?`,
            args: [userId]
        });

        const postulationsPromise = db.execute({
            sql: `SELECT COUNT(id) as count FROM shift_requests WHERE user_id = ?`,
            args: [userId]
        });

        const [associationsResult, assignedMatchesResult, postulationsResult] = await Promise.all([
            associationsPromise,
            assignedMatchesPromise,
            postulationsPromise
        ]);

        const assignedMatches = rowsToType<{status: 'scheduled' | 'cancelled' | 'postponed', matchDate: string}>(assignedMatchesResult.rows);

        let refereedMatchesCount = 0;
        let cancelledMatchesCount = 0;
        const today = startOfDay(new Date());

        assignedMatches.forEach(match => {
            if (match.status === 'cancelled') {
                cancelledMatchesCount++;
            } else if (match.status === 'scheduled' && isBefore(parseISO(match.matchDate), today)) {
                refereedMatchesCount++;
            }
        });

        const stats: UserStats = {
            associationsCount: Number(associationsResult.rows[0]?.count ?? 0),
            refereedMatchesCount: refereedMatchesCount,
            cancelledMatchesCount: cancelledMatchesCount,
            postulationsCount: Number(postulationsResult.rows[0]?.count ?? 0)
        };
        
        // Return a fresh user object to ensure data consistency
        const user = await getFullUserFromDb(userId);
        if (!user) throw new Error("Usuario no encontrado al obtener datos de la cuenta.");

        return { user, stats };
    } catch (e: any) {
        console.error("Error fetching account page data:", e.message);
        // Fallback to ensure the page doesn't crash
        const user = await getFullUserFromDb(userId);
        if (!user) throw new Error("Fallo crítico al buscar usuario.");

        return { user, stats: { associationsCount: 0, refereedMatchesCount: 0, cancelledMatchesCount: 0, postulationsCount: 0 }};
    }
}
