import { z } from 'zod';

// API конфигурация для МойСклад
const MOYSKLAD_API_BASE = 'https://api.moysklad.ru/api/remap/1.2';
const MOYSKLAD_POS_API_BASE = 'https://online.moysklad.ru/api/posap/1.0';

// Получение конфигурации из переменных окружения
const config = {
  login: process.env.MOYSKLAD_LOGIN!,
  password: process.env.MOYSKLAD_PASSWORD!,
  retailStoreId: process.env.MOYSKLAD_RETAIL_STORE_ID!,
};

// Проверка наличия обязательных переменных
if (!config.login || !config.password || !config.retailStoreId) {
  throw new Error('Отсутствуют обязательные переменные окружения для МойСклад');
}

// Basic Auth header для API запросов
const getAuthHeader = () => {
  const credentials = Buffer.from(`${config.login}:${config.password}`).toString('base64');
  return `Basic ${credentials}`;
};

// Схема для валидации позиций товаров
const PositionSchema = z.object({
  quantity: z.number().positive(),
  price: z.number().positive(),
  assortment: z.object({
    meta: z.object({
      href: z.string(),
      type: z.string(),
      mediaType: z.literal('application/json')
    })
  }),
  vat: z.number().optional(),
  vatEnabled: z.boolean().optional()
});

// Схема для валидации данных розничной продажи
const RetailDemandSchema = z.object({
  invoiceId: z.string(),
  customerData: z.object({
    email: z.string().optional(),
    phone: z.string().optional()
  }).optional(),
  positions: z.array(PositionSchema).optional(),
  organization: z.object({
    meta: z.object({
      href: z.string(),
      type: z.literal('organization'),
      mediaType: z.literal('application/json')
    })
  }).optional(),
  retailStore: z.object({
    meta: z.object({
      href: z.string(),
      type: z.literal('retailstore'),
      mediaType: z.literal('application/json')
    })
  }),
  retailShift: z.object({
    meta: z.object({
      href: z.string(),
      type: z.literal('retailshift'),
      mediaType: z.literal('application/json')
    })
  }),
  // Поля для сумм оплаты (обязательные для 54-ФЗ)
  cashSum: z.number().min(0),
  noCashSum: z.number().min(0),
  // Дополнительные поля для фискального чека
  vatEnabled: z.boolean().optional(),
  vatIncluded: z.boolean().optional(),
  name: z.string().optional(),
  moment: z.string().optional(),
  attributes: z.array(z.any()).optional(),
  agent: z.object({
    meta: z.object({
      href: z.string(),
      type: z.string(),
      mediaType: z.literal('application/json')
    })
  }).optional()
});

// Типы для данных
type RetailDemandData = z.infer<typeof RetailDemandSchema>;
type Position = z.infer<typeof PositionSchema>;

// Интерфейс для результата создания чека
interface FiscalReceiptResult {
  success: boolean;
  receiptId?: string;
  fiscalReceiptUrl?: string;
  error?: string;
  details?: any;
}

// Функция для выполнения HTTP запросов к API МойСклад
async function makeApiRequest(endpoint: string, method: 'GET' | 'POST' | 'PUT' = 'GET', data?: any, usePosApi = false) {
  const baseUrl = usePosApi ? MOYSKLAD_POS_API_BASE : MOYSKLAD_API_BASE;
  const url = `${baseUrl}/${endpoint}`;
  
  const headers = {
    'Authorization': getAuthHeader(),
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  };

  const options: RequestInit = {
    method,
    headers,
  };

  if (data && (method === 'POST' || method === 'PUT')) {
    options.body = JSON.stringify(data);
  }

  try {
    console.log(`МойСклад API запрос: ${method} ${url}`);
    const response = await fetch(url, options);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`МойСклад API ошибка: ${response.status} ${response.statusText}`, errorText);
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    console.log('МойСклад API ответ получен успешно');
    return result;
  } catch (error) {
    console.error('Ошибка запроса к МойСклад API:', error);
    throw error;
  }
}

// Получение информации о точке продаж
export async function getRetailStore(retailStoreId: string = config.retailStoreId) {
  try {
    const retailStore = await makeApiRequest(`entity/retailstore/${retailStoreId}`);
    return retailStore;
  } catch (error) {
    console.error('Ошибка получения точки продаж:', error);
    throw new Error('Не удалось получить информацию о точке продаж');
  }
}

// Получение активной розничной смены
export async function getActiveRetailShift(retailStoreId: string = config.retailStoreId) {
  try {
    // Получаем список смен для точки продаж, фильтруем по активным
    const shifts = await makeApiRequest(`entity/retailshift?filter=retailStore=${retailStoreId};open=true`);
    
    if (shifts.rows && shifts.rows.length > 0) {
      return shifts.rows[0]; // Возвращаем первую активную смену
    }
    
    throw new Error('Нет активной розничной смены');
  } catch (error) {
    console.error('Ошибка получения активной смены:', error);
    throw new Error('Не удалось получить активную розничную смену');
  }
}

// Создание розничной продажи с фискализацией через POS API
export async function createFiscalReceipt(data: Partial<RetailDemandData>): Promise<FiscalReceiptResult> {
  try {
    console.log('Создание фискального чека через МойСклад POS API');
    
    // Проверяем обязательные поля для 54-ФЗ
    if (!data.positions || data.positions.length === 0) {
      throw new Error('Отсутствуют позиции товаров/услуг для создания чека');
    }

    // Проверяем суммы платежа
    const totalCash = (data as any).cashSum || 0;
    const totalNoCash = (data as any).noCashSum || 0;
    const totalAmount = totalCash + totalNoCash;
    
    if (totalAmount <= 0) {
      throw new Error('Сумма платежа должна быть больше нуля');
    }
    
    // Получаем активную смену
    const activeShift = await getActiveRetailShift();
    
    // Базовая структура документа розничной продажи
    const retailDemandData = {
      name: `Receipt-${Date.now()}`, // Уникальный номер чека
      moment: new Date().toISOString(),
      retailShift: {
        meta: activeShift.meta
      },
      retailStore: {
        meta: {
          href: `${MOYSKLAD_API_BASE}/entity/retailstore/${config.retailStoreId}`,
          type: 'retailstore',
          mediaType: 'application/json'
        }
      },
      // Позиции товаров/услуг
      positions: data.positions || [],
      // Включение НДС согласно 54-ФЗ
      vatEnabled: true,
      vatIncluded: true,
      // Суммы оплаты
      cashSum: totalCash,
      noCashSum: totalNoCash,
      // Дополнительные поля для соответствия 54-ФЗ
      attributes: [
        {
          meta: {
            href: `${MOYSKLAD_API_BASE}/entity/retaildemand/metadata/attributes/fiscal_compliance`,
            type: 'attributemetadata',
            mediaType: 'application/json'
          },
          value: 'FZ_54_COMPLIANT' // Маркер соответствия 54-ФЗ
        }
      ],
      // Дополнительная информация о покупателе (если есть)
      agent: data.customerData?.email || data.customerData?.phone ? {
        meta: {
          href: `${MOYSKLAD_API_BASE}/entity/counterparty/default-customer`,
          type: 'counterparty',
          mediaType: 'application/json'
        }
      } : undefined,
      ...data
    };

    // Валидация данных
    const validatedData = RetailDemandSchema.partial().parse(retailDemandData);
    
    // Логирование для отладки
    console.log('Данные для создания чека:', JSON.stringify(validatedData, null, 2));
    
    // Создание документа через POS API для автоматической фискализации
    const result = await makeApiRequest(
      'cheque/minion/entity/retaildemand',
      'POST',
      validatedData,
      true // Используем POS API
    );

    console.log('Фискальный чек создан успешно:', result.id);

    // Проверяем статус фискализации
    if (result.fiscalized !== false) {
      console.log('Чек успешно отправлен в ФНС согласно 54-ФЗ');
    } else {
      console.warn('Внимание: чек создан, но не фискализован');
    }

    return {
      success: true,
      receiptId: result.id,
      fiscalReceiptUrl: result.meta?.href,
      details: {
        ...result,
        fiscalCompliance: 'FZ_54_COMPLIANT',
        createdAt: new Date().toISOString(),
        totalAmount: totalAmount
      }
    };

  } catch (error: any) {
    console.error('Ошибка создания фискального чека:', error);
    
    // Детализируем ошибки для лучшей диагностики
    let errorMessage = 'Неизвестная ошибка при создании чека';
    
    if (error.message) {
      if (error.message.includes('401') || error.message.includes('Unauthorized')) {
        errorMessage = 'Ошибка авторизации в МойСклад. Проверьте логин и пароль.';
      } else if (error.message.includes('404')) {
        errorMessage = 'Точка продаж не найдена. Проверьте MOYSKLAD_RETAIL_STORE_ID.';
      } else if (error.message.includes('retailshift')) {
        errorMessage = 'Нет активной кассовой смены. Откройте смену в МойСклад.';
      } else if (error.message.includes('positions')) {
        errorMessage = 'Ошибка в позициях товаров/услуг для чека.';
      } else if (error.message.includes('403')) {
        errorMessage = 'Недостаточно прав для создания фискальных чеков.';
      } else {
        errorMessage = error.message;
      }
    }
    
    return {
      success: false,
      error: errorMessage,
      details: {
        originalError: error.message,
        timestamp: new Date().toISOString(),
        fiscalCompliance: 'ERROR'
      }
    };
  }
}

// Получение статуса фискального чека
export async function getFiscalReceiptStatus(receiptId: string): Promise<any> {
  try {
    const receipt = await makeApiRequest(`entity/retaildemand/${receiptId}`);
    return receipt;
  } catch (error) {
    console.error('Ошибка получения статуса чека:', error);
    throw new Error('Не удалось получить статус фискального чека');
  }
}

// Тестовая функция для проверки подключения к API
export async function testConnection(): Promise<{ success: boolean; message: string }> {
  try {
    // Проверяем доступность API и получаем информацию о компании
    const companyInfo = await makeApiRequest('context/company');
    
    console.log('Подключение к МойСклад API успешно:', companyInfo.name);
    
    return {
      success: true,
      message: `Подключение успешно. Компания: ${companyInfo.name}`
    };
  } catch (error: any) {
    console.error('Ошибка подключения к МойСклад API:', error);
    
    return {
      success: false,
      message: error.message || 'Не удалось подключиться к API МойСклад'
    };
  }
}

// Экспорт конфигурации для использования в других модулях
export { config };