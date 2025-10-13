// SMS.RU API integration for sending SMS verification codes

const SMSRU_API_URL = 'https://sms.ru';

// SMS.RU credentials interface for tenant-specific configuration
export interface SmsRuCredentials {
  apiKey: string;
}

// Validate credentials at runtime
function validateCredentials(credentials: SmsRuCredentials): void {
  if (!credentials.apiKey) {
    throw new Error('SMS.RU: API ключ обязателен');
  }
}

/**
 * Test SMS.RU API connection by checking account balance
 * This verifies that the API key is valid
 */
export async function testConnection(credentials: SmsRuCredentials): Promise<{
  success: boolean;
  message: string;
  balance?: number;
}> {
  try {
    validateCredentials(credentials);
    
    const response = await fetch(`${SMSRU_API_URL}/my/balance?api_id=${credentials.apiKey}&json=1`);
    
    if (!response.ok) {
      return {
        success: false,
        message: `Ошибка HTTP: ${response.status} ${response.statusText}`,
      };
    }

    const data = await response.json();
    
    if (data.status === 'OK') {
      return {
        success: true,
        message: `Подключение успешно. Баланс: ${data.balance} руб.`,
        balance: parseFloat(data.balance),
      };
    } else {
      return {
        success: false,
        message: data.status_text || 'Неизвестная ошибка SMS.RU API',
      };
    }
  } catch (error) {
    console.error('Error testing SMS.RU connection:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Неизвестная ошибка',
    };
  }
}

/**
 * Send SMS using tenant-specific credentials
 */
export async function sendSms(
  credentials: SmsRuCredentials,
  phone: string,
  message: string
): Promise<{ success: boolean; message: string; balance?: number }> {
  try {
    validateCredentials(credentials);
    
    const params = new URLSearchParams({
      api_id: credentials.apiKey,
      to: phone,
      msg: message,
      json: '1',
    });

    const response = await fetch(`${SMSRU_API_URL}/sms/send?${params.toString()}`);
    
    if (!response.ok) {
      return {
        success: false,
        message: `Ошибка HTTP: ${response.status} ${response.statusText}`,
      };
    }

    const data = await response.json();
    
    if (data.status === 'OK') {
      const smsData = data.sms?.[phone];
      return {
        success: true,
        message: `SMS успешно отправлена (ID: ${smsData?.sms_id || 'unknown'})`,
        balance: parseFloat(data.balance),
      };
    } else {
      return {
        success: false,
        message: data.status_text || 'Неизвестная ошибка SMS.RU API',
      };
    }
  } catch (error) {
    console.error('Error sending SMS via SMS.RU:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Неизвестная ошибка',
    };
  }
}
