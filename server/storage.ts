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
  users, owners, patients, doctors, appointments, 
  medicalRecords, medications, services, products, 
  invoices, invoiceItems, branches, patientFiles
} from "@shared/schema";
import { db } from "./db";
import { eq, like, and, or, desc, sql, gte, lte } from "drizzle-orm";
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

  // Owner methods
  getOwners(): Promise<Owner[]>;
  getOwner(id: string): Promise<Owner | undefined>;
  createOwner(owner: InsertOwner): Promise<Owner>;
  updateOwner(id: string, owner: Partial<InsertOwner>): Promise<Owner>;
  deleteOwner(id: string): Promise<void>;
  searchOwners(query: string): Promise<Owner[]>;

  // Patient methods
  getPatients(limit?: number, offset?: number): Promise<Patient[]>;
  getPatient(id: string): Promise<Patient | undefined>;
  getPatientsByOwner(ownerId: string): Promise<Patient[]>;
  createPatient(patient: InsertPatient): Promise<Patient>;
  updatePatient(id: string, patient: Partial<InsertPatient>): Promise<Patient>;
  deletePatient(id: string): Promise<void>;
  searchPatients(query: string): Promise<Patient[]>;

  // Doctor methods
  getDoctors(): Promise<Doctor[]>;
  getDoctor(id: string): Promise<Doctor | undefined>;
  createDoctor(doctor: InsertDoctor): Promise<Doctor>;
  updateDoctor(id: string, doctor: Partial<InsertDoctor>): Promise<Doctor>;
  deleteDoctor(id: string): Promise<void>;
  getActiveDoctors(): Promise<Doctor[]>;

  // Appointment methods
  getAppointments(date?: Date): Promise<Appointment[]>;
  getAppointment(id: string): Promise<Appointment | undefined>;
  getAppointmentsByDoctor(doctorId: string, date?: Date): Promise<Appointment[]>;
  getAppointmentsByPatient(patientId: string): Promise<Appointment[]>;
  createAppointment(appointment: InsertAppointment): Promise<Appointment>;
  updateAppointment(id: string, appointment: Partial<InsertAppointment>): Promise<Appointment>;
  deleteAppointment(id: string): Promise<void>;
  checkAppointmentConflicts(doctorId: string, date: Date, duration: number, excludeId?: string): Promise<boolean>;

  // Medical Record methods
  getMedicalRecords(patientId?: string): Promise<MedicalRecord[]>;
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

  // Invoice methods
  getInvoices(status?: string): Promise<Invoice[]>;
  getInvoice(id: string): Promise<Invoice | undefined>;
  getInvoicesByPatient(patientId: string): Promise<Invoice[]>;
  createInvoice(invoice: InsertInvoice): Promise<Invoice>;
  updateInvoice(id: string, invoice: Partial<InsertInvoice>): Promise<Invoice>;
  deleteInvoice(id: string): Promise<void>;
  getInvoiceItems(invoiceId: string): Promise<InvoiceItem[]>;
  createInvoiceItem(item: InsertInvoiceItem): Promise<InvoiceItem>;
  deleteInvoiceItem(id: string): Promise<void>;
  getOverdueInvoices(): Promise<Invoice[]>;
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

  // Owner methods
  async getOwners(): Promise<Owner[]> {
    return await db.select().from(owners).orderBy(desc(owners.createdAt));
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

  async searchOwners(query: string): Promise<Owner[]> {
    const searchQuery = `%${query}%`;
    return await db
      .select()
      .from(owners)
      .where(
        or(
          like(owners.name, searchQuery),
          like(owners.phone, searchQuery),
          like(owners.email, searchQuery)
        )
      )
      .orderBy(desc(owners.createdAt));
  }

  // Patient methods
  async getPatients(limit = 50, offset = 0): Promise<Patient[]> {
    return withPerformanceLogging('getPatients', async () =>
      await db
        .select()
        .from(patients)
        .orderBy(desc(patients.createdAt))
        .limit(limit)
        .offset(offset)
    );
  }

  async getPatient(id: string): Promise<Patient | undefined> {
    const [patient] = await db.select().from(patients).where(eq(patients.id, id));
    return patient || undefined;
  }

  async getPatientsByOwner(ownerId: string): Promise<Patient[]> {
    return await db.select().from(patients).where(eq(patients.ownerId, ownerId));
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

  async searchPatients(query: string): Promise<Patient[]> {
    return withPerformanceLogging('searchPatients', async () => {
      const searchQuery = `%${query}%`;
      return await db
        .select()
        .from(patients)
        .where(
          or(
            like(patients.name, searchQuery),
            like(patients.species, searchQuery),
            like(patients.breed, searchQuery),
            like(patients.microchipNumber, searchQuery)
          )
        )
        .orderBy(desc(patients.createdAt));
    });
  }

  // Doctor methods
  async getDoctors(): Promise<Doctor[]> {
    return await db.select().from(doctors).orderBy(desc(doctors.createdAt));
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

  async getActiveDoctors(): Promise<Doctor[]> {
    return await db.select().from(doctors).where(eq(doctors.isActive, true));
  }

  // Appointment methods
  async getAppointments(date?: Date): Promise<any[]> {
    return withPerformanceLogging(`getAppointments${date ? '(filtered)' : '(all)'}`, async () => {
      if (date) {
        const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        const endOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
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
          .where(
            and(
              gte(appointments.appointmentDate, startOfDay),
              lte(appointments.appointmentDate, endOfDay)
            )
          )
          .orderBy(appointments.appointmentDate);
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
        .orderBy(appointments.appointmentDate);
    });
  }

  async getAppointment(id: string): Promise<Appointment | undefined> {
    const [appointment] = await db.select().from(appointments).where(eq(appointments.id, id));
    return appointment || undefined;
  }

  async getAppointmentsByDoctor(doctorId: string, date?: Date): Promise<Appointment[]> {
    if (date) {
      const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const endOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
      return await db.select().from(appointments)
        .where(
          and(
            eq(appointments.doctorId, doctorId),
            gte(appointments.appointmentDate, startOfDay),
            lte(appointments.appointmentDate, endOfDay)
          )
        )
        .orderBy(appointments.appointmentDate);
    }
    
    return await db.select().from(appointments)
      .where(eq(appointments.doctorId, doctorId))
      .orderBy(appointments.appointmentDate);
  }

  async getAppointmentsByPatient(patientId: string): Promise<Appointment[]> {
    return await db
      .select()
      .from(appointments)
      .where(eq(appointments.patientId, patientId))
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

  // Medical Record methods
  async getMedicalRecords(patientId?: string): Promise<MedicalRecord[]> {
    if (patientId) {
      return await db.select().from(medicalRecords)
        .where(eq(medicalRecords.patientId, patientId))
        .orderBy(desc(medicalRecords.visitDate));
    }
    
    return await db.select().from(medicalRecords).orderBy(desc(medicalRecords.visitDate));
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

  // Invoice methods
  async getInvoices(status?: string): Promise<Invoice[]> {
    if (status) {
      return await db.select().from(invoices)
        .where(eq(invoices.status, status))
        .orderBy(desc(invoices.issueDate));
    }
    
    return await db.select().from(invoices).orderBy(desc(invoices.issueDate));
  }

  async getInvoice(id: string): Promise<Invoice | undefined> {
    const [invoice] = await db.select().from(invoices).where(eq(invoices.id, id));
    return invoice || undefined;
  }

  async getInvoicesByPatient(patientId: string): Promise<Invoice[]> {
    return await db
      .select()
      .from(invoices)
      .where(eq(invoices.patientId, patientId))
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

  async getOverdueInvoices(): Promise<Invoice[]> {
    const now = new Date();
    return await db
      .select()
      .from(invoices)
      .where(
        and(
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
}

export const storage = new DatabaseStorage();
