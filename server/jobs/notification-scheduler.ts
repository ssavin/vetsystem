import cron from 'node-cron';
import { storage } from '../storage';
import type { InsertBillingNotification } from '../../shared/schema';

/**
 * Проверяет подписки и создаёт уведомления об окончании
 * Запускается каждый день в 9:00 утра
 */
export function startNotificationScheduler() {
  // Запуск проверки истекающих подписок каждый день в 9:00 UTC
  cron.schedule('0 9 * * *', async () => {
    console.log('[Notification Scheduler] Running expiration check...');
    
    try {
      await checkExpiringSubscriptions();
    } catch (error) {
      console.error('[Notification Scheduler] Error in expiration check:', error);
    }
  }, {
    timezone: 'UTC'
  });

  // Запуск проверки истёкших подписок каждый день в 1:00 UTC
  cron.schedule('0 1 * * *', async () => {
    console.log('[Notification Scheduler] Running expired subscriptions check...');
    
    try {
      await checkExpiredSubscriptions();
    } catch (error) {
      console.error('[Notification Scheduler] Error in expired check:', error);
    }
  }, {
    timezone: 'UTC'
  });

  console.log('[Notification Scheduler] Started - expiration check at 9:00 AM UTC, expired check at 1:00 AM UTC');

  // Запуск проверки сразу при старте (в фоновом режиме)
  setTimeout(async () => {
    console.log('[Notification Scheduler] Running initial checks...');
    try {
      await checkExpiredSubscriptions();
      await checkExpiringSubscriptions();
      console.log('[Notification Scheduler] Initial checks completed');
    } catch (error) {
      console.error('[Notification Scheduler] Error in initial checks:', error);
    }
  }, 5000); // Задержка 5 секунд чтобы дать серверу запуститься
}

/**
 * Проверяет подписки которые истекают через 3 дня и создаёт уведомления
 */
export async function checkExpiringSubscriptions() {
  try {
    // Дата через 3 дня
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + 3);
    targetDate.setHours(0, 0, 0, 0);

    // Дата через 4 дня (для диапазона)
    const nextDay = new Date(targetDate);
    nextDay.setDate(nextDay.getDate() + 1);

    // Получаем все активные подписки
    const allSubscriptions = await storage.getClinicSubscriptions();

    let notificationsCreated = 0;
    let notificationsSkipped = 0;

    for (const subscription of allSubscriptions) {
      // Пропускаем неактивные подписки
      if (subscription.status !== 'active') {
        continue;
      }

      // Пропускаем подписки без даты окончания
      if (!subscription.endDate) {
        continue;
      }

      const endDate = new Date(subscription.endDate);
      endDate.setHours(0, 0, 0, 0);

      // Проверяем что подписка истекает через 3 дня
      if (endDate.getTime() !== targetDate.getTime()) {
        continue;
      }

      // Проверяем что такое уведомление ещё не создано
      const existingNotifications = await storage.getBillingNotifications(subscription.id);
      const hasWarning = existingNotifications.some(
        n => n.type === 'expiry_warning_3days' && 
        new Date(n.createdAt).toDateString() === new Date().toDateString()
      );

      if (hasWarning) {
        notificationsSkipped++;
        continue;
      }

      // Создаём уведомление
      const notification: InsertBillingNotification = {
        subscriptionId: subscription.id,
        type: 'expiry_warning_3days',
        message: `Ваша подписка истекает ${endDate.toLocaleDateString('ru-RU')}. Пожалуйста, продлите подписку для продолжения работы.`,
        scheduledFor: new Date(),
        isSent: false,
        metadata: {
          subscriptionId: subscription.id,
          branchId: subscription.branchId,
          planId: subscription.planId,
          endDate: subscription.endDate,
          warningDays: 3
        }
      };

      await storage.createBillingNotification(notification);
      notificationsCreated++;

      console.log(`[Notification Scheduler] Created expiration warning for subscription ${subscription.id} (branch: ${subscription.branchId})`);
    }

    console.log(`[Notification Scheduler] Completed: ${notificationsCreated} notifications created, ${notificationsSkipped} skipped`);
  } catch (error) {
    console.error('[Notification Scheduler] Error checking expiring subscriptions:', error);
    throw error;
  }
}

/**
 * Проверяет истёкшие подписки и создаёт уведомления
 */
export async function checkExpiredSubscriptions() {
  try {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const allSubscriptions = await storage.getClinicSubscriptions();

    let expiredCount = 0;

    for (const subscription of allSubscriptions) {
      // Пропускаем уже неактивные подписки
      if (subscription.status !== 'active') {
        continue;
      }

      if (!subscription.endDate) {
        continue;
      }

      const endDate = new Date(subscription.endDate);
      endDate.setHours(0, 0, 0, 0);

      // Проверяем что подписка истекла
      if (endDate.getTime() >= now.getTime()) {
        continue;
      }

      // Обновляем статус подписки
      await storage.updateClinicSubscription(subscription.id, {
        status: 'expired'
      });

      // Создаём уведомление об истечении
      const notification: InsertBillingNotification = {
        subscriptionId: subscription.id,
        type: 'expired',
        message: `Ваша подписка истекла ${endDate.toLocaleDateString('ru-RU')}. Пожалуйста, оформите новую подписку для продолжения работы.`,
        scheduledFor: new Date(),
        isSent: false,
        metadata: {
          subscriptionId: subscription.id,
          branchId: subscription.branchId,
          planId: subscription.planId,
          endDate: subscription.endDate
        }
      };

      await storage.createBillingNotification(notification);
      expiredCount++;

      console.log(`[Notification Scheduler] Marked subscription ${subscription.id} as expired (branch: ${subscription.branchId})`);
    }

    console.log(`[Notification Scheduler] Expired subscriptions check completed: ${expiredCount} subscriptions expired`);
  } catch (error) {
    console.error('[Notification Scheduler] Error checking expired subscriptions:', error);
    throw error;
  }
}
