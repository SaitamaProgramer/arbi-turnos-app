
import type { ShiftRequest, User, Club, ClubSpecificMatch, MatchAssignment } from '@/types';

const SHIFT_REQUESTS_KEY = 'arbitros_shift_requests_v4';
const CLUB_DEFINED_MATCHES_KEY = 'arbitros_club_defined_matches_v1';
const USERS_KEY = 'arbitros_users_v3'; 
const CLUBS_KEY = 'arbitros_clubs_v1';
const CURRENT_USER_EMAIL_KEY = 'arbitros_current_user_email_v2';
const ACTIVE_CLUB_ID_KEY = 'arbitros_active_club_id_v1'; 
const MATCH_ASSIGNMENTS_KEY = 'arbitros_match_assignments_v1'; // New key for assignments
const TEST_DATA_INITIALIZED_KEY = 'arbitros_test_data_initialized_v3'; // Incremented version for new data structure

function initializeWithTestData() {
  if (typeof window === 'undefined' || localStorage.getItem(TEST_DATA_INITIALIZED_KEY)) {
    return;
  }

  console.log("Initializing with V3 test data (match assignments)...");

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
    { id: "refUserMulti", name: "Referee MultiClub", email: "refMulti@example.com", password: "password", role: "referee", memberClubIds: [club1Id, club2Id] },
  ];
  setItem(USERS_KEY, users);

  const clubMatchesData: Record<string, ClubSpecificMatch[]> = {
    [club1Id]: [
      { id: "match_bh_001", description: "Sábado 15:00 - Cancha Principal - Final Liga A" },
      { id: "match_bh_002", description: "Sábado 17:00 - Cancha Principal - Final Liga B" },
      { id: "match_bh_003", description: "Domingo 10:00 - Cancha Auxiliar - Sub-17" },
    ],
    [club2Id]: [
      { id: "match_rs_001", description: "Viernes 20:00 - Polideportivo - Futsal Mayor A" },
      { id: "match_rs_002", description: "Viernes 21:30 - Polideportivo - Futsal Mayor B" },
    ],
  };
  setItem(CLUB_DEFINED_MATCHES_KEY, clubMatchesData);

  const shiftRequests: ShiftRequest[] = [
    { 
      id: crypto.randomUUID(), 
      userEmail: "ref1@example.com", 
      clubId: club1Id, 
      selectedMatches: [clubMatchesData[club1Id][0], clubMatchesData[club1Id][2]], 
      hasCar: true, 
      notes: "Prefiero el de la mañana del domingo si es posible.", 
      status: 'pending', 
      submittedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
    },
    { 
      id: crypto.randomUUID(), 
      userEmail: "refUserMulti@example.com", // MultiClub user applied for a Bahia match
      clubId: club1Id, 
      selectedMatches: [clubMatchesData[club1Id][0]], // Applied for the same match as ref1
      hasCar: false, 
      notes: "También disponible para Final Liga A en Bahía.", 
      status: 'pending', 
      submittedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
    },
    { 
      id: crypto.randomUUID(), 
      userEmail: "ref3@example.com", 
      clubId: club2Id, 
      selectedMatches: [clubMatchesData[club2Id][1]], 
      hasCar: true, 
      notes: "", 
      status: 'pending', // Status changed to pending, assignment will be separate
      submittedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
    },
  ];
  setItem(SHIFT_REQUESTS_KEY, shiftRequests);

  // Initialize empty match assignments
  const matchAssignments: MatchAssignment[] = [
    // Example: Assign ref3 to one of their postulated matches
    // {
    //   clubId: club2Id,
    //   matchId: clubMatchesData[club2Id][1].id, // Viernes 21:30
    //   assignedRefereeEmail: "ref3@example.com",
    //   assignedAt: new Date().toISOString(),
    // }
  ];
  setItem(MATCH_ASSIGNMENTS_KEY, matchAssignments);

  localStorage.setItem(TEST_DATA_INITIALIZED_KEY, 'true');
  console.log("Test data V3 (match assignments) initialized.");
}


function getItem<T>(key: string, defaultValue: T): T {
  if (typeof window === 'undefined') {
    return defaultValue;
  }
  // Initialize if main data keys are missing
  if (!localStorage.getItem(TEST_DATA_INITIALIZED_KEY)) {
    if (key === USERS_KEY || key === CLUBS_KEY || key === SHIFT_REQUESTS_KEY || key === CLUB_DEFINED_MATCHES_KEY || key === MATCH_ASSIGNMENTS_KEY) {
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
  if (users.find(user => user.email === userData.email)) return { error: "El correo electrónico ya está registrado." };
  const userId = crypto.randomUUID();
  let newUser: User; let newClub: Club | undefined;
  if (userData.role === 'admin') {
    if (!userData.clubName) return { error: "El nombre del club es requerido para administradores." };
    newClub = addClub(userData.clubName, userId);
    newUser = { id: userId, name: userData.name, email: userData.email, password: userData.password, role: 'admin', administeredClubId: newClub.id };
  } else { 
    if (!userData.clubIdToJoin) return { error: "El código de club es requerido para árbitros." };
    const clubToJoin = findClubById(userData.clubIdToJoin);
    if (!clubToJoin) return { error: "El código de club no es válido o el club no existe." };
    
    // Check if user already exists with this email to add new clubId, or create new user
    const existingUserIndex = users.findIndex(u => u.email === userData.email);
    if (existingUserIndex > -1) { // User exists, add clubId if not already a member
        const existingUser = users[existingUserIndex];
        if (existingUser.role !== 'referee') return { error: "Este email ya está registrado con un rol diferente."};
        if (existingUser.memberClubIds?.includes(userData.clubIdToJoin)) return { error: "Ya eres miembro de este club."};
        existingUser.memberClubIds = [...(existingUser.memberClubIds || []), userData.clubIdToJoin];
        users[existingUserIndex] = existingUser;
        newUser = existingUser;
    } else { // New user
        newUser = { id: userId, name: userData.name, email: userData.email, password: userData.password, role: 'referee', memberClubIds: [userData.clubIdToJoin] };
        users.push(newUser);
    }
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
// updateShiftRequestStatus now only handles 'pending' and 'completed'. 'assigned' is handled by MatchAssignments
export const updateShiftRequestStatus = (id: string, status: 'pending' | 'completed'): ShiftRequest | null => {
  const requests = getItem<ShiftRequest[]>(SHIFT_REQUESTS_KEY, []);
  const requestIndex = requests.findIndex(req => req.id === id);
  if (requestIndex === -1) return null;
  requests[requestIndex].status = status;
  // requests[requestIndex].assignedRefereeName = undefined; // Ensure this is cleared if changing from an old 'assigned'
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

// Match Assignment Functions
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
  return newAssignment;
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
    if (req.selectedMatches.some(match => match.id === matchId)) {
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

