import cron from 'node-cron';
import { storage } from '../storage';
import { db } from '../db-local';
import { sql } from 'drizzle-orm';

export function startCrmSegmentScheduler() {
  cron.schedule('0 2 * * *', async () => {
    try {
      console.log('[CRM Segments] Starting daily per-tenant segment recalculation...');

      // Get distinct tenant IDs from owners table
      const rows = await db.execute(sql`
        SELECT DISTINCT tenant_id FROM owners WHERE tenant_id IS NOT NULL
      `);
      const tenantIds: string[] = (rows.rows as Array<{ tenant_id: string }>)
        .map((r) => r.tenant_id)
        .filter(Boolean);

      if (tenantIds.length === 0) {
        console.log('[CRM Segments] No tenants found, skipping.');
        return;
      }

      let totalUpdated = 0;
      let errorCount = 0;

      for (const tenantId of tenantIds) {
        try {
          const result = await storage.recalculateOwnerSegments(tenantId);
          totalUpdated += result.updated;
          console.log(`[CRM Segments] Tenant ${tenantId}: updated ${result.updated} segments`);
        } catch (err) {
          console.error(`[CRM Segments] Error for tenant ${tenantId}:`, err);
          errorCount++;
        }
      }

      console.log(
        `[CRM Segments] Daily recalculation complete — ${tenantIds.length} tenants, ` +
        `${totalUpdated} total updated, ${errorCount} errors`
      );
    } catch (error) {
      console.error('[CRM Segments] Error during daily recalculation:', error);
    }
  }, {
    timezone: 'UTC'
  });

  console.log('[CRM Segments] Scheduler started - runs daily at 02:00 UTC');
}
