import { useState, useEffect } from "react";

export default function PrinterSettingsPage() {
  const [printerModel, setPrinterModel] = useState<string>("");
  const [printerPort, setPrinterPort] = useState<string>("");
  const [availablePorts, setAvailablePorts] = useState<Array<{ device: string; description: string }>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [loadingPorts, setLoadingPorts] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Load settings on mount
  useEffect(() => {
    loadSettings();
    loadComPorts();
  }, []);

  const loadSettings = async () => {
    try {
      const model = await window.api.getSetting('printerModel');
      const port = await window.api.getSetting('printerPort');
      if (model) setPrinterModel(model);
      if (port) setPrinterPort(port);
    } catch (error) {
      console.error('Error loading printer settings:', error);
    }
  };

  const loadComPorts = async () => {
    setLoadingPorts(true);
    try {
      const result = await window.api.listComPorts();
      if (result.success && result.ports) {
        setAvailablePorts(result.ports);
      } else {
        setMessage({ type: 'error', text: result.message || "Не удалось загрузить список портов" });
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || "Не удалось загрузить список портов" });
    } finally {
      setLoadingPorts(false);
    }
  };

  const handleSave = async () => {
    if (!printerModel) {
      setMessage({ type: 'error', text: "Выберите модель принтера" });
      return;
    }

    if (!printerPort) {
      setMessage({ type: 'error', text: "Выберите COM-порт" });
      return;
    }

    setIsLoading(true);
    try {
      await window.api.setSetting('printerModel', printerModel);
      await window.api.setSetting('printerPort', printerPort);
      
      setMessage({ type: 'success', text: "Настройки принтера сохранены" });
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || "Не удалось сохранить настройки" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTest = async () => {
    if (!printerPort) {
      setMessage({ type: 'error', text: "Выберите COM-порт для тестирования" });
      return;
    }

    setIsTesting(true);
    setMessage(null);
    try {
      const result = await window.api.testPrinterConnection(printerPort);
      
      if (result.success) {
        setMessage({ type: 'success', text: result.message || "Порт доступен" });
      } else {
        setMessage({ type: 'error', text: result.message || "Не удалось подключиться к принтеру" });
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || "Ошибка тестирования подключения" });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div style={{ maxWidth: '900px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '8px' }}>
          Настройки фискального принтера
        </h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          Настройте прямую печать чеков на фискальный принтер через COM-порт
        </p>
      </div>

      {/* Message */}
      {message && (
        <div style={{
          padding: '12px 16px',
          marginBottom: '20px',
          borderRadius: '6px',
          background: message.type === 'success' ? '#E8F5E9' : '#FFEBEE',
          color: message.type === 'success' ? '#2E7D32' : '#C62828',
          border: `1px solid ${message.type === 'success' ? '#81C784' : '#E57373'}`
        }}>
          {message.text}
        </div>
      )}

      {/* Configuration Card */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div style={{ marginBottom: '24px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            🖨️ Конфигурация принтера
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
            Выберите модель принтера и COM-порт для печати фискальных чеков
          </p>
        </div>

        {/* Модель принтера */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>
            Модель принтера
          </label>
          <select
            className="input"
            value={printerModel}
            onChange={(e) => setPrinterModel(e.target.value)}
            data-testid="select-printer-model"
            style={{ width: '100%' }}
          >
            <option value="">Выберите модель принтера</option>
            <option value="vikiprint">Vikiprint 57</option>
            <option value="atol">ATOL 30F</option>
          </select>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Поддерживаемые модели: Vikiprint 57, ATOL 30F
          </p>
        </div>

        {/* COM-порт */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <label style={{ fontSize: '14px', fontWeight: '500' }}>
              COM-порт
            </label>
            <button
              className="btn btn-sm"
              onClick={loadComPorts}
              disabled={loadingPorts}
              data-testid="button-refresh-ports"
              style={{
                padding: '4px 12px',
                fontSize: '13px',
                background: 'transparent',
                border: '1px solid var(--border)',
              }}
            >
              {loadingPorts ? '⏳ Загрузка...' : '🔄 Обновить'}
            </button>
          </div>
          <select
            className="input"
            value={printerPort}
            onChange={(e) => setPrinterPort(e.target.value)}
            disabled={loadingPorts}
            data-testid="select-com-port"
            style={{ width: '100%' }}
          >
            <option value="">{loadingPorts ? "Загрузка портов..." : "Выберите COM-порт"}</option>
            {availablePorts.length === 0 && !loadingPorts && (
              <option value="" disabled>Порты не найдены</option>
            )}
            {availablePorts.map(port => (
              <option key={port.device} value={port.device}>
                {port.device} - {port.description}
              </option>
            ))}
          </select>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Порт, к которому подключен принтер (например, COM3)
          </p>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={isLoading || !printerModel || !printerPort}
            data-testid="button-save-printer-settings"
          >
            {isLoading ? '⏳ Сохранение...' : '✓ Сохранить настройки'}
          </button>

          <button
            className="btn"
            onClick={handleTest}
            disabled={isTesting || !printerPort}
            data-testid="button-test-printer"
            style={{
              background: 'transparent',
              border: '1px solid var(--border)',
            }}
          >
            {isTesting ? '⏳ Тестирование...' : 'Проверить подключение'}
          </button>
        </div>
      </div>

      {/* Instructions Card */}
      <div className="card">
        <div style={{ marginBottom: '16px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '600' }}>Инструкция по подключению</h2>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <h3 style={{ fontWeight: '600', marginBottom: '6px' }}>1. Подключите принтер</h3>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
              Подключите фискальный принтер к компьютеру через USB. Принтер будет определен как виртуальный COM-порт.
            </p>
          </div>

          <div>
            <h3 style={{ fontWeight: '600', marginBottom: '6px' }}>2. Установите драйверы (если необходимо)</h3>
            <ul style={{ fontSize: '14px', color: 'var(--text-secondary)', paddingLeft: '20px' }}>
              <li><strong>Vikiprint 57:</strong> Драйвер VikiDriver с сайта Dreamkas</li>
              <li><strong>ATOL 30F:</strong> Драйвер ATOL KKT (8.x/9.x/10.x)</li>
            </ul>
          </div>

          <div>
            <h3 style={{ fontWeight: '600', marginBottom: '6px' }}>3. Найдите COM-порт</h3>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
              Откройте Диспетчер устройств Windows → Порты (COM и LPT) → найдите ваш принтер и запомните номер порта.
            </p>
          </div>

          <div>
            <h3 style={{ fontWeight: '600', marginBottom: '6px' }}>4. Настройте в Companion</h3>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
              Выберите модель принтера, выберите COM-порт, нажмите "Проверить подключение", затем "Сохранить настройки".
            </p>
          </div>

          <div style={{
            background: '#FFF3E0',
            border: '1px solid #FFB74D',
            borderRadius: '6px',
            padding: '12px'
          }}>
            <p style={{ fontSize: '14px' }}>
              <strong>⚠️ Важно:</strong> Текущая реализация использует базовую печать текстовых чеков.
              Для полной фискальной функциональности (с фискальной памятью и ОФД) требуются официальные драйверы и фискализация принтера.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
