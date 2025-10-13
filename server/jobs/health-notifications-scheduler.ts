import cron from 'node-cron';
import { Expo, ExpoPushMessage } from 'expo-server-sdk';
import { storage } from '../storage';

const expo = new Expo();

/**
 * Отправляет push-уведомление владельцу через Expo
 */
async function sendPushNotification(ownerId: string, title: string, body: string, data?: any) {
  try {
    // Получаем push-токены владельца
    const tokens = await storage.getPushTokensByOwner(ownerId);
    
    if (tokens.length === 0) {
      console.log(`[Health Notifications] No push tokens for owner ${ownerId}`);
      return;
    }

    const messages: ExpoPushMessage[] = [];

    for (const token of tokens) {
      // Проверяем валидность токена
      if (!Expo.isExpoPushToken(token.token)) {
        console.error(`[Health Notifications] Invalid push token: ${token.token}`);
        continue;
      }

      messages.push({
        to: token.token,
        sound: 'default',
        title,
        body,
        data: data || {},
        priority: 'high',
      });
    }

    if (messages.length === 0) {
      return;
    }

    // Отправляем уведомления
    const chunks = expo.chunkPushNotifications(messages);
    const tickets = [];

    for (const chunk of chunks) {
      try {
        const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
        tickets.push(...ticketChunk);
      } catch (error) {
        console.error('[Health Notifications] Error sending chunk:', error);
      }
    }

    console.log(`[Health Notifications] Sent ${tickets.length} notifications to owner ${ownerId}`);
  } catch (error) {
    console.error('[Health Notifications] Error sending push notification:', error);
  }
}

/**
 * Проверяет плановые вакцинации и визиты для конкретного тенанта
 */
async function checkHealthEventsForTenant() {
  try {
    const now = new Date();
    
    // Дата через 7 дней
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
    sevenDaysFromNow.setHours(0, 0, 0, 0);

    // Дата через 1 день
    const oneDayFromNow = new Date();
    oneDayFromNow.setDate(oneDayFromNow.getDate() + 1);
    oneDayFromNow.setHours(0, 0, 0, 0);

    let notificationsSent = 0;

    // Получаем appointments для текущего тенанта с фильтрацией по дате
    const upcomingAppointments = await storage.getUpcomingAppointments(sevenDaysFromNow, oneDayFromNow);

    for (const appointment of upcomingAppointments) {
      // Проверяем только будущие appointments со статусом "scheduled" или "confirmed"
      if (!['scheduled', 'confirmed'].includes(appointment.status || '')) {
        continue;
      }

      const appointmentDate = new Date(appointment.appointmentDate);
      appointmentDate.setHours(0, 0, 0, 0);

      // Получаем данные пациента и владельцев
      const patientData = await storage.getPatient(appointment.patientId);
      if (!patientData || !patientData.ownerId) continue;

      const isVaccination = appointment.appointmentType?.toLowerCase().includes('вакцин') || 
                           appointment.appointmentType?.toLowerCase().includes('vaccination');

      let message = '';
      let daysAhead = 0;

      // Проверяем через 7 дней
      if (appointmentDate.getTime() === sevenDaysFromNow.getTime()) {
        daysAhead = 7;
        message = isVaccination 
          ? `Напоминаем о вакцинации для ${patientData.name} через 7 дней (${appointmentDate.toLocaleDateString('ru-RU')})`
          : `Напоминаем о приёме для ${patientData.name} через 7 дней (${appointmentDate.toLocaleDateString('ru-RU')})`;
      }

      // Проверяем завтра
      if (appointmentDate.getTime() === oneDayFromNow.getTime()) {
        daysAhead = 1;
        message = isVaccination 
          ? `Напоминаем о вакцинации для ${patientData.name} завтра (${appointmentDate.toLocaleDateString('ru-RU')})`
          : `Напоминаем о приёме для ${patientData.name} завтра (${appointmentDate.toLocaleDateString('ru-RU')})`;
      }

      if (message && daysAhead > 0) {
        await sendPushNotification(
          patientData.ownerId,
          `Напоминание о ${isVaccination ? 'вакцинации' : 'приёме'}`,
          message,
          {
            type: isVaccination ? 'vaccination' : 'visit',
            patientName: patientData.name,
            appointmentId: appointment.id,
            date: appointmentDate.toISOString(),
            daysAhead,
          }
        );
        notificationsSent++;
      }
    }

    console.log(`[Health Notifications] Sent ${notificationsSent} notifications for upcoming appointments`);
  } catch (error) {
    console.error('[Health Notifications] Error checking health events:', error);
  }
}

/**
 * Запускает scheduler для health notifications
 */
export function startHealthNotificationsScheduler() {
  // Запуск проверки каждый день в 10:00 UTC (13:00 MSK)
  cron.schedule('0 10 * * *', async () => {
    console.log('[Health Notifications] Running scheduled health check...');
    
    try {
      await checkHealthEventsForTenant();
    } catch (error) {
      console.error('[Health Notifications] Error in scheduled check:', error);
    }
  }, {
    timezone: 'UTC'
  });

  console.log('[Health Notifications] Started - health check at 10:00 AM UTC (1:00 PM MSK)');

  // Запуск проверки сразу при старте (в фоновом режиме)
  setTimeout(async () => {
    console.log('[Health Notifications] Running initial health check...');
    try {
      await checkHealthEventsForTenant();
      console.log('[Health Notifications] Initial health check completed');
    } catch (error) {
      console.error('[Health Notifications] Error in initial check:', error);
    }
  }, 10000); // Задержка 10 секунд чтобы дать серверу запуститься
}
