
'use server';
import 'server-only';

import { db } from './db';
import type { Club, ClubSpecificMatch, MatchAssignment, RegisterUserPayload, ShiftRequest, ShiftRequestWithMatches, Suggestion, User, UserStatMatch, UserStats } from '@/types';
import { getUserFromSession, createSession, deleteSession, getFullUserFromDb } from './session';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { isMatchEditable, isPostulationEditable, rowsToType } from './utils';
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
            await tx.execute({
                sql: 'INSERT INTO users (id, name, email, password) VALUES (?, ?, ?, ?)',
                args: [newUserId, name, email, hashedPassword]
            });

            if (role === 'admin') {
                if (!clubName) throw new Error('El nombre de la asociación es requerido para administradores.');
                const newClubId = `club_${randomBytes(8).toString('hex')}`;
                
                await tx.execute({
                    sql: 'INSERT INTO clubs (id, name) VALUES (?, ?)',
                    args: [newClubId, clubName]
                });
                // Add user as both admin and referee for the new club
                await tx.execute({
                    sql: 'INSERT INTO user_clubs_membership (user_id, club_id, role_in_club) VALUES (?, ?, ?)',
                    args: [newUserId, newClubId, 'admin']
                });
                await tx.execute({
                    sql: 'INSERT INTO user_clubs_membership (user_id, club_id, role_in_club) VALUES (?, ?, ?)',
                    args: [newUserId, newClubId, 'referee']
                });

            } else { // role === 'referee'
                if (!clubIdToJoin) throw new Error('El código de asociación es requerido para árbitros.');
                const clubResult = await tx.execute({ sql: 'SELECT id FROM clubs WHERE id = ?', args: [clubIdToJoin] });
                if (clubResult.rows.length === 0) {
                    throw new Error('El código de asociación no es válido.');
                }
                
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

    const user = await getFullUserFromDb(newUserId);
    const destination = user?.isAdmin ? '/admin' : '/';
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
    let userFromDb: User | null;

    try {
        const result = await db.execute({
            sql: 'SELECT id, password FROM users WHERE email = ?',
            args: [email]
        });
        
        if (result.rows.length === 0) {
            return { error: 'Correo electrónico o contraseña incorrectos.' };
        }
        
        const rawUser = rowsToType<User>(result.rows)[0];

        const passwordMatch = await verifyPassword(password, rawUser.password as string);
        if (!passwordMatch) {
            return { error: 'Correo electrónico o contraseña incorrectos.' };
        }
        
        await createSession(rawUser.id);
        userFromDb = await getFullUserFromDb(rawUser.id);
        
    } catch (e: any) {
        console.error("Error en login:", e.message);
        return { error: `Ocurrió un error en el servidor: ${e.message}` };
    }

    if (!userFromDb) {
        return { error: 'No se pudo cargar la información del usuario después del inicio de sesión.' };
    }
    
    const redirectUrl = userFromDb.isAdmin ? '/admin' : '/';
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
            usersInClubResult,
            clubMembershipsResult,
            shiftRequestsRawResult,
            definedMatchesResult,
            matchAssignmentsResult,
        ] = await Promise.all([
            db.execute({ sql: 'SELECT * FROM clubs WHERE id = ?', args: [clubId] }),
            db.execute({
                sql: `
                    SELECT u.id, u.name, u.email 
                    FROM users u 
                    JOIN (SELECT DISTINCT user_id FROM user_clubs_membership WHERE club_id = ?) as members ON u.id = members.user_id
                    ORDER BY u.name ASC
                `,
                args: [clubId]
            }),
            db.execute({
                sql: `SELECT user_id, role_in_club FROM user_clubs_membership WHERE club_id = ?`,
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
                sql: 'SELECT id, club_id, match_id, assigned_referee_id, assignment_role, assigned_at FROM match_assignments WHERE club_id = ?',
                args: [clubId]
            }),
        ]);

        const club = rowsToType<Club>(clubResult.rows)[0];
        if (!club) return null;

        // Process members and their roles robustly
        const usersInClub = rowsToType<User>(usersInClubResult.rows);
        const memberships = rowsToType<{ userId: string, roleInClub: 'admin' | 'referee' }>(clubMembershipsResult.rows);

        const membershipsByUserId = new Map<string, Array<'admin' | 'referee'>>();
        for (const membership of memberships) {
            if (!membershipsByUserId.has(membership.userId)) {
                membershipsByUserId.set(membership.userId, []);
            }
            membershipsByUserId.get(membership.userId)!.push(membership.roleInClub);
        }

        const clubMembers: User[] = usersInClub.map(user => {
            const roles = membershipsByUserId.get(user.id) || [];
            const primaryRole: 'admin' | 'referee' = roles.includes('admin') ? 'admin' : 'referee';
            return {
                ...user,
                roleInClub: primaryRole,
            };
        });

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
            clubMembers,
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
    if (!user || !user.isAdmin || !user.administeredClubIds?.includes(clubId)) {
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
        // Use a Set to handle cases where a user has multiple roles in the same club
        const memberClubIds = [...new Set(memberClubIdsResult.rows.map(r => r.club_id as string))];

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
                    sql: 'SELECT id, club_id, match_id, assigned_referee_id, assignment_role, assigned_at FROM match_assignments WHERE club_id = ? AND assigned_referee_id = ?',
                    args: [club.id, userId]
                }),
                db.execute({
                    sql: `SELECT * FROM shift_requests WHERE user_id = ? AND club_id = ? AND status = 'pending'`,
                    args: [userId, club.id]
                })
            ]);

            const matches = rowsToType<ClubSpecificMatch>(matchesResult.rows);
            const assignments = rowsToType<MatchAssignment>(assignmentsResult.rows);
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

        // --- NEW VALIDATION LOGIC ---
        // Fetch all matches the user is trying to apply for
        const matchesResult = await db.execute({
            sql: `SELECT id, club_id, description, match_date as date, match_time as time, location, status FROM club_matches WHERE id IN (${selectedMatchIds.map(() => '?').join(',')})`,
            args: [...selectedMatchIds]
        });
        const selectedMatchesData = rowsToType<ClubSpecificMatch>(matchesResult.rows);

        // Ensure all provided match IDs were valid
        if (selectedMatchesData.length !== selectedMatchIds.length) {
            return { error: "Uno o más de los partidos seleccionados no existen." };
        }

        // A user submitting a new postulation has no assignments to check against for this postulation.
        // We only need to check the time limit and status.
        const allMatchesAreEditableByDate = selectedMatchesData.every(match => isMatchEditable(match.date, match.time));
        if (!allMatchesAreEditableByDate) {
            return { error: 'No se puede postular. El plazo para uno o más partidos ha vencido (menos de 12 horas restantes).' };
        }

        const allMatchesAreScheduled = selectedMatchesData.every(match => match.status === 'scheduled');
        if (!allMatchesAreScheduled) {
            return { error: 'Solo puedes postularte a partidos que estén en estado "Programado".' };
        }
        // --- END VALIDATION ---


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
    const { selectedMatchIds, hasCar, notes } = validation.data;
    
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
        
        // --- NEW VALIDATION LOGIC ---
        // Fetch all matches the user wants in their updated postulation
        const newMatchesResult = await db.execute({
            sql: `SELECT id, club_id, description, match_date as date, match_time as time, location, status FROM club_matches WHERE id IN (${selectedMatchIds.map(() => '?').join(',')})`,
            args: [...selectedMatchIds]
        });
        const newSelectedMatchesData = rowsToType<ClubSpecificMatch>(newMatchesResult.rows);

        if (newSelectedMatchesData.length !== selectedMatchIds.length) {
            return { error: "Uno o más de los partidos seleccionados no existen." };
        }
        
        // Fetch user's assignments in this club to see if they are locked out of editing
        const assignmentsForUserResult = await db.execute({
            sql: 'SELECT id, club_id, match_id, assigned_referee_id, assignment_role, assigned_at FROM match_assignments WHERE club_id = ? AND assigned_referee_id = ?',
            args: [request.clubId, userId]
        });
        const assignmentsForUser = rowsToType<MatchAssignment>(assignmentsForUserResult.rows);

        // Check if the new set of matches is valid given the user's assignments and the time limit
        if (!isPostulationEditable(newSelectedMatchesData, assignmentsForUser)) {
             return { error: 'La postulación no es editable porque uno o más partidos están muy próximos (menos de 12hs) o ya te han sido asignados.' };
        }
        // --- END VALIDATION ---

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

export async function setAssignmentsForRole(clubId: string, matchId: string, assignedIds: string[], role: 'referee' | 'assistant') {
    const user = await getUserFromSession();
    if (!user || !user.isAdmin || !user.administeredClubIds?.includes(clubId)) {
        return { success: false, error: 'No tienes permiso para realizar esta acción.' };
    }

    if (assignedIds.length > 6) {
        return { success: false, error: `No se pueden asignar más de 6 ${role === 'referee' ? 'árbitros' : 'asistentes'} a un partido.` };
    }

    const tx = await db.transaction('write');
    try {
        // Check for conflicts: ensure none of the users are already assigned to the OTHER role for this same match.
        const oppositeRole = role === 'referee' ? 'assistant' : 'referee';
        if (assignedIds.length > 0) {
            const conflictsResult = await tx.execute({
                sql: `SELECT assigned_referee_id FROM match_assignments WHERE match_id = ? AND assignment_role = ? AND assigned_referee_id IN (${assignedIds.map(() => '?').join(',')})`,
                args: [matchId, oppositeRole, ...assignedIds]
            });

            if (conflictsResult.rows.length > 0) {
                 const conflictingIds = conflictsResult.rows.map(r => r.assigned_referee_id as string);
                 const userNamesResult = await tx.execute({
                    sql: `SELECT name FROM users WHERE id IN (${conflictingIds.map(() => '?').join(',')})`,
                    args: conflictingIds
                });
                const userNames = userNamesResult.rows.map(r => r.name as string);

                await tx.rollback();
                return { success: false, error: `Los siguientes usuarios ya están asignados como ${oppositeRole}s y no pueden tener ambos roles: ${userNames.join(', ')}.` };
            }
        }
        
        // Proceed with update
        // 1. Delete all existing assignments for this match and role
        await tx.execute({
            sql: 'DELETE FROM match_assignments WHERE match_id = ? AND assignment_role = ?',
            args: [matchId, role]
        });

        // 2. Insert new assignments
        if (assignedIds.length > 0) {
            const assignedAt = new Date().toISOString();
            for (const refereeId of assignedIds) {
                await tx.execute({
                    sql: `
                        INSERT INTO match_assignments (club_id, match_id, assigned_referee_id, assignment_role, assigned_at) 
                        VALUES (?, ?, ?, ?, ?)
                    `,
                    args: [clubId, matchId, refereeId, role, assignedAt]
                });
            }
        }
        await tx.commit();
        return { success: true };
    } catch(e: any) {
        await tx.rollback();
        console.error("setAssignmentsForRole error:", e.message);
        return { success: false, error: 'No se pudo guardar la asignación. Un usuario no puede ser asignado dos veces al mismo partido.' };
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
    if (!user) {
        return { success: false, error: 'Debes iniciar sesión para unirte a una asociación.' };
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
                sql: 'SELECT user_id FROM user_clubs_membership WHERE user_id = ? AND club_id = ? AND role_in_club = ?',
                args: [userId, clubIdToJoinTrimmed, 'referee']
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
            sql: `SELECT COUNT(DISTINCT club_id) as count FROM user_clubs_membership WHERE user_id = ?`,
            args: [userId]
        });

        const assignedMatchesPromise = db.execute({
            sql: `SELECT m.status, m.match_date, m.description, c.name as club_name
                  FROM match_assignments as a
                  JOIN club_matches as m ON a.match_id = m.id
                  JOIN clubs as c on m.club_id = c.id
                  WHERE a.assigned_referee_id = ?
                  ORDER BY m.match_date DESC`,
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

        const assignedMatches = rowsToType<{status: 'scheduled' | 'cancelled' | 'postponed', matchDate: string, description: string, clubName: string}>(assignedMatchesResult.rows);
        
        const refereedMatches: UserStatMatch[] = [];
        const cancelledMatches: UserStatMatch[] = [];
        const today = startOfDay(new Date());

        assignedMatches.forEach(match => {
            const statMatch: UserStatMatch = {
                description: match.description,
                date: match.matchDate,
                clubName: match.clubName,
            };

            if (match.status === 'cancelled') {
                cancelledMatches.push(statMatch);
            } else if (match.status === 'scheduled' && isBefore(parseISO(match.matchDate), today)) {
                refereedMatches.push(statMatch);
            }
        });

        const stats: UserStats = {
            associationsCount: Number(associationsResult.rows[0]?.count ?? 0),
            refereedMatchesCount: refereedMatches.length,
            cancelledMatchesCount: cancelledMatches.length,
            postulationsCount: Number(postulationsResult.rows[0]?.count ?? 0),
            refereedMatches,
            cancelledMatches,
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

        return { user, stats: { associationsCount: 0, refereedMatchesCount: 0, cancelledMatchesCount: 0, postulationsCount: 0, refereedMatches: [], cancelledMatches: [] }};
    }
}

export async function promoteUserToAdmin(clubId: string, userIdToPromote: string) {
    const user = await getUserFromSession();
    if (!user || !user.isAdmin || !user.administeredClubIds?.includes(clubId)) {
        return { success: false, error: "No tienes permiso para realizar esta acción." };
    }

    try {
        await db.execute({
            sql: `INSERT INTO user_clubs_membership (user_id, club_id, role_in_club) VALUES (?, ?, 'admin') ON CONFLICT(user_id, club_id, role_in_club) DO NOTHING`,
            args: [userIdToPromote, clubId]
        });
        return { success: true };
    } catch (e: any) {
        console.error(`Error promoting user:`, e.message);
        return { success: false, error: "No se pudo promover al miembro. Ocurrió un error en la base de datos." };
    }
}

export async function demoteAdminToReferee(clubId: string, userIdToDemote: string) {
    const user = await getUserFromSession();
    if (!user) return { success: false, error: "Debes iniciar sesión." };
    
    if (!user.isAdmin || !user.administeredClubIds?.includes(clubId)) {
        return { success: false, error: "No tienes permiso para realizar esta acción." };
    }

    if (user.id === userIdToDemote) {
        const adminsResult = await db.execute({
            sql: `SELECT COUNT(user_id) as count FROM user_clubs_membership WHERE club_id = ? AND role_in_club = 'admin'`,
            args: [clubId]
        });
        const adminCount = Number(adminsResult.rows[0]?.count ?? 0);
        if (adminCount <= 1) {
            return { success: false, error: "No puedes revocar tu propio rol si eres el último administrador." };
        }
    }

    try {
        // This only removes the admin role, leaving other roles (like referee) intact.
        await db.execute({
            sql: `DELETE FROM user_clubs_membership WHERE user_id = ? AND club_id = ? AND role_in_club = 'admin'`,
            args: [userIdToDemote, clubId]
        });
        return { success: true };
    } catch (e: any) {
        console.error(`Error demoting admin:`, e.message);
        return { success: false, error: "No se pudo actualizar el rol del miembro." };
    }
}

export async function deleteMemberFromClub(clubId: string, userIdToDelete: string) {
    const user = await getUserFromSession();
    if (!user || !user.isAdmin || !user.administeredClubIds?.includes(clubId)) {
        return { success: false, error: "No tienes permiso para realizar esta acción." };
    }

    if (user.id === userIdToDelete) {
        return { success: false, error: "No puedes eliminarte a ti mismo de la asociación." };
    }
    
    const tx = await db.transaction('write');
    try {
        // Safety check: ensure we are not deleting the last admin
        const memberRolesResult = await tx.execute({
            sql: `SELECT role_in_club FROM user_clubs_membership WHERE user_id = ? AND club_id = ?`,
            args: [userIdToDelete, clubId]
        });
        const isMemberAdmin = memberRolesResult.rows.some(r => r.role_in_club === 'admin');
        
        if (isMemberAdmin) {
            const adminCountResult = await tx.execute({
                sql: `SELECT COUNT(user_id) as count FROM user_clubs_membership WHERE club_id = ? AND role_in_club = 'admin'`,
                args: [clubId]
            });
            const adminCount = Number(adminCountResult.rows[0]?.count ?? 0);
            if (adminCount <= 1) {
                await tx.rollback();
                return { success: false, error: "No se puede eliminar al último administrador de la asociación." };
            }
        }
        
        // Delete all memberships for this user in this club
        await tx.execute({
            sql: `DELETE FROM user_clubs_membership WHERE user_id = ? AND club_id = ?`,
            args: [userIdToDelete, clubId]
        });

        // Also delete any shift requests from this user for this club
        await tx.execute({
            sql: `DELETE FROM shift_requests WHERE user_id = ? AND club_id = ?`,
            args: [userIdToDelete, clubId]
        });
        
        // And assignments
        await tx.execute({
            sql: `DELETE FROM match_assignments WHERE assigned_referee_id = ? AND club_id = ?`,
            args: [userIdToDelete, clubId]
        });
        
        await tx.commit();
        return { success: true };
    } catch (e: any) {
        await tx.rollback();
        console.error(`Error deleting member:`, e.message);
        return { success: false, error: "No se pudo eliminar al miembro. Ocurrió un error en la base de datos." };
    }
}
