import Handlebars from 'handlebars';
import puppeteer from 'puppeteer';
import { storage } from '../storage';

/**
 * Document Service
 * Handles template rendering and PDF generation using Handlebars and Puppeteer
 */
export class DocumentService {
  /**
   * Render HTML from template and context data
   */
  async renderTemplate(templateType: string, tenantId: string | null, context: any): Promise<string> {
    // Get template with fallback logic (tenant -> system)
    const template = await storage.getDocumentTemplate(templateType, tenantId);
    
    if (!template) {
      throw new Error(`Template not found: ${templateType}`);
    }

    // Compile and render template
    const compiledTemplate = Handlebars.compile(template.content);
    const html = compiledTemplate(context);
    
    return html;
  }

  /**
   * Generate PDF from HTML
   */
  async generatePDF(html: string): Promise<Buffer> {
    let browser;
    
    try {
      // Launch headless browser
      browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu'
        ]
      });

      const page = await browser.newPage();
      
      // Set content and wait for network to be idle
      await page.setContent(html, {
        waitUntil: 'networkidle0'
      });

      // Generate PDF with A4 format
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20mm',
          right: '15mm',
          bottom: '20mm',
          left: '15mm'
        }
      });

      return Buffer.from(pdfBuffer);
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  /**
   * Build context data for invoice template
   */
  async buildInvoiceContext(invoiceId: string): Promise<any> {
    // TODO: Implement invoice context gathering
    // This is a placeholder - implement actual data gathering logic
    return {
      invoiceNumber: '00001',
      date: new Date().toLocaleDateString('ru-RU'),
      clinic: {
        name: 'Ветеринарная клиника',
        address: 'г. Москва, ул. Примерная, д. 1',
        phone: '+7 (495) 123-45-67',
        email: 'info@vetclinic.ru'
      },
      client: {
        name: 'Иванов Иван Иванович',
        phone: '+7 (999) 123-45-67'
      },
      items: [
        {
          name: 'Осмотр',
          quantity: 1,
          price: 1000,
          total: 1000
        }
      ],
      subtotal: 1000,
      tax: 200,
      total: 1200
    };
  }

  /**
   * Build context data for medical encounter summary
   */
  async buildEncounterSummaryContext(encounterId: string): Promise<any> {
    // TODO: Implement encounter summary context gathering
    return {
      date: new Date().toLocaleDateString('ru-RU'),
      patient: {
        name: 'Барсик',
        species: 'Кошка',
        breed: 'Британская',
        age: '3 года'
      },
      owner: {
        name: 'Иванов Иван Иванович',
        phone: '+7 (999) 123-45-67'
      },
      doctor: {
        name: 'Петров П.П.',
        specialization: 'Терапевт'
      },
      complaints: 'Вялость, отказ от еды',
      diagnosis: 'ОРВИ',
      treatment: [
        'Антибиотики 5 дней',
        'Витамины'
      ],
      recommendations: 'Покой, обильное питье'
    };
  }
}

export const documentService = new DocumentService();
