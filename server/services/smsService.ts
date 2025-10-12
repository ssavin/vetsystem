import bcrypt from 'bcryptjs';
import { storage } from '../storage';
import type { InsertSmsVerificationCode } from '@shared/schema';

// Placeholder for Twilio - будет заменено после настройки интеграции
let twilioClient: any = null;

export const smsService = {
  /**
   * Initialize Twilio client (будет вызвано после настройки интеграции)
   */
  async initTwilio(accountSid: string, authToken: string, fromNumber: string) {
    const twilio = await import('twilio');
    twilioClient = twilio.default(accountSid, authToken);
    return { fromNumber };
  },

  /**
   * Generate random 6-digit verification code
   */
  generateCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  },

  /**
   * Send SMS verification code
   */
  async sendVerificationCode(
    userId: string,
    phone: string,
    purpose: 'phone_verification' | '2fa' | 'mobile_login'
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

      // TODO: После настройки Twilio - отправить реальный SMS
      if (twilioClient) {
        // await twilioClient.messages.create({
        //   body: `Ваш код подтверждения: ${code}`,
        //   from: fromNumber,
        //   to: phone
        // });
        console.log(`📱 SMS sent to ${phone}: ${code}`);
      } else {
        // В режиме разработки - логируем код в консоль
        console.log(`📱 SMS Code for ${phone}: ${code} (Twilio not configured)`);
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
   * Verify SMS code
   */
  async verifyCode(
    userId: string,
    code: string,
    purpose: 'phone_verification' | '2fa' | 'mobile_login'
  ): Promise<boolean> {
    return await storage.verifySmsCode(userId, code, purpose);
  },
};
