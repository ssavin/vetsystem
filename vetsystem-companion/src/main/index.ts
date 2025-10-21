import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { DatabaseManager } from './database';
import { SyncService } from './sync-service';
import Store from 'electron-store';

// ES module __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration store
const store = new Store({
  defaults: {
    serverUrl: 'https://vetsystemai.ru',
    apiKey: 'companion-api-key-2025', // Will be configured on first run
    autoSyncInterval: 60000, // 1 minute
  },
});

let mainWindow: BrowserWindow | null = null;
let db: DatabaseManager;
let syncService: SyncService;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    show: false, // Don't show until ready
    webPreferences: {
      preload: path.join(__dirname, '../preload/preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    title: 'VetSystem Companion',
  });

  // In development, load from vite server
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173').then(() => {
      mainWindow?.show();
      mainWindow?.webContents.openDevTools();
    });
  } else {
    // In production, load the built files
    mainWindow.loadFile(path.join(__dirname, '../index.html')).then(() => {
      mainWindow?.show();
    }).catch((err) => {
      console.error('Failed to load HTML:', err);
    });
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function setupIpcHandlers() {
  // Database handlers - Clients
  ipcMain.handle('db:get-all-clients', async () => {
    return db.getAllClients();
  });

  ipcMain.handle('db:search-clients', async (_event, query: string) => {
    return db.searchClients(query);
  });

  ipcMain.handle('db:create-client', async (_event, client) => {
    const clientId = db.createClient(client);
    
    // Add to sync queue
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
    
    // Add to sync queue
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
    
    // Add to sync queue
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
    
    // Add to sync queue
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
}

app.whenReady().then(() => {
  // Initialize database
  db = new DatabaseManager();
  console.log('✓ Database initialized');

  // Initialize sync service
  const serverUrl = store.get('serverUrl') as string;
  const apiKey = store.get('apiKey') as string;
  syncService = new SyncService(db, serverUrl, apiKey);
  
  // Send sync status updates to renderer
  syncService.setStatusCallback((status) => {
    if (mainWindow) {
      mainWindow.webContents.send('sync:status-changed', status);
    }
  });

  console.log('✓ Sync service initialized');

  // Setup IPC handlers
  setupIpcHandlers();
  console.log('✓ IPC handlers registered');

  // Create window
  createWindow();

  // Start auto-sync
  const autoSyncInterval = store.get('autoSyncInterval') as number;
  syncService.startAutoSync(autoSyncInterval);
  console.log('✓ Auto-sync started');

  // Initial connection check
  syncService.checkConnection().then((isOnline) => {
    if (isOnline) {
      console.log('✓ Server connection established');
    } else {
      console.log('⚠ Server offline - working in offline mode');
    }
  });
});

app.on('window-all-closed', () => {
  syncService.stopAutoSync();
  db.close();
  
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});
