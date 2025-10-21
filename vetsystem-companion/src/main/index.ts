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
    serverUrl: 'https://163c7f4b-ecd0-4898-bed1-7f874b611cee-00-3qk3u36tdricg.riker.replit.dev',
    apiKey: 'companion-api-key-2025',
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
      mainWindow?.webContents.openDevTools(); // TEMP: для отладки
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
    if (!db) throw new Error('Database not initialized');
    return db.getAllClients();
  });

  ipcMain.handle('db:search-clients', async (_event, query: string) => {
    if (!db) throw new Error('Database not initialized');
    return db.searchClients(query);
  });

  ipcMain.handle('db:create-client', async (_event, client) => {
    if (!db) throw new Error('Database not initialized');
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
    if (!db) throw new Error('Database not initialized');
    return db.getPatientsByClient(clientId);
  });

  ipcMain.handle('db:create-patient', async (_event, patient) => {
    if (!db) throw new Error('Database not initialized');
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
    if (!db) throw new Error('Database not initialized');
    return db.getAllNomenclature();
  });

  ipcMain.handle('db:search-nomenclature', async (_event, query: string) => {
    if (!db) throw new Error('Database not initialized');
    return db.searchNomenclature(query);
  });

  // Database handlers - Appointments
  ipcMain.handle('db:create-appointment', async (_event, appointment) => {
    if (!db) throw new Error('Database not initialized');
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
    if (!db) throw new Error('Database not initialized');
    return db.getRecentAppointments(limit);
  });

  // Database handlers - Invoices
  ipcMain.handle('db:create-invoice', async (_event, invoice) => {
    if (!db) throw new Error('Database not initialized');
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
    if (!db) throw new Error('Database not initialized');
    return db.getRecentInvoices(limit);
  });

  // Sync handlers
  ipcMain.handle('sync:check-connection', async () => {
    if (!syncService) throw new Error('Sync service not initialized');
    return await syncService.checkConnection();
  });

  ipcMain.handle('sync:download-initial-data', async () => {
    if (!syncService) throw new Error('Sync service not initialized');
    return await syncService.downloadInitialData();
  });

  ipcMain.handle('sync:upload-pending-changes', async () => {
    if (!syncService) throw new Error('Sync service not initialized');
    return await syncService.uploadPendingChanges();
  });

  ipcMain.handle('sync:full-sync', async () => {
    if (!syncService) throw new Error('Sync service not initialized');
    return await syncService.fullSync();
  });

  ipcMain.handle('sync:get-status', async () => {
    if (!syncService) {
      return {
        isOnline: false,
        pendingCount: 0,
        isSyncing: false,
      };
    }
    return syncService.getStatus();
  });
}

app.whenReady().then(() => {
  console.log('App ready - creating window immediately');
  
  // Create window FIRST
  createWindow();
  console.log('✓ Window created');

  // Setup IPC handlers immediately (will check service readiness inside)
  setupIpcHandlers();
  console.log('✓ IPC handlers registered');

  // Initialize services asynchronously in background
  setTimeout(() => {
    try {
      console.log('Initializing database...');
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
      console.log('✓ All services ready - sync available');

    } catch (error) {
      console.error('Error during initialization:', error);
      // Window is still open - user can see the error
    }
  }, 100); // Quick initialization
});

app.on('window-all-closed', () => {
  if (syncService) {
    try {
      syncService.stopAutoSync();
    } catch (e) {
      console.error('Error stopping sync:', e);
    }
  }
  
  if (db) {
    try {
      db.close();
    } catch (e) {
      console.error('Error closing database:', e);
    }
  }
  
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});
