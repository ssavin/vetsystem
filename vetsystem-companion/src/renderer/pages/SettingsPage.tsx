import { useState } from 'react';

export default function SettingsPage() {
  const [serverUrl, setServerUrl] = useState('https://vetsystemai.ru');
  const [apiKey, setApiKey] = useState('companion-api-key-2025');

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
              URL сервера
            </label>
            <input
              type="url"
              className="input"
              value={serverUrl}
              onChange={(e) => setServerUrl(e.target.value)}
              placeholder="https://vetsystemai.ru"
            />
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Адрес основного сервера VetSystem
            </div>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>
              API ключ
            </label>
            <input
              type="password"
              className="input"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Ключ для авторизации запросов к серверу
            </div>
          </div>

          <button
            className="btn btn-primary"
            style={{ alignSelf: 'flex-start' }}
            onClick={() => {
              alert('Настройки сохранены (функция в разработке)');
            }}
          >
            Сохранить
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
