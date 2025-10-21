import type { Client, Patient, NomenclatureItem, Appointment, Invoice, SyncStatus } from '@shared/types';

declare global {
  interface Window {
    api: {
      getAllClients: () => Promise<Client[]>;
      searchClients: (query: string) => Promise<Client[]>;
      createClient: (client: Client) => Promise<number>;
      getPatientsByClient: (clientId: number) => Promise<Patient[]>;
      createPatient: (patient: Patient) => Promise<number>;
      getAllNomenclature: () => Promise<NomenclatureItem[]>;
      searchNomenclature: (query: string) => Promise<NomenclatureItem[]>;
      createAppointment: (appointment: Appointment) => Promise<number>;
      getRecentAppointments: (limit?: number) => Promise<Appointment[]>;
      createInvoice: (invoice: Invoice) => Promise<number>;
      getRecentInvoices: (limit?: number) => Promise<Invoice[]>;
      checkConnection: () => Promise<boolean>;
      downloadInitialData: () => Promise<void>;
      uploadPendingChanges: () => Promise<void>;
      fullSync: () => Promise<void>;
      getSyncStatus: () => Promise<SyncStatus>;
      onSyncStatusChange: (callback: (status: SyncStatus) => void) => void;
    };
  }
}

export {};
