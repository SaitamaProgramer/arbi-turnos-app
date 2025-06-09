
export interface ShiftRequest {
  id: string;
  userEmail: string;
  clubId: string; // Nuevo: A qué club pertenece esta solicitud
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

// Nuevo: Representa un Club o Grupo de Árbitros
export interface Club {
  id: string; // Código del Club, usado por árbitros para unirse
  name: string;
  adminUserId: string; // ID del usuario administrador de este club
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'referee';
  clubId: string | null; // Nuevo: ID del club al que pertenece el usuario (null si aún no está asociado o es un superadmin)
  password?: string; // Password should be hashed in a real app
}
