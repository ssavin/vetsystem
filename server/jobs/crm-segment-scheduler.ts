import cron from 'node-cron';
import { storage } from '../storage';

export function startCrmSegmentScheduler() {
  cron.schedule('0 2 * * *', async () => {
    try {
      console.log('[CRM Segments] Starting daily segment recalculation for all tenants...');
      const result = await storage.recalculateClientSegments();
      console.log(`[CRM Segments] Daily recalculation complete — updated: ${result.updated}`);
    } catch (error) {
      console.error('[CRM Segments] Error during daily recalculation:', error);
    }
  }, {
    timezone: 'UTC'
  });

  console.log('[CRM Segments] Scheduler started - runs daily at 02:00 UTC');
}
