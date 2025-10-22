import axios, { AxiosInstance } from 'axios';
import path from 'path';
import { fileURLToPath } from 'url';
import { DatabaseManager } from './database';
import type { InitialSyncData, SyncUploadRequest, SyncUploadResponse, SyncStatus } from '@shared/types';

// Polyfill __filename and __dirname for ES modules compiled to CJS
if (typeof __filename === 'undefined') {
  global.__filename = fileURLToPath(import.meta.url);
}
if (typeof __dirname === 'undefined') {
  global.__dirname = path.dirname(global.__filename);
}

export class SyncService {
  private db: DatabaseManager;
  private apiClient: AxiosInstance;
  private syncInterval: NodeJS.Timeout | null = null;
  private currentStatus: SyncStatus = {
    isOnline: false,
    pendingCount: 0,
    isSyncing: false,
  };
  private statusCallback?: (status: SyncStatus) => void;
  private branchId: string = '';
  private log: (message: string, ...args: any[]) => void;

  constructor(db: DatabaseManager, serverUrl: string, apiKey: string, branchId?: string, logFn?: (message: string, ...args: any[]) => void) {
    this.db = db;
    this.branchId = branchId || '';
    this.log = logFn || console.log;
    this.apiClient = axios.create({
      baseURL: serverUrl,
      headers: {
        'X-API-Key': apiKey,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });
  }

  setBranchId(branchId: string) {
    this.branchId = branchId;
  }

  updateCredentials(serverUrl: string, apiKey: string) {
    // Recreate axios instance with new credentials
    this.apiClient = axios.create({
      baseURL: serverUrl,
      headers: {
        'X-API-Key': apiKey,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });
    console.log('✓ SyncService credentials updated:', { serverUrl, apiKey });
  }

  // Login user
  async login(username: string, password: string): Promise<any> {
    try {
      this.log('[SyncService.login] Attempting login for user:', username);
      this.log('[SyncService.login] API client baseURL:', this.apiClient.defaults.baseURL);
      this.log('[SyncService.login] API key configured:', !!this.apiClient.defaults.headers['X-API-Key']);
      
      const response = await this.apiClient.post('/api/sync/login', {
        username,
        password,
      });
      
      this.log('[SyncService.login] Response status:', response.status);
      this.log('[SyncService.login] Response data:', JSON.stringify(response.data));
      
      if (!response.data || !response.data.user) {
        this.log('[SyncService.login] ERROR: No user data in response, full response:', JSON.stringify(response.data));
        throw new Error('Сервер не вернул данные пользователя');
      }
      
      this.log('[SyncService.login] Success! User:', response.data.user.username);
      return response.data.user;
    } catch (error: any) {
      this.log('[SyncService.login] Login failed - error:', error.message);
      this.log('[SyncService.login] Error response data:', JSON.stringify(error.response?.data));
      this.log('[SyncService.login] Error status:', error.response?.status);
      this.log('[SyncService.login] Full error:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
      throw new Error(error.response?.data?.error || error.message || 'Ошибка входа');
    }
  }

  setStatusCallback(callback: (status: SyncStatus) => void) {
    this.statusCallback = callback;
  }

  // Fetch list of branches from server (optionally with temporary credentials)
  async fetchBranches(tempServerUrl?: string, tempApiKey?: string): Promise<{ id: string; name: string; address?: string }[]> {
    try {
      // If temporary credentials provided, create a temporary axios client
      const client = (tempServerUrl && tempApiKey) 
        ? axios.create({
            baseURL: tempServerUrl,
            headers: {
              'X-API-Key': tempApiKey,
              'Content-Type': 'application/json',
            },
            timeout: 30000,
          })
        : this.apiClient;

      const response = await client.get('/api/sync/branches');
      return response.data.branches || [];
    } catch (error: any) {
      console.error('Failed to fetch branches:', error);
      throw new Error(error.response?.data?.error || error.message || 'Failed to fetch branches');
    }
  }

  private updateStatus(updates: Partial<SyncStatus>) {
    this.currentStatus = { ...this.currentStatus, ...updates };
    if (this.statusCallback) {
      this.statusCallback(this.currentStatus);
    }
  }

  async checkConnection(): Promise<boolean> {
    try {
      console.log('Checking connection to:', this.apiClient.defaults.baseURL);
      const response = await this.apiClient.get('/api/health');
      console.log('Connection successful:', response.data);
      this.updateStatus({ isOnline: true });
      return true;
    } catch (error: any) {
      console.error('Connection failed:', error.message);
      console.error('Error details:', {
        code: error.code,
        response: error.response?.data,
        status: error.response?.status
      });
      this.updateStatus({ isOnline: false });
      return false;
    }
  }

  // Download initial data from server (TOP-DOWN sync)
  async downloadInitialData(): Promise<void> {
    console.log('Starting initial data download...');
    console.log('Server URL:', this.apiClient.defaults.baseURL);
    console.log('API Key:', this.apiClient.defaults.headers['X-API-Key']);
    console.log('Branch ID:', this.branchId);

    if (!this.branchId) {
      throw new Error('Branch ID not set. Please select a branch in Settings.');
    }

    this.updateStatus({ isSyncing: true });

    try {
      const response = await this.apiClient.get<InitialSyncData>('/api/sync/initial-data', {
        params: { branchId: this.branchId },
      });
      const { clients, patients, nomenclature } = response.data;

      console.log(`Downloaded: ${clients.length} clients, ${patients.length} patients, ${nomenclature.length} nomenclature items`);

      // Replace nomenclature completely (price list changes frequently)
      this.db.replaceAllNomenclature(nomenclature);

      // Save clients and patients to local database
      // Note: This replaces all local data. In production, implement smart merge logic.
      console.log('Saving clients to local database...');
      for (const client of clients) {
        try {
          this.db.createClient(client);
        } catch (error: any) {
          console.log(`Client ${client.id} may already exist, skipping...`);
        }
      }
      
      console.log('Saving patients to local database...');
      for (const patient of patients) {
        try {
          this.db.createPatient(patient);
        } catch (error: any) {
          console.log(`Patient ${patient.id} may already exist, skipping...`);
        }
      }

      this.updateStatus({
        lastSync: new Date().toISOString(),
        isSyncing: false,
      });

      console.log('Initial data download completed');
    } catch (error: any) {
      console.error('Failed to download initial data:', error.message);
      console.error('Error details:', {
        code: error.code,
        response: error.response?.data,
        status: error.response?.status,
        url: error.config?.url
      });
      this.updateStatus({ isSyncing: false });
      throw error;
    }
  }

  // Upload pending changes to server (BOTTOM-UP sync)
  async uploadPendingChanges(): Promise<void> {
    const pendingItems = this.db.getPendingSyncItems();
    
    if (pendingItems.length === 0) {
      console.log('No pending changes to upload');
      this.updateStatus({ pendingCount: 0 });
      return;
    }

    console.log(`Uploading ${pendingItems.length} pending changes...`);
    this.updateStatus({ isSyncing: true });

    try {
      const request: SyncUploadRequest = {
        actions: pendingItems.map(item => ({
          queue_id: item.id!,
          action_type: item.action_type,
          payload: item.payload,
        })),
      };

      const response = await this.apiClient.post<SyncUploadResponse>(
        '/api/sync/upload-changes',
        request
      );

      // Update sync queue based on server response
      for (const result of response.data.results) {
        if (result.status === 'success') {
          this.db.updateSyncItemStatus(result.queue_id, 'success');
          console.log(`✓ Synced queue item ${result.queue_id}`);
        } else {
          this.db.updateSyncItemStatus(result.queue_id, 'error', result.message);
          console.error(`✗ Failed to sync queue item ${result.queue_id}: ${result.message}`);
        }
      }

      const remainingCount = this.db.getPendingSyncCount();
      this.updateStatus({
        pendingCount: remainingCount,
        lastSync: new Date().toISOString(),
        isSyncing: false,
      });

      console.log(`Upload completed. ${remainingCount} items remaining`);
    } catch (error) {
      console.error('Failed to upload changes:', error);
      this.updateStatus({ isSyncing: false });
      throw error;
    }
  }

  // Start automatic sync (runs periodically)
  startAutoSync(intervalMs: number = 60000) {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    this.syncInterval = setInterval(async () => {
      const isOnline = await this.checkConnection();
      
      if (isOnline) {
        try {
          await this.uploadPendingChanges();
        } catch (error) {
          console.error('Auto-sync failed:', error);
        }
      }

      // Update pending count regardless of online status
      const pendingCount = this.db.getPendingSyncCount();
      this.updateStatus({ pendingCount });
    }, intervalMs);

    console.log(`Auto-sync started (interval: ${intervalMs}ms)`);
  }

  stopAutoSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
      console.log('Auto-sync stopped');
    }
  }

  async fullSync(): Promise<void> {
    const isOnline = await this.checkConnection();
    
    if (!isOnline) {
      throw new Error('Cannot sync: Server is offline');
    }

    // First, upload local changes
    await this.uploadPendingChanges();

    // Then, download fresh data
    await this.downloadInitialData();
  }

  getStatus(): SyncStatus {
    return { ...this.currentStatus };
  }
}
