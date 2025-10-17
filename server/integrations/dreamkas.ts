/**
 * Интеграция с Дримкас (Dreamkas) - кассовое ПО и фискализация
 * 
 * Возможности:
 * - Синхронизация номенклатуры (товары/услуги)
 * - Фискализация чеков через API Кабинета Дримкас
 * - Автоматическая загрузка товаров на кассу
 * 
 * API документация: https://kabinet.dreamkas.ru/api/
 */

interface DreamkasCredentials {
  apiToken: string;
  deviceId: string;
}

interface DreamkasProduct {
  id?: string;
  name: string;
  type: 'COUNTABLE' | 'WEIGHTED' | 'ALCOHOL';
  departmentId?: number;
  quantity?: number; // в тысячных (1000 = 1 шт)
  prices: {
    deviceId: number;
    value: number; // в копейках
  }[];
  barcodes?: string[];
  tax: 0 | 10 | 20; // НДС
  isMarked?: boolean;
  isExcise?: boolean;
}

interface DreamkasReceipt {
  deviceId: number;
  type: 0 | 1; // 0 = приход, 1 = возврат
  taxMode: number; // Система налогообложения
  positions: {
    name: string;
    quantity: number; // в тысячных (1000 = 1 шт)
    price: number; // в копейках
    priceSum: number; // в копейках
    tax: 0 | 10 | 20;
    taxSum: number;
  }[];
  payments: {
    sum: number; // в копейках
    type: 0 | 1 | 2; // 0=наличные, 1=безнал, 2=предоплата
  }[];
  total: number; // в копейках
}

interface DreamkasResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

const DREAMKAS_API_URL = 'https://kabinet.dreamkas.ru/api';

/**
 * Создание товара в Кабинете Дримкас
 */
export async function createDreamkasProduct(
  credentials: DreamkasCredentials,
  product: DreamkasProduct
): Promise<DreamkasResponse<any>> {
  try {
    const response = await fetch(`${DREAMKAS_API_URL}/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${credentials.apiToken}`,
      },
      body: JSON.stringify(product),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        error: `HTTP ${response.status}`,
        message: errorText || 'Ошибка при создании товара в Дримкас',
      };
    }

    const data = await response.json();
    return {
      success: true,
      data,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
      message: 'Не удалось создать товар в Дримкас',
    };
  }
}

/**
 * Обновление товара в Кабинете Дримкас
 */
export async function updateDreamkasProduct(
  credentials: DreamkasCredentials,
  productId: string,
  product: Partial<DreamkasProduct>
): Promise<DreamkasResponse<any>> {
  try {
    const response = await fetch(`${DREAMKAS_API_URL}/products/${productId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${credentials.apiToken}`,
      },
      body: JSON.stringify(product),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        error: `HTTP ${response.status}`,
        message: errorText || 'Ошибка при обновлении товара в Дримкас',
      };
    }

    const data = await response.json();
    return {
      success: true,
      data,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
      message: 'Не удалось обновить товар в Дримкас',
    };
  }
}

/**
 * Массовое создание товаров в Кабинете Дримкас
 */
export async function bulkCreateDreamkasProducts(
  credentials: DreamkasCredentials,
  products: DreamkasProduct[]
): Promise<DreamkasResponse<any[]>> {
  try {
    const response = await fetch(`${DREAMKAS_API_URL}/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${credentials.apiToken}`,
      },
      body: JSON.stringify(products),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        error: `HTTP ${response.status}`,
        message: errorText || 'Ошибка при массовом создании товаров в Дримкас',
      };
    }

    const data = await response.json();
    return {
      success: true,
      data,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
      message: 'Не удалось создать товары в Дримкас',
    };
  }
}

/**
 * Создание фискального чека через Дримкас
 */
export async function createFiscalReceipt(
  credentials: DreamkasCredentials,
  receipt: DreamkasReceipt
): Promise<DreamkasResponse<any>> {
  try {
    const response = await fetch(`${DREAMKAS_API_URL}/receipts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${credentials.apiToken}`,
      },
      body: JSON.stringify(receipt),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        error: `HTTP ${response.status}`,
        message: errorText || 'Ошибка при создании фискального чека в Дримкас',
      };
    }

    const data = await response.json();
    return {
      success: true,
      data,
      message: 'Фискальный чек успешно создан в Дримкас',
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
      message: 'Не удалось создать фискальный чек в Дримкас',
    };
  }
}

/**
 * Конвертация VAT ставки из VetSystem в формат Дримкас
 */
export function convertVatRate(vatRate: string | number | null): 0 | 10 | 20 {
  if (!vatRate) return 0;
  
  const rate = typeof vatRate === 'string' ? parseInt(vatRate) : vatRate;
  
  if (rate === 10) return 10;
  if (rate === 20) return 20;
  return 0; // без НДС
}

/**
 * Конвертация цены в копейки
 */
export function priceToKopecks(price: number | string): number {
  const numPrice = typeof price === 'string' ? parseFloat(price) : price;
  return Math.round(numPrice * 100);
}

/**
 * Конвертация количества в формат Дримкас (тысячные)
 */
export function quantityToThousands(quantity: number): number {
  return Math.round(quantity * 1000);
}
