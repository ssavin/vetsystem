import cron from 'node-cron';
import { storage } from '../storage';

/**
 * Ежедневное добавление услуги "Сутки содержания" 
 * для всех активных пациентов в стационаре
 * 
 * Запускается каждый день в 00:00 по UTC
 */
export function startHospitalBillingScheduler() {
  // Запуск биллинга каждый день в полночь
  cron.schedule('0 0 * * *', async () => {
    try {
      console.log('[Hospital Billing] Starting daily billing for inpatient stays...');
      
      // Получаем все активные госпитализации
      const activeStays = await storage.getActiveHospitalStays();
      
      if (activeStays.length === 0) {
        console.log('[Hospital Billing] No active hospital stays found');
        return;
      }

      let successCount = 0;
      let errorCount = 0;

      for (const stay of activeStays) {
        try {
          // Получаем настройку с ID услуги "Сутки содержания" для данного филиала
          // Ключ формата: HOSPITAL_DAILY_SERVICE_ID_{tenantId}_{branchId}
          const settingKey = `HOSPITAL_DAILY_SERVICE_ID_${stay.tenantId}_${stay.branchId}`;
          const dailyServiceSetting = await storage.getSystemSetting(settingKey);

          if (!dailyServiceSetting?.value) {
            console.warn(
              `[Hospital Billing] No daily service configured for tenant ${stay.tenantId}, branch ${stay.branchId}. ` +
              `Setting key: ${settingKey}. Skipping hospital stay ${stay.id}`
            );
            continue;
          }

          const serviceId = dailyServiceSetting.value;

          // Проверяем, существует ли услуга
          const service = await storage.getService(serviceId);
          if (!service) {
            console.error(
              `[Hospital Billing] Service ${serviceId} not found for hospital stay ${stay.id}. ` +
              `Check ${settingKey} setting.`
            );
            errorCount++;
            continue;
          }

          // Добавляем услугу в счёт
          await storage.createInvoiceItem({
            invoiceId: stay.activeInvoiceId,
            itemType: 'service',
            itemId: serviceId,
            itemName: service.name,
            quantity: 1,
            price: service.price,
            total: service.price
          });

          // Обновляем общую сумму счёта
          const invoiceItems = await storage.getInvoiceItems(stay.activeInvoiceId);
          const newTotal = invoiceItems.reduce((sum, item) => sum + parseFloat(item.total), 0);
          await storage.updateInvoice(stay.activeInvoiceId, { 
            total: newTotal.toFixed(2),
            subtotal: newTotal.toFixed(2)
          });

          successCount++;
          console.log(
            `[Hospital Billing] Added daily service to invoice ${stay.activeInvoiceId} ` +
            `for patient ${stay.patientId} (${service.name}: ${service.price}₽)`
          );
        } catch (stayError) {
          console.error(`[Hospital Billing] Error processing stay ${stay.id}:`, stayError);
          errorCount++;
        }
      }

      console.log(
        `[Hospital Billing] Daily billing completed: ${successCount} successful, ${errorCount} errors`
      );
    } catch (error) {
      console.error('[Hospital Billing] Error during daily billing:', error);
    }
  }, {
    timezone: 'UTC'
  });

  console.log('[Hospital Billing] Scheduler started - runs daily at 00:00 UTC');
}
