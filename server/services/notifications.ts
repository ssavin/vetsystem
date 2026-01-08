import nodemailer from 'nodemailer';

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587');
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const NOTIFICATION_EMAIL = process.env.NOTIFICATION_EMAIL || 'info@vetsystemai.ru';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

interface DemoRequestData {
  fullName: string;
  clinicName: string;
  phone: string;
  email: string;
  city?: string;
  branchCount?: string;
  currentSystem?: string;
  comment?: string;
}

export async function sendDemoRequestEmail(data: DemoRequestData): Promise<boolean> {
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    console.log('⚠️ Email not configured - skipping email notification');
    return false;
  }

  console.log(`📧 SMTP Config: host=${SMTP_HOST}, port=${SMTP_PORT}, user=${SMTP_USER}`);

  try {
    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
    });

    const htmlContent = `
      <h2>Новая заявка на демонстрацию VetSystem</h2>
      <table style="border-collapse: collapse; width: 100%; max-width: 600px;">
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">ФИО</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${data.fullName}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Клиника</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${data.clinicName}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Телефон</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${data.phone}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Email</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${data.email}</td>
        </tr>
        ${data.city ? `
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Город</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${data.city}</td>
        </tr>` : ''}
        ${data.branchCount ? `
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Кол-во филиалов</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${data.branchCount}</td>
        </tr>` : ''}
        ${data.currentSystem ? `
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Текущая система</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${data.currentSystem}</td>
        </tr>` : ''}
        ${data.comment ? `
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Комментарий</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${data.comment}</td>
        </tr>` : ''}
      </table>
      <p style="color: #666; margin-top: 20px;">Дата: ${new Date().toLocaleString('ru-RU')}</p>
    `;

    await transporter.sendMail({
      from: SMTP_USER,
      to: NOTIFICATION_EMAIL,
      subject: `🏥 Новая заявка: ${data.clinicName}`,
      html: htmlContent,
    });

    console.log('✅ Demo request email sent successfully');
    return true;
  } catch (error) {
    console.error('❌ Failed to send demo request email:', error);
    return false;
  }
}

export async function sendDemoRequestTelegram(data: DemoRequestData): Promise<boolean> {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.log('⚠️ Telegram not configured - skipping Telegram notification');
    return false;
  }

  try {
    const message = `
🏥 *Новая заявка на демонстрацию*

👤 *ФИО:* ${escapeMarkdown(data.fullName)}
🏢 *Клиника:* ${escapeMarkdown(data.clinicName)}
📞 *Телефон:* ${escapeMarkdown(data.phone)}
📧 *Email:* ${escapeMarkdown(data.email)}
${data.city ? `📍 *Город:* ${escapeMarkdown(data.city)}` : ''}
${data.branchCount ? `🔢 *Филиалы:* ${escapeMarkdown(data.branchCount)}` : ''}
${data.currentSystem ? `💻 *Система:* ${escapeMarkdown(data.currentSystem)}` : ''}
${data.comment ? `💬 *Комментарий:* ${escapeMarkdown(data.comment)}` : ''}

📅 ${new Date().toLocaleString('ru-RU')}
    `.trim();

    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: 'Markdown',
      }),
    });

    if (!response.ok) {
      throw new Error(`Telegram API error: ${response.status}`);
    }

    console.log('✅ Demo request Telegram notification sent successfully');
    return true;
  } catch (error) {
    console.error('❌ Failed to send Telegram notification:', error);
    return false;
  }
}

function escapeMarkdown(text: string): string {
  return text.replace(/[_*[\]()~`>#+=|{}.!-]/g, '\\$&');
}
