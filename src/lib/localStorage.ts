
import type { ShiftRequest, User, Club, ClubSpecificMatch, MatchAssignment } from '@/types';
import { formatISO, addDays, subDays, parseISO, isBefore, startOfDay } from 'date-fns';

const SHIFT_REQUESTS_KEY = 'arbitros_shift_requests_v5';
const CLUB_DEFINED_MATCHES_KEY = 'arbitros_club_defined_matches_v2';
const USERS_KEY = 'arbitros_users_v3'; 
const CLUBS_KEY = 'arbitros_clubs_v1';
const CURRENT_USER_EMAIL_KEY = 'arbitros_current_user_email_v2';
const ACTIVE_CLUB_ID_KEY = 'arbitros_active_club_id_v1'; 
const MATCH_ASSIGNMENTS_KEY = 'arbitros_match_assignments_v1';
const TEST_DATA_INITIALIZED_KEY = 'arbitros_test_data_initialized_v5'; // Incremented for new match structure + more requests

function initializeWithTestData() {
  if (typeof window === 'undefined' || localStorage.getItem(TEST_DATA_INITIALIZED_KEY)) {
    return;
  }

  console.log("Initializing with V5 test data (detailed matches, more shift requests, specific dates)...");

  const club1Id = "club-bh-01";
  const club2Id = "club-rs-02";
  const clubs: Club[] = [
    { id: club1Id, name: "Club Bahiense de Árbitros", adminUserId: "adminUser1" },
    { id: club2Id, name: "Club Rosaleño de Referís", adminUserId: "adminUser2" },
  ];
  setItem(CLUBS_KEY, clubs);

  const users: User[] = [
    { id: "adminUser1", name: "Admin Bahía", email: "admin1@example.com", password: "password", role: "admin", administeredClubId: club1Id },
    { id: "adminUser2", name: "Admin Rosales", email: "admin2@example.com", password: "password", role: "admin", administeredClubId: club2Id },
    { id: "refUser1", name: "Referee Uno (Bahía)", email: "ref1@example.com", password: "password", role: "referee", memberClubIds: [club1Id] },
    { id: "refUser2", name: "Referee Dos (Bahía)", email: "ref2@example.com", password: "password", role: "referee", memberClubIds: [club1Id] },
    { id: "refUser3", name: "Referee Tres (Rosales)", email: "ref3@example.com", password: "password", role: "referee", memberClubIds: [club2Id] },
    { id: "refUser4", name: "Referee Cuatro (Bahía)", email: "ref4@example.com", password: "password", role: "referee", memberClubIds: [club1Id] },
    { id: "refUserMulti", name: "Referee MultiClub", email: "refMulti@example.com", password: "password", role: "referee", memberClubIds: [club1Id, club2Id] },
    { id: "refUser5Bahia", name: "Referee Cinco (Bahía)", email: "ref5@example.com", password: "password", role: "referee", memberClubIds: [club1Id] },
  ];
  setItem(USERS_KEY, users);
  
  const today = new Date();
  const tomorrow = addDays(today, 1); // Not editable (1 day away)
  const dayAfterTomorrow = addDays(today, 2); // Not editable (2 days away)
  const threeDaysFromNow = addDays(today, 3); // Editable (3 days away)
  const nextWeek = addDays(today, 7); // Editable
  const yesterday = subDays(today, 1); // Not editable (past)


  const clubMatchesData: Record<string, ClubSpecificMatch[]> = {
    [club1Id]: [
      { id: "match_bh_001", description: "Final Liga A (3 días)", date: formatISO(threeDaysFromNow, { representation: 'date' }), time: "15:00", location: "Cancha Principal" },
      { id: "match_bh_002", description: "Final Liga B (3 días)", date: formatISO(threeDaysFromNow, { representation: 'date' }), time: "17:00", location: "Cancha Principal" },
      { id: "match_bh_003", description: "Sub-17 (Próx. Semana)", date: formatISO(nextWeek, { representation: 'date' }), time: "10:00", location: "Cancha Auxiliar" },
      { id: "match_bh_004", description: "Veteranos (Mañana)", date: formatISO(tomorrow, { representation: 'date' }), time: "11:00", location: "Predio Los Sauces" }, 
      { id: "match_bh_005", description: "Reserva (Pasado Mañana)", date: formatISO(dayAfterTomorrow, { representation: 'date' }), time: "16:00", location: "Estadio Municipal" }, 
      { id: "match_bh_006", description: "Amistoso (Ayer)", date: formatISO(yesterday, { representation: 'date' }), time: "18:00", location: "Complejo Deportivo" },
    ],
    [club2Id]: [
      { id: "match_rs_001", description: "Futsal Mayor A (Próx. Semana)", date: formatISO(nextWeek, { representation: 'date' }), time: "20:00", location: "Polideportivo" },
      { id: "match_rs_002", description: "Futsal Mayor B (Próx. Semana+1)", date: formatISO(addDays(nextWeek,1), { representation: 'date' }), time: "21:30", location: "Polideportivo" },
    ],
  };
  setItem(CLUB_DEFINED_MATCHES_KEY, clubMatchesData);

  const shiftRequests: ShiftRequest[] = [
    // Ref 1 (Bahia) - Postulated for 2 matches (1 editable, 1 not due to proximity)
    { 
      id: "sr_ref1_bh_01", 
      userEmail: "ref1@example.com", 
      clubId: club1Id, 
      selectedMatches: [clubMatchesData[club1Id][0], clubMatchesData[club1Id][3]], // match_bh_001 (3 days), match_bh_004 (tomorrow)
      hasCar: true, 
      notes: "Prefiero el de las 15:00 si es posible.", 
      status: 'pending', 
      submittedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
    },
    // Ref 4 (Bahia) - Postulated for the same editable match as Ref1 (match_bh_001) and another editable one
     { 
      id: "sr_ref4_bh_01", 
      userEmail: "ref4@example.com", 
      clubId: club1Id, 
      selectedMatches: [clubMatchesData[club1Id][0], clubMatchesData[club1Id][1]], // match_bh_001 (3 days), match_bh_002 (3 days)
      hasCar: false, 
      notes: "Disponible para ambas finales de Liga A y B.", 
      status: 'pending', 
      submittedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
    },
    // Ref MultiClub - Postulated for an editable Bahia match (match_bh_001 - same as Ref1 and Ref4)
    { 
      id: "sr_refMulti_bh_01", 
      userEmail: "refMulti@example.com", 
      clubId: club1Id, 
      selectedMatches: [clubMatchesData[club1Id][0]], // match_bh_001 (3 days)
      hasCar: true, 
      notes: "También disponible para Final Liga A en Bahía.", 
      status: 'pending', 
      submittedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
    },
     // Ref 5 (Bahia) - Postulated for the same match as Ref1, Ref4, RefMulti (match_bh_001)
    { 
      id: "sr_ref5_bh_01", 
      userEmail: "ref5@example.com", 
      clubId: club1Id, 
      selectedMatches: [clubMatchesData[club1Id][0]], // match_bh_001 (3 days)
      hasCar: true, 
      notes: "Postulado para la final de Liga A.", 
      status: 'pending', 
      submittedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 500).toISOString() // slightly different time
    },
    // Ref 2 (Bahia) - Postulated for a match that is two days away (not editable)
    {
      id: "sr_ref2_bh_02_pasado_manana",
      userEmail: "ref2@example.com",
      clubId: club1Id,
      selectedMatches: [clubMatchesData[club1Id][4]], // match_bh_005 (pasado mañana)
      hasCar: false,
      notes: "Postulación para partido de pasado mañana.",
      status: 'pending',
      submittedAt: new Date().toISOString()
    },
    // Ref 3 (Rosales) - Postulated for one match
    { 
      id: "sr_ref3_rs_01", 
      userEmail: "ref3@example.com", 
      clubId: club2Id, 
      selectedMatches: [clubMatchesData[club2Id][1]], 
      hasCar: true, 
      notes: "", 
      status: 'pending',
      submittedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
    },
  ];
  setItem(SHIFT_REQUESTS_KEY, shiftRequests);

  const matchAssignments: MatchAssignment[] = [
    // Example: Assign refUser1 to match_bh_002 (Final Liga B)
    // {
    //   clubId: club1Id,
    //   matchId: clubMatchesData[club1Id][1].id, // match_bh_002
    //   assignedRefereeEmail: "ref1@example.com",
    //   assignedAt: new Date().toISOString(),
    // }
  ];
  setItem(MATCH_ASSIGNMENTS_KEY, matchAssignments);

  localStorage.setItem(TEST_DATA_INITIALIZED_KEY, 'true');
  console.log("Test data V5 (detailed dates, more requests) initialized.");
}


function getItem<T>(key: string, defaultValue: T): T {
  if (typeof window === 'undefined') {
    return defaultValue;
  }
  if (!localStorage.getItem(TEST_DATA_INITIALIZED_KEY)) {
    if ([USERS_KEY, CLUBS_KEY, SHIFT_REQUESTS_KEY, CLUB_DEFINED_MATCHES_KEY, MATCH_ASSIGNMENTS_KEY].includes(key)) {
        initializeWithTestData();
    }
  }
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : defaultValue;
  } catch (error) {
    console.error(`Error parsing ${key} from localStorage:`, error);
    return defaultValue;
  }
}

function setItem<T>(key: string, value: T): void {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Error saving ${key} to localStorage:`, error);
  }
}

if (typeof window !== 'undefined' && !localStorage.getItem(TEST_DATA_INITIALIZED_KEY)) {
  initializeWithTestData();
}

export const setCurrentUserEmail = (email: string | null): void => setItem(CURRENT_USER_EMAIL_KEY, email);
export const getCurrentUserEmail = (): string | null => getItem(CURRENT_USER_EMAIL_KEY, null);
export const setActiveClubId = (clubId: string | null): void => setItem(ACTIVE_CLUB_ID_KEY, clubId);
export const getActiveClubId = (): string | null => getItem(ACTIVE_CLUB_ID_KEY, null);

export const getClubs = (): Club[] => getItem(CLUBS_KEY, []);
export const saveClubs = (clubs: Club[]): void => setItem(CLUBS_KEY, clubs);
export const addClub = (name: string, adminUserId: string): Club => {
  const clubs = getClubs();
  const newClubId = `club-${name.toLowerCase().replace(/\s+/g, '-').slice(0,10)}-${crypto.randomUUID().slice(0,4)}`;
  const newClub: Club = { id: newClubId, name, adminUserId };
  saveClubs([...clubs, newClub]);
  const allClubMatches = getClubDefinedMatchesAllClubs();
  allClubMatches[newClubId] = [];
  saveClubDefinedMatchesAllClubs(allClubMatches);
  return newClub;
};
export const findClubById = (clubId: string): Club | undefined => getClubs().find(club => club.id === clubId);
export const getClubNameById = (clubId: string): string | undefined => findClubById(clubId)?.name;

export const getUsers = (): User[] => getItem(USERS_KEY, []);
export const saveUsers = (users: User[]): void => setItem(USERS_KEY, users);
export const addUser = (
  userData: Omit<User, 'id' | 'administeredClubId' | 'memberClubIds'> & { role: 'admin' | 'referee'; clubName?: string; clubIdToJoin?: string }
): { user?: User; club?: Club; error?: string } => {
  const users = getUsers();
  if (users.find(user => user.email === userData.email && user.role === userData.role)) { 
     if (userData.role === 'referee' && userData.clubIdToJoin) { 
        const existingUserIndex = users.findIndex(u => u.email === userData.email && u.role === 'referee');
        if (existingUserIndex > -1) {
            if (users[existingUserIndex].memberClubIds?.includes(userData.clubIdToJoin)) {
                return { error: "Ya eres miembro de este club con este correo electrónico." };
            }
            const clubToJoin = findClubById(userData.clubIdToJoin);
            if (!clubToJoin) return { error: "El código de club no es válido o el club no existe." };
            users[existingUserIndex].memberClubIds = [...(users[existingUserIndex].memberClubIds || []), userData.clubIdToJoin];
            saveUsers(users);
            return { user: users[existingUserIndex] };
        }
     }
     return { error: "El correo electrónico ya está registrado para este rol." };
  }
  if (users.find(user => user.email === userData.email && user.role !== userData.role)) {
    return { error: "Este correo electrónico ya está registrado con un rol diferente." };
  }


  const userId = crypto.randomUUID();
  let newUser: User; let newClub: Club | undefined;
  if (userData.role === 'admin') {
    if (!userData.clubName) return { error: "El nombre del club es requerido para administradores." };
    newClub = addClub(userData.clubName, userId);
    newUser = { id: userId, name: userData.name, email: userData.email, password: userData.password, role: 'admin', administeredClubId: newClub.id };
    users.push(newUser);
  } else { 
    if (!userData.clubIdToJoin) return { error: "El código de club es requerido para árbitros." };
    const clubToJoin = findClubById(userData.clubIdToJoin);
    if (!clubToJoin) return { error: "El código de club no es válido o el club no existe." };
    newUser = { id: userId, name: userData.name, email: userData.email, password: userData.password, role: 'referee', memberClubIds: [userData.clubIdToJoin] };
    users.push(newUser);
  }
  saveUsers(users);
  return { user: newUser, club: newClub };
};
export const findUserByEmail = (email: string): User | undefined => getUsers().find(user => user.email === email);
export const getRefereesByClubId = (clubId: string): User[] => getUsers().filter(user => user.role === 'referee' && user.memberClubIds?.includes(clubId));

export const getShiftRequests = (clubId?: string): ShiftRequest[] => {
  const allRequests = getItem<ShiftRequest[]>(SHIFT_REQUESTS_KEY, []);
  return clubId ? allRequests.filter(req => req.clubId === clubId) : allRequests;
};
export const findPendingShiftRequestForUserInClub = (userEmail: string, clubId: string): ShiftRequest | undefined => {
  const allRequests = getItem<ShiftRequest[]>(SHIFT_REQUESTS_KEY, []);
  return allRequests
    .filter(req => req.userEmail === userEmail && req.clubId === clubId && req.status === 'pending')
    .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())[0];
};
export const saveShiftRequests = (requests: ShiftRequest[]): void => setItem(SHIFT_REQUESTS_KEY, requests);
export const addShiftRequest = (
  requestData: { selectedMatches: ClubSpecificMatch[], hasCar: boolean, notes: string },
  userEmail: string,
  clubId: string
): ShiftRequest => {
  const newRequest: ShiftRequest = {
    ...requestData,
    id: crypto.randomUUID(),
    userEmail,
    clubId,
    status: 'pending',
    submittedAt: new Date().toISOString(),
  };
  const allRequestsUpdated = [...getItem<ShiftRequest[]>(SHIFT_REQUESTS_KEY, []), newRequest];
  saveShiftRequests(allRequestsUpdated);
  return newRequest;
};
export const updateShiftRequestDetails = (
  requestId: string,
  userEmail: string,
  newData: { selectedMatches: ClubSpecificMatch[], hasCar: boolean, notes: string }
): ShiftRequest | null => {
  const requests = getItem<ShiftRequest[]>(SHIFT_REQUESTS_KEY, []);
  const requestIndex = requests.findIndex(req => req.id === requestId);
  if (requestIndex === -1) return null;
  const originalRequest = requests[requestIndex];
  if (originalRequest.userEmail !== userEmail || originalRequest.status !== 'pending') return null;
  
  if (isPostulationEditable(originalRequest.selectedMatches) === false && isPostulationEditable(newData.selectedMatches) === false) {
     // Allow notes/car update even if matches not editable, as long as matches themselves don't change
     if (JSON.stringify(originalRequest.selectedMatches.map(m=>m.id).sort()) !== JSON.stringify(newData.selectedMatches.map(m=>m.id).sort())) {
        console.warn("Attempted to change matches in a postulation that is not fully editable.");
        return null;
     }
  } else if (!isPostulationEditable(newData.selectedMatches)) {
     // If trying to change to a set of matches that makes it uneditable, needs more granular check or disallow
     console.warn("Attempted to update postulation to a state that is not fully editable based on new match selections.");
     return null; // Or implement more granular logic to allow only certain changes.
  }


  const updatedRequest: ShiftRequest = {
    ...originalRequest,
    selectedMatches: newData.selectedMatches,
    hasCar: newData.hasCar,
    notes: newData.notes,
    submittedAt: new Date().toISOString(), 
  };
  requests[requestIndex] = updatedRequest;
  saveShiftRequests(requests);
  return updatedRequest;
};

export const updateShiftRequestStatus = (id: string, status: 'pending' | 'completed'): ShiftRequest | null => {
  const requests = getItem<ShiftRequest[]>(SHIFT_REQUESTS_KEY, []);
  const requestIndex = requests.findIndex(req => req.id === id);
  if (requestIndex === -1) return null;
  requests[requestIndex].status = status;
  saveShiftRequests(requests);
  return requests[requestIndex];
};

export const getClubDefinedMatchesAllClubs = (): Record<string, ClubSpecificMatch[]> => {
  return getItem(CLUB_DEFINED_MATCHES_KEY, {});
};
export const getClubDefinedMatches = (clubId: string): ClubSpecificMatch[] => {
  const allMatches = getClubDefinedMatchesAllClubs();
  return allMatches[clubId] || [];
};
export const saveClubDefinedMatches = (clubId: string, matches: ClubSpecificMatch[]): void => {
  const allMatches = getClubDefinedMatchesAllClubs();
  allMatches[clubId] = matches;
  setItem(CLUB_DEFINED_MATCHES_KEY, allMatches);
};
function saveClubDefinedMatchesAllClubs(allClubMatches: Record<string, ClubSpecificMatch[]>): void {
  setItem(CLUB_DEFINED_MATCHES_KEY, allClubMatches);
}

export const getMatchAssignments = (): MatchAssignment[] => {
  return getItem<MatchAssignment[]>(MATCH_ASSIGNMENTS_KEY, []);
};
export const saveMatchAssignments = (assignments: MatchAssignment[]): void => {
  setItem(MATCH_ASSIGNMENTS_KEY, assignments);
};

export const getAssignmentForMatch = (clubId: string, matchId: string): MatchAssignment | undefined => {
  return getMatchAssignments().find(a => a.clubId === clubId && a.matchId === matchId);
};

export const assignRefereeToMatch = (
  clubId: string, 
  matchId: string, 
  assignedRefereeEmail: string
): { success: boolean; message?: string; assignment?: MatchAssignment } => {
  let assignments = getMatchAssignments();
  const existingAssignmentIndex = assignments.findIndex(a => a.clubId === clubId && a.matchId === matchId);
  
  const matchToAssignDetails = getClubDefinedMatches(clubId).find(m => m.id === matchId);
  if (!matchToAssignDetails) {
    return { success: false, message: "El partido a asignar no fue encontrado." };
  }

  // Check for double booking for the selected referee
  const refereeCurrentAssignments = assignments.filter(
    a => a.assignedRefereeEmail === assignedRefereeEmail && a.clubId === clubId
  );

  for (const currentAsg of refereeCurrentAssignments) {
    if (currentAsg.matchId === matchId && existingAssignmentIndex > -1) { // If re-assigning the same ref to the same match (e.g. UI glitch), allow.
      continue;
    }
    if (currentAsg.matchId === matchId && existingAssignmentIndex === -1){ // Trying to assign a new ref, but this currentAsg is for the same match and a different ref
        // This case is fine, we are replacing or assigning for the first time.
    }


    // If we are assigning to a *different* match than the current one in the loop (currentAsg)
    // then check for overlap.
    if (currentAsg.matchId !== matchId) {
        const currentAssignedMatchDetails = getClubDefinedMatches(clubId).find(m => m.id === currentAsg.matchId);
        if (currentAssignedMatchDetails && 
            currentAssignedMatchDetails.date === matchToAssignDetails.date && 
            currentAssignedMatchDetails.time === matchToAssignDetails.time) {
        return { 
            success: false, 
            message: `Este árbitro (${getRefereeNameByEmail(assignedRefereeEmail) || assignedRefereeEmail}) ya está asignado a "${currentAssignedMatchDetails.description}" a la misma fecha y hora.` 
        };
        }
    }
  }

  const newAssignment: MatchAssignment = { 
    clubId, 
    matchId, 
    assignedRefereeEmail, 
    assignedAt: new Date().toISOString() 
  };

  if (existingAssignmentIndex > -1) {
    // If there was an existing assignment for this match (possibly a different referee), replace it.
    assignments[existingAssignmentIndex] = newAssignment;
  } else {
    assignments.push(newAssignment);
  }
  saveMatchAssignments(assignments);

  return { success: true, assignment: newAssignment };
};

export const unassignRefereeFromMatch = (clubId: string, matchId: string): void => {
  let assignments = getMatchAssignments();
  assignments = assignments.filter(a => !(a.clubId === clubId && a.matchId === matchId));
  saveMatchAssignments(assignments);
};

export const getRefereesPostulatedForMatch = (clubId: string, matchId: string): User[] => {
  const shiftRequestsForClub = getShiftRequests(clubId);
  const emails: string[] = [];
  shiftRequestsForClub.forEach(req => {
    if (req.status === 'pending' && req.selectedMatches.some(match => match.id === matchId)) {
      if (!emails.includes(req.userEmail)) {
        emails.push(req.userEmail);
      }
    }
  });
  const users = getUsers();
  return emails.map(email => users.find(u => u.email === email)).filter(Boolean) as User[];
};

export const getRefereeNameByEmail = (email: string): string | undefined => {
  const user = findUserByEmail(email);
  return user?.name;
}

export const isMatchEditable = (matchDate: string): boolean => {
  try {
    const today = startOfDay(new Date());
    const mDate = startOfDay(parseISO(matchDate)); 
    
    if (isBefore(mDate, today)) return false;
    
    const diffInDays = (mDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
    return diffInDays > 2; // Editable if more than 2 days away (i.e., at least 3 days away)
  } catch (e) {
    console.error("Error parsing match date for editability check:", matchDate, e);
    return false; 
  }
};

export const isPostulationEditable = (selectedMatches: ClubSpecificMatch[]): boolean => {
  if (!selectedMatches || selectedMatches.length === 0) return true; 
  return selectedMatches.every(match => isMatchEditable(match.date));
};

