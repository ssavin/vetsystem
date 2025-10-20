// Shared types between main and renderer processes

export interface Client {
  id?: number;
  full_name: string;
  phone: string;
  email?: string;
  address?: string;
  synced?: boolean;
}

export interface Patient {
  id?: number;
  name: string;
  species: string;
  breed?: string;
  birth_date?: string;
  gender?: 'male' | 'female';
  client_id: number;
  synced?: boolean;
}

export interface NomenclatureItem {
  id: number;
  name: string;
  type: 'service' | 'product';
  price: number;
  category?: string;
}

export interface Appointment {
  id?: number;
  client_id: number;
  patient_id: number;
  appointment_date: string;
  appointment_time: string;
  doctor_name?: string;
  notes?: string;
  synced?: boolean;
}

export interface Invoice {
  id?: number;
  client_id: number;
  patient_id?: number;
  items: InvoiceItem[];
  total_amount: number;
  payment_status: 'pending' | 'paid' | 'cancelled';
  created_at: string;
  synced?: boolean;
}

export interface InvoiceItem {
  nomenclature_id: number;
  name: string;
  quantity: number;
  price: number;
  total: number;
}

export interface SyncQueueItem {
  id?: number;
  action_type: 'create_client' | 'create_patient' | 'create_appointment' | 'create_invoice';
  payload: any;
  status: 'pending' | 'success' | 'error';
  error_message?: string;
  created_at: string;
}

export interface SyncStatus {
  isOnline: boolean;
  lastSync?: string;
  pendingCount: number;
  isSyncing: boolean;
}

export interface InitialSyncData {
  clients: Client[];
  patients: Patient[];
  nomenclature: NomenclatureItem[];
}

export interface SyncUploadRequest {
  actions: Array<{
    queue_id: number;
    action_type: string;
    payload: any;
  }>;
}

export interface SyncUploadResponse {
  results: Array<{
    queue_id: number;
    status: 'success' | 'error';
    message?: string;
    server_id?: number;
  }>;
}
