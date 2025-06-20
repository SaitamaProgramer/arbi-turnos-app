
export interface ClubSpecificMatch {
  id: string;
  description: string; 
  date: string; // ISO string for date, e.g., "2024-07-28"
  time: string; // e.g., "15:00"
  location: string;
}

export interface ShiftRequest {
  id: string;
  userEmail: string;
  clubId: string; 
  selectedMatches: ClubSpecificMatch[];
  hasCar: boolean;
  notes: string;
  status: 'pending' | 'completed'; 
  submittedAt: string; 
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

export interface MatchAssignment {
  clubId: string;
  matchId: string; 
  assignedRefereeEmail: string;
  assignedAt: string;
}
