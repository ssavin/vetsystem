import { v4 as uuidv4 } from 'uuid';

/**
 * Mock-сервис для взаимодействия с API ГИС "ВетИС Гален"
 * В реальной реализации здесь будет SOAP/XML коммуникация с внешним API
 */

export interface GalenCredentials {
  apiUser: string;
  apiKey: string;
  issuerId: string;
  serviceId: string;
}

export interface PatientData {
  name: string;
  species: string;
  breed?: string;
  gender?: string;
  birthDate?: Date;
  microchipNumber?: string;
  ownerName?: string;
  ownerPhone?: string;
}

export interface VaccinationData {
  vaccineName: string;
  series: string;
  date: Date;
  doctorId: string;
  doctorName?: string;
}

export interface GalenAnimalRegistrationResult {
  success: boolean;
  galenUuid?: string;
  error?: string;
  errorCode?: string;
}

export interface GalenVaccinationResult {
  success: boolean;
  vaccinationId?: string;
  error?: string;
  errorCode?: string;
}

export interface GalenAnimalStatus {
  galenUuid: string;
  registered: boolean;
  lastUpdate?: Date;
  vaccinations?: Array<{
    id: string;
    name: string;
    date: Date;
  }>;
}

/**
 * Класс для взаимодействия с API "Гален"
 * MOCK-реализация для тестирования и разработки
 */
export class GalenAPIService {
  private mockDelay = 1000; // Имитация задержки сети (1 секунда)
  private mockFailureRate = 0.1; // 10% вероятность ошибки

  /**
   * Регистрация животного в системе "Гален"
   */
  async registerAnimal(
    patientData: PatientData,
    credentials: GalenCredentials
  ): Promise<GalenAnimalRegistrationResult> {
    // Валидация учетных данных
    if (!credentials.apiUser || !credentials.apiKey) {
      return {
        success: false,
        error: 'Отсутствуют учетные данные для доступа к API Гален',
        errorCode: 'AUTH_ERROR'
      };
    }

    // Валидация данных пациента
    if (!patientData.name || !patientData.species) {
      return {
        success: false,
        error: 'Недостаточно данных для регистрации животного',
        errorCode: 'VALIDATION_ERROR'
      };
    }

    // Имитация задержки сети
    await this.sleep(this.mockDelay);

    // Случайная имитация ошибки
    if (Math.random() < this.mockFailureRate) {
      return {
        success: false,
        error: 'Временная ошибка связи с сервером Гален. Попробуйте позже.',
        errorCode: 'NETWORK_ERROR'
      };
    }

    // MOCK: Успешная регистрация
    const galenUuid = uuidv4();
    
    console.log('[GALEN MOCK] Registered animal:', {
      galenUuid,
      name: patientData.name,
      species: patientData.species,
      credentials: {
        issuerId: credentials.issuerId,
        serviceId: credentials.serviceId
      }
    });

    return {
      success: true,
      galenUuid
    };
  }

  /**
   * Отправка данных о вакцинации в систему "Гален"
   */
  async recordVaccination(
    galenUuid: string,
    vaccinationData: VaccinationData,
    credentials: GalenCredentials
  ): Promise<GalenVaccinationResult> {
    // Валидация учетных данных
    if (!credentials.apiUser || !credentials.apiKey) {
      return {
        success: false,
        error: 'Отсутствуют учетные данные для доступа к API Гален',
        errorCode: 'AUTH_ERROR'
      };
    }

    // Валидация UUID животного
    if (!galenUuid) {
      return {
        success: false,
        error: 'Животное не зарегистрировано в системе Гален',
        errorCode: 'NOT_REGISTERED'
      };
    }

    // Валидация данных вакцинации
    if (!vaccinationData.vaccineName || !vaccinationData.series || !vaccinationData.date) {
      return {
        success: false,
        error: 'Недостаточно данных о вакцинации',
        errorCode: 'VALIDATION_ERROR'
      };
    }

    // Имитация задержки сети
    await this.sleep(this.mockDelay);

    // Случайная имитация ошибки
    if (Math.random() < this.mockFailureRate) {
      return {
        success: false,
        error: 'Временная ошибка связи с сервером Гален. Попробуйте позже.',
        errorCode: 'NETWORK_ERROR'
      };
    }

    // MOCK: Успешная регистрация вакцинации
    const vaccinationId = uuidv4();
    
    console.log('[GALEN MOCK] Recorded vaccination:', {
      galenUuid,
      vaccinationId,
      vaccine: vaccinationData.vaccineName,
      series: vaccinationData.series,
      date: vaccinationData.date
    });

    return {
      success: true,
      vaccinationId
    };
  }

  /**
   * Проверка статуса регистрации животного в системе "Гален"
   */
  async checkAnimalStatus(
    galenUuid: string,
    credentials: GalenCredentials
  ): Promise<GalenAnimalStatus | null> {
    // Валидация учетных данных
    if (!credentials.apiUser || !credentials.apiKey) {
      throw new Error('Отсутствуют учетные данные для доступа к API Гален');
    }

    // Валидация UUID
    if (!galenUuid) {
      throw new Error('Не указан UUID животного');
    }

    // Имитация задержки сети
    await this.sleep(this.mockDelay);

    // MOCK: Возвращаем статус (в реальной реализации здесь будет запрос к API)
    return {
      galenUuid,
      registered: true,
      lastUpdate: new Date(),
      vaccinations: [
        {
          id: uuidv4(),
          name: 'Вакцина от бешенства',
          date: new Date()
        }
      ]
    };
  }

  /**
   * Вспомогательный метод для имитации задержки
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * В реальной реализации здесь будут методы для:
   * - Формирования XML/SOAP запросов
   * - Подписи запросов цифровой подписью (если требуется)
   * - Парсинга XML ответов
   * - Обработки специфических ошибок ГИС Гален
   */
}

// Экспортируем singleton instance
export const galenAPIService = new GalenAPIService();
