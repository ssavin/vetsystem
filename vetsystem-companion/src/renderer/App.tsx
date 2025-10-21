import { useState, useEffect } from 'react';
import { Route, Switch, Router } from 'wouter';
import { useHashLocation } from 'wouter/use-hash-location';
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
    // Wait for API to be ready
    const checkApi = () => {
      if (window.api) {
        window.api.getSyncStatus().then(setSyncStatus).catch(console.error);
        window.api.onSyncStatusChange(setSyncStatus);
      } else {
        setTimeout(checkApi, 100);
      }
    };
    checkApi();
  }, []);

  return (
    <Router hook={useHashLocation}>
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
    </Router>
  );
}
