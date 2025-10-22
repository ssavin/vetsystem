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
import LoginPage from './pages/LoginPage';
import BranchSelectionPage from './pages/BranchSelectionPage';

export default function App() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [needsBranchSelection, setNeedsBranchSelection] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isOnline: false,
    pendingCount: 0,
    isSyncing: false,
  });

  useEffect(() => {
    // Check authentication status on mount
    const checkAuth = async () => {
      if (!window.api) {
        setTimeout(checkAuth, 100);
        return;
      }

      try {
        const user = await window.api.getCurrentUser();
        setCurrentUser(user);
        
        // Trigger initial data sync if user is already logged in
        if (user) {
          console.log('User already logged in, starting data sync...');
          await window.api.downloadInitialData();
          console.log('Data sync completed');
        }
      } catch (error) {
        console.error('Failed to check auth:', error);
      } finally {
        setIsCheckingAuth(false);
      }
    };

    checkAuth();
  }, []);

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
    
    // Listen for main process logs
    if (window.electron) {
      window.electron.ipcRenderer.on('main-log', (_event: any, message: string) => {
        console.log(`[MAIN PROCESS] ${message}`);
      });
    }
  }, []);

  const handleLoginSuccess = async () => {
    try {
      const user = await window.api.getCurrentUser();
      setCurrentUser(user);
      
      // Show branch selection instead of auto-syncing
      setNeedsBranchSelection(true);
    } catch (error) {
      console.error('Failed to get current user after login:', error);
    }
  };

  const handleBranchSelected = async (branchId: string, branchName: string) => {
    try {
      console.log('Branch selected:', branchId, branchName);
      
      // Update branch in settings
      await window.api.updateBranch(branchId, branchName);
      
      // Trigger initial data sync with selected branch
      console.log('Starting initial data sync...');
      await window.api.downloadInitialData();
      console.log('Initial data sync completed');
      
      // Hide branch selection screen
      setNeedsBranchSelection(false);
    } catch (error) {
      console.error('Failed to sync data after branch selection:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await window.api.logout();
      setCurrentUser(null);
    } catch (error) {
      console.error('Failed to logout:', error);
    }
  };

  // Show loading while checking auth
  if (isCheckingAuth) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        backgroundColor: 'var(--background)',
      }}>
        <div style={{ fontSize: '16px', color: 'var(--text-secondary)' }}>
          Загрузка...
        </div>
      </div>
    );
  }

  // Show login page if not authenticated
  if (!currentUser) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  // Show branch selection after login
  if (needsBranchSelection) {
    return <BranchSelectionPage onBranchSelected={handleBranchSelected} />;
  }

  // Show main app if authenticated
  return (
    <Router hook={useHashLocation}>
      <div style={{ display: 'flex', height: '100vh', flexDirection: 'column' }}>
        {/* Sync Status Bar */}
        <SyncStatusBar status={syncStatus} onLogout={handleLogout} currentUser={currentUser} />

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
