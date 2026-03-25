/**
 * Голосовой ИИ-ассистент клиники
 * Шаг 1: Доступ к данным + запись на приём
 */
import OpenAI from "openai";
import { storage } from "../storage";

function getOpenAI(): OpenAI | null {
  const apiKey = process.env.OPENAI_KEY || process.env.OPENAI_API_KEY;
  return apiKey ? new OpenAI({ apiKey }) : null;
}

// ─── Форматирование контекста клиники ──────────────────────────────────────

function formatTime(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
}

function formatDate(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString("ru-RU", { day: "numeric", month: "long", weekday: "long" });
}

function buildClinicContext(
  todayAppts: any[],
  doctors: any[],
  now: Date
): string {
  const lines: string[] = [];
  lines.push(`Сегодня: ${formatDate(now)}, ${formatTime(now)}`);
  lines.push("");

  // Врачи
  if (doctors.length > 0) {
    lines.push("Врачи клиники:");
    for (const d of doctors) {
      lines.push(`  • ${d.name} (${d.specialization || "Общая практика"}), ID: ${d.id}`);
    }
    lines.push("");
  }

  // Расписание на сегодня
  if (todayAppts.length === 0) {
    lines.push("Расписание на сегодня: нет записей.");
  } else {
    lines.push(`Расписание на сегодня (${todayAppts.length} записей):`);
    for (const a of todayAppts) {
      const status = a.status === "completed" ? "✓" : a.status === "cancelled" ? "✗" : "•";
      lines.push(
        `  ${status} ${formatTime(a.appointmentDate)} — ${a.patientName || "?"} (${a.patientSpecies || ""}) | Владелец: ${a.ownerName || "?"} ${a.ownerPhone ? `(${a.ownerPhone})` : ""} | Врач: ${a.doctorName || "?"} | ID записи: ${a.id}`
      );
    }
  }

  return lines.join("\n");
}

// ─── Инструменты для GPT-4o (Function Calling) ────────────────────────────

const TOOLS: OpenAI.Chat.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "search_owner",
      description: "Поиск владельца (клиента) по имени или телефону. Возвращает владельца и его питомцев.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "ФИО или телефон владельца" },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_schedule",
      description: "Получить расписание приёмов на конкретную дату. Если дата не указана — на сегодня.",
      parameters: {
        type: "object",
        properties: {
          date: { type: "string", description: "Дата в формате YYYY-MM-DD (опционально, по умолчанию сегодня)" },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "book_appointment",
      description: "Записать пациента на приём. Требует ID пациента, ID врача, дату и время.",
      parameters: {
        type: "object",
        properties: {
          patientId: { type: "string", description: "ID пациента (животного)" },
          doctorId: { type: "string", description: "ID врача" },
          date: { type: "string", description: "Дата приёма YYYY-MM-DD" },
          time: { type: "string", description: "Время приёма HH:MM" },
          duration: { type: "number", description: "Длительность в минутах (по умолчанию 30)" },
          appointmentType: { type: "string", description: "Тип приёма: первичный, повторный, плановый, вакцинация, хирургия" },
          notes: { type: "string", description: "Примечания к записи (опционально)" },
        },
        required: ["patientId", "doctorId", "date", "time"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "cancel_appointment",
      description: "Отменить запись на приём по её ID.",
      parameters: {
        type: "object",
        properties: {
          appointmentId: { type: "string", description: "ID записи на приём" },
          reason: { type: "string", description: "Причина отмены (опционально)" },
        },
        required: ["appointmentId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_patient_info",
      description: "Получить подробную информацию о пациенте (животном) по его ID.",
      parameters: {
        type: "object",
        properties: {
          patientId: { type: "string", description: "ID пациента" },
        },
        required: ["patientId"],
      },
    },
  },
];

// ─── Выполнение инструментов ───────────────────────────────────────────────

async function executeTool(
  name: string,
  args: Record<string, any>,
  branchId: string,
  tenantId: string
): Promise<string> {
  try {
    if (name === "search_owner") {
      const { query } = args;
      // Search by phone first, then by name
      let owner: any = null;
      if (/^\+?[\d\s-]{7,}$/.test(query)) {
        owner = await storage.getOwnerByPhone(query.replace(/\D/g, ""));
      }
      if (!owner) {
        const result = await storage.getOwnersPaginated({ branchId, search: query, limit: 5, offset: 0 });
        if (result.data.length > 0) owner = result.data[0];
      }
      if (!owner) return `Владелец "${query}" не найден в базе клиники.`;

      const patients = await storage.getPatientsByOwner(owner.id, branchId);
      const petList = patients.map((p: any) => `${p.name} (${p.species || "?"}, ${p.breed || "?"}, ID: ${p.id})`).join(", ");
      return JSON.stringify({
        owner: { id: owner.id, name: owner.name, phone: owner.phone, email: owner.email },
        pets: patients.map((p: any) => ({ id: p.id, name: p.name, species: p.species, breed: p.breed })),
        summary: `Владелец: ${owner.name}, тел: ${owner.phone || "не указан"}. Питомцы: ${petList || "нет питомцев"}`,
      });
    }

    if (name === "get_schedule") {
      const date = args.date ? new Date(args.date) : new Date();
      const appts = await storage.getAppointments(date, branchId);
      if (appts.length === 0) return `На ${formatDate(date)} записей нет.`;
      const lines = appts.map((a: any) =>
        `${formatTime(a.appointmentDate)} — ${a.patientName || "?"} | ${a.ownerName || "?"} | Врач: ${a.doctorName || "?"} | Статус: ${a.status} | ID: ${a.id}`
      );
      return `Расписание на ${formatDate(date)}:\n${lines.join("\n")}`;
    }

    if (name === "book_appointment") {
      const { patientId, doctorId, date, time, duration = 30, appointmentType = "первичный", notes } = args;

      // Find tenantId for the appointment
      const doctors = await storage.getDoctors(branchId);
      const doctor = doctors.find((d: any) => d.id === doctorId);
      if (!doctor) return `Врач с ID ${doctorId} не найден.`;

      const appointmentDate = new Date(`${date}T${time}:00`);
      if (isNaN(appointmentDate.getTime())) return `Некорректная дата или время: ${date} ${time}`;

      const appointment = await storage.createAppointment({
        patientId,
        doctorId,
        branchId,
        tenantId,
        appointmentDate,
        duration,
        appointmentType,
        status: "scheduled",
        notes: notes || null,
      } as any);

      return JSON.stringify({
        success: true,
        appointmentId: appointment.id,
        summary: `Запись создана на ${formatDate(appointmentDate)} в ${time} к врачу ${doctor.name}. ID записи: ${appointment.id}`,
      });
    }

    if (name === "cancel_appointment") {
      const { appointmentId, reason } = args;
      const appt = await storage.getAppointment(appointmentId);
      if (!appt) return `Запись с ID ${appointmentId} не найдена.`;

      await storage.updateAppointment(appointmentId, {
        status: "cancelled",
        notes: reason ? `Отменено: ${reason}` : "Отменено через голосового ассистента",
      } as any);

      return `Запись ${appointmentId} успешно отменена.`;
    }

    if (name === "get_patient_info") {
      const patient = await storage.getPatient(args.patientId);
      if (!patient) return `Пациент с ID ${args.patientId} не найден.`;
      return JSON.stringify({
        id: patient.id,
        name: patient.name,
        species: patient.species,
        breed: patient.breed,
        birthDate: patient.birthDate,
        gender: patient.gender,
        color: patient.color,
        weight: patient.weight,
      });
    }

    return `Неизвестный инструмент: ${name}`;
  } catch (err: any) {
    console.error(`Tool ${name} error:`, err);
    return `Ошибка при выполнении ${name}: ${err.message}`;
  }
}

// ─── Основная функция ──────────────────────────────────────────────────────

export interface VoiceAssistantResult {
  response: string;
  actions: { type: string; data: any }[];
}

export async function processVoiceQuery(
  text: string,
  history: { role: "user" | "assistant"; content: string }[],
  branchId: string,
  tenantId: string
): Promise<VoiceAssistantResult> {
  const openai = getOpenAI();
  if (!openai) throw new Error("OpenAI API не настроен");

  const now = new Date();

  // 1. Загружаем контекст клиники
  const [todayAppts, doctors] = await Promise.all([
    storage.getAppointments(now, branchId),
    storage.getDoctors(branchId),
  ]);

  const clinicContext = buildClinicContext(todayAppts, doctors, now);

  const systemPrompt = `Ты — голосовой ИИ-ассистент администратора ветеринарной клиники VetSystem.
Ты помогаешь администратору управлять клиникой: работать с расписанием, записывать клиентов на приём, находить информацию о пациентах и владельцах.

ТЕКУЩИЙ КОНТЕКСТ КЛИНИКИ:
${clinicContext}

ПРАВИЛА:
- Отвечай кратко и по делу (2-3 предложения максимум), так как ответ будет озвучен голосом
- Говори на русском языке
- Если нужна информация из базы (найти клиента, посмотреть расписание на другой день, записать) — используй доступные инструменты
- При записи на приём: сначала найди владельца, уточни питомца, затем врача и время
- После выполнения действия (запись, отмена) — подтверди голосом что сделано
- Не выдумывай данные — используй только реальную информацию из инструментов
- Текущее время уже есть в контексте — используй его`;

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
    ...history.slice(-8).map(m => ({ role: m.role, content: m.content } as OpenAI.Chat.ChatCompletionMessageParam)),
    { role: "user", content: text },
  ];

  const actions: { type: string; data: any }[] = [];

  // 2. Запрос к GPT-4o с инструментами
  let response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages,
    tools: TOOLS,
    tool_choice: "auto",
    max_tokens: 500,
    temperature: 0.5,
  });

  // 3. Цикл выполнения инструментов (до 3 итераций)
  let iterations = 0;
  while (response.choices[0].finish_reason === "tool_calls" && iterations < 3) {
    iterations++;
    const assistantMessage = response.choices[0].message;
    messages.push(assistantMessage);

    const toolCalls = assistantMessage.tool_calls || [];

    // Выполняем все вызовы параллельно
    const toolResults = await Promise.all(
      toolCalls.map(async (tc) => {
        const args = JSON.parse(tc.function.arguments);
        const result = await executeTool(tc.function.name, args, branchId, tenantId);

        // Отслеживаем действия для фронтенда
        if (tc.function.name === "book_appointment") {
          try {
            const parsed = JSON.parse(result);
            if (parsed.success) actions.push({ type: "appointment_booked", data: parsed });
          } catch {}
        }
        if (tc.function.name === "cancel_appointment") {
          actions.push({ type: "appointment_cancelled", data: { appointmentId: args.appointmentId } });
        }

        return { toolCallId: tc.id, result };
      })
    );

    // Добавляем результаты инструментов в историю
    for (const { toolCallId, result } of toolResults) {
      messages.push({
        role: "tool",
        tool_call_id: toolCallId,
        content: result,
      });
    }

    // Повторный запрос с результатами инструментов
    response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages,
      tools: TOOLS,
      tool_choice: "auto",
      max_tokens: 500,
      temperature: 0.5,
    });
  }

  const finalText = response.choices[0].message.content || "Не могу обработать запрос.";
  return { response: finalText, actions };
}
