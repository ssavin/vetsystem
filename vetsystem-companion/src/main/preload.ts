const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('api', {
  // Clients
  getAllClients: () => ipcRenderer.invoke('db:get-all-clients'),
  searchClients: (query) => ipcRenderer.invoke('db:search-clients', query),
  createClient: (client) => ipcRenderer.invoke('db:create-client', client),

  // Patients
  getPatientsByClient: (clientId) => ipcRenderer.invoke('db:get-patients-by-client', clientId),
  createPatient: (patient) => ipcRenderer.invoke('db:create-patient', patient),

  // Nomenclature
  getAllNomenclature: () => ipcRenderer.invoke('db:get-all-nomenclature'),
  searchNomenclature: (query) => ipcRenderer.invoke('db:search-nomenclature', query),

  // Appointments
  createAppointment: (appointment) => ipcRenderer.invoke('db:create-appointment', appointment),
  getRecentAppointments: (limit) => ipcRenderer.invoke('db:get-recent-appointments', limit),

  // Invoices
  createInvoice: (invoice) => ipcRenderer.invoke('db:create-invoice', invoice),
  getRecentInvoices: (limit) => ipcRenderer.invoke('db:get-recent-invoices', limit),

  // Sync
  checkConnection: () => ipcRenderer.invoke('sync:check-connection'),
  downloadInitialData: () => ipcRenderer.invoke('sync:download-initial-data'),
  uploadPendingChanges: () => ipcRenderer.invoke('sync:upload-pending-changes'),
  fullSync: () => ipcRenderer.invoke('sync:full-sync'),
  getSyncStatus: () => ipcRenderer.invoke('sync:get-status'),
  onSyncStatusChange: (callback) => {
    ipcRenderer.on('sync:status-changed', (_event, status) => callback(status));
  },

  // Settings
  getSetting: (key) => ipcRenderer.invoke('settings:get', key),
  setSetting: (key, value) => ipcRenderer.invoke('settings:set', key, value),
  getAllSettings: () => ipcRenderer.invoke('settings:get-all'),
  fetchBranches: () => ipcRenderer.invoke('settings:fetch-branches'),
  updateBranch: (branchId, branchName) => ipcRenderer.invoke('settings:update-branch', branchId, branchName),
});

// Expose electron APIs for direct IPC access (for logging)
contextBridge.exposeInMainWorld('electron', {
  ipcRenderer: {
    on: (channel, callback) => {
      // Whitelist channels
      const validChannels = ['main-log', 'sync:status-changed'];
      if (validChannels.includes(channel)) {
        ipcRenderer.on(channel, callback);
      }
    },
  },
});
