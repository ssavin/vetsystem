/**
 * Голосовой ИИ-ассистент клиники
 * Шаг 1: Расписание + запись на приём
 * Шаг 3: Счета и оплата
 */
import OpenAI from "openai";
import { storage } from "../storage";
import { pool } from "../db-local";

function getOpenAI(): OpenAI | null {
  const apiKey = process.env.OPENAI_KEY || process.env.OPENAI_API_KEY;
  return apiKey ? new OpenAI({ apiKey }) : null;
}

// ─── Форматирование ────────────────────────────────────────────────────────────

function formatTime(date: Date | string): string {
  return new Date(date).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
}

function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("ru-RU", { day: "numeric", month: "long", weekday: "long" });
}

function formatMoney(amount: string | number | null): string {
  if (amount === null || amount === undefined) return "0 ₽";
  const n = typeof amount === "string" ? parseFloat(amount) : amount;
  return `${n.toLocaleString("ru-RU")} ₽`;
}

function buildClinicContext(todayAppts: any[], doctors: any[], now: Date): string {
  const lines: string[] = [];
  lines.push(`Сегодня: ${formatDate(now)}, ${formatTime(now)}`);
  lines.push("");

  if (doctors.length > 0) {
    lines.push("Врачи клиники:");
    for (const d of doctors) {
      lines.push(`  • ${d.name} (${d.specialization || "Общая практика"}), ID: ${d.id}`);
    }
    lines.push("");
  }

  if (todayAppts.length === 0) {
    lines.push("Расписание на сегодня: нет записей.");
  } else {
    lines.push(`Расписание на сегодня (${todayAppts.length} записей):`);
    for (const a of todayAppts) {
      const s = a.status === "completed" ? "✓" : a.status === "cancelled" ? "✗" : "•";
      lines.push(`  ${s} ${formatTime(a.appointmentDate)} — ${a.patientName || "?"} (${a.patientSpecies || ""}) | Владелец: ${a.ownerName || "?"} ${a.ownerPhone ? `(${a.ownerPhone})` : ""} | Врач: ${a.doctorName || "?"} | ID: ${a.id}`);
    }
  }
  return lines.join("\n");
}

// ─── Инструменты GPT-4o ────────────────────────────────────────────────────────

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
          date: { type: "string", description: "Дата YYYY-MM-DD (опционально, по умолчанию сегодня)" },
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
          notes: { type: "string", description: "Примечания (опционально)" },
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
  // ─── ШАГ 3: СЧЕТА И ОПЛАТА ───────────────────────────────────────────────────
  {
    type: "function",
    function: {
      name: "get_owner_invoices",
      description: "Получить список счетов владельца (клиента). Показывает неоплаченные и оплаченные счета.",
      parameters: {
        type: "object",
        properties: {
          ownerId: { type: "string", description: "ID владельца/клиента" },
          status: {
            type: "string",
            description: "Фильтр по статусу: pending (неоплаченные), paid (оплаченные), all (все). По умолчанию all.",
            enum: ["pending", "paid", "all"],
          },
        },
        required: ["ownerId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_invoice_details",
      description: "Получить детальную информацию о счёте: список услуг, сумма, статус оплаты.",
      parameters: {
        type: "object",
        properties: {
          invoiceId: { type: "string", description: "ID счёта" },
        },
        required: ["invoiceId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "process_payment",
      description: "Принять оплату за счёт. Помечает счёт как оплаченный с указанным способом оплаты.",
      parameters: {
        type: "object",
        properties: {
          invoiceId: { type: "string", description: "ID счёта для оплаты" },
          paymentMethod: {
            type: "string",
            description: "Способ оплаты: cash (наличные), card (карта), transfer (перевод)",
            enum: ["cash", "card", "transfer"],
          },
          amount: {
            type: "number",
            description: "Сумма оплаты (опционально, если частичная оплата). По умолчанию — полная сумма счёта.",
          },
        },
        required: ["invoiceId", "paymentMethod"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_financial_summary",
      description: "Получить финансовую сводку за сегодня: выручка, количество оплаченных счетов, задолженности.",
      parameters: {
        type: "object",
        properties: {
          date: { type: "string", description: "Дата YYYY-MM-DD (опционально, по умолчанию сегодня)" },
        },
        required: [],
      },
    },
  },
];

// ─── Выполнение инструментов ────────────────────────────────────────────────────

async function executeTool(
  name: string,
  args: Record<string, any>,
  branchId: string,
  tenantId: string
): Promise<string> {
  try {
    // ──── ЗАПИСЬ И РАСПИСАНИЕ ────────────────────────────────────────────────
    if (name === "search_owner") {
      const { query } = args;
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
      const petList = patients.map((p: any) => `${p.name} (${p.species || "?"}, ID: ${p.id})`).join(", ");
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
      const doctors = await storage.getDoctors(branchId);
      const doctor = doctors.find((d: any) => d.id === doctorId);
      if (!doctor) return `Врач с ID ${doctorId} не найден.`;
      const appointmentDate = new Date(`${date}T${time}:00`);
      if (isNaN(appointmentDate.getTime())) return `Некорректная дата или время: ${date} ${time}`;
      const appointment = await storage.createAppointment({
        patientId, doctorId, branchId, tenantId, appointmentDate, duration, appointmentType,
        status: "scheduled", notes: notes || null,
      } as any);
      return JSON.stringify({
        success: true, appointmentId: appointment.id,
        summary: `Запись создана на ${formatDate(appointmentDate)} в ${time} к врачу ${doctor.name}. ID: ${appointment.id}`,
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
        id: patient.id, name: patient.name, species: patient.species,
        breed: patient.breed, birthDate: patient.birthDate,
        gender: patient.gender, color: patient.color, weight: patient.weight,
      });
    }

    // ──── СЧЕТА И ОПЛАТА ─────────────────────────────────────────────────────

    if (name === "get_owner_invoices") {
      const { ownerId, status = "all" } = args;

      // Get all patients for this owner, then their invoices
      const patients = await storage.getPatientsByOwner(ownerId, branchId);
      if (patients.length === 0) return `У владельца нет пациентов в этом филиале.`;

      const allInvoices: any[] = [];
      for (const patient of patients) {
        const invoices = await storage.getInvoicesByPatient(patient.id, branchId);
        for (const inv of invoices) {
          allInvoices.push({ ...inv, patientName: patient.name, patientSpecies: patient.species });
        }
      }

      // Also check invoices via direct query for owner
      const ownerInvoicesResult = await pool.query(`
        SELECT i.*, p.name as patient_name, p.species as patient_species
        FROM invoices i
        LEFT JOIN patients p ON i.patient_id = p.id
        LEFT JOIN patient_owners po ON po.patient_id = p.id
        WHERE po.owner_id = $1 AND p.branch_id = $2
        ORDER BY i.issue_date DESC
        LIMIT 20
      `, [ownerId, branchId]);

      const invoices = ownerInvoicesResult.rows.length > 0
        ? ownerInvoicesResult.rows
        : allInvoices;

      const filtered = status === "all" ? invoices :
        invoices.filter((i: any) => i.status === status);

      if (filtered.length === 0) {
        const statusLabel = status === "pending" ? "неоплаченных" : status === "paid" ? "оплаченных" : "";
        return `У владельца нет ${statusLabel} счетов.`;
      }

      const totalPending = filtered
        .filter((i: any) => i.status === "pending" || i.status === "draft")
        .reduce((sum: number, i: any) => sum + parseFloat(i.total || "0"), 0);

      const lines = filtered.slice(0, 10).map((i: any) => {
        const statusLabel = i.status === "paid" ? "✓ оплачен" : i.status === "cancelled" ? "✗ отменён" : "⏳ ожидает оплаты";
        return `  Счёт №${i.invoice_number || i.invoiceNumber} | ${i.patient_name || i.patientName || "?"} | ${formatMoney(i.total)} | ${statusLabel} | ID: ${i.id}`;
      });

      return [
        `Счета владельца (${filtered.length} шт.):`,
        ...lines,
        totalPending > 0 ? `\nИтого к оплате: ${formatMoney(totalPending)}` : "",
      ].join("\n");
    }

    if (name === "get_invoice_details") {
      const { invoiceId } = args;
      const invoice = await storage.getInvoice(invoiceId);
      if (!invoice) return `Счёт с ID ${invoiceId} не найден.`;

      const items = await storage.getInvoiceItems(invoiceId);
      const statusLabel = invoice.status === "paid" ? "ОПЛАЧЕН" :
        invoice.status === "cancelled" ? "ОТМЕНЁН" : "ОЖИДАЕТ ОПЛАТЫ";

      const itemLines = items.map((item: any) =>
        `  • ${item.name || item.description || "Услуга"} × ${item.quantity} = ${formatMoney(item.total)}`
      );

      return [
        `Счёт №${invoice.invoiceNumber} [${statusLabel}]`,
        `Дата: ${formatDate(invoice.issueDate)}`,
        `Услуги:`,
        ...itemLines,
        `Итого: ${formatMoney(invoice.total)}`,
        invoice.discount ? `Скидка: ${formatMoney(invoice.discount)}` : "",
        invoice.paymentMethod ? `Способ оплаты: ${invoice.paymentMethod}` : "",
        invoice.paidDate ? `Дата оплаты: ${formatDate(invoice.paidDate)}` : "",
      ].filter(Boolean).join("\n");
    }

    if (name === "process_payment") {
      const { invoiceId, paymentMethod, amount } = args;
      const invoice = await storage.getInvoice(invoiceId);
      if (!invoice) return `Счёт с ID ${invoiceId} не найден.`;
      if (invoice.status === "paid") return `Счёт №${invoice.invoiceNumber} уже оплачен.`;
      if (invoice.status === "cancelled") return `Счёт №${invoice.invoiceNumber} отменён и не может быть оплачен.`;

      const paymentMethodLabel: Record<string, string> = {
        cash: "наличными", card: "картой", transfer: "переводом",
      };

      const now = new Date();
      await storage.updateInvoice(invoiceId, {
        status: "paid",
        paymentMethod,
        paidDate: now,
      } as any);

      return JSON.stringify({
        success: true,
        invoiceId,
        invoiceNumber: invoice.invoiceNumber,
        total: invoice.total,
        paymentMethod,
        summary: `Счёт №${invoice.invoiceNumber} на сумму ${formatMoney(invoice.total)} оплачен ${paymentMethodLabel[paymentMethod] || paymentMethod}.`,
      });
    }

    if (name === "get_financial_summary") {
      const targetDate = args.date ? new Date(args.date) : new Date();
      const dateStr = targetDate.toISOString().split("T")[0];

      const result = await pool.query(`
        SELECT 
          COUNT(*) FILTER (WHERE status = 'paid') as paid_count,
          COALESCE(SUM(total::numeric) FILTER (WHERE status = 'paid'), 0) as paid_total,
          COUNT(*) FILTER (WHERE status = 'pending' OR status = 'draft') as pending_count,
          COALESCE(SUM(total::numeric) FILTER (WHERE status = 'pending' OR status = 'draft'), 0) as pending_total,
          COUNT(*) FILTER (WHERE status = 'paid' AND payment_method = 'cash') as cash_count,
          COALESCE(SUM(total::numeric) FILTER (WHERE status = 'paid' AND payment_method = 'cash'), 0) as cash_total,
          COUNT(*) FILTER (WHERE status = 'paid' AND payment_method = 'card') as card_count,
          COALESCE(SUM(total::numeric) FILTER (WHERE status = 'paid' AND payment_method = 'card'), 0) as card_total
        FROM invoices i
        LEFT JOIN patients p ON i.patient_id = p.id
        WHERE p.branch_id = $1
          AND DATE(i.issue_date) = $2
      `, [branchId, dateStr]);

      const row = result.rows[0];
      const lines = [
        `Финансовая сводка за ${formatDate(targetDate)}:`,
        `• Оплачено счетов: ${row.paid_count} шт. на ${formatMoney(row.paid_total)}`,
        `  - Наличными: ${row.cash_count} шт. (${formatMoney(row.cash_total)})`,
        `  - Картой: ${row.card_count} шт. (${formatMoney(row.card_total)})`,
        `• Ожидают оплаты: ${row.pending_count} шт. на ${formatMoney(row.pending_total)}`,
      ];

      return lines.join("\n");
    }

    return `Неизвестный инструмент: ${name}`;
  } catch (err: any) {
    console.error(`Tool ${name} error:`, err);
    return `Ошибка при выполнении ${name}: ${err.message}`;
  }
}

// ─── Основная функция ──────────────────────────────────────────────────────────

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

  const [todayAppts, doctors] = await Promise.all([
    storage.getAppointments(now, branchId),
    storage.getDoctors(branchId),
  ]);

  const clinicContext = buildClinicContext(todayAppts, doctors, now);

  const systemPrompt = `Ты — голосовой ИИ-ассистент администратора ветеринарной клиники VetSystem.
Ты помогаешь администратору управлять клиникой: расписание, запись, счета и оплата.

ТЕКУЩИЙ КОНТЕКСТ КЛИНИКИ:
${clinicContext}

ПРАВИЛА:
- Отвечай кратко и по делу (2-3 предложения максимум) — ответ будет озвучен голосом
- Говори на русском языке
- Используй инструменты для работы с данными — не выдумывай информацию
- При оплате: сначала найди владельца → покажи счета → уточни способ оплаты → проведи оплату
- После любого действия (запись, оплата) — подтверди голосом результат
- Для финансовой сводки используй get_financial_summary
- Способы оплаты: наличные (cash), карта (card), перевод (transfer)
- Суммы озвучивай в рублях`;

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
    ...history.slice(-10).map(m => ({ role: m.role, content: m.content } as OpenAI.Chat.ChatCompletionMessageParam)),
    { role: "user", content: text },
  ];

  const actions: { type: string; data: any }[] = [];

  let response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages,
    tools: TOOLS,
    tool_choice: "auto",
    max_tokens: 600,
    temperature: 0.4,
  });

  let iterations = 0;
  while (response.choices[0].finish_reason === "tool_calls" && iterations < 4) {
    iterations++;
    const assistantMessage = response.choices[0].message;
    messages.push(assistantMessage);

    const toolCalls = assistantMessage.tool_calls || [];

    const toolResults = await Promise.all(
      toolCalls.map(async (tc) => {
        const args = JSON.parse(tc.function.arguments);
        const result = await executeTool(tc.function.name, args, branchId, tenantId);

        if (tc.function.name === "book_appointment") {
          try { const p = JSON.parse(result); if (p.success) actions.push({ type: "appointment_booked", data: p }); } catch {}
        }
        if (tc.function.name === "cancel_appointment") {
          actions.push({ type: "appointment_cancelled", data: { appointmentId: args.appointmentId } });
        }
        if (tc.function.name === "process_payment") {
          try { const p = JSON.parse(result); if (p.success) actions.push({ type: "payment_processed", data: p }); } catch {}
        }

        return { toolCallId: tc.id, result };
      })
    );

    for (const { toolCallId, result } of toolResults) {
      messages.push({ role: "tool", tool_call_id: toolCallId, content: result });
    }

    response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages,
      tools: TOOLS,
      tool_choice: "auto",
      max_tokens: 600,
      temperature: 0.4,
    });
  }

  const finalText = response.choices[0].message.content || "Не могу обработать запрос.";
  return { response: finalText, actions };
}
