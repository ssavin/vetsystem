import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { DatabaseManager } from './database';
import { SyncService } from './sync-service';
import Store from 'electron-store';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('=== VetSystem Companion Starting ===');
console.log('App path:', app.getAppPath());
console.log('__dirname:', __dirname);

// Configuration store
const store = new Store({
  defaults: {
    serverUrl: 'https://vetsystemai.ru',
    apiKey: 'companion-api-key-2025',
    autoSyncInterval: 60000,
  },
});

let mainWindow: BrowserWindow | null = null;
let db: DatabaseManager;
let syncService: SyncService;

function createWindow() {
  console.log('Creating window...');
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    webPreferences: {
      preload: path.join(__dirname, '../preload/preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    title: 'VetSystem Companion',
    show: false, // Don't show until ready
  });

  console.log('Window created');

  const htmlPath = path.join(__dirname, '../index.html');
  console.log('Loading HTML from:', htmlPath);

  mainWindow.loadFile(htmlPath).then(() => {
    console.log('HTML loaded successfully');
    mainWindow?.show();
    mainWindow?.webContents.openDevTools(); // Open DevTools for debugging
  }).catch((err) => {
    console.error('Failed to load HTML:', err);
  });

  mainWindow.on('closed', () => {
    console.log('Window closed');
    mainWindow = null;
  });
}

function setupIpcHandlers() {
  console.log('Setting up IPC handlers...');
  
  // Database handlers - Clients
  ipcMain.handle('db:get-all-clients', async () => {
    return db.getAllClients();
  });

  ipcMain.handle('db:search-clients', async (_event, query: string) => {
    return db.searchClients(query);
  });

  ipcMain.handle('db:create-client', async (_event, client) => {
    const clientId = db.createClient(client);
    db.addToSyncQueue({
      action_type: 'create_client',
      payload: { ...client, local_id: clientId },
      status: 'pending',
    });
    return clientId;
  });

  // Database handlers - Patients
  ipcMain.handle('db:get-patients-by-client', async (_event, clientId: number) => {
    return db.getPatientsByClient(clientId);
  });

  ipcMain.handle('db:create-patient', async (_event, patient) => {
    const patientId = db.createPatient(patient);
    db.addToSyncQueue({
      action_type: 'create_patient',
      payload: { ...patient, local_id: patientId },
      status: 'pending',
    });
    return patientId;
  });

  // Database handlers - Nomenclature
  ipcMain.handle('db:get-all-nomenclature', async () => {
    return db.getAllNomenclature();
  });

  ipcMain.handle('db:search-nomenclature', async (_event, query: string) => {
    return db.searchNomenclature(query);
  });

  // Database handlers - Appointments
  ipcMain.handle('db:create-appointment', async (_event, appointment) => {
    const appointmentId = db.createAppointment(appointment);
    db.addToSyncQueue({
      action_type: 'create_appointment',
      payload: { ...appointment, local_id: appointmentId },
      status: 'pending',
    });
    return appointmentId;
  });

  ipcMain.handle('db:get-recent-appointments', async (_event, limit?: number) => {
    return db.getRecentAppointments(limit);
  });

  // Database handlers - Invoices
  ipcMain.handle('db:create-invoice', async (_event, invoice) => {
    const invoiceId = db.createInvoice(invoice);
    db.addToSyncQueue({
      action_type: 'create_invoice',
      payload: { ...invoice, local_id: invoiceId },
      status: 'pending',
    });
    return invoiceId;
  });

  ipcMain.handle('db:get-recent-invoices', async (_event, limit?: number) => {
    return db.getRecentInvoices(limit);
  });

  // Sync handlers
  ipcMain.handle('sync:check-connection', async () => {
    return await syncService.checkConnection();
  });

  ipcMain.handle('sync:download-initial-data', async () => {
    return await syncService.downloadInitialData();
  });

  ipcMain.handle('sync:upload-pending-changes', async () => {
    return await syncService.uploadPendingChanges();
  });

  ipcMain.handle('sync:full-sync', async () => {
    return await syncService.fullSync();
  });

  ipcMain.handle('sync:get-status', async () => {
    return syncService.getStatus();
  });

  console.log('IPC handlers registered');
}

app.whenReady().then(() => {
  console.log('App ready');
  
  try {
    // Initialize database
    console.log('Initializing database...');
    db = new DatabaseManager();
    console.log('✓ Database initialized');

    // Initialize sync service (but don't auto-connect)
    console.log('Initializing sync service...');
    const serverUrl = store.get('serverUrl') as string;
    const apiKey = store.get('apiKey') as string;
    syncService = new SyncService(db, serverUrl, apiKey);
    
    syncService.setStatusCallback((status) => {
      if (mainWindow) {
        mainWindow.webContents.send('sync:status-changed', status);
      }
    });
    console.log('✓ Sync service initialized');

    // Setup IPC handlers
    setupIpcHandlers();

    // Create window
    console.log('Creating main window...');
    createWindow();
    console.log('✓ Window creation initiated');

    // DON'T auto-start sync to avoid hanging on startup
    console.log('✓ Initialization complete (sync disabled for debugging)');

  } catch (error) {
    console.error('Error during initialization:', error);
  }
});

app.on('window-all-closed', () => {
  console.log('All windows closed');
  if (syncService) {
    syncService.stopAutoSync();
  }
  if (db) {
    db.close();
  }
  
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  console.log('App activated');
  if (mainWindow === null) {
    createWindow();
  }
});
