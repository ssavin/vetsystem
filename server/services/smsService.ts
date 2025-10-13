import bcrypt from 'bcryptjs';
import { storage } from '../storage';
import type { InsertSmsVerificationCode } from '@shared/schema';

interface SmsRuResponse {
  status: string;
  status_code: number;
  status_text?: string;
  sms?: Record<string, {
    status: string;
    status_code: number;
    sms_id?: string;
  }>;
  balance?: number;
}

const SMSRU_API_URL = 'https://sms.ru/sms/send';
const SMSRU_API_KEY = process.env.SMSRU_API_KEY;

export const smsService = {
  /**
   * Generate random 6-digit verification code
   */
  generateCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  },

  /**
   * Send SMS via sms.ru API
   */
  async sendSms(phone: string, message: string): Promise<{ success: boolean; error?: string }> {
    if (!SMSRU_API_KEY) {
      console.error('❌ SMSRU_API_KEY not configured');
      // В режиме разработки - логируем SMS в консоль
      console.log(`📱 SMS to ${phone}: ${message} (sms.ru not configured)`);
      return { success: true }; // В dev режиме считаем успешным
    }

    try {
      const params = new URLSearchParams({
        api_id: SMSRU_API_KEY,
        to: phone,
        msg: message,
        json: '1'
      });

      const response = await fetch(`${SMSRU_API_URL}?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      const data: SmsRuResponse = await response.json();

      if (data.status === 'OK' && data.status_code === 100) {
        console.log(`✅ SMS sent successfully to ${phone} (balance: ${data.balance})`);
        return { success: true };
      } else {
        const errorMessage = data.status_text || `SMS.RU error: ${data.status_code}`;
        console.error(`❌ SMS.RU error:`, errorMessage);
        return { success: false, error: errorMessage };
      }
    } catch (error) {
      console.error('❌ Error sending SMS via sms.ru:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to send SMS' 
      };
    }
  },

  /**
   * Send SMS verification code (for users - staff)
   */
  async sendVerificationCode(
    userId: string,
    phone: string,
    purpose: 'phone_verification' | '2fa'
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const code = this.generateCode();
      const codeHash = await bcrypt.hash(code, 10);

      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + 10);

      const verificationCode: InsertSmsVerificationCode = {
        userId,
        phone,
        codeHash,
        purpose,
        expiresAt,
        attemptCount: 0,
      };

      await storage.createSmsVerificationCode(verificationCode);

      // Отправляем SMS через sms.ru API
      const message = `Ваш код подтверждения: ${code}`;
      const result = await this.sendSms(phone, message);

      if (!result.success) {
        return { success: false, error: result.error };
      }

      return { success: true };
    } catch (error) {
      console.error('Error sending SMS code:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to send SMS' 
      };
    }
  },

  /**
   * Send SMS verification code for mobile login (for owners - clients)
   */
  async sendMobileLoginCode(
    ownerId: string,
    phone: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const code = this.generateCode();
      const codeHash = await bcrypt.hash(code, 10);

      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + 10);

      const verificationCode: InsertSmsVerificationCode = {
        ownerId,
        phone,
        codeHash,
        purpose: 'mobile_login',
        expiresAt,
        attemptCount: 0,
      };

      await storage.createSmsVerificationCode(verificationCode);

      // Отправляем SMS через sms.ru API
      const message = `Ваш код подтверждения: ${code}`;
      const result = await this.sendSms(phone, message);

      if (!result.success) {
        return { success: false, error: result.error };
      }

      return { success: true };
    } catch (error) {
      console.error('Error sending mobile login SMS code:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to send SMS' 
      };
    }
  },

  /**
   * Verify SMS code (for users - staff)
   */
  async verifyCode(
    userId: string,
    code: string,
    purpose: 'phone_verification' | '2fa'
  ): Promise<boolean> {
    return await storage.verifySmsCode(userId, code, purpose);
  },

  /**
   * Verify mobile login code (for owners - clients)
   */
  async verifyMobileLoginCode(
    ownerId: string,
    code: string
  ): Promise<boolean> {
    return await storage.verifyMobileSmsCode(ownerId, code);
  },
};
