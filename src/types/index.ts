
export interface ShiftRequest {
  id: string;
  userEmail: string;
  clubId: string; 
  days: string[];
  times: string[];
  hasCar: boolean;
  notes: string;
  status: 'pending' | 'assigned' | 'completed';
  submittedAt: string; 
  assignedRefereeName?: string;
}

export const DAYS_OF_WEEK = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
export const TIME_SLOTS = ["Mañana (08:00-12:00)", "Tarde (12:00-18:00)", "Noche (18:00-23:00)"];

export interface FormConfiguration {
  availableDays: string[];
  availableTimeSlots: string[];
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
  // Si es admin, este es el ID del club que administra
  administeredClubId?: string; 
  // Si es árbitro, estos son los IDs de los clubes a los que pertenece
  memberClubIds?: string[]; 
  password?: string; 
}
