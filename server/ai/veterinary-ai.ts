// Ветеринарный ИИ-помощник для диагностики и анализа
// Based on OpenAI integration blueprint
import OpenAI from "openai";

// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const openai = process.env.OPENAI_API_KEY 
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

export interface DiagnosisAnalysis {
  differentialDiagnoses: string[];
  recommendedTests: string[];
  urgencyLevel: 'low' | 'medium' | 'high' | 'emergency';
  confidence: number;
  reasoning: string;
  treatmentSuggestions: string[];
}

export interface SOAPAssistance {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  suggestions: string[];
}

export interface ImageAnalysisResult {
  findings: string[];
  severity: 'normal' | 'mild' | 'moderate' | 'severe';
  recommendations: string[];
  confidence: number;
}

/**
 * Анализирует симптомы и клинические данные для предложения дифференциальной диагностики
 */
export async function analyzeSymptoms(data: {
  species: string;
  breed?: string;
  age: number;
  weight?: number;
  complaints: string;
  temperature?: number;
  symptoms: string;
  medicalHistory?: string;
}): Promise<DiagnosisAnalysis> {
  if (!openai) {
    throw new Error('OpenAI API key not configured. Please set OPENAI_API_KEY environment variable.');
  }
  try {
    const prompt = `Вы - опытный ветеринарный врач. Проанализируйте следующие клинические данные и предоставьте дифференциальную диагностику:

Вид: ${data.species}
Порода: ${data.breed || 'не указана'}
Возраст: ${data.age} лет
Вес: ${data.weight || 'не указан'} кг
Жалобы владельца: ${data.complaints}
Температура: ${data.temperature || 'не измерена'}°C
Клинические симптомы: ${data.symptoms}
Анамнез: ${data.medicalHistory || 'отсутствует'}

Пожалуйста, предоставьте анализ в JSON формате с полями:
- differentialDiagnoses: массив возможных диагнозов
- recommendedTests: рекомендуемые дополнительные исследования
- urgencyLevel: уровень срочности (low/medium/high/emergency)
- confidence: уровень уверенности (0-1)
- reasoning: обоснование диагноза
- treatmentSuggestions: предварительные рекомендации по лечению`;

    const response = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [
        {
          role: "system",
          content: "Вы - профессиональный ветеринарный врач с многолетним опытом. Всегда отвечайте на русском языке в формате JSON."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3 // Более консервативный подход для медицинских рекомендаций
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    
    return {
      differentialDiagnoses: result.differentialDiagnoses || [],
      recommendedTests: result.recommendedTests || [],
      urgencyLevel: result.urgencyLevel || 'medium',
      confidence: Math.max(0, Math.min(1, result.confidence || 0.5)),
      reasoning: result.reasoning || '',
      treatmentSuggestions: result.treatmentSuggestions || []
    };
  } catch (error) {
    throw new Error(`Ошибка анализа симптомов: ${error.message}`);
  }
}

/**
 * Помогает в создании SOAP заметок на основе клинических данных
 */
export async function generateSOAPNotes(data: {
  complaints: string;
  examination: string;
  vitals?: string;
  diagnosis?: string;
  treatment?: string;
}): Promise<SOAPAssistance> {
  if (!openai) {
    throw new Error('OpenAI API key not configured. Please set OPENAI_API_KEY environment variable.');
  }
  try {
    const prompt = `Создайте структурированную SOAP заметку на основе следующих данных:

Жалобы: ${data.complaints}
Результаты осмотра: ${data.examination}
Витальные показатели: ${data.vitals || 'не указаны'}
Предварительный диагноз: ${data.diagnosis || 'не поставлен'}
Проведенное лечение: ${data.treatment || 'не проводилось'}

Сформируйте SOAP заметку в JSON формате:
- subjective: субъективные данные (жалобы владельца)
- objective: объективные данные (осмотр, тесты)
- assessment: оценка (диагноз)
- plan: план лечения
- suggestions: дополнительные предложения`;

    const response = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [
        {
          role: "system",
          content: "Вы - ветеринарный врач, специалист по ведению медицинской документации. Отвечайте на русском языке в формате JSON."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.2
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    
    return {
      subjective: result.subjective || '',
      objective: result.objective || '',
      assessment: result.assessment || '',
      plan: result.plan || '',
      suggestions: result.suggestions || []
    };
  } catch (error) {
    throw new Error(`Ошибка генерации SOAP заметки: ${error.message}`);
  }
}

/**
 * Анализирует медицинские изображения (рентген, фото повреждений, дерматология)
 */
export async function analyzeVeterinaryImage(
  base64Image: string, 
  imageType: 'xray' | 'wound' | 'skin' | 'dental' | 'other',
  context: string = ''
): Promise<ImageAnalysisResult> {
  if (!openai) {
    throw new Error('OpenAI API key not configured. Please set OPENAI_API_KEY environment variable.');
  }
  try {
    const contextPrompts = {
      xray: 'Проанализируйте рентгеновский снимок на предмет переломов, патологий костей, инородных тел и других аномалий.',
      wound: 'Оцените рану или повреждение: размер, глубину, признаки инфекции, стадию заживления.',
      skin: 'Проанализируйте состояние кожи: высыпания, изменения пигментации, признаки дерматологических заболеваний.',
      dental: 'Оцените состояние зубов и ротовой полости: кариес, зубной камень, воспаления десен.',
      other: 'Проанализируйте медицинское изображение и опишите видимые патологии или аномалии.'
    };

    const response = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [
        {
          role: "system",
          content: "Вы - ветеринарный врач-диагност, специалист по анализу медицинских изображений. Отвечайте на русском языке в формате JSON."
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `${contextPrompts[imageType]} 
              
              Дополнительный контекст: ${context}
              
              Предоставьте анализ в JSON формате:
              - findings: массив обнаруженных патологий
              - severity: степень тяжести (normal/mild/moderate/severe)  
              - recommendations: рекомендации по дальнейшим действиям
              - confidence: уровень уверенности в анализе (0-1)`
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`
              }
            }
          ]
        }
      ],
      response_format: { type: "json_object" },
      max_tokens: 1000,
      temperature: 0.2
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    
    return {
      findings: result.findings || [],
      severity: result.severity || 'normal',
      recommendations: result.recommendations || [],
      confidence: Math.max(0, Math.min(1, result.confidence || 0.5))
    };
  } catch (error) {
    throw new Error(`Ошибка анализа изображения: ${error.message}`);
  }
}

/**
 * Создает персонализированные рекомендации по лечению
 */
export async function generateTreatmentPlan(data: {
  species: string;
  breed?: string;
  age: number;
  weight?: number;
  diagnosis: string;
  allergies?: string;
  currentMedications?: string;
  medicalHistory?: string;
}): Promise<{
  medications: Array<{
    name: string;
    dosage: string;
    frequency: string;
    duration: string;
    notes: string;
  }>;
  procedures: string[];
  followUp: string[];
  warnings: string[];
  dietRecommendations?: string;
}> {
  if (!openai) {
    throw new Error('OpenAI API key not configured. Please set OPENAI_API_KEY environment variable.');
  }
  try {
    const prompt = `Создайте персонализированный план лечения для животного:

Вид: ${data.species}
Порода: ${data.breed || 'не указана'}
Возраст: ${data.age} лет
Вес: ${data.weight || 'не указан'} кг
Диагноз: ${data.diagnosis}
Аллергии: ${data.allergies || 'нет'}
Текущие препараты: ${data.currentMedications || 'нет'}
Анамнез: ${data.medicalHistory || 'отсутствует'}

Составьте план лечения в JSON формате:
- medications: массив препаратов с дозировкой, частотой, продолжительностью
- procedures: необходимые процедуры
- followUp: план наблюдения
- warnings: предупреждения и противопоказания
- dietRecommendations: диетические рекомендации (если применимо)`;

    const response = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [
        {
          role: "system",
          content: "Вы - ветеринарный врач с опытом в фармакологии и терапии. Всегда учитывайте вид, породу и вес при расчете дозировок. Отвечайте на русском языке в формате JSON."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.1 // Очень консервативно для рекомендаций по лечению
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    
    return {
      medications: result.medications || [],
      procedures: result.procedures || [],
      followUp: result.followUp || [],
      warnings: result.warnings || [],
      dietRecommendations: result.dietRecommendations
    };
  } catch (error) {
    throw new Error(`Ошибка создания плана лечения: ${error.message}`);
  }
}

/**
 * Чат-бот для владельцев животных
 */
export async function clientChatAssistant(
  question: string,
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>
): Promise<string> {
  if (!openai) {
    throw new Error('OpenAI API key not configured. Please set OPENAI_API_KEY environment variable.');
  }
  try {
    const messages = [
      {
        role: "system" as const,
        content: `Вы - ИИ-помощник ветеринарной клиники для консультации владельцев животных. 

ВАЖНЫЕ ПРАВИЛА:
- Никогда не ставьте диагнозы
- Не назначайте конкретные лекарства
- При серьезных симптомах рекомендуйте немедленно обратиться к ветеринару
- Предоставляйте только общую информацию по уходу
- Будьте вежливы и сочувствуйте переживаниям владельца
- Отвечайте на русском языке`
      },
      ...(conversationHistory || []),
      {
        role: "user" as const,
        content: question
      }
    ];

    const response = await openai.chat.completions.create({
      model: "gpt-5",
      messages: messages,
      temperature: 0.3,
      max_tokens: 500
    });

    return response.choices[0].message.content || 'Извините, не могу ответить на этот вопрос.';
  } catch (error) {
    throw new Error(`Ошибка чат-бота: ${error.message}`);
  }
}