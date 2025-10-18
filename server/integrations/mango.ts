import crypto from 'crypto';

/**
 * Mango Office API Integration
 * 
 * Документация: https://www.mango-office.ru/upload/api/MangoOffice_VPBX_API_v1.9.pdf
 * 
 * Основные возможности:
 * - Получение истории звонков
 * - Webhooks для событий звонков в реальном времени
 * - Получение ссылок на записи разговоров
 */

interface MangoCredentials {
  apiKey: string;   // vpbx_api_key из кабинета
  apiToken: string; // vpbx_api_salt для подписи запросов (используется как apiToken для совместимости)
}

/**
 * Проверяет подпись webhook от Mango Office
 */
export function verifyMangoSignature(
  json: string,
  sign: string,
  apiSalt: string
): boolean {
  const hash = crypto
    .createHash('sha256')
    .update(apiSalt + json)
    .digest('hex');
  return hash === sign;
}

/**
 * Генерирует подпись для запроса к API Mango Office
 */
export function generateMangoSignature(
  apiKey: string,
  json: string,
  apiSalt: string
): string {
  return crypto
    .createHash('sha256')
    .update(apiKey + json + apiSalt)
    .digest('hex');
}

/**
 * Типы событий звонков от Mango
 */
export interface MangoCallEvent {
  entry_id: string;          // ID звонка
  call_id: string;           // Уникальный ID звонка
  from: {
    extension: string;       // Номер/extension
    number: string;          // Полный номер
  };
  to: {
    extension: string;
    number: string;
  };
  start: number;             // Timestamp начала (Unix)
  answer: number | null;     // Timestamp ответа
  finish: number | null;     // Timestamp окончания
  direction: 'inbound' | 'outbound'; // Направление звонка
  disconnect_reason: 'cancel' | 'busy' | 'no_answer' | 'normal' | 'failed';
  line_number: string;       // Линия
  location: string;          // Местоположение
  create: number;            // Timestamp создания события
}

/**
 * Событие summary (завершение звонка)
 */
export interface MangoSummaryEvent {
  entry_id: string;
  call_id: string;
  seq: number;
  from: { extension: string; number: string };
  to: { extension: string; number: string };
  start: number;
  answer: number | null;
  finish: number;
  direction: 'inbound' | 'outbound';
  disconnect_reason: string;
  duration: number;          // Длительность в секундах
  talk_duration: number;     // Длительность разговора
  recording_id: string;      // ID записи разговора (если есть)
}

/**
 * Событие recording (запись готова)
 */
export interface MangoRecordingEvent {
  entry_id: string;
  call_id: string;
  recording_id: string;
  start: number;
  finish: number;
  duration: number;
  link: string;              // Ссылка на скачивание записи
}

/**
 * Преобразует событие Mango в формат для БД
 */
export function parseMangoCallEvent(event: MangoCallEvent | MangoSummaryEvent) {
  const direction = event.direction === 'inbound' ? 'inbound' : 'outbound';
  
  // Определяем статус звонка
  let status: 'answered' | 'missed' | 'busy' | 'failed' | 'no_answer' = 'missed';
  
  if ('disconnect_reason' in event) {
    switch (event.disconnect_reason) {
      case 'normal':
        status = 'answered';
        break;
      case 'busy':
        status = 'busy';
        break;
      case 'no_answer':
      case 'cancel':
        status = 'no_answer';
        break;
      case 'failed':
        status = 'failed';
        break;
    }
  }
  
  return {
    externalCallId: event.call_id,
    direction,
    status,
    fromNumber: event.from.number,
    toNumber: event.to.number,
    startedAt: new Date(event.start * 1000),
    answeredAt: event.answer ? new Date(event.answer * 1000) : null,
    endedAt: 'finish' in event && event.finish ? new Date(event.finish * 1000) : null,
    duration: 'talk_duration' in event ? event.talk_duration : 0,
    metadata: event
  };
}

/**
 * Получает историю звонков через API Mango Office
 */
export async function getMangoCallHistory(
  credentials: MangoCredentials,
  params: {
    from: Date;
    to: Date;
    fields?: string;
  }
): Promise<any> {
  const requestData = {
    from: Math.floor(params.from.getTime() / 1000),
    to: Math.floor(params.to.getTime() / 1000),
    fields: params.fields || 'start,finish,from_number,to_number,disconnect_reason,line_number,location'
  };
  
  const json = JSON.stringify(requestData);
  const sign = generateMangoSignature(credentials.apiKey, json, credentials.apiToken);
  
  const response = await fetch('https://app.mango-office.ru/vpbx/stats/calls', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      vpbx_api_key: credentials.apiKey,
      json,
      sign
    })
  });
  
  if (!response.ok) {
    throw new Error(`Mango API error: HTTP ${response.status}`);
  }
  
  return await response.json();
}

/**
 * Получает ссылку на запись разговора
 */
export async function getMangoRecordingLink(
  credentials: MangoCredentials,
  recordingId: string
): Promise<string> {
  const requestData = {
    recording_id: recordingId
  };
  
  const json = JSON.stringify(requestData);
  const sign = generateMangoSignature(credentials.apiKey, json, credentials.apiToken);
  
  const response = await fetch('https://app.mango-office.ru/vpbx/queries/recording/link', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      vpbx_api_key: credentials.apiKey,
      json,
      sign
    })
  });
  
  if (!response.ok) {
    throw new Error(`Mango API error: HTTP ${response.status}`);
  }
  
  const data = await response.json();
  return data.recording_link;
}

/**
 * Тест подключения к Mango Office API
 */
export async function testMangoConnection(credentials: MangoCredentials): Promise<{ success: boolean; message: string }> {
  try {
    if (!credentials.apiKey || !credentials.apiToken) {
      return {
        success: false,
        message: 'Требуются API Key и API Salt (VPN Key)'
      };
    }
    
    // Простой запрос для проверки credentials
    // Запрашиваем историю за последний час
    const now = new Date();
    const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    
    const requestData = {
      from: Math.floor(hourAgo.getTime() / 1000),
      to: Math.floor(now.getTime() / 1000),
      fields: 'start'
    };
    
    const json = JSON.stringify(requestData);
    const sign = generateMangoSignature(
      credentials.apiKey, 
      json, 
      credentials.apiToken // apiToken используется как apiSalt
    );
    
    const response = await fetch('https://app.mango-office.ru/vpbx/stats/calls', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        vpbx_api_key: credentials.apiKey,
        json,
        sign
      })
    });
    
    if (response.ok) {
      return {
        success: true,
        message: 'Подключение к Mango Office установлено успешно'
      };
    } else if (response.status === 401 || response.status === 403) {
      return {
        success: false,
        message: 'Неверный API Key или API Salt. Проверьте данные в Кабинете Mango Office'
      };
    } else {
      const errorText = await response.text().catch(() => '');
      return {
        success: false,
        message: `Ошибка подключения: HTTP ${response.status}${errorText ? ` - ${errorText}` : ''}`
      };
    }
  } catch (error: any) {
    return {
      success: false,
      message: `Не удалось подключиться к Mango Office: ${error.message}`
    };
  }
}

/**
 * Обрабатывает webhook от Mango Office и создает запись в БД
 */
export async function processCallWebhook(payload: any, storage: any) {
  try {
    console.log('Processing Mango webhook:', payload);

    // Определяем тип события
    if (!payload.call_id) {
      console.warn('Invalid Mango webhook: missing call_id');
      return null;
    }

    // Парсим данные звонка
    const callData = parseMangoCallEvent(payload);
    
    // Определяем номер клиента (для входящих - from, для исходящих - to)
    const customerPhone = callData.direction === 'inbound' 
      ? callData.fromNumber 
      : callData.toNumber;
    
    // Ищем владельца по номеру телефона
    const owner = await storage.findOwnerByPhone(customerPhone);
    
    // Создаем запись в call_logs
    const callLog = await storage.createCallLog({
      id: crypto.randomUUID(),
      tenantId: payload.tenant_id || '', // Should be extracted from webhook context
      branchId: payload.branch_id || '', // Should be extracted from webhook context
      externalCallId: callData.externalCallId,
      direction: callData.direction,
      status: callData.status,
      fromNumber: callData.fromNumber,
      toNumber: callData.toNumber,
      ownerId: owner?.id || null,
      userId: null, // Will be updated when operator is identified
      startedAt: callData.startedAt,
      answeredAt: callData.answeredAt,
      endedAt: callData.endedAt,
      duration: callData.duration,
      recordingUrl: null, // Will be updated when recording is available
      metadata: callData.metadata
    });

    // Возвращаем данные для WebSocket уведомления
    return {
      callLog,
      owner: owner ? {
        id: owner.id,
        name: owner.name,
        phone: owner.phone
      } : null,
      shouldNotify: callData.direction === 'inbound' && !callData.endedAt, // Уведомляем только о входящих звонках
      extension: payload.to?.extension || null // Номер оператора для маршрутизации уведомления
    };
  } catch (error) {
    console.error('Error processing Mango webhook:', error);
    throw error;
  }
}
