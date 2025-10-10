import cron from 'node-cron';
import { storage } from '../storage';

/**
 * Очищает истекшие вызовы очереди
 * Запускается каждые 5 минут
 */
export function startQueueCleanupScheduler() {
  // Запуск очистки каждые 5 минут
  cron.schedule('*/5 * * * *', async () => {
    try {
      const deletedCount = await storage.expireOldQueueCalls();
      if (deletedCount > 0) {
        console.log(`[Queue Cleanup] Deleted ${deletedCount} expired queue calls`);
      }
    } catch (error) {
      console.error('[Queue Cleanup] Error cleaning up expired calls:', error);
    }
  }, {
    timezone: 'UTC'
  });

  console.log('[Queue Cleanup] Started - runs every 5 minutes');

  // Запуск очистки сразу при старте (в фоновом режиме)
  setTimeout(async () => {
    try {
      const deletedCount = await storage.expireOldQueueCalls();
      console.log(`[Queue Cleanup] Initial cleanup completed: ${deletedCount} expired calls deleted`);
    } catch (error) {
      console.error('[Queue Cleanup] Error in initial cleanup:', error);
    }
  }, 5000); // Задержка 5 секунд чтобы дать серверу запуститься
}
