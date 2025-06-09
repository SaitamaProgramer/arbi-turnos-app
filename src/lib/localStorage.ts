
import type { ShiftRequest, FormConfiguration, User, Club } from '@/types';
import { DAYS_OF_WEEK, TIME_SLOTS } from '@/types';

const SHIFT_REQUESTS_KEY = 'arbitros_shift_requests_v3';
const FORM_CONFIGURATIONS_KEY = 'arbitros_form_configurations_v2';
const USERS_KEY = 'arbitros_users_v3'; 
const CLUBS_KEY = 'arbitros_clubs_v1';
const CURRENT_USER_EMAIL_KEY = 'arbitros_current_user_email_v2';
const ACTIVE_CLUB_ID_KEY = 'arbitros_active_club_id_v1'; 
const TEST_DATA_INITIALIZED_KEY = 'arbitros_test_data_initialized_v1';


export const DEFAULT_FORM_CONFIGURATION: FormConfiguration = {
  availableDays: [...DAYS_OF_WEEK],
  availableTimeSlots: [...TIME_SLOTS],
};

function initializeWithTestData() {
  if (typeof window === 'undefined' || localStorage.getItem(TEST_DATA_INITIALIZED_KEY)) {
    return;
  }

  console.log("Initializing with test data...");

  // --- Clubes ---
  const club1Id = "club-bh-01";
  const club2Id = "club-rs-02";
  const clubs: Club[] = [
    { id: club1Id, name: "Club Bahiense de Árbitros", adminUserId: "adminUser1" },
    { id: club2Id, name: "Club Rosaleño de Referís", adminUserId: "adminUser2" },
  ];
  setItem(CLUBS_KEY, clubs);

  // --- Usuarios ---
  const users: User[] = [
    // Admins
    { id: "adminUser1", name: "Admin Bahía", email: "admin1@example.com", password: "password", role: "admin", administeredClubId: club1Id },
    { id: "adminUser2", name: "Admin Rosales", email: "admin2@example.com", password: "password", role: "admin", administeredClubId: club2Id },
    // Árbitros
    { id: "refUser1", name: "Referee Uno (Bahía)", email: "ref1@example.com", password: "password", role: "referee", memberClubIds: [club1Id] },
    { id: "refUser2", name: "Referee Dos (Bahía)", email: "ref2@example.com", password: "password", role: "referee", memberClubIds: [club1Id] },
    { id: "refUser3", name: "Referee Tres (Rosales)", email: "ref3@example.com", password: "password", role: "referee", memberClubIds: [club2Id] },
    { id: "refUserMulti", name: "Referee MultiClub", email: "refMulti@example.com", password: "password", role: "referee", memberClubIds: [club1Id, club2Id] },
  ];
  setItem(USERS_KEY, users);

  // --- Configuraciones de Formulario ---
  const formConfigs: Record<string, FormConfiguration> = {
    [club1Id]: {
      availableDays: ["Lunes", "Miércoles", "Viernes"],
      availableTimeSlots: ["Mañana (08:00-12:00)", "Tarde (12:00-18:00)"],
    },
    [club2Id]: {
      availableDays: ["Sábado", "Domingo"],
      availableTimeSlots: ["Tarde (12:00-18:00)", "Noche (18:00-23:00)"],
    },
  };
  setItem(FORM_CONFIGURATIONS_KEY, formConfigs);

  // --- Solicitudes de Turno ---
  const shiftRequests: ShiftRequest[] = [
    { 
      id: crypto.randomUUID(), 
      userEmail: "ref1@example.com", 
      clubId: club1Id, 
      days: ["Lunes"], 
      times: ["Mañana (08:00-12:00)"], 
      hasCar: true, 
      notes: "Disponible solo temprano el lunes.", 
      status: 'pending', 
      submittedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString() // Hace 2 días
    },
    { 
      id: crypto.randomUUID(), 
      userEmail: "ref3@example.com", 
      clubId: club2Id, 
      days: ["Sábado"], 
      times: ["Noche (18:00-23:00)"], 
      hasCar: true, 
      notes: "", 
      status: 'assigned', 
      assignedRefereeName: "Referee Tres (Rosales)", // Auto-asignado para el ejemplo
      submittedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString() // Hace 3 días
    },
     { 
      id: crypto.randomUUID(), 
      userEmail: "refMulti@example.com", 
      clubId: club1Id, // Para Club Bahiense
      days: ["Miércoles"], 
      times: ["Tarde (12:00-18:00)"], 
      hasCar: false, 
      notes: "Disponibilidad para Club Bahiense.", 
      status: 'pending', 
      submittedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString() // Hace 1 día
    },
  ];
  setItem(SHIFT_REQUESTS_KEY, shiftRequests);

  localStorage.setItem(TEST_DATA_INITIALIZED_KEY, 'true');
  console.log("Test data initialized.");
}


function getItem<T>(key: string, defaultValue: T): T {
  if (typeof window === 'undefined') {
    return defaultValue;
  }
  // Llamar a la inicialización aquí antes de intentar obtener el ítem
  // Esto asegura que los datos de prueba se carguen si es la primera vez para esta clave.
  // Sin embargo, para evitar múltiples console.log y lógicas, es mejor centralizar la llamada.
  // La lógica de initializeWithTestData ya previene ejecuciones múltiples con TEST_DATA_INITIALIZED_KEY
  if (key === USERS_KEY && !localStorage.getItem(USERS_KEY)) initializeWithTestData();
  if (key === CLUBS_KEY && !localStorage.getItem(CLUBS_KEY)) initializeWithTestData();
  if (key === SHIFT_REQUESTS_KEY && !localStorage.getItem(SHIFT_REQUESTS_KEY)) initializeWithTestData();
  if (key === FORM_CONFIGURATIONS_KEY && !localStorage.getItem(FORM_CONFIGURATIONS_KEY)) initializeWithTestData();


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

// Initialize test data once if no marker is found.
if (typeof window !== 'undefined' && !localStorage.getItem(TEST_DATA_INITIALIZED_KEY)) {
  initializeWithTestData();
}


// Current User Session
export const setCurrentUserEmail = (email: string | null): void => {
  setItem(CURRENT_USER_EMAIL_KEY, email);
  if (!email) { 
    setActiveClubId(null);
  }
};

export const getCurrentUserEmail = (): string | null => {
  return getItem(CURRENT_USER_EMAIL_KEY, null);
};

// Active Club for Referees/Admins
export const setActiveClubId = (clubId: string | null): void => {
  setItem(ACTIVE_CLUB_ID_KEY, clubId);
};

export const getActiveClubId = (): string | null => {
  return getItem(ACTIVE_CLUB_ID_KEY, null);
};

// Clubs
export const getClubs = (): Club[] => {
  return getItem(CLUBS_KEY, []);
};

export const saveClubs = (clubs: Club[]): void => {
  setItem(CLUBS_KEY, clubs);
};

export const addClub = (name: string, adminUserId: string): Club => {
  const clubs = getClubs();
  const newClub: Club = {
    id: `club-${name.toLowerCase().replace(/\s+/g, '-').slice(0,10)}-${crypto.randomUUID().slice(0,4)}`,
    name,
    adminUserId,
  };
  saveClubs([...clubs, newClub]);
  return newClub;
};

export const findClubById = (clubId: string): Club | undefined => {
  return getClubs().find(club => club.id === clubId);
};

export const getClubNameById = (clubId: string): string | undefined => {
  const club = findClubById(clubId);
  return club?.name;
};


// User Management
export const getUsers = (): User[] => {
  return getItem(USERS_KEY, []);
};

export const saveUsers = (users: User[]): void => {
  setItem(USERS_KEY, users);
};

export const addUser = (
  userData: Omit<User, 'id' | 'administeredClubId' | 'memberClubIds'> & { role: 'admin' | 'referee'; clubName?: string; clubIdToJoin?: string }
): { user?: User; club?: Club; error?: string } => {
  const users = getUsers();
  if (users.find(user => user.email === userData.email)) {
    return { error: "El correo electrónico ya está registrado." };
  }

  const userId = crypto.randomUUID();
  let newUser: User;
  let newClub: Club | undefined;

  if (userData.role === 'admin') {
    if (!userData.clubName) {
      return { error: "El nombre del club es requerido para administradores." };
    }
    newClub = addClub(userData.clubName, userId);
    newUser = {
      id: userId,
      name: userData.name,
      email: userData.email,
      password: userData.password, 
      role: 'admin',
      administeredClubId: newClub.id,
    };
  } else { 
    if (!userData.clubIdToJoin) {
      return { error: "El código de club es requerido para árbitros." };
    }
    const clubExists = findClubById(userData.clubIdToJoin);
    if (!clubExists) {
      return { error: "El código de club no es válido o el club no existe." };
    }
    newUser = {
      id: userId,
      name: userData.name,
      email: userData.email,
      password: userData.password, 
      role: 'referee',
      memberClubIds: [userData.clubIdToJoin],
    };
  }

  saveUsers([...users, newUser]);
  return { user: newUser, club: newClub };
};

export const findUserByEmail = (email: string): User | undefined => {
  return getUsers().find(user => user.email === email);
};

export const getRefereesByClubId = (clubId: string): User[] => {
  const allUsers = getUsers();
  return allUsers.filter(user => user.role === 'referee' && user.memberClubIds?.includes(clubId));
}

// Shift Requests
export const getShiftRequests = (clubId?: string): ShiftRequest[] => {
  const allRequests = getItem<ShiftRequest[]>(SHIFT_REQUESTS_KEY, []);
  if (clubId) {
    return allRequests.filter(req => req.clubId === clubId);
  }
  return allRequests;
};

export const findPendingShiftRequestForUserInClub = (userEmail: string, clubId: string): ShiftRequest | undefined => {
  const allRequests = getItem<ShiftRequest[]>(SHIFT_REQUESTS_KEY, []);
  return allRequests
    .filter(req => req.userEmail === userEmail && req.clubId === clubId && req.status === 'pending')
    .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())[0];
};

export const saveShiftRequests = (requests: ShiftRequest[]): void => {
  setItem(SHIFT_REQUESTS_KEY, requests);
};

export const addShiftRequest = (
  requestData: Omit<ShiftRequest, 'id' | 'status' | 'submittedAt' | 'assignedRefereeName' | 'userEmail' | 'clubId'>,
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
  newData: {
    days: string[];
    times: string[];
    hasCar: boolean;
    notes: string;
  }
): ShiftRequest | null => {
  const requests = getItem<ShiftRequest[]>(SHIFT_REQUESTS_KEY, []);
  const requestIndex = requests.findIndex(req => req.id === requestId);

  if (requestIndex === -1) {
    console.error("Shift request not found for updating details");
    return null;
  }

  const originalRequest = requests[requestIndex];

  if (originalRequest.userEmail !== userEmail) {
    console.error("User not authorized to update this shift request details");
    return null;
  }
  if (originalRequest.status !== 'pending') {
    console.error("Shift request is not pending, cannot update details");
    return null;
  }

  const updatedRequest: ShiftRequest = {
    ...originalRequest,
    days: newData.days,
    times: newData.times,
    hasCar: newData.hasCar,
    notes: newData.notes,
    submittedAt: new Date().toISOString(), // Update submission time on edit
  };
  
  requests[requestIndex] = updatedRequest;
  saveShiftRequests(requests);
  return updatedRequest;
};


export const updateShiftRequestStatus = (id: string, status: ShiftRequest['status'], assignedRefereeName?: string): ShiftRequest | null => {
  const requests = getItem<ShiftRequest[]>(SHIFT_REQUESTS_KEY, []);
  const requestIndex = requests.findIndex(req => req.id === id);

  if (requestIndex === -1) {
    return null;
  }

  const updatedRequest = { ...requests[requestIndex], status };
  if (status === 'assigned' && assignedRefereeName) {
    updatedRequest.assignedRefereeName = assignedRefereeName;
  } else if (status !== 'assigned') {
     delete updatedRequest.assignedRefereeName;
  }
  
  requests[requestIndex] = updatedRequest;
  saveShiftRequests(requests);
  return updatedRequest;
};

// Form Configuration
export const getFormConfigurations = (): Record<string, FormConfiguration> => {
  return getItem(FORM_CONFIGURATIONS_KEY, {});
};

export const getFormConfiguration = (clubId: string): FormConfiguration => {
  const configs = getFormConfigurations();
  return configs[clubId] || DEFAULT_FORM_CONFIGURATION;
};

export const saveFormConfiguration = (clubId: string, config: FormConfiguration): void => {
  const configs = getFormConfigurations();
  configs[clubId] = config;
  setItem(FORM_CONFIGURATIONS_KEY, configs);
};
