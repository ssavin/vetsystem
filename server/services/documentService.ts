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
  async buildInvoiceContext(invoiceId: string, tenantId: string, branchId: string): Promise<any> {
    // Fetch invoice with items (storage methods enforce tenant isolation via RLS)
    const invoice = await storage.getInvoice(invoiceId);
    if (!invoice) {
      throw new Error(`Invoice not found: ${invoiceId}`);
    }

    // Verify tenant ownership
    if (invoice.tenantId !== tenantId) {
      throw new Error('Access denied: Invoice belongs to different tenant');
    }

    // Verify branch ownership
    if (invoice.branchId !== branchId) {
      throw new Error('Access denied: Invoice belongs to different branch');
    }

    const items = await storage.getInvoiceItems(invoiceId);
    
    // Fetch client/patient info
    let clientInfo: any = { name: 'Не указан', phone: '' };
    if (invoice.customerId) {
      const customer = await storage.getCustomer(invoice.customerId);
      if (customer) {
        clientInfo = {
          name: customer.name,
          phone: customer.phone || ''
        };
      }
    } else if (invoice.ownerId) {
      const owner = await storage.getOwner(invoice.ownerId);
      if (owner) {
        clientInfo = {
          name: owner.fullName,
          phone: owner.phone || ''
        };
      }
    }

    // Fetch branch/clinic info
    let clinicInfo: any = {
      name: 'Ветеринарная клиника',
      address: '',
      phone: '',
      email: ''
    };
    
    if (invoice.branchId) {
      const branch = await storage.getBranch(invoice.branchId);
      if (branch) {
        clinicInfo = {
          name: branch.name,
          address: branch.address || '',
          phone: branch.phone || '',
          email: branch.email || ''
        };
      }
    }

    // Map items
    const mappedItems = items.map((item: any) => ({
      name: item.itemName,
      quantity: item.quantity,
      price: parseFloat(item.price.toString()),
      total: parseFloat(item.total.toString())
    }));

    // Calculate totals
    const subtotal = parseFloat(invoice.subtotal.toString());
    const tax = parseFloat(invoice.taxAmount.toString());
    const total = parseFloat(invoice.total.toString());

    return {
      invoiceNumber: invoice.invoiceNumber,
      date: new Date(invoice.invoiceDate).toLocaleDateString('ru-RU'),
      clinic: clinicInfo,
      client: clientInfo,
      items: mappedItems,
      subtotal,
      tax,
      total
    };
  }

  /**
   * Build context data for medical encounter summary
   */
  async buildEncounterSummaryContext(encounterId: string, tenantId: string, branchId: string): Promise<any> {
    // Fetch medical record (storage methods enforce tenant isolation via RLS)
    const record = await storage.getMedicalRecord(encounterId);
    if (!record) {
      throw new Error(`Medical record not found: ${encounterId}`);
    }

    // Verify tenant ownership
    if (record.tenantId !== tenantId) {
      throw new Error('Access denied: Medical record belongs to different tenant');
    }

    // Verify branch ownership (medical records can be cross-branch accessible, but verify tenant)
    if (record.branchId !== branchId) {
      throw new Error('Access denied: Medical record belongs to different branch');
    }

    // Fetch patient info
    const patient = await storage.getPatient(record.patientId);
    if (!patient) {
      throw new Error(`Patient not found: ${record.patientId}`);
    }

    // Fetch owner info (get primary owner)
    const owners = await storage.getPatientOwners(record.patientId);
    const primaryOwner = owners.find((o: any) => o.isPrimary) || owners[0];
    
    let ownerInfo: any = { name: 'Не указан', phone: '' };
    if (primaryOwner) {
      ownerInfo = {
        name: primaryOwner.fullName,
        phone: primaryOwner.phone || ''
      };
    }

    // Fetch doctor info
    let doctorInfo: any = { name: 'Не указан', specialization: '' };
    if (record.doctorId) {
      const doctor = await storage.getDoctor(record.doctorId);
      if (doctor) {
        doctorInfo = {
          name: doctor.fullName,
          specialization: doctor.specialization || ''
        };
      }
    }

    // Calculate patient age
    const calculateAge = (birthDate: Date | null) => {
      if (!birthDate) return 'Не указан';
      const today = new Date();
      const birth = new Date(birthDate);
      const years = today.getFullYear() - birth.getFullYear();
      const months = today.getMonth() - birth.getMonth();
      
      if (years === 0) {
        return `${months} мес.`;
      } else if (months < 0) {
        return `${years - 1} ${years - 1 === 1 ? 'год' : 'лет'}`;
      }
      return `${years} ${years === 1 ? 'год' : years < 5 ? 'года' : 'лет'}`;
    };

    // Build patient info
    const patientInfo = {
      name: patient.name,
      species: patient.species,
      breed: patient.breed || 'Не указана',
      age: calculateAge(patient.dateOfBirth)
    };

    // Parse treatment array
    const treatment = Array.isArray(record.treatment) 
      ? record.treatment 
      : (record.treatment ? [record.treatment] : []);

    return {
      date: new Date(record.date).toLocaleDateString('ru-RU'),
      patient: patientInfo,
      owner: ownerInfo,
      doctor: doctorInfo,
      complaints: record.complaints || 'Не указаны',
      diagnosis: record.diagnosis || 'Не указан',
      treatment: treatment.length > 0 ? treatment : ['Не назначено'],
      recommendations: record.notes || 'Нет дополнительных рекомендаций'
    };
  }
}

export const documentService = new DocumentService();
