
export interface ClubSpecificMatch {
  id: string;
  description: string; // Example: "Sábado 10:00 - Cancha 1: Sub-15 Final"
}

export interface ShiftRequest {
  id: string;
  userEmail: string;
  clubId: string; 
  selectedMatches: ClubSpecificMatch[]; // Replaces days and times
  hasCar: boolean;
  notes: string;
  status: 'pending' | 'assigned' | 'completed';
  submittedAt: string; 
  assignedRefereeName?: string;
}

// DAYS_OF_WEEK and TIME_SLOTS might still be useful for admins when defining matches,
// but are no longer directly used by the referee's availability form options.
export const DAYS_OF_WEEK = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
export const TIME_SLOTS = ["Mañana (08:00-12:00)", "Tarde (12:00-18:00)", "Noche (18:00-23:00)"];

// FormConfiguration is no longer used. Admins define specific matches.
// export interface FormConfiguration {
//   availableDays: string[];
//   availableTimeSlots: string[];
// }

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
