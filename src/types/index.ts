
export interface ShiftRequest {
  id: string;
  userEmail: string; // Added to track who submitted the request
  days: string[];
  times: string[];
  hasCar: boolean;
  notes: string;
  status: 'pending' | 'assigned' | 'completed';
  submittedAt: string; // ISO date string
  assignedRefereeName?: string;
}

export const DAYS_OF_WEEK = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
export const TIME_SLOTS = ["Mañana (08:00-12:00)", "Tarde (12:00-18:00)", "Noche (18:00-23:00)"];

export interface FormConfiguration {
  availableDays: string[];
  availableTimeSlots: string[];
}

// For user authentication (simplified for now)
export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'referee';
  password?: string; // Password should be hashed in a real app
}
