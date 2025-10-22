import { useState, useEffect } from 'react';

interface Branch {
  id: string;
  name: string;
  address?: string;
}

export default function SettingsPage() {
  const [serverUrl, setServerUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [branchId, setBranchId] = useState('');
  const [branchName, setBranchName] = useState('');
  const [branches, setBranches] = useState<Branch[]>([]);
  const [isLoadingBranches, setIsLoadingBranches] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');

  // Load settings on mount
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    if (!window.api) return;
    
    try {
      const settings = await window.api.getAllSettings();
      setServerUrl(settings.serverUrl || 'https://vetsystemai.ru');
      setApiKey(settings.apiKey || 'companion-api-key-2025');
      setBranchId(settings.branchId || '');
      setBranchName(settings.branchName || '');
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const loadBranches = async () => {
    if (!serverUrl || !apiKey) {
      setMessage('❌ Сначала укажите URL сервера и API ключ');
      return;
    }

    setIsLoadingBranches(true);
    setMessage('');
    
    try {
      // Use IPC to fetch branches through main process with current credentials
      const fetchedBranches = await window.api.fetchBranches(serverUrl, apiKey);
      setBranches(fetchedBranches || []);
      setMessage('✅ Филиалы загружены успешно');
    } catch (error: any) {
      console.error('Failed to load branches:', error);
      setMessage('❌ Ошибка загрузки филиалов: ' + (error.message || 'Неизвестная ошибка'));
    } finally {
      setIsLoadingBranches(false);
    }
  };

  const handleBranchSelect = (branch: Branch) => {
    setBranchId(branch.id);
    setBranchName(branch.name);
  };

  const handleSave = async () => {
    if (!serverUrl || !apiKey) {
      setMessage('❌ Заполните все обязательные поля');
      return;
    }

    if (!branchId) {
      setMessage('❌ Выберите филиал');
      return;
    }

    setIsSaving(true);
    setMessage('');

    try {
      // Update credentials (this will also update syncService's axios instance)
      await window.api.updateCredentials(serverUrl, apiKey);
      
      // Update branch (this will also update syncService.branchId)
      await window.api.updateBranch(branchId, branchName);
      
      setMessage('✅ Настройки сохранены. Изменения применены без перезапуска приложения.');
    } catch (error: any) {
      console.error('Failed to save settings:', error);
      setMessage('❌ Ошибка сохранения: ' + (error.message || 'Неизвестная ошибка'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div style={{ maxWidth: '800px' }}>
      <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '24px' }}>
        Настройки
      </h1>

      <div className="card">
        <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '20px' }}>
          Подключение к серверу
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>
              URL сервера *
            </label>
            <input
              type="url"
              className="input"
              value={serverUrl}
              onChange={(e) => setServerUrl(e.target.value)}
              placeholder="https://vetsystemai.ru"
              data-testid="input-server-url"
            />
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Адрес основного сервера VetSystem
            </div>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>
              API ключ *
            </label>
            <input
              type="password"
              className="input"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="companion-api-key-2025"
              data-testid="input-api-key"
            />
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Ключ для авторизации запросов к серверу
            </div>
          </div>

          <div>
            <button
              className="btn btn-secondary"
              onClick={loadBranches}
              disabled={isLoadingBranches || !serverUrl || !apiKey}
              data-testid="button-load-branches"
            >
              {isLoadingBranches ? 'Загрузка...' : 'Загрузить филиалы'}
            </button>
          </div>

          {branches.length > 0 && (
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>
                Выберите филиал *
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {branches.map((branch) => (
                  <label
                    key={branch.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '12px',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      backgroundColor: branchId === branch.id ? 'var(--primary-bg)' : 'transparent',
                    }}
                    data-testid={`branch-option-${branch.id}`}
                  >
                    <input
                      type="radio"
                      name="branch"
                      value={branch.id}
                      checked={branchId === branch.id}
                      onChange={() => handleBranchSelect(branch)}
                      style={{ marginRight: '12px' }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: '500' }}>{branch.name}</div>
                      {branch.address && (
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                          {branch.address}
                        </div>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {message && (
            <div
              style={{
                padding: '12px',
                borderRadius: '8px',
                fontSize: '14px',
                backgroundColor: message.startsWith('✅') ? '#d4edda' : message.startsWith('❌') ? '#f8d7da' : '#d1ecf1',
                color: message.startsWith('✅') ? '#155724' : message.startsWith('❌') ? '#721c24' : '#0c5460',
              }}
              data-testid="text-message"
            >
              {message}
            </div>
          )}

          <button
            className="btn btn-primary"
            style={{ alignSelf: 'flex-start' }}
            onClick={handleSave}
            disabled={isSaving || !serverUrl || !apiKey || !branchId}
            data-testid="button-save-settings"
          >
            {isSaving ? 'Сохранение...' : 'Сохранить'}
          </button>
        </div>
      </div>

      <div className="card" style={{ marginTop: '20px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '20px' }}>
          О программе
        </h2>

        <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
          <p style={{ marginBottom: '8px' }}>
            <strong>VetSystem Companion</strong> — десктопное приложение для работы в офлайн-режиме
          </p>
          <p style={{ marginBottom: '8px' }}>Версия: 1.0.0</p>
          <p>© 2025 VetSystem</p>
        </div>
      </div>
    </div>
  );
}
