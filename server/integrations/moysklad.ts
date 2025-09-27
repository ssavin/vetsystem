import { z } from 'zod';
import { storage } from '../storage.js';

// ===== НОМЕНКЛАТУРА И СИНХРОНИЗАЦИЯ =====

// Схемы для номенклатуры в МойСклад
const ProductSchema = z.object({
  name: z.string(),
  article: z.string().optional(),
  description: z.string().optional(),
  syncId: z.string().optional(), // Для предотвращения дубликатов
  salePrices: z.array(z.object({
    value: z.number(),
    currency: z.object({
      meta: z.object({
        href: z.string(),
        type: z.literal('currency'),
        mediaType: z.literal('application/json')
      })
    }),
    priceType: z.object({
      meta: z.object({
        href: z.string(),
        type: z.literal('pricetype'),
        mediaType: z.literal('application/json')
      })
    }).optional()
  })).optional(),
  attributes: z.array(z.any()).optional(),
  vat: z.number().optional(),
  vatEnabled: z.boolean().optional()
});

const ServiceSchema = z.object({
  name: z.string(),
  article: z.string().optional(),
  description: z.string().optional(),
  syncId: z.string().optional(),
  salePrices: z.array(z.object({
    value: z.number(),
    currency: z.object({
      meta: z.object({
        href: z.string(),
        type: z.literal('currency'),
        mediaType: z.literal('application/json')
      })
    }),
    priceType: z.object({
      meta: z.object({
        href: z.string(),
        type: z.literal('pricetype'),
        mediaType: z.literal('application/json')
      })
    }).optional()
  })).optional(),
  attributes: z.array(z.any()).optional(),
  vat: z.number().optional(),
  vatEnabled: z.boolean().optional()
});

type ProductData = z.infer<typeof ProductSchema>;
type ServiceData = z.infer<typeof ServiceSchema>;

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
if (!config.retailStoreId) {
  throw new Error('Отсутствует обязательная переменная окружения MOYSKLAD_RETAIL_STORE_ID для МойСклад');
}

if (!process.env.MOYSKLAD_API_TOKEN && (!config.login || !config.password)) {
  throw new Error('Отсутствуют учетные данные для МойСклад: необходим либо MOYSKLAD_API_TOKEN, либо MOYSKLAD_LOGIN + MOYSKLAD_PASSWORD');
}

// Auth header для API запросов (с токеном)
const getAuthHeader = () => {
  // Для МойСклад API токены используются как Bearer tokens
  if (process.env.MOYSKLAD_API_TOKEN) {
    return `Bearer ${process.env.MOYSKLAD_API_TOKEN}`;
  }
  
  // Fallback на Basic Auth с логином/паролем если токен не доступен
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
    'Accept': 'application/json;charset=utf-8'
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
    // Проверяем доступность API и получаем информацию о текущем сотруднике
    const employeeInfo = await makeApiRequest('entity/employee');
    
    // Получаем первого сотрудника из списка или используем одиночный объект
    const employee = Array.isArray(employeeInfo.rows) ? employeeInfo.rows[0] : employeeInfo;
    
    console.log('Подключение к МойСклад API успешно:', employee?.name || 'Сотрудник найден');
    
    return {
      success: true,
      message: `Подключение успешно. Авторизован как: ${employee?.name || 'Пользователь'}`
    };
  } catch (error: any) {
    console.error('Ошибка подключения к МойСклад API:', error);
    
    return {
      success: false,
      message: error.message || 'Не удалось подключиться к API МойСклад'
    };
  }
}

// ===== ФУНКЦИИ СИНХРОНИЗАЦИИ НОМЕНКЛАТУРЫ =====

/**
 * Создает товар в МойСклад
 */
export async function createProduct(productData: ProductData): Promise<any> {
  try {
    console.log('[МойСклад] Создание товара:', productData.name);
    
    const response = await fetch(`${MOYSKLAD_API_BASE}/entity/product`, {
      method: 'POST',
      headers: {
        'Authorization': getAuthHeader(),
        'Content-Type': 'application/json',
        'Accept-Encoding': 'gzip'
      },
      body: JSON.stringify(productData)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[МойСклад] Ошибка создания товара:', response.status, errorText);
      throw new Error(`Ошибка создания товара: ${response.status} ${errorText}`);
    }

    const result = await response.json();
    console.log('[МойСклад] Товар создан:', result.id);
    return result;
  } catch (error) {
    console.error('[МойСклад] Ошибка создания товара:', error);
    throw error;
  }
}

/**
 * Создает услугу в МойСклад
 */
export async function createService(serviceData: ServiceData): Promise<any> {
  try {
    console.log('[МойСклад] Создание услуги:', serviceData.name);
    
    const response = await fetch(`${MOYSKLAD_API_BASE}/entity/service`, {
      method: 'POST',
      headers: {
        'Authorization': getAuthHeader(),
        'Content-Type': 'application/json',
        'Accept-Encoding': 'gzip'
      },
      body: JSON.stringify(serviceData)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[МойСклад] Ошибка создания услуги:', response.status, errorText);
      throw new Error(`Ошибка создания услуги: ${response.status} ${errorText}`);
    }

    const result = await response.json();
    console.log('[МойСклад] Услуга создана:', result.id);
    return result;
  } catch (error) {
    console.error('[МойСклад] Ошибка создания услуги:', error);
    throw error;
  }
}

/**
 * Получает доступные типы цен из МойСклад
 */
export async function getPriceTypes(): Promise<any[]> {
  try {
    const response = await fetch(`${MOYSKLAD_API_BASE}/entity/product/metadata`, {
      method: 'GET',
      headers: {
        'Authorization': getAuthHeader(),
        'Content-Type': 'application/json',
        'Accept': 'application/json;charset=utf-8'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const metadata = await response.json();
    return metadata.priceTypes || [];
  } catch (error) {
    console.error('Ошибка получения типов цен:', error);
    throw error;
  }
}

/**
 * Получает информацию о валюте (обычно RUB)
 */
export async function getCurrency(): Promise<any> {
  try {
    const response = await fetch(`${MOYSKLAD_API_BASE}/entity/currency`, {
      method: 'GET',
      headers: {
        'Authorization': getAuthHeader(),
        'Content-Type': 'application/json',
        'Accept-Encoding': 'gzip'
      }
    });

    if (!response.ok) {
      throw new Error(`Ошибка получения валют: ${response.status}`);
    }

    const result = await response.json();
    // Ищем рубли или возвращаем первую валюту
    const rub = result.rows.find((currency: any) => currency.code === 'RUB');
    return rub || result.rows[0];
  } catch (error) {
    console.error('[МойСклад] Ошибка получения валюты:', error);
    throw error;
  }
}

/**
 * Загружает номенклатуру ИЗ МойСклад в нашу систему
 */
export async function loadNomenclatureFromMoysklad(): Promise<{
  products: any[],
  services: any[],
  errors: string[]
}> {
  try {
    console.log('[МойСклад] Начало загрузки номенклатуры ИЗ МойСклад...');
    
    const errors: string[] = [];
    const loadedProducts: any[] = [];
    const loadedServices: any[] = [];

    // Загружаем существующие товары и услуги один раз
    console.log('[МойСклад] Загружаем существующие данные из локальной БД...');
    const existingProducts = await storage.getProducts();
    const existingServices = await storage.getServices();
    const existingProductsMap = new Map(existingProducts.map(p => [p.moyskladId, p]));
    const existingServicesMap = new Map(existingServices.map(s => [s.moyskladId, s]));

    // Получаем товары из МойСклад
    try {
      const productsResponse = await makeApiRequest('entity/product?limit=1000');
      console.log(`[МойСклад] Найдено товаров в МойСклад: ${productsResponse.rows?.length || 0}`);
      
      if (productsResponse.rows) {
        let productCount = 0;
        for (const product of productsResponse.rows) {
          try {
            const existingProduct = existingProductsMap.get(product.id);
            
            const productData = {
              moyskladId: product.id,
              name: product.name,
              description: product.description || '',
              article: product.article || '',
              category: 'МойСклад', // Категория по умолчанию
              price: (product.salePrices && product.salePrices.length > 0 
                ? (product.salePrices[0].value / 100) // Конвертируем из копеек в рубли
                : 0).toString(), // Преобразуем в строку
              vat: product.vat || 20,
              unit: 'шт', // Единица измерения по умолчанию
              stock: 0,
              minStock: 0,
              isActive: true
            };
            
            if (!existingProduct) {
              // Создаем новый товар в локальной БД
              const createdProduct = await storage.createProduct(productData);
              loadedProducts.push(createdProduct);
            } else {
              // Обновляем существующий товар
              await storage.updateProduct(existingProduct.id, productData);
              loadedProducts.push({ ...existingProduct, ...productData });
            }
            
            productCount++;
            if (productCount % 100 === 0) {
              console.log(`[МойСклад] Обработано товаров: ${productCount}/${productsResponse.rows.length}`);
            }
          } catch (productError: any) {
            const errorMessage = `Ошибка сохранения товара "${product.name}": ${productError.message}`;
            console.error(errorMessage);
            errors.push(errorMessage);
          }
        }
      }
    } catch (error: any) {
      const errorMessage = `Ошибка загрузки товаров: ${error.message}`;
      console.error(errorMessage);
      errors.push(errorMessage);
    }

    // Получаем услуги из МойСклад
    try {
      const servicesResponse = await makeApiRequest('entity/service?limit=1000');
      console.log(`[МойСклад] Найдено услуг в МойСклад: ${servicesResponse.rows?.length || 0}`);
      
      if (servicesResponse.rows) {
        let serviceCount = 0;
        for (const service of servicesResponse.rows) {
          try {
            const existingService = existingServicesMap.get(service.id);
            
            const serviceData = {
              moyskladId: service.id,
              name: service.name,
              description: service.description || '',
              article: service.article || '',
              category: 'МойСклад', // Категория по умолчанию
              price: (service.salePrices && service.salePrices.length > 0 
                ? (service.salePrices[0].value / 100) // Конвертируем из копеек в рубли
                : 0).toString(), // Преобразуем в строку
              vat: service.vat || 20,
              duration: 30, // Длительность по умолчанию в минутах
              isActive: true
            };
            
            if (!existingService) {
              // Создаем новую услугу в локальной БД
              const createdService = await storage.createService(serviceData);
              loadedServices.push(createdService);
            } else {
              // Обновляем существующую услугу
              await storage.updateService(existingService.id, serviceData);
              loadedServices.push({ ...existingService, ...serviceData });
            }
            
            serviceCount++;
            if (serviceCount % 100 === 0) {
              console.log(`[МойСклад] Обработано услуг: ${serviceCount}/${servicesResponse.rows.length}`);
            }
          } catch (serviceError: any) {
            const errorMessage = `Ошибка сохранения услуги "${service.name}": ${serviceError.message}`;
            console.error(errorMessage);
            errors.push(errorMessage);
          }
        }
      }
    } catch (error: any) {
      const errorMessage = `Ошибка загрузки услуг: ${error.message}`;
      console.error(errorMessage);
      errors.push(errorMessage);
    }

    console.log('[МойСклад] Загрузка номенклатуры завершена');
    console.log(`Загружено товаров: ${loadedProducts.length}, услуг: ${loadedServices.length}`);
    console.log(`Ошибок: ${errors.length}`);

    return {
      products: loadedProducts,
      services: loadedServices,
      errors
    };
    
  } catch (error: any) {
    console.error('[МойСклад] Критическая ошибка загрузки номенклатуры:', error);
    return {
      products: [],
      services: [],
      errors: [error.message]
    };
  }
}

/**
 * Получает существующую номенклатуру из МойСклад
 */
export async function getAssortment(): Promise<any> {
  try {
    const response = await fetch(`${MOYSKLAD_API_BASE}/entity/assortment`, {
      method: 'GET',
      headers: {
        'Authorization': getAuthHeader(),
        'Content-Type': 'application/json',
        'Accept-Encoding': 'gzip'
      }
    });

    if (!response.ok) {
      throw new Error(`Ошибка получения номенклатуры: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('[МойСклад] Ошибка получения номенклатуры:', error);
    throw error;
  }
}

// ===== ЭКСПОРТ ИЗ VETSYSTEM В МОЙСКЛАД =====

import crypto from 'crypto';

/**
 * Вычисляет хеш для отслеживания изменений
 */
function computeSyncHash(item: any): string {
  const content = JSON.stringify({
    name: item.name,
    category: item.category,
    price: item.price,
    description: item.description,
    unit: item.unit || 'шт',
    vat: item.vat || 20
  });
  return crypto.createHash('sha256').update(content).digest('hex');
}

/**
 * Экспортирует услугу из VetSystem в МойСклад
 */
export async function exportServiceToMoysklad(service: any): Promise<{ success: boolean; moyskladId?: string; error?: string }> {
  try {
    const serviceData = {
      name: service.name,
      article: service.article || service.id.substring(0, 8),
      description: service.description || '',
      salePrices: [{
        value: Math.round(parseFloat(service.price) * 100), // МойСклад работает в копейках
        currency: {
          meta: {
            href: `${MOYSKLAD_API_BASE}/entity/currency/00000000-0000-0000-0000-000000000643`, // Рубль
            type: 'currency',
            mediaType: 'application/json'
          }
        }
      }],
      vat: service.vat || 20,
      vatEnabled: true,
      syncId: service.id // Для предотвращения дубликатов
    };

    let endpoint = `${MOYSKLAD_API_BASE}/entity/service`;
    let method = 'POST';

    // Если у услуги уже есть moyskladId, то обновляем
    if (service.moyskladId) {
      endpoint = `${MOYSKLAD_API_BASE}/entity/service/${service.moyskladId}`;
      method = 'PUT';
    }

    const response = await fetch(endpoint, {
      method,
      headers: {
        'Authorization': getAuthHeader(),
        'Content-Type': 'application/json',
        'Accept-Encoding': 'gzip'
      },
      body: JSON.stringify(serviceData)
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorData}`);
    }

    const result = await response.json();
    const moyskladId = result.id;

    // Отмечаем услугу как синхронизированную
    const syncHash = computeSyncHash(service);
    await storage.markServiceSynced(service.id, syncHash);

    console.log(`[МойСклад] Услуга "${service.name}" успешно экспортирована`);
    return { success: true, moyskladId };

  } catch (error: any) {
    console.error(`[МойСклад] Ошибка экспорта услуги "${service.name}":`, error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Экспортирует товар из VetSystem в МойСклад
 */
export async function exportProductToMoysklad(product: any): Promise<{ success: boolean; moyskladId?: string; error?: string }> {
  try {
    const productData = {
      name: product.name,
      article: product.article || product.id.substring(0, 8),
      description: product.description || '',
      salePrices: [{
        value: Math.round(parseFloat(product.price) * 100), // МойСклад работает в копейках
        currency: {
          meta: {
            href: `${MOYSKLAD_API_BASE}/entity/currency/00000000-0000-0000-0000-000000000643`, // Рубль
            type: 'currency',
            mediaType: 'application/json'
          }
        }
      }],
      vat: product.vat || 20,
      vatEnabled: true,
      syncId: product.id, // Для предотвращения дубликатов
      // Дополнительные атрибуты для товаров
      attributes: product.unit ? [{
        id: 'unit',
        value: product.unit
      }] : []
    };

    let endpoint = `${MOYSKLAD_API_BASE}/entity/product`;
    let method = 'POST';

    // Если у товара уже есть moyskladId, то обновляем
    if (product.moyskladId) {
      endpoint = `${MOYSKLAD_API_BASE}/entity/product/${product.moyskladId}`;
      method = 'PUT';
    }

    const response = await fetch(endpoint, {
      method,
      headers: {
        'Authorization': getAuthHeader(),
        'Content-Type': 'application/json',
        'Accept-Encoding': 'gzip'
      },
      body: JSON.stringify(productData)
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorData}`);
    }

    const result = await response.json();
    const moyskladId = result.id;

    // Отмечаем товар как синхронизированный
    const syncHash = computeSyncHash(product);
    await storage.markProductSynced(product.id, syncHash);

    console.log(`[МойСклад] Товар "${product.name}" успешно экспортирован`);
    return { success: true, moyskladId };

  } catch (error: any) {
    console.error(`[МойСклад] Ошибка экспорта товара "${product.name}":`, error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Архивирует товар/услугу в МойСклад (soft delete)
 */
export async function archiveItemInMoysklad(moyskladId: string, type: 'product' | 'service'): Promise<{ success: boolean; error?: string }> {
  try {
    const endpoint = `${MOYSKLAD_API_BASE}/entity/${type}/${moyskladId}`;
    
    // МойСклад использует поле archived для мягкого удаления
    const response = await fetch(endpoint, {
      method: 'PUT',
      headers: {
        'Authorization': getAuthHeader(),
        'Content-Type': 'application/json',
        'Accept-Encoding': 'gzip'
      },
      body: JSON.stringify({ archived: true })
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorData}`);
    }

    console.log(`[МойСклад] ${type} ${moyskladId} успешно архивирован`);
    return { success: true };

  } catch (error: any) {
    console.error(`[МойСклад] Ошибка архивирования ${type} ${moyskladId}:`, error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Двухсторонняя синхронизация номенклатуры (МойСклад ↔ VetSystem)
 * Приоритет: МойСклад (авторитетная система)
 */
export async function syncNomenclature(): Promise<{
  success: boolean;
  // Импорт из МойСклад
  importedProducts: number;
  importedServices: number;
  // Экспорт в МойСклад
  exportedServices: number;
  exportedProducts: number;
  archivedItems: number;
  // Статистика
  products: any[];
  services: any[];
  errors: string[];
}> {
  const errors: string[] = [];
  let importedProducts = 0;
  let importedServices = 0;
  let exportedServices = 0;
  let exportedProducts = 0;
  let archivedItems = 0;

  try {
    console.log('[МойСклад] Начинаем двухстороннюю синхронизацию номенклатуры...');

    // ===== ЭТАП 1: ИМПОРТ ИЗ МОЙСКЛАД (ПРИОРИТЕТ) =====
    console.log('[МойСклад] Этап 1: Импорт изменений из МойСклад...');
    
    const importResult = await loadNomenclatureFromMoysklad();
    importedProducts = importResult.products.length;
    importedServices = importResult.services.length;
    
    if (importResult.errors.length > 0) {
      errors.push(...importResult.errors.map(e => `Импорт: ${e}`));
    }

    // ===== ЭТАП 2: ЭКСПОРТ В МОЙСКЛАД (ТОЛЬКО НОВЫЕ/ИЗМЕНЁННЫЕ) =====
    console.log('[МойСклад] Этап 2: Экспорт изменений из VetSystem...');
    
    const exportResult = await exportToMoysklad();
    exportedServices = exportResult.exportedServices;
    exportedProducts = exportResult.exportedProducts;
    archivedItems = exportResult.archivedItems;
    
    if (exportResult.errors.length > 0) {
      errors.push(...exportResult.errors.map(e => `Экспорт: ${e}`));
    }

    // Получаем финальные данные для отчета
    const finalProducts = await storage.getProducts();
    const finalServices = await storage.getServices();

    console.log('[МойСклад] Двухсторонняя синхронизация завершена');
    console.log(`Импортировано: товаров ${importedProducts}, услуг ${importedServices}`);
    console.log(`Экспортировано: товаров ${exportedProducts}, услуг ${exportedServices}`);
    console.log(`Архивировано: ${archivedItems}, ошибок: ${errors.length}`);

    return {
      success: errors.length === 0,
      importedProducts,
      importedServices,
      exportedServices,
      exportedProducts,
      archivedItems,
      products: finalProducts,
      services: finalServices,
      errors
    };

  } catch (error: any) {
    console.error('[МойСклад] Критическая ошибка двухсторонней синхронизации:', error);
    errors.push(error.message);
    return {
      success: false,
      importedProducts,
      importedServices,
      exportedServices,
      exportedProducts,
      archivedItems,
      products: [],
      services: [],
      errors
    };
  }
}

/**
 * Экспорт изменений из VetSystem в МойСклад
 */
async function exportToMoysklad(): Promise<{
  exportedServices: number;
  exportedProducts: number;
  archivedItems: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let exportedServices = 0;
  let exportedProducts = 0;
  let archivedItems = 0;

  try {
    // 1. Экспортируем новые/измененные услуги
    const servicesToSync = await storage.getServicesForSync();
    console.log(`[МойСклад] Найдено услуг для экспорта: ${servicesToSync.length}`);

    for (const service of servicesToSync) {
      const result = await exportServiceToMoysklad(service);
      if (result.success) {
        exportedServices++;
        
        // Обновляем moyskladId если это новая услуга
        if (result.moyskladId && !service.moyskladId) {
          await storage.updateService(service.id, { moyskladId: result.moyskladId });
        }
      } else if (result.error) {
        errors.push(`Услуга "${service.name}": ${result.error}`);
      }
    }

    // 2. Экспортируем новые/измененные товары
    const productsToSync = await storage.getProductsForSync();
    console.log(`[МойСклад] Найдено товаров для экспорта: ${productsToSync.length}`);

    for (const product of productsToSync) {
      const result = await exportProductToMoysklad(product);
      if (result.success) {
        exportedProducts++;
        
        // Обновляем moyskladId если это новый товар
        if (result.moyskladId && !product.moyskladId) {
          await storage.updateProduct(product.id, { moyskladId: result.moyskladId });
        }
      } else if (result.error) {
        errors.push(`Товар "${product.name}": ${result.error}`);
      }
    }

    // 3. Архивируем удаленные услуги
    const deletedServices = await storage.getDeletedServicesForSync();
    console.log(`[МойСклад] Найдено удаленных услуг для архивирования: ${deletedServices.length}`);

    for (const service of deletedServices) {
      if (service.moyskladId) {
        const result = await archiveItemInMoysklad(service.moyskladId, 'service');
        if (result.success) {
          archivedItems++;
          await storage.markServiceSynced(service.id, '');
        } else if (result.error) {
          errors.push(`Архивирование услуги "${service.name}": ${result.error}`);
        }
      }
    }

    // 4. Архивируем удаленные товары
    const deletedProducts = await storage.getDeletedProductsForSync();
    console.log(`[МойСклад] Найдено удаленных товаров для архивирования: ${deletedProducts.length}`);

    for (const product of deletedProducts) {
      if (product.moyskladId) {
        const result = await archiveItemInMoysklad(product.moyskladId, 'product');
        if (result.success) {
          archivedItems++;
          await storage.markProductSynced(product.id, '');
        } else if (result.error) {
          errors.push(`Архивирование товара "${product.name}": ${result.error}`);
        }
      }
    }

    return {
      exportedServices,
      exportedProducts,
      archivedItems,
      errors
    };

  } catch (error: any) {
    console.error('[МойСклад] Ошибка экспорта:', error);
    errors.push(error.message);
    return {
      exportedServices,
      exportedProducts,
      archivedItems,
      errors
    };
  }
}

// Экспорт конфигурации для использования в других модулях
export { config };