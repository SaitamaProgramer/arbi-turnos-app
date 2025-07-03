
export interface ClubSpecificMatch {
  id: string;
  clubId: string;
  description: string; 
  date: string; // ISO string for date, e.g., "2024-07-28T00:00:00.000Z" or just "2024-07-28"
  time: string; // e.g., "15:00"
  location: string;
  status: 'scheduled' | 'cancelled' | 'postponed';
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
}

export interface User {
  id: string;
  name: string;
  email: string;
  administeredClubIds?: string[];
  memberClubIds?: string[]; 
  password?: string; // Should only be present when creating/checking, not on fetched user objects
  isDeveloper?: boolean; // Flag to identify the developer user
  roleInClub?: 'admin' | 'referee'; // Role of the user within a specific club context
  isAdmin?: boolean;
  isReferee?: boolean;
}

export type RegisterUserPayload = Omit<User, 'id'> & {
  role: 'admin' | 'referee'; // This is needed for the form, but not stored globally
  confirmPassword?: string;
  clubName?: string;
  clubIdToJoin?: string;
};


export interface MatchAssignment {
  id: number;
  clubId: string;
  matchId: string; 
  assignedRefereeId: string;
  assignmentRole: 'referee' | 'assistant';
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
      assignments: MatchAssignment[]; // Assignments for the current user in this club
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
  cancelledMatchesCount: number;
  postulationsCount: number;
}
