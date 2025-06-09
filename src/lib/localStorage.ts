import type { ShiftRequest } from '@/types';

const SHIFT_REQUESTS_KEY = 'arbitros_shift_requests_v2'; // Updated key to avoid conflicts with old data structure

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

// This function is for adding a new request from the user form
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
    // Clear assignedRefereeName if not being assigned or re-assigned
     delete updatedRequest.assignedRefereeName;
  }
  
  requests[requestIndex] = updatedRequest;
  saveShiftRequests(requests);
  return updatedRequest;
};
