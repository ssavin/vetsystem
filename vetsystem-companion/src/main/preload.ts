import { contextBridge, ipcRenderer } from 'electron';
import type { Client, Patient, NomenclatureItem, Appointment, Invoice, SyncStatus } from '@shared/types';

// Expose protected methods that allow the renderer process to use
// ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('api', {
  // Clients
  getAllClients: () => ipcRenderer.invoke('db:get-all-clients'),
  searchClients: (query: string) => ipcRenderer.invoke('db:search-clients', query),
  createClient: (client: Client) => ipcRenderer.invoke('db:create-client', client),

  // Patients
  getPatientsByClient: (clientId: number) => ipcRenderer.invoke('db:get-patients-by-client', clientId),
  createPatient: (patient: Patient) => ipcRenderer.invoke('db:create-patient', patient),

  // Nomenclature
  getAllNomenclature: () => ipcRenderer.invoke('db:get-all-nomenclature'),
  searchNomenclature: (query: string) => ipcRenderer.invoke('db:search-nomenclature', query),

  // Appointments
  createAppointment: (appointment: Appointment) => ipcRenderer.invoke('db:create-appointment', appointment),
  getRecentAppointments: (limit?: number) => ipcRenderer.invoke('db:get-recent-appointments', limit),

  // Invoices
  createInvoice: (invoice: Invoice) => ipcRenderer.invoke('db:create-invoice', invoice),
  getRecentInvoices: (limit?: number) => ipcRenderer.invoke('db:get-recent-invoices', limit),

  // Sync
  checkConnection: () => ipcRenderer.invoke('sync:check-connection'),
  downloadInitialData: () => ipcRenderer.invoke('sync:download-initial-data'),
  uploadPendingChanges: () => ipcRenderer.invoke('sync:upload-pending-changes'),
  fullSync: () => ipcRenderer.invoke('sync:full-sync'),
  getSyncStatus: () => ipcRenderer.invoke('sync:get-status'),
  onSyncStatusChange: (callback: (status: SyncStatus) => void) => {
    ipcRenderer.on('sync:status-changed', (_event, status) => callback(status));
  },
});

// Type definitions for window.api
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
