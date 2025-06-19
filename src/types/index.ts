
export interface ClubSpecificMatch {
  id: string;
  description: string; // Example: "Sábado 10:00 - Cancha 1: Sub-15 Final"
}

export interface ShiftRequest {
  id: string;
  userEmail: string;
  clubId: string; 
  selectedMatches: ClubSpecificMatch[];
  hasCar: boolean;
  notes: string;
  status: 'pending' | 'completed'; // 'assigned' status is removed from ShiftRequest
  submittedAt: string; 
  // assignedRefereeName?: string; // Removed: assignment is now per match
}

export const DAYS_OF_WEEK = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
export const TIME_SLOTS = ["Mañana (08:00-12:00)", "Tarde (12:00-18:00)", "Noche (18:00-23:00)"];

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
  password?: string; 
}

// New interface for individual match assignments
export interface MatchAssignment {
  clubId: string;
  matchId: string; // Corresponds to ClubSpecificMatch.id
  assignedRefereeEmail: string;
  assignedAt: string;
}
