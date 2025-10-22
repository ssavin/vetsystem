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

  constructor(db: DatabaseManager, serverUrl: string, apiKey: string, branchId?: string) {
    this.db = db;
    this.branchId = branchId || '';
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

  setStatusCallback(callback: (status: SyncStatus) => void) {
    this.statusCallback = callback;
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

      // TODO: Merge clients and patients (don't overwrite local changes)
      // For now, we'll skip clients/patients sync to avoid data loss
      // In production, implement smart merge logic

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
