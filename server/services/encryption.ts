import crypto from 'crypto';

/**
 * Сервис для шифрования и дешифрования конфиденциальных данных
 * Использует AES-256-GCM для безопасного шифрования
 */

// Получаем ключ шифрования из переменных окружения
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-encryption-key-change-me-in-production';

// Убедимся, что ключ имеет правильную длину (32 байта для AES-256)
const getEncryptionKey = (): Buffer => {
  const key = Buffer.from(ENCRYPTION_KEY);
  if (key.length < 32) {
    // Дополняем ключ до 32 байт
    return Buffer.concat([key, Buffer.alloc(32 - key.length)]);
  }
  return key.slice(0, 32);
};

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // Длина вектора инициализации для GCM
const AUTH_TAG_LENGTH = 16; // Длина тега аутентификации

/**
 * Шифрует строку и возвращает зашифрованные данные в формате base64
 * Формат: iv:authTag:encryptedData
 */
export function encrypt(text: string | null | undefined): string | null {
  if (!text) {
    return null;
  }

  try {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, getEncryptionKey(), iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    // Объединяем IV, authTag и зашифрованные данные
    const result = `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
    return Buffer.from(result).toString('base64');
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Расшифровывает строку из формата base64
 * Ожидает формат: iv:authTag:encryptedData
 */
export function decrypt(encryptedText: string | null | undefined): string | null {
  if (!encryptedText) {
    return null;
  }

  try {
    // Декодируем из base64
    const decoded = Buffer.from(encryptedText, 'base64').toString('utf8');
    const [ivHex, authTagHex, encrypted] = decoded.split(':');
    
    if (!ivHex || !authTagHex || !encrypted) {
      throw new Error('Invalid encrypted data format');
    }
    
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    
    const decipher = crypto.createDecipheriv(ALGORITHM, getEncryptionKey(), iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt data');
  }
}

/**
 * Шифрует объект с учетными данными Гален
 */
export interface GalenCredentials {
  galenApiUser?: string | null;
  galenApiKey?: string | null;
  galenIssuerId?: string | null;
  galenServiceId?: string | null;
}

export function encryptGalenCredentials(credentials: GalenCredentials): GalenCredentials {
  return {
    galenApiUser: encrypt(credentials.galenApiUser),
    galenApiKey: encrypt(credentials.galenApiKey),
    galenIssuerId: encrypt(credentials.galenIssuerId),
    galenServiceId: encrypt(credentials.galenServiceId),
  };
}

/**
 * Расшифровывает объект с учетными данными Гален
 */
export function decryptGalenCredentials(encryptedCredentials: GalenCredentials): GalenCredentials {
  return {
    galenApiUser: decrypt(encryptedCredentials.galenApiUser),
    galenApiKey: decrypt(encryptedCredentials.galenApiKey),
    galenIssuerId: decrypt(encryptedCredentials.galenIssuerId),
    galenServiceId: decrypt(encryptedCredentials.galenServiceId),
  };
}
