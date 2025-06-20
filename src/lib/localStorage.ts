
import type { ShiftRequest, User, Club, ClubSpecificMatch, MatchAssignment } from '@/types';
import { formatISO, addDays, subDays, parseISO, isBefore, startOfDay } from 'date-fns';

const SHIFT_REQUESTS_KEY = 'arbitros_shift_requests_v5';
const CLUB_DEFINED_MATCHES_KEY = 'arbitros_club_defined_matches_v2';
const USERS_KEY = 'arbitros_users_v3'; 
const CLUBS_KEY = 'arbitros_clubs_v1';
const CURRENT_USER_EMAIL_KEY = 'arbitros_current_user_email_v2';
const ACTIVE_CLUB_ID_KEY = 'arbitros_active_club_id_v1'; 
const MATCH_ASSIGNMENTS_KEY = 'arbitros_match_assignments_v1';
const TEST_DATA_INITIALIZED_KEY = 'arbitros_test_data_initialized_v4'; // Incremented for new match structure

function initializeWithTestData() {
  if (typeof window === 'undefined' || localStorage.getItem(TEST_DATA_INITIALIZED_KEY)) {
    return;
  }

  console.log("Initializing with V4 test data (detailed matches & more shift requests)...");

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
  ];
  setItem(USERS_KEY, users);
  
  const today = new Date();
  const tomorrow = addDays(today, 1);
  const dayAfterTomorrow = addDays(today, 2);
  const nextWeek = addDays(today, 7);
  const yesterday = subDays(today, 1);


  const clubMatchesData: Record<string, ClubSpecificMatch[]> = {
    [club1Id]: [
      { id: "match_bh_001", description: "Final Liga A", date: formatISO(dayAfterTomorrow, { representation: 'date' }), time: "15:00", location: "Cancha Principal" },
      { id: "match_bh_002", description: "Final Liga B", date: formatISO(dayAfterTomorrow, { representation: 'date' }), time: "17:00", location: "Cancha Principal" },
      { id: "match_bh_003", description: "Sub-17", date: formatISO(nextWeek, { representation: 'date' }), time: "10:00", location: "Cancha Auxiliar" },
      { id: "match_bh_004", description: "Veteranos Partido Amistoso", date: formatISO(tomorrow, { representation: 'date' }), time: "11:00", location: "Predio Los Sauces" }, // Match for tomorrow (edit restricted)
      { id: "match_bh_005", description: "Reserva vs Primera Local", date: formatISO(yesterday, { representation: 'date' }), time: "16:00", location: "Estadio Municipal" }, // Match for yesterday (edit restricted)
    ],
    [club2Id]: [
      { id: "match_rs_001", description: "Futsal Mayor A", date: formatISO(nextWeek, { representation: 'date' }), time: "20:00", location: "Polideportivo" },
      { id: "match_rs_002", description: "Futsal Mayor B", date: formatISO(addDays(nextWeek,1), { representation: 'date' }), time: "21:30", location: "Polideportivo" },
    ],
  };
  setItem(CLUB_DEFINED_MATCHES_KEY, clubMatchesData);

  const shiftRequests: ShiftRequest[] = [
    // Ref 1 (Bahia) - Postulated for 2 matches in the future
    { 
      id: "sr_ref1_bh_01", 
      userEmail: "ref1@example.com", 
      clubId: club1Id, 
      selectedMatches: [clubMatchesData[club1Id][0], clubMatchesData[club1Id][2]], 
      hasCar: true, 
      notes: "Prefiero el de la mañana del domingo (Sub-17) si es posible.", 
      status: 'pending', 
      submittedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
    },
    // Ref 4 (Bahia) - Postulated for the same match as Ref1 (match_bh_001) and another
     { 
      id: "sr_ref4_bh_01", 
      userEmail: "ref4@example.com", 
      clubId: club1Id, 
      selectedMatches: [clubMatchesData[club1Id][0], clubMatchesData[club1Id][1]], 
      hasCar: false, 
      notes: "Disponible para ambas finales de Liga A y B.", 
      status: 'pending', 
      submittedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
    },
    // Ref MultiClub - Postulated for a Bahia match (match_bh_001 - same as Ref1 and Ref4)
    { 
      id: "sr_refMulti_bh_01", 
      userEmail: "refMulti@example.com", 
      clubId: club1Id, 
      selectedMatches: [clubMatchesData[club1Id][0]], 
      hasCar: false, 
      notes: "También disponible para Final Liga A en Bahía.", 
      status: 'pending', 
      submittedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
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
    // Ref 1 (Bahia) - Postulated for a match that is tomorrow (for testing edit restriction)
    {
      id: "sr_ref1_bh_02_tomorrow",
      userEmail: "ref1@example.com",
      clubId: club1Id,
      selectedMatches: [clubMatchesData[club1Id][3]], // match_bh_004 is tomorrow
      hasCar: true,
      notes: "Postulación para partido de mañana.",
      status: 'pending',
      submittedAt: new Date().toISOString()
    }
  ];
  setItem(SHIFT_REQUESTS_KEY, shiftRequests);

  const matchAssignments: MatchAssignment[] = [
    // Example: Assign refUserMulti to match_bh_002 (Final Liga B)
    // This is commented out to allow admins to test assignment.
    // {
    //   clubId: club1Id,
    //   matchId: clubMatchesData[club1Id][1].id, 
    //   assignedRefereeEmail: "refMulti@example.com",
    //   assignedAt: new Date().toISOString(),
    // }
  ];
  setItem(MATCH_ASSIGNMENTS_KEY, matchAssignments);

  localStorage.setItem(TEST_DATA_INITIALIZED_KEY, 'true');
  console.log("Test data V4 (detailed matches) initialized.");
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
  if (users.find(user => user.email === userData.email && user.role === userData.role)) { // Check if email + role combo exists
     if (userData.role === 'referee' && userData.clubIdToJoin) { // If referee and trying to join another club
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
  
  // Check if any match in the postulation is too close to edit
  if (isPostulationEditable(originalRequest.selectedMatches) === false) {
    console.warn("Attempted to edit a postulation that is too close to match date(s).");
    return null; // Or throw an error / return specific error code
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

export const assignRefereeToMatch = (clubId: string, matchId: string, assignedRefereeEmail: string): MatchAssignment => {
  let assignments = getMatchAssignments();
  const existingAssignmentIndex = assignments.findIndex(a => a.clubId === clubId && a.matchId === matchId);
  
  // Check if this referee is already assigned to another match at the exact same date and time
  const matchToAssign = getClubDefinedMatches(clubId).find(m => m.id === matchId);
  if (matchToAssign) {
    const existingAssignmentsForReferee = assignments.filter(a => a.assignedRefereeEmail === assignedRefereeEmail && a.clubId === clubId);
    for (const existingAsg of existingAssignmentsForReferee) {
      if (existingAsg.matchId === matchId) continue; // It's the same match, allow re-assignment
      const existingMatchDetails = getClubDefinedMatches(clubId).find(m => m.id === existingAsg.matchId);
      if (existingMatchDetails && existingMatchDetails.date === matchToAssign.date && existingMatchDetails.time === matchToAssign.time) {
         console.warn(`Referee ${assignedRefereeEmail} is already assigned to ${existingMatchDetails.description} at the same date/time.`);
         // Optionally, you could throw an error or return a specific status to prevent double booking
         // For now, we'll allow it but log a warning.
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
    assignments[existingAssignmentIndex] = newAssignment;
  } else {
    assignments.push(newAssignment);
  }
  saveMatchAssignments(assignments);

  // Update status of original ShiftRequests containing this match for the assigned user
  const allShiftRequests = getShiftRequests();
  allShiftRequests.forEach(req => {
    if (req.userEmail === assignedRefereeEmail && req.clubId === clubId && req.selectedMatches.some(m => m.id === matchId)) {
        // If all matches in this request are now assigned, mark request as completed.
        // This is a simplification; a more complex logic might be needed.
        const allSelectedMatchesAssigned = req.selectedMatches.every(sm => 
            getAssignmentForMatch(clubId, sm.id)?.assignedRefereeEmail === assignedRefereeEmail
        );
        if (allSelectedMatchesAssigned) {
            // updateShiftRequestStatus(req.id, 'completed'); // This might be too aggressive
        }
    }
  });

  return newAssignment;
};

export const unassignRefereeFromMatch = (clubId: string, matchId: string): void => {
  let assignments = getMatchAssignments();
  const assignmentToRemove = assignments.find(a => a.clubId === clubId && a.matchId === matchId);
  
  if (assignmentToRemove) {
      const refereeEmail = assignmentToRemove.assignedRefereeEmail;
      assignments = assignments.filter(a => !(a.clubId === clubId && a.matchId === matchId));
      saveMatchAssignments(assignments);

      // Potentially revert status of original ShiftRequests
      const allShiftRequests = getShiftRequests();
        allShiftRequests.forEach(req => {
        if (req.userEmail === refereeEmail && req.clubId === clubId && req.selectedMatches.some(m => m.id === matchId) && req.status === 'completed') {
            // If unassigning makes this request no longer fully assigned, set it back to pending.
            const anyMatchStillAssignedToThisUserInRequest = req.selectedMatches.some(sm => 
                getAssignmentForMatch(clubId, sm.id)?.assignedRefereeEmail === refereeEmail
            );
            if (!anyMatchStillAssignedToThisUserInRequest) {
               // updateShiftRequestStatus(req.id, 'pending'); // Careful with this auto-revert
            }
        }
      });
  }
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

// Helper function to check if any match in a list is too close to edit
export const isMatchEditable = (matchDate: string): boolean => {
  try {
    const today = startOfDay(new Date());
    const mDate = startOfDay(parseISO(matchDate)); // matchDate should be 'YYYY-MM-DD'
    
    // If match date is before today (i.e., in the past), not editable
    if (isBefore(mDate, today)) return false;
    
    // If match date is today or tomorrow, not editable
    // (mDate - today) will be 0 for today, 1 * day_in_ms for tomorrow.
    // We want to disallow if diff_in_days <= 1
    const diffInDays = (mDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
    return diffInDays > 1; // Editable if more than 1 day away (i.e., at least 2 days away)
  } catch (e) {
    console.error("Error parsing match date for editability check:", matchDate, e);
    return false; // Default to not editable on error
  }
};

export const isPostulationEditable = (selectedMatches: ClubSpecificMatch[]): boolean => {
  if (!selectedMatches || selectedMatches.length === 0) return true; // No matches, so "editable"
  return selectedMatches.every(match => isMatchEditable(match.date));
};
