import { 
  type User, type InsertUser,
  type Owner, type InsertOwner,
  type Patient, type InsertPatient,
  type PatientOwner, type InsertPatientOwner,
  type Doctor, type InsertDoctor,
  type Appointment, type InsertAppointment,
  type QueueEntry, type InsertQueueEntry,
  type QueueCall, type InsertQueueCall,
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
  type SystemSetting, type InsertSystemSetting, type UpdateSystemSetting,
  type CashRegister, type InsertCashRegister,
  type CashShift, type InsertCashShift,
  type Customer, type InsertCustomer,
  type DiscountRule, type InsertDiscountRule,
  type PaymentMethod, type InsertPaymentMethod,
  type SalesTransaction, type InsertSalesTransaction,
  type SalesTransactionItem, type InsertSalesTransactionItem,
  type CashOperation, type InsertCashOperation,
  type UserRole, type InsertUserRole,
  type SubscriptionPlan, type InsertSubscriptionPlan,
  type ClinicSubscription, type InsertClinicSubscription,
  type SubscriptionPayment, type InsertSubscriptionPayment,
  type BillingNotification, type InsertBillingNotification,
  type Tenant, type InsertTenant,
  type LegalEntity, type InsertLegalEntity,
  type IntegrationCredentials, type InsertIntegrationCredentials,
  type ClinicalCase, type InsertClinicalCase,
  type ClinicalEncounter, type InsertClinicalEncounter,
  type LabAnalysis, type InsertLabAnalysis,
  type Attachment, type InsertAttachment,
  type DocumentTemplate, type InsertDocumentTemplate,
  type SmsVerificationCode, type InsertSmsVerificationCode,
  type PushToken, type InsertPushToken,
  type Conversation, type InsertConversation,
  type Message, type InsertMessage,
  type CallLog, type InsertCallLog,
  type Cage, type InsertCage,
  type HospitalStay, type InsertHospitalStay,
  type TreatmentLog, type InsertTreatmentLog,
  users, owners, patients, patientOwners, doctors, appointments, 
  queueEntries, queueCalls,
  medicalRecords, medications, services, products, 
  invoices, invoiceItems, branches, patientFiles,
  labStudies, labParameters, referenceRanges, 
  labOrders, labResultDetails, paymentIntents, fiscalReceipts,
  catalogItems, systemSettings, cashRegisters, cashShifts, 
  customers, discountRules, paymentMethods, salesTransactions, 
  salesTransactionItems, cashOperations, userRoles, userRoleAssignments,
  integrationLogs, subscriptionPlans, clinicSubscriptions,
  subscriptionPayments, billingNotifications, tenants, legalEntities, integrationCredentials,
  clinicalCases, clinicalEncounters, labAnalyses, attachments, documentTemplates,
  smsVerificationCodes, pushTokens, conversations, messages, callLogs,
  cages, hospitalStays, treatmentLog
} from "@shared/schema";
import { db } from "./db-local";
import { pool } from "./db-local";
import { eq, like, and, or, desc, asc, sql, gte, lte, lt, gt, isNull, isNotNull, ilike, inArray, exists, type SQL } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import { AsyncLocalStorage } from 'async_hooks';

// ID generation utility
const generateId = () => randomUUID();

// AsyncLocalStorage for request-scoped database context
export const requestDbStorage = new AsyncLocalStorage<typeof db>();

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

/**
 * Multi-tenant context utilities
 * Sets tenant_id in PostgreSQL session variable for Row-Level Security (RLS)
 */

/**
 * Execute query with tenant context
 * 
 * Strategy:
 * 1. If request-scoped db exists (from tenantDbMiddleware), use it
 *    - Already has SET LOCAL app.tenant_id in place
 *    - Single transaction for entire request (optimal performance)
 * 
 * 2. Otherwise, use global db
 *    - For system-level queries, background jobs, or non-request contexts
 * 
 * @param tenantId - The tenant ID (for backward compatibility, not used when request db exists)
 * @param queryFn - The query function to execute (receives db instance)
 * @returns The result of the query function
 */
async function withTenantContext<T>(
  tenantId: string | undefined,
  queryFn: (dbInstance: typeof db) => Promise<T>
): Promise<T> {
  // Check if request-scoped db is available (set by tenantDbMiddleware)
  const requestDb = requestDbStorage.getStore();
  
  if (requestDb) {
    // Use request-scoped db (already has tenant context set via SET LOCAL)
    return queryFn(requestDb);
  }
  
  // Fallback to global db for non-request contexts
  // (e.g., background jobs, cron tasks, system operations)
  return queryFn(db);
}

// Enhanced storage interface for veterinary clinic system
export interface IStorage {
  // 🔐 SUPERADMIN: Tenant management methods (BYPASSRLS required)
  getAllTenants(): Promise<Tenant[]>;
  getTenant(id: string): Promise<Tenant | undefined>;
  getTenantBySlug(slug: string): Promise<Tenant | undefined>;
  getTenantByDomain(domain: string): Promise<Tenant | undefined>;
  createTenant(tenant: InsertTenant): Promise<Tenant>;
  updateTenant(id: string, tenant: Partial<InsertTenant>): Promise<Tenant>;
  deleteTenant(id: string): Promise<void>;
  
  // Galen integration methods
  updateGalenCredentials(tenantId: string, credentials: {
    galenApiUser?: string | null;
    galenApiKey?: string | null;
    galenIssuerId?: string | null;
    galenServiceId?: string | null;
  }): Promise<Tenant>;
  getGalenCredentials(tenantId: string): Promise<{
    galenApiUser: string | null;
    galenApiKey: string | null;
    galenIssuerId: string | null;
    galenServiceId: string | null;
  } | null>;
  updatePatientGalenStatus(patientId: string, status: {
    galenUuid?: string | null;
    galenSyncStatus?: string;
    galenLastSyncError?: string | null;
    galenLastSyncAt?: Date | null;
  }): Promise<Patient>;

  // Legal Entity methods
  getLegalEntities(): Promise<LegalEntity[]>;
  getActiveLegalEntities(): Promise<LegalEntity[]>;
  getLegalEntity(id: string): Promise<LegalEntity | undefined>;
  createLegalEntity(legalEntity: InsertLegalEntity): Promise<LegalEntity>;
  updateLegalEntity(id: string, legalEntity: Partial<InsertLegalEntity>): Promise<LegalEntity>;
  deleteLegalEntity(id: string): Promise<void>;

  // User methods (keep existing for authentication)
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  verifyPassword(password: string, hashedPassword: string): Promise<boolean>;
  createUser(user: InsertUser): Promise<User>;
  getUsers(): Promise<User[]>;
  updateUser(id: string, updateData: Partial<InsertUser>): Promise<User>;
  updateUserLastLogin(id: string): Promise<void>;
  updateUserLocale(id: string, locale: string): Promise<void>;
  deleteUser(id: string): Promise<void>;

  // Branch methods
  getBranches(): Promise<Branch[]>;
  getActiveBranches(): Promise<Branch[]>;
  getBranch(id: string): Promise<Branch | undefined>;
  getTenantBranches(tenantId: string): Promise<Branch[]>;
  createBranch(branch: InsertBranch): Promise<Branch>;
  updateBranch(id: string, branch: Partial<InsertBranch>): Promise<Branch>;
  deleteBranch(id: string): Promise<void>;
  
  // 🔒 SECURITY: Branch access control methods
  canUserAccessBranch(userId: string, branchId: string): Promise<boolean>;
  getUserAccessibleBranches(userId: string): Promise<Branch[]>;

  // Owner methods - 🔒 SECURITY: branchId required for PHI isolation
  getOwners(branchId: string): Promise<Owner[]>;
  getOwnersPaginated(params: { branchId: string; search?: string; limit?: number; offset?: number }): Promise<{ data: any[]; total: number }>;
  getAllOwners(limit?: number, offset?: number): Promise<Owner[]>; // 🔒 All owners from all branches within tenant
  getOwner(id: string): Promise<Owner | undefined>;
  createOwner(owner: InsertOwner): Promise<Owner>;
  updateOwner(id: string, owner: Partial<InsertOwner>): Promise<Owner>;
  deleteOwner(id: string): Promise<void>;
  searchOwners(query: string, branchId: string): Promise<Owner[]>;

  // Patient methods - 🔒 SECURITY: branchId required for PHI isolation
  getPatients(limit: number | undefined, offset: number | undefined, branchId: string): Promise<Patient[]>;
  getPatientsPaginated(params: { branchId: string; search?: string; limit?: number; offset?: number }): Promise<{ data: any[]; total: number }>;
  getAllPatients(limit: number | undefined, offset: number | undefined): Promise<Patient[]>; // 🔒 All patients from all branches within tenant
  getPatient(id: string): Promise<Patient | undefined>;
  getPatientsByOwner(ownerId: string, branchId: string): Promise<Patient[]>;
  createPatient(patient: InsertPatient): Promise<Patient>;
  updatePatient(id: string, patient: Partial<InsertPatient>): Promise<Patient>;
  deletePatient(id: string): Promise<void>;
  searchPatients(query: string, branchId: string): Promise<Patient[]>;

  // Patient-Owner relationship methods - 🔒 SECURITY: tenant-scoped
  getPatientOwners(patientId: string): Promise<PatientOwner[]>;
  addPatientOwner(patientOwner: InsertPatientOwner): Promise<PatientOwner>;
  removePatientOwner(patientId: string, ownerId: string): Promise<void>;
  setPrimaryOwner(patientId: string, ownerId: string): Promise<void>;

  // Doctor methods - 🔒 SECURITY: branchId required for PHI isolation
  getDoctors(branchId: string): Promise<Doctor[]>;
  getAllDoctors(): Promise<Doctor[]>; // 🔒 All doctors from all branches within tenant (doctors can work in multiple branches)
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
  getUpcomingAppointments(startDate: Date, endDate: Date): Promise<Appointment[]>;
  createAppointment(appointment: InsertAppointment): Promise<Appointment>;
  updateAppointment(id: string, appointment: Partial<InsertAppointment>): Promise<Appointment>;
  deleteAppointment(id: string): Promise<void>;
  checkAppointmentConflicts(doctorId: string, date: Date, duration: number, branchId: string, excludeId?: string): Promise<boolean>;

  // Queue methods - 🔒 SECURITY: branchId required for PHI isolation
  getQueueEntries(branchId: string, status?: string): Promise<QueueEntry[]>;
  getQueueEntry(id: string): Promise<QueueEntry | undefined>;
  getNextQueueNumber(branchId: string): Promise<number>;
  createQueueEntry(entry: InsertQueueEntry): Promise<QueueEntry>;
  updateQueueEntry(id: string, entry: Partial<InsertQueueEntry>): Promise<QueueEntry>;
  deleteQueueEntry(id: string): Promise<void>;
  
  // Queue Call methods
  getQueueCalls(branchId: string, activeOnly?: boolean): Promise<QueueCall[]>;
  getQueueCall(id: string): Promise<QueueCall | undefined>;
  getQueueCallsByEntry(queueEntryId: string): Promise<QueueCall[]>;
  createQueueCall(call: InsertQueueCall): Promise<QueueCall>;
  updateQueueCall(id: string, call: Partial<InsertQueueCall>): Promise<QueueCall>;
  deleteQueueCall(id: string): Promise<void>;
  expireOldQueueCalls(): Promise<number>;

  // Medical Record methods - 🔒 SECURITY: branchId required for PHI isolation
  getMedicalRecords(patientId: string | undefined, branchId: string, limit?: number, offset?: number): Promise<MedicalRecord[]>;
  getMedicalRecordsCount(patientId: string | undefined, branchId: string): Promise<number>;
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
  deleteAllServices(): Promise<void>;
  searchServices(query: string): Promise<Service[]>;
  // External system integration methods for services
  getServiceByExternalId(externalId: string, system: string): Promise<Service | undefined>;
  getServicesByExternalSystem(system: string): Promise<Service[]>;

  // Product methods
  getProducts(activeOnly?: boolean): Promise<Product[]>;
  getProduct(id: string): Promise<Product | undefined>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: string, product: Partial<InsertProduct>): Promise<Product>;
  deleteProduct(id: string): Promise<void>;
  deleteAllProducts(): Promise<void>;
  searchProducts(query: string): Promise<Product[]>;
  getLowStockProducts(): Promise<Product[]>;
  updateProductStock(id: string, quantity: number): Promise<Product>;
  // External system integration methods
  getProductByExternalId(externalId: string, system: string): Promise<Product | undefined>;
  getProductsByExternalSystem(system: string): Promise<Product[]>;

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
    receiptType: string | null;
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
  
  // Local Print methods for fiscal receipts
  getFiscalReceipt(id: string): Promise<{
    id: string;
    invoiceId: string;
    items: any;
    totalAmount: string;
    customerEmail: string | null;
    customerPhone: string | null;
    paymentMethod: string;
    taxationSystem: string;
    operatorName: string | null;
    receiptType: string | null;
    localPrintStatus: string | null;
    localPrinterType: string | null;
    localPrintedAt: Date | null;
    localPrintData: any;
    localPrintError: string | null;
    createdAt: Date;
  } | undefined>;
  
  getPendingLocalPrintReceipts(branchId: string): Promise<{
    id: string;
    invoiceId: string;
    items: any;
    totalAmount: string;
    customerEmail: string | null;
    customerPhone: string | null;
    paymentMethod: string;
    taxationSystem: string;
    operatorName: string | null;
    receiptType: string | null;
    createdAt: Date;
  }[]>;
  
  markReceiptAsPrinted(receiptId: string, printResult: any, printedAt: Date): Promise<boolean>;
  
  requestLocalPrint(invoiceId: string, printerType: string, operatorName: string): Promise<string>;
  
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

  // System Settings methods
  getSystemSettings(): Promise<SystemSetting[]>;
  getSystemSetting(key: string): Promise<SystemSetting | undefined>;
  getSystemSettingsByCategory(category: string): Promise<SystemSetting[]>;
  createSystemSetting(setting: InsertSystemSetting): Promise<SystemSetting>;
  updateSystemSetting(key: string, setting: Partial<UpdateSystemSetting>): Promise<SystemSetting>;
  deleteSystemSetting(key: string): Promise<void>;
  createOrUpdateSystemSetting(key: string, value: string): Promise<SystemSetting>;

  // Integration logs methods
  getIntegrationLog(system: string, operation: string): Promise<any | undefined>;
  createIntegrationLog(log: { system: string; operation: string; status: string; details?: any }): Promise<any>;

  // === РАСШИРЕННАЯ КАССОВАЯ СИСТЕМА ===
  
  // Управление кассами
  getCashRegisters(branchId: string): Promise<CashRegister[]>;
  createCashRegister(register: InsertCashRegister): Promise<CashRegister>;
  updateCashRegister(id: string, updates: Partial<InsertCashRegister>): Promise<CashRegister | null>;
  
  // Управление сменами
  getCashShifts(branchId: string): Promise<CashShift[]>;
  createCashShift(shift: InsertCashShift): Promise<CashShift>;
  updateCashShift(id: string, updates: Partial<InsertCashShift>): Promise<CashShift | null>;
  openCashShift(registerId: string, cashierId: string, openingCash: string): Promise<CashShift>;
  closeCashShift(shiftId: string, closingCash: string, notes?: string): Promise<CashShift | null>;
  getCurrentShift(registerId: string): Promise<CashShift | null>;
  
  // Управление клиентами
  getCustomers(branchId: string, search?: string): Promise<Customer[]>;
  createCustomer(customer: InsertCustomer): Promise<Customer>;
  updateCustomer(id: string, updates: Partial<InsertCustomer>): Promise<Customer | null>;
  getCustomerByPhone(phone: string, branchId: string): Promise<Customer | null>;
  getCustomerByCard(cardNumber: string, branchId: string): Promise<Customer | null>;
  
  // Система скидок
  getDiscountRules(branchId: string): Promise<DiscountRule[]>;
  createDiscountRule(rule: InsertDiscountRule): Promise<DiscountRule>;
  
  // Способы оплаты
  getPaymentMethods(branchId: string): Promise<PaymentMethod[]>;
  createPaymentMethod(method: InsertPaymentMethod): Promise<PaymentMethod>;
  
  // Продажи и чеки
  createSalesTransaction(transaction: InsertSalesTransaction): Promise<SalesTransaction>;
  addTransactionItems(transactionId: string, items: InsertSalesTransactionItem[]): Promise<SalesTransactionItem[]>;
  createCompleteSalesTransaction(transaction: InsertSalesTransaction, items: any[], payments: any[], cashierId: string): Promise<any>;
  getSalesTransactions(branchId: string, shiftId?: string, dateFrom?: string, dateTo?: string): Promise<any[]>;
  getTransactionDetails(transactionId: string): Promise<any>;
  
  // Операции с наличными
  createCashOperation(operation: InsertCashOperation): Promise<CashOperation>;
  getCashOperations(shiftId: string): Promise<CashOperation[]>;
  
  // Отчеты
  getShiftReport(shiftId: string): Promise<any>;

  // === СИСТЕМА БИЛЛИНГА И ПОДПИСОК ===
  
  // Тарифные планы
  getSubscriptionPlans(): Promise<any[]>;
  getSubscriptionPlan(id: string): Promise<any | null>;
  getActiveSubscriptionPlans(): Promise<any[]>;
  createSubscriptionPlan(plan: any): Promise<any>;
  updateSubscriptionPlan(id: string, updates: any): Promise<any>;
  deleteSubscriptionPlan(id: string): Promise<void>;
  
  // Подписки клиник
  getClinicSubscription(branchId: string): Promise<any | null>;
  getClinicSubscriptions(): Promise<any[]>;
  createClinicSubscription(subscription: any): Promise<any>;
  updateClinicSubscription(id: string, updates: any): Promise<any>;
  checkSubscriptionStatus(branchId: string): Promise<{ active: boolean; daysLeft: number; subscription: any | null }>;
  
  // Платежи
  getSubscriptionPayments(subscriptionId: string): Promise<any[]>;
  createSubscriptionPayment(payment: any): Promise<any>;
  updateSubscriptionPayment(id: string, updates: any): Promise<any>;
  
  // Уведомления
  getBillingNotifications(subscriptionId: string): Promise<any[]>;
  getPendingBillingNotifications(): Promise<any[]>;
  createBillingNotification(notification: any): Promise<any>;
  markNotificationAsSent(id: string): Promise<void>;

  // === INTEGRATION CREDENTIALS ===
  
  // Get credentials for specific integration type
  getIntegrationCredentials(tenantId: string, integrationType: string): Promise<IntegrationCredentials | undefined>;
  
  // Get all credentials for tenant
  getAllIntegrationCredentials(tenantId: string): Promise<IntegrationCredentials[]>;
  
  // Create or update integration credentials
  upsertIntegrationCredentials(credentials: InsertIntegrationCredentials): Promise<IntegrationCredentials>;
  
  // Delete integration credentials
  deleteIntegrationCredentials(tenantId: string, integrationType: string): Promise<void>;
  
  // Update sync status
  updateIntegrationSyncStatus(
    tenantId: string, 
    integrationType: string, 
    status: string, 
    error?: string
  ): Promise<void>;

  // === CLINICAL CASES MODULE ===
  
  // Clinical Cases methods - 🔒 SECURITY: branchId required for PHI isolation
  getClinicalCases(filters?: { search?: string; startDate?: Date; endDate?: Date; limit?: number; offset?: number }, branchId?: string): Promise<any[]>;
  getClinicalCase(id: string): Promise<any | undefined>;
  getClinicalCasesByPatient(patientId: string, branchId: string): Promise<any[]>;
  createClinicalCase(clinicalCase: InsertClinicalCase): Promise<ClinicalCase>;
  updateClinicalCase(id: string, updates: Partial<InsertClinicalCase>): Promise<ClinicalCase>;
  closeClinicalCase(id: string): Promise<ClinicalCase>;
  
  // Clinical Encounters methods - 🔒 SECURITY: branchId required for PHI isolation
  getClinicalEncounters(caseId: string): Promise<any[]>;
  getClinicalEncounter(id: string): Promise<any | undefined>;
  createClinicalEncounter(encounter: InsertClinicalEncounter): Promise<ClinicalEncounter>;
  updateClinicalEncounter(id: string, updates: Partial<InsertClinicalEncounter>): Promise<ClinicalEncounter>;
  deleteClinicalEncounter(id: string): Promise<void>;
  
  // Lab Analyses methods - 🔒 SECURITY: branchId required for PHI isolation
  getLabAnalyses(encounterId: string): Promise<any[]>;
  getLabAnalysis(id: string): Promise<any | undefined>;
  createLabAnalysis(analysis: InsertLabAnalysis): Promise<LabAnalysis>;
  updateLabAnalysis(id: string, updates: Partial<InsertLabAnalysis>): Promise<LabAnalysis>;
  deleteLabAnalysis(id: string): Promise<void>;
  
  // Attachments methods - 🔒 SECURITY: branchId required for PHI isolation
  getAttachments(entityId: string, entityType: string): Promise<Attachment[]>;
  getAttachment(id: string): Promise<Attachment | undefined>;
  createAttachment(attachment: InsertAttachment): Promise<Attachment>;
  deleteAttachment(id: string): Promise<void>;
  
  // Full medical history for patient
  getPatientFullHistory(patientId: string, branchId: string): Promise<any>;
  
  // Document Templates methods - 🔒 SECURITY: tenantId-aware with fallback to system templates
  getDocumentTemplate(templateType: string, tenantId: string | null): Promise<DocumentTemplate | undefined>;
  getDocumentTemplates(tenantId: string | null): Promise<DocumentTemplate[]>;
  createDocumentTemplate(template: InsertDocumentTemplate): Promise<DocumentTemplate>;
  updateDocumentTemplate(id: string, template: Partial<InsertDocumentTemplate>): Promise<DocumentTemplate>;
  deleteDocumentTemplate(id: string): Promise<void>;

  // === MOBILE APP API METHODS ===
  
  // Mobile Auth - SMS verification for client login
  getOwnerByPhone(phone: string): Promise<Owner | undefined>;
  createSmsVerificationCode(code: InsertSmsVerificationCode): Promise<SmsVerificationCode>;
  getSmsVerificationCode(userId: string, purpose: string): Promise<SmsVerificationCode | undefined>;
  verifySmsCode(userId: string, code: string, purpose: string): Promise<boolean>;
  deleteSmsVerificationCode(id: string): Promise<void>;
  
  // Mobile - Owner & Pets data
  getOwnerWithPets(ownerId: string): Promise<{ owner: Owner; pets: Patient[] }>;
  
  // Mobile - Appointments
  getAvailableSlots(doctorId: string, date: Date, branchId: string): Promise<{ time: string; available: boolean }[]>;
  getOwnerAppointments(ownerId: string): Promise<Appointment[]>;
  
  // Mobile - Pet history
  getPetMedicalHistory(patientId: string): Promise<any[]>;
  
  // Push Tokens
  createPushToken(token: InsertPushToken): Promise<PushToken>;
  updatePushToken(id: string, updates: Partial<InsertPushToken>): Promise<PushToken>;
  getPushTokensByUser(userId: string): Promise<PushToken[]>;
  getPushTokensByOwner(ownerId: string): Promise<PushToken[]>;
  deactivatePushToken(token: string): Promise<void>;
  getActivePushTokens(): Promise<PushToken[]>;

  // === CONVERSATIONS & MESSAGES (CHAT) ===
  
  // Conversations methods - 🔒 SECURITY: tenantId-aware, owner isolation
  getConversations(ownerId: string): Promise<Conversation[]>;
  getConversation(id: string): Promise<Conversation | undefined>;
  createConversation(conversation: InsertConversation): Promise<Conversation>;
  updateConversation(id: string, updates: Partial<InsertConversation>): Promise<Conversation>;
  closeConversation(id: string, closedBy: 'client' | 'staff'): Promise<Conversation>;
  
  // Messages methods - 🔒 SECURITY: conversation ownership verified
  getMessages(conversationId: string): Promise<Message[]>;
  getMessage(id: string): Promise<Message | undefined>;
  createMessage(message: InsertMessage): Promise<Message>;
  markMessageAsRead(id: string): Promise<Message>;
  markConversationMessagesAsRead(conversationId: string, readerId: string): Promise<void>;

  // === CALL LOGS (Mango Office Integration) ===
  
  // Call logs methods - 🔒 SECURITY: tenantId-aware, branch isolation
  getCallLogs(filters?: { branchId?: string; ownerId?: string; userId?: string; startDate?: Date; endDate?: Date }): Promise<CallLog[]>;
  getCallLog(id: string): Promise<CallLog | undefined>;
  createCallLog(callLog: InsertCallLog): Promise<CallLog>;
  updateCallLog(id: string, updates: Partial<InsertCallLog>): Promise<CallLog>;
  getOwnerCallLogs(ownerId: string): Promise<CallLog[]>;
  findOwnerByPhone(phone: string): Promise<Owner | undefined>;

  // === HOSPITAL MODULE (Inpatient/Стационар) ===
  
  // Cages methods - управление клетками/боксами
  getCages(branchId: string): Promise<Cage[]>;
  getCage(id: string): Promise<Cage | undefined>;
  createCage(cage: InsertCage): Promise<Cage>;
  updateCage(id: string, updates: Partial<InsertCage>): Promise<Cage>;
  deleteCage(id: string): Promise<void>;
  
  // Hospital Stays methods - управление пребываниями в стационаре
  getHospitalStays(branchId: string, status?: string): Promise<HospitalStay[]>;
  getHospitalStay(id: string): Promise<HospitalStay | undefined>;
  createHospitalStay(stay: InsertHospitalStay): Promise<HospitalStay>;
  updateHospitalStay(id: string, updates: Partial<InsertHospitalStay>): Promise<HospitalStay>;
  getActiveHospitalStays(): Promise<HospitalStay[]>; // For cron job
  
  // Treatment Log methods - журнал манипуляций
  getTreatmentLog(hospitalStayId: string): Promise<TreatmentLog[]>;
  createTreatmentLog(log: InsertTreatmentLog): Promise<TreatmentLog>;
  deleteTreatmentLog(id: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // ========================================
  // 🔐 SUPERADMIN: Tenant Management Methods
  // ========================================
  // NOTE: These methods bypass tenant context - only for superadmin use
  
  async getAllTenants(): Promise<Tenant[]> {
    return withPerformanceLogging('getAllTenants', async () => {
      return await db.select().from(tenants).orderBy(desc(tenants.createdAt));
    });
  }

  async getTenant(id: string): Promise<Tenant | undefined> {
    return withPerformanceLogging('getTenant', async () => {
      const [tenant] = await db.select().from(tenants).where(eq(tenants.id, id));
      return tenant || undefined;
    });
  }

  async getTenantBySlug(slug: string): Promise<Tenant | undefined> {
    return withPerformanceLogging('getTenantBySlug', async () => {
      const [tenant] = await db.select().from(tenants).where(eq(tenants.slug, slug));
      return tenant || undefined;
    });
  }

  async getTenantByDomain(domain: string): Promise<Tenant | undefined> {
    return withPerformanceLogging('getTenantByDomain', async () => {
      const [tenant] = await db.select().from(tenants).where(
        or(
          eq(tenants.canonicalDomain, domain),
          eq(tenants.customDomain, domain)
        )
      );
      return tenant || undefined;
    });
  }

  async createTenant(insertTenant: InsertTenant): Promise<Tenant> {
    return withPerformanceLogging('createTenant', async () => {
      // Auto-generate canonicalDomain from slug
      const canonicalDomain = `${insertTenant.slug}.vetsystem.ru`;
      
      const [tenant] = await db
        .insert(tenants)
        .values({
          ...insertTenant,
          canonicalDomain,
        })
        .returning();
      return tenant;
    });
  }

  async updateTenant(id: string, updateData: Partial<InsertTenant>): Promise<Tenant> {
    return withPerformanceLogging('updateTenant', async () => {
      const [tenant] = await db
        .update(tenants)
        .set({ ...updateData, updatedAt: new Date() })
        .where(eq(tenants.id, id))
        .returning();
      return tenant;
    });
  }

  async deleteTenant(id: string): Promise<void> {
    return withPerformanceLogging('deleteTenant', async () => {
      // Soft delete: set status to 'cancelled'
      await db
        .update(tenants)
        .set({ status: 'cancelled', updatedAt: new Date() })
        .where(eq(tenants.id, id));
    });
  }

  // ========================================
  // Galen Integration Methods
  // ========================================

  async updateGalenCredentials(
    tenantId: string,
    credentials: {
      galenApiUser?: string | null;
      galenApiKey?: string | null;
      galenIssuerId?: string | null;
      galenServiceId?: string | null;
    }
  ): Promise<Tenant> {
    return withPerformanceLogging('updateGalenCredentials', async () => {
      const [tenant] = await db
        .update(tenants)
        .set({
          galenApiUser: credentials.galenApiUser,
          galenApiKey: credentials.galenApiKey,
          galenIssuerId: credentials.galenIssuerId,
          galenServiceId: credentials.galenServiceId,
          updatedAt: new Date()
        })
        .where(eq(tenants.id, tenantId))
        .returning();
      return tenant;
    });
  }

  async getGalenCredentials(tenantId: string): Promise<{
    galenApiUser: string | null;
    galenApiKey: string | null;
    galenIssuerId: string | null;
    galenServiceId: string | null;
  } | null> {
    return withPerformanceLogging('getGalenCredentials', async () => {
      const [tenant] = await db
        .select({
          galenApiUser: tenants.galenApiUser,
          galenApiKey: tenants.galenApiKey,
          galenIssuerId: tenants.galenIssuerId,
          galenServiceId: tenants.galenServiceId,
        })
        .from(tenants)
        .where(eq(tenants.id, tenantId));
      
      return tenant || null;
    });
  }

  async updatePatientGalenStatus(
    patientId: string,
    status: {
      galenUuid?: string | null;
      galenSyncStatus?: string;
      galenLastSyncError?: string | null;
      galenLastSyncAt?: Date | null;
    }
  ): Promise<Patient> {
    return withPerformanceLogging('updatePatientGalenStatus', async () => {
      const [patient] = await db
        .update(patients)
        .set({
          galenUuid: status.galenUuid,
          galenSyncStatus: status.galenSyncStatus,
          galenLastSyncError: status.galenLastSyncError,
          galenLastSyncAt: status.galenLastSyncAt,
          updatedAt: new Date()
        })
        .where(eq(patients.id, patientId))
        .returning();
      return patient;
    });
  }

  // ========================================
  // Legal Entity Methods
  // ========================================

  async getLegalEntities(): Promise<LegalEntity[]> {
    return withPerformanceLogging('getLegalEntities', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        return await dbInstance
          .select()
          .from(legalEntities)
          .orderBy(desc(legalEntities.createdAt));
      });
    });
  }

  async getActiveLegalEntities(): Promise<LegalEntity[]> {
    return withPerformanceLogging('getActiveLegalEntities', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        return await dbInstance
          .select()
          .from(legalEntities)
          .where(eq(legalEntities.isActive, true))
          .orderBy(legalEntities.shortName);
      });
    });
  }

  async getLegalEntity(id: string): Promise<LegalEntity | undefined> {
    return withPerformanceLogging('getLegalEntity', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        const [legalEntity] = await dbInstance
          .select()
          .from(legalEntities)
          .where(eq(legalEntities.id, id));
        return legalEntity || undefined;
      });
    });
  }

  async createLegalEntity(insertLegalEntity: InsertLegalEntity): Promise<LegalEntity> {
    return withPerformanceLogging('createLegalEntity', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        const [legalEntity] = await dbInstance
          .insert(legalEntities)
          .values(insertLegalEntity)
          .returning();
        return legalEntity;
      });
    });
  }

  async updateLegalEntity(id: string, updateData: Partial<InsertLegalEntity>): Promise<LegalEntity> {
    return withPerformanceLogging('updateLegalEntity', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        const [legalEntity] = await dbInstance
          .update(legalEntities)
          .set({ ...updateData, updatedAt: new Date() })
          .where(eq(legalEntities.id, id))
          .returning();
        return legalEntity;
      });
    });
  }

  async deleteLegalEntity(id: string): Promise<void> {
    return withPerformanceLogging('deleteLegalEntity', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        // Soft delete: set isActive to false
        await dbInstance
          .update(legalEntities)
          .set({ isActive: false, updatedAt: new Date() })
          .where(eq(legalEntities.id, id));
      });
    });
  }

  // User methods
  // NOTE: getUserByUsername and verifyPassword are used for authentication and don't use tenant context
  async getUser(id: string): Promise<User | undefined> {
    return withPerformanceLogging('getUser', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        const [user] = await dbInstance.select().from(users).where(eq(users.id, id));
        return user || undefined;
      });
    });
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return withPerformanceLogging('getUserByUsername', async () => {
      // No tenant context - used for authentication before tenant is determined
      const [user] = await db.select().from(users).where(eq(users.username, username));
      return user || undefined;
    });
  }

  async verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
    return withPerformanceLogging('verifyPassword', async () => {
      // No tenant context - used for authentication
      return await bcrypt.compare(password, hashedPassword);
    });
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    return withPerformanceLogging('createUser', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        // Hash password before storing
        const saltRounds = 12;
        const hashedPassword = await bcrypt.hash(insertUser.password, saltRounds);
        
        const [user] = await dbInstance
          .insert(users)
          .values({
            ...insertUser,
            password: hashedPassword,
          })
          .returning();
        return user;
      });
    });
  }

  async getUsers(): Promise<User[]> {
    return withPerformanceLogging('getUsers', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        return await dbInstance.select().from(users).orderBy(users.createdAt);
      });
    });
  }

  async updateUser(id: string, updateData: Partial<InsertUser>): Promise<User> {
    return withPerformanceLogging('updateUser', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        // Hash password if it's being updated
        let dataToUpdate = { ...updateData, updatedAt: new Date() };
        if (updateData.password) {
          const saltRounds = 12;
          dataToUpdate.password = await bcrypt.hash(updateData.password, saltRounds);
        }
        
        const [user] = await dbInstance
          .update(users)
          .set(dataToUpdate)
          .where(eq(users.id, id))
          .returning();
        return user;
      });
    });
  }

  async updateUserLastLogin(id: string): Promise<void> {
    return withPerformanceLogging('updateUserLastLogin', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        await dbInstance
          .update(users)
          .set({ lastLogin: new Date() })
          .where(eq(users.id, id));
      });
    });
  }

  async updateUserLocale(id: string, locale: string): Promise<void> {
    return withPerformanceLogging('updateUserLocale', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        await dbInstance
          .update(users)
          .set({ locale, updatedAt: new Date() })
          .where(eq(users.id, id));
      });
    });
  }

  async deleteUser(id: string): Promise<void> {
    return withPerformanceLogging('deleteUser', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        await dbInstance.delete(users).where(eq(users.id, id));
      });
    });
  }

  // Owner methods - 🔒 SECURITY: branchId mandatory for PHI isolation
  async getOwners(branchId: string): Promise<Owner[]> {
    return withPerformanceLogging('getOwners', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        // Filter owners through their patients' branchId
        const result = await dbInstance
          .select({
            id: owners.id,
            tenantId: owners.tenantId,
            name: owners.name,
            phone: owners.phone,
            email: owners.email,
            address: owners.address,
            dateOfBirth: owners.dateOfBirth,
            gender: owners.gender,
            passportSeries: owners.passportSeries,
            passportNumber: owners.passportNumber,
            passportIssuedBy: owners.passportIssuedBy,
            passportIssueDate: owners.passportIssueDate,
            registrationAddress: owners.registrationAddress,
            residenceAddress: owners.residenceAddress,
            personalDataConsentGiven: owners.personalDataConsentGiven,
            personalDataConsentDate: owners.personalDataConsentDate,
            createdAt: owners.createdAt,
            updatedAt: owners.updatedAt
          })
          .from(owners)
          .where(
            exists(
              dbInstance
                .select({ id: patientOwners.ownerId })
                .from(patientOwners)
                .innerJoin(patients, eq(patientOwners.patientId, patients.id))
                .where(
                  and(
                    eq(patientOwners.ownerId, owners.id),
                    or(eq(patients.branchId, branchId), isNull(patients.branchId))
                  )
                )
            )
          )
          .orderBy(owners.name);
        
        return result as Owner[];
      });
    });
  }

  async getOwnersPaginated(params: { branchId: string; search?: string; limit?: number; offset?: number }): Promise<{ data: any[]; total: number }> {
    const { branchId, search, limit = 50, offset = 0 } = params;
    return withPerformanceLogging('getOwnersPaginated', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        // Build query with search and branch filter through patients, include lastVisit from medical_records
        const result = await dbInstance.execute(sql`
          WITH owner_last_visit AS (
            SELECT 
              o.id,
              o.name,
              o.phone,
              o.email,
              o.address,
              o.created_at,
              o.updated_at,
              MAX(mr.visit_date) as last_visit,
              COUNT(*) OVER() as total_count
            FROM owners o
            LEFT JOIN patient_owners po ON o.id = po.owner_id
            LEFT JOIN patients p ON po.patient_id = p.id
            LEFT JOIN medical_records mr ON p.id = mr.patient_id
            WHERE EXISTS (
              SELECT 1 
              FROM patient_owners po2
              JOIN patients p2 ON po2.patient_id = p2.id
              WHERE po2.owner_id = o.id 
                AND (p2.branch_id = ${branchId} OR p2.branch_id IS NULL)
            )
              ${search ? sql`AND (o.name ILIKE ${`%${search}%`} OR o.phone ILIKE ${`%${search}%`})` : sql``}
            GROUP BY o.id, o.name, o.phone, o.email, o.address, o.created_at, o.updated_at
            ORDER BY last_visit DESC NULLS LAST, o.name ASC
            LIMIT ${limit} OFFSET ${offset}
          )
          SELECT * FROM owner_last_visit
        `);
        
        const rows = result.rows as any[];
        const total = rows.length > 0 ? Number(rows[0].total_count) : 0;
        
        return {
          data: rows.map(row => ({
            id: row.id,
            name: row.name,
            phone: row.phone,
            email: row.email,
            address: row.address,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            lastVisit: row.last_visit
          })),
          total
        };
      });
    });
  }

  async getOwner(id: string): Promise<Owner | undefined> {
    return withPerformanceLogging('getOwner', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        const [owner] = await dbInstance.select().from(owners).where(eq(owners.id, id));
        return owner || undefined;
      });
    });
  }

  async createOwner(owner: InsertOwner): Promise<Owner> {
    return withPerformanceLogging('createOwner', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        const [newOwner] = await dbInstance
          .insert(owners)
          .values(owner)
          .returning();
        return newOwner;
      });
    });
  }

  async updateOwner(id: string, owner: Partial<InsertOwner>): Promise<Owner> {
    return withPerformanceLogging('updateOwner', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        const [updated] = await dbInstance
          .update(owners)
          .set({ ...owner, updatedAt: new Date() })
          .where(eq(owners.id, id))
          .returning();
        return updated;
      });
    });
  }

  async deleteOwner(id: string): Promise<void> {
    return withPerformanceLogging('deleteOwner', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        await dbInstance.delete(owners).where(eq(owners.id, id));
      });
    });
  }

  async getAllOwners(limit: number = 100, offset: number = 0): Promise<Owner[]> {
    return withPerformanceLogging('getAllOwners', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        return await dbInstance.select().from(owners)
          .orderBy(desc(owners.createdAt))
          .limit(limit)
          .offset(offset);
      });
    });
  }

  async searchOwners(query: string, branchId: string): Promise<Owner[]> {
    return withPerformanceLogging('searchOwners', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        const searchQuery = `%${query}%`;
        const searchConditions = or(
          ilike(owners.name, searchQuery),
          ilike(owners.phone, searchQuery),
          ilike(owners.email, searchQuery)
        );
        
        return await dbInstance
          .select()
          .from(owners)
          .where(
            and(
              searchConditions,
              exists(
                dbInstance
                  .select({ id: patientOwners.ownerId })
                  .from(patientOwners)
                  .innerJoin(patients, eq(patientOwners.patientId, patients.id))
                  .where(
                    and(
                      eq(patientOwners.ownerId, owners.id),
                      or(eq(patients.branchId, branchId), isNull(patients.branchId))
                    )
                  )
              )
            )
          )
          .orderBy(desc(owners.createdAt));
      });
    });
  }

  async searchOwnersWithPatients(query: string, limit: number = 30, offset: number = 0): Promise<{ owners: any[], total: number }> {
    return withPerformanceLogging('searchOwnersWithPatients', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        const searchQuery = `%${query}%`;
        
        // Search in both owners and patients tables (case-insensitive)
        // Use patientOwners junction table for many-to-many relationships
        const ownerIds = await dbInstance
          .selectDistinct({ 
            id: owners.id,
            createdAt: owners.createdAt 
          })
          .from(owners)
          .leftJoin(patientOwners, eq(patientOwners.ownerId, owners.id))
          .leftJoin(patients, eq(patients.id, patientOwners.patientId))
          .where(
            or(
              ilike(owners.name, searchQuery),
              ilike(owners.phone, searchQuery),
              ilike(owners.email, searchQuery),
              ilike(patients.name, searchQuery)
            )
          )
          .orderBy(desc(owners.createdAt));

        const total = ownerIds.length;

        // Get paginated owner IDs
        const paginatedOwnerIds = ownerIds.slice(offset, offset + limit).map(o => o.id);

        if (paginatedOwnerIds.length === 0) {
          return { owners: [], total: 0 };
        }

        // Fetch owners with their patients using patientOwners junction table
        const ownersWithPatients = await dbInstance
          .select({
            id: owners.id,
            name: owners.name,
            phone: owners.phone,
            email: owners.email,
            address: owners.address,
            patientId: patients.id,
            patientName: patients.name,
            species: patients.species,
            breed: patients.breed,
          })
          .from(owners)
          .leftJoin(patientOwners, eq(patientOwners.ownerId, owners.id))
          .leftJoin(patients, eq(patients.id, patientOwners.patientId))
          .where(inArray(owners.id, paginatedOwnerIds))
          .orderBy(desc(owners.createdAt));

        // Group by owner
        const groupedOwners = ownersWithPatients.reduce((acc: any[], row: any) => {
          let owner = acc.find(o => o.id === row.id);
          if (!owner) {
            owner = {
              id: row.id,
              name: row.name,
              phone: row.phone,
              email: row.email,
              address: row.address,
              patients: []
            };
            acc.push(owner);
          }
          if (row.patientId) {
            owner.patients.push({
              id: row.patientId,
              name: row.patientName,
              species: row.species,
              breed: row.breed
            });
          }
          return acc;
        }, []);

        return { owners: groupedOwners, total };
      });
    });
  }

  // Patient methods - 🔒 SECURITY: branchId mandatory for PHI isolation
  async getPatients(limit: number | undefined = 50, offset: number | undefined = 0, branchId: string): Promise<any[]> {
    return withPerformanceLogging('getPatients', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        // Use raw SQL for JSON aggregation of multiple owners
        // Note: Preserves ownerName/ownerPhone for backwards compatibility with fallback to legacy owner_id
        const result = await dbInstance.execute(sql`
          WITH patient_owners_agg AS (
            SELECT 
              po.patient_id,
              json_agg(
                json_build_object(
                  'id', o.id,
                  'name', o.name,
                  'phone', o.phone,
                  'email', o.email,
                  'isPrimary', po.is_primary
                ) ORDER BY po.is_primary DESC NULLS LAST, po.created_at ASC
              ) as owners,
              MAX(CASE WHEN po.is_primary THEN o.name END) as primary_owner_name,
              MAX(CASE WHEN po.is_primary THEN o.phone END) as primary_owner_phone
            FROM patient_owners po
            JOIN owners o ON po.owner_id = o.id
            JOIN patients p_filter ON po.patient_id = p_filter.id
            WHERE (p_filter.branch_id = ${branchId} OR p_filter.branch_id IS NULL)
            GROUP BY po.patient_id
          )
          SELECT 
            p.id,
            p.name,
            p.species,
            p.breed,
            p.birth_date as "birthDate",
            p.gender,
            p.color,
            p.weight,
            p.microchip_number as "microchipNumber",
            p.allergies,
            p.chronic_conditions as "chronicConditions",
            p.owner_id as "ownerId",
            p.tenant_id as "tenantId",
            p.branch_id as "branchId",
            p.created_at as "createdAt",
            p.updated_at as "updatedAt",
            COALESCE(poa.owners, '[]'::json) as owners,
            COALESCE(poa.primary_owner_name, legacy_owner.name) as "ownerName",
            COALESCE(poa.primary_owner_phone, legacy_owner.phone) as "ownerPhone",
            (SELECT MAX(mr.visit_date) FROM medical_records mr WHERE mr.patient_id = p.id) as "lastVisit"
          FROM patients p
          LEFT JOIN patient_owners_agg poa ON p.id = poa.patient_id
          LEFT JOIN owners legacy_owner ON p.owner_id = legacy_owner.id
          WHERE (p.branch_id = ${branchId} OR p.branch_id IS NULL)
          ORDER BY "lastVisit" DESC NULLS LAST, p.name ASC
          LIMIT ${limit || 50}
          OFFSET ${offset || 0}
        `);
        
        return result.rows;
      });
    });
  }

  async getPatientsPaginated(params: { branchId: string; search?: string; limit?: number; offset?: number }): Promise<{ data: any[]; total: number }> {
    const { branchId, search, limit = 50, offset = 0 } = params;
    return withPerformanceLogging('getPatientsPaginated', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        const result = await dbInstance.execute(sql`
          WITH patient_owners_agg AS (
            SELECT 
              po.patient_id,
              json_agg(
                json_build_object(
                  'id', o.id,
                  'name', o.name,
                  'phone', o.phone,
                  'email', o.email,
                  'isPrimary', po.is_primary
                ) ORDER BY po.is_primary DESC NULLS LAST, po.created_at ASC
              ) as owners,
              MAX(CASE WHEN po.is_primary THEN o.name END) as primary_owner_name,
              MAX(CASE WHEN po.is_primary THEN o.phone END) as primary_owner_phone
            FROM patient_owners po
            JOIN owners o ON po.owner_id = o.id
            JOIN patients p_filter ON po.patient_id = p_filter.id
            WHERE (p_filter.branch_id = ${branchId} OR p_filter.branch_id IS NULL)
            GROUP BY po.patient_id
          )
          SELECT 
            p.id,
            p.name,
            p.species,
            p.breed,
            p.birth_date as "birthDate",
            p.gender,
            p.color,
            p.weight,
            p.microchip_number as "microchipNumber",
            p.allergies,
            p.chronic_conditions as "chronicConditions",
            p.owner_id as "ownerId",
            p.tenant_id as "tenantId",
            p.branch_id as "branchId",
            p.created_at as "createdAt",
            p.updated_at as "updatedAt",
            COALESCE(poa.owners, '[]'::json) as owners,
            COALESCE(poa.primary_owner_name, legacy_owner.name) as "ownerName",
            COALESCE(poa.primary_owner_phone, legacy_owner.phone) as "ownerPhone",
            (SELECT MAX(mr.visit_date) FROM medical_records mr WHERE mr.patient_id = p.id) as "lastVisit",
            COUNT(*) OVER() as total_count
          FROM patients p
          LEFT JOIN patient_owners_agg poa ON p.id = poa.patient_id
          LEFT JOIN owners legacy_owner ON p.owner_id = legacy_owner.id
          WHERE (p.branch_id = ${branchId} OR p.branch_id IS NULL)
            ${search ? sql`AND (p.name ILIKE ${`%${search}%`} OR COALESCE(poa.primary_owner_name, legacy_owner.name) ILIKE ${`%${search}%`} OR COALESCE(poa.primary_owner_phone, legacy_owner.phone) ILIKE ${`%${search}%`})` : sql``}
          ORDER BY "lastVisit" DESC NULLS LAST, p.name ASC
          LIMIT ${limit}
          OFFSET ${offset}
        `);
        
        const rows = result.rows as any[];
        const total = rows.length > 0 ? Number(rows[0].total_count) : 0;
        
        return {
          data: rows,
          total
        };
      });
    });
  }

  async getPatient(id: string): Promise<any | undefined> {
    return withPerformanceLogging('getPatient', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        // Use same JSON aggregation logic as getPatients for consistency
        const result = await dbInstance.execute(sql`
          WITH patient_owners_agg AS (
            SELECT 
              po.patient_id,
              json_agg(
                json_build_object(
                  'id', o.id,
                  'name', o.name,
                  'phone', o.phone,
                  'email', o.email,
                  'isPrimary', po.is_primary
                ) ORDER BY po.is_primary DESC NULLS LAST, po.created_at ASC
              ) as owners,
              MAX(CASE WHEN po.is_primary THEN o.name END) as primary_owner_name,
              MAX(CASE WHEN po.is_primary THEN o.phone END) as primary_owner_phone
            FROM patient_owners po
            JOIN owners o ON po.owner_id = o.id
            WHERE po.patient_id = ${id}
            GROUP BY po.patient_id
          )
          SELECT 
            p.id,
            p.name,
            p.species,
            p.breed,
            p.birth_date as "birthDate",
            p.gender,
            p.color,
            p.weight,
            p.microchip_number as "microchipNumber",
            p.allergies,
            p.chronic_conditions as "chronicConditions",
            p.owner_id as "ownerId",
            p.tenant_id as "tenantId",
            p.branch_id as "branchId",
            p.created_at as "createdAt",
            p.updated_at as "updatedAt",
            COALESCE(poa.owners, '[]'::json) as owners,
            COALESCE(poa.primary_owner_name, legacy_owner.name) as "ownerName",
            COALESCE(poa.primary_owner_phone, legacy_owner.phone) as "ownerPhone"
          FROM patients p
          LEFT JOIN patient_owners_agg poa ON p.id = poa.patient_id
          LEFT JOIN owners legacy_owner ON p.owner_id = legacy_owner.id
          WHERE p.id = ${id}
        `);
        
        return result.rows[0] || undefined;
      });
    });
  }

  async getPatientsByOwner(ownerId: string, branchId: string): Promise<Patient[]> {
    return withPerformanceLogging('getPatientsByOwner', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        // 🔒 CRITICAL: Use patient_owners junction table for many-to-many relationship
        const result = await dbInstance
          .select({
            id: patients.id,
            name: patients.name,
            species: patients.species,
            breed: patients.breed,
            birthdate: patients.birthdate,
            gender: patients.gender,
            color: patients.color,
            weight: patients.weight,
            microchipNumber: patients.microchipNumber,
            allergies: patients.allergies,
            chronicConditions: patients.chronicConditions,
            ownerId: patients.ownerId,
            tenantId: patients.tenantId,
            branchId: patients.branchId,
            createdAt: patients.createdAt,
            updatedAt: patients.updatedAt,
          })
          .from(patients)
          .innerJoin(patientOwners, eq(patients.id, patientOwners.patientId))
          .where(
            and(
              eq(patientOwners.ownerId, ownerId),
              or(eq(patients.branchId, branchId), isNull(patients.branchId))
            )
          );
        
        return result;
      });
    });
  }

  async createPatient(patient: InsertPatient): Promise<Patient> {
    return withPerformanceLogging('createPatient', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        const patientToInsert = {
          ...patient,
          weight: patient.weight !== undefined ? patient.weight.toString() : undefined
        };
        const [newPatient] = await dbInstance
          .insert(patients)
          .values(patientToInsert)
          .returning();
        return newPatient;
      });
    });
  }

  async updatePatient(id: string, patient: Partial<InsertPatient>): Promise<Patient> {
    return withPerformanceLogging('updatePatient', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        const patientToUpdate = {
          ...patient,
          weight: patient.weight !== undefined ? patient.weight.toString() : undefined,
          updatedAt: new Date()
        };
        const [updated] = await dbInstance
          .update(patients)
          .set(patientToUpdate)
          .where(eq(patients.id, id))
          .returning();
        return updated;
      });
    });
  }

  async deletePatient(id: string): Promise<void> {
    return withPerformanceLogging('deletePatient', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        await dbInstance.delete(patients).where(eq(patients.id, id));
      });
    });
  }

  async getAllPatients(limit: number | undefined = 50, offset: number | undefined = 0): Promise<any[]> {
    return withPerformanceLogging('getAllPatients', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        // Use raw SQL for JSON aggregation of multiple owners across all branches
        // Note: Preserves ownerName/ownerPhone for backwards compatibility with fallback to legacy owner_id
        const result = await dbInstance.execute(sql`
          WITH patient_owners_agg AS (
            SELECT 
              po.patient_id,
              json_agg(
                json_build_object(
                  'id', o.id,
                  'name', o.name,
                  'phone', o.phone,
                  'email', o.email,
                  'isPrimary', po.is_primary
                ) ORDER BY po.is_primary DESC NULLS LAST, po.created_at ASC
              ) as owners,
              MAX(CASE WHEN po.is_primary THEN o.name END) as primary_owner_name,
              MAX(CASE WHEN po.is_primary THEN o.phone END) as primary_owner_phone
            FROM patient_owners po
            JOIN owners o ON po.owner_id = o.id
            GROUP BY po.patient_id
          )
          SELECT 
            p.id,
            p.name,
            p.species,
            p.breed,
            p.birth_date as "birthDate",
            p.gender,
            p.color,
            p.weight,
            p.microchip_number as "microchipNumber",
            p.allergies,
            p.chronic_conditions as "chronicConditions",
            p.owner_id as "ownerId",
            p.tenant_id as "tenantId",
            p.branch_id as "branchId",
            p.created_at as "createdAt",
            p.updated_at as "updatedAt",
            COALESCE(poa.owners, '[]'::json) as owners,
            COALESCE(poa.primary_owner_name, legacy_owner.name) as "ownerName",
            COALESCE(poa.primary_owner_phone, legacy_owner.phone) as "ownerPhone",
            (SELECT MAX(mr.visit_date) FROM medical_records mr WHERE mr.patient_id = p.id) as "lastVisit"
          FROM patients p
          LEFT JOIN patient_owners_agg poa ON p.id = poa.patient_id
          LEFT JOIN owners legacy_owner ON p.owner_id = legacy_owner.id
          ORDER BY "lastVisit" DESC NULLS LAST, p.name ASC
          LIMIT ${limit || 50}
          OFFSET ${offset || 0}
        `);
        
        return result.rows;
      });
    });
  }

  async searchPatients(query: string, branchId: string): Promise<Patient[]> {
    return withPerformanceLogging('searchPatients', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        const searchQuery = `%${query}%`;
        const searchConditions = or(
          like(patients.name, searchQuery),
          like(patients.species, searchQuery),
          like(patients.breed, searchQuery),
          like(patients.microchipNumber, searchQuery)
        );
        
        // 🔒 CRITICAL: branchId now mandatory for security
        return await dbInstance
          .select()
          .from(patients)
          .where(and(searchConditions, or(eq(patients.branchId, branchId), isNull(patients.branchId))))
          .orderBy(desc(patients.createdAt));
      });
    });
  }

  // Patient-Owner relationship methods - 🔒 SECURITY: tenant-scoped
  async getPatientOwners(patientId: string): Promise<any[]> {
    return withPerformanceLogging('getPatientOwners', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        return await dbInstance
          .select({
            id: patientOwners.id,
            patientId: patientOwners.patientId,
            ownerId: patientOwners.ownerId,
            isPrimary: patientOwners.isPrimary,
            createdAt: patientOwners.createdAt,
            owner: {
              id: owners.id,
              name: owners.name,
              phone: owners.phone,
              email: owners.email,
              address: owners.address,
            }
          })
          .from(patientOwners)
          .leftJoin(owners, eq(patientOwners.ownerId, owners.id))
          .where(eq(patientOwners.patientId, patientId))
          .orderBy(desc(patientOwners.isPrimary));
      });
    });
  }

  async addPatientOwner(patientOwner: InsertPatientOwner): Promise<PatientOwner> {
    return withPerformanceLogging('addPatientOwner', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        // Always insert with isPrimary=false to maintain data integrity
        // Use setPrimaryOwner to promote an owner to primary
        const [newPatientOwner] = await dbInstance
          .insert(patientOwners)
          .values({ ...patientOwner, isPrimary: false })
          .returning();
        return newPatientOwner;
      });
    });
  }

  async removePatientOwner(patientId: string, ownerId: string): Promise<void> {
    return withPerformanceLogging('removePatientOwner', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        // Use transaction to ensure atomicity of promotion and deletion
        await dbInstance.transaction(async (tx) => {
          // Check if removing the primary owner
          const [relation] = await tx
            .select()
            .from(patientOwners)
            .where(
              and(
                eq(patientOwners.patientId, patientId),
                eq(patientOwners.ownerId, ownerId)
              )
            )
            .limit(1);

          if (!relation) {
            throw new Error(`Owner ${ownerId} is not associated with patient ${patientId}`);
          }

          if (relation.isPrimary) {
            // Check if there are other owners to promote
            const otherOwners = await tx
              .select()
              .from(patientOwners)
              .where(
                and(
                  eq(patientOwners.patientId, patientId),
                  sql`${patientOwners.ownerId} != ${ownerId}`
                )
              )
              .limit(1);

            if (otherOwners.length > 0) {
              // Inline promotion logic to keep everything in one transaction
              // First, demote all owners for this patient
              await tx
                .update(patientOwners)
                .set({ isPrimary: false })
                .where(eq(patientOwners.patientId, patientId));
              
              // Then promote the first other owner
              await tx
                .update(patientOwners)
                .set({ isPrimary: true })
                .where(
                  and(
                    eq(patientOwners.patientId, patientId),
                    eq(patientOwners.ownerId, otherOwners[0].ownerId)
                  )
                );
            }
            // If no other owners, it's ok to remove - patient will have no primary owner
          }

          // Finally, delete the relationship
          await tx
            .delete(patientOwners)
            .where(
              and(
                eq(patientOwners.patientId, patientId),
                eq(patientOwners.ownerId, ownerId)
              )
            );
        });
      });
    });
  }

  async setPrimaryOwner(patientId: string, ownerId: string): Promise<void> {
    return withPerformanceLogging('setPrimaryOwner', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        // Use transaction to ensure atomicity
        await dbInstance.transaction(async (tx) => {
          // Verify the patient-owner relationship exists
          const existingRelation = await tx
            .select()
            .from(patientOwners)
            .where(
              and(
                eq(patientOwners.patientId, patientId),
                eq(patientOwners.ownerId, ownerId)
              )
            )
            .limit(1);

          if (existingRelation.length === 0) {
            throw new Error(`Owner ${ownerId} is not associated with patient ${patientId}`);
          }

          // First, set all owners for this patient to non-primary
          await tx
            .update(patientOwners)
            .set({ isPrimary: false })
            .where(eq(patientOwners.patientId, patientId));
          
          // Then, set the specified owner as primary
          await tx
            .update(patientOwners)
            .set({ isPrimary: true })
            .where(
              and(
                eq(patientOwners.patientId, patientId),
                eq(patientOwners.ownerId, ownerId)
              )
            );
        });
      });
    });
  }

  // Doctor methods - 🔒 SECURITY: branchId mandatory for PHI isolation
  async getDoctors(branchId: string): Promise<Doctor[]> {
    return withPerformanceLogging('getDoctors', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        return await dbInstance.select().from(doctors)
          .where(eq(doctors.branchId, branchId))
          .orderBy(desc(doctors.createdAt));
      });
    });
  }

  async getAllDoctors(): Promise<Doctor[]> {
    return withPerformanceLogging('getAllDoctors', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        // Return all doctors from all branches within tenant (doctors can work in multiple branches)
        return await dbInstance.select().from(doctors)
          .orderBy(desc(doctors.createdAt));
      });
    });
  }

  async getDoctor(id: string): Promise<Doctor | undefined> {
    return withPerformanceLogging('getDoctor', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        const [doctor] = await dbInstance.select().from(doctors).where(eq(doctors.id, id));
        return doctor || undefined;
      });
    });
  }

  async createDoctor(doctor: InsertDoctor): Promise<Doctor> {
    return withPerformanceLogging('createDoctor', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        const [newDoctor] = await dbInstance
          .insert(doctors)
          .values(doctor)
          .returning();
        return newDoctor;
      });
    });
  }

  async updateDoctor(id: string, doctor: Partial<InsertDoctor>): Promise<Doctor> {
    return withPerformanceLogging('updateDoctor', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        const [updated] = await dbInstance
          .update(doctors)
          .set({ ...doctor, updatedAt: new Date() })
          .where(eq(doctors.id, id))
          .returning();
        return updated;
      });
    });
  }

  async deleteDoctor(id: string): Promise<void> {
    return withPerformanceLogging('deleteDoctor', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        await dbInstance.delete(doctors).where(eq(doctors.id, id));
      });
    });
  }

  async getActiveDoctors(branchId: string): Promise<Doctor[]> {
    return withPerformanceLogging('getActiveDoctors', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        return await dbInstance.select().from(doctors)
          .where(and(eq(doctors.isActive, true), eq(doctors.branchId, branchId)));
      });
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
          whereConditions.push(eq(appointments.branchId, branchId));
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
        query = query.where(eq(appointments.branchId, branchId));
      }
      
      return await query.orderBy(appointments.appointmentDate);
    });
  }

  async getAppointment(id: string): Promise<Appointment | undefined> {
    return withPerformanceLogging('getAppointment', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        const [appointment] = await dbInstance.select().from(appointments).where(eq(appointments.id, id));
        return appointment || undefined;
      });
    });
  }

  async getAppointmentsByDoctor(doctorId: string, date: Date | undefined, branchId: string): Promise<Appointment[]> {
    return withPerformanceLogging('getAppointmentsByDoctor', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
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
            return await dbInstance.select().from(appointments)
              .leftJoin(patients, eq(appointments.patientId, patients.id))
              .where(and(...whereConditions, eq(patients.branchId, branchId)))
              .orderBy(appointments.appointmentDate);
          }
          
          return await dbInstance.select().from(appointments)
            .where(and(...whereConditions))
            .orderBy(appointments.appointmentDate);
        }
        
        // 🔒 CRITICAL: For all appointments by doctor, enforce branch isolation if branchId provided
        if (branchId) {
          return await dbInstance.select().from(appointments)
            .leftJoin(patients, eq(appointments.patientId, patients.id))
            .where(and(eq(appointments.doctorId, doctorId), eq(patients.branchId, branchId)))
            .orderBy(appointments.appointmentDate);
        }
        
        return await dbInstance.select().from(appointments)
          .where(eq(appointments.doctorId, doctorId))
          .orderBy(appointments.appointmentDate);
      });
    });
  }

  async getAppointmentsByPatient(patientId: string, branchId: string): Promise<Appointment[]> {
    return withPerformanceLogging('getAppointmentsByPatient', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        // 🔒 CRITICAL: Enforce branch isolation via patient join
        return await dbInstance
          .select()
          .from(appointments)
          .leftJoin(patients, eq(appointments.patientId, patients.id))
          .where(and(eq(appointments.patientId, patientId), eq(patients.branchId, branchId)))
          .orderBy(desc(appointments.appointmentDate));
      });
    });
  }

  async getUpcomingAppointments(startDate: Date, endDate: Date): Promise<Appointment[]> {
    return withPerformanceLogging('getUpcomingAppointments', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        // 🔒 Get appointments within date range for current tenant
        return await dbInstance
          .select()
          .from(appointments)
          .where(
            and(
              gte(appointments.appointmentDate, startDate),
              lte(appointments.appointmentDate, endDate)
            )
          )
          .orderBy(appointments.appointmentDate);
      });
    });
  }

  async createAppointment(appointment: InsertAppointment): Promise<Appointment> {
    return withPerformanceLogging('createAppointment', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        const [newAppointment] = await dbInstance
          .insert(appointments)
          .values(appointment)
          .returning();
        return newAppointment;
      });
    });
  }

  async updateAppointment(id: string, appointment: Partial<InsertAppointment>): Promise<Appointment> {
    return withPerformanceLogging('updateAppointment', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        const [updated] = await dbInstance
          .update(appointments)
          .set({ ...appointment, updatedAt: new Date() })
          .where(eq(appointments.id, id))
          .returning();
        return updated;
      });
    });
  }

  async deleteAppointment(id: string): Promise<void> {
    return withPerformanceLogging('deleteAppointment', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        await dbInstance.delete(appointments).where(eq(appointments.id, id));
      });
    });
  }

  async checkAppointmentConflicts(doctorId: string, date: Date, duration: number, branchId: string, excludeId?: string): Promise<boolean> {
    return withPerformanceLogging('checkAppointmentConflicts', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        const endTime = new Date(date.getTime() + duration * 60000);
        
        const baseConditions = [
          eq(appointments.doctorId, doctorId),
          eq(appointments.branchId, branchId), // 🔒 Filter by branch
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
        
        const conflicts = await dbInstance
          .select()
          .from(appointments)
          .where(and(...baseConditions));
          
        return conflicts.length > 0;
      });
    });
  }

  // Queue methods - 🔒 SECURITY: branchId required for PHI isolation
  async getQueueEntries(branchId: string, status?: string): Promise<QueueEntry[]> {
    return withPerformanceLogging('getQueueEntries', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        const conditions = [eq(queueEntries.branchId, branchId)];
        if (status) {
          conditions.push(eq(queueEntries.status, status));
        }
        
        return await dbInstance
          .select()
          .from(queueEntries)
          .where(and(...conditions))
          .orderBy(asc(queueEntries.queueNumber));
      });
    });
  }

  async getQueueEntry(id: string): Promise<QueueEntry | undefined> {
    return withPerformanceLogging('getQueueEntry', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        const [entry] = await dbInstance
          .select()
          .from(queueEntries)
          .where(eq(queueEntries.id, id));
        return entry;
      });
    });
  }

  async getNextQueueNumber(branchId: string): Promise<number> {
    return withPerformanceLogging('getNextQueueNumber', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        // 🔒 TRANSACTION-SAFE: Use advisory lock to prevent race conditions
        return await dbInstance.transaction(async (tx) => {
          // Use PostgreSQL advisory lock for atomic queue number generation
          // Use hashtextextended to get collision-resistant 64-bit lock ID from branch UUID
          await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${branchId}, 0))`);
          
          // Now safely get max queue number with branch-specific lock held
          const result = await tx
            .select({ maxNumber: sql<number>`COALESCE(MAX(${queueEntries.queueNumber}), 0)` })
            .from(queueEntries)
            .where(and(
              eq(queueEntries.branchId, branchId),
              gte(queueEntries.arrivalTime, sql`CURRENT_DATE`)
            ));
          
          return (result[0]?.maxNumber || 0) + 1;
          // Advisory lock automatically released at transaction end
        });
      });
    });
  }

  async createQueueEntry(entry: InsertQueueEntry): Promise<QueueEntry> {
    return withPerformanceLogging('createQueueEntry', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        const [newEntry] = await dbInstance
          .insert(queueEntries)
          .values(entry)
          .returning();
        return newEntry;
      });
    });
  }

  async updateQueueEntry(id: string, entry: Partial<InsertQueueEntry>): Promise<QueueEntry> {
    return withPerformanceLogging('updateQueueEntry', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        const [updated] = await dbInstance
          .update(queueEntries)
          .set({ ...entry, updatedAt: new Date() })
          .where(eq(queueEntries.id, id))
          .returning();
        return updated;
      });
    });
  }

  async deleteQueueEntry(id: string): Promise<void> {
    return withPerformanceLogging('deleteQueueEntry', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        await dbInstance.delete(queueEntries).where(eq(queueEntries.id, id));
      });
    });
  }

  // Queue Call methods
  async getQueueCalls(branchId: string, activeOnly: boolean = false): Promise<QueueCall[]> {
    return withPerformanceLogging('getQueueCalls', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        const conditions = [eq(queueCalls.branchId, branchId)];
        
        if (activeOnly) {
          conditions.push(
            or(
              isNull(queueCalls.displayedUntil),
              gte(queueCalls.displayedUntil, new Date())
            )
          );
        }
        
        return await dbInstance
          .select()
          .from(queueCalls)
          .where(and(...conditions))
          .orderBy(desc(queueCalls.calledAt));
      });
    });
  }

  async getQueueCall(id: string): Promise<QueueCall | undefined> {
    return withPerformanceLogging('getQueueCall', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        const [call] = await dbInstance
          .select()
          .from(queueCalls)
          .where(eq(queueCalls.id, id));
        return call;
      });
    });
  }

  async getQueueCallsByEntry(queueEntryId: string): Promise<QueueCall[]> {
    return withPerformanceLogging('getQueueCallsByEntry', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        return await dbInstance
          .select()
          .from(queueCalls)
          .where(eq(queueCalls.queueEntryId, queueEntryId))
          .orderBy(desc(queueCalls.calledAt));
      });
    });
  }

  async createQueueCall(call: InsertQueueCall): Promise<QueueCall> {
    return withPerformanceLogging('createQueueCall', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        const [newCall] = await dbInstance
          .insert(queueCalls)
          .values(call)
          .returning();
        return newCall;
      });
    });
  }

  async updateQueueCall(id: string, call: Partial<InsertQueueCall>): Promise<QueueCall> {
    return withPerformanceLogging('updateQueueCall', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        const [updated] = await dbInstance
          .update(queueCalls)
          .set(call)
          .where(eq(queueCalls.id, id))
          .returning();
        return updated;
      });
    });
  }

  async deleteQueueCall(id: string): Promise<void> {
    return withPerformanceLogging('deleteQueueCall', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        await dbInstance.delete(queueCalls).where(eq(queueCalls.id, id));
      });
    });
  }

  async expireOldQueueCalls(): Promise<number> {
    return withPerformanceLogging('expireOldQueueCalls', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        // 🔒 AUTO-CLEANUP: Delete expired queue calls (older than displayedUntil)
        const result = await dbInstance
          .delete(queueCalls)
          .where(and(
            isNotNull(queueCalls.displayedUntil),
            lt(queueCalls.displayedUntil, new Date())
          ));
        return result.rowCount || 0;
      });
    });
  }

  // Medical Record methods - 🔒 SECURITY: branchId optional for admins (undefined = all branches)
  async getMedicalRecords(patientId: string | undefined, branchId: string | undefined, limit: number = 50, offset: number = 0): Promise<MedicalRecord[]> {
    return withPerformanceLogging('getMedicalRecords', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        if (patientId) {
          // 🔒 CRITICAL: For specific patient, enforce branch isolation if branchId provided
          const conditions = [eq(medicalRecords.patientId, patientId)];
          if (branchId) {
            conditions.push(eq(patients.branchId, branchId));
          }
          const results = await dbInstance.select({ medicalRecord: medicalRecords })
            .from(medicalRecords)
            .leftJoin(patients, eq(medicalRecords.patientId, patients.id))
            .where(and(...conditions))
            .orderBy(desc(medicalRecords.visitDate))
            .limit(limit)
            .offset(offset);
          return results.map(r => r.medicalRecord);
        }
        
        // 🔒 CRITICAL: For all medical records, enforce branch isolation if branchId provided
        const query = dbInstance.select({ medicalRecord: medicalRecords })
          .from(medicalRecords)
          .leftJoin(patients, eq(medicalRecords.patientId, patients.id));
        
        const results = branchId
          ? await query.where(eq(patients.branchId, branchId)).orderBy(desc(medicalRecords.visitDate)).limit(limit).offset(offset)
          : await query.orderBy(desc(medicalRecords.visitDate)).limit(limit).offset(offset);
        
        return results.map(r => r.medicalRecord);
      });
    });
  }

  async getMedicalRecordsCount(patientId: string | undefined, branchId: string | undefined): Promise<number> {
    return withPerformanceLogging('getMedicalRecordsCount', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        if (patientId) {
          const conditions = [eq(medicalRecords.patientId, patientId)];
          if (branchId) {
            conditions.push(eq(patients.branchId, branchId));
          }
          const result = await dbInstance.select({ count: sql<number>`count(*)::int` })
            .from(medicalRecords)
            .leftJoin(patients, eq(medicalRecords.patientId, patients.id))
            .where(and(...conditions));
          return result[0]?.count || 0;
        }
        
        const query = dbInstance.select({ count: sql<number>`count(*)::int` })
          .from(medicalRecords)
          .leftJoin(patients, eq(medicalRecords.patientId, patients.id));
        
        const result = branchId
          ? await query.where(eq(patients.branchId, branchId))
          : await query;
        
        return result[0]?.count || 0;
      });
    });
  }

  async getMedicalRecord(id: string): Promise<MedicalRecord | undefined> {
    return withPerformanceLogging('getMedicalRecord', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        const [record] = await dbInstance.select().from(medicalRecords).where(eq(medicalRecords.id, id));
        return record || undefined;
      });
    });
  }

  async createMedicalRecord(record: InsertMedicalRecord): Promise<MedicalRecord> {
    return withPerformanceLogging('createMedicalRecord', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        const recordToInsert = {
          ...record,
          weight: record.weight !== undefined ? record.weight.toString() : undefined,
          temperature: record.temperature !== undefined ? record.temperature.toString() : undefined
        };
        const [newRecord] = await dbInstance
          .insert(medicalRecords)
          .values(recordToInsert)
          .returning();
        return newRecord;
      });
    });
  }

  async updateMedicalRecord(id: string, record: Partial<InsertMedicalRecord>): Promise<MedicalRecord> {
    return withPerformanceLogging('updateMedicalRecord', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        const recordToUpdate = {
          ...record,
          weight: record.weight !== undefined ? record.weight.toString() : undefined,
          temperature: record.temperature !== undefined ? record.temperature.toString() : undefined,
          updatedAt: new Date()
        };
        const [updated] = await dbInstance
          .update(medicalRecords)
          .set(recordToUpdate)
          .where(eq(medicalRecords.id, id))
          .returning();
        return updated;
      });
    });
  }

  async deleteMedicalRecord(id: string): Promise<void> {
    return withPerformanceLogging('deleteMedicalRecord', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        await dbInstance.delete(medicalRecords).where(eq(medicalRecords.id, id));
      });
    });
  }

  // Medication methods
  async getMedicationsByRecord(recordId: string): Promise<Medication[]> {
    return withPerformanceLogging('getMedicationsByRecord', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        return await dbInstance
          .select()
          .from(medications)
          .where(eq(medications.recordId, recordId))
          .orderBy(desc(medications.createdAt));
      });
    });
  }

  async createMedication(medication: InsertMedication): Promise<Medication> {
    return withPerformanceLogging('createMedication', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        const [newMedication] = await dbInstance
          .insert(medications)
          .values(medication)
          .returning();
        return newMedication;
      });
    });
  }

  async updateMedication(id: string, medication: Partial<InsertMedication>): Promise<Medication> {
    return withPerformanceLogging('updateMedication', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        const [updated] = await dbInstance
          .update(medications)
          .set(medication)
          .where(eq(medications.id, id))
          .returning();
        return updated;
      });
    });
  }

  async deleteMedication(id: string): Promise<void> {
    return withPerformanceLogging('deleteMedication', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        await dbInstance.delete(medications).where(eq(medications.id, id));
      });
    });
  }

  // Service methods
  async getServices(activeOnly = false): Promise<Service[]> {
    return withPerformanceLogging('getServices', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        if (activeOnly) {
          return await dbInstance.select().from(services)
            .where(and(eq(services.isActive, true), isNull(services.deletedAt)))
            .orderBy(services.category, services.name);
        }
    
        return await dbInstance.select().from(services)
          .where(isNull(services.deletedAt))
          .orderBy(services.category, services.name);
      });
    });
  }

  // Получить услуги для синхронизации с МойСклад (новые/измененные)
  async getServicesForSync(): Promise<Service[]> {
    return withPerformanceLogging('getServicesForSync', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        return await dbInstance.select().from(services)
          .where(and(
            isNull(services.deletedAt),
            or(
              isNull(services.lastSyncedAt), // Новые записи
              gt(services.updatedAt, services.lastSyncedAt) // Измененные записи
            )
          ))
          .orderBy(services.updatedAt);
      });
    });
  }

  // Получить удаленные услуги для архивирования в МойСклад
  async getDeletedServicesForSync(): Promise<Service[]> {
    return withPerformanceLogging('getDeletedServicesForSync', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        return await dbInstance.select().from(services)
          .where(and(
            isNotNull(services.deletedAt),
            or(
              isNull(services.lastSyncedAt),
              gt(services.deletedAt, services.lastSyncedAt)
            )
          ))
          .orderBy(services.deletedAt);
      });
    });
  }

  async getService(id: string): Promise<Service | undefined> {
    return withPerformanceLogging('getService', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        const [service] = await dbInstance.select().from(services).where(eq(services.id, id));
        return service || undefined;
      });
    });
  }

  async createService(service: InsertService): Promise<Service> {
    return withPerformanceLogging('createService', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        const serviceToInsert = {
          ...service,
          price: service.price.toString()
        };
        const [newService] = await dbInstance
          .insert(services)
          .values(serviceToInsert)
          .returning();
        return newService;
      });
    });
  }

  async updateService(id: string, service: Partial<InsertService>): Promise<Service> {
    return withPerformanceLogging('updateService', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        const serviceToUpdate = {
          ...service,
          price: service.price !== undefined ? service.price.toString() : undefined,
          updatedAt: new Date()
        };
        const [updated] = await dbInstance
          .update(services)
          .set(serviceToUpdate)
          .where(eq(services.id, id))
          .returning();
        return updated;
      });
    });
  }

  async deleteService(id: string): Promise<void> {
    return withPerformanceLogging('deleteService', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        // Soft delete - mark as deleted but keep in DB for sync
        await dbInstance.update(services)
          .set({ 
            deletedAt: new Date(),
            updatedAt: new Date()
          })
          .where(eq(services.id, id));
      });
    });
  }

  async deleteAllServices(): Promise<void> {
    return withPerformanceLogging('deleteAllServices', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        // Hard delete all services for МойСклад sync
        await dbInstance.delete(services);
      });
    });
  }

  // External system integration methods for services
  async getServiceByExternalId(externalId: string, system: string): Promise<Service | undefined> {
    return withPerformanceLogging('getServiceByExternalId', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        const [service] = await dbInstance.select().from(services)
          .where(and(
            eq(services.externalId, externalId),
            eq(services.externalSystem, system),
            isNull(services.deletedAt)
          ));
        return service || undefined;
      });
    });
  }

  async getServicesByExternalSystem(system: string): Promise<Service[]> {
    return withPerformanceLogging('getServicesByExternalSystem', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        return await dbInstance.select().from(services)
          .where(and(
            eq(services.externalSystem, system),
            isNull(services.deletedAt)
          ))
          .orderBy(services.name);
      });
    });
  }

  // Отметить услугу как синхронизированную
  async markServiceSynced(id: string, syncHash: string): Promise<void> {
    return withPerformanceLogging('markServiceSynced', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        await dbInstance.update(services)
          .set({ 
            lastSyncedAt: new Date(),
            syncHash: syncHash
          })
          .where(eq(services.id, id));
      });
    });
  }

  async searchServices(query: string): Promise<Service[]> {
    return withPerformanceLogging('searchServices', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        const searchQuery = `%${query}%`;
        return await dbInstance
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
      });
    });
  }

  // Product methods
  async getProducts(activeOnly = false): Promise<Product[]> {
    return withPerformanceLogging('getProducts', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        if (activeOnly) {
          return await dbInstance.select().from(products)
            .where(and(eq(products.isActive, true), isNull(products.deletedAt)))
            .orderBy(products.category, products.name);
        }
    
        return await dbInstance.select().from(products)
          .where(isNull(products.deletedAt))
          .orderBy(products.category, products.name);
      });
    });
  }

  // Получить товары для синхронизации с МойСклад (новые/измененные)
  async getProductsForSync(): Promise<Product[]> {
    return await db.select().from(products)
      .where(and(
        isNull(products.deletedAt),
        or(
          isNull(products.lastSyncedAt), // Новые записи
          gt(products.updatedAt, products.lastSyncedAt) // Измененные записи
        )
      ))
      .orderBy(products.updatedAt);
  }

  // Получить удаленные товары для архивирования в МойСклад
  async getDeletedProductsForSync(): Promise<Product[]> {
    return await db.select().from(products)
      .where(and(
        isNotNull(products.deletedAt),
        or(
          isNull(products.lastSyncedAt),
          gt(products.deletedAt, products.lastSyncedAt)
        )
      ))
      .orderBy(products.deletedAt);
  }

  async getProduct(id: string): Promise<Product | undefined> {
    return withPerformanceLogging('getProduct', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        const [product] = await dbInstance.select().from(products).where(eq(products.id, id));
        return product || undefined;
      });
    });
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    return withPerformanceLogging('createProduct', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        const productToInsert = {
          ...product,
          price: product.price.toString()
        };
        const [newProduct] = await dbInstance
          .insert(products)
          .values(productToInsert)
          .returning();
        return newProduct;
      });
    });
  }

  async updateProduct(id: string, product: Partial<InsertProduct>): Promise<Product> {
    return withPerformanceLogging('updateProduct', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        const productToUpdate = {
          ...product,
          price: product.price !== undefined ? product.price.toString() : undefined,
          updatedAt: new Date()
        };
        const [updated] = await dbInstance
          .update(products)
          .set(productToUpdate)
          .where(eq(products.id, id))
          .returning();
        return updated;
      });
    });
  }

  async deleteProduct(id: string): Promise<void> {
    return withPerformanceLogging('deleteProduct', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        // Soft delete - mark as deleted but keep in DB for sync
        await dbInstance.update(products)
          .set({ 
            deletedAt: new Date(),
            updatedAt: new Date()
          })
          .where(eq(products.id, id));
      });
    });
  }

  async deleteAllProducts(): Promise<void> {
    return withPerformanceLogging('deleteAllProducts', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        // Hard delete all products for МойСклад sync
        await dbInstance.delete(products);
      });
    });
  }

  // Отметить товар как синхронизированный
  async markProductSynced(id: string, syncHash: string): Promise<void> {
    return withPerformanceLogging('markProductSynced', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        await dbInstance.update(products)
          .set({ 
            lastSyncedAt: new Date(),
            syncHash: syncHash
          })
          .where(eq(products.id, id));
      });
    });
  }

  async searchProducts(query: string): Promise<Product[]> {
    return withPerformanceLogging('searchProducts', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        const searchQuery = `%${query}%`;
        return await dbInstance
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
      });
    });
  }

  async getLowStockProducts(): Promise<Product[]> {
    return withPerformanceLogging('getLowStockProducts', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        return await dbInstance
          .select()
          .from(products)
          .where(
            and(
              eq(products.isActive, true),
              sql`${products.stock} <= ${products.minStock}`
            )
          )
          .orderBy(products.name);
      });
    });
  }

  async updateProductStock(id: string, quantity: number): Promise<Product> {
    return withPerformanceLogging('updateProductStock', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        const [updated] = await dbInstance
          .update(products)
          .set({ 
            stock: sql`${products.stock} + ${quantity}`,
            updatedAt: new Date()
          })
          .where(eq(products.id, id))
          .returning();
        return updated;
      });
    });
  }

  // External system integration methods for products
  async getProductByExternalId(externalId: string, system: string): Promise<Product | undefined> {
    return withPerformanceLogging('getProductByExternalId', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        const [product] = await dbInstance.select().from(products)
          .where(and(
            eq(products.externalId, externalId),
            eq(products.externalSystem, system),
            isNull(products.deletedAt)
          ));
        return product || undefined;
      });
    });
  }

  async getProductsByExternalSystem(system: string): Promise<Product[]> {
    return withPerformanceLogging('getProductsByExternalSystem', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        return await dbInstance.select().from(products)
          .where(and(
            eq(products.externalSystem, system),
            isNull(products.deletedAt)
          ))
          .orderBy(products.name);
      });
    });
  }

  // Invoice methods - 🔒 SECURITY: branchId mandatory for PHI isolation
  
  // Расширенный метод для получения счетов с данными пациентов и владельцев
  async getInvoicesWithDetails(status: string | undefined, branchId: string) {
    return withPerformanceLogging('getInvoicesWithDetails', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        // 🔒 CRITICAL: Enforce branch isolation via patient join OR hospital stay
        // Use raw SQL to get owner data from patient_owners table
        const result = await dbInstance.execute(sql`
          SELECT 
            i.id,
            i.invoice_number,
            i.patient_id,
            i.appointment_id,
            i.issue_date,
            i.due_date,
            i.subtotal,
            i.discount,
            i.total,
            i.status,
            i.payment_method,
            i.paid_date,
            i.payment_id,
            i.payment_url,
            i.fiscal_receipt_id,
            i.fiscal_receipt_url,
            i.notes,
            i.created_at,
            i.updated_at,
            p.name as patient_name,
            p.species as patient_species,
            p.breed as patient_breed,
            COALESCE(
              (SELECT o.name FROM patient_owners po 
               JOIN owners o ON po.owner_id = o.id 
               WHERE po.patient_id = p.id 
               ORDER BY po.is_primary DESC, po.created_at ASC 
               LIMIT 1),
              (SELECT o.name FROM owners o WHERE o.id = p.owner_id)
            ) as owner_name,
            COALESCE(
              (SELECT o.phone FROM patient_owners po 
               JOIN owners o ON po.owner_id = o.id 
               WHERE po.patient_id = p.id 
               ORDER BY po.is_primary DESC, po.created_at ASC 
               LIMIT 1),
              (SELECT o.phone FROM owners o WHERE o.id = p.owner_id)
            ) as owner_phone
          FROM invoices i
          LEFT JOIN patients p ON i.patient_id = p.id
          LEFT JOIN hospital_stays hs ON i.id = hs.active_invoice_id
          WHERE (p.branch_id = ${branchId} OR hs.branch_id = ${branchId})
          ${status ? sql`AND i.status = ${status}` : sql``}
          ORDER BY i.issue_date DESC
        `);
        
        return result.rows.map((row: any) => ({
          id: row.id,
          invoiceNumber: row.invoice_number,
          patientId: row.patient_id,
          appointmentId: row.appointment_id,
          issueDate: row.issue_date,
          dueDate: row.due_date,
          subtotal: row.subtotal,
          discount: row.discount,
          total: row.total,
          status: row.status,
          paymentMethod: row.payment_method,
          paidDate: row.paid_date,
          paymentId: row.payment_id,
          paymentUrl: row.payment_url,
          fiscalReceiptId: row.fiscal_receipt_id,
          fiscalReceiptUrl: row.fiscal_receipt_url,
          notes: row.notes,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
          patientName: row.patient_name,
          patientSpecies: row.patient_species,
          patientBreed: row.patient_breed,
          ownerName: row.owner_name,
          ownerPhone: row.owner_phone,
        }));
      });
    });
  }
  
  async getInvoices(status: string | undefined, branchId: string): Promise<Invoice[]> {
    return withPerformanceLogging('getInvoices', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        // 🔒 CRITICAL: Enforce branch isolation via patient join
        let query = dbInstance.select({
          id: invoices.id,
          invoiceNumber: invoices.invoiceNumber,
          patientId: invoices.patientId,
          appointmentId: invoices.appointmentId,
          issueDate: invoices.issueDate,
          dueDate: invoices.dueDate,
          subtotal: invoices.subtotal,
          discount: invoices.discount,
          total: invoices.total,
          status: invoices.status,
          paymentMethod: invoices.paymentMethod,
          paidDate: invoices.paidDate,
          paymentId: invoices.paymentId,
          paymentUrl: invoices.paymentUrl,
          fiscalReceiptId: invoices.fiscalReceiptId,
          fiscalReceiptUrl: invoices.fiscalReceiptUrl,
          notes: invoices.notes,
          createdAt: invoices.createdAt,
          updatedAt: invoices.updatedAt,
        }).from(invoices)
          .leftJoin(patients, eq(invoices.patientId, patients.id))
          .where(eq(patients.branchId, branchId));
    
        if (status) {
          query = query.where(and(eq(patients.branchId, branchId), eq(invoices.status, status)));
        }
    
        return await query.orderBy(desc(invoices.issueDate));
      });
    });
  }

  async getInvoice(id: string): Promise<Invoice | undefined> {
    return withPerformanceLogging('getInvoice', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        const [invoice] = await dbInstance.select().from(invoices).where(eq(invoices.id, id));
        return invoice || undefined;
      });
    });
  }

  async getInvoicesByPatient(patientId: string, branchId: string): Promise<Invoice[]> {
    return withPerformanceLogging('getInvoicesByPatient', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        // 🔒 CRITICAL: Enforce branch isolation via patient join
        return await dbInstance
          .select({
            id: invoices.id,
            invoiceNumber: invoices.invoiceNumber,
            patientId: invoices.patientId,
            appointmentId: invoices.appointmentId,
            issueDate: invoices.issueDate,
            dueDate: invoices.dueDate,
            subtotal: invoices.subtotal,
            discount: invoices.discount,
            total: invoices.total,
            status: invoices.status,
            paymentMethod: invoices.paymentMethod,
            paidDate: invoices.paidDate,
            paymentId: invoices.paymentId,
            paymentUrl: invoices.paymentUrl,
            fiscalReceiptId: invoices.fiscalReceiptId,
            fiscalReceiptUrl: invoices.fiscalReceiptUrl,
            notes: invoices.notes,
            createdAt: invoices.createdAt,
            updatedAt: invoices.updatedAt,
          })
          .from(invoices)
          .leftJoin(patients, eq(invoices.patientId, patients.id))
          .where(and(eq(invoices.patientId, patientId), eq(patients.branchId, branchId)))
          .orderBy(desc(invoices.issueDate));
      });
    });
  }

  async createInvoice(invoice: InsertInvoice): Promise<Invoice> {
    return withPerformanceLogging('createInvoice', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        // Generate invoice number if not provided
        let invoiceNumber = invoice.invoiceNumber;
        if (!invoiceNumber) {
          // Generate invoice number in format: INV-YYYYMMDD-XXXXX
          const date = new Date();
          const dateStr = date.getFullYear().toString() + 
                         (date.getMonth() + 1).toString().padStart(2, '0') + 
                         date.getDate().toString().padStart(2, '0');
      
          // Get count of invoices created today for sequential numbering
          const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
          const endOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
      
          const todayInvoices = await dbInstance
            .select({ count: sql<number>`count(*)` })
            .from(invoices)
            .where(and(
              gte(invoices.issueDate, startOfDay),
              lt(invoices.issueDate, endOfDay)
            ));
      
          const sequentialNumber = (todayInvoices[0]?.count || 0) + 1;
          invoiceNumber = `INV-${dateStr}-${sequentialNumber.toString().padStart(5, '0')}`;
        }

        const invoiceToInsert = {
          ...invoice,
          invoiceNumber,
          subtotal: invoice.subtotal.toString(),
          discount: invoice.discount !== undefined ? invoice.discount.toString() : "0",
          total: invoice.total.toString()
        };
        const [newInvoice] = await dbInstance
          .insert(invoices)
          .values(invoiceToInsert)
          .returning();
        return newInvoice;
      });
    });
  }

  async updateInvoice(id: string, invoice: Partial<InsertInvoice>): Promise<Invoice> {
    return withPerformanceLogging('updateInvoice', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        const invoiceToUpdate = {
          ...invoice,
          subtotal: invoice.subtotal !== undefined ? invoice.subtotal.toString() : undefined,
          discount: invoice.discount !== undefined ? invoice.discount.toString() : undefined,
          total: invoice.total !== undefined ? invoice.total.toString() : undefined,
          updatedAt: new Date()
        };
        const [updated] = await dbInstance
          .update(invoices)
          .set(invoiceToUpdate)
          .where(eq(invoices.id, id))
          .returning();
        return updated;
      });
    });
  }

  async deleteInvoice(id: string): Promise<void> {
    return withPerformanceLogging('deleteInvoice', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        await dbInstance.delete(invoices).where(eq(invoices.id, id));
      });
    });
  }

  async getInvoiceItems(invoiceId: string): Promise<InvoiceItem[]> {
    return withPerformanceLogging('getInvoiceItems', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        return await dbInstance
          .select()
          .from(invoiceItems)
          .where(eq(invoiceItems.invoiceId, invoiceId))
          .orderBy(invoiceItems.itemName);
      });
    });
  }

  async createInvoiceItem(item: InsertInvoiceItem): Promise<InvoiceItem> {
    return withPerformanceLogging('createInvoiceItem', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        const itemToInsert = {
          ...item,
          price: item.price.toString(),
          total: item.total.toString()
        };
        const [newItem] = await dbInstance
          .insert(invoiceItems)
          .values(itemToInsert)
          .returning();
        return newItem;
      });
    });
  }

  async deleteInvoiceItem(id: string): Promise<void> {
    return withPerformanceLogging('deleteInvoiceItem', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        await dbInstance.delete(invoiceItems).where(eq(invoiceItems.id, id));
      });
    });
  }

  async getOverdueInvoices(branchId: string): Promise<Invoice[]> {
    return withPerformanceLogging('getOverdueInvoices', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        // 🔒 CRITICAL: Enforce branch isolation via patient join
        const now = new Date();
        return await dbInstance
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
      });
    });
  }

  async getDashboardStats() {
    return withPerformanceLogging('getDashboardStats', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        const today = new Date();
        const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);

        // Single optimized query using CTEs to get all stats in one round trip
        const result = await dbInstance.execute(sql`
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
    });
  }

  // Branch methods
  async getBranches(): Promise<Branch[]> {
    return await withPerformanceLogging('getBranches', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        return await dbInstance.select().from(branches).orderBy(desc(branches.createdAt));
      });
    });
  }

  async getActiveBranches(): Promise<Branch[]> {
    return await withPerformanceLogging('getActiveBranches', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        return await dbInstance.select().from(branches)
          .where(eq(branches.status, 'active'))
          .orderBy(branches.name);
      });
    });
  }

  async getBranch(id: string): Promise<Branch | undefined> {
    return await withPerformanceLogging('getBranch', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        const [branch] = await dbInstance.select().from(branches).where(eq(branches.id, id));
        return branch || undefined;
      });
    });
  }

  async getTenantBranches(tenantId: string): Promise<Branch[]> {
    return await withPerformanceLogging('getTenantBranches', async () => {
      // Use global db to bypass RLS for superadmin tenant switching
      return await db.select().from(branches)
        .where(eq(branches.tenantId, tenantId))
        .orderBy(branches.name);
    });
  }

  async createBranch(branch: InsertBranch): Promise<Branch> {
    return await withPerformanceLogging('createBranch', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        const [newBranch] = await dbInstance
          .insert(branches)
          .values(branch)
          .returning();
        return newBranch;
      });
    });
  }

  async updateBranch(id: string, branch: Partial<InsertBranch>): Promise<Branch> {
    return await withPerformanceLogging('updateBranch', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        const [updated] = await dbInstance
          .update(branches)
          .set({ ...branch, updatedAt: new Date() })
          .where(eq(branches.id, id))
          .returning();
        return updated;
      });
    });
  }

  async countBranchRelations(branchId: string): Promise<{ owners: number; patients: number; users: number }> {
    return await withPerformanceLogging('countBranchRelations', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        const [ownersResult, patientsResult, usersResult] = await Promise.all([
          // Count owners through their patients in this branch
          dbInstance.select({ count: sql<number>`count(DISTINCT ${owners.id})` })
            .from(owners)
            .innerJoin(patientOwners, eq(patientOwners.ownerId, owners.id))
            .innerJoin(patients, eq(patients.id, patientOwners.patientId))
            .where(or(eq(patients.branchId, branchId), isNull(patients.branchId))),
          dbInstance.select({ count: sql<number>`count(*)` })
            .from(patients)
            .where(eq(patients.branchId, branchId)),
          dbInstance.select({ count: sql<number>`count(*)` })
            .from(users)
            .where(eq(users.branchId, branchId))
        ]);

        return {
          owners: Number(ownersResult[0]?.count || 0),
          patients: Number(patientsResult[0]?.count || 0),
          users: Number(usersResult[0]?.count || 0)
        };
      });
    });
  }

  async deleteBranch(id: string): Promise<void> {
    return await withPerformanceLogging('deleteBranch', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        await dbInstance.delete(branches).where(eq(branches.id, id));
      });
    });
  }

  // 🔒 SECURITY: Branch access control implementations
  async canUserAccessBranch(userId: string, branchId: string): Promise<boolean> {
    return await withPerformanceLogging('canUserAccessBranch', async () => {
      const user = await this.getUser(userId);
      if (!user) {
        return false;
      }

      // ВСЕ пользователи имеют доступ ко всем активным филиалам в регистратуре
      const branch = await this.getBranch(branchId);
      return !!(branch && branch.status === 'active');
    });
  }

  async getUserAccessibleBranches(userId: string): Promise<Branch[]> {
    return await withPerformanceLogging('getUserAccessibleBranches', async () => {
      const user = await this.getUser(userId);
      if (!user) {
        return [];
      }

      // ВСЕ пользователи видят все активные филиалы в регистратуре
      return await this.getActiveBranches();
    });
  }

  // Patient File methods implementation
  async createPatientFile(file: InsertPatientFile): Promise<PatientFile> {
    return withPerformanceLogging('createPatientFile', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        const [newFile] = await dbInstance
          .insert(patientFiles)
          .values(file)
          .returning();
        return newFile;
      });
    });
  }

  async getPatientFiles(patientId: string, fileType?: string): Promise<PatientFile[]> {
    return withPerformanceLogging('getPatientFiles', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        const conditions = [eq(patientFiles.patientId, patientId)];
      
        if (fileType) {
          conditions.push(eq(patientFiles.fileType, fileType));
        }

        return await dbInstance
          .select()
          .from(patientFiles)
          .where(and(...conditions))
          .orderBy(desc(patientFiles.createdAt));
      });
    });
  }

  async getPatientFileById(fileId: string): Promise<PatientFile | undefined> {
    return withPerformanceLogging('getPatientFileById', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        const [file] = await dbInstance
          .select()
          .from(patientFiles)
          .where(eq(patientFiles.id, fileId));
        return file || undefined;
      });
    });
  }

  async deletePatientFile(fileId: string): Promise<void> {
    return withPerformanceLogging('deletePatientFile', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        await dbInstance.delete(patientFiles).where(eq(patientFiles.id, fileId));
      });
    });
  }

  // Laboratory Study methods implementation
  async getLabStudies(activeOnly?: boolean): Promise<LabStudy[]> {
    return withPerformanceLogging('getLabStudies', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        const conditions = activeOnly ? [eq(labStudies.isActive, true)] : [];
        return await dbInstance
          .select()
          .from(labStudies)
          .where(conditions.length ? and(...conditions) : undefined)
          .orderBy(labStudies.category, labStudies.name);
      });
    });
  }

  async getLabStudy(id: string): Promise<LabStudy | undefined> {
    return withPerformanceLogging('getLabStudy', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        const [study] = await dbInstance.select().from(labStudies).where(eq(labStudies.id, id));
        return study || undefined;
      });
    });
  }

  async createLabStudy(study: InsertLabStudy): Promise<LabStudy> {
    return withPerformanceLogging('createLabStudy', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        const [newStudy] = await dbInstance
          .insert(labStudies)
          .values(study)
          .returning();
        return newStudy;
      });
    });
  }

  async updateLabStudy(id: string, study: Partial<InsertLabStudy>): Promise<LabStudy> {
    return withPerformanceLogging('updateLabStudy', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        const [updated] = await dbInstance
          .update(labStudies)
          .set({ ...study, updatedAt: new Date() })
          .where(eq(labStudies.id, id))
          .returning();
        return updated;
      });
    });
  }

  async deleteLabStudy(id: string): Promise<void> {
    return withPerformanceLogging('deleteLabStudy', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        await dbInstance.delete(labStudies).where(eq(labStudies.id, id));
      });
    });
  }

  async searchLabStudies(query: string): Promise<LabStudy[]> {
    return withPerformanceLogging('searchLabStudies', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        return await dbInstance
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
    });
  }

  // Laboratory Parameter methods implementation
  async getLabParameters(studyId?: string): Promise<LabParameter[]> {
    return withPerformanceLogging('getLabParameters', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        const conditions = studyId ? [eq(labParameters.studyId, studyId)] : [];
        return await dbInstance
          .select()
          .from(labParameters)
          .where(conditions.length ? and(...conditions) : undefined)
          .orderBy(labParameters.sortOrder, labParameters.name);
      });
    });
  }

  async getLabParameter(id: string): Promise<LabParameter | undefined> {
    return withPerformanceLogging('getLabParameter', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        const [parameter] = await dbInstance.select().from(labParameters).where(eq(labParameters.id, id));
        return parameter || undefined;
      });
    });
  }

  async createLabParameter(parameter: InsertLabParameter): Promise<LabParameter> {
    return withPerformanceLogging('createLabParameter', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        const [newParameter] = await dbInstance
          .insert(labParameters)
          .values(parameter)
          .returning();
        return newParameter;
      });
    });
  }

  async updateLabParameter(id: string, parameter: Partial<InsertLabParameter>): Promise<LabParameter> {
    return withPerformanceLogging('updateLabParameter', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        const [updated] = await dbInstance
          .update(labParameters)
          .set({ ...parameter, updatedAt: new Date() })
          .where(eq(labParameters.id, id))
          .returning();
        return updated;
      });
    });
  }

  async deleteLabParameter(id: string): Promise<void> {
    return withPerformanceLogging('deleteLabParameter', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        await dbInstance.delete(labParameters).where(eq(labParameters.id, id));
      });
    });
  }

  // Reference Range methods implementation
  async getReferenceRanges(parameterId?: string, species?: string): Promise<ReferenceRange[]> {
    return withPerformanceLogging('getReferenceRanges', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        const conditions = [];
        if (parameterId) conditions.push(eq(referenceRanges.parameterId, parameterId));
        if (species) conditions.push(eq(referenceRanges.species, species));
      
        return await dbInstance
          .select()
          .from(referenceRanges)
          .where(conditions.length ? and(...conditions) : undefined)
          .orderBy(referenceRanges.species, referenceRanges.breed);
      });
    });
  }

  async getReferenceRange(id: string): Promise<ReferenceRange | undefined> {
    return withPerformanceLogging('getReferenceRange', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        const [range] = await dbInstance.select().from(referenceRanges).where(eq(referenceRanges.id, id));
        return range || undefined;
      });
    });
  }

  async createReferenceRange(range: InsertReferenceRange): Promise<ReferenceRange> {
    return withPerformanceLogging('createReferenceRange', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        const [newRange] = await dbInstance
          .insert(referenceRanges)
          .values(range)
          .returning();
        return newRange;
      });
    });
  }

  async updateReferenceRange(id: string, range: Partial<InsertReferenceRange>): Promise<ReferenceRange> {
    return withPerformanceLogging('updateReferenceRange', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        const [updated] = await dbInstance
          .update(referenceRanges)
          .set({ ...range, updatedAt: new Date() })
          .where(eq(referenceRanges.id, id))
          .returning();
        return updated;
      });
    });
  }

  async deleteReferenceRange(id: string): Promise<void> {
    return withPerformanceLogging('deleteReferenceRange', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        await dbInstance.delete(referenceRanges).where(eq(referenceRanges.id, id));
      });
    });
  }

  async getApplicableReferenceRange(parameterId: string, species: string, breed?: string, age?: number, sex?: string): Promise<ReferenceRange | undefined> {
    return withPerformanceLogging('getApplicableReferenceRange', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
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
      
        const [range] = await dbInstance
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
    });
  }

  // Laboratory Order methods implementation - 🔒 SECURITY: branchId mandatory for PHI isolation
  async getLabOrders(patientId: string | undefined, status: string | undefined, branchId: string): Promise<LabOrder[]> {
    return withPerformanceLogging('getLabOrders', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        const conditions = [eq(patients.branchId, branchId)];
        if (patientId) conditions.push(eq(labOrders.patientId, patientId));
        if (status) conditions.push(eq(labOrders.status, status));
      
        // 🔒 CRITICAL: Enforce branch isolation via patient join
        return await dbInstance
          .select()
          .from(labOrders)
          .leftJoin(patients, eq(labOrders.patientId, patients.id))
          .where(and(...conditions))
          .orderBy(desc(labOrders.orderedDate));
      });
    });
  }

  async getLabOrder(id: string): Promise<LabOrder | undefined> {
    return withPerformanceLogging('getLabOrder', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        const [order] = await dbInstance.select().from(labOrders).where(eq(labOrders.id, id));
        return order || undefined;
      });
    });
  }

  async createLabOrder(order: InsertLabOrder): Promise<LabOrder> {
    return withPerformanceLogging('createLabOrder', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        const [newOrder] = await dbInstance
          .insert(labOrders)
          .values(order)
          .returning();
        return newOrder;
      });
    });
  }

  async updateLabOrder(id: string, order: Partial<InsertLabOrder>): Promise<LabOrder> {
    return withPerformanceLogging('updateLabOrder', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        const [updated] = await dbInstance
          .update(labOrders)
          .set({ ...order, updatedAt: new Date() })
          .where(eq(labOrders.id, id))
          .returning();
        return updated;
      });
    });
  }

  async deleteLabOrder(id: string): Promise<void> {
    return withPerformanceLogging('deleteLabOrder', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        await dbInstance.delete(labOrders).where(eq(labOrders.id, id));
      });
    });
  }

  async getLabOrdersByDoctor(doctorId: string, branchId: string): Promise<LabOrder[]> {
    return withPerformanceLogging('getLabOrdersByDoctor', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        // 🔒 CRITICAL: Enforce branch isolation via patient join
        return await dbInstance
          .select()
          .from(labOrders)
          .leftJoin(patients, eq(labOrders.patientId, patients.id))
          .where(and(eq(labOrders.doctorId, doctorId), eq(patients.branchId, branchId)))
          .orderBy(desc(labOrders.orderedDate));
      });
    });
  }

  async getLabOrdersByAppointment(appointmentId: string, branchId: string): Promise<LabOrder[]> {
    return withPerformanceLogging('getLabOrdersByAppointment', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        // 🔒 CRITICAL: Enforce branch isolation via patient join
        return await dbInstance
          .select()
          .from(labOrders)
          .leftJoin(patients, eq(labOrders.patientId, patients.id))
          .where(and(eq(labOrders.appointmentId, appointmentId), eq(patients.branchId, branchId)))
          .orderBy(desc(labOrders.orderedDate));
      });
    });
  }

  // Laboratory Result Detail methods implementation
  async getLabResultDetails(orderId: string): Promise<LabResultDetail[]> {
    return withPerformanceLogging('getLabResultDetails', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        return await dbInstance
          .select()
          .from(labResultDetails)
          .where(eq(labResultDetails.orderId, orderId))
          .orderBy(labResultDetails.createdAt);
      });
    });
  }

  async getLabResultDetail(id: string): Promise<LabResultDetail | undefined> {
    return withPerformanceLogging('getLabResultDetail', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        const [detail] = await dbInstance.select().from(labResultDetails).where(eq(labResultDetails.id, id));
        return detail || undefined;
      });
    });
  }

  async createLabResultDetail(detail: InsertLabResultDetail): Promise<LabResultDetail> {
    return withPerformanceLogging('createLabResultDetail', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        const values: typeof labResultDetails.$inferInsert = {
          ...detail,
          numericValue: detail.numericValue === undefined ? null : String(detail.numericValue),
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        const [newDetail] = await dbInstance
          .insert(labResultDetails)
          .values(values)
          .returning();
        return newDetail;
      });
    });
  }

  async updateLabResultDetail(id: string, detail: Partial<InsertLabResultDetail>): Promise<LabResultDetail> {
    return withPerformanceLogging('updateLabResultDetail', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        const patch: Partial<typeof labResultDetails.$inferInsert> = {
          ...detail,
          numericValue: detail.numericValue === undefined ? undefined : String(detail.numericValue),
          updatedAt: new Date(),
        };
      
        const [updated] = await dbInstance
          .update(labResultDetails)
          .set(patch)
          .where(eq(labResultDetails.id, id))
          .returning();
        return updated;
      });
    });
  }

  async deleteLabResultDetail(id: string): Promise<void> {
    return withPerformanceLogging('deleteLabResultDetail', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        await dbInstance.delete(labResultDetails).where(eq(labResultDetails.id, id));
      });
    });
  }

  async getLabResultsByParameter(parameterId: string): Promise<LabResultDetail[]> {
    return withPerformanceLogging('getLabResultsByParameter', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        return await dbInstance
          .select()
          .from(labResultDetails)
          .where(eq(labResultDetails.parameterId, parameterId))
          .orderBy(desc(labResultDetails.createdAt));
      });
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
      return withTenantContext(undefined, async (dbInstance) => {
        const [created] = await dbInstance
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
    });
  }

  async updatePaymentIntent(id: string, updates: {
    status?: string;
    confirmedAt?: Date;
    errorMessage?: string | null;
  }): Promise<void> {
    return withPerformanceLogging('updatePaymentIntent', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        await dbInstance
          .update(paymentIntents)
          .set({
            ...updates,
            updatedAt: new Date(),
          })
          .where(eq(paymentIntents.id, id));
      });
    });
  }
  
  // Fiscal Receipt methods
  async createFiscalReceipt(fiscalReceiptData: {
    invoiceId: string;
    receiptNumber: string | null;
    status: string;
    receiptType: string | null;
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
      return withTenantContext(undefined, async (dbInstance) => {
        const [created] = await dbInstance
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
      return withTenantContext(undefined, async (dbInstance) => {
        await dbInstance
          .update(fiscalReceipts)
          .set({
            ...updates,
            updatedAt: new Date(),
          })
          .where(eq(fiscalReceipts.id, id));
      });
    });
  }
  
  // Local Print methods implementation
  async getFiscalReceipt(id: string): Promise<{
    id: string;
    invoiceId: string;
    items: any;
    totalAmount: string;
    customerEmail: string | null;
    customerPhone: string | null;
    paymentMethod: string;
    taxationSystem: string;
    operatorName: string | null;
    receiptType: string | null;
    localPrintStatus: string | null;
    localPrinterType: string | null;
    localPrintedAt: Date | null;
    localPrintData: any;
    localPrintError: string | null;
    createdAt: Date;
  } | undefined> {
    return withPerformanceLogging('getFiscalReceipt', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        const [receipt] = await dbInstance
          .select({
            id: fiscalReceipts.id,
            invoiceId: fiscalReceipts.invoiceId,
            items: fiscalReceipts.items,
            totalAmount: fiscalReceipts.totalAmount,
            customerEmail: fiscalReceipts.customerEmail,
            customerPhone: fiscalReceipts.customerPhone,
            paymentMethod: fiscalReceipts.paymentMethod,
            taxationSystem: fiscalReceipts.taxationSystem,
            operatorName: fiscalReceipts.operatorName,
            receiptType: fiscalReceipts.receiptType,
            localPrintStatus: fiscalReceipts.localPrintStatus,
            localPrinterType: fiscalReceipts.localPrinterType,
            localPrintedAt: fiscalReceipts.localPrintedAt,
            localPrintData: fiscalReceipts.localPrintData,
            localPrintError: fiscalReceipts.localPrintError,
            createdAt: fiscalReceipts.createdAt,
          })
          .from(fiscalReceipts)
          .where(eq(fiscalReceipts.id, id));
        return receipt || undefined;
      });
    });
  }

  async getPendingLocalPrintReceipts(branchId: string): Promise<{
    id: string;
    invoiceId: string;
    items: any;
    totalAmount: string;
    customerEmail: string | null;
    customerPhone: string | null;
    paymentMethod: string;
    taxationSystem: string;
    operatorName: string | null;
    receiptType: string | null;
    createdAt: Date;
  }[]> {
    return withPerformanceLogging('getPendingLocalPrintReceipts', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        return await dbInstance
          .select({
            id: fiscalReceipts.id,
            invoiceId: fiscalReceipts.invoiceId,
            items: fiscalReceipts.items,
            totalAmount: fiscalReceipts.totalAmount,
            customerEmail: fiscalReceipts.customerEmail,
            customerPhone: fiscalReceipts.customerPhone,
            paymentMethod: fiscalReceipts.paymentMethod,
            taxationSystem: fiscalReceipts.taxationSystem,
            operatorName: fiscalReceipts.operatorName,
            receiptType: fiscalReceipts.receiptType,
            createdAt: fiscalReceipts.createdAt,
          })
          .from(fiscalReceipts)
          .innerJoin(invoices, eq(fiscalReceipts.invoiceId, invoices.id))
          .innerJoin(patients, eq(invoices.patientId, patients.id))
          .where(
            and(
              eq(patients.branchId, branchId),
              eq(fiscalReceipts.localPrintRequested, true),
              eq(fiscalReceipts.localPrintStatus, 'pending')
            )
          )
          .orderBy(asc(fiscalReceipts.createdAt));
      });
    });
  }

  async markReceiptAsPrinted(receiptId: string, printResult: any, printedAt: Date): Promise<boolean> {
    return withPerformanceLogging('markReceiptAsPrinted', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        const success = printResult.success === true;
      
        const result = await dbInstance
          .update(fiscalReceipts)
          .set({
            localPrintStatus: success ? 'printed' : 'failed',
            localPrintedAt: printedAt,
            localPrintData: printResult,
            localPrintError: success ? null : (printResult.error || 'Unknown print error'),
            updatedAt: new Date(),
          })
          .where(eq(fiscalReceipts.id, receiptId))
          .returning({ id: fiscalReceipts.id });
      
        return result.length > 0;
      });
    });
  }

  // === РАСШИРЕННАЯ КАССОВАЯ СИСТЕМА ===
  
  // Управление кассами
  async getCashRegisters(branchId: string): Promise<CashRegister[]> {
    return withPerformanceLogging('getCashRegisters', async () => {
      return await db.select().from(cashRegisters).where(eq(cashRegisters.branchId, branchId));
    });
  }
  
  async createCashRegister(register: InsertCashRegister): Promise<CashRegister> {
    return withPerformanceLogging('createCashRegister', async () => {
      const [created] = await db.insert(cashRegisters).values({
        id: generateId(),
        ...register
      }).returning();
      return created;
    });
  }
  
  async updateCashRegister(id: string, updates: Partial<InsertCashRegister>): Promise<CashRegister | null> {
    return withPerformanceLogging('updateCashRegister', async () => {
      const [updated] = await db
        .update(cashRegisters)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(cashRegisters.id, id))
        .returning();
      return updated || null;
    });
  }
  
  // Управление сменами
  async getCashShifts(branchId: string): Promise<CashShift[]> {
    return withPerformanceLogging('getCashShifts', async () => {
      return await db
        .select()
        .from(cashShifts)
        .where(eq(cashShifts.branchId, branchId))
        .orderBy(desc(cashShifts.createdAt));
    });
  }

  async createCashShift(shift: InsertCashShift): Promise<CashShift> {
    return withPerformanceLogging('createCashShift', async () => {
      const [created] = await db.insert(cashShifts).values(shift).returning();
      return created;
    });
  }

  async updateCashShift(id: string, updates: Partial<InsertCashShift>): Promise<CashShift | null> {
    return withPerformanceLogging('updateCashShift', async () => {
      const [updated] = await db
        .update(cashShifts)
        .set({
          ...updates,
          updatedAt: new Date()
        })
        .where(eq(cashShifts.id, id))
        .returning();
      
      return updated || null;
    });
  }

  async openCashShift(registerId: string, cashierId: string, openingCash: string): Promise<CashShift> {
    return withPerformanceLogging('openCashShift', async () => {
      // Закрываем предыдущую смену, если она открыта
      await db
        .update(cashShifts)
        .set({ status: 'closed', closedAt: new Date() })
        .where(and(
          eq(cashShifts.registerId, registerId),
          eq(cashShifts.status, 'open')
        ));
      
      // Получаем номер следующей смены
      const lastShift = await db
        .select({ shiftNumber: cashShifts.shiftNumber })
        .from(cashShifts)
        .where(eq(cashShifts.registerId, registerId))
        .orderBy(desc(cashShifts.shiftNumber))
        .limit(1);
      
      const nextShiftNumber = (lastShift[0]?.shiftNumber || 0) + 1;
      
      const [shift] = await db.insert(cashShifts).values({
        id: generateId(),
        registerId,
        cashierId,
        shiftNumber: nextShiftNumber,
        openingCashAmount: openingCash,
        status: 'open'
      }).returning();
      
      return shift;
    });
  }
  
  async closeCashShift(shiftId: string, closingCash: string, notes?: string): Promise<CashShift | null> {
    return withPerformanceLogging('closeCashShift', async () => {
      const [closed] = await db
        .update(cashShifts)
        .set({
          status: 'closed',
          closedAt: new Date(),
          closingCashAmount: closingCash,
          notes
        })
        .where(eq(cashShifts.id, shiftId))
        .returning();
      return closed || null;
    });
  }
  
  async getCurrentShift(registerId: string): Promise<CashShift | null> {
    return withPerformanceLogging('getCurrentShift', async () => {
      const [shift] = await db
        .select()
        .from(cashShifts)
        .where(and(
          eq(cashShifts.registerId, registerId),
          eq(cashShifts.status, 'open')
        ))
        .limit(1);
      return shift || null;
    });
  }
  
  // Управление клиентами
  async getCustomers(branchId: string, search?: string): Promise<Customer[]> {
    return withPerformanceLogging('getCustomers', async () => {
      let whereConditions = [eq(customers.branchId, branchId)];
      
      if (search) {
        whereConditions.push(or(
          ilike(customers.firstName, `%${search}%`),
          ilike(customers.lastName, `%${search}%`),
          ilike(customers.phone, `%${search}%`),
          ilike(customers.email, `%${search}%`),
          ilike(customers.cardNumber, `%${search}%`)
        )!);
      }
      
      return await db.select().from(customers)
        .where(whereConditions.length > 1 ? and(...whereConditions) : whereConditions[0])
        .orderBy(customers.lastName, customers.firstName);
    });
  }
  
  async createCustomer(customer: InsertCustomer): Promise<Customer> {
    return withPerformanceLogging('createCustomer', async () => {
      const [created] = await db.insert(customers).values({
        id: generateId(),
        ...customer
      }).returning();
      return created;
    });
  }
  
  async updateCustomer(id: string, updates: Partial<InsertCustomer>): Promise<Customer | null> {
    return withPerformanceLogging('updateCustomer', async () => {
      const [updated] = await db
        .update(customers)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(customers.id, id))
        .returning();
      return updated || null;
    });
  }
  
  async getCustomerByPhone(phone: string, branchId: string): Promise<Customer | null> {
    return withPerformanceLogging('getCustomerByPhone', async () => {
      const [customer] = await db
        .select()
        .from(customers)
        .where(and(
          eq(customers.phone, phone),
          eq(customers.branchId, branchId)
        ))
        .limit(1);
      return customer || null;
    });
  }
  
  async getCustomerByCard(cardNumber: string, branchId: string): Promise<Customer | null> {
    return withPerformanceLogging('getCustomerByCard', async () => {
      const [customer] = await db
        .select()
        .from(customers)
        .where(and(
          eq(customers.cardNumber, cardNumber),
          eq(customers.branchId, branchId)
        ))
        .limit(1);
      return customer || null;
    });
  }
  
  // Система скидок
  async getDiscountRules(branchId: string): Promise<DiscountRule[]> {
    return withPerformanceLogging('getDiscountRules', async () => {
      return await db
        .select()
        .from(discountRules)
        .where(and(
          eq(discountRules.branchId, branchId),
          eq(discountRules.isActive, true)
        ))
        .orderBy(desc(discountRules.priority));
    });
  }
  
  async createDiscountRule(rule: InsertDiscountRule): Promise<DiscountRule> {
    return withPerformanceLogging('createDiscountRule', async () => {
      const [created] = await db.insert(discountRules).values({
        id: generateId(),
        ...rule
      }).returning();
      return created;
    });
  }
  
  // Способы оплаты
  async getPaymentMethods(branchId: string): Promise<PaymentMethod[]> {
    return withPerformanceLogging('getPaymentMethods', async () => {
      return await db
        .select()
        .from(paymentMethods)
        .where(and(
          eq(paymentMethods.branchId, branchId),
          eq(paymentMethods.isActive, true)
        ));
    });
  }
  
  async createPaymentMethod(method: InsertPaymentMethod): Promise<PaymentMethod> {
    return withPerformanceLogging('createPaymentMethod', async () => {
      const [created] = await db.insert(paymentMethods).values({
        id: generateId(),
        ...method
      }).returning();
      return created;
    });
  }
  
  // Продажи и чеки
  async createSalesTransaction(transaction: InsertSalesTransaction): Promise<SalesTransaction> {
    return withPerformanceLogging('createSalesTransaction', async () => {
      const [created] = await db.insert(salesTransactions).values({
        id: generateId(),
        ...transaction
      }).returning();
      return created;
    });
  }
  
  async addTransactionItems(transactionId: string, items: InsertSalesTransactionItem[]): Promise<SalesTransactionItem[]> {
    return withPerformanceLogging('addTransactionItems', async () => {
      const itemsWithIds = items.map(item => ({
        id: generateId(),
        ...item,
        transactionId
      }));
      
      return await db.insert(salesTransactionItems).values(itemsWithIds).returning();
    });
  }

  async createCompleteSalesTransaction(transaction: InsertSalesTransaction, items: any[], payments: any[], cashierId: string): Promise<any> {
    return withPerformanceLogging('createCompleteSalesTransaction', async () => {
      // Используем транзакцию БД для атомарности
      return await db.transaction(async (tx) => {
        // 1. Создаем основную транзакцию
        const transactionId = generateId();
        const [createdTransaction] = await tx.insert(salesTransactions).values({
          id: transactionId,
          ...transaction
        }).returning();

        let transactionItems: any[] = [];
        let paymentRecords: any[] = [];

        // 2. Добавляем позиции товаров, если есть
        if (items && items.length > 0) {
          const itemsWithIds = items.map(item => ({
            id: generateId(),
            ...item,
            transactionId
          }));
          transactionItems = await tx.insert(salesTransactionItems).values(itemsWithIds).returning();
        }

        // 3. Создаем кассовые операции для платежей, если есть
        if (payments && payments.length > 0) {
          for (const payment of payments) {
            const paymentId = generateId();
            const [paymentOperation] = await tx.insert(cashOperations).values({
              id: paymentId,
              registerId: createdTransaction.registerId,
              shiftId: createdTransaction.shiftId,
              cashierId: cashierId,
              type: 'payment',
              amount: payment.amount,
              notes: `Оплата по чеку ${transactionId}`,
              reason: payment.method || 'sale'
            }).returning();
            paymentRecords.push(paymentOperation);
          }
        }

        // Возвращаем полную информацию
        return {
          transaction: createdTransaction,
          items: transactionItems,
          payments: paymentRecords
        };
      });
    });
  }
  
  async getSalesTransactions(branchId: string, shiftId?: string, dateFrom?: string, dateTo?: string): Promise<any[]> {
    return withPerformanceLogging('getSalesTransactions', async () => {
      let whereConditions = [eq(cashRegisters.branchId, branchId)];
      
      if (shiftId) {
        whereConditions.push(eq(salesTransactions.shiftId, shiftId));
      }
      
      if (dateFrom) {
        whereConditions.push(gte(salesTransactions.createdAt, new Date(dateFrom)));
      }
      
      if (dateTo) {
        whereConditions.push(lte(salesTransactions.createdAt, new Date(dateTo)));
      }
      
      return await db
        .select({
          transaction: salesTransactions,
          register: cashRegisters,
          cashier: users,
          customer: customers
        })
        .from(salesTransactions)
        .leftJoin(cashRegisters, eq(salesTransactions.registerId, cashRegisters.id))
        .leftJoin(users, eq(salesTransactions.cashierId, users.id))
        .leftJoin(customers, eq(salesTransactions.customerId, customers.id))
        .where(and(...whereConditions))
        .orderBy(desc(salesTransactions.createdAt));
    });
  }
  
  async getTransactionDetails(transactionId: string): Promise<any> {
    return withPerformanceLogging('getTransactionDetails', async () => {
      const [transaction] = await db
        .select({
          transaction: salesTransactions,
          register: cashRegisters,
          shift: cashShifts,
          cashier: users,
          customer: customers,
          paymentMethod: paymentMethods
        })
        .from(salesTransactions)
        .leftJoin(cashRegisters, eq(salesTransactions.registerId, cashRegisters.id))
        .leftJoin(cashShifts, eq(salesTransactions.shiftId, cashShifts.id))
        .leftJoin(users, eq(salesTransactions.cashierId, users.id))
        .leftJoin(customers, eq(salesTransactions.customerId, customers.id))
        .leftJoin(paymentMethods, eq(salesTransactions.paymentMethodId, paymentMethods.id))
        .where(eq(salesTransactions.id, transactionId))
        .limit(1);
      
      if (!transaction) return null;
      
      const items = await db
        .select()
        .from(salesTransactionItems)
        .where(eq(salesTransactionItems.transactionId, transactionId));
      
      return {
        ...transaction,
        items
      };
    });
  }
  
  // Операции с наличными
  async createCashOperation(operation: InsertCashOperation): Promise<CashOperation> {
    return withPerformanceLogging('createCashOperation', async () => {
      const [created] = await db.insert(cashOperations).values({
        id: generateId(),
        ...operation
      }).returning();
      return created;
    });
  }
  
  async getCashOperations(shiftId: string): Promise<CashOperation[]> {
    return withPerformanceLogging('getCashOperations', async () => {
      return await db
        .select()
        .from(cashOperations)
        .where(eq(cashOperations.shiftId, shiftId))
        .orderBy(desc(cashOperations.createdAt));
    });
  }
  
  // Отчеты
  async getShiftReport(shiftId: string): Promise<any> {
    return withPerformanceLogging('getShiftReport', async () => {
      const [shift] = await db
        .select()
        .from(cashShifts)
        .where(eq(cashShifts.id, shiftId))
        .limit(1);
      
      if (!shift) return null;
      
      const transactions = await db
        .select()
        .from(salesTransactions)
        .where(eq(salesTransactions.shiftId, shiftId));
      
      const operations = await this.getCashOperations(shiftId);
      
      const totalSales = transactions
        .filter(t => t.type === 'sale')
        .reduce((sum, t) => sum + parseFloat(t.totalAmount), 0);
      
      const totalReturns = transactions
        .filter(t => t.type === 'return')
        .reduce((sum, t) => sum + parseFloat(t.totalAmount), 0);
      
      const cashDeposits = operations
        .filter(op => op.type === 'deposit')
        .reduce((sum, op) => sum + parseFloat(op.amount), 0);
      
      const cashWithdrawals = operations
        .filter(op => op.type === 'withdrawal')
        .reduce((sum, op) => sum + parseFloat(op.amount), 0);
      
      return {
        shift,
        transactions,
        operations,
        summary: {
          totalSales,
          totalReturns,
          receiptsCount: transactions.filter(t => t.type === 'sale').length,
          returnsCount: transactions.filter(t => t.type === 'return').length,
          cashDeposits,
          cashWithdrawals,
          expectedCash: parseFloat(shift.openingCashAmount || '0') + totalSales - totalReturns + cashDeposits - cashWithdrawals
        }
      };
    });
  }

  async requestLocalPrint(invoiceId: string, printerType: string, operatorName: string): Promise<string> {
    return withPerformanceLogging('requestLocalPrint', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        // Проверяем, есть ли уже фискальный чек для этого счета
        const [existingReceipt] = await dbInstance
          .select({ id: fiscalReceipts.id })
          .from(fiscalReceipts)
          .where(eq(fiscalReceipts.invoiceId, invoiceId));

        if (existingReceipt) {
          // Обновляем существующий чек для локальной печати
          await dbInstance
            .update(fiscalReceipts)
            .set({
              localPrintRequested: true,
              localPrintStatus: 'pending',
              localPrinterType: printerType,
              operatorName: operatorName,
              updatedAt: new Date(),
            })
            .where(eq(fiscalReceipts.id, existingReceipt.id));
        
          return existingReceipt.id;
        } else {
          // Получаем данные счета для создания фискального чека
          const invoice = await this.getInvoice(invoiceId);
          if (!invoice) {
            throw new Error('Invoice not found');
          }

          const invoiceItems = await this.getInvoiceItems(invoiceId);
        
          // Формируем позиции чека согласно 54-ФЗ
          const receiptItems = invoiceItems.map(item => ({
            name: item.itemName,
            quantity: parseFloat(item.quantity.toString()),
            price: parseFloat(item.price),
            amount: parseFloat(item.total),
            vatRate: item.vatRate || 'not_applicable',
            paymentMethod: 'full_payment',
            paymentObject: 'service'
          }));

          // Создаем новый фискальный чек
          const [created] = await dbInstance
            .insert(fiscalReceipts)
            .values({
              invoiceId: invoiceId,
              receiptNumber: null,
              status: 'draft',
              receiptType: 'sale',
              paymentMethod: 'cash', // По умолчанию наличные, может быть изменено
              customerEmail: null,
              customerPhone: null,
              taxationSystem: 'simplified_income', // УСН доходы по умолчанию
              operatorName: operatorName,
              operatorInn: null,
              totalAmount: invoice.total,
              vatAmount: '0', // Рассчитывается при необходимости
              cashAmount: invoice.total,
              cardAmount: '0',
              items: receiptItems,
              markingStatus: 'not_required',
              fiscalData: null,
              integrationAccountId: null,
              externalReceiptId: null,
              localPrintRequested: true,
              localPrintStatus: 'pending',
              localPrinterType: printerType,
              localPrintedAt: null,
              localPrintData: null,
              localPrintError: null,
              errorMessage: null,
              sentAt: null,
              registeredAt: null,
              createdAt: new Date(),
              updatedAt: new Date(),
            })
            .returning({ id: fiscalReceipts.id });

          return created.id;
        }
      });
    });
  }
  
  // Additional methods for YooKassa integration
  async getPaymentIntentsByInvoice(invoiceId: string): Promise<{
    id: string;
    status: string;
    paymentData: any;
  }[]> {
    return withPerformanceLogging('getPaymentIntentsByInvoice', async () => {
      const results = await db
        .select({
          id: paymentIntents.id,
          status: paymentIntents.status,
          paymentData: paymentIntents.paymentData
        })
        .from(paymentIntents)
        .where(eq(paymentIntents.invoiceId, invoiceId))
        .orderBy(desc(paymentIntents.createdAt));
      
      return results.map(r => ({
        ...r,
        status: r.status || 'pending',
        paymentData: r.paymentData || {}
      }));
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
      
      if (!item) return undefined;
      
      return {
        ...item,
        vatRate: item.vatRate || 'not_applicable',
        markingStatus: item.markingStatus || 'not_required'
      };
    });
  }

  // System Settings methods implementation
  async getSystemSettings(): Promise<SystemSetting[]> {
    return withPerformanceLogging('getSystemSettings', async () => {
      return await db.select().from(systemSettings);
    });
  }

  async getSystemSetting(key: string): Promise<SystemSetting | undefined> {
    return withPerformanceLogging('getSystemSetting', async () => {
      const [setting] = await db.select().from(systemSettings).where(eq(systemSettings.key, key));
      return setting || undefined;
    });
  }

  async getSystemSettingsByCategory(category: string): Promise<SystemSetting[]> {
    return withPerformanceLogging('getSystemSettingsByCategory', async () => {
      return await db.select().from(systemSettings).where(eq(systemSettings.category, category));
    });
  }

  async createSystemSetting(setting: InsertSystemSetting): Promise<SystemSetting> {
    return withPerformanceLogging('createSystemSetting', async () => {
      const [newSetting] = await db.insert(systemSettings).values(setting).returning();
      return newSetting;
    });
  }

  async updateSystemSetting(key: string, setting: Partial<UpdateSystemSetting>): Promise<SystemSetting> {
    return withPerformanceLogging('updateSystemSetting', async () => {
      const [updatedSetting] = await db
        .update(systemSettings)
        .set({
          ...setting,
          updatedAt: new Date(),
        })
        .where(eq(systemSettings.key, key))
        .returning();
      
      if (!updatedSetting) {
        throw new Error(`System setting with key "${key}" not found`);
      }
      
      return updatedSetting;
    });
  }

  async deleteSystemSetting(key: string): Promise<void> {
    return withPerformanceLogging('deleteSystemSetting', async () => {
      await db.delete(systemSettings).where(eq(systemSettings.key, key));
    });
  }

  async createOrUpdateSystemSetting(key: string, value: string): Promise<SystemSetting> {
    return withPerformanceLogging('createOrUpdateSystemSetting', async () => {
      try {
        // Пытаемся найти существующую настройку
        const existing = await this.getSystemSetting(key);
        if (existing) {
          // Обновляем существующую
          return await this.updateSystemSetting(key, { value });
        }
      } catch (error) {
        // Настройка не найдена, создаем новую
      }
      
      // Создаем новую настройку
      return await this.createSystemSetting({
        key,
        value,
        description: `Автоматически созданная настройка для ${key}`,
        category: 'integration'
      });
    });
  }

  // Integration logs methods implementation
  async getIntegrationLog(system: string, operation: string): Promise<any | undefined> {
    return withPerformanceLogging('getIntegrationLog', async () => {
      const [log] = await db.select().from(integrationLogs)
        .where(and(
          eq(integrationLogs.event, `${system}_${operation}`),
          eq(integrationLogs.level, 'info')
        ))
        .orderBy(desc(integrationLogs.createdAt))
        .limit(1);
      return log || undefined;
    });
  }

  async createIntegrationLog(log: { system: string; operation: string; status: string; details?: any }): Promise<any> {
    return withPerformanceLogging('createIntegrationLog', async () => {
      const logData = {
        event: `${log.system}_${log.operation}`,
        message: `${log.system} ${log.operation}: ${log.status}`,
        level: log.status === 'success' ? 'info' as const : 'error' as const,
        metadata: log.details ? log.details : null,
      };
      
      const [newLog] = await db
        .insert(integrationLogs)
        .values(logData)
        .returning();
      return newLog;
    });
  }

  // === BILLING AND SUBSCRIPTION METHODS ===

  async getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
    return withPerformanceLogging('getSubscriptionPlans', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        return await dbInstance.select().from(subscriptionPlans).orderBy(subscriptionPlans.price);
      });
    });
  }

  async getSubscriptionPlan(id: string): Promise<SubscriptionPlan | null> {
    return withPerformanceLogging('getSubscriptionPlan', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        const [plan] = await dbInstance.select().from(subscriptionPlans).where(eq(subscriptionPlans.id, id)).limit(1);
        return plan || null;
      });
    });
  }

  async getActiveSubscriptionPlans(): Promise<SubscriptionPlan[]> {
    return withPerformanceLogging('getActiveSubscriptionPlans', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        return await dbInstance.select()
          .from(subscriptionPlans)
          .where(eq(subscriptionPlans.isActive, true))
          .orderBy(subscriptionPlans.price);
      });
    });
  }

  async createSubscriptionPlan(plan: InsertSubscriptionPlan): Promise<SubscriptionPlan> {
    return withPerformanceLogging('createSubscriptionPlan', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        const [newPlan] = await dbInstance.insert(subscriptionPlans).values(plan).returning();
        return newPlan;
      });
    });
  }

  async updateSubscriptionPlan(id: string, updates: Partial<InsertSubscriptionPlan>): Promise<SubscriptionPlan> {
    return withPerformanceLogging('updateSubscriptionPlan', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        const [updated] = await dbInstance.update(subscriptionPlans)
          .set({ ...updates, updatedAt: new Date() })
          .where(eq(subscriptionPlans.id, id))
          .returning();
        return updated;
      });
    });
  }

  async deleteSubscriptionPlan(id: string): Promise<void> {
    return withPerformanceLogging('deleteSubscriptionPlan', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        await dbInstance.delete(subscriptionPlans).where(eq(subscriptionPlans.id, id));
      });
    });
  }

  async getClinicSubscription(branchId: string): Promise<ClinicSubscription | null> {
    return withPerformanceLogging('getClinicSubscription', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        const [subscription] = await dbInstance.select()
          .from(clinicSubscriptions)
          .where(eq(clinicSubscriptions.branchId, branchId))
          .orderBy(desc(clinicSubscriptions.createdAt))
          .limit(1);
        return subscription || null;
      });
    });
  }

  async getClinicSubscriptions(): Promise<ClinicSubscription[]> {
    return withPerformanceLogging('getClinicSubscriptions', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        return await dbInstance.select().from(clinicSubscriptions).orderBy(desc(clinicSubscriptions.createdAt));
      });
    });
  }

  async createClinicSubscription(subscription: InsertClinicSubscription): Promise<ClinicSubscription> {
    return withPerformanceLogging('createClinicSubscription', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        const [newSubscription] = await dbInstance.insert(clinicSubscriptions).values(subscription).returning();
        return newSubscription;
      });
    });
  }

  async updateClinicSubscription(id: string, updates: Partial<InsertClinicSubscription>): Promise<ClinicSubscription> {
    return withPerformanceLogging('updateClinicSubscription', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        const [updated] = await dbInstance.update(clinicSubscriptions)
          .set({ ...updates, updatedAt: new Date() })
          .where(eq(clinicSubscriptions.id, id))
          .returning();
        return updated;
      });
    });
  }

  async checkSubscriptionStatus(branchId: string): Promise<{ active: boolean; daysLeft: number; subscription: ClinicSubscription | null }> {
    return withPerformanceLogging('checkSubscriptionStatus', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        const subscription = await this.getClinicSubscription(branchId);
      
        if (!subscription) {
          return { active: false, daysLeft: 0, subscription: null };
        }

        const now = new Date();
        const endDate = new Date(subscription.endDate);
        const daysLeft = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        const active = subscription.status === 'active' && daysLeft > 0;

        return { active, daysLeft, subscription };
      });
    });
  }

  async getSubscriptionPayments(subscriptionId: string): Promise<SubscriptionPayment[]> {
    return withPerformanceLogging('getSubscriptionPayments', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        return await dbInstance.select()
          .from(subscriptionPayments)
          .where(eq(subscriptionPayments.subscriptionId, subscriptionId))
          .orderBy(desc(subscriptionPayments.createdAt));
      });
    });
  }

  async getAllSubscriptionPayments(): Promise<SubscriptionPayment[]> {
    return withPerformanceLogging('getAllSubscriptionPayments', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        return await dbInstance.select()
          .from(subscriptionPayments)
          .orderBy(desc(subscriptionPayments.createdAt));
      });
    });
  }

  async createSubscriptionPayment(payment: InsertSubscriptionPayment): Promise<SubscriptionPayment> {
    return withPerformanceLogging('createSubscriptionPayment', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        const [newPayment] = await dbInstance.insert(subscriptionPayments).values(payment).returning();
        return newPayment;
      });
    });
  }

  async updateSubscriptionPayment(id: string, updates: Partial<InsertSubscriptionPayment>): Promise<SubscriptionPayment> {
    return withPerformanceLogging('updateSubscriptionPayment', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        const [updated] = await dbInstance.update(subscriptionPayments)
          .set({ ...updates, updatedAt: new Date() })
          .where(eq(subscriptionPayments.id, id))
          .returning();
        return updated;
      });
    });
  }

  async getBillingNotifications(subscriptionId: string): Promise<BillingNotification[]> {
    return withPerformanceLogging('getBillingNotifications', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        return await dbInstance.select()
          .from(billingNotifications)
          .where(eq(billingNotifications.subscriptionId, subscriptionId))
          .orderBy(desc(billingNotifications.createdAt));
      });
    });
  }

  async getPendingBillingNotifications(): Promise<BillingNotification[]> {
    return withPerformanceLogging('getPendingBillingNotifications', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        const now = new Date();
        return await dbInstance.select()
          .from(billingNotifications)
          .where(
            and(
              eq(billingNotifications.isSent, false),
              lte(billingNotifications.scheduledFor, now)
            )
          )
          .orderBy(billingNotifications.scheduledFor);
      });
    });
  }

  async createBillingNotification(notification: InsertBillingNotification): Promise<BillingNotification> {
    return withPerformanceLogging('createBillingNotification', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        const [newNotification] = await dbInstance.insert(billingNotifications).values(notification).returning();
        return newNotification;
      });
    });
  }

  async markNotificationAsSent(id: string): Promise<void> {
    return withPerformanceLogging('markNotificationAsSent', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        await dbInstance.update(billingNotifications)
          .set({ isSent: true, sentAt: new Date() })
          .where(eq(billingNotifications.id, id));
      });
    });
  }

  // ========================================
  // INTEGRATION CREDENTIALS METHODS
  // ========================================

  async getIntegrationCredentials(tenantId: string, integrationType: string): Promise<IntegrationCredentials | undefined> {
    return withPerformanceLogging('getIntegrationCredentials', async () => {
      return withTenantContext(tenantId, async (dbInstance) => {
        const [credentials] = await dbInstance.select()
          .from(integrationCredentials)
          .where(
            and(
              eq(integrationCredentials.tenantId, tenantId),
              eq(integrationCredentials.integrationType, integrationType)
            )
          );
        return credentials || undefined;
      });
    });
  }

  async getAllIntegrationCredentials(tenantId: string): Promise<IntegrationCredentials[]> {
    return withPerformanceLogging('getAllIntegrationCredentials', async () => {
      return withTenantContext(tenantId, async (dbInstance) => {
        return await dbInstance.select()
          .from(integrationCredentials)
          .where(eq(integrationCredentials.tenantId, tenantId))
          .orderBy(integrationCredentials.integrationType);
      });
    });
  }

  async upsertIntegrationCredentials(credentials: InsertIntegrationCredentials): Promise<IntegrationCredentials> {
    return withPerformanceLogging('upsertIntegrationCredentials', async () => {
      return withTenantContext(credentials.tenantId, async (dbInstance) => {
        // Check if credentials exist
        const existing = await this.getIntegrationCredentials(
          credentials.tenantId, 
          credentials.integrationType
        );

        if (existing) {
          // Update existing
          const [updated] = await dbInstance.update(integrationCredentials)
            .set({
              ...credentials,
              updatedAt: new Date()
            })
            .where(
              and(
                eq(integrationCredentials.tenantId, credentials.tenantId),
                eq(integrationCredentials.integrationType, credentials.integrationType)
              )
            )
            .returning();
          return updated;
        } else {
          // Insert new
          const [newCredentials] = await dbInstance.insert(integrationCredentials)
            .values(credentials)
            .returning();
          return newCredentials;
        }
      });
    });
  }

  async deleteIntegrationCredentials(tenantId: string, integrationType: string): Promise<void> {
    return withPerformanceLogging('deleteIntegrationCredentials', async () => {
      return withTenantContext(tenantId, async (dbInstance) => {
        await dbInstance.delete(integrationCredentials)
          .where(
            and(
              eq(integrationCredentials.tenantId, tenantId),
              eq(integrationCredentials.integrationType, integrationType)
            )
          );
      });
    });
  }

  async updateIntegrationSyncStatus(
    tenantId: string, 
    integrationType: string, 
    status: string, 
    error?: string
  ): Promise<void> {
    return withPerformanceLogging('updateIntegrationSyncStatus', async () => {
      return withTenantContext(tenantId, async (dbInstance) => {
        await dbInstance.update(integrationCredentials)
          .set({
            lastSyncAt: new Date(),
            lastSyncStatus: status,
            lastSyncError: error || null,
            updatedAt: new Date()
          })
          .where(
            and(
              eq(integrationCredentials.tenantId, tenantId),
              eq(integrationCredentials.integrationType, integrationType)
            )
          );
      });
    });
  }

  // ========================================
  // CLINICAL CASES MODULE METHODS
  // ========================================

  async getClinicalCases(filters?: { search?: string; startDate?: Date; endDate?: Date; limit?: number; offset?: number }, branchId?: string): Promise<any[]> {
    return withPerformanceLogging('getClinicalCases', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        // Build SQL conditions
        let branchCondition = branchId ? sql`AND cc.branch_id = ${branchId}` : sql``;
        let searchCondition = filters?.search 
          ? sql`AND (p.name ILIKE ${`%${filters.search}%`} OR COALESCE(poa.primary_owner_name, legacy_owner.name) ILIKE ${`%${filters.search}%`})`
          : sql``;
        let startDateCondition = filters?.startDate 
          ? sql`AND cc.start_date >= ${filters.startDate}`
          : sql``;
        let endDateCondition = filters?.endDate 
          ? sql`AND cc.start_date <= ${filters.endDate}`
          : sql``;
        let limitClause = filters?.limit ? sql`LIMIT ${filters.limit}` : sql``;
        let offsetClause = filters?.offset ? sql`OFFSET ${filters.offset}` : sql``;

        // Use raw SQL with CTE for multi-owner support
        const result = await dbInstance.execute(sql`
          WITH patient_owners_agg AS (
            SELECT 
              po.patient_id,
              COALESCE(
                MAX(CASE WHEN po.is_primary THEN o.name END),
                MIN(o.name)
              ) as primary_owner_name,
              COALESCE(
                MAX(CASE WHEN po.is_primary THEN o.phone END),
                MIN(o.phone)
              ) as primary_owner_phone
            FROM patient_owners po
            JOIN owners o ON po.owner_id = o.id
            GROUP BY po.patient_id
          )
          SELECT 
            cc.*,
            p.id as patient_id,
            p.name as patient_name,
            p.species,
            p.breed,
            COALESCE(poa.primary_owner_name, legacy_owner.name) as owner_name,
            COALESCE(poa.primary_owner_phone, legacy_owner.phone) as owner_phone
          FROM clinical_cases cc
          LEFT JOIN patients p ON cc.patient_id = p.id
          LEFT JOIN patient_owners_agg poa ON p.id = poa.patient_id
          LEFT JOIN owners legacy_owner ON p.owner_id = legacy_owner.id
          WHERE 1=1 
            ${branchCondition}
            ${searchCondition}
            ${startDateCondition}
            ${endDateCondition}
          ORDER BY cc.start_date DESC
          ${limitClause}
          ${offsetClause}
        `);

        // Transform snake_case to camelCase for consistency
        return result.rows.map((row: any) => ({
          clinicalCase: {
            id: row.id,
            patientId: row.patient_id,
            reasonForVisit: row.reason_for_visit,
            status: row.status,
            startDate: row.start_date,
            closeDate: row.close_date,
            createdByUserId: row.created_by_user_id,
            tenantId: row.tenant_id,
            branchId: row.branch_id,
            createdAt: row.created_at,
            updatedAt: row.updated_at
          },
          patient: {
            id: row.patient_id,
            name: row.patient_name,
            species: row.species,
            breed: row.breed
          },
          owner: {
            name: row.owner_name,
            phone: row.owner_phone
          }
        }));
      });
    });
  }

  async getClinicalCase(id: string): Promise<any | undefined> {
    return withPerformanceLogging('getClinicalCase', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        // Use raw SQL with CTE for multi-owner support
        const result = await dbInstance.execute(sql`
          WITH patient_owners_agg AS (
            SELECT 
              po.patient_id,
              COALESCE(
                MAX(CASE WHEN po.is_primary THEN o.name END),
                MIN(o.name)
              ) as primary_owner_name,
              COALESCE(
                MAX(CASE WHEN po.is_primary THEN o.phone END),
                MIN(o.phone)
              ) as primary_owner_phone
            FROM patient_owners po
            JOIN owners o ON po.owner_id = o.id
            GROUP BY po.patient_id
          )
          SELECT 
            cc.*,
            p.id as patient_id,
            p.name as patient_name,
            p.species,
            p.breed,
            COALESCE(poa.primary_owner_name, legacy_owner.name) as owner_name,
            COALESCE(poa.primary_owner_phone, legacy_owner.phone) as owner_phone,
            u.id as created_by_id,
            u.username as created_by_username,
            u.full_name as created_by_full_name
          FROM clinical_cases cc
          LEFT JOIN patients p ON cc.patient_id = p.id
          LEFT JOIN patient_owners_agg poa ON p.id = poa.patient_id
          LEFT JOIN owners legacy_owner ON p.owner_id = legacy_owner.id
          LEFT JOIN users u ON cc.created_by_user_id = u.id
          WHERE cc.id = ${id}
        `);
        
        if (!result.rows[0]) return undefined;

        const row = result.rows[0];
        return {
          clinicalCase: {
            id: row.id,
            patientId: row.patient_id,
            reasonForVisit: row.reason_for_visit,
            status: row.status,
            startDate: row.start_date,
            closeDate: row.close_date,
            createdByUserId: row.created_by_user_id,
            tenantId: row.tenant_id,
            branchId: row.branch_id,
            createdAt: row.created_at,
            updatedAt: row.updated_at
          },
          patient: {
            id: row.patient_id,
            name: row.patient_name,
            species: row.species,
            breed: row.breed
          },
          owner: {
            name: row.owner_name,
            phone: row.owner_phone
          },
          createdBy: row.created_by_id ? {
            id: row.created_by_id,
            username: row.created_by_username,
            fullName: row.created_by_full_name
          } : null
        };
      });
    });
  }

  async getClinicalCasesByPatient(patientId: string, branchId: string): Promise<any[]> {
    return withPerformanceLogging('getClinicalCasesByPatient', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        return await dbInstance
          .select()
          .from(clinicalCases)
          .where(
            and(
              eq(clinicalCases.patientId, patientId),
              eq(clinicalCases.branchId, branchId)
            )
          )
          .orderBy(desc(clinicalCases.startDate));
      });
    });
  }

  async createClinicalCase(clinicalCase: InsertClinicalCase): Promise<ClinicalCase> {
    return withPerformanceLogging('createClinicalCase', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        const [newCase] = await dbInstance.insert(clinicalCases)
          .values(clinicalCase)
          .returning();
        return newCase;
      });
    });
  }

  async updateClinicalCase(id: string, updates: Partial<InsertClinicalCase>): Promise<ClinicalCase> {
    return withPerformanceLogging('updateClinicalCase', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        const [updatedCase] = await dbInstance.update(clinicalCases)
          .set({ ...updates, updatedAt: new Date() })
          .where(eq(clinicalCases.id, id))
          .returning();
        return updatedCase;
      });
    });
  }

  async closeClinicalCase(id: string): Promise<ClinicalCase> {
    return withPerformanceLogging('closeClinicalCase', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        const [closedCase] = await dbInstance.update(clinicalCases)
          .set({ 
            status: 'closed',
            closeDate: new Date(),
            updatedAt: new Date() 
          })
          .where(eq(clinicalCases.id, id))
          .returning();
        return closedCase;
      });
    });
  }

  async getClinicalEncounters(caseId: string): Promise<any[]> {
    return withPerformanceLogging('getClinicalEncounters', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        return await dbInstance
          .select({
            encounter: clinicalEncounters,
            doctor: doctors
          })
          .from(clinicalEncounters)
          .leftJoin(doctors, eq(clinicalEncounters.doctorId, doctors.id))
          .where(eq(clinicalEncounters.clinicalCaseId, caseId))
          .orderBy(desc(clinicalEncounters.encounterDate));
      });
    });
  }

  async getClinicalEncounter(id: string): Promise<any | undefined> {
    return withPerformanceLogging('getClinicalEncounter', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        const results = await dbInstance
          .select({
            encounter: clinicalEncounters,
            doctor: doctors
          })
          .from(clinicalEncounters)
          .leftJoin(doctors, eq(clinicalEncounters.doctorId, doctors.id))
          .where(eq(clinicalEncounters.id, id));
        
        return results[0];
      });
    });
  }

  async createClinicalEncounter(encounter: InsertClinicalEncounter): Promise<ClinicalEncounter> {
    return withPerformanceLogging('createClinicalEncounter', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        const [newEncounter] = await dbInstance.insert(clinicalEncounters)
          .values(encounter)
          .returning();
        return newEncounter;
      });
    });
  }

  async updateClinicalEncounter(id: string, updates: Partial<InsertClinicalEncounter>): Promise<ClinicalEncounter> {
    return withPerformanceLogging('updateClinicalEncounter', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        const [updatedEncounter] = await dbInstance.update(clinicalEncounters)
          .set({ ...updates, updatedAt: new Date() })
          .where(eq(clinicalEncounters.id, id))
          .returning();
        return updatedEncounter;
      });
    });
  }

  async deleteClinicalEncounter(id: string): Promise<void> {
    return withPerformanceLogging('deleteClinicalEncounter', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        await dbInstance.delete(clinicalEncounters)
          .where(eq(clinicalEncounters.id, id));
      });
    });
  }

  async getLabAnalyses(encounterId: string): Promise<any[]> {
    return withPerformanceLogging('getLabAnalyses', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        return await dbInstance
          .select()
          .from(labAnalyses)
          .where(eq(labAnalyses.encounterId, encounterId))
          .orderBy(desc(labAnalyses.orderDate));
      });
    });
  }

  async getLabAnalysis(id: string): Promise<any | undefined> {
    return withPerformanceLogging('getLabAnalysis', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        const [analysis] = await dbInstance
          .select()
          .from(labAnalyses)
          .where(eq(labAnalyses.id, id));
        return analysis;
      });
    });
  }

  async createLabAnalysis(analysis: InsertLabAnalysis): Promise<LabAnalysis> {
    return withPerformanceLogging('createLabAnalysis', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        const [newAnalysis] = await dbInstance.insert(labAnalyses)
          .values(analysis)
          .returning();
        return newAnalysis;
      });
    });
  }

  async updateLabAnalysis(id: string, updates: Partial<InsertLabAnalysis>): Promise<LabAnalysis> {
    return withPerformanceLogging('updateLabAnalysis', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        const [updatedAnalysis] = await dbInstance.update(labAnalyses)
          .set({ ...updates, updatedAt: new Date() })
          .where(eq(labAnalyses.id, id))
          .returning();
        return updatedAnalysis;
      });
    });
  }

  async deleteLabAnalysis(id: string): Promise<void> {
    return withPerformanceLogging('deleteLabAnalysis', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        await dbInstance.delete(labAnalyses)
          .where(eq(labAnalyses.id, id));
      });
    });
  }

  async getAttachments(entityId: string, entityType: string): Promise<Attachment[]> {
    return withPerformanceLogging('getAttachments', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        return await dbInstance
          .select()
          .from(attachments)
          .where(
            and(
              eq(attachments.entityId, entityId),
              eq(attachments.entityType, entityType)
            )
          )
          .orderBy(desc(attachments.createdAt));
      });
    });
  }

  async getAttachment(id: string): Promise<Attachment | undefined> {
    return withPerformanceLogging('getAttachment', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        const [attachment] = await dbInstance
          .select()
          .from(attachments)
          .where(eq(attachments.id, id));
        return attachment;
      });
    });
  }

  async createAttachment(attachment: InsertAttachment): Promise<Attachment> {
    return withPerformanceLogging('createAttachment', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        const [newAttachment] = await dbInstance.insert(attachments)
          .values(attachment)
          .returning();
        return newAttachment;
      });
    });
  }

  async deleteAttachment(id: string): Promise<void> {
    return withPerformanceLogging('deleteAttachment', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        await dbInstance.delete(attachments)
          .where(eq(attachments.id, id));
      });
    });
  }

  async getPatientFullHistory(patientId: string, branchId: string): Promise<any> {
    return withPerformanceLogging('getPatientFullHistory', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        // Get patient info
        const [patient] = await dbInstance
          .select({
            patient: patients,
            owner: owners
          })
          .from(patients)
          .leftJoin(owners, eq(patients.ownerId, owners.id))
          .where(eq(patients.id, patientId));

        // Get all clinical cases for this patient
        const cases = await dbInstance
          .select()
          .from(clinicalCases)
          .where(
            and(
              eq(clinicalCases.patientId, patientId),
              eq(clinicalCases.branchId, branchId)
            )
          )
          .orderBy(desc(clinicalCases.startDate));

        // For each case, get encounters and analyses
        const casesWithDetails = await Promise.all(
          cases.map(async (clinicalCase) => {
            const encounters = await dbInstance
              .select({
                encounter: clinicalEncounters,
                doctor: doctors
              })
              .from(clinicalEncounters)
              .leftJoin(doctors, eq(clinicalEncounters.doctorId, doctors.id))
              .where(eq(clinicalEncounters.clinicalCaseId, clinicalCase.id))
              .orderBy(desc(clinicalEncounters.encounterDate));

            // For each encounter, get lab analyses and attachments
            const encountersWithDetails = await Promise.all(
              encounters.map(async (enc) => {
                const analyses = await dbInstance
                  .select()
                  .from(labAnalyses)
                  .where(eq(labAnalyses.encounterId, enc.encounter.id));

                const analysesWithAttachments = await Promise.all(
                  analyses.map(async (analysis) => {
                    const analysisAttachments = await dbInstance
                      .select()
                      .from(attachments)
                      .where(
                        and(
                          eq(attachments.entityId, analysis.id),
                          eq(attachments.entityType, 'lab_analysis')
                        )
                      );
                    return { ...analysis, attachments: analysisAttachments };
                  })
                );

                return {
                  ...enc,
                  labAnalyses: analysesWithAttachments
                };
              })
            );

            return {
              ...clinicalCase,
              encounters: encountersWithDetails
            };
          })
        );

        return {
          patient,
          cases: casesWithDetails
        };
      });
    });
  }

  // ========================================
  // Document Templates Methods
  // ========================================
  
  async getDocumentTemplate(templateType: string, tenantId: string | null): Promise<DocumentTemplate | undefined> {
    return withPerformanceLogging('getDocumentTemplate', async () => {
      // Strategy: Try tenant-specific template first, fall back to system template (NULL tenant_id)
      const dbInstance = requestDbStorage.getStore() || db;
      
      // First, try to get tenant-specific template
      if (tenantId) {
        const [tenantTemplate] = await dbInstance
          .select()
          .from(documentTemplates)
          .where(
            and(
              eq(documentTemplates.type, templateType),
              eq(documentTemplates.tenantId, tenantId),
              eq(documentTemplates.isActive, true)
            )
          )
          .limit(1);
        
        if (tenantTemplate) {
          return tenantTemplate;
        }
      }
      
      // Fall back to system template (NULL tenant_id)
      const [systemTemplate] = await dbInstance
        .select()
        .from(documentTemplates)
        .where(
          and(
            eq(documentTemplates.type, templateType),
            isNull(documentTemplates.tenantId),
            eq(documentTemplates.isActive, true)
          )
        )
        .limit(1);
      
      return systemTemplate;
    });
  }

  async getDocumentTemplates(tenantId: string | null): Promise<DocumentTemplate[]> {
    return withPerformanceLogging('getDocumentTemplates', async () => {
      const dbInstance = requestDbStorage.getStore() || db;
      
      if (tenantId) {
        // Get both tenant-specific and system templates
        return await dbInstance
          .select()
          .from(documentTemplates)
          .where(
            and(
              or(
                eq(documentTemplates.tenantId, tenantId),
                isNull(documentTemplates.tenantId)
              ),
              eq(documentTemplates.isActive, true)
            )
          )
          .orderBy(documentTemplates.type, documentTemplates.tenantId);
      } else {
        // Get only system templates (for superadmin)
        return await dbInstance
          .select()
          .from(documentTemplates)
          .where(
            and(
              isNull(documentTemplates.tenantId),
              eq(documentTemplates.isActive, true)
            )
          )
          .orderBy(documentTemplates.type);
      }
    });
  }

  async createDocumentTemplate(template: InsertDocumentTemplate): Promise<DocumentTemplate> {
    return withPerformanceLogging('createDocumentTemplate', async () => {
      const dbInstance = requestDbStorage.getStore() || db;
      
      const [newTemplate] = await dbInstance
        .insert(documentTemplates)
        .values(template)
        .returning();
      
      return newTemplate;
    });
  }

  async updateDocumentTemplate(id: string, template: Partial<InsertDocumentTemplate>): Promise<DocumentTemplate> {
    return withPerformanceLogging('updateDocumentTemplate', async () => {
      const dbInstance = requestDbStorage.getStore() || db;
      
      const [updatedTemplate] = await dbInstance
        .update(documentTemplates)
        .set({ ...template, updatedAt: new Date() })
        .where(eq(documentTemplates.id, id))
        .returning();
      
      return updatedTemplate;
    });
  }

  async deleteDocumentTemplate(id: string): Promise<void> {
    return withPerformanceLogging('deleteDocumentTemplate', async () => {
      const dbInstance = requestDbStorage.getStore() || db;
      
      await dbInstance
        .delete(documentTemplates)
        .where(eq(documentTemplates.id, id));
    });
  }

  // ========================================
  // 📱 MOBILE APP API METHODS
  // ========================================

  async getOwnerByPhone(phone: string): Promise<Owner | undefined> {
    return withPerformanceLogging('getOwnerByPhone', async () => {
      const dbInstance = requestDbStorage.getStore() || db;
      
      const [owner] = await dbInstance
        .select()
        .from(owners)
        .where(eq(owners.phone, phone))
        .limit(1);
      
      return owner;
    });
  }

  async createSmsVerificationCode(code: InsertSmsVerificationCode): Promise<SmsVerificationCode> {
    return withPerformanceLogging('createSmsVerificationCode', async () => {
      const dbInstance = requestDbStorage.getStore() || db;
      
      const [newCode] = await dbInstance
        .insert(smsVerificationCodes)
        .values(code)
        .returning();
      
      return newCode;
    });
  }

  async getSmsVerificationCode(userId: string, purpose: string): Promise<SmsVerificationCode | undefined> {
    return withPerformanceLogging('getSmsVerificationCode', async () => {
      const dbInstance = requestDbStorage.getStore() || db;
      
      const [code] = await dbInstance
        .select()
        .from(smsVerificationCodes)
        .where(
          and(
            eq(smsVerificationCodes.userId, userId),
            eq(smsVerificationCodes.purpose, purpose),
            gt(smsVerificationCodes.expiresAt, new Date())
          )
        )
        .orderBy(desc(smsVerificationCodes.createdAt))
        .limit(1);
      
      return code;
    });
  }

  async verifySmsCode(userId: string, code: string, purpose: string): Promise<boolean> {
    return withPerformanceLogging('verifySmsCode', async () => {
      const verificationCode = await this.getSmsVerificationCode(userId, purpose);
      
      if (!verificationCode) {
        return false;
      }

      const bcrypt = await import('bcryptjs');
      const isValid = await bcrypt.compare(code, verificationCode.codeHash);
      
      if (isValid) {
        await this.deleteSmsVerificationCode(verificationCode.id);
      }
      
      return isValid;
    });
  }

  async deleteSmsVerificationCode(id: string): Promise<void> {
    return withPerformanceLogging('deleteSmsVerificationCode', async () => {
      const dbInstance = requestDbStorage.getStore() || db;
      
      await dbInstance
        .delete(smsVerificationCodes)
        .where(eq(smsVerificationCodes.id, id));
    });
  }

  async verifyMobileSmsCode(ownerId: string, code: string): Promise<boolean> {
    return withPerformanceLogging('verifyMobileSmsCode', async () => {
      const dbInstance = requestDbStorage.getStore() || db;
      
      const [verificationCode] = await dbInstance
        .select()
        .from(smsVerificationCodes)
        .where(
          and(
            eq(smsVerificationCodes.ownerId, ownerId),
            eq(smsVerificationCodes.purpose, 'mobile_login'),
            gt(smsVerificationCodes.expiresAt, new Date())
          )
        )
        .orderBy(desc(smsVerificationCodes.createdAt))
        .limit(1);
      
      if (!verificationCode) {
        return false;
      }

      const bcrypt = await import('bcryptjs');
      const isValid = await bcrypt.compare(code, verificationCode.codeHash);
      
      if (isValid) {
        await this.deleteSmsVerificationCode(verificationCode.id);
      }
      
      return isValid;
    });
  }

  async getOwnerWithPets(ownerId: string): Promise<{ owner: Owner; pets: Patient[] }> {
    return withPerformanceLogging('getOwnerWithPets', async () => {
      const dbInstance = requestDbStorage.getStore() || db;
      
      const [owner] = await dbInstance
        .select()
        .from(owners)
        .where(eq(owners.id, ownerId));

      if (!owner) {
        throw new Error('Owner not found');
      }

      const petOwnerRelations = await dbInstance
        .select()
        .from(patientOwners)
        .where(eq(patientOwners.ownerId, ownerId));

      const petIds = petOwnerRelations.map(rel => rel.patientId);
      
      const pets = petIds.length > 0 
        ? await dbInstance
            .select()
            .from(patients)
            .where(inArray(patients.id, petIds))
        : [];

      return { owner, pets };
    });
  }

  async getAvailableSlots(doctorId: string, date: Date, branchId: string): Promise<{ time: string; available: boolean }[]> {
    return withPerformanceLogging('getAvailableSlots', async () => {
      const dbInstance = requestDbStorage.getStore() || db;
      
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      const existingAppointments = await dbInstance
        .select()
        .from(appointments)
        .where(
          and(
            eq(appointments.doctorId, doctorId),
            eq(appointments.branchId, branchId),
            gte(appointments.scheduledAt, startOfDay),
            lte(appointments.scheduledAt, endOfDay)
          )
        );

      const slots: { time: string; available: boolean }[] = [];
      const workStart = 9;
      const workEnd = 18;
      const slotDuration = 30;

      for (let hour = workStart; hour < workEnd; hour++) {
        for (let minute = 0; minute < 60; minute += slotDuration) {
          const slotTime = new Date(date);
          slotTime.setHours(hour, minute, 0, 0);
          
          const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
          
          const isBooked = existingAppointments.some(apt => {
            const aptTime = new Date(apt.scheduledAt);
            return aptTime.getTime() === slotTime.getTime();
          });

          slots.push({
            time: timeStr,
            available: !isBooked
          });
        }
      }

      return slots;
    });
  }

  async getOwnerAppointments(ownerId: string): Promise<Appointment[]> {
    return withPerformanceLogging('getOwnerAppointments', async () => {
      const dbInstance = requestDbStorage.getStore() || db;
      
      const ownerPets = await dbInstance
        .select()
        .from(patientOwners)
        .where(eq(patientOwners.ownerId, ownerId));

      const petIds = ownerPets.map(rel => rel.patientId);
      
      if (petIds.length === 0) {
        return [];
      }

      const ownerAppointments = await dbInstance
        .select()
        .from(appointments)
        .where(inArray(appointments.patientId, petIds))
        .orderBy(desc(appointments.scheduledAt));

      return ownerAppointments;
    });
  }

  async getPetMedicalHistory(patientId: string): Promise<any[]> {
    return withPerformanceLogging('getPetMedicalHistory', async () => {
      const dbInstance = requestDbStorage.getStore() || db;
      
      const records = await dbInstance
        .select({
          id: medicalRecords.id,
          visitDate: medicalRecords.visitDate,
          chiefComplaint: medicalRecords.chiefComplaint,
          diagnosis: medicalRecords.diagnosis,
          doctorId: medicalRecords.doctorId,
        })
        .from(medicalRecords)
        .where(eq(medicalRecords.patientId, patientId))
        .orderBy(desc(medicalRecords.visitDate));

      return records;
    });
  }

  async createPushToken(token: InsertPushToken): Promise<PushToken> {
    return withPerformanceLogging('createPushToken', async () => {
      const dbInstance = requestDbStorage.getStore() || db;
      
      const [newToken] = await dbInstance
        .insert(pushTokens)
        .values(token)
        .onConflictDoUpdate({
          target: pushTokens.token,
          set: {
            isActive: true,
            lastUsedAt: new Date(),
          }
        })
        .returning();
      
      return newToken;
    });
  }

  async updatePushToken(id: string, updates: Partial<InsertPushToken>): Promise<PushToken> {
    return withPerformanceLogging('updatePushToken', async () => {
      const dbInstance = requestDbStorage.getStore() || db;
      
      const [updatedToken] = await dbInstance
        .update(pushTokens)
        .set(updates)
        .where(eq(pushTokens.id, id))
        .returning();
      
      return updatedToken;
    });
  }

  async getPushTokensByUser(userId: string): Promise<PushToken[]> {
    return withPerformanceLogging('getPushTokensByUser', async () => {
      const dbInstance = requestDbStorage.getStore() || db;
      
      return await dbInstance
        .select()
        .from(pushTokens)
        .where(
          and(
            eq(pushTokens.userId, userId),
            eq(pushTokens.isActive, true)
          )
        );
    });
  }

  async getPushTokensByOwner(ownerId: string): Promise<PushToken[]> {
    return withPerformanceLogging('getPushTokensByOwner', async () => {
      const dbInstance = requestDbStorage.getStore() || db;
      
      return await dbInstance
        .select()
        .from(pushTokens)
        .where(
          and(
            eq(pushTokens.ownerId, ownerId),
            eq(pushTokens.isActive, true)
          )
        );
    });
  }

  async deactivatePushToken(token: string): Promise<void> {
    return withPerformanceLogging('deactivatePushToken', async () => {
      const dbInstance = requestDbStorage.getStore() || db;
      
      await dbInstance
        .update(pushTokens)
        .set({ isActive: false })
        .where(eq(pushTokens.token, token));
    });
  }

  async getActivePushTokens(): Promise<PushToken[]> {
    return withPerformanceLogging('getActivePushTokens', async () => {
      const dbInstance = requestDbStorage.getStore() || db;
      
      return await dbInstance
        .select()
        .from(pushTokens)
        .where(eq(pushTokens.isActive, true));
    });
  }

  // ========================================
  // CONVERSATIONS & MESSAGES (CHAT)
  // ========================================

  async getConversations(ownerId: string): Promise<Conversation[]> {
    return withPerformanceLogging('getConversations', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        return await dbInstance
          .select()
          .from(conversations)
          .where(eq(conversations.ownerId, ownerId))
          .orderBy(desc(conversations.updatedAt));
      });
    });
  }

  async getConversation(id: string): Promise<Conversation | undefined> {
    return withPerformanceLogging('getConversation', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        const [conversation] = await dbInstance
          .select()
          .from(conversations)
          .where(eq(conversations.id, id));
        return conversation;
      });
    });
  }

  async createConversation(conversation: InsertConversation): Promise<Conversation> {
    return withPerformanceLogging('createConversation', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        const [newConversation] = await dbInstance
          .insert(conversations)
          .values(conversation)
          .returning();
        return newConversation;
      });
    });
  }

  async updateConversation(id: string, updates: Partial<InsertConversation>): Promise<Conversation> {
    return withPerformanceLogging('updateConversation', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        const [updatedConversation] = await dbInstance
          .update(conversations)
          .set({ ...updates, updatedAt: new Date() })
          .where(eq(conversations.id, id))
          .returning();
        return updatedConversation;
      });
    });
  }

  async closeConversation(id: string, closedBy: 'client' | 'staff'): Promise<Conversation> {
    return withPerformanceLogging('closeConversation', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        const status = closedBy === 'client' ? 'closed_by_client' : 'closed_by_staff';
        const [closedConversation] = await dbInstance
          .update(conversations)
          .set({ status, updatedAt: new Date() })
          .where(eq(conversations.id, id))
          .returning();
        return closedConversation;
      });
    });
  }

  async getMessages(conversationId: string): Promise<Message[]> {
    return withPerformanceLogging('getMessages', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        return await dbInstance
          .select()
          .from(messages)
          .where(eq(messages.conversationId, conversationId))
          .orderBy(messages.createdAt);
      });
    });
  }

  async getMessage(id: string): Promise<Message | undefined> {
    return withPerformanceLogging('getMessage', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        const [message] = await dbInstance
          .select()
          .from(messages)
          .where(eq(messages.id, id));
        return message;
      });
    });
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    return withPerformanceLogging('createMessage', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        const [newMessage] = await dbInstance
          .insert(messages)
          .values(message)
          .returning();
        
        // Update conversation's updatedAt timestamp
        await dbInstance
          .update(conversations)
          .set({ updatedAt: new Date() })
          .where(eq(conversations.id, message.conversationId));
        
        return newMessage;
      });
    });
  }

  async markMessageAsRead(id: string): Promise<Message> {
    return withPerformanceLogging('markMessageAsRead', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        const [readMessage] = await dbInstance
          .update(messages)
          .set({ isRead: true })
          .where(eq(messages.id, id))
          .returning();
        return readMessage;
      });
    });
  }

  async markConversationMessagesAsRead(conversationId: string, readerId: string): Promise<void> {
    return withPerformanceLogging('markConversationMessagesAsRead', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        // Mark all messages not sent by the reader as read
        await dbInstance
          .update(messages)
          .set({ isRead: true })
          .where(
            and(
              eq(messages.conversationId, conversationId),
              ne(messages.senderId, readerId),
              eq(messages.isRead, false)
            )
          );
      });
    });
  }

  // ========================================
  // CALL LOGS (Mango Office Integration)
  // ========================================

  async getCallLogs(filters?: { branchId?: string; ownerId?: string; userId?: string; startDate?: Date; endDate?: Date }): Promise<CallLog[]> {
    return withPerformanceLogging('getCallLogs', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        const conditions = [];
        
        if (filters?.branchId) {
          conditions.push(eq(callLogs.branchId, filters.branchId));
        }
        if (filters?.ownerId) {
          conditions.push(eq(callLogs.ownerId, filters.ownerId));
        }
        if (filters?.userId) {
          conditions.push(eq(callLogs.userId, filters.userId));
        }
        if (filters?.startDate) {
          conditions.push(gte(callLogs.startedAt, filters.startDate));
        }
        if (filters?.endDate) {
          conditions.push(lte(callLogs.startedAt, filters.endDate));
        }
        
        const query = dbInstance
          .select()
          .from(callLogs)
          .orderBy(desc(callLogs.startedAt));
        
        if (conditions.length > 0) {
          return await query.where(and(...conditions));
        }
        
        return await query;
      });
    });
  }

  async getCallLog(id: string): Promise<CallLog | undefined> {
    return withPerformanceLogging('getCallLog', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        const [callLog] = await dbInstance
          .select()
          .from(callLogs)
          .where(eq(callLogs.id, id));
        return callLog;
      });
    });
  }

  async createCallLog(callLog: InsertCallLog): Promise<CallLog> {
    return withPerformanceLogging('createCallLog', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        const [newCallLog] = await dbInstance
          .insert(callLogs)
          .values(callLog)
          .returning();
        return newCallLog;
      });
    });
  }

  async updateCallLog(id: string, updates: Partial<InsertCallLog>): Promise<CallLog> {
    return withPerformanceLogging('updateCallLog', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        const [updatedCallLog] = await dbInstance
          .update(callLogs)
          .set(updates)
          .where(eq(callLogs.id, id))
          .returning();
        return updatedCallLog;
      });
    });
  }

  async getOwnerCallLogs(ownerId: string): Promise<CallLog[]> {
    return withPerformanceLogging('getOwnerCallLogs', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        return await dbInstance
          .select()
          .from(callLogs)
          .where(eq(callLogs.ownerId, ownerId))
          .orderBy(desc(callLogs.startedAt));
      });
    });
  }

  async findOwnerByPhone(phone: string): Promise<Owner | undefined> {
    return withPerformanceLogging('findOwnerByPhone', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        // Очищаем номер от лишних символов для поиска
        const cleanPhone = phone.replace(/\D/g, '');
        
        // Ищем владельца по номеру телефона
        const [owner] = await dbInstance
          .select()
          .from(owners)
          .where(
            or(
              like(owners.phone, `%${cleanPhone}%`),
              like(owners.phone, `%${phone}%`)
            )
          );
        return owner;
      });
    });
  }

  // ========================================
  // HOSPITAL MODULE (Inpatient/Стационар)
  // ========================================

  // Cages methods
  async getCages(branchId: string): Promise<Cage[]> {
    return withPerformanceLogging('getCages', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        return await dbInstance
          .select()
          .from(cages)
          .where(eq(cages.branchId, branchId))
          .orderBy(cages.name);
      });
    });
  }

  async getCage(id: string): Promise<Cage | undefined> {
    return withPerformanceLogging('getCage', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        const [cage] = await dbInstance
          .select()
          .from(cages)
          .where(eq(cages.id, id));
        return cage;
      });
    });
  }

  async createCage(cage: InsertCage): Promise<Cage> {
    return withPerformanceLogging('createCage', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        const [newCage] = await dbInstance
          .insert(cages)
          .values(cage)
          .returning();
        return newCage;
      });
    });
  }

  async updateCage(id: string, updates: Partial<InsertCage>): Promise<Cage> {
    return withPerformanceLogging('updateCage', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        const [updatedCage] = await dbInstance
          .update(cages)
          .set({ ...updates, updatedAt: new Date() })
          .where(eq(cages.id, id))
          .returning();
        return updatedCage;
      });
    });
  }

  async deleteCage(id: string): Promise<void> {
    return withPerformanceLogging('deleteCage', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        await dbInstance.delete(cages).where(eq(cages.id, id));
      });
    });
  }

  // Hospital Stays methods
  async getHospitalStays(branchId: string, status?: string): Promise<HospitalStay[]> {
    return withPerformanceLogging('getHospitalStays', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        const query = dbInstance
          .select()
          .from(hospitalStays)
          .where(eq(hospitalStays.branchId, branchId));
        
        if (status) {
          return await query.where(eq(hospitalStays.status, status));
        }
        
        return await query.orderBy(desc(hospitalStays.admittedAt));
      });
    });
  }

  async getHospitalStay(id: string): Promise<HospitalStay | undefined> {
    return withPerformanceLogging('getHospitalStay', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        const [stay] = await dbInstance
          .select()
          .from(hospitalStays)
          .where(eq(hospitalStays.id, id));
        return stay;
      });
    });
  }

  async createHospitalStay(stay: InsertHospitalStay): Promise<HospitalStay> {
    return withPerformanceLogging('createHospitalStay', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        const [newStay] = await dbInstance
          .insert(hospitalStays)
          .values(stay)
          .returning();
        return newStay;
      });
    });
  }

  async updateHospitalStay(id: string, updates: Partial<InsertHospitalStay>): Promise<HospitalStay> {
    return withPerformanceLogging('updateHospitalStay', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        const [updatedStay] = await dbInstance
          .update(hospitalStays)
          .set({ ...updates, updatedAt: new Date() })
          .where(eq(hospitalStays.id, id))
          .returning();
        return updatedStay;
      });
    });
  }

  async getActiveHospitalStays(): Promise<HospitalStay[]> {
    return withPerformanceLogging('getActiveHospitalStays', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        return await dbInstance
          .select()
          .from(hospitalStays)
          .where(eq(hospitalStays.status, 'active'));
      });
    });
  }

  // Treatment Log methods
  async getTreatmentLog(hospitalStayId: string): Promise<TreatmentLog[]> {
    return withPerformanceLogging('getTreatmentLog', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        return await dbInstance
          .select()
          .from(treatmentLog)
          .where(eq(treatmentLog.hospitalStayId, hospitalStayId))
          .orderBy(desc(treatmentLog.performedAt));
      });
    });
  }

  async createTreatmentLog(log: InsertTreatmentLog): Promise<TreatmentLog> {
    return withPerformanceLogging('createTreatmentLog', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        const [newLog] = await dbInstance
          .insert(treatmentLog)
          .values(log)
          .returning();
        return newLog;
      });
    });
  }

  async deleteTreatmentLog(id: string): Promise<void> {
    return withPerformanceLogging('deleteTreatmentLog', async () => {
      return withTenantContext(undefined, async (dbInstance) => {
        await dbInstance.delete(treatmentLog).where(eq(treatmentLog.id, id));
      });
    });
  }
}

export const storage = new DatabaseStorage();
