// Mobile app types based on shared schema

export interface Owner {
  id: number;
  firstName: string;
  lastName: string;
  middleName?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  tenantId: string;
}

export interface Patient {
  id: number;
  name: string;
  species: string;
  breed?: string | null;
  gender: 'male' | 'female';
  birthDate?: string | null;
  color?: string | null;
  weight?: number | null;
  microchipNumber?: string | null;
  photoUrl?: string | null;
  specialNotes?: string | null;
  tenantId: string;
  branchId?: number | null;
}

export interface Doctor {
  id: number;
  firstName: string;
  lastName: string;
  middleName?: string | null;
  specialization?: string | null;
  tenantId: string;
}

export interface Branch {
  id: number;
  name: string;
  address?: string | null;
  phone?: string | null;
  tenantId: string;
}

export interface Appointment {
  id: number;
  patientId: number;
  doctorId: number;
  branchId: number;
  scheduledAt: string;
  status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
  description?: string | null;
  tenantId: string;
}

export interface TimeSlot {
  time: string;
  available: boolean;
}

export interface MedicalRecord {
  id: number;
  patientId: number;
  doctorId: number;
  diagnosis?: string | null;
  treatment?: string | null;
  notes?: string | null;
  visitDate: string;
  doctor?: {
    firstName: string;
    lastName: string;
    specialization?: string | null;
  };
}

export interface AuthResponse {
  success: boolean;
  message: string;
  token?: string;
  owner?: Owner;
}

export interface OwnerWithPets {
  owner: Owner;
  pets: Patient[];
}

export interface DoctorUser {
  id: number;
  username: string;
  firstName: string;
  lastName: string;
  middleName?: string | null;
  role: string;
  specialization?: string | null;
  tenantId: string;
  branchId?: number | null;
}

export interface DoctorAuthResponse {
  success: boolean;
  message?: string;
  token?: string;
  user?: DoctorUser;
}

export interface QueueEntry {
  id: number;
  ticketNumber: number;
  patientId: number;
  ownerId: number;
  doctorId?: number | null;
  status: 'waiting' | 'called' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'normal' | 'urgent' | 'emergency';
  createdAt: string;
  patient?: Patient;
  owner?: Owner;
}

export interface TodayAppointment {
  id: number;
  patientId: number;
  doctorId: number;
  scheduledAt: string;
  status: string;
  description?: string | null;
  patient?: Patient;
  owner?: Owner;
}
