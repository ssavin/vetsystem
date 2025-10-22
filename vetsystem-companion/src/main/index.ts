import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { DatabaseManager } from './database';
import { SyncService } from './sync-service';
import Store from 'electron-store';

// Polyfill __filename and __dirname for ES modules compiled to CJS
if (typeof __filename === 'undefined') {
  global.__filename = fileURLToPath(import.meta.url);
}
if (typeof __dirname === 'undefined') {
  global.__dirname = path.dirname(global.__filename);
}

const isDev = process.env.NODE_ENV === 'development';

// Configuration store interface
interface StoreSchema {
  serverUrl: string;
  apiKey: string;
  branchId: string;
  branchName: string;
  autoSyncInterval: number;
}

const store = new Store<StoreSchema>({
  defaults: {
    serverUrl: 'https://vetsystemai.ru',
    apiKey: 'companion-api-key-2025',
    branchId: '', // Selected branch ID
    branchName: '', // Selected branch name
    autoSyncInterval: 60000, // 1 minute
  },
});

let mainWindow: BrowserWindow | null = null;
let db: DatabaseManager;
let syncService: SyncService;

// Forward main process logs to renderer
function log(...args: any[]) {
  const message = args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
  console.log('[MAIN]', ...args);
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('main-log', message);
  }
}

function logError(...args: any[]) {
  const message = args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
  console.error('[MAIN ERROR]', ...args);
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('main-log', '❌ ERROR: ' + message);
  }
}

function createWindow() {
  // Get paths AFTER app is ready
  const appPath = app.getAppPath();
  const preloadPath = path.join(appPath, 'dist/preload/preload.js');
  
  console.log('[STARTUP] App path:', appPath);
  console.log('[STARTUP] Preload path:', preloadPath);
  
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    show: false, // Don't show until ready
    webPreferences: {
      preload: preloadPath,
      nodeIntegration: false,
      contextIsolation: true,
    },
    title: 'VetSystem Companion',
  });

  // In development, load from vite server
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173').then(() => {
      mainWindow?.show();
      mainWindow?.webContents.openDevTools();
    });
  } else {
    // In production, load the built files
    const htmlPath = path.join(appPath, 'dist/index.html');
    console.log('[STARTUP] Loading HTML from:', htmlPath);
    mainWindow.loadFile(htmlPath).then(() => {
      mainWindow?.show();
      mainWindow?.webContents.openDevTools(); // TEMP: для отладки
    }).catch((err) => {
      console.error('Failed to load HTML:', err);
      console.error('Attempted path:', htmlPath);
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
    try {
      log('IPC: sync:full-sync called');
      log('syncService ready:', !!syncService);
      log('db ready:', !!db);
      
      if (!syncService) {
        logError('ERROR: Sync service not initialized');
        throw new Error('Sync service not initialized. Please restart the application.');
      }
      if (!db) {
        logError('ERROR: Database not initialized');
        throw new Error('Database not initialized. Please restart the application.');
      }
      
      log('Starting full sync...');
      await syncService.fullSync();
      log('Full sync completed successfully');
      return { success: true };
    } catch (error: any) {
      logError('IPC sync:full-sync error:', error.message);
      logError('Error stack:', error.stack);
      throw error;
    }
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

  // Settings handlers
  ipcMain.handle('settings:get', async (_event, key: string) => {
    return store.get(key);
  });

  ipcMain.handle('settings:set', async (_event, key: string, value: any) => {
    store.set(key, value);
    return true;
  });

  ipcMain.handle('settings:get-all', async () => {
    return {
      serverUrl: store.get('serverUrl'),
      apiKey: store.get('apiKey'),
      branchId: store.get('branchId'),
      branchName: store.get('branchName'),
      autoSyncInterval: store.get('autoSyncInterval'),
    };
  });

  ipcMain.handle('settings:fetch-branches', async (_event, serverUrl?: string, apiKey?: string) => {
    log('IPC: settings:fetch-branches called', { serverUrl, apiKey: apiKey ? '***' : undefined });
    if (!syncService) {
      throw new Error('Sync service not initialized');
    }
    try {
      const branches = await syncService.fetchBranches(serverUrl, apiKey);
      log(`Fetched ${branches.length} branches`);
      return branches;
    } catch (error: any) {
      log('Error fetching branches:', error);
      throw error;
    }
  });

  ipcMain.handle('settings:update-branch', async (_event, branchId: string, branchName: string) => {
    log(`IPC: settings:update-branch called with branchId=${branchId}`);
    store.set('branchId', branchId);
    store.set('branchName', branchName);
    if (syncService) {
      syncService.setBranchId(branchId);
      log(`✓ Updated sync service branchId to ${branchId}`);
    }
    return true;
  });

  ipcMain.handle('settings:update-credentials', async (_event, serverUrl: string, apiKey: string) => {
    log(`IPC: settings:update-credentials called`);
    store.set('serverUrl', serverUrl);
    store.set('apiKey', apiKey);
    if (syncService) {
      syncService.updateCredentials(serverUrl, apiKey);
      log(`✓ Updated sync service credentials`);
    }
    return true;
  });

  // Authentication handlers
  ipcMain.handle('auth:login', async (_event, username: string, password: string) => {
    log(`IPC: auth:login called for user: ${username}`);
    if (!syncService) {
      throw new Error('Sync service not initialized');
    }
    try {
      log('About to call syncService.login()...');
      const user = await syncService.login(username, password);
      log('syncService.login() returned:', JSON.stringify(user));
      
      if (!user) {
        log('ERROR: user is null/undefined');
        throw new Error('Login failed: no user data returned');
      }
      log('Received user data:', JSON.stringify(user));
      // Clean user object - remove any null/undefined values
      const cleanUser = Object.fromEntries(
        Object.entries(user).filter(([_, v]) => v != null)
      );
      log('Cleaned user data:', JSON.stringify(cleanUser));
      // Use a separate file for user data to avoid electron-store constraints
      const fs = await import('fs');
      const path = await import('path');
      const { app } = await import('electron');
      const userDataPath = app.getPath('userData');
      const authFilePath = path.join(userDataPath, 'authenticated-user.json');
      fs.writeFileSync(authFilePath, JSON.stringify(cleanUser));
      log(`✓ User ${username} authenticated successfully`);
      return cleanUser;
    } catch (error: any) {
      log('Login error:', JSON.stringify(error));
      log('Login error message:', error.message);
      log('Login error stack:', error.stack);
      throw error;
    }
  });

  ipcMain.handle('auth:logout', async () => {
    log('IPC: auth:logout called');
    const fs = await import('fs');
    const path = await import('path');
    const { app } = await import('electron');
    const userDataPath = app.getPath('userData');
    const authFilePath = path.join(userDataPath, 'authenticated-user.json');
    try {
      fs.unlinkSync(authFilePath);
    } catch (e) {
      // File might not exist, ignore
    }
    return true;
  });

  ipcMain.handle('auth:get-current-user', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const { app } = await import('electron');
    const userDataPath = app.getPath('userData');
    const authFilePath = path.join(userDataPath, 'authenticated-user.json');
    try {
      const data = fs.readFileSync(authFilePath, 'utf-8');
      return JSON.parse(data);
    } catch (e) {
      return null;
    }
  });
}

async function initializeServices() {
  try {
    log('Initializing database...');
    db = new DatabaseManager();
    log('✓ Database initialized');

    // Initialize sync service
    const serverUrl = store.get('serverUrl') as string;
    const apiKey = store.get('apiKey') as string;
    const branchId = store.get('branchId') as string;
    log('Sync service config:', { serverUrl, apiKey, branchId });
    
    syncService = new SyncService(db, serverUrl, apiKey, branchId, log);
    
    // Send sync status updates to renderer
    syncService.setStatusCallback((status) => {
      if (mainWindow) {
        mainWindow.webContents.send('sync:status-changed', status);
      }
    });

    log('✓ Sync service initialized');
    log('✓ All services ready - sync available');
    
    // Test connection immediately
    const isOnline = await syncService.checkConnection();
    log('Initial connection test:', isOnline ? 'ONLINE' : 'OFFLINE');

  } catch (error: any) {
    logError('CRITICAL: Error during initialization:', error.message);
    logError('Stack:', error.stack);
    // Re-throw to prevent app from continuing in broken state
    throw error;
  }
}

app.whenReady().then(async () => {
  console.log('[STARTUP] App ready - creating window');
  
  // Create window FIRST
  createWindow();
  console.log('[STARTUP] Window created');

  // Setup IPC handlers immediately (will check service readiness inside)
  setupIpcHandlers();
  console.log('[STARTUP] IPC handlers registered');

  // Wait for renderer to be ready and subscribe to logs
  console.log('[STARTUP] Waiting for renderer to be ready...');
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  log('✅ Renderer ready - starting service initialization');

  // Initialize services
  try {
    await initializeServices();
  } catch (error: any) {
    logError('❌ App initialization failed:', error.message);
    logError('Stack trace:', error.stack);
    // Keep window open so user can see the error
  }
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
