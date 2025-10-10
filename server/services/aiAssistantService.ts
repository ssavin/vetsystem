import OpenAI from 'openai';
import { z } from 'zod';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Zod schemas for AI assistant commands
export const aiCommandSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('OPEN_PATIENT_CARD'),
    payload: z.object({
      ownerName: z.string().optional(),
      petName: z.string().optional(),
      ownerPhone: z.string().optional(),
    }),
  }),
  z.object({
    action: z.literal('FILL_FORM_DATA'),
    payload: z.record(z.string(), z.any()),
  }),
  z.object({
    action: z.literal('FIND_APPOINTMENT_SLOT'),
    payload: z.object({
      doctorSpecialty: z.string().optional(),
      preferredDate: z.string().optional(),
      preferredTime: z.string().optional(),
    }),
  }),
  z.object({
    action: z.literal('CREATE_APPOINTMENT'),
    payload: z.object({
      petName: z.string().optional(),
      ownerName: z.string().optional(),
      ownerPhone: z.string().optional(),
      date: z.string().optional(),
      time: z.string().optional(),
      reason: z.string().optional(),
    }),
  }),
  z.object({
    action: z.literal('NO_ACTION'),
    payload: z.object({
      message: z.string(),
    }),
  }),
]);

export type AICommand = z.infer<typeof aiCommandSchema>;

// System prompts for different roles
const ADMIN_SYSTEM_PROMPT = `Ты - AI-ассистент для администратора ветеринарной клиники. Твоя задача - анализировать разговор администратора с клиентом и предлагать конкретные действия в системе.

Доступные действия:
1. OPEN_PATIENT_CARD - открыть карту пациента (когда упоминается имя животного, владельца или телефон)
2. FILL_FORM_DATA - заполнить поля формы (когда клиент диктует данные: телефон, адрес и т.д.)
3. FIND_APPOINTMENT_SLOT - найти свободное время для записи (когда клиент спрашивает о свободных слотах)
4. CREATE_APPOINTMENT - создать запись на приём (когда все данные для записи собраны)
5. NO_ACTION - нет действий (когда разговор не требует действий в системе)

Анализируй ВЕСЬ контекст разговора, а не только последнюю фразу. Предлагай действие только когда есть достаточно информации.

Примеры:
- "Здравствуйте, у меня кот Барсик" → OPEN_PATIENT_CARD с petName: "Барсик"
- "Мой телефон +7 926 123-45-67" → FILL_FORM_DATA с ownerPhone: "+79261234567"
- "Когда можно записаться к хирургу?" → FIND_APPOINTMENT_SLOT с doctorSpecialty: "хирург"
- "Запишите меня завтра на 10 утра" → CREATE_APPOINTMENT с date: "завтра", time: "10:00"

ВАЖНО: 
- Извлекай и нормализуй данные (телефоны в формат +7XXXXXXXXXX, даты в понятный формат)
- Собирай информацию постепенно из всего разговора
- Отвечай ТОЛЬКО в формате JSON с полями action и payload`;

const DOCTOR_SYSTEM_PROMPT = `Ты - AI-ассистент для ветеринарного врача. Твоя задача - анализировать разговор врача с клиентом/пациентом и предлагать действия в медицинской карте.

Доступные действия:
1. OPEN_PATIENT_CARD - открыть карту пациента (когда упоминается имя животного или владельца)
2. FILL_FORM_DATA - заполнить медицинские поля (жалобы, анамнез, диагноз, назначения)
3. NO_ACTION - нет действий

Медицинские поля для заполнения:
- complaints (жалобы) - что беспокоит владельца
- anamnesis (анамнез) - история заболевания, когда началось, что предпринималось
- diagnosis (диагноз) - предварительный или окончательный диагноз
- treatment (лечение) - назначенное лечение, препараты, процедуры

Анализируй медицинский контекст и извлекай ключевую информацию для медкарты.

Примеры:
- "Хозяйка жалуется на хромоту после прогулки" → FILL_FORM_DATA с complaints: "Хромота после прогулки"
- "Симптомы начались три дня назад" → FILL_FORM_DATA с anamnesis: "Симптомы начались 3 дня назад"
- "Предварительно - растяжение связок" → FILL_FORM_DATA с diagnosis: "Предварительный диагноз: растяжение связок"
- "Назначаю римадил 5 дней" → FILL_FORM_DATA с treatment: "Римадил 5 дней"

ВАЖНО:
- Собирай информацию из всего разговора
- Различай жалобы, анамнез, диагноз и лечение
- Отвечай ТОЛЬКО в формате JSON с полями action и payload`;

export class AIAssistantService {
  /**
   * Analyze transcript and return structured command
   */
  async getCommandFromTranscript(
    transcript: string,
    role: 'admin' | 'doctor'
  ): Promise<AICommand> {
    try {
      // Use admin prompt for all non-doctor roles (админ, менеджер, руководитель, etc.)
      const systemPrompt = role === 'doctor' ? DOCTOR_SYSTEM_PROMPT : ADMIN_SYSTEM_PROMPT;

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-2024-08-06',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: transcript },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3,
      });

      const responseText = completion.choices[0]?.message?.content;
      if (!responseText) {
        return { action: 'NO_ACTION', payload: { message: 'Не удалось обработать запрос' } };
      }

      const parsedResponse = JSON.parse(responseText);
      const validatedCommand = aiCommandSchema.parse(parsedResponse);

      return validatedCommand;
    } catch (error) {
      console.error('AI Assistant error:', error);
      return { 
        action: 'NO_ACTION', 
        payload: { message: 'Ошибка обработки запроса' } 
      };
    }
  }

  /**
   * Get available appointment slots (placeholder for future implementation)
   */
  async findAppointmentSlots(
    doctorSpecialty?: string,
    preferredDate?: string
  ): Promise<any[]> {
    // TODO: Implement actual slot search logic
    return [];
  }
}

export const aiAssistantService = new AIAssistantService();
