import { 
  type User, type InsertUser,
  type Owner, type InsertOwner,
  type Patient, type InsertPatient,
  type Doctor, type InsertDoctor,
  type Appointment, type InsertAppointment,
  type MedicalRecord, type InsertMedicalRecord,
  type Medication, type InsertMedication,
  type Service, type InsertService,
  type Product, type InsertProduct,
  type Invoice, type InsertInvoice,
  type InvoiceItem, type InsertInvoiceItem,
  type Branch, type InsertBranch,
  type PatientFile, type InsertPatientFile,
  type LabStudy, type InsertLabStudy,
  type LabParameter, type InsertLabParameter,
  type ReferenceRange, type InsertReferenceRange,
  type LabOrder, type InsertLabOrder,
  type LabResultDetail, type InsertLabResultDetail,
  users, owners, patients, doctors, appointments, 
  medicalRecords, medications, services, products, 
  invoices, invoiceItems, branches, patientFiles,
  labStudies, labParameters, referenceRanges, 
  labOrders, labResultDetails, paymentIntents, fiscalReceipts,
  catalogItems
} from "@shared/schema";
import { db } from "./db-local";
import { eq, like, and, or, desc, sql, gte, lte, isNull, type SQL } from "drizzle-orm";
import bcrypt from "bcryptjs";

// Performance monitoring utilities
const logSlowQuery = (operation: string, duration: number, threshold = 100) => {
  if (duration > threshold) {
    console.warn(`🐌 Slow query detected: ${operation} took ${duration}ms (threshold: ${threshold}ms)`);
  } else {
    console.log(`⚡ Query: ${operation} completed in ${duration}ms`);
  }
};

const withPerformanceLogging = async <T>(
  operation: string,
  queryFn: () => Promise<T>
): Promise<T> => {
  const startTime = Date.now();
  try {
    const result = await queryFn();
    const duration = Date.now() - startTime;
    logSlowQuery(operation, duration);
    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`❌ Query failed: ${operation} after ${duration}ms:`, error);
    throw error;
  }
};

// Enhanced storage interface for veterinary clinic system
export interface IStorage {
  // User methods (keep existing for authentication)
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  verifyPassword(password: string, hashedPassword: string): Promise<boolean>;
  createUser(user: InsertUser): Promise<User>;
  getUsers(): Promise<User[]>;
  updateUser(id: string, updateData: Partial<InsertUser>): Promise<User>;
  updateUserLastLogin(id: string): Promise<void>;
  deleteUser(id: string): Promise<void>;

  // Branch methods
  getBranches(): Promise<Branch[]>;
  getActiveBranches(): Promise<Branch[]>;
  getBranch(id: string): Promise<Branch | undefined>;
  createBranch(branch: InsertBranch): Promise<Branch>;
  updateBranch(id: string, branch: Partial<InsertBranch>): Promise<Branch>;
  deleteBranch(id: string): Promise<void>;
  
  // 🔒 SECURITY: Branch access control methods
  canUserAccessBranch(userId: string, branchId: string): Promise<boolean>;
  getUserAccessibleBranches(userId: string): Promise<Branch[]>;

  // Owner methods - 🔒 SECURITY: branchId required for PHI isolation
  getOwners(branchId: string): Promise<Owner[]>;
  getOwner(id: string): Promise<Owner | undefined>;
  createOwner(owner: InsertOwner): Promise<Owner>;
  updateOwner(id: string, owner: Partial<InsertOwner>): Promise<Owner>;
  deleteOwner(id: string): Promise<void>;
  searchOwners(query: string, branchId: string): Promise<Owner[]>;

  // Patient methods - 🔒 SECURITY: branchId required for PHI isolation
  getPatients(limit: number | undefined, offset: number | undefined, branchId: string): Promise<Patient[]>;
  getPatient(id: string): Promise<Patient | undefined>;
  getPatientsByOwner(ownerId: string, branchId: string): Promise<Patient[]>;
  createPatient(patient: InsertPatient): Promise<Patient>;
  updatePatient(id: string, patient: Partial<InsertPatient>): Promise<Patient>;
  deletePatient(id: string): Promise<void>;
  searchPatients(query: string, branchId: string): Promise<Patient[]>;

  // Doctor methods - 🔒 SECURITY: branchId required for PHI isolation
  getDoctors(branchId: string): Promise<Doctor[]>;
  getDoctor(id: string): Promise<Doctor | undefined>;
  createDoctor(doctor: InsertDoctor): Promise<Doctor>;
  updateDoctor(id: string, doctor: Partial<InsertDoctor>): Promise<Doctor>;
  deleteDoctor(id: string): Promise<void>;
  getActiveDoctors(branchId: string): Promise<Doctor[]>;

  // Appointment methods - 🔒 SECURITY: branchId required for PHI isolation
  getAppointments(date: Date | undefined, branchId: string): Promise<Appointment[]>;
  getAppointment(id: string): Promise<Appointment | undefined>;
  getAppointmentsByDoctor(doctorId: string, date: Date | undefined, branchId: string): Promise<Appointment[]>;
  getAppointmentsByPatient(patientId: string, branchId: string): Promise<Appointment[]>;
  createAppointment(appointment: InsertAppointment): Promise<Appointment>;
  updateAppointment(id: string, appointment: Partial<InsertAppointment>): Promise<Appointment>;
  deleteAppointment(id: string): Promise<void>;
  checkAppointmentConflicts(doctorId: string, date: Date, duration: number, excludeId?: string): Promise<boolean>;

  // Medical Record methods - 🔒 SECURITY: branchId required for PHI isolation
  getMedicalRecords(patientId: string | undefined, branchId: string): Promise<MedicalRecord[]>;
  getMedicalRecord(id: string): Promise<MedicalRecord | undefined>;
  createMedicalRecord(record: InsertMedicalRecord): Promise<MedicalRecord>;
  updateMedicalRecord(id: string, record: Partial<InsertMedicalRecord>): Promise<MedicalRecord>;
  deleteMedicalRecord(id: string): Promise<void>;

  // Medication methods
  getMedicationsByRecord(recordId: string): Promise<Medication[]>;
  createMedication(medication: InsertMedication): Promise<Medication>;
  updateMedication(id: string, medication: Partial<InsertMedication>): Promise<Medication>;
  deleteMedication(id: string): Promise<void>;

  // Service methods
  getServices(activeOnly?: boolean): Promise<Service[]>;
  getService(id: string): Promise<Service | undefined>;
  createService(service: InsertService): Promise<Service>;
  updateService(id: string, service: Partial<InsertService>): Promise<Service>;
  deleteService(id: string): Promise<void>;
  searchServices(query: string): Promise<Service[]>;

  // Product methods
  getProducts(activeOnly?: boolean): Promise<Product[]>;
  getProduct(id: string): Promise<Product | undefined>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: string, product: Partial<InsertProduct>): Promise<Product>;
  deleteProduct(id: string): Promise<void>;
  searchProducts(query: string): Promise<Product[]>;
  getLowStockProducts(): Promise<Product[]>;
  updateProductStock(id: string, quantity: number): Promise<Product>;

  // Invoice methods - 🔒 SECURITY: branchId required for PHI isolation
  getInvoices(status: string | undefined, branchId: string): Promise<Invoice[]>;
  getInvoice(id: string): Promise<Invoice | undefined>;
  getInvoicesByPatient(patientId: string, branchId: string): Promise<Invoice[]>;
  createInvoice(invoice: InsertInvoice): Promise<Invoice>;
  updateInvoice(id: string, invoice: Partial<InsertInvoice>): Promise<Invoice>;
  deleteInvoice(id: string): Promise<void>;
  getInvoiceItems(invoiceId: string): Promise<InvoiceItem[]>;
  createInvoiceItem(item: InsertInvoiceItem): Promise<InvoiceItem>;
  deleteInvoiceItem(id: string): Promise<void>;
  getOverdueInvoices(branchId: string): Promise<Invoice[]>;
  getDashboardStats(): Promise<{
    totalPatients: number;
    todayAppointments: number;
    activeAppointments: number;
    revenue: number;
    pendingPayments: number;
    lowStock: number;
  }>;

  // Patient File methods
  createPatientFile(file: InsertPatientFile): Promise<PatientFile>;
  getPatientFiles(patientId: string, fileType?: string): Promise<PatientFile[]>;
  getPatientFileById(fileId: string): Promise<PatientFile | undefined>;
  deletePatientFile(fileId: string): Promise<void>;

  // Laboratory Study methods
  getLabStudies(activeOnly?: boolean): Promise<LabStudy[]>;
  getLabStudy(id: string): Promise<LabStudy | undefined>;
  createLabStudy(study: InsertLabStudy): Promise<LabStudy>;
  updateLabStudy(id: string, study: Partial<InsertLabStudy>): Promise<LabStudy>;
  deleteLabStudy(id: string): Promise<void>;
  searchLabStudies(query: string): Promise<LabStudy[]>;

  // Laboratory Parameter methods
  getLabParameters(studyId?: string): Promise<LabParameter[]>;
  getLabParameter(id: string): Promise<LabParameter | undefined>;
  createLabParameter(parameter: InsertLabParameter): Promise<LabParameter>;
  updateLabParameter(id: string, parameter: Partial<InsertLabParameter>): Promise<LabParameter>;
  deleteLabParameter(id: string): Promise<void>;

  // Reference Range methods
  getReferenceRanges(parameterId?: string, species?: string): Promise<ReferenceRange[]>;
  getReferenceRange(id: string): Promise<ReferenceRange | undefined>;
  createReferenceRange(range: InsertReferenceRange): Promise<ReferenceRange>;
  updateReferenceRange(id: string, range: Partial<InsertReferenceRange>): Promise<ReferenceRange>;
  deleteReferenceRange(id: string): Promise<void>;
  getApplicableReferenceRange(parameterId: string, species: string, breed?: string, age?: number, sex?: string): Promise<ReferenceRange | undefined>;

  // Laboratory Order methods - 🔒 SECURITY: branchId required for PHI isolation
  getLabOrders(patientId: string | undefined, status: string | undefined, branchId: string): Promise<LabOrder[]>;
  getLabOrder(id: string): Promise<LabOrder | undefined>;
  createLabOrder(order: InsertLabOrder): Promise<LabOrder>;
  updateLabOrder(id: string, order: Partial<InsertLabOrder>): Promise<LabOrder>;
  deleteLabOrder(id: string): Promise<void>;
  getLabOrdersByDoctor(doctorId: string, branchId: string): Promise<LabOrder[]>;
  getLabOrdersByAppointment(appointmentId: string, branchId: string): Promise<LabOrder[]>;

  // Laboratory Result Detail methods
  getLabResultDetails(orderId: string): Promise<LabResultDetail[]>;
  getLabResultDetail(id: string): Promise<LabResultDetail | undefined>;
  createLabResultDetail(detail: InsertLabResultDetail): Promise<LabResultDetail>;
  updateLabResultDetail(id: string, detail: Partial<InsertLabResultDetail>): Promise<LabResultDetail>;
  deleteLabResultDetail(id: string): Promise<void>;
  getLabResultsByParameter(parameterId: string): Promise<LabResultDetail[]>;

  // Payment Intent methods
  createPaymentIntent(paymentIntent: {
    invoiceId: string;
    amount: number;
    currency: string;
    paymentMethod: string;
    status: string;
    integrationAccountId: string | null;
    externalPaymentId: string;
    paymentData: any;
    errorMessage: string | null;
  }): Promise<string>;
  updatePaymentIntent(id: string, updates: {
    status?: string;
    confirmedAt?: Date;
    errorMessage?: string | null;
  }): Promise<void>;
  
  // Fiscal Receipt methods
  createFiscalReceipt(fiscalReceipt: {
    invoiceId: string;
    receiptNumber: string | null;
    status: string;
    receiptType: string;
    paymentMethod: string;
    customerEmail: string | null;
    customerPhone: string | null;
    taxationSystem: string;
    operatorName: string;
    operatorInn: string | null;
    totalAmount: number;
    vatAmount: number;
    cashAmount: number;
    cardAmount: number;
    items: any;
    markingStatus: string;
    fiscalData: any;
    integrationAccountId: string | null;
    externalReceiptId: string | null;
    errorMessage: string | null;
  }): Promise<string>;
  updateFiscalReceipt(id: string, updates: {
    receiptNumber?: string;
    externalReceiptId?: string;
    status?: string;
    fiscalData?: any;
    registeredAt?: Date;
    errorMessage?: string | null;
  }): Promise<void>;
  
  // Additional methods for YooKassa integration
  getPaymentIntentsByInvoice(invoiceId: string): Promise<{
    id: string;
    status: string;
    paymentData: any;
  }[]>;
  getCatalogItemById(id: string): Promise<{
    id: string;
    type: string;
    vatRate: string;
    externalId: string | null;
    markingStatus: string;
  } | undefined>;
}

export class DatabaseStorage implements IStorage {
  // User methods (keep existing for authentication)
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return withPerformanceLogging('getUserByUsername', async () => {
      const [user] = await db.select().from(users).where(eq(users.username, username));
      return user || undefined;
    });
  }

  async verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
    return withPerformanceLogging('verifyPassword', async () => {
      return await bcrypt.compare(password, hashedPassword);
    });
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    return withPerformanceLogging('createUser', async () => {
      // Hash password before storing
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(insertUser.password, saltRounds);
      
      const [user] = await db
        .insert(users)
        .values({
          ...insertUser,
          password: hashedPassword,
        })
        .returning();
      return user;
    });
  }

  async getUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(users.createdAt);
  }

  async updateUser(id: string, updateData: Partial<InsertUser>): Promise<User> {
    return withPerformanceLogging('updateUser', async () => {
      // Hash password if it's being updated
      let dataToUpdate = { ...updateData, updatedAt: new Date() };
      if (updateData.password) {
        const saltRounds = 12;
        dataToUpdate.password = await bcrypt.hash(updateData.password, saltRounds);
      }
      
      const [user] = await db
        .update(users)
        .set(dataToUpdate)
        .where(eq(users.id, id))
        .returning();
      return user;
    });
  }

  async updateUserLastLogin(id: string): Promise<void> {
    await db
      .update(users)
      .set({ lastLogin: new Date() })
      .where(eq(users.id, id));
  }

  async deleteUser(id: string): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }

  // Owner methods - 🔒 SECURITY: branchId mandatory for PHI isolation
  async getOwners(branchId: string): Promise<Owner[]> {
    return withPerformanceLogging('getOwners', async () => {
      return await db.select().from(owners)
        .where(eq(owners.branchId, branchId))
        .orderBy(desc(owners.createdAt));
    });
  }

  async getOwner(id: string): Promise<Owner | undefined> {
    const [owner] = await db.select().from(owners).where(eq(owners.id, id));
    return owner || undefined;
  }

  async createOwner(owner: InsertOwner): Promise<Owner> {
    const [newOwner] = await db
      .insert(owners)
      .values(owner)
      .returning();
    return newOwner;
  }

  async updateOwner(id: string, owner: Partial<InsertOwner>): Promise<Owner> {
    const [updated] = await db
      .update(owners)
      .set({ ...owner, updatedAt: new Date() })
      .where(eq(owners.id, id))
      .returning();
    return updated;
  }

  async deleteOwner(id: string): Promise<void> {
    await db.delete(owners).where(eq(owners.id, id));
  }

  async searchOwners(query: string, branchId: string): Promise<Owner[]> {
    return withPerformanceLogging('searchOwners', async () => {
      const searchQuery = `%${query}%`;
      const searchConditions = or(
        like(owners.name, searchQuery),
        like(owners.phone, searchQuery),
        like(owners.email, searchQuery)
      );
      
      return await db
        .select()
        .from(owners)
        .where(and(searchConditions, eq(owners.branchId, branchId)))
        .orderBy(desc(owners.createdAt));
    });
  }

  // Patient methods - 🔒 SECURITY: branchId mandatory for PHI isolation
  async getPatients(limit: number | undefined = 50, offset: number | undefined = 0, branchId: string): Promise<Patient[]> {
    return withPerformanceLogging('getPatients', async () =>
      await db
        .select()
        .from(patients)
        .where(eq(patients.branchId, branchId))
        .orderBy(desc(patients.createdAt))
        .limit(limit || 50)
        .offset(offset || 0)
    );
  }

  async getPatient(id: string): Promise<Patient | undefined> {
    const [patient] = await db.select().from(patients).where(eq(patients.id, id));
    return patient || undefined;
  }

  async getPatientsByOwner(ownerId: string, branchId: string): Promise<Patient[]> {
    // 🔒 CRITICAL: branchId now mandatory for security
    return await db
      .select()
      .from(patients)
      .where(and(eq(patients.ownerId, ownerId), eq(patients.branchId, branchId)));
  }

  async createPatient(patient: InsertPatient): Promise<Patient> {
    const patientToInsert = {
      ...patient,
      weight: patient.weight !== undefined ? patient.weight.toString() : undefined
    };
    const [newPatient] = await db
      .insert(patients)
      .values(patientToInsert)
      .returning();
    return newPatient;
  }

  async updatePatient(id: string, patient: Partial<InsertPatient>): Promise<Patient> {
    const patientToUpdate = {
      ...patient,
      weight: patient.weight !== undefined ? patient.weight.toString() : undefined,
      updatedAt: new Date()
    };
    const [updated] = await db
      .update(patients)
      .set(patientToUpdate)
      .where(eq(patients.id, id))
      .returning();
    return updated;
  }

  async deletePatient(id: string): Promise<void> {
    await db.delete(patients).where(eq(patients.id, id));
  }

  async searchPatients(query: string, branchId: string): Promise<Patient[]> {
    return withPerformanceLogging('searchPatients', async () => {
      const searchQuery = `%${query}%`;
      const searchConditions = or(
        like(patients.name, searchQuery),
        like(patients.species, searchQuery),
        like(patients.breed, searchQuery),
        like(patients.microchipNumber, searchQuery)
      );
      
      // 🔒 CRITICAL: branchId now mandatory for security
      return await db
        .select()
        .from(patients)
        .where(and(searchConditions, eq(patients.branchId, branchId)))
        .orderBy(desc(patients.createdAt));
    });
  }

  // Doctor methods - 🔒 SECURITY: branchId mandatory for PHI isolation
  async getDoctors(branchId: string): Promise<Doctor[]> {
    return withPerformanceLogging('getDoctors', async () => {
      return await db.select().from(doctors)
        .where(eq(doctors.branchId, branchId))
        .orderBy(desc(doctors.createdAt));
    });
  }

  async getDoctor(id: string): Promise<Doctor | undefined> {
    const [doctor] = await db.select().from(doctors).where(eq(doctors.id, id));
    return doctor || undefined;
  }

  async createDoctor(doctor: InsertDoctor): Promise<Doctor> {
    const [newDoctor] = await db
      .insert(doctors)
      .values(doctor)
      .returning();
    return newDoctor;
  }

  async updateDoctor(id: string, doctor: Partial<InsertDoctor>): Promise<Doctor> {
    const [updated] = await db
      .update(doctors)
      .set({ ...doctor, updatedAt: new Date() })
      .where(eq(doctors.id, id))
      .returning();
    return updated;
  }

  async deleteDoctor(id: string): Promise<void> {
    await db.delete(doctors).where(eq(doctors.id, id));
  }

  async getActiveDoctors(branchId: string): Promise<Doctor[]> {
    return withPerformanceLogging('getActiveDoctors', async () => {
      return await db.select().from(doctors)
        .where(and(eq(doctors.isActive, true), eq(doctors.branchId, branchId)));
    });
  }

  // Appointment methods - 🔒 SECURITY: branchId mandatory for PHI isolation
  async getAppointments(date: Date | undefined, branchId: string): Promise<any[]> {
    return withPerformanceLogging(`getAppointments${date ? '(filtered)' : '(all)'}`, async () => {
      if (date) {
        const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        const endOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
        
        // 🔒 CRITICAL: Build query with branch filtering if provided
        let whereConditions = [
          gte(appointments.appointmentDate, startOfDay),
          lte(appointments.appointmentDate, endOfDay)
        ];
        
        // 🔒 Add branch isolation if branchId provided
        if (branchId) {
          whereConditions.push(eq(patients.branchId, branchId));
        }
        
        return await db.select({
          // Appointment fields
          id: appointments.id,
          patientId: appointments.patientId,
          doctorId: appointments.doctorId,
          appointmentDate: appointments.appointmentDate,
          duration: appointments.duration,
          appointmentType: appointments.appointmentType,
          status: appointments.status,
          notes: appointments.notes,
          createdAt: appointments.createdAt,
          updatedAt: appointments.updatedAt,
          // Doctor fields
          doctorName: doctors.name,
          doctorSpecialization: doctors.specialization,
          // Patient fields
          patientName: patients.name,
          patientSpecies: patients.species,
          patientBreed: patients.breed,
          // Owner fields
          ownerName: owners.name,
          ownerPhone: owners.phone,
        })
          .from(appointments)
          .leftJoin(doctors, eq(appointments.doctorId, doctors.id))
          .leftJoin(patients, eq(appointments.patientId, patients.id))
          .leftJoin(owners, eq(patients.ownerId, owners.id))
          .where(and(...whereConditions))
          .orderBy(appointments.appointmentDate);
      }
      
      // 🔒 CRITICAL: For all appointments, enforce branch isolation if branchId provided
      let query = db.select({
        // Appointment fields
        id: appointments.id,
        patientId: appointments.patientId,
        doctorId: appointments.doctorId,
        appointmentDate: appointments.appointmentDate,
        duration: appointments.duration,
        appointmentType: appointments.appointmentType,
        status: appointments.status,
        notes: appointments.notes,
        createdAt: appointments.createdAt,
        updatedAt: appointments.updatedAt,
        // Doctor fields
        doctorName: doctors.name,
        doctorSpecialization: doctors.specialization,
        // Patient fields
        patientName: patients.name,
        patientSpecies: patients.species,
        patientBreed: patients.breed,
        // Owner fields
        ownerName: owners.name,
        ownerPhone: owners.phone,
      })
        .from(appointments)
        .leftJoin(doctors, eq(appointments.doctorId, doctors.id))
        .leftJoin(patients, eq(appointments.patientId, patients.id))
        .leftJoin(owners, eq(patients.ownerId, owners.id));
        
      if (branchId) {
        query = query.where(eq(patients.branchId, branchId));
      }
      
      return await query.orderBy(appointments.appointmentDate);
    });
  }

  async getAppointment(id: string): Promise<Appointment | undefined> {
    const [appointment] = await db.select().from(appointments).where(eq(appointments.id, id));
    return appointment || undefined;
  }

  async getAppointmentsByDoctor(doctorId: string, date: Date | undefined, branchId: string): Promise<Appointment[]> {
    if (date) {
      const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const endOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
      
      let whereConditions = [
        eq(appointments.doctorId, doctorId),
        gte(appointments.appointmentDate, startOfDay),
        lte(appointments.appointmentDate, endOfDay)
      ];
      
      // 🔒 CRITICAL: Add branch isolation via patient join if branchId provided
      if (branchId) {
        return await db.select().from(appointments)
          .leftJoin(patients, eq(appointments.patientId, patients.id))
          .where(and(...whereConditions, eq(patients.branchId, branchId)))
          .orderBy(appointments.appointmentDate);
      }
      
      return await db.select().from(appointments)
        .where(and(...whereConditions))
        .orderBy(appointments.appointmentDate);
    }
    
    // 🔒 CRITICAL: For all appointments by doctor, enforce branch isolation if branchId provided
    if (branchId) {
      return await db.select().from(appointments)
        .leftJoin(patients, eq(appointments.patientId, patients.id))
        .where(and(eq(appointments.doctorId, doctorId), eq(patients.branchId, branchId)))
        .orderBy(appointments.appointmentDate);
    }
    
    return await db.select().from(appointments)
      .where(eq(appointments.doctorId, doctorId))
      .orderBy(appointments.appointmentDate);
  }

  async getAppointmentsByPatient(patientId: string, branchId: string): Promise<Appointment[]> {
    // 🔒 CRITICAL: Enforce branch isolation via patient join
    return await db
      .select()
      .from(appointments)
      .leftJoin(patients, eq(appointments.patientId, patients.id))
      .where(and(eq(appointments.patientId, patientId), eq(patients.branchId, branchId)))
      .orderBy(desc(appointments.appointmentDate));
  }

  async createAppointment(appointment: InsertAppointment): Promise<Appointment> {
    const [newAppointment] = await db
      .insert(appointments)
      .values(appointment)
      .returning();
    return newAppointment;
  }

  async updateAppointment(id: string, appointment: Partial<InsertAppointment>): Promise<Appointment> {
    const [updated] = await db
      .update(appointments)
      .set({ ...appointment, updatedAt: new Date() })
      .where(eq(appointments.id, id))
      .returning();
    return updated;
  }

  async deleteAppointment(id: string): Promise<void> {
    await db.delete(appointments).where(eq(appointments.id, id));
  }

  async checkAppointmentConflicts(doctorId: string, date: Date, duration: number, excludeId?: string): Promise<boolean> {
    const endTime = new Date(date.getTime() + duration * 60000);
    
    const baseConditions = [
      eq(appointments.doctorId, doctorId),
      or(
        and(
          lte(appointments.appointmentDate, date),
          gte(sql`${appointments.appointmentDate} + INTERVAL '1 minute' * ${appointments.duration}`, date)
        ),
        and(
          lte(appointments.appointmentDate, endTime),
          gte(sql`${appointments.appointmentDate} + INTERVAL '1 minute' * ${appointments.duration}`, endTime)
        ),
        and(
          gte(appointments.appointmentDate, date),
          lte(sql`${appointments.appointmentDate} + INTERVAL '1 minute' * ${appointments.duration}`, endTime)
        )
      )
    ];
      
    if (excludeId) {
      baseConditions.push(sql`${appointments.id} != ${excludeId}`);
    }
    
    const conflicts = await db
      .select()
      .from(appointments)
      .where(and(...baseConditions));
      
    return conflicts.length > 0;
  }

  // Medical Record methods - 🔒 SECURITY: branchId mandatory for PHI isolation
  async getMedicalRecords(patientId: string | undefined, branchId: string): Promise<MedicalRecord[]> {
    if (patientId) {
      // 🔒 CRITICAL: For specific patient, still enforce branch isolation
      return await db.select()
        .from(medicalRecords)
        .leftJoin(patients, eq(medicalRecords.patientId, patients.id))
        .where(and(eq(medicalRecords.patientId, patientId), eq(patients.branchId, branchId)))
        .orderBy(desc(medicalRecords.visitDate));
    }
    
    // 🔒 CRITICAL: For all medical records, enforce branch isolation via patient join
    return await db.select()
      .from(medicalRecords)
      .leftJoin(patients, eq(medicalRecords.patientId, patients.id))
      .where(eq(patients.branchId, branchId))
      .orderBy(desc(medicalRecords.visitDate));
  }

  async getMedicalRecord(id: string): Promise<MedicalRecord | undefined> {
    const [record] = await db.select().from(medicalRecords).where(eq(medicalRecords.id, id));
    return record || undefined;
  }

  async createMedicalRecord(record: InsertMedicalRecord): Promise<MedicalRecord> {
    const recordToInsert = {
      ...record,
      weight: record.weight !== undefined ? record.weight.toString() : undefined,
      temperature: record.temperature !== undefined ? record.temperature.toString() : undefined
    };
    const [newRecord] = await db
      .insert(medicalRecords)
      .values(recordToInsert)
      .returning();
    return newRecord;
  }

  async updateMedicalRecord(id: string, record: Partial<InsertMedicalRecord>): Promise<MedicalRecord> {
    const recordToUpdate = {
      ...record,
      weight: record.weight !== undefined ? record.weight.toString() : undefined,
      temperature: record.temperature !== undefined ? record.temperature.toString() : undefined,
      updatedAt: new Date()
    };
    const [updated] = await db
      .update(medicalRecords)
      .set(recordToUpdate)
      .where(eq(medicalRecords.id, id))
      .returning();
    return updated;
  }

  async deleteMedicalRecord(id: string): Promise<void> {
    await db.delete(medicalRecords).where(eq(medicalRecords.id, id));
  }

  // Medication methods
  async getMedicationsByRecord(recordId: string): Promise<Medication[]> {
    return await db
      .select()
      .from(medications)
      .where(eq(medications.recordId, recordId))
      .orderBy(desc(medications.createdAt));
  }

  async createMedication(medication: InsertMedication): Promise<Medication> {
    const [newMedication] = await db
      .insert(medications)
      .values(medication)
      .returning();
    return newMedication;
  }

  async updateMedication(id: string, medication: Partial<InsertMedication>): Promise<Medication> {
    const [updated] = await db
      .update(medications)
      .set(medication)
      .where(eq(medications.id, id))
      .returning();
    return updated;
  }

  async deleteMedication(id: string): Promise<void> {
    await db.delete(medications).where(eq(medications.id, id));
  }

  // Service methods
  async getServices(activeOnly = false): Promise<Service[]> {
    if (activeOnly) {
      return await db.select().from(services)
        .where(eq(services.isActive, true))
        .orderBy(services.category, services.name);
    }
    
    return await db.select().from(services).orderBy(services.category, services.name);
  }

  async getService(id: string): Promise<Service | undefined> {
    const [service] = await db.select().from(services).where(eq(services.id, id));
    return service || undefined;
  }

  async createService(service: InsertService): Promise<Service> {
    const serviceToInsert = {
      ...service,
      price: service.price.toString()
    };
    const [newService] = await db
      .insert(services)
      .values(serviceToInsert)
      .returning();
    return newService;
  }

  async updateService(id: string, service: Partial<InsertService>): Promise<Service> {
    const serviceToUpdate = {
      ...service,
      price: service.price !== undefined ? service.price.toString() : undefined,
      updatedAt: new Date()
    };
    const [updated] = await db
      .update(services)
      .set(serviceToUpdate)
      .where(eq(services.id, id))
      .returning();
    return updated;
  }

  async deleteService(id: string): Promise<void> {
    await db.delete(services).where(eq(services.id, id));
  }

  async searchServices(query: string): Promise<Service[]> {
    const searchQuery = `%${query}%`;
    return await db
      .select()
      .from(services)
      .where(
        or(
          like(services.name, searchQuery),
          like(services.category, searchQuery),
          like(services.description, searchQuery)
        )
      )
      .orderBy(services.name);
  }

  // Product methods
  async getProducts(activeOnly = false): Promise<Product[]> {
    if (activeOnly) {
      return await db.select().from(products)
        .where(eq(products.isActive, true))
        .orderBy(products.category, products.name);
    }
    
    return await db.select().from(products).orderBy(products.category, products.name);
  }

  async getProduct(id: string): Promise<Product | undefined> {
    const [product] = await db.select().from(products).where(eq(products.id, id));
    return product || undefined;
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    const productToInsert = {
      ...product,
      price: product.price.toString()
    };
    const [newProduct] = await db
      .insert(products)
      .values(productToInsert)
      .returning();
    return newProduct;
  }

  async updateProduct(id: string, product: Partial<InsertProduct>): Promise<Product> {
    const productToUpdate = {
      ...product,
      price: product.price !== undefined ? product.price.toString() : undefined,
      updatedAt: new Date()
    };
    const [updated] = await db
      .update(products)
      .set(productToUpdate)
      .where(eq(products.id, id))
      .returning();
    return updated;
  }

  async deleteProduct(id: string): Promise<void> {
    await db.delete(products).where(eq(products.id, id));
  }

  async searchProducts(query: string): Promise<Product[]> {
    const searchQuery = `%${query}%`;
    return await db
      .select()
      .from(products)
      .where(
        or(
          like(products.name, searchQuery),
          like(products.category, searchQuery),
          like(products.description, searchQuery)
        )
      )
      .orderBy(products.name);
  }

  async getLowStockProducts(): Promise<Product[]> {
    return await db
      .select()
      .from(products)
      .where(
        and(
          eq(products.isActive, true),
          sql`${products.stock} <= ${products.minStock}`
        )
      )
      .orderBy(products.name);
  }

  async updateProductStock(id: string, quantity: number): Promise<Product> {
    const [updated] = await db
      .update(products)
      .set({ 
        stock: sql`${products.stock} + ${quantity}`,
        updatedAt: new Date()
      })
      .where(eq(products.id, id))
      .returning();
    return updated;
  }

  // Invoice methods - 🔒 SECURITY: branchId mandatory for PHI isolation
  async getInvoices(status: string | undefined, branchId: string): Promise<Invoice[]> {
    // 🔒 CRITICAL: Enforce branch isolation via patient join
    let query = db.select().from(invoices)
      .leftJoin(patients, eq(invoices.patientId, patients.id))
      .where(eq(patients.branchId, branchId));
    
    if (status) {
      query = query.where(and(eq(patients.branchId, branchId), eq(invoices.status, status)));
    }
    
    return await query.orderBy(desc(invoices.issueDate));
  }

  async getInvoice(id: string): Promise<Invoice | undefined> {
    const [invoice] = await db.select().from(invoices).where(eq(invoices.id, id));
    return invoice || undefined;
  }

  async getInvoicesByPatient(patientId: string, branchId: string): Promise<Invoice[]> {
    // 🔒 CRITICAL: Enforce branch isolation via patient join
    return await db
      .select()
      .from(invoices)
      .leftJoin(patients, eq(invoices.patientId, patients.id))
      .where(and(eq(invoices.patientId, patientId), eq(patients.branchId, branchId)))
      .orderBy(desc(invoices.issueDate));
  }

  async createInvoice(invoice: InsertInvoice): Promise<Invoice> {
    const invoiceToInsert = {
      ...invoice,
      subtotal: invoice.subtotal.toString(),
      discount: invoice.discount !== undefined ? invoice.discount.toString() : "0",
      total: invoice.total.toString()
    };
    const [newInvoice] = await db
      .insert(invoices)
      .values(invoiceToInsert)
      .returning();
    return newInvoice;
  }

  async updateInvoice(id: string, invoice: Partial<InsertInvoice>): Promise<Invoice> {
    const invoiceToUpdate = {
      ...invoice,
      subtotal: invoice.subtotal !== undefined ? invoice.subtotal.toString() : undefined,
      discount: invoice.discount !== undefined ? invoice.discount.toString() : undefined,
      total: invoice.total !== undefined ? invoice.total.toString() : undefined,
      updatedAt: new Date()
    };
    const [updated] = await db
      .update(invoices)
      .set(invoiceToUpdate)
      .where(eq(invoices.id, id))
      .returning();
    return updated;
  }

  async deleteInvoice(id: string): Promise<void> {
    await db.delete(invoices).where(eq(invoices.id, id));
  }

  async getInvoiceItems(invoiceId: string): Promise<InvoiceItem[]> {
    return await db
      .select()
      .from(invoiceItems)
      .where(eq(invoiceItems.invoiceId, invoiceId))
      .orderBy(invoiceItems.itemName);
  }

  async createInvoiceItem(item: InsertInvoiceItem): Promise<InvoiceItem> {
    const itemToInsert = {
      ...item,
      price: item.price.toString(),
      total: item.total.toString()
    };
    const [newItem] = await db
      .insert(invoiceItems)
      .values(itemToInsert)
      .returning();
    return newItem;
  }

  async deleteInvoiceItem(id: string): Promise<void> {
    await db.delete(invoiceItems).where(eq(invoiceItems.id, id));
  }

  async getOverdueInvoices(branchId: string): Promise<Invoice[]> {
    // 🔒 CRITICAL: Enforce branch isolation via patient join
    const now = new Date();
    return await db
      .select()
      .from(invoices)
      .leftJoin(patients, eq(invoices.patientId, patients.id))
      .where(
        and(
          eq(patients.branchId, branchId),
          eq(invoices.status, 'pending'),
          lte(invoices.dueDate, now)
        )
      )
      .orderBy(invoices.dueDate);
  }

  async getDashboardStats() {
    return withPerformanceLogging('getDashboardStats', async () => {
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);

      // Single optimized query using CTEs to get all stats in one round trip
      const result = await db.execute(sql`
        WITH dashboard_stats AS (
          SELECT 
            (SELECT COUNT(*)::int FROM ${patients}) as total_patients,
            (SELECT COUNT(*)::int 
             FROM ${appointments} 
             WHERE ${appointments.appointmentDate} >= ${startOfDay} 
             AND ${appointments.appointmentDate} < ${endOfDay}) as today_appointments,
            (SELECT COUNT(*)::int 
             FROM ${appointments} 
             WHERE ${appointments.appointmentDate} >= ${startOfDay} 
             AND ${appointments.appointmentDate} < ${endOfDay}
             AND ${appointments.status} = 'in_progress') as active_appointments,
            (SELECT COALESCE(SUM(CAST(${invoices.total} AS NUMERIC)), 0)::int
             FROM ${invoices}
             WHERE ${invoices.status} = 'paid'
             AND ${invoices.issueDate} >= ${startOfMonth}
             AND ${invoices.issueDate} < ${endOfMonth}) as revenue,
            (SELECT COUNT(*)::int 
             FROM ${invoices} 
             WHERE ${invoices.status} = 'pending') as pending_payments,
            (SELECT COUNT(*)::int 
             FROM ${products} 
             WHERE ${products.isActive} = true 
             AND ${products.stock} <= ${products.minStock}) as low_stock
        )
        SELECT * FROM dashboard_stats
      `);

      const row = result.rows[0] as any;
      return {
        totalPatients: row.total_patients || 0,
        todayAppointments: row.today_appointments || 0,
        activeAppointments: row.active_appointments || 0,
        revenue: row.revenue || 0,
        pendingPayments: row.pending_payments || 0,
        lowStock: row.low_stock || 0
      };
    });
  }

  // Branch methods
  async getBranches(): Promise<Branch[]> {
    return await withPerformanceLogging('getBranches', async () => {
      return await db.select().from(branches).orderBy(desc(branches.createdAt));
    });
  }

  async getActiveBranches(): Promise<Branch[]> {
    return await withPerformanceLogging('getActiveBranches', async () => {
      return await db.select().from(branches)
        .where(eq(branches.status, 'active'))
        .orderBy(branches.name);
    });
  }

  async getBranch(id: string): Promise<Branch | undefined> {
    return await withPerformanceLogging('getBranch', async () => {
      const [branch] = await db.select().from(branches).where(eq(branches.id, id));
      return branch || undefined;
    });
  }

  async createBranch(branch: InsertBranch): Promise<Branch> {
    return await withPerformanceLogging('createBranch', async () => {
      const [newBranch] = await db
        .insert(branches)
        .values(branch)
        .returning();
      return newBranch;
    });
  }

  async updateBranch(id: string, branch: Partial<InsertBranch>): Promise<Branch> {
    return await withPerformanceLogging('updateBranch', async () => {
      const [updated] = await db
        .update(branches)
        .set({ ...branch, updatedAt: new Date() })
        .where(eq(branches.id, id))
        .returning();
      return updated;
    });
  }

  async deleteBranch(id: string): Promise<void> {
    return await withPerformanceLogging('deleteBranch', async () => {
      await db.delete(branches).where(eq(branches.id, id));
    });
  }

  // 🔒 SECURITY: Branch access control implementations
  async canUserAccessBranch(userId: string, branchId: string): Promise<boolean> {
    return await withPerformanceLogging('canUserAccessBranch', async () => {
      const user = await this.getUser(userId);
      if (!user) {
        return false;
      }

      // Руководители имеют доступ ко всем активным филиалам
      if (user.role === 'руководитель') {
        const branch = await this.getBranch(branchId);
        return !!(branch && branch.status === 'active');
      }

      // Остальные пользователи могут переключаться только на свой филиал
      return user.branchId === branchId;
    });
  }

  async getUserAccessibleBranches(userId: string): Promise<Branch[]> {
    return await withPerformanceLogging('getUserAccessibleBranches', async () => {
      const user = await this.getUser(userId);
      if (!user) {
        return [];
      }

      // Руководители видят все активные филиалы
      if (user.role === 'руководитель') {
        return await this.getActiveBranches();
      }

      // Остальные пользователи видят только свой филиал
      if (user.branchId) {
        const userBranch = await this.getBranch(user.branchId);
        if (userBranch && userBranch.status === 'active') {
          return [userBranch];
        }
      }

      return [];
    });
  }

  // Patient File methods implementation
  async createPatientFile(file: InsertPatientFile): Promise<PatientFile> {
    return withPerformanceLogging('createPatientFile', async () => {
      const [newFile] = await db
        .insert(patientFiles)
        .values(file)
        .returning();
      return newFile;
    });
  }

  async getPatientFiles(patientId: string, fileType?: string): Promise<PatientFile[]> {
    return withPerformanceLogging('getPatientFiles', async () => {
      const conditions = [eq(patientFiles.patientId, patientId)];
      
      if (fileType) {
        conditions.push(eq(patientFiles.fileType, fileType));
      }

      return await db
        .select()
        .from(patientFiles)
        .where(and(...conditions))
        .orderBy(desc(patientFiles.createdAt));
    });
  }

  async getPatientFileById(fileId: string): Promise<PatientFile | undefined> {
    return withPerformanceLogging('getPatientFileById', async () => {
      const [file] = await db
        .select()
        .from(patientFiles)
        .where(eq(patientFiles.id, fileId));
      return file || undefined;
    });
  }

  async deletePatientFile(fileId: string): Promise<void> {
    return withPerformanceLogging('deletePatientFile', async () => {
      await db.delete(patientFiles).where(eq(patientFiles.id, fileId));
    });
  }

  // Laboratory Study methods implementation
  async getLabStudies(activeOnly?: boolean): Promise<LabStudy[]> {
    return withPerformanceLogging('getLabStudies', async () => {
      const conditions = activeOnly ? [eq(labStudies.isActive, true)] : [];
      return await db
        .select()
        .from(labStudies)
        .where(conditions.length ? and(...conditions) : undefined)
        .orderBy(labStudies.category, labStudies.name);
    });
  }

  async getLabStudy(id: string): Promise<LabStudy | undefined> {
    return withPerformanceLogging('getLabStudy', async () => {
      const [study] = await db.select().from(labStudies).where(eq(labStudies.id, id));
      return study || undefined;
    });
  }

  async createLabStudy(study: InsertLabStudy): Promise<LabStudy> {
    return withPerformanceLogging('createLabStudy', async () => {
      const [newStudy] = await db
        .insert(labStudies)
        .values(study)
        .returning();
      return newStudy;
    });
  }

  async updateLabStudy(id: string, study: Partial<InsertLabStudy>): Promise<LabStudy> {
    return withPerformanceLogging('updateLabStudy', async () => {
      const [updated] = await db
        .update(labStudies)
        .set({ ...study, updatedAt: new Date() })
        .where(eq(labStudies.id, id))
        .returning();
      return updated;
    });
  }

  async deleteLabStudy(id: string): Promise<void> {
    return withPerformanceLogging('deleteLabStudy', async () => {
      await db.delete(labStudies).where(eq(labStudies.id, id));
    });
  }

  async searchLabStudies(query: string): Promise<LabStudy[]> {
    return withPerformanceLogging('searchLabStudies', async () => {
      return await db
        .select()
        .from(labStudies)
        .where(
          or(
            like(labStudies.name, `%${query}%`),
            like(labStudies.category, `%${query}%`),
            like(labStudies.description, `%${query}%`)
          )
        )
        .orderBy(labStudies.category, labStudies.name);
    });
  }

  // Laboratory Parameter methods implementation
  async getLabParameters(studyId?: string): Promise<LabParameter[]> {
    return withPerformanceLogging('getLabParameters', async () => {
      const conditions = studyId ? [eq(labParameters.studyId, studyId)] : [];
      return await db
        .select()
        .from(labParameters)
        .where(conditions.length ? and(...conditions) : undefined)
        .orderBy(labParameters.sortOrder, labParameters.name);
    });
  }

  async getLabParameter(id: string): Promise<LabParameter | undefined> {
    return withPerformanceLogging('getLabParameter', async () => {
      const [parameter] = await db.select().from(labParameters).where(eq(labParameters.id, id));
      return parameter || undefined;
    });
  }

  async createLabParameter(parameter: InsertLabParameter): Promise<LabParameter> {
    return withPerformanceLogging('createLabParameter', async () => {
      const [newParameter] = await db
        .insert(labParameters)
        .values(parameter)
        .returning();
      return newParameter;
    });
  }

  async updateLabParameter(id: string, parameter: Partial<InsertLabParameter>): Promise<LabParameter> {
    return withPerformanceLogging('updateLabParameter', async () => {
      const [updated] = await db
        .update(labParameters)
        .set({ ...parameter, updatedAt: new Date() })
        .where(eq(labParameters.id, id))
        .returning();
      return updated;
    });
  }

  async deleteLabParameter(id: string): Promise<void> {
    return withPerformanceLogging('deleteLabParameter', async () => {
      await db.delete(labParameters).where(eq(labParameters.id, id));
    });
  }

  // Reference Range methods implementation
  async getReferenceRanges(parameterId?: string, species?: string): Promise<ReferenceRange[]> {
    return withPerformanceLogging('getReferenceRanges', async () => {
      const conditions = [];
      if (parameterId) conditions.push(eq(referenceRanges.parameterId, parameterId));
      if (species) conditions.push(eq(referenceRanges.species, species));
      
      return await db
        .select()
        .from(referenceRanges)
        .where(conditions.length ? and(...conditions) : undefined)
        .orderBy(referenceRanges.species, referenceRanges.breed);
    });
  }

  async getReferenceRange(id: string): Promise<ReferenceRange | undefined> {
    return withPerformanceLogging('getReferenceRange', async () => {
      const [range] = await db.select().from(referenceRanges).where(eq(referenceRanges.id, id));
      return range || undefined;
    });
  }

  async createReferenceRange(range: InsertReferenceRange): Promise<ReferenceRange> {
    return withPerformanceLogging('createReferenceRange', async () => {
      const [newRange] = await db
        .insert(referenceRanges)
        .values(range)
        .returning();
      return newRange;
    });
  }

  async updateReferenceRange(id: string, range: Partial<InsertReferenceRange>): Promise<ReferenceRange> {
    return withPerformanceLogging('updateReferenceRange', async () => {
      const [updated] = await db
        .update(referenceRanges)
        .set({ ...range, updatedAt: new Date() })
        .where(eq(referenceRanges.id, id))
        .returning();
      return updated;
    });
  }

  async deleteReferenceRange(id: string): Promise<void> {
    return withPerformanceLogging('deleteReferenceRange', async () => {
      await db.delete(referenceRanges).where(eq(referenceRanges.id, id));
    });
  }

  async getApplicableReferenceRange(parameterId: string, species: string, breed?: string, age?: number, sex?: string): Promise<ReferenceRange | undefined> {
    return withPerformanceLogging('getApplicableReferenceRange', async () => {
      const conds: (SQL<unknown> | undefined)[] = [
        eq(referenceRanges.parameterId, parameterId),
        eq(referenceRanges.species, species),
        eq(referenceRanges.isActive, true),
        sex ? or(isNull(referenceRanges.gender), eq(referenceRanges.gender, sex)) : undefined,
        breed ? or(isNull(referenceRanges.breed), eq(referenceRanges.breed, breed)) : undefined,
        age !== undefined ? or(isNull(referenceRanges.ageMin), lte(referenceRanges.ageMin, age)) : undefined,
        age !== undefined ? or(isNull(referenceRanges.ageMax), gte(referenceRanges.ageMax, age)) : undefined,
      ];
      const where = and(...conds.filter((c): c is SQL<unknown> => c !== undefined));
      
      const [range] = await db
        .select()
        .from(referenceRanges)
        .where(where)
        .orderBy(
          sql`CASE WHEN ${referenceRanges.breed} IS NOT NULL THEN 0 ELSE 1 END`,
          sql`CASE WHEN ${referenceRanges.gender} IS NOT NULL THEN 0 ELSE 1 END`
        )
        .limit(1);
        
      return range || undefined;
    });
  }

  // Laboratory Order methods implementation - 🔒 SECURITY: branchId mandatory for PHI isolation
  async getLabOrders(patientId: string | undefined, status: string | undefined, branchId: string): Promise<LabOrder[]> {
    return withPerformanceLogging('getLabOrders', async () => {
      const conditions = [eq(patients.branchId, branchId)];
      if (patientId) conditions.push(eq(labOrders.patientId, patientId));
      if (status) conditions.push(eq(labOrders.status, status));
      
      // 🔒 CRITICAL: Enforce branch isolation via patient join
      return await db
        .select()
        .from(labOrders)
        .leftJoin(patients, eq(labOrders.patientId, patients.id))
        .where(and(...conditions))
        .orderBy(desc(labOrders.orderedDate));
    });
  }

  async getLabOrder(id: string): Promise<LabOrder | undefined> {
    return withPerformanceLogging('getLabOrder', async () => {
      const [order] = await db.select().from(labOrders).where(eq(labOrders.id, id));
      return order || undefined;
    });
  }

  async createLabOrder(order: InsertLabOrder): Promise<LabOrder> {
    return withPerformanceLogging('createLabOrder', async () => {
      const [newOrder] = await db
        .insert(labOrders)
        .values(order)
        .returning();
      return newOrder;
    });
  }

  async updateLabOrder(id: string, order: Partial<InsertLabOrder>): Promise<LabOrder> {
    return withPerformanceLogging('updateLabOrder', async () => {
      const [updated] = await db
        .update(labOrders)
        .set({ ...order, updatedAt: new Date() })
        .where(eq(labOrders.id, id))
        .returning();
      return updated;
    });
  }

  async deleteLabOrder(id: string): Promise<void> {
    return withPerformanceLogging('deleteLabOrder', async () => {
      await db.delete(labOrders).where(eq(labOrders.id, id));
    });
  }

  async getLabOrdersByDoctor(doctorId: string, branchId: string): Promise<LabOrder[]> {
    return withPerformanceLogging('getLabOrdersByDoctor', async () => {
      // 🔒 CRITICAL: Enforce branch isolation via patient join
      return await db
        .select()
        .from(labOrders)
        .leftJoin(patients, eq(labOrders.patientId, patients.id))
        .where(and(eq(labOrders.doctorId, doctorId), eq(patients.branchId, branchId)))
        .orderBy(desc(labOrders.orderedDate));
    });
  }

  async getLabOrdersByAppointment(appointmentId: string, branchId: string): Promise<LabOrder[]> {
    return withPerformanceLogging('getLabOrdersByAppointment', async () => {
      // 🔒 CRITICAL: Enforce branch isolation via patient join
      return await db
        .select()
        .from(labOrders)
        .leftJoin(patients, eq(labOrders.patientId, patients.id))
        .where(and(eq(labOrders.appointmentId, appointmentId), eq(patients.branchId, branchId)))
        .orderBy(desc(labOrders.orderedDate));
    });
  }

  // Laboratory Result Detail methods implementation
  async getLabResultDetails(orderId: string): Promise<LabResultDetail[]> {
    return withPerformanceLogging('getLabResultDetails', async () => {
      return await db
        .select()
        .from(labResultDetails)
        .where(eq(labResultDetails.orderId, orderId))
        .orderBy(labResultDetails.createdAt);
    });
  }

  async getLabResultDetail(id: string): Promise<LabResultDetail | undefined> {
    return withPerformanceLogging('getLabResultDetail', async () => {
      const [detail] = await db.select().from(labResultDetails).where(eq(labResultDetails.id, id));
      return detail || undefined;
    });
  }

  async createLabResultDetail(detail: InsertLabResultDetail): Promise<LabResultDetail> {
    return withPerformanceLogging('createLabResultDetail', async () => {
      const values: typeof labResultDetails.$inferInsert = {
        ...detail,
        numericValue: detail.numericValue === undefined ? null : String(detail.numericValue),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const [newDetail] = await db
        .insert(labResultDetails)
        .values(values)
        .returning();
      return newDetail;
    });
  }

  async updateLabResultDetail(id: string, detail: Partial<InsertLabResultDetail>): Promise<LabResultDetail> {
    return withPerformanceLogging('updateLabResultDetail', async () => {
      const patch: Partial<typeof labResultDetails.$inferInsert> = {
        ...detail,
        numericValue: detail.numericValue === undefined ? undefined : String(detail.numericValue),
        updatedAt: new Date(),
      };
      
      const [updated] = await db
        .update(labResultDetails)
        .set(patch)
        .where(eq(labResultDetails.id, id))
        .returning();
      return updated;
    });
  }

  async deleteLabResultDetail(id: string): Promise<void> {
    return withPerformanceLogging('deleteLabResultDetail', async () => {
      await db.delete(labResultDetails).where(eq(labResultDetails.id, id));
    });
  }

  async getLabResultsByParameter(parameterId: string): Promise<LabResultDetail[]> {
    return withPerformanceLogging('getLabResultsByParameter', async () => {
      return await db
        .select()
        .from(labResultDetails)
        .where(eq(labResultDetails.parameterId, parameterId))
        .orderBy(desc(labResultDetails.createdAt));
    });
  }

  // Payment Intent methods
  async createPaymentIntent(paymentIntentData: {
    invoiceId: string;
    amount: number;
    currency: string;
    paymentMethod: string;
    status: string;
    integrationAccountId: string | null;
    externalPaymentId: string;
    paymentData: any;
    errorMessage: string | null;
  }): Promise<string> {
    return withPerformanceLogging('createPaymentIntent', async () => {
      const [created] = await db
        .insert(paymentIntents)
        .values({
          invoiceId: paymentIntentData.invoiceId,
          amount: paymentIntentData.amount.toString(),
          currency: paymentIntentData.currency,
          paymentMethod: paymentIntentData.paymentMethod,
          status: paymentIntentData.status,
          integrationAccountId: paymentIntentData.integrationAccountId,
          externalPaymentId: paymentIntentData.externalPaymentId,
          paymentData: paymentIntentData.paymentData,
          errorMessage: paymentIntentData.errorMessage,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning({ id: paymentIntents.id });
      return created.id;
    });
  }

  async updatePaymentIntent(id: string, updates: {
    status?: string;
    confirmedAt?: Date;
    errorMessage?: string | null;
  }): Promise<void> {
    return withPerformanceLogging('updatePaymentIntent', async () => {
      await db
        .update(paymentIntents)
        .set({
          ...updates,
          updatedAt: new Date(),
        })
        .where(eq(paymentIntents.id, id));
    });
  }
  
  // Fiscal Receipt methods
  async createFiscalReceipt(fiscalReceiptData: {
    invoiceId: string;
    receiptNumber: string | null;
    status: string;
    receiptType: string;
    paymentMethod: string;
    customerEmail: string | null;
    customerPhone: string | null;
    taxationSystem: string;
    operatorName: string;
    operatorInn: string | null;
    totalAmount: number;
    vatAmount: number;
    cashAmount: number;
    cardAmount: number;
    items: any;
    markingStatus: string;
    fiscalData: any;
    integrationAccountId: string | null;
    externalReceiptId: string | null;
    errorMessage: string | null;
  }): Promise<string> {
    return withPerformanceLogging('createFiscalReceipt', async () => {
      const [created] = await db
        .insert(fiscalReceipts)
        .values({
          invoiceId: fiscalReceiptData.invoiceId,
          receiptNumber: fiscalReceiptData.receiptNumber,
          status: fiscalReceiptData.status,
          receiptType: fiscalReceiptData.receiptType,
          paymentMethod: fiscalReceiptData.paymentMethod,
          customerEmail: fiscalReceiptData.customerEmail,
          customerPhone: fiscalReceiptData.customerPhone,
          taxationSystem: fiscalReceiptData.taxationSystem,
          operatorName: fiscalReceiptData.operatorName,
          operatorInn: fiscalReceiptData.operatorInn,
          totalAmount: fiscalReceiptData.totalAmount.toString(),
          vatAmount: fiscalReceiptData.vatAmount.toString(),
          cashAmount: fiscalReceiptData.cashAmount.toString(),
          cardAmount: fiscalReceiptData.cardAmount.toString(),
          items: fiscalReceiptData.items,
          markingStatus: fiscalReceiptData.markingStatus,
          fiscalData: fiscalReceiptData.fiscalData,
          integrationAccountId: fiscalReceiptData.integrationAccountId,
          externalReceiptId: fiscalReceiptData.externalReceiptId,
          errorMessage: fiscalReceiptData.errorMessage,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning({ id: fiscalReceipts.id });
      return created.id;
    });
  }

  async updateFiscalReceipt(id: string, updates: {
    receiptNumber?: string;
    externalReceiptId?: string;
    status?: string;
    fiscalData?: any;
    registeredAt?: Date;
    errorMessage?: string | null;
  }): Promise<void> {
    return withPerformanceLogging('updateFiscalReceipt', async () => {
      await db
        .update(fiscalReceipts)
        .set({
          ...updates,
          updatedAt: new Date(),
        })
        .where(eq(fiscalReceipts.id, id));
    });
  }
  
  // Additional methods for YooKassa integration
  async getPaymentIntentsByInvoice(invoiceId: string): Promise<{
    id: string;
    status: string;
    paymentData: any;
  }[]> {
    return withPerformanceLogging('getPaymentIntentsByInvoice', async () => {
      return await db
        .select({
          id: paymentIntents.id,
          status: paymentIntents.status,
          paymentData: paymentIntents.paymentData
        })
        .from(paymentIntents)
        .where(eq(paymentIntents.invoiceId, invoiceId))
        .orderBy(desc(paymentIntents.createdAt));
    });
  }
  
  async getCatalogItemById(id: string): Promise<{
    id: string;
    type: string;
    vatRate: string;
    externalId: string | null;
    markingStatus: string;
  } | undefined> {
    return withPerformanceLogging('getCatalogItemById', async () => {
      const [item] = await db
        .select({
          id: catalogItems.id,
          type: catalogItems.type,
          vatRate: catalogItems.vatRate,
          externalId: catalogItems.externalId,
          markingStatus: catalogItems.markingStatus
        })
        .from(catalogItems)
        .where(eq(catalogItems.id, id));
      return item || undefined;
    });
  }
}

export const storage = new DatabaseStorage();
