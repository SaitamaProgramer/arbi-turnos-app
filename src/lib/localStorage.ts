
import type { ShiftRequest, User, Club, ClubSpecificMatch } from '@/types';
// import { DAYS_OF_WEEK, TIME_SLOTS } from '@/types'; // Keep for potential use in match definition UI

const SHIFT_REQUESTS_KEY = 'arbitros_shift_requests_v4'; // Incremented version
// const FORM_CONFIGURATIONS_KEY = 'arbitros_form_configurations_v2'; // Removed
const CLUB_DEFINED_MATCHES_KEY = 'arbitros_club_defined_matches_v1'; // New key
const USERS_KEY = 'arbitros_users_v3'; 
const CLUBS_KEY = 'arbitros_clubs_v1';
const CURRENT_USER_EMAIL_KEY = 'arbitros_current_user_email_v2';
const ACTIVE_CLUB_ID_KEY = 'arbitros_active_club_id_v1'; 
const TEST_DATA_INITIALIZED_KEY = 'arbitros_test_data_initialized_v2'; // Incremented version

// DEFAULT_FORM_CONFIGURATION is removed as FormConfiguration is removed.
// export const DEFAULT_FORM_CONFIGURATION: FormConfiguration = {
//   availableDays: [...DAYS_OF_WEEK],
//   availableTimeSlots: [...TIME_SLOTS],
// };

function initializeWithTestData() {
  if (typeof window === 'undefined' || localStorage.getItem(TEST_DATA_INITIALIZED_KEY)) {
    return;
  }

  console.log("Initializing with V2 test data (specific matches)...");

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

  // --- Club Defined Matches ---
  const clubMatches: Record<string, ClubSpecificMatch[]> = {
    [club1Id]: [
      { id: crypto.randomUUID(), description: "Sábado 15:00 - Cancha Principal - Final Liga A" },
      { id: crypto.randomUUID(), description: "Sábado 17:00 - Cancha Principal - Final Liga B" },
      { id: crypto.randomUUID(), description: "Domingo 10:00 - Cancha Auxiliar - Sub-17" },
    ],
    [club2Id]: [
      { id: crypto.randomUUID(), description: "Viernes 20:00 - Polideportivo - Futsal Mayor A" },
      { id: crypto.randomUUID(), description: "Viernes 21:30 - Polideportivo - Futsal Mayor B" },
    ],
  };
  setItem(CLUB_DEFINED_MATCHES_KEY, clubMatches);

  // --- Solicitudes de Turno (ahora con selectedMatches) ---
  const shiftRequests: ShiftRequest[] = [
    { 
      id: crypto.randomUUID(), 
      userEmail: "ref1@example.com", 
      clubId: club1Id, 
      selectedMatches: [clubMatches[club1Id][0], clubMatches[club1Id][2]], // Postulado a Sábado y Domingo
      hasCar: true, 
      notes: "Prefiero el de la mañana del domingo si es posible.", 
      status: 'pending', 
      submittedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
    },
    { 
      id: crypto.randomUUID(), 
      userEmail: "ref3@example.com", 
      clubId: club2Id, 
      selectedMatches: [clubMatches[club2Id][1]], // Postulado a Viernes 21:30
      hasCar: true, 
      notes: "", 
      status: 'assigned', 
      assignedRefereeName: "Referee Tres (Rosales)",
      submittedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
    },
     { 
      id: crypto.randomUUID(), 
      userEmail: "refMulti@example.com", 
      clubId: club1Id,
      selectedMatches: [clubMatches[club1Id][1]], // Postulado a Sábado 17:00 Bahía
      hasCar: false, 
      notes: "Postulación para Club Bahiense.", 
      status: 'pending', 
      submittedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
    },
  ];
  setItem(SHIFT_REQUESTS_KEY, shiftRequests);

  localStorage.setItem(TEST_DATA_INITIALIZED_KEY, 'true');
  console.log("Test data V2 (specific matches) initialized.");
}


function getItem<T>(key: string, defaultValue: T): T {
  if (typeof window === 'undefined') {
    return defaultValue;
  }
  if (key === USERS_KEY && !localStorage.getItem(USERS_KEY)) initializeWithTestData();
  if (key === CLUBS_KEY && !localStorage.getItem(CLUBS_KEY)) initializeWithTestData();
  if (key === SHIFT_REQUESTS_KEY && !localStorage.getItem(SHIFT_REQUESTS_KEY)) initializeWithTestData();
  // if (key === FORM_CONFIGURATIONS_KEY && !localStorage.getItem(FORM_CONFIGURATIONS_KEY)) initializeWithTestData(); // Removed
  if (key === CLUB_DEFINED_MATCHES_KEY && !localStorage.getItem(CLUB_DEFINED_MATCHES_KEY)) initializeWithTestData();


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
  // Initialize empty matches for the new club
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
    const clubExists = findClubById(userData.clubIdToJoin);
    if (!clubExists) return { error: "El código de club no es válido o el club no existe." };
    const existingUser = users.find(u => u.email === userData.email);
    if(existingUser?.memberClubIds?.includes(userData.clubIdToJoin)) return { error: "Ya eres miembro de este club."};
    
    newUser = { id: userId, name: userData.name, email: userData.email, password: userData.password, role: 'referee', memberClubIds: [userData.clubIdToJoin] };
  }
  saveUsers([...users, newUser]);
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
export const updateShiftRequestStatus = (id: string, status: ShiftRequest['status'], assignedRefereeName?: string): ShiftRequest | null => {
  const requests = getItem<ShiftRequest[]>(SHIFT_REQUESTS_KEY, []);
  const requestIndex = requests.findIndex(req => req.id === id);
  if (requestIndex === -1) return null;
  const updatedRequest = { ...requests[requestIndex], status };
  if (status === 'assigned' && assignedRefereeName) updatedRequest.assignedRefereeName = assignedRefereeName;
  else if (status !== 'assigned') delete updatedRequest.assignedRefereeName;
  requests[requestIndex] = updatedRequest;
  saveShiftRequests(requests);
  return updatedRequest;
};

// Club Specific Matches Management
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

// Helper to save all club matches (used internally, e.g. when adding a new club)
function saveClubDefinedMatchesAllClubs(allClubMatches: Record<string, ClubSpecificMatch[]>): void {
  setItem(CLUB_DEFINED_MATCHES_KEY, allClubMatches);
}
