import type { SyncStatus } from '@shared/types';

interface Props {
  status: SyncStatus;
  onLogout: () => void;
  currentUser: any;
}

export default function SyncStatusBar({ status, onLogout, currentUser }: Props) {
  const isElectron = !!(window.api && window.electron);
  
  const handleSync = async () => {
    try {
      await window.api.fullSync();
    } catch (error) {
      console.error('Sync failed:', error);
      alert('Ошибка синхронизации. Проверьте подключение к серверу.');
    }
  };

  const getStatusColor = () => {
    if (status.isSyncing) return '#FF9800'; // Orange
    if (!status.isOnline) return '#F44336'; // Red
    if (status.pendingCount > 0) return '#FF9800'; // Orange
    return '#4CAF50'; // Green
  };

  const getStatusText = () => {
    if (status.isSyncing) return 'Синхронизация...';
    if (!status.isOnline) return 'Офлайн режим';
    if (status.pendingCount > 0) return `Ожидает синхронизации: ${status.pendingCount}`;
    return 'Все данные синхронизированы';
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 20px',
        background: '#1976D2',
        color: 'white',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <h1 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0 }}>
          VetSystem Companion
        </h1>
        {!isElectron && (
          <span style={{
            fontSize: '12px',
            background: '#FF5722',
            padding: '4px 8px',
            borderRadius: '4px',
            fontWeight: 'bold',
          }}>
            ⚠️ WEB MODE (НЕ ELECTRON!)
          </span>
        )}
        {currentUser && (
          <div style={{
            fontSize: '14px',
            opacity: 0.9,
            borderLeft: '1px solid rgba(255,255,255,0.3)',
            paddingLeft: '12px',
          }}>
            {currentUser.fullName || currentUser.username}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {/* Status Indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              backgroundColor: getStatusColor(),
              boxShadow: `0 0 8px ${getStatusColor()}`,
            }}
          />
          <span style={{ fontSize: '14px' }}>{getStatusText()}</span>
        </div>

        {status.lastSync && (
          <span style={{ fontSize: '12px', opacity: 0.9 }}>
            Посл. синхр.: {new Date(status.lastSync).toLocaleTimeString('ru-RU')}
          </span>
        )}

        <button
          onClick={handleSync}
          disabled={status.isSyncing}
          className="btn"
          style={{
            background: 'rgba(255,255,255,0.2)',
            color: 'white',
            border: '1px solid rgba(255,255,255,0.3)',
            padding: '6px 16px',
            fontSize: '13px',
          }}
          data-testid="button-sync"
        >
          {status.isSyncing ? (
            <>
              <span className="spinner" style={{ marginRight: '8px' }} />
              Синхронизация...
            </>
          ) : (
            '↻ Синхронизировать'
          )}
        </button>

        <button
          onClick={onLogout}
          className="btn"
          style={{
            background: 'rgba(255,255,255,0.1)',
            color: 'white',
            border: '1px solid rgba(255,255,255,0.3)',
            padding: '6px 16px',
            fontSize: '13px',
          }}
          data-testid="button-logout"
        >
          Выйти
        </button>
      </div>
    </div>
  );
}
