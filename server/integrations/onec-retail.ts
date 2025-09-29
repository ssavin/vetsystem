import { z } from 'zod';
import { storage } from '../storage.js';

// ===== СХЕМЫ ДЛЯ 1С РОЗНИЦА API =====

// Схема для товаров из 1С Розница через OData
const OneCProductSchema = z.object({
  Ref_Key: z.string(), // UUID товара в 1С
  Code: z.string().optional(), // Код товара
  Description: z.string(), // Наименование
  Article: z.string().optional(), // Артикул
  VATRate: z.number().optional(), // Ставка НДС
  IsFolder: z.boolean().optional(), // Папка или элемент
  Parent_Key: z.string().optional(), // Родительская группа
  PredefinedDataName: z.string().optional(),
  DeletionMark: z.boolean().optional(), // Пометка удаления
  Balance: z.number().optional(), // Остаток на складе
  Unit: z.string().optional(), // Единица измерения
});

// Схема для цен товаров
const OneCPriceSchema = z.object({
  Product_Key: z.string(), // Ссылка на товар
  PriceType_Key: z.string(), // Тип цены
  Price: z.number(), // Цена
  Currency_Key: z.string(), // Валюта
});

// Схема для создания документа "Чек ККМ" в 1С
const OneCReceiptSchema = z.object({
  Date: z.string(), // Дата документа
  Number: z.string(), // Номер документа
  CashRegister_Key: z.string(), // Касса
  DocumentAmount: z.number(), // Сумма документа
  PaymentMethod_Key: z.string(), // Способ оплаты
  Customer_Key: z.string().optional(), // Покупатель
  Items: z.array(z.object({
    Product_Key: z.string(), // Товар
    Quantity: z.number(), // Количество
    Price: z.number(), // Цена
    Amount: z.number(), // Сумма
    VATRate: z.number().optional(), // Ставка НДС
    VATAmount: z.number().optional(), // Сумма НДС
  })),
});

// Схема для услуг
const OneCServiceSchema = z.object({
  Ref_Key: z.string(),
  Code: z.string().optional(),
  Description: z.string(),
  VATRate: z.number().optional(),
  IsFolder: z.boolean().optional(),
  Parent_Key: z.string().optional(),
  DeletionMark: z.boolean().optional(),
});

type OneCProductData = z.infer<typeof OneCProductSchema>;
type OneCServiceData = z.infer<typeof OneCServiceSchema>;
type OneCReceiptData = z.infer<typeof OneCReceiptSchema>;

// ===== КОНФИГУРАЦИЯ API =====

const config = {
  baseUrl: process.env.ONEC_BASE_URL!, // http://server:port/accounting/odata/standard.odata/
  username: process.env.ONEC_USERNAME!,
  password: process.env.ONEC_PASSWORD!,
  infobaseId: process.env.ONEC_INFOBASE_ID!, // ID информационной базы
  organization_key: process.env.ONEC_ORGANIZATION_KEY!, // Ключ организации
  cashRegister_key: process.env.ONEC_CASH_REGISTER_KEY!, // Ключ кассы
  cashPaymentMethod_key: process.env.ONEC_CASH_PAYMENT_KEY!, // Ключ метода оплаты наличными
  cardPaymentMethod_key: process.env.ONEC_CARD_PAYMENT_KEY!, // Ключ метода оплаты картой
};

// Проверка обязательных переменных окружения
if (!config.baseUrl || !config.username || !config.password || 
    !config.organization_key || !config.cashRegister_key ||
    !config.cashPaymentMethod_key || !config.cardPaymentMethod_key) {
  throw new Error('Критические переменные окружения для 1С не настроены: ONEC_BASE_URL, ONEC_USERNAME, ONEC_PASSWORD, ONEC_ORGANIZATION_KEY, ONEC_CASH_REGISTER_KEY, ONEC_CASH_PAYMENT_KEY, ONEC_CARD_PAYMENT_KEY');
}

// ===== БАЗОВЫЕ ФУНКЦИИ API =====

/**
 * Создание заголовка авторизации для 1С
 */
function getAuthHeader(): string {
  const credentials = Buffer.from(`${config.username}:${config.password}`).toString('base64');
  return `Basic ${credentials}`;
}

/**
 * Универсальная функция для API запросов к 1С
 */
async function makeOneCApiRequest(
  endpoint: string, 
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE' = 'GET',
  body?: any
): Promise<any> {
  if (!config.baseUrl) {
    throw new Error('1С интеграция не настроена: отсутствует ONEC_BASE_URL');
  }

  const url = `${config.baseUrl}${endpoint}`;
  const headers: Record<string, string> = {
    'Authorization': getAuthHeader(),
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };

  console.log(`🔄 1С API запрос: ${method} ${url}`);

  try {
    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`1С API ошибка ${response.status}: ${errorText}`);
    }

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const data = await response.json();
      return data;
    }

    return await response.text();
  } catch (error) {
    console.error('❌ Ошибка запроса к 1С API:', error);
    throw error;
  }
}

// ===== ЗАГРУЗКА НОМЕНКЛАТУРЫ ИЗ 1С =====

// ===== УТИЛИТЫ =====

/**
 * Получение цены товара из 1С
 */
async function fetchOneCPrice(itemKey: string): Promise<{ Price: number; Cost: number } | null> {
  try {
    const response = await makeOneCApiRequest(`Catalog_Номенклатура(guid'${itemKey}')/Prices`, 'GET');
    
    if (!response?.value?.[0]) {
      console.warn(`⚠️ Не удалось получить цену для товара ${itemKey}`);
      return null;
    }

    return response.value[0];
  } catch (error) {
    console.warn(`⚠️ Ошибка получения цены для ${itemKey}:`, error);
    return null;
  }
}

/**
 * Генерация хеша для синхронизации
 */
function generateSyncHash(data: any): string {
  // Простая хеш-функция для совместимости
  const dataString = JSON.stringify(data, Object.keys(data).sort());
  return Buffer.from(dataString).toString('base64').slice(0, 32);
}

/**
 * Загрузка товаров из 1С Розница
 */
export async function loadProductsFromOneC(): Promise<{ success: boolean; imported: number; errors: string[] }> {
  const result = { success: false, imported: 0, errors: [] as string[] };

  try {
    console.log('📦 Начинаем загрузку товаров из 1С Розница...');

    // Получение товаров через OData
    const response = await makeOneCApiRequest(
      "Catalog_Номенклатура?\$filter=IsFolder eq false and DeletionMark eq false&\$expand=ЦеныНоменклатуры"
    );

    if (!response || !response.value) {
      throw new Error('Некорректный ответ от 1С API');
    }

    const products = response.value;
    console.log(`📊 Получено ${products.length} товаров из 1С`);

    // Обработка каждого товара
    for (const productData of products) {
      try {
        const validatedProduct = OneCProductSchema.parse(productData);
        
        // Поиск существующего товара по внешнему ID
        const existingProduct = await storage.getProductByExternalId(validatedProduct.Ref_Key, 'onec');
        
        // Получаем цену товара из 1С
        const priceData = await fetchOneCPrice(validatedProduct.Ref_Key);
        const price = priceData?.Price || 0;
        const cost = priceData?.Cost || 0;

        const productPayload = {
          name: validatedProduct.Description,
          category: 'general', 
          price: price.toString(),
          stock: validatedProduct.Balance || 0,
          minStock: 0,
          unit: validatedProduct.Unit || 'шт',
          description: validatedProduct.Description,
          externalId: validatedProduct.Ref_Key,
          externalSystem: 'onec' as const,
          // Добавляем метаданные синхронизации
          lastSyncedAt: new Date(),
          syncHash: generateSyncHash(validatedProduct),
        };

        if (existingProduct) {
          // Обновление существующего товара
          await storage.updateProduct(existingProduct.id, productPayload);
          console.log(`✅ Обновлен товар: ${validatedProduct.Description}`);
        } else {
          // Создание нового товара
          await storage.createProduct(productPayload);
          console.log(`🆕 Создан новый товар: ${validatedProduct.Description}`);
        }

        result.imported++;
      } catch (productError) {
        const errorMsg = `Ошибка обработки товара ${productData.Description}: ${productError}`;
        console.error('❌', errorMsg);
        result.errors.push(errorMsg);
      }
    }

    result.success = true;
    console.log(`✅ Загрузка завершена. Импортировано: ${result.imported}, ошибок: ${result.errors.length}`);

  } catch (error) {
    const errorMsg = `Общая ошибка загрузки товаров из 1С: ${error}`;
    console.error('❌', errorMsg);
    result.errors.push(errorMsg);
  }

  return result;
}

/**
 * Загрузка услуг из 1С
 */
export async function loadServicesFromOneC(): Promise<{ success: boolean; imported: number; errors: string[] }> {
  const result = { success: false, imported: 0, errors: [] as string[] };

  try {
    console.log('🛠️ Начинаем загрузку услуг из 1С...');

    // Получение услуг (можно использовать тот же справочник "Номенклатура" с фильтром по типу)
    const response = await makeOneCApiRequest(
      "Catalog_Номенклатура?\$filter=IsFolder eq false and DeletionMark eq false and ТипНоменклатуры eq 'Услуга'"
    );

    if (!response || !response.value) {
      throw new Error('Некорректный ответ от 1С API для услуг');
    }

    const services = response.value;
    console.log(`📊 Получено ${services.length} услуг из 1С`);

    // Обработка каждой услуги
    for (const serviceData of services) {
      try {
        const validatedService = OneCServiceSchema.parse(serviceData);
        
        // Поиск существующей услуги
        const existingService = await storage.getServiceByExternalId(validatedService.Ref_Key, 'onec');
        
        // Получаем цену услуги из 1С  
        const priceData = await fetchOneCPrice(validatedService.Ref_Key);
        const price = priceData?.Price || 0;

        const servicePayload = {
          name: validatedService.Description,
          category: 'general',
          price: price.toString(),
          description: validatedService.Description,
          duration: 30, // Длительность по умолчанию
          externalId: validatedService.Ref_Key,
          externalSystem: 'onec' as const,
          // Добавляем метаданные синхронизации
          lastSyncedAt: new Date(),
          syncHash: generateSyncHash(validatedService),
        };

        if (existingService) {
          // Обновление существующей услуги
          await storage.updateService(existingService.id, servicePayload);
          console.log(`✅ Обновлена услуга: ${validatedService.Description}`);
        } else {
          // Создание новой услуги
          await storage.createService(servicePayload);
          console.log(`🆕 Создана новая услуга: ${validatedService.Description}`);
        }

        result.imported++;
      } catch (serviceError) {
        const errorMsg = `Ошибка обработки услуги ${serviceData.Description}: ${serviceError}`;
        console.error('❌', errorMsg);
        result.errors.push(errorMsg);
      }
    }

    result.success = true;
    console.log(`✅ Загрузка услуг завершена. Импортировано: ${result.imported}, ошибок: ${result.errors.length}`);

  } catch (error) {
    const errorMsg = `Общая ошибка загрузки услуг из 1С: ${error}`;
    console.error('❌', errorMsg);
    result.errors.push(errorMsg);
  }

  return result;
}

// ===== ОТПРАВКА ЧЕКОВ В 1С =====

/**
 * Отправка чека из VetSystem в 1С Розница
 */
export async function sendReceiptToOneC(receiptData: any): Promise<{ success: boolean; onecDocumentId?: string; error?: string }> {
  try {
    console.log('📄 Отправляем чек в 1С Розница...');

    if (!config.organization_key || !config.cashRegister_key) {
      throw new Error('Не настроены ключи организации или кассы для 1С');
    }

    // Подготовка данных чека для 1С
    const onecReceipt: OneCReceiptData = {
      Date: new Date().toISOString(),
      Number: receiptData.receiptNumber || `VET-${Date.now()}`,
      CashRegister_Key: config.cashRegister_key,
      DocumentAmount: receiptData.totalAmount,
      PaymentMethod_Key: receiptData.paymentMethod === 'cash' 
        ? config.cashPaymentMethod_key
        : config.cardPaymentMethod_key,
      Customer_Key: receiptData.customerId || undefined,
      Items: receiptData.items.map((item: any) => ({
        Product_Key: item.externalId || item.productId, // Используем внешний ID из 1С
        Quantity: item.quantity,
        Price: item.price,
        Amount: item.quantity * item.price,
        VATRate: item.vatRate || 0,
        VATAmount: (item.quantity * item.price * (item.vatRate || 0)) / 100,
      })),
    };

    // Валидация данных
    const validatedReceipt = OneCReceiptSchema.parse(onecReceipt);

    // Отправка документа в 1С
    const response = await makeOneCApiRequest(
      'Document_ЧекККМ',
      'POST',
      validatedReceipt
    );

    console.log('✅ Чек успешно отправлен в 1С');
    return {
      success: true,
      onecDocumentId: response.Ref_Key || response.id,
    };

  } catch (error) {
    const errorMsg = `Ошибка отправки чека в 1С: ${error}`;
    console.error('❌', errorMsg);
    return {
      success: false,
      error: errorMsg,
    };
  }
}

// ===== СЛУЖЕБНЫЕ ФУНКЦИИ =====

/**
 * Тестирование подключения к 1С Розница
 */
export async function testOneCConnection(): Promise<{ success: boolean; message: string }> {
  try {
    console.log('🔄 Тестирование подключения к 1С Розница...');

    // Проверка наличия переменных окружения
    if (!config.baseUrl || !config.username || !config.password) {
      return {
        success: false,
        message: 'Не настроены переменные окружения для подключения к 1С (ONEC_BASE_URL, ONEC_USERNAME, ONEC_PASSWORD)'
      };
    }

    // Тестовый запрос к 1С для проверки подключения
    const response = await makeOneCApiRequest('$metadata', 'GET');
    
    if (response) {
      await storage.createIntegrationLog({
        system: 'onec',
        operation: 'test_connection',
        status: 'success',
        details: { baseUrl: config.baseUrl }
      });

      return {
        success: true,
        message: 'Подключение к 1С Розница установлено успешно'
      };
    } else {
      throw new Error('Получен пустой ответ от сервера 1С');
    }

  } catch (error) {
    const errorMessage = `Ошибка подключения к 1С: ${error}`;
    console.error('❌', errorMessage);

    await storage.createIntegrationLog({
      system: 'onec',
      operation: 'test_connection',
      status: 'error',
      details: { error: errorMessage }
    });

    return {
      success: false,
      message: errorMessage
    };
  }
}


/**
 * Получение статистики интеграции с 1С
 */
export async function getOneCIntegrationStats(): Promise<{
  connectedProducts: number;
  connectedServices: number;
  lastSync?: Date;
  errors: number;
}> {
  try {
    // Получение статистики из локальной базы данных
    const products = await storage.getProductsByExternalSystem('onec');
    const services = await storage.getServicesByExternalSystem('onec');
    
    // Получение информации о последней синхронизации
    const lastSyncInfo = await storage.getIntegrationLog('onec', 'sync');
    
    return {
      connectedProducts: products.length,
      connectedServices: services.length,
      lastSync: lastSyncInfo?.createdAt,
      errors: 0, // Можно добавить подсчет ошибок из логов
    };
  } catch (error) {
    console.error('❌ Ошибка получения статистики 1С:', error);
    return {
      connectedProducts: 0,
      connectedServices: 0,
      errors: 1,
    };
  }
}

/**
 * Полная синхронизация с 1С (товары + услуги)
 */
export async function syncWithOneC(): Promise<{
  success: boolean;
  productsImported: number;
  servicesImported: number;
  errors: string[];
}> {
  console.log('🔄 Начинаем полную синхронизацию с 1С Розница...');

  const productResult = await loadProductsFromOneC();
  const serviceResult = await loadServicesFromOneC();

  const allErrors = [...productResult.errors, ...serviceResult.errors];

  // Логирование результата синхронизации
  try {
    await storage.createIntegrationLog({
      system: 'onec',
      operation: 'sync',
      status: allErrors.length === 0 ? 'success' : 'partial_success',
      details: {
        productsImported: productResult.imported,
        servicesImported: serviceResult.imported,
        errors: allErrors,
      },
    });
  } catch (logError) {
    console.error('❌ Ошибка записи лога синхронизации:', logError);
  }

  return {
    success: productResult.success && serviceResult.success,
    productsImported: productResult.imported,
    servicesImported: serviceResult.imported,
    errors: allErrors,
  };
}