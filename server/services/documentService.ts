import Handlebars from 'handlebars';
import puppeteer from 'puppeteer';
import { storage } from '../storage';
import { execSync } from 'child_process';

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
   * Get Chromium executable path
   */
  private getChromiumPath(): string {
    try {
      const chromiumPath = execSync('which chromium', { encoding: 'utf-8' }).trim();
      return chromiumPath;
    } catch (error) {
      console.error('Failed to find chromium executable:', error);
      throw new Error('Chromium not found. Please ensure chromium is installed.');
    }
  }

  /**
   * Generate contract number in format ДОГ-YYYYMMDD-XXXX
   */
  private generateContractNumber(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const dateStr = `${year}${month}${day}`;
    
    // Use timestamp-based sequential number (last 4 digits of timestamp)
    const sequentialNumber = String(now.getTime()).slice(-4);
    
    return `ДОГ-${dateStr}-${sequentialNumber}`;
  }

  /**
   * Translate species from English to Russian
   */
  private translateSpecies(species: string): string {
    const speciesMap: Record<string, string> = {
      'dog': 'собака',
      'cat': 'кошка',
      'horse': 'лошадь',
      'bird': 'птица',
      'rodent': 'грызун',
      'rabbit': 'кролик',
      'reptile': 'рептилия',
      'exotic': 'экзотическое животное',
      'other': 'другое'
    };

    return speciesMap[species.toLowerCase()] || species;
  }

  /**
   * Convert number to Russian words
   */
  private numberToWords(num: number): string {
    const units = ['', 'один', 'два', 'три', 'четыре', 'пять', 'шесть', 'семь', 'восемь', 'девять'];
    const teens = ['десять', 'одиннадцать', 'двенадцать', 'тринадцать', 'четырнадцать', 
                   'пятнадцать', 'шестнадцать', 'семнадцать', 'восемнадцать', 'девятнадцать'];
    const tens = ['', '', 'двадцать', 'тридцать', 'сорок', 'пятьдесят', 
                  'шестьдесят', 'семьдесят', 'восемьдесят', 'девяносто'];
    const hundreds = ['', 'сто', 'двести', 'триста', 'четыреста', 'пятьсот', 
                      'шестьсот', 'семьсот', 'восемьсот', 'девятьсот'];

    if (num === 0) return 'ноль';
    
    const convertUnder1000 = (n: number): string => {
      let result = '';
      const h = Math.floor(n / 100);
      const t = Math.floor((n % 100) / 10);
      const u = n % 10;

      if (h > 0) result += hundreds[h] + ' ';
      if (t === 1) {
        result += teens[u] + ' ';
      } else {
        if (t > 0) result += tens[t] + ' ';
        if (u > 0) result += units[u] + ' ';
      }
      
      return result.trim();
    };

    const millions = Math.floor(num / 1000000);
    const thousands = Math.floor((num % 1000000) / 1000);
    const remainder = num % 1000;

    let result = '';

    if (millions > 0) {
      result += convertUnder1000(millions) + ' миллион';
      if (millions % 10 >= 2 && millions % 10 <= 4 && (millions % 100 < 10 || millions % 100 >= 20)) result += 'а';
      else if (millions % 10 === 0 || millions % 10 >= 5 || (millions % 100 >= 11 && millions % 100 <= 14)) result += 'ов';
      result += ' ';
    }

    if (thousands > 0) {
      let thousandsWord = convertUnder1000(thousands);
      // Replace for feminine gender - use word boundaries to avoid corrupting other words
      thousandsWord = thousandsWord.replace(/\bодин\b/g, 'одна').replace(/\bдва\b/g, 'две');
      result += thousandsWord + ' тысяч';
      const lastDigit = thousands % 10;
      const last2Digits = thousands % 100;
      if (lastDigit === 1 && last2Digits !== 11) result += 'а';
      else if (lastDigit >= 2 && lastDigit <= 4 && (last2Digits < 10 || last2Digits >= 20)) result += 'и';
      result += ' ';
    }

    if (remainder > 0 || (millions === 0 && thousands === 0)) {
      result += convertUnder1000(remainder);
    }

    return result.trim();
  }

  /**
   * Convert amount to words with currency
   */
  private amountToWords(amount: number): string {
    // Handle kopecks overflow correctly
    let rubles = Math.floor(amount);
    let kopecks = Math.round((amount - rubles) * 100);
    
    // If kopecks overflow, increment rubles
    if (kopecks >= 100) {
      rubles += 1;
      kopecks = 0;
    }

    let result = this.numberToWords(rubles);
    
    // Add correct word form for rubles
    const lastDigit = rubles % 10;
    const last2Digits = rubles % 100;
    
    if (lastDigit === 1 && last2Digits !== 11) {
      result += ' рубль';
    } else if (lastDigit >= 2 && lastDigit <= 4 && (last2Digits < 10 || last2Digits >= 20)) {
      result += ' рубля';
    } else {
      result += ' рублей';
    }

    // Add kopecks
    result += ' ' + String(kopecks).padStart(2, '0') + ' ';
    
    const kopLastDigit = kopecks % 10;
    const kopLast2Digits = kopecks % 100;
    
    if (kopLastDigit === 1 && kopLast2Digits !== 11) {
      result += 'копейка';
    } else if (kopLastDigit >= 2 && kopLastDigit <= 4 && (kopLast2Digits < 10 || kopLast2Digits >= 20)) {
      result += 'копейки';
    } else {
      result += 'копеек';
    }

    return result.charAt(0).toUpperCase() + result.slice(1);
  }

  /**
   * Get clinic information with legal entity requisites
   */
  private async getClinicInfoWithLegalEntity(branchId: string): Promise<any> {
    const defaultInfo = {
      name: 'Ветеринарная клиника',
      address: '',
      phone: '',
      email: '',
      // Legal entity requisites
      legalName: null,
      inn: null,
      kpp: null,
      ogrn: null,
      legalAddress: null,
      actualAddress: null,
      bankName: null,
      bik: null,
      correspondentAccount: null,
      paymentAccount: null,
      directorName: null,
      veterinaryLicenseNumber: null,
      veterinaryLicenseIssueDate: null
    };

    if (!branchId) {
      return defaultInfo;
    }

    const branch = await storage.getBranch(branchId);
    if (!branch) {
      return defaultInfo;
    }

    // Start with branch info
    const clinicInfo: any = {
      name: branch.name,
      address: branch.address || '',
      phone: branch.phone || '',
      email: branch.email || '',
      legalName: null,
      inn: null,
      kpp: null,
      ogrn: null,
      legalAddress: null,
      actualAddress: null,
      bankName: null,
      bik: null,
      correspondentAccount: null,
      paymentAccount: null,
      directorName: null,
      veterinaryLicenseNumber: null,
      veterinaryLicenseIssueDate: null
    };

    // If branch has legal entity, load full requisites
    if (branch.legalEntityId) {
      const legalEntity = await storage.getLegalEntity(branch.legalEntityId);
      if (legalEntity && legalEntity.isActive) {
        clinicInfo.legalName = legalEntity.legalName;
        clinicInfo.inn = legalEntity.inn;
        clinicInfo.kpp = legalEntity.kpp;
        clinicInfo.ogrn = legalEntity.ogrn;
        clinicInfo.legalAddress = legalEntity.legalAddress;
        clinicInfo.actualAddress = legalEntity.actualAddress;
        clinicInfo.bankName = legalEntity.bankName;
        clinicInfo.bik = legalEntity.bik;
        clinicInfo.correspondentAccount = legalEntity.correspondentAccount;
        clinicInfo.paymentAccount = legalEntity.paymentAccount;
        clinicInfo.directorName = legalEntity.directorName;
        clinicInfo.veterinaryLicenseNumber = legalEntity.veterinaryLicenseNumber;
        clinicInfo.veterinaryLicenseIssueDate = legalEntity.veterinaryLicenseIssueDate;
      }
    }

    return clinicInfo;
  }

  /**
   * Generate PDF from HTML
   */
  async generatePDF(html: string): Promise<Buffer> {
    let browser;
    
    try {
      // Get system Chromium path
      const chromiumPath = this.getChromiumPath();
      
      // Launch headless browser with system Chromium
      browser = await puppeteer.launch({
        headless: true,
        executablePath: chromiumPath,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--disable-software-rasterizer'
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
  async buildInvoiceContext(invoiceId: string, tenantId: string, branchId: string, userId?: string): Promise<any> {
    // Fetch invoice with items (storage methods enforce tenant isolation via RLS)
    const invoice = await storage.getInvoice(invoiceId);
    if (!invoice) {
      throw new Error(`Invoice not found: ${invoiceId}`);
    }

    // Verify tenant ownership
    if (invoice.tenantId !== tenantId) {
      throw new Error('Access denied: Invoice belongs to different tenant');
    }

    const items = await storage.getInvoiceItems(invoiceId);
    
    // Fetch patient and owner info
    const patient = await storage.getPatient(invoice.patientId);
    if (!patient) {
      throw new Error('Patient not found for invoice');
    }

    // Get primary owner with full details
    const owners = await storage.getPatientOwners(patient.id);
    const primaryOwner = owners.find(o => o.isPrimary) || owners[0];
    
    let clientInfo: any = { name: 'Не указан', phone: '', address: '' };
    if (primaryOwner) {
      const ownerData = await storage.getOwner(primaryOwner.ownerId);
      clientInfo = {
        name: primaryOwner.name,
        phone: primaryOwner.phone || '',
        address: ownerData?.address || ''
      };
    }

    // Fetch branch/clinic info with legal entity requisites
    const clinicInfo = await this.getClinicInfoWithLegalEntity(branchId);

    // Get composer info (user who is generating the document)
    let composerInfo: any = { name: 'Администратор', position: 'Администратор' };
    if (userId) {
      const user = await storage.getUser(userId);
      if (user) {
        composerInfo = {
          name: user.name || 'Администратор',
          position: user.role === 'doctor' ? 'Ветеринарный врач' : 
                   user.role === 'admin' ? 'Администратор' : 
                   user.role === 'superadmin' ? 'Главный администратор' : 'Сотрудник'
        };
      }
    }

    // Map items with VAT calculation
    let totalVAT = 0;
    const mappedItems = items.map((item: any) => {
      const itemPrice = parseFloat(item.price.toString());
      const itemTotal = parseFloat(item.total.toString());
      const vatRate = item.vatRate || '20';
      
      let itemVAT = 0;
      if (vatRate === '20') {
        itemVAT = itemTotal * 0.2 / 1.2;
      } else if (vatRate === '10') {
        itemVAT = itemTotal * 0.1 / 1.1;
      }
      
      totalVAT += itemVAT;

      return {
        name: item.itemName,
        quantity: item.quantity,
        price: itemPrice,
        total: itemTotal,
        vatRate: vatRate === '0' || vatRate === 'not_applicable' ? 'Без НДС' : `НДС ${vatRate}%`,
        vat: itemVAT
      };
    });

    // Calculate totals
    const subtotal = parseFloat(invoice.subtotal.toString());
    const discount = parseFloat((invoice.discount || '0').toString());
    const total = parseFloat(invoice.total.toString());

    // Convert total to words
    const totalInWords = this.amountToWords(total);

    return {
      invoiceNumber: invoice.invoiceNumber,
      date: new Date(invoice.issueDate).toLocaleDateString('ru-RU'),
      dueDate: invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString('ru-RU') : null,
      docCreateDate: new Date().toLocaleDateString('ru-RU'),
      clinic: clinicInfo,
      client: clientInfo,
      composer: composerInfo,
      items: mappedItems,
      subtotal,
      discount,
      totalVAT: totalVAT.toFixed(2),
      total,
      totalInWords,
      notes: invoice.notes || ''
    };
  }

  /**
   * Build context data for prescription
   */
  async buildPrescriptionContext(recordId: string, tenantId: string, branchId: string): Promise<any> {
    // Fetch medical record (storage methods enforce tenant isolation via RLS)
    const record = await storage.getMedicalRecord(recordId);
    if (!record) {
      throw new Error(`Medical record not found: ${recordId}`);
    }

    // Verify tenant ownership (only tenant isolation, allow cross-branch access)
    if (record.tenantId !== tenantId) {
      throw new Error('Access denied: Medical record belongs to different tenant');
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
        name: primaryOwner.name,
        phone: primaryOwner.phone || ''
      };
    }

    // Fetch doctor info
    let doctorInfo: any = { name: 'Не указан', specialization: '' };
    if (record.doctorId) {
      const doctor = await storage.getDoctor(record.doctorId);
      if (doctor) {
        doctorInfo = {
          name: doctor.name,
          specialization: doctor.specialization || ''
        };
      }
    }

    // Fetch medications
    const medications = await storage.getMedicationsByRecord(recordId);

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
      species: this.translateSpecies(patient.species),
      breed: patient.breed || 'Не указана',
      age: calculateAge(patient.dateOfBirth)
    };

    // Map medications
    const mappedMedications = medications.map((med: any) => ({
      name: med.name,
      dosage: med.dosage,
      frequency: med.frequency,
      duration: med.duration,
      instructions: med.instructions || ''
    }));

    return {
      date: new Date(record.createdAt).toLocaleDateString('ru-RU'),
      docCreateDate: new Date().toLocaleDateString('ru-RU'),
      patient: patientInfo,
      owner: ownerInfo,
      doctor: doctorInfo,
      diagnosis: record.diagnosis || 'Не указан',
      medications: mappedMedications.length > 0 ? mappedMedications : []
    };
  }

  /**
   * Build context data for vaccination certificate
   */
  async buildVaccinationCertificateContext(recordId: string, tenantId: string, branchId: string): Promise<any> {
    // Fetch medical record (storage methods enforce tenant isolation via RLS)
    const record = await storage.getMedicalRecord(recordId);
    if (!record) {
      throw new Error(`Medical record not found: ${recordId}`);
    }

    // Verify tenant ownership (only tenant isolation, allow cross-branch access)
    if (record.tenantId !== tenantId) {
      throw new Error('Access denied: Medical record belongs to different tenant');
    }

    // Fetch patient info
    const patient = await storage.getPatient(record.patientId);
    if (!patient) {
      throw new Error(`Patient not found: ${record.patientId}`);
    }

    // Fetch owner info (get primary owner)
    const owners = await storage.getPatientOwners(record.patientId);
    const primaryOwner = owners.find((o: any) => o.isPrimary) || owners[0];
    
    let ownerInfo: any = { name: 'Не указан', phone: '', address: '' };
    if (primaryOwner) {
      ownerInfo = {
        name: primaryOwner.name,
        phone: primaryOwner.phone || '',
        address: primaryOwner.address || ''
      };
    }

    // Fetch doctor info
    let doctorInfo: any = { name: 'Не указан', specialization: '' };
    if (record.doctorId) {
      const doctor = await storage.getDoctor(record.doctorId);
      if (doctor) {
        doctorInfo = {
          name: doctor.name,
          specialization: doctor.specialization || ''
        };
      }
    }

    // Fetch clinic/branch info with legal entity requisites
    const clinicInfo = await this.getClinicInfoWithLegalEntity(branchId);

    // Fetch medications (vaccinations should be in medications)
    const medications = await storage.getMedicationsByRecord(recordId);
    const vaccinations = medications.map((med: any) => ({
      name: med.name,
      date: new Date(med.createdAt).toLocaleDateString('ru-RU'),
      nextDate: med.duration || ''
    }));

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
      species: this.translateSpecies(patient.species),
      breed: patient.breed || 'Не указана',
      age: calculateAge(patient.dateOfBirth),
      sex: patient.sex || 'Не указан',
      color: patient.color || 'Не указан',
      identificationNumber: patient.identificationNumber || ''
    };

    return {
      date: new Date(record.createdAt).toLocaleDateString('ru-RU'),
      docCreateDate: new Date().toLocaleDateString('ru-RU'),
      patient: patientInfo,
      owner: ownerInfo,
      doctor: doctorInfo,
      clinic: clinicInfo,
      vaccinations: vaccinations.length > 0 ? vaccinations : []
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

    // Verify tenant ownership (only tenant isolation, allow cross-branch access)
    if (record.tenantId !== tenantId) {
      throw new Error('Access denied: Medical record belongs to different tenant');
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
        name: primaryOwner.name,
        phone: primaryOwner.phone || ''
      };
    }

    // Fetch doctor info
    let doctorInfo: any = { name: 'Не указан', specialization: '' };
    if (record.doctorId) {
      const doctor = await storage.getDoctor(record.doctorId);
      if (doctor) {
        doctorInfo = {
          name: doctor.name,
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
      species: this.translateSpecies(patient.species),
      breed: patient.breed || 'Не указана',
      age: calculateAge(patient.dateOfBirth)
    };

    // Parse treatment array
    const treatment = Array.isArray(record.treatment) 
      ? record.treatment 
      : (record.treatment ? [record.treatment] : []);

    return {
      date: new Date(record.createdAt).toLocaleDateString('ru-RU'),
      docCreateDate: new Date().toLocaleDateString('ru-RU'),
      patient: patientInfo,
      owner: ownerInfo,
      doctor: doctorInfo,
      complaints: record.complaints || 'Не указаны',
      diagnosis: record.diagnosis || 'Не указан',
      treatment: treatment.length > 0 ? treatment : ['Не назначено'],
      recommendations: record.notes || 'Нет дополнительных рекомендаций'
    };
  }

  /**
   * Build context data for personal data consent template
   */
  async buildPersonalDataConsentContext(ownerId: string, tenantId: string, branchId: string): Promise<any> {
    // Fetch owner (storage methods enforce tenant isolation via RLS)
    const owner = await storage.getOwner(ownerId);
    if (!owner) {
      throw new Error(`Owner not found: ${ownerId}`);
    }

    // Verify tenant ownership
    if (owner.tenantId !== tenantId) {
      throw new Error('Access denied: Owner belongs to different tenant');
    }

    // Verify branch access through owner's patients
    // Owner is accessible if they have at least one patient in this branch (or patient with NULL branchId)
    const ownerPatients = await storage.getPatientsByOwner(ownerId, branchId);
    if (ownerPatients.length === 0) {
      throw new Error('Access denied: Owner has no patients in this branch');
    }

    // Build owner info with all personal data
    const ownerInfo = {
      name: owner.name,
      phone: owner.phone || '',
      email: owner.email || '',
      passportSeries: owner.passportSeries || '',
      passportNumber: owner.passportNumber || '',
      passportIssuedBy: owner.passportIssuedBy || '',
      passportIssueDate: owner.passportIssueDate 
        ? new Date(owner.passportIssueDate).toLocaleDateString('ru-RU') 
        : '',
      registrationAddress: owner.registrationAddress || '',
      residenceAddress: owner.residenceAddress || ''
    };

    // Fetch clinic/branch info with legal entity requisites
    const clinicInfo = await this.getClinicInfoWithLegalEntity(branchId);

    return {
      owner: ownerInfo,
      clinic: clinicInfo,
      date: new Date().toLocaleDateString('ru-RU'),
      currentDate: new Date().toLocaleDateString('ru-RU'),
      docCreateDate: new Date().toLocaleDateString('ru-RU')
    };
  }

  /**
   * Build context data for service agreement template
   */
  async buildServiceAgreementContext(patientId: string, tenantId: string, branchId: string): Promise<any> {
    // Fetch patient (storage methods enforce tenant isolation via RLS)
    const patient = await storage.getPatient(patientId);
    if (!patient) {
      throw new Error(`Patient not found: ${patientId}`);
    }

    // Verify tenant ownership
    if (patient.tenantId !== tenantId) {
      throw new Error('Access denied: Patient belongs to different tenant');
    }

    // Fetch owner info (get primary owner)
    const ownerLinks = await storage.getPatientOwners(patientId);
    const primaryOwnerLink = ownerLinks.find((o: any) => o.isPrimary) || ownerLinks[0];
    
    if (!primaryOwnerLink) {
      throw new Error('Owner not found for patient');
    }

    // Fetch full owner data with passport information
    const owner = await storage.getOwner(primaryOwnerLink.ownerId);
    if (!owner) {
      throw new Error('Owner data not found');
    }

    // Build owner info with all personal data
    const ownerInfo = {
      name: owner.name,
      phone: owner.phone || '',
      email: owner.email || '',
      passportSeries: owner.passportSeries || '',
      passportNumber: owner.passportNumber || '',
      passportIssuedBy: owner.passportIssuedBy || '',
      passportIssueDate: owner.passportIssueDate 
        ? new Date(owner.passportIssueDate).toLocaleDateString('ru-RU') 
        : '',
      registrationAddress: owner.registrationAddress || '',
      residenceAddress: owner.residenceAddress || ''
    };

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
      species: this.translateSpecies(patient.species),
      breed: patient.breed || 'Не указана',
      age: calculateAge(patient.dateOfBirth),
      sex: patient.sex || 'Не указан',
      color: patient.color || 'Не указан',
      identificationNumber: patient.identificationNumber || '',
      tattooNumber: patient.tattooNumber || ''
    };

    // Fetch clinic/branch info with legal entity requisites
    const clinicInfo = await this.getClinicInfoWithLegalEntity(branchId);

    // Generate contract number
    const contractNumber = this.generateContractNumber();

    return {
      owner: ownerInfo,
      patient: patientInfo,
      clinic: clinicInfo,
      contractNumber,
      date: new Date().toLocaleDateString('ru-RU'),
      currentDate: new Date().toLocaleDateString('ru-RU'),
      docCreateDate: new Date().toLocaleDateString('ru-RU')
    };
  }

  /**
   * Build context data for hospitalization agreement template
   */
  async buildHospitalizationAgreementContext(patientId: string, tenantId: string, branchId: string): Promise<any> {
    // Fetch patient (storage methods enforce tenant isolation via RLS)
    const patient = await storage.getPatient(patientId);
    if (!patient) {
      throw new Error(`Patient not found: ${patientId}`);
    }

    // Verify tenant ownership
    if (patient.tenantId !== tenantId) {
      throw new Error('Access denied: Patient belongs to different tenant');
    }

    // Fetch owner info (get primary owner)
    const ownerLinks = await storage.getPatientOwners(patientId);
    const primaryOwnerLink = ownerLinks.find((o: any) => o.isPrimary) || ownerLinks[0];
    
    if (!primaryOwnerLink) {
      throw new Error('Owner not found for patient');
    }

    // Fetch full owner data with passport information
    const owner = await storage.getOwner(primaryOwnerLink.ownerId);
    if (!owner) {
      throw new Error('Owner data not found');
    }

    // Build owner info with all personal data
    const ownerInfo = {
      name: owner.name,
      phone: owner.phone || '',
      email: owner.email || '',
      passportSeries: owner.passportSeries || '',
      passportNumber: owner.passportNumber || '',
      passportIssuedBy: owner.passportIssuedBy || '',
      passportIssueDate: owner.passportIssueDate 
        ? new Date(owner.passportIssueDate).toLocaleDateString('ru-RU') 
        : '',
      registrationAddress: owner.registrationAddress || '',
      residenceAddress: owner.residenceAddress || ''
    };

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
      species: this.translateSpecies(patient.species),
      breed: patient.breed || 'Не указана',
      age: calculateAge(patient.dateOfBirth),
      sex: patient.sex || 'Не указан',
      color: patient.color || 'Не указан',
      identificationNumber: patient.identificationNumber || '',
      tattooNumber: patient.tattooNumber || ''
    };

    // Fetch clinic/branch info with legal entity requisites
    const clinicInfo = await this.getClinicInfoWithLegalEntity(branchId);

    // Generate contract number
    const contractNumber = this.generateContractNumber();

    return {
      owner: ownerInfo,
      patient: patientInfo,
      clinic: clinicInfo,
      contractNumber,
      date: new Date().toLocaleDateString('ru-RU'),
      currentDate: new Date().toLocaleDateString('ru-RU'),
      docCreateDate: new Date().toLocaleDateString('ru-RU')
    };
  }

  /**
   * Build context data for informed consent (general) template
   */
  async buildInformedConsentGeneralContext(patientId: string, tenantId: string, branchId: string): Promise<any> {
    // Fetch patient (storage methods enforce tenant isolation via RLS)
    const patient = await storage.getPatient(patientId);
    if (!patient) {
      throw new Error(`Patient not found: ${patientId}`);
    }

    // Verify tenant ownership
    if (patient.tenantId !== tenantId) {
      throw new Error('Access denied: Patient belongs to different tenant');
    }

    // Fetch owner info (get primary owner)
    const ownerLinks = await storage.getPatientOwners(patientId);
    const primaryOwnerLink = ownerLinks.find((o: any) => o.isPrimary) || ownerLinks[0];
    
    if (!primaryOwnerLink) {
      throw new Error('Owner not found for patient');
    }

    // Fetch full owner data with passport information
    const owner = await storage.getOwner(primaryOwnerLink.ownerId);
    if (!owner) {
      throw new Error('Owner data not found');
    }

    // Build owner info with all personal data
    const ownerInfo = {
      name: owner.name,
      phone: owner.phone || '',
      email: owner.email || '',
      passportSeries: owner.passportSeries || '',
      passportNumber: owner.passportNumber || '',
      passportIssuedBy: owner.passportIssuedBy || '',
      passportIssueDate: owner.passportIssueDate 
        ? new Date(owner.passportIssueDate).toLocaleDateString('ru-RU') 
        : '',
      registrationAddress: owner.registrationAddress || '',
      residenceAddress: owner.residenceAddress || ''
    };

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
      species: this.translateSpecies(patient.species),
      breed: patient.breed || 'Не указана',
      age: calculateAge(patient.dateOfBirth),
      sex: patient.sex || 'Не указан',
      color: patient.color || 'Не указан',
      identificationNumber: patient.identificationNumber || '',
      tattooNumber: patient.tattooNumber || ''
    };

    // Fetch clinic/branch info with legal entity requisites
    const clinicInfo = await this.getClinicInfoWithLegalEntity(branchId);

    return {
      owner: ownerInfo,
      patient: patientInfo,
      clinic: clinicInfo,
      date: new Date().toLocaleDateString('ru-RU'),
      currentDate: new Date().toLocaleDateString('ru-RU'),
      docCreateDate: new Date().toLocaleDateString('ru-RU')
    };
  }
}

export const documentService = new DocumentService();
