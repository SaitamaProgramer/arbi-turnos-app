
export interface ClubSpecificMatch {
  id: string;
  clubId: string;
  description: string; 
  date: string; // ISO string for date, e.g., "2024-07-28T00:00:00.000Z" or just "2024-07-28"
  time: string; // e.g., "15:00"
  location: string;
}

export interface ShiftRequest {
  id: string;
  userId: string;
  clubId: string; 
  hasCar: boolean; // stored as INTEGER in DB, but represented as boolean here
  notes: string;
  status: 'pending' | 'completed'; 
  submittedAt: string; 
}

export interface ShiftRequestWithMatches extends ShiftRequest {
  selectedMatches: ClubSpecificMatch[];
}


export interface Club {
  id: string; 
  name: string;
  adminUserId: string; 
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'referee';
  administeredClubId?: string; 
  memberClubIds?: string[]; 
  password?: string; // Should only be present when creating/checking, not on fetched user objects
  isDeveloper?: boolean; // Flag to identify the developer user
}

export type RegisterUserPayload = Omit<User, 'id'> & {
  confirmPassword?: string;
  clubName?: string;
  clubIdToJoin?: string;
};


export interface MatchAssignment {
  id: number;
  clubId: string;
  matchId: string; 
  assignedRefereeId: string;
  assignedAt: string;
}

// For client-side forms and data fetching structures
export interface AvailabilityFormData {
  activeClubId: string;
  clubs: {
    [clubId: string]: {
      id: string;
      name: string;
      matches: ClubSpecificMatch[];
      assignments: Omit<MatchAssignment, 'id' | 'clubId' | 'assignedAt'>[]; // Assignments for the current user in this club
      postulation: ShiftRequestWithMatches | null; // Pending postulation for the current user in this club
    }
  }
}

export interface Suggestion {
  id: string;
  userId?: string;
  userName?: string;
  suggestionText: string;
  submittedAt: string;
}

export interface UserStats {
  associationsCount: number;
  refereedMatchesCount: number;
  postulationsCount: number;
}
