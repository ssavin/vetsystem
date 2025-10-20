import { useState, useEffect } from 'react';
import { Route, Switch } from 'wouter';
import type { SyncStatus } from '@shared/types';
import SyncStatusBar from './components/SyncStatusBar';
import Sidebar from './components/Sidebar';
import ClientsPage from './pages/ClientsPage';
import AppointmentsPage from './pages/AppointmentsPage';
import InvoicesPage from './pages/InvoicesPage';
import SettingsPage from './pages/SettingsPage';

export default function App() {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isOnline: false,
    pendingCount: 0,
    isSyncing: false,
  });

  useEffect(() => {
    // Get initial status
    window.api.getSyncStatus().then(setSyncStatus);

    // Subscribe to status updates
    window.api.onSyncStatusChange(setSyncStatus);
  }, []);

  return (
    <div style={{ display: 'flex', height: '100vh', flexDirection: 'column' }}>
      {/* Sync Status Bar */}
      <SyncStatusBar status={syncStatus} />

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Sidebar Navigation */}
        <Sidebar />

        {/* Main Content Area */}
        <main style={{ flex: 1, overflow: 'auto', padding: '20px' }}>
          <Switch>
            <Route path="/" component={ClientsPage} />
            <Route path="/clients" component={ClientsPage} />
            <Route path="/appointments" component={AppointmentsPage} />
            <Route path="/invoices" component={InvoicesPage} />
            <Route path="/settings" component={SettingsPage} />
            <Route>
              <div>404 - Страница не найдена</div>
            </Route>
          </Switch>
        </main>
      </div>
    </div>
  );
}
