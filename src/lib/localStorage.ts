import type { ShiftRequest, FormConfiguration, User } from '@/types';
import { DAYS_OF_WEEK, TIME_SLOTS } from '@/types';

const SHIFT_REQUESTS_KEY = 'arbitros_shift_requests_v2';
const FORM_CONFIGURATION_KEY = 'arbitros_form_configuration_v1';
const USERS_KEY = 'arbitros_users_v1'; // For storing registered users

export const DEFAULT_FORM_CONFIGURATION: FormConfiguration = {
  availableDays: [...DAYS_OF_WEEK],
  availableTimeSlots: [...TIME_SLOTS],
};

// Shift Requests
export const getShiftRequests = (): ShiftRequest[] => {
  if (typeof window === 'undefined') {
    return [];
  }
  try {
    const data = localStorage.getItem(SHIFT_REQUESTS_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error("Error parsing shift requests from localStorage:", error);
    return [];
  }
};

export const saveShiftRequests = (requests: ShiftRequest[]): void => {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    localStorage.setItem(SHIFT_REQUESTS_KEY, JSON.stringify(requests));
  } catch (error) {
    console.error("Error saving shift requests to localStorage:", error);
  }
};

export const addShiftRequest = (requestData: Omit<ShiftRequest, 'id' | 'status' | 'submittedAt' | 'assignedRefereeName'>): ShiftRequest => {
  const requests = getShiftRequests();
  const newRequest: ShiftRequest = {
    ...requestData,
    id: crypto.randomUUID(),
    status: 'pending',
    submittedAt: new Date().toISOString(),
  };
  saveShiftRequests([...requests, newRequest]);
  return newRequest;
};

export const updateShiftRequestStatus = (id: string, status: ShiftRequest['status'], assignedRefereeName?: string): ShiftRequest | null => {
  const requests = getShiftRequests();
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
export const getFormConfiguration = (): FormConfiguration => {
  if (typeof window === 'undefined') {
    return DEFAULT_FORM_CONFIGURATION;
  }
  try {
    const data = localStorage.getItem(FORM_CONFIGURATION_KEY);
    if (data) {
      const parsed = JSON.parse(data);
      // Ensure both arrays exist, otherwise return default
      if (parsed.availableDays && parsed.availableTimeSlots) {
        return parsed;
      }
    }
    return DEFAULT_FORM_CONFIGURATION;
  } catch (error) {
    console.error("Error parsing form configuration from localStorage:", error);
    return DEFAULT_FORM_CONFIGURATION;
  }
};

export const saveFormConfiguration = (config: FormConfiguration): void => {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    localStorage.setItem(FORM_CONFIGURATION_KEY, JSON.stringify(config));
  } catch (error) {
    console.error("Error saving form configuration to localStorage:", error);
  }
};

// User Management (Simplified)
export const getUsers = (): User[] => {
  if (typeof window === 'undefined') {
    return [];
  }
  try {
    const data = localStorage.getItem(USERS_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error("Error parsing users from localStorage:", error);
    return [];
  }
};

export const saveUsers = (users: User[]): void => {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  } catch (error) {
    console.error("Error saving users to localStorage:", error);
  }
};

export const addUser = (userData: Omit<User, 'id'>): User | { error: string } => {
  const users = getUsers();
  if (users.find(user => user.email === userData.email)) {
    return { error: "El correo electrónico ya está registrado." };
  }
  const newUser: User = {
    ...userData,
    id: crypto.randomUUID(),
  };
  saveUsers([...users, newUser]);
  return newUser;
};

export const findUserByEmail = (email: string): User | undefined => {
  const users = getUsers();
  return users.find(user => user.email === email);
};
