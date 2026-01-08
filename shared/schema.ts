import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, decimal, boolean, timestamp, jsonb, check, index, uniqueIndex, date, time } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Define enum constants
export const PATIENT_STATUS = ['healthy', 'sick', 'recovering', 'deceased'] as const;
export const APPOINTMENT_STATUS = ['scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show'] as const;
export const MEDICAL_RECORD_STATUS = ['active', 'completed', 'follow_up_required'] as const;
export const INVOICE_STATUS = ['draft', 'pending', 'paid', 'overdue', 'cancelled'] as const;
export const INVOICE_ITEM_TYPE = ['service', 'product'] as const;
export const PATIENT_GENDER = ['male', 'female', 'unknown'] as const;
export const CLINICAL_CASE_STATUS = ['open', 'closed'] as const;
export const ANALYSIS_STATUS = ['ordered', 'sample_taken', 'completed'] as const;
export const ATTACHMENT_ENTITY_TYPE = ['lab_analysis', 'clinical_encounter', 'clinical_case'] as const;

// File and lab analysis enums
export const FILE_TYPES = ['medical_image', 'xray', 'scan', 'receipt', 'lab_result', 'vaccine_record', 'document', 'other'] as const;
export const LAB_RESULT_STATUS = ['pending', 'in_progress', 'completed', 'abnormal', 'critical'] as const;
export const LAB_ORDER_STATUS = ['pending', 'sample_taken', 'in_progress', 'completed', 'cancelled'] as const;
export const LAB_PARAMETER_STATUS = ['normal', 'low', 'high', 'critical_low', 'critical_high'] as const;
export const LAB_URGENCY = ['routine', 'urgent', 'stat'] as const;

// User roles and permissions
export const USER_ROLES = ['врач', 'администратор', 'менеджер', 'менеджер_склада', 'руководитель', 'superadmin'] as const;
export const USER_STATUS = ['active', 'inactive'] as const;
export const SMS_VERIFICATION_PURPOSE = ['phone_verification', '2fa', 'mobile_login'] as const;
export const TWO_FACTOR_METHOD = ['sms', 'disabled'] as const;
export const BRANCH_STATUS = ['active', 'inactive', 'maintenance'] as const;
export const PUSH_TOKEN_PLATFORMS = ['ios', 'android', 'web'] as const;

// Integration and fiscal compliance enums
export const INTEGRATION_TYPE = ['1c_kassa', 'onec_retail', 'moysklad', 'yookassa', 'honest_sign', 'dreamkas', 'mango'] as const;
export const EXTERNAL_SYSTEM = ['moysklad', 'onec', '1c_retail', 'dreamkas', 'mango', 'manual'] as const;
export const INTEGRATION_STATUS = ['active', 'inactive', 'error', 'testing'] as const;
export const CATALOG_ITEM_TYPE = ['service', 'product', 'medication'] as const;
export const VAT_RATE = ['0', '10', '20', 'not_applicable'] as const;
export const MARKING_STATUS = ['required', 'not_required', 'marked', 'validation_error'] as const;
export const FISCAL_RECEIPT_STATUS = ['draft', 'pending', 'registered', 'failed', 'cancelled'] as const;
export const PAYMENT_INTENT_STATUS = ['pending', 'processing', 'succeeded', 'failed', 'cancelled'] as const;
export const INTEGRATION_JOB_STATUS = ['pending', 'running', 'completed', 'failed', 'retrying'] as const;
export const INTEGRATION_LOG_STATUS = ['success', 'error', 'partial_success', 'warning'] as const;
export const PAYMENT_METHOD = ['cash', 'card', 'online', 'mixed'] as const;
export const FISCAL_RECEIPT_SYSTEM = ['yookassa', 'moysklad', 'dreamkas'] as const;

// Billing and subscription enums
export const SUBSCRIPTION_STATUS = ['active', 'expired', 'cancelled', 'suspended', 'trial'] as const;
export const SUBSCRIPTION_PAYMENT_STATUS = ['pending', 'paid', 'failed', 'refunded'] as const;
export const BILLING_PERIOD = ['monthly', 'quarterly', 'yearly'] as const;

// Tenant status enum
export const TENANT_STATUS = ['active', 'suspended', 'trial', 'cancelled'] as const;

// Document template types
export const DOCUMENT_TEMPLATE_TYPE = [
  'invoice', 
  'encounter_summary', 
  'informed_consent_surgery', 
  'informed_consent_anesthesia', 
  'informed_consent_general',
  'lab_results_report', 
  'vaccination_certificate', 
  'prescription',
  'service_agreement',
  'hospitalization_agreement'
] as const;

// Galen sync status enum
export const GALEN_SYNC_STATUS = ['not_synced', 'sync_in_progress', 'synced', 'error'] as const;

// Queue status enum
export const QUEUE_STATUS = ['waiting', 'called', 'in_progress', 'completed', 'cancelled', 'no_show'] as const;
export const QUEUE_PRIORITY = ['normal', 'urgent', 'emergency'] as const;

// Chat/Conversations enums
export const CONVERSATION_STATUS = ['open', 'closed_by_client', 'closed_by_staff'] as const;
export const MESSAGE_SENDER_TYPE = ['client', 'staff'] as const;

// Call log enums
export const CALL_DIRECTION = ['inbound', 'outbound'] as const;
export const CALL_STATUS = ['answered', 'missed', 'busy', 'failed', 'no_answer'] as const;

// CRM enums
export const CLIENT_SEGMENT = ['new', 'regular', 'vip', 'lost', 'at_risk'] as const;
export const INTERACTION_TYPE = ['call', 'sms', 'email', 'push', 'visit', 'note', 'complaint', 'feedback'] as const;
export const REMINDER_TYPE = ['vaccination', 'deworming', 'flea_tick', 'checkup', 'surgery_followup', 'dental', 'custom'] as const;
export const REMINDER_STATUS = ['pending', 'sent', 'acknowledged', 'completed', 'cancelled'] as const;
export const CAMPAIGN_STATUS = ['draft', 'scheduled', 'running', 'completed', 'paused', 'cancelled'] as const;
export const CAMPAIGN_CHANNEL = ['sms', 'email', 'push'] as const;

// ========================================
// MULTI-TENANT ARCHITECTURE
// ========================================

// Tenants table - каждая клиника = отдельный tenant
export const tenants = pgTable("tenants", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(), // Название клиники
  slug: varchar("slug", { length: 100 }).notNull().unique(), // URL slug для поддомена (clinic1, clinic2)
  canonicalDomain: varchar("canonical_domain", { length: 255 }), // Основной домен (clinic1.vetsystem.ru)
  customDomain: varchar("custom_domain", { length: 255 }), // Кастомный домен (optional)
  status: varchar("status", { length: 20 }).default("trial"),
  
  // Привязка к юридическому лицу
  legalEntityId: varchar("legal_entity_id"), // Опциональная привязка к юр.лицу (FK через relations)
  
  // Контактная информация (устаревшие поля, использовать legalEntityId)
  legalName: varchar("legal_name", { length: 255 }), // Юридическое название
  inn: varchar("inn", { length: 12 }), // ИНН организации
  kpp: varchar("kpp", { length: 9 }), // КПП организации
  ogrn: varchar("ogrn", { length: 15 }), // ОГРН/ОГРНИП
  legalAddress: text("legal_address"),
  phone: varchar("phone", { length: 50 }),
  email: varchar("email", { length: 255 }),
  
  // Ветеринарная лицензия
  veterinaryLicenseNumber: varchar("veterinary_license_number", { length: 100 }),
  veterinaryLicenseIssueDate: date("veterinary_license_issue_date"),
  logoUrl: text("logo_url"), // Путь к файлу логотипа
  
  // Биллинг
  subscriptionId: varchar("subscription_id"), // Связь с clinicSubscriptions
  trialEndsAt: timestamp("trial_ends_at"),
  billingEmail: varchar("billing_email", { length: 255 }),
  
  // Ограничения и квоты
  maxBranches: integer("max_branches").default(1),
  maxUsers: integer("max_users").default(10),
  maxStorageGb: integer("max_storage_gb").default(10),
  
  // Настройки
  settings: jsonb("settings"), // Дополнительные настройки tenant'а
  
  // Учетные данные для интеграции с ГИС "ВетИС Гален" (зашифрованные)
  galenApiUser: text("galen_api_user"), // Encrypted
  galenApiKey: text("galen_api_key"), // Encrypted
  galenIssuerId: text("galen_issuer_id"), // Encrypted - ID хозяйствующего субъекта
  galenServiceId: text("galen_service_id"), // Encrypted - ID сервиса
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => {
  return {
    statusCheck: check("tenants_status_check", sql`${table.status} IN ('active', 'suspended', 'trial', 'cancelled')`),
    slugIdx: index("tenants_slug_idx").on(table.slug),
    statusIdx: index("tenants_status_idx").on(table.status),
    legalEntityIdIdx: index("tenants_legal_entity_id_idx").on(table.legalEntityId),
    canonicalDomainIdx: index("tenants_canonical_domain_idx").on(table.canonicalDomain),
    createdAtIdx: index("tenants_created_at_idx").on(table.createdAt),
  };
});

// Legal Entities table - юридические лица для разных филиалов и клиник
export const legalEntities = pgTable("legal_entities", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").references(() => tenants.id).notNull(), // Multi-tenant: каждое юр.лицо принадлежит tenant'у
  
  // Основные реквизиты
  legalName: varchar("legal_name", { length: 500 }).notNull(), // Полное юридическое наименование
  shortName: varchar("short_name", { length: 255 }), // Сокращенное наименование
  inn: varchar("inn", { length: 12 }).notNull(), // ИНН организации (10 или 12 цифр)
  kpp: varchar("kpp", { length: 9 }), // КПП организации (9 цифр, для юр.лиц)
  ogrn: varchar("ogrn", { length: 15 }).notNull(), // ОГРН (13 цифр) или ОГРНИП (15 цифр)
  
  // Адреса
  legalAddress: text("legal_address").notNull(), // Юридический адрес
  actualAddress: text("actual_address"), // Фактический адрес (если отличается)
  
  // Контактная информация
  phone: varchar("phone", { length: 50 }),
  email: varchar("email", { length: 255 }),
  website: varchar("website", { length: 255 }),
  
  // Банковские реквизиты
  bankName: varchar("bank_name", { length: 255 }), // Наименование банка
  bik: varchar("bik", { length: 9 }), // БИК банка (9 цифр)
  correspondentAccount: varchar("correspondent_account", { length: 20 }), // Корр. счет (20 цифр)
  paymentAccount: varchar("payment_account", { length: 20 }), // Расчетный счет (20 цифр)
  
  // Руководство и бухгалтерия
  directorName: varchar("director_name", { length: 255 }), // ФИО руководителя
  directorPosition: varchar("director_position", { length: 255 }).default("Генеральный директор"), // Должность
  accountantName: varchar("accountant_name", { length: 255 }), // ФИО главного бухгалтера
  
  // Ветеринарная лицензия
  veterinaryLicenseNumber: varchar("veterinary_license_number", { length: 100 }),
  veterinaryLicenseIssueDate: date("veterinary_license_issue_date"),
  veterinaryLicenseIssuedBy: text("veterinary_license_issued_by"), // Кем выдана лицензия
  
  // Логотип и печать
  logoUrl: text("logo_url"), // Путь к файлу логотипа
  stampUrl: text("stamp_url"), // Путь к файлу печати
  
  // Дополнительно
  notes: text("notes"), // Примечания
  isActive: boolean("is_active").default(true).notNull(),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => {
  return {
    tenantIdIdx: index("legal_entities_tenant_id_idx").on(table.tenantId),
    innIdx: index("legal_entities_inn_idx").on(table.inn),
    isActiveIdx: index("legal_entities_is_active_idx").on(table.isActive),
    tenantInnUnique: uniqueIndex("legal_entities_tenant_inn_unique_idx").on(table.tenantId, table.inn), // Unique INN per tenant
  };
});

// Branches table for multi-location clinic support - MUST be defined before users table
export const branches = pgTable("branches", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").references(() => tenants.id).notNull(), // Multi-tenant: каждый филиал принадлежит tenant'у
  legalEntityId: varchar("legal_entity_id"), // Опциональная привязка к юр.лицу (FK через relations)
  name: varchar("name", { length: 255 }).notNull(),
  address: text("address").notNull(),
  city: varchar("city", { length: 100 }).notNull(),
  region: varchar("region", { length: 100 }),
  phone: varchar("phone", { length: 50 }).notNull(),
  email: varchar("email", { length: 255 }),
  workingHours: jsonb("working_hours"),
  status: varchar("status", { length: 20 }).default("active"),
  managerId: varchar("manager_id"),
  description: text("description"),
  vetaisClinicId: integer("vetais_clinic_id"), // Vetais clinic ID for migration tracking
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => {
  return {
    tenantIdIdx: index("branches_tenant_id_idx").on(table.tenantId),
    legalEntityIdIdx: index("branches_legal_entity_id_idx").on(table.legalEntityId),
    tenantNameUnique: uniqueIndex("branches_tenant_name_unique_idx").on(table.tenantId, table.name), // Unique branch name per tenant
  };
});

// Enhanced users table for role-based authentication - MATCHES REPLIT ORIGINAL SCHEMA
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").references(() => tenants.id), // Multi-tenant: user belongs to tenant (null for super admin)
  username: varchar("username", { length: 100 }).notNull(), // Unique per tenant, not globally
  password: text("password").notNull(),
  email: varchar("email", { length: 255 }),
  fullName: varchar("full_name", { length: 255 }).notNull(),
  role: varchar("role", { length: 50 }).notNull(),
  status: varchar("status", { length: 20 }).default("active"),
  locale: varchar("locale", { length: 10 }).default("ru"), // User's preferred language (ru, en, etc.)
  lastLogin: timestamp("last_login"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  phone: varchar("phone", { length: 20 }),
  phoneVerified: boolean("phone_verified").default(false),
  twoFactorEnabled: boolean("two_factor_enabled").default(false),
  twoFactorMethod: varchar("two_factor_method", { length: 10 }).default("sms"),
  branchId: varchar("branch_id"),
  department: varchar("department", { length: 100 }), // Отделение в клинике
  vetaisId: integer("vetais_id"), // Vetais user ID for migration tracking
  isSuperAdmin: boolean("is_super_admin").default(false),
}, (table) => {
  return {
    tenantIdIdx: index("users_tenant_id_idx").on(table.tenantId),
    branchIdIdx: index("users_branch_id_idx").on(table.branchId),
    vetaisIdIdx: index("users_vetais_id_idx").on(table.vetaisId),
    // Username unique per tenant (WHERE tenant_id IS NOT NULL allows superadmin to have any username)
    tenantUsernameUnique: uniqueIndex("users_tenant_username_unique_idx").on(table.tenantId, table.username).where(sql`${table.tenantId} IS NOT NULL`),
  };
});

// SMS Verification Codes table
export const smsVerificationCodes = pgTable("sms_verification_codes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  ownerId: varchar("owner_id").references(() => owners.id),
  phone: varchar("phone", { length: 20 }).notNull(),
  codeHash: text("code_hash").notNull(),
  purpose: varchar("purpose", { length: 20 }).notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  attemptCount: integer("attempt_count").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => {
  return {
    purposeCheck: check("sms_codes_purpose_check", sql`${table.purpose} IN ('phone_verification', '2fa', 'mobile_login')`),
    exclusiveIdCheck: check("sms_codes_exclusive_id_check", sql`(${table.userId} IS NOT NULL AND ${table.ownerId} IS NULL) OR (${table.userId} IS NULL AND ${table.ownerId} IS NOT NULL)`),
    userIdIdx: index("sms_codes_user_id_idx").on(table.userId),
    ownerIdIdx: index("sms_codes_owner_id_idx").on(table.ownerId),
    phoneIdx: index("sms_codes_phone_idx").on(table.phone),
    expiresAtIdx: index("sms_codes_expires_at_idx").on(table.expiresAt),
    purposeIdx: index("sms_codes_purpose_idx").on(table.purpose),
  };
});

// Push Tokens table (for mobile app notifications)
export const pushTokens = pgTable("push_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  ownerId: varchar("owner_id").references(() => owners.id), // For client mobile app
  token: text("token").notNull(), // Expo push token
  deviceId: varchar("device_id", { length: 255 }), // Optional device identifier
  platform: varchar("platform", { length: 20 }), // ios, android
  isActive: boolean("is_active").default(true).notNull(),
  lastUsedAt: timestamp("last_used_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => {
  return {
    userIdIdx: index("push_tokens_user_id_idx").on(table.userId),
    ownerIdIdx: index("push_tokens_owner_id_idx").on(table.ownerId),
    tokenIdx: index("push_tokens_token_idx").on(table.token),
    isActiveIdx: index("push_tokens_is_active_idx").on(table.isActive),
    // Unique constraint: one token per device
    uniqueToken: uniqueIndex("push_tokens_token_unique_idx").on(table.token),
  };
});

// Owners table
export const owners = pgTable("owners", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").references(() => tenants.id).notNull(), // Multi-tenant
  name: varchar("name", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 50 }).notNull(),
  email: varchar("email", { length: 255 }),
  address: text("address"),
  
  // Личные данные
  dateOfBirth: date("date_of_birth"), // Дата рождения владельца
  gender: varchar("gender", { length: 20 }), // Пол владельца (male/female/other)
  
  // Паспортные данные (для договора и ВСД)
  passportSeries: varchar("passport_series", { length: 10 }),
  passportNumber: varchar("passport_number", { length: 100 }), // Увеличено для импорта из Vetais
  passportIssuedBy: text("passport_issued_by"),
  passportIssueDate: date("passport_issue_date"),
  registrationAddress: text("registration_address"), // Адрес регистрации (прописка)
  residenceAddress: text("residence_address"), // Адрес фактического проживания
  
  // Согласие на обработку персональных данных (ФЗ-152)
  personalDataConsentGiven: boolean("personal_data_consent_given").default(false),
  personalDataConsentDate: timestamp("personal_data_consent_date"),
  
  branchId: varchar("branch_id").references(() => branches.id),
  vetaisId: varchar("vetais_id", { length: 50 }), // Vetais client ID for migration tracking
  
  // CRM fields
  segment: varchar("segment", { length: 20 }).default("new"), // Client segment: new, regular, vip, lost, at_risk
  totalSpent: decimal("total_spent", { precision: 12, scale: 2 }).default("0"), // Lifetime value
  visitCount: integer("visit_count").default(0), // Total visits
  lastVisitAt: timestamp("last_visit_at"), // Last visit date
  firstVisitAt: timestamp("first_visit_at"), // First visit date (for tenure)
  averageCheck: decimal("average_check", { precision: 10, scale: 2 }).default("0"), // Average invoice amount
  smsOptIn: boolean("sms_opt_in").default(true), // SMS marketing consent
  emailOptIn: boolean("email_opt_in").default(true), // Email marketing consent
  pushOptIn: boolean("push_opt_in").default(true), // Push notification consent
  notes: text("notes"), // Internal CRM notes
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => {
  return {
    tenantIdIdx: index("owners_tenant_id_idx").on(table.tenantId),
    nameIdx: index("owners_name_idx").on(table.name),
    phoneIdx: index("owners_phone_idx").on(table.phone),
    emailIdx: index("owners_email_idx").on(table.email),
    branchIdIdx: index("owners_branch_id_idx").on(table.branchId),
    createdAtIdx: index("owners_created_at_idx").on(table.createdAt),
    tenantPhoneIdx: index("owners_tenant_phone_idx").on(table.tenantId, table.phone), // Search within tenant
    vetaisIdIdx: index("owners_vetais_id_idx").on(table.vetaisId), // Index for migration lookups
    segmentIdx: index("owners_segment_idx").on(table.segment), // CRM segment index
    lastVisitIdx: index("owners_last_visit_idx").on(table.lastVisitAt), // For churn detection
  };
});

// Patients table
export const patients = pgTable("patients", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").references(() => tenants.id).notNull(), // Multi-tenant
  name: varchar("name", { length: 255 }).notNull(),
  species: varchar("species", { length: 100 }).notNull(),
  breed: varchar("breed", { length: 255 }),
  gender: varchar("gender", { length: 10 }),
  birthDate: timestamp("birth_date"),
  color: varchar("color", { length: 255 }),
  weight: decimal("weight", { precision: 5, scale: 2 }),
  microchipNumber: varchar("microchip_number", { length: 255 }),
  tattooNumber: varchar("tattoo_number", { length: 50 }), // Номер клейма
  isNeutered: boolean("is_neutered").default(false),
  allergies: text("allergies"),
  chronicConditions: text("chronic_conditions"),
  specialMarks: text("special_marks"),
  status: varchar("status", { length: 20 }).default("healthy"),
  ownerId: varchar("owner_id").references(() => owners.id), // Nullable for backwards compatibility during migration
  branchId: varchar("branch_id").references(() => branches.id),
  vetaisId: varchar("vetais_id", { length: 50 }), // Vetais patient ID for migration tracking
  
  // Интеграция с ГИС "ВетИС Гален"
  galenUuid: varchar("galen_uuid", { length: 36 }), // UUID животного в системе "Гален"
  galenSyncStatus: varchar("galen_sync_status", { length: 20 }).default("not_synced"),
  galenLastSyncError: text("galen_last_sync_error"),
  galenLastSyncAt: timestamp("galen_last_sync_at"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => {
  return {
    statusCheck: check("patients_status_check", sql`${table.status} IN ('healthy', 'sick', 'recovering', 'deceased')`),
    genderCheck: check("patients_gender_check", sql`${table.gender} IN ('male', 'female', 'unknown')`),
    galenSyncStatusCheck: check("patients_galen_sync_status_check", sql`${table.galenSyncStatus} IN ('not_synced', 'sync_in_progress', 'synced', 'error')`),
    weightCheck: check("patients_weight_check", sql`${table.weight} >= 0`),
    tenantIdIdx: index("patients_tenant_id_idx").on(table.tenantId),
    ownerIdIdx: index("patients_owner_id_idx").on(table.ownerId),
    microchipIdx: index("patients_microchip_idx").on(table.microchipNumber),
    statusIdx: index("patients_status_idx").on(table.status),
    createdAtIdx: index("patients_created_at_idx").on(table.createdAt),
    nameIdx: index("patients_name_idx").on(table.name),
    speciesIdx: index("patients_species_idx").on(table.species),
    breedIdx: index("patients_breed_idx").on(table.breed),
    branchIdIdx: index("patients_branch_id_idx").on(table.branchId),
    tenantMicrochipUnique: index("patients_tenant_microchip_unique_idx").on(table.tenantId, table.microchipNumber),
    vetaisIdIdx: index("patients_vetais_id_idx").on(table.vetaisId), // Index for migration lookups
    vetaisIdUnique: uniqueIndex("patients_vetais_id_unique_idx").on(table.vetaisId).where(sql`${table.vetaisId} IS NOT NULL`), // Prevent duplicate migrations
  };
});

// Patient-Owners junction table for many-to-many relationships
export const patientOwners = pgTable("patient_owners", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  patientId: varchar("patient_id").references(() => patients.id, { onDelete: 'cascade' }).notNull(),
  ownerId: varchar("owner_id").references(() => owners.id, { onDelete: 'cascade' }).notNull(),
  isPrimary: boolean("is_primary").default(false).notNull(), // One primary owner per patient
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => {
  return {
    patientIdIdx: index("patient_owners_patient_id_idx").on(table.patientId),
    ownerIdIdx: index("patient_owners_owner_id_idx").on(table.ownerId),
    primaryIdx: index("patient_owners_primary_idx").on(table.isPrimary),
    // Covering index for CTE performance: supports ORDER BY is_primary DESC, created_at ASC
    coveringIdx: index("patient_owners_covering_idx").on(table.patientId, table.isPrimary, table.createdAt),
    // Unique constraint: prevents duplicate patient-owner pairs
    patientOwnerUnique: uniqueIndex("patient_owners_unique_idx").on(table.patientId, table.ownerId),
  };
});

// Doctors table
export const doctors = pgTable("doctors", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").references(() => tenants.id).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  specialization: varchar("specialization", { length: 255 }),
  phone: varchar("phone", { length: 50 }),
  email: varchar("email", { length: 255 }),
  isActive: boolean("is_active").default(true),
  branchId: varchar("branch_id").references(() => branches.id), // Temporarily nullable for migration
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => {
  return {
    tenantIdIdx: index("doctors_tenant_id_idx").on(table.tenantId),
    nameIdx: index("doctors_name_idx").on(table.name),
    activeIdx: index("doctors_active_idx").on(table.isActive),
    specializationIdx: index("doctors_specialization_idx").on(table.specialization),
    branchIdIdx: index("doctors_branch_id_idx").on(table.branchId),
    createdAtIdx: index("doctors_created_at_idx").on(table.createdAt),
  };
});

// Appointments table
export const appointments = pgTable("appointments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").references(() => tenants.id).notNull(),
  patientId: varchar("patient_id").references(() => patients.id).notNull(),
  doctorId: varchar("doctor_id").references(() => doctors.id).notNull(),
  appointmentDate: timestamp("appointment_date").notNull(),
  duration: integer("duration").notNull(), // in minutes
  appointmentType: varchar("appointment_type", { length: 255 }).notNull(),
  status: varchar("status", { length: 20 }).default("scheduled"),
  notes: text("notes"),
  branchId: varchar("branch_id").references(() => branches.id), // Temporarily nullable for migration
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => {
  return {
    statusCheck: check("appointments_status_check", sql`${table.status} IN ('scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show')`),
    durationCheck: check("appointments_duration_check", sql`${table.duration} > 0`),
    tenantIdIdx: index("appointments_tenant_id_idx").on(table.tenantId),
    patientIdIdx: index("appointments_patient_id_idx").on(table.patientId),
    doctorIdIdx: index("appointments_doctor_id_idx").on(table.doctorId),
    appointmentDateIdx: index("appointments_date_idx").on(table.appointmentDate),
    statusIdx: index("appointments_status_idx").on(table.status),
    branchIdIdx: index("appointments_branch_id_idx").on(table.branchId),
    doctorDateIdx: index("appointments_doctor_date_idx").on(table.doctorId, table.appointmentDate),
  };
});

// Queue Entries table - Электронная очередь
export const queueEntries = pgTable("queue_entries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").references(() => tenants.id).notNull(),
  branchId: varchar("branch_id").references(() => branches.id).notNull(),
  appointmentId: varchar("appointment_id").references(() => appointments.id), // Опциональная связь с записью на прием
  patientId: varchar("patient_id").references(() => patients.id).notNull(),
  ownerId: varchar("owner_id").references(() => owners.id).notNull(),
  queueNumber: integer("queue_number").notNull(), // Номер в очереди (автоматически генерируется)
  priority: varchar("priority", { length: 20 }).default("normal").notNull(), // normal, urgent, emergency
  status: varchar("status", { length: 20 }).default("waiting").notNull(), // waiting, called, in_progress, completed, cancelled, no_show
  arrivalTime: timestamp("arrival_time").defaultNow().notNull(), // Время прихода клиента
  expectedWaitTime: integer("expected_wait_time"), // Ожидаемое время ожидания в минутах
  notes: text("notes"), // Дополнительные заметки
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => {
  return {
    statusCheck: check("queue_entries_status_check", sql`${table.status} IN ('waiting', 'called', 'in_progress', 'completed', 'cancelled', 'no_show')`),
    priorityCheck: check("queue_entries_priority_check", sql`${table.priority} IN ('normal', 'urgent', 'emergency')`),
    tenantIdIdx: index("queue_entries_tenant_id_idx").on(table.tenantId),
    branchIdIdx: index("queue_entries_branch_id_idx").on(table.branchId),
    statusIdx: index("queue_entries_status_idx").on(table.status),
    arrivalTimeIdx: index("queue_entries_arrival_time_idx").on(table.arrivalTime),
    queueNumberIdx: index("queue_entries_queue_number_idx").on(table.queueNumber),
    branchStatusIdx: index("queue_entries_branch_status_idx").on(table.branchId, table.status),
  };
});

// Queue Calls table - Вызовы клиентов в кабинеты
export const queueCalls = pgTable("queue_calls", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").references(() => tenants.id).notNull(),
  branchId: varchar("branch_id").references(() => branches.id).notNull(),
  queueEntryId: varchar("queue_entry_id").references(() => queueEntries.id).notNull(),
  roomNumber: varchar("room_number", { length: 50 }).notNull(), // Номер кабинета
  calledBy: varchar("called_by").references(() => users.id).notNull(), // Кто вызвал (врач/администратор)
  calledAt: timestamp("called_at").defaultNow().notNull(), // Время вызова
  displayedUntil: timestamp("displayed_until"), // До какого времени показывать на экране (по умолчанию +5 минут)
  voiceAnnounced: boolean("voice_announced").default(false).notNull(), // Было ли голосовое объявление
  acknowledged: boolean("acknowledged").default(false).notNull(), // Подтверждено ли получение вызова
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => {
  return {
    tenantIdIdx: index("queue_calls_tenant_id_idx").on(table.tenantId),
    branchIdIdx: index("queue_calls_branch_id_idx").on(table.branchId),
    queueEntryIdIdx: index("queue_calls_queue_entry_id_idx").on(table.queueEntryId),
    calledAtIdx: index("queue_calls_called_at_idx").on(table.calledAt),
    displayedUntilIdx: index("queue_calls_displayed_until_idx").on(table.displayedUntil),
  };
});

// Medical Records table
export const medicalRecords = pgTable("medical_records", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").references(() => tenants.id).notNull(),
  patientId: varchar("patient_id").references(() => patients.id).notNull(),
  doctorId: varchar("doctor_id").references(() => users.id), // Врачи хранятся в users с ролью "врач"
  appointmentId: varchar("appointment_id").references(() => appointments.id),
  visitDate: timestamp("visit_date").notNull(),
  visitType: varchar("visit_type", { length: 255 }).notNull(),
  complaints: text("complaints"),
  diagnosis: text("diagnosis"),
  treatment: jsonb("treatment"), // array of treatments
  temperature: decimal("temperature", { precision: 3, scale: 1 }),
  weight: decimal("weight", { precision: 5, scale: 2 }),
  nextVisit: timestamp("next_visit"),
  status: varchar("status", { length: 20 }).default("active"),
  notes: text("notes"),
  branchId: varchar("branch_id").references(() => branches.id), // Temporarily nullable for migration
  vetaisId: text("vetais_id"), // ID из Vetais (TEXT для совместимости с любыми ID)
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => {
  return {
    statusCheck: check("medical_records_status_check", sql`${table.status} IN ('active', 'completed', 'follow_up_required')`),
    temperatureCheck: check("medical_records_temperature_check", sql`${table.temperature} >= 30.0 AND ${table.temperature} <= 45.0`),
    weightCheck: check("medical_records_weight_check", sql`${table.weight} >= 0`),
    tenantIdIdx: index("medical_records_tenant_id_idx").on(table.tenantId),
    patientIdIdx: index("medical_records_patient_id_idx").on(table.patientId),
    doctorIdIdx: index("medical_records_doctor_id_idx").on(table.doctorId),
    visitDateIdx: index("medical_records_visit_date_idx").on(table.visitDate),
    statusIdx: index("medical_records_status_idx").on(table.status),
    branchIdIdx: index("medical_records_branch_id_idx").on(table.branchId),
    patientDateIdx: index("medical_records_patient_date_idx").on(table.patientId, table.visitDate),
    vetaisIdIdx: index("medical_records_vetais_id_idx").on(table.vetaisId),
  };
});

// Medications table
export const medications = pgTable("medications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  recordId: varchar("record_id").references(() => medicalRecords.id).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  dosage: varchar("dosage", { length: 255 }).notNull(),
  frequency: varchar("frequency", { length: 255 }).notNull(),
  duration: varchar("duration", { length: 255 }).notNull(),
  instructions: text("instructions"),
  vetaisId: integer("vetais_id"), // ID из Vetais (medical_plan_item)
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => {
  return {
    recordIdIdx: index("medications_record_id_idx").on(table.recordId),
    nameIdx: index("medications_name_idx").on(table.name),
    vetaisIdIdx: index("medications_vetais_id_idx").on(table.vetaisId),
  };
});

// Services table
export const services = pgTable("services", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").references(() => tenants.id).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  category: varchar("category", { length: 255 }).notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  duration: integer("duration"), // in minutes, for services
  description: text("description"),
  isActive: boolean("is_active").default(true),
  // МойСклад интеграция (legacy)
  moyskladId: varchar("moysklad_id", { length: 255 }), // ID из МойСклад
  article: varchar("article", { length: 255 }), // Артикул
  vat: integer("vat").default(20), // НДС
  // Универсальная интеграция с внешними системами
  externalId: varchar("external_id", { length: 255 }), // ID во внешней системе
  externalSystem: varchar("external_system", { length: 50 }), // Система: moysklad, onec, 1c_retail
  // Поля отслеживания синхронизации
  lastSyncedAt: timestamp("last_synced_at"), // Когда последний раз синхронизировался
  syncHash: varchar("sync_hash", { length: 64 }), // Хеш для отслеживания изменений
  deletedAt: timestamp("deleted_at"), // Для soft delete
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => {
  return {
    priceCheck: check("services_price_check", sql`${table.price} >= 0`),
    durationCheck: check("services_duration_check", sql`${table.duration} IS NULL OR ${table.duration} > 0`),
    tenantIdIdx: index("services_tenant_id_idx").on(table.tenantId),
    nameIdx: index("services_name_idx").on(table.name),
    categoryIdx: index("services_category_idx").on(table.category),
    activeIdx: index("services_active_idx").on(table.isActive),
  };
});

// Products table
export const products = pgTable("products", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").references(() => tenants.id).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  category: varchar("category", { length: 255 }).notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  stock: integer("stock").default(0),
  minStock: integer("min_stock").default(0),
  unit: varchar("unit", { length: 50 }).notNull(),
  description: text("description"),
  isActive: boolean("is_active").default(true),
  // Новые поля товара
  unitsPerPackage: integer("units_per_package").default(1), // Количество единиц в упаковке
  barcode: varchar("barcode", { length: 255 }), // Штрихкод
  isMarked: boolean("is_marked").default(false), // Маркированный товар
  productType: varchar("product_type", { length: 20 }).default('product'), // 'product' или 'service'
  // МойСклад интеграция (legacy)
  moyskladId: varchar("moysklad_id", { length: 255 }), // ID из МойСклад
  article: varchar("article", { length: 255 }), // Артикул
  vat: integer("vat").default(20), // НДС: null (без НДС), 0, 5, 7, 10, 20
  // Универсальная интеграция с внешними системами
  externalId: varchar("external_id", { length: 255 }), // ID во внешней системе
  externalSystem: varchar("external_system", { length: 50 }), // Система: moysklad, onec, 1c_retail
  // Поля отслеживания синхронизации
  lastSyncedAt: timestamp("last_synced_at"), // Когда последний раз синхронизировался
  syncHash: varchar("sync_hash", { length: 64 }), // Хеш для отслеживания изменений
  deletedAt: timestamp("deleted_at"), // Для soft delete
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => {
  return {
    priceCheck: check("products_price_check", sql`${table.price} >= 0`),
    stockCheck: check("products_stock_check", sql`${table.stock} >= 0`),
    minStockCheck: check("products_min_stock_check", sql`${table.minStock} >= 0`),
    tenantIdIdx: index("products_tenant_id_idx").on(table.tenantId),
    nameIdx: index("products_name_idx").on(table.name),
    categoryIdx: index("products_category_idx").on(table.category),
    activeIdx: index("products_active_idx").on(table.isActive),
    stockIdx: index("products_stock_idx").on(table.stock),
    lowStockIdx: index("products_low_stock_idx").on(table.stock, table.minStock),
    activeStockIdx: index("products_active_stock_idx").on(table.isActive, table.stock),
    createdAtIdx: index("products_created_at_idx").on(table.createdAt),
  };
});

// Catalog Items table - unified catalog for services, products, and medications
export const catalogItems = pgTable("catalog_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").references(() => tenants.id).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  type: varchar("type", { length: 20 }).notNull(), // 'service', 'product', 'medication'
  category: varchar("category", { length: 255 }).notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  unit: varchar("unit", { length: 50 }).notNull(),
  vatRate: varchar("vat_rate", { length: 20 }).default("20"), // НДС ставка для 54-ФЗ
  markingStatus: varchar("marking_status", { length: 20 }).default("not_required"),
  externalId: varchar("external_id", { length: 255 }), // ID во внешней системе (1С, МойСклад)
  integrationSource: varchar("integration_source", { length: 20 }), // источник данных
  description: text("description"),
  isActive: boolean("is_active").default(true),
  // Для товаров
  stock: integer("stock").default(0),
  minStock: integer("min_stock").default(0),
  // Для услуг
  duration: integer("duration"), // продолжительность в минутах
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => {
  return {
    typeCheck: check("catalog_items_type_check", sql`${table.type} IN ('service', 'product', 'medication')`),
    vatRateCheck: check("catalog_items_vat_rate_check", sql`${table.vatRate} IN ('0', '10', '20', 'not_applicable')`),
    markingStatusCheck: check("catalog_items_marking_status_check", sql`${table.markingStatus} IN ('required', 'not_required', 'marked', 'validation_error')`),
    priceCheck: check("catalog_items_price_check", sql`${table.price} >= 0`),
    stockCheck: check("catalog_items_stock_check", sql`${table.stock} >= 0`),
    tenantIdIdx: index("catalog_items_tenant_id_idx").on(table.tenantId),
    nameIdx: index("catalog_items_name_idx").on(table.name),
    typeIdx: index("catalog_items_type_idx").on(table.type),
    categoryIdx: index("catalog_items_category_idx").on(table.category),
    activeIdx: index("catalog_items_active_idx").on(table.isActive),
    externalIdIdx: index("catalog_items_external_id_idx").on(table.externalId),
    integrationSourceIdx: index("catalog_items_integration_source_idx").on(table.integrationSource),
    createdAtIdx: index("catalog_items_created_at_idx").on(table.createdAt),
  };
});

// Catalog Item Markings table - DataMatrix codes for product marking
export const catalogItemMarkings = pgTable("catalog_item_markings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  catalogItemId: varchar("catalog_item_id").references(() => catalogItems.id).notNull(),
  dataMatrixCode: text("data_matrix_code").notNull().unique(), // Полный DataMatrix код
  gtin: varchar("gtin", { length: 100 }), // Составной идентификатор  
  serialNumber: varchar("serial_number", { length: 255 }), // Серийный номер
  cryptoTail: text("crypto_tail"), // Криптохвост
  productionDate: timestamp("production_date"),
  expiryDate: timestamp("expiry_date"),
  isUsed: boolean("is_used").default(false), // Введен ли в оборот
  validationStatus: varchar("validation_status", { length: 20 }).default("pending"),
  honestSignResponse: jsonb("honest_sign_response"), // Ответ от системы "Честный ЗНАК"
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => {
  return {
    validationStatusCheck: check("catalog_item_markings_validation_status_check", sql`${table.validationStatus} IN ('pending', 'valid', 'invalid', 'expired')`),
    catalogItemIdIdx: index("catalog_item_markings_catalog_item_id_idx").on(table.catalogItemId),
    dataMatrixCodeIdx: index("catalog_item_markings_data_matrix_code_idx").on(table.dataMatrixCode),
    gtinIdx: index("catalog_item_markings_gtin_idx").on(table.gtin),
    isUsedIdx: index("catalog_item_markings_is_used_idx").on(table.isUsed),
    validationStatusIdx: index("catalog_item_markings_validation_status_idx").on(table.validationStatus),
  };
});

// Integration Accounts table - settings for external integrations
export const integrationAccounts = pgTable("integration_accounts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").references(() => tenants.id).notNull(),
  name: varchar("name", { length: 255 }).notNull(), // Название интеграции
  type: varchar("type", { length: 20 }).notNull(), // '1c_kassa', 'moysklad', 'yookassa', 'honest_sign'
  status: varchar("status", { length: 20 }).default("inactive"),
  apiCredentials: jsonb("api_credentials").notNull(), // Зашифрованные API ключи
  settings: jsonb("settings"), // Настройки интеграции
  lastSyncAt: timestamp("last_sync_at"),
  lastErrorAt: timestamp("last_error_at"),
  lastError: text("last_error"),
  syncFrequency: integer("sync_frequency").default(3600), // Частота синхронизации в секундах
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => {
  return {
    typeCheck: check("integration_accounts_type_check", sql`${table.type} IN ('1c_kassa', 'moysklad', 'yookassa', 'honest_sign')`),
    statusCheck: check("integration_accounts_status_check", sql`${table.status} IN ('active', 'inactive', 'error', 'testing')`),
    tenantIdIdx: index("integration_accounts_tenant_id_idx").on(table.tenantId),
    nameIdx: index("integration_accounts_name_idx").on(table.name),
    typeIdx: index("integration_accounts_type_idx").on(table.type),
    statusIdx: index("integration_accounts_status_idx").on(table.status),
    lastSyncAtIdx: index("integration_accounts_last_sync_at_idx").on(table.lastSyncAt),
  };
});

// Integration Mappings table - mapping between external and internal IDs
export const integrationMappings = pgTable("integration_mappings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  integrationAccountId: varchar("integration_account_id").references(() => integrationAccounts.id).notNull(),
  externalId: varchar("external_id", { length: 255 }).notNull(),
  internalId: varchar("internal_id", { length: 255 }).notNull(),
  entityType: varchar("entity_type", { length: 50 }).notNull(), // 'catalog_item', 'patient', 'invoice'
  metadata: jsonb("metadata"), // Дополнительные данные маппинга
  lastSyncAt: timestamp("last_sync_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => {
  return {
    integrationAccountIdIdx: index("integration_mappings_integration_account_id_idx").on(table.integrationAccountId),
    externalIdIdx: index("integration_mappings_external_id_idx").on(table.externalId),
    internalIdIdx: index("integration_mappings_internal_id_idx").on(table.internalId),
    entityTypeIdx: index("integration_mappings_entity_type_idx").on(table.entityType),
    uniqueMapping: index("integration_mappings_unique_mapping_idx").on(table.integrationAccountId, table.externalId, table.entityType),
  };
});

// Fiscal Receipts table - 54-FZ compliant fiscal documents
export const fiscalReceipts = pgTable("fiscal_receipts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  invoiceId: varchar("invoice_id").references(() => invoices.id, { onDelete: "cascade" }).notNull(),
  receiptNumber: varchar("receipt_number", { length: 255 }),
  status: varchar("status", { length: 20 }).default("draft"),
  receiptType: varchar("receipt_type", { length: 20 }).default("sale"), // Признак расчета: sale, return, expense, etc.
  paymentMethod: varchar("payment_method", { length: 20 }).notNull(),
  customerEmail: varchar("customer_email", { length: 255 }),
  customerPhone: varchar("customer_phone", { length: 50 }),
  
  // 54-ФЗ обязательные поля
  taxationSystem: varchar("taxation_system", { length: 20 }).notNull().default("common"), // Система налогообложения
  operatorName: varchar("operator_name", { length: 255 }), // ФИО кассира
  operatorInn: varchar("operator_inn", { length: 12 }), // ИНН кассира
  
  // Суммы и налоги
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  vatAmount: decimal("vat_amount", { precision: 10, scale: 2 }).default("0"),
  cashAmount: decimal("cash_amount", { precision: 10, scale: 2 }).default("0"), // Наличные
  cardAmount: decimal("card_amount", { precision: 10, scale: 2 }).default("0"), // Электронные
  
  // Позиции чека - структурированные данные
  items: jsonb("items").notNull(), // Позиции чека согласно 54-ФЗ
  markingStatus: varchar("marking_status", { length: 20 }).default("not_required"),
  
  // Интеграция и данные ККТ
  fiscalData: jsonb("fiscal_data"), // Фискальные данные от ККТ (ФП, ФД, ФН)
  integrationAccountId: varchar("integration_account_id").references(() => integrationAccounts.id),
  externalReceiptId: varchar("external_receipt_id", { length: 255 }),
  
  // Локальная печать
  localPrintStatus: varchar("local_print_status", { length: 20 }).default("pending"), // pending, queued, printed, failed
  localPrintRequested: boolean("local_print_requested").default(false),
  localPrinterType: varchar("local_printer_type", { length: 20 }), // atol, shtrih
  localPrintedAt: timestamp("local_printed_at"),
  localPrintData: jsonb("local_print_data"), // Результат локальной печати
  localPrintError: text("local_print_error"),
  
  // Статус и ошибки
  errorMessage: text("error_message"),
  sentAt: timestamp("sent_at"), // Время отправки в ОФД
  registeredAt: timestamp("registered_at"), // Время регистрации в ФНС
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => {
  return {
    statusCheck: check("fiscal_receipts_status_check", sql`${table.status} IN ('draft', 'pending', 'registered', 'failed', 'cancelled')`),
    paymentMethodCheck: check("fiscal_receipts_payment_method_check", sql`${table.paymentMethod} IN ('cash', 'card', 'online', 'mixed')`),
    localPrintStatusCheck: check("fiscal_receipts_local_print_status_check", sql`${table.localPrintStatus} IN ('pending', 'queued', 'printed', 'failed')`),
    localPrinterTypeCheck: check("fiscal_receipts_local_printer_type_check", sql`${table.localPrinterType} IS NULL OR ${table.localPrinterType} IN ('atol', 'shtrih')`),
    totalAmountCheck: check("fiscal_receipts_total_amount_check", sql`${table.totalAmount} >= 0`),
    invoiceIdIdx: index("fiscal_receipts_invoice_id_idx").on(table.invoiceId),
    statusIdx: index("fiscal_receipts_status_idx").on(table.status),
    receiptNumberIdx: index("fiscal_receipts_receipt_number_idx").on(table.receiptNumber),
    integrationAccountIdIdx: index("fiscal_receipts_integration_account_id_idx").on(table.integrationAccountId),
    externalReceiptIdIdx: index("fiscal_receipts_external_receipt_id_idx").on(table.externalReceiptId),
    localPrintStatusIdx: index("fiscal_receipts_local_print_status_idx").on(table.localPrintStatus),
    localPrintRequestedIdx: index("fiscal_receipts_local_print_requested_idx").on(table.localPrintRequested),
    createdAtIdx: index("fiscal_receipts_created_at_idx").on(table.createdAt),
  };
});

// Payment Intents table - payment processing tracking
export const paymentIntents = pgTable("payment_intents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  invoiceId: varchar("invoice_id").references(() => invoices.id).notNull(),
  fiscalReceiptId: varchar("fiscal_receipt_id").references(() => fiscalReceipts.id),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }).default("RUB"),
  paymentMethod: varchar("payment_method", { length: 20 }).notNull(),
  status: varchar("status", { length: 20 }).default("pending"),
  integrationAccountId: varchar("integration_account_id").references(() => integrationAccounts.id),
  externalPaymentId: varchar("external_payment_id", { length: 255 }),
  paymentData: jsonb("payment_data"), // Данные платежа от платежной системы
  confirmedAt: timestamp("confirmed_at"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => {
  return {
    statusCheck: check("payment_intents_status_check", sql`${table.status} IN ('pending', 'processing', 'succeeded', 'failed', 'cancelled')`),
    paymentMethodCheck: check("payment_intents_payment_method_check", sql`${table.paymentMethod} IN ('cash', 'card', 'online', 'mixed')`),
    amountCheck: check("payment_intents_amount_check", sql`${table.amount} > 0`),
    invoiceIdIdx: index("payment_intents_invoice_id_idx").on(table.invoiceId),
    fiscalReceiptIdIdx: index("payment_intents_fiscal_receipt_id_idx").on(table.fiscalReceiptId),
    statusIdx: index("payment_intents_status_idx").on(table.status),
    integrationAccountIdIdx: index("payment_intents_integration_account_id_idx").on(table.integrationAccountId),
    externalPaymentIdIdx: index("payment_intents_external_payment_id_idx").on(table.externalPaymentId),
    createdAtIdx: index("payment_intents_created_at_idx").on(table.createdAt),
  };
});

// Integration Jobs table - background sync and processing tasks
export const integrationJobs = pgTable("integration_jobs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  integrationAccountId: varchar("integration_account_id").references(() => integrationAccounts.id).notNull(),
  jobType: varchar("job_type", { length: 50 }).notNull(), // 'sync_catalog', 'send_receipt', 'validate_marking'
  status: varchar("status", { length: 20 }).default("pending"),
  priority: integer("priority").default(5), // 1-10, где 1 - наивысший приоритет
  payload: jsonb("payload"), // Данные для обработки
  result: jsonb("result"), // Результат выполнения
  errorMessage: text("error_message"),
  attemptCount: integer("attempt_count").default(0),
  maxAttempts: integer("max_attempts").default(3),
  nextAttemptAt: timestamp("next_attempt_at"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => {
  return {
    statusCheck: check("integration_jobs_status_check", sql`${table.status} IN ('pending', 'running', 'completed', 'failed', 'retrying')`),
    priorityCheck: check("integration_jobs_priority_check", sql`${table.priority} >= 1 AND ${table.priority} <= 10`),
    integrationAccountIdIdx: index("integration_jobs_integration_account_id_idx").on(table.integrationAccountId),
    jobTypeIdx: index("integration_jobs_job_type_idx").on(table.jobType),
    statusIdx: index("integration_jobs_status_idx").on(table.status),
    priorityIdx: index("integration_jobs_priority_idx").on(table.priority),
    nextAttemptAtIdx: index("integration_jobs_next_attempt_at_idx").on(table.nextAttemptAt),
    createdAtIdx: index("integration_jobs_created_at_idx").on(table.createdAt),
  };
});

// Integration Logs table - audit trail for all integration activities
export const integrationLogs = pgTable("integration_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  integrationAccountId: varchar("integration_account_id").references(() => integrationAccounts.id),
  jobId: varchar("job_id").references(() => integrationJobs.id),
  level: varchar("level", { length: 10 }).default("info"), // 'debug', 'info', 'warn', 'error'
  event: varchar("event", { length: 100 }).notNull(), // Тип события
  message: text("message").notNull(),
  metadata: jsonb("metadata"), // Дополнительные данные
  userId: varchar("user_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => {
  return {
    levelCheck: check("integration_logs_level_check", sql`${table.level} IN ('debug', 'info', 'warn', 'error')`),
    integrationAccountIdIdx: index("integration_logs_integration_account_id_idx").on(table.integrationAccountId),
    jobIdIdx: index("integration_logs_job_id_idx").on(table.jobId),
    levelIdx: index("integration_logs_level_idx").on(table.level),
    eventIdx: index("integration_logs_event_idx").on(table.event),
    userIdIdx: index("integration_logs_user_id_idx").on(table.userId),
    createdAtIdx: index("integration_logs_created_at_idx").on(table.createdAt),
    eventTimeIdx: index("integration_logs_event_time_idx").on(table.event, table.createdAt),
  };
});

// System Settings table - global application settings
export const systemSettings = pgTable("system_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  key: varchar("key", { length: 100 }).notNull().unique(), // Ключ настройки
  value: text("value").notNull(), // Значение настройки
  description: text("description"), // Описание настройки
  category: varchar("category", { length: 50 }).notNull(), // Категория (billing, fiscal, etc.)
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => {
  return {
    keyIdx: index("system_settings_key_idx").on(table.key),
    categoryIdx: index("system_settings_category_idx").on(table.category),
    activeIdx: index("system_settings_active_idx").on(table.isActive),
  };
});

// Invoices table
export const invoices = pgTable("invoices", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").references(() => tenants.id).notNull(),
  invoiceNumber: varchar("invoice_number", { length: 255 }).unique().notNull(),
  patientId: varchar("patient_id").references(() => patients.id).notNull(),
  appointmentId: varchar("appointment_id").references(() => appointments.id),
  issueDate: timestamp("issue_date").defaultNow().notNull(),
  dueDate: timestamp("due_date"),
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
  discount: decimal("discount", { precision: 10, scale: 2 }).default("0"),
  total: decimal("total", { precision: 10, scale: 2 }).notNull(),
  status: varchar("status", { length: 20 }).default("pending"),
  paymentMethod: varchar("payment_method", { length: 100 }),
  paidDate: timestamp("paid_date"),
  paymentId: varchar("payment_id", { length: 255 }), // YooKassa payment ID
  paymentUrl: varchar("payment_url", { length: 500 }), // YooKassa confirmation URL
  fiscalReceiptId: varchar("fiscal_receipt_id", { length: 255 }), // Receipt ID for 54-FZ
  fiscalReceiptUrl: varchar("fiscal_receipt_url", { length: 500 }), // Receipt URL
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => {
  return {
    statusCheck: check("invoices_status_check", sql`${table.status} IN ('draft', 'pending', 'paid', 'overdue', 'cancelled')`),
    subtotalCheck: check("invoices_subtotal_check", sql`${table.subtotal} >= 0`),
    discountCheck: check("invoices_discount_check", sql`${table.discount} >= 0`),
    totalCheck: check("invoices_total_check", sql`${table.total} >= 0`),
    dueDateCheck: check("invoices_due_date_check", sql`${table.dueDate} IS NULL OR ${table.dueDate} >= ${table.issueDate}`),
    tenantIdIdx: index("invoices_tenant_id_idx").on(table.tenantId),
    patientIdIdx: index("invoices_patient_id_idx").on(table.patientId),
    issueDateIdx: index("invoices_issue_date_idx").on(table.issueDate),
    statusIdx: index("invoices_status_idx").on(table.status),
    dueDateIdx: index("invoices_due_date_idx").on(table.dueDate),
    statusIssueDateIdx: index("invoices_status_issue_date_idx").on(table.status, table.issueDate),
    statusDueDateIdx: index("invoices_status_due_date_idx").on(table.status, table.dueDate),
    invoiceNumberIdx: index("invoices_number_idx").on(table.invoiceNumber),
    createdAtIdx: index("invoices_created_at_idx").on(table.createdAt),
  };
});

// Invoice Items table
export const invoiceItems = pgTable("invoice_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  invoiceId: varchar("invoice_id").references(() => invoices.id).notNull(),
  itemType: varchar("item_type", { length: 20 }).notNull(), // 'service' or 'product'
  itemId: varchar("item_id").notNull(), // references services.id or products.id
  itemName: varchar("item_name", { length: 255 }).notNull(),
  quantity: integer("quantity").notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  total: decimal("total", { precision: 10, scale: 2 }).notNull(),
  // Поля для фискальных чеков (54-ФЗ)
  vatRate: varchar("vat_rate", { length: 20 }).default("20"), // '0', '10', '20', 'not_applicable'
  productCode: varchar("product_code", { length: 255 }), // Для маркированных товаров
  markingStatus: varchar("marking_status", { length: 50 }), // Статус маркировки
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => {
  return {
    itemTypeCheck: check("invoice_items_item_type_check", sql`${table.itemType} IN ('service', 'product')`),
    quantityCheck: check("invoice_items_quantity_check", sql`${table.quantity} > 0`),
    priceCheck: check("invoice_items_price_check", sql`${table.price} >= 0`),
    totalCheck: check("invoice_items_total_check", sql`${table.total} >= 0`),
    invoiceIdIdx: index("invoice_items_invoice_id_idx").on(table.invoiceId),
    itemTypeIdx: index("invoice_items_item_type_idx").on(table.itemType),
    itemIdIdx: index("invoice_items_item_id_idx").on(table.itemId),
  };
});

// Patient Files table for storing medical images, receipts, and documents
export const patientFiles = pgTable("patient_files", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  patientId: varchar("patient_id").references(() => patients.id).notNull(),
  fileName: varchar("file_name", { length: 255 }).notNull(),
  originalName: varchar("original_name", { length: 255 }).notNull(),
  fileType: varchar("file_type", { length: 50 }).notNull(),
  mimeType: varchar("mime_type", { length: 100 }).notNull(),
  fileSize: integer("file_size").notNull(), // in bytes
  filePath: text("file_path").notNull(),
  description: text("description"),
  uploadedBy: varchar("uploaded_by").references(() => users.id).notNull(),
  medicalRecordId: varchar("medical_record_id").references(() => medicalRecords.id), // optional link to medical record
  vetaisId: integer("vetais_id"), // ID из Vetais (medical_media_data)
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => {
  return {
    fileTypeCheck: check("patient_files_file_type_check", sql`${table.fileType} IN ('medical_image', 'xray', 'scan', 'receipt', 'lab_result', 'vaccine_record', 'document', 'other')`),
    fileSizeCheck: check("patient_files_file_size_check", sql`${table.fileSize} > 0`),
    patientIdIdx: index("patient_files_patient_id_idx").on(table.patientId),
    fileTypeIdx: index("patient_files_file_type_idx").on(table.fileType),
    uploadedByIdx: index("patient_files_uploaded_by_idx").on(table.uploadedBy),
    medicalRecordIdIdx: index("patient_files_medical_record_id_idx").on(table.medicalRecordId),
    createdAtIdx: index("patient_files_created_at_idx").on(table.createdAt),
    patientTypeIdx: index("patient_files_patient_type_idx").on(table.patientId, table.fileType),
    vetaisIdIdx: index("patient_files_vetais_id_idx").on(table.vetaisId),
  };
});

// Laboratory Studies catalog - справочник исследований
export const labStudies = pgTable("lab_studies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").references(() => tenants.id).notNull(),
  name: varchar("name", { length: 255 }).notNull(), // "Общий анализ крови", "Биохимический анализ"
  category: varchar("category", { length: 100 }).notNull(), // "гематология", "биохимия", "цитология"
  code: varchar("code", { length: 50 }).unique(), // internal code for integration
  description: text("description"),
  preparationInstructions: text("preparation_instructions"), // подготовка к анализу
  sampleType: varchar("sample_type", { length: 100 }), // "кровь", "моча", "кал"
  estimatedDuration: integer("estimated_duration"), // время выполнения в часах
  price: decimal("price", { precision: 10, scale: 2 }),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => {
  return {
    tenantIdIdx: index("lab_studies_tenant_id_idx").on(table.tenantId),
    nameIdx: index("lab_studies_name_idx").on(table.name),
    categoryIdx: index("lab_studies_category_idx").on(table.category),
    codeIdx: index("lab_studies_code_idx").on(table.code),
    activeIdx: index("lab_studies_active_idx").on(table.isActive),
  };
});

// Laboratory Parameters catalog - справочник показателей
export const labParameters = pgTable("lab_parameters", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  studyId: varchar("study_id").references(() => labStudies.id).notNull(),
  name: varchar("name", { length: 255 }).notNull(), // "Гемоглобин", "Эритроциты"
  code: varchar("code", { length: 50 }), // internal code
  unit: varchar("unit", { length: 50 }).notNull(), // "г/л", "ммоль/л", "%"
  dataType: varchar("data_type", { length: 20 }).default("numeric"), // numeric, text, boolean
  sortOrder: integer("sort_order").default(0), // порядок отображения
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => {
  return {
    studyIdIdx: index("lab_parameters_study_id_idx").on(table.studyId),
    nameIdx: index("lab_parameters_name_idx").on(table.name),
    codeIdx: index("lab_parameters_code_idx").on(table.code),
    activeIdx: index("lab_parameters_active_idx").on(table.isActive),
    sortOrderIdx: index("lab_parameters_sort_order_idx").on(table.studyId, table.sortOrder),
  };
});

// Reference Ranges - референсные значения (нормы)
export const referenceRanges = pgTable("reference_ranges", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  parameterId: varchar("parameter_id").references(() => labParameters.id).notNull(),
  species: varchar("species", { length: 100 }).notNull(), // "собака", "кошка"
  breed: varchar("breed", { length: 255 }), // порода, null = для всех пород
  gender: varchar("gender", { length: 10 }), // male, female, null = для всех
  ageMin: integer("age_min"), // минимальный возраст в месяцах, null = без ограничений
  ageMax: integer("age_max"), // максимальный возраст в месяцах, null = без ограничений
  rangeMin: decimal("range_min", { precision: 15, scale: 6 }), // минимальное нормальное значение
  rangeMax: decimal("range_max", { precision: 15, scale: 6 }), // максимальное нормальное значение
  criticalMin: decimal("critical_min", { precision: 15, scale: 6 }), // критически низкое
  criticalMax: decimal("critical_max", { precision: 15, scale: 6 }), // критически высокое
  notes: text("notes"), // дополнительные заметки
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => {
  return {
    parameterIdIdx: index("reference_ranges_parameter_id_idx").on(table.parameterId),
    speciesIdx: index("reference_ranges_species_idx").on(table.species),
    breedIdx: index("reference_ranges_breed_idx").on(table.breed),
    activeIdx: index("reference_ranges_active_idx").on(table.isActive),
    parameterSpeciesIdx: index("reference_ranges_parameter_species_idx").on(table.parameterId, table.species),
  };
});

// Laboratory Orders - заказы на анализы
export const labOrders = pgTable("lab_orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").references(() => tenants.id).notNull(),
  orderNumber: varchar("order_number", { length: 50 }).unique().notNull(),
  patientId: varchar("patient_id").references(() => patients.id).notNull(),
  doctorId: varchar("doctor_id").references(() => doctors.id).notNull(),
  appointmentId: varchar("appointment_id").references(() => appointments.id), // привязка к визиту
  medicalRecordId: varchar("medical_record_id").references(() => medicalRecords.id),
  studyId: varchar("study_id").references(() => labStudies.id).notNull(),
  status: varchar("status", { length: 20 }).default("pending"),
  urgency: varchar("urgency", { length: 20 }).default("routine"),
  orderedDate: timestamp("ordered_date").defaultNow().notNull(),
  sampleTakenDate: timestamp("sample_taken_date"),
  expectedDate: timestamp("expected_date"), // ожидаемая дата готовности
  completedDate: timestamp("completed_date"),
  notes: text("notes"),
  branchId: varchar("branch_id").references(() => branches.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => {
  return {
    statusCheck: check("lab_orders_status_check", sql`${table.status} IN ('pending', 'sample_taken', 'in_progress', 'completed', 'cancelled')`),
    urgencyCheck: check("lab_orders_urgency_check", sql`${table.urgency} IN ('routine', 'urgent', 'stat')`),
    tenantIdIdx: index("lab_orders_tenant_id_idx").on(table.tenantId),
    patientIdIdx: index("lab_orders_patient_id_idx").on(table.patientId),
    doctorIdIdx: index("lab_orders_doctor_id_idx").on(table.doctorId),
    studyIdIdx: index("lab_orders_study_id_idx").on(table.studyId),
    statusIdx: index("lab_orders_status_idx").on(table.status),
    orderedDateIdx: index("lab_orders_ordered_date_idx").on(table.orderedDate),
    urgencyIdx: index("lab_orders_urgency_idx").on(table.urgency),
    orderNumberIdx: index("lab_orders_order_number_idx").on(table.orderNumber),
    branchIdIdx: index("lab_orders_branch_id_idx").on(table.branchId),
  };
});

// Laboratory Results table for storing lab test results
export const labResults = pgTable("lab_results", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  patientId: varchar("patient_id").references(() => patients.id).notNull(),
  doctorId: varchar("doctor_id").references(() => doctors.id).notNull(),
  medicalRecordId: varchar("medical_record_id").references(() => medicalRecords.id),
  testType: varchar("test_type", { length: 255 }).notNull(), // e.g., "Биохимический анализ крови", "Общий анализ мочи"
  testName: varchar("test_name", { length: 255 }).notNull(), // specific test name
  results: jsonb("results").notNull(), // { "parameter": { "value": "10.5", "unit": "g/dL", "status": "normal|abnormal|critical" } }
  normalRanges: jsonb("normal_ranges"), // reference ranges for interpretation
  status: varchar("status", { length: 20 }).default("pending"),
  performedDate: timestamp("performed_date").notNull(),
  receivedDate: timestamp("received_date").defaultNow().notNull(),
  notes: text("notes"),
  labTechnicianName: varchar("lab_technician_name", { length: 255 }),
  urgency: varchar("urgency", { length: 20 }).default("normal"), // normal, urgent, stat
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => {
  return {
    statusCheck: check("lab_results_status_check", sql`${table.status} IN ('pending', 'in_progress', 'completed', 'abnormal', 'critical')`),
    urgencyCheck: check("lab_results_urgency_check", sql`${table.urgency} IN ('normal', 'urgent', 'stat')`),
    patientIdIdx: index("lab_results_patient_id_idx").on(table.patientId),
    doctorIdIdx: index("lab_results_doctor_id_idx").on(table.doctorId),
    medicalRecordIdIdx: index("lab_results_medical_record_id_idx").on(table.medicalRecordId),
    testTypeIdx: index("lab_results_test_type_idx").on(table.testType),
    statusIdx: index("lab_results_status_idx").on(table.status),
    performedDateIdx: index("lab_results_performed_date_idx").on(table.performedDate),
    receivedDateIdx: index("lab_results_received_date_idx").on(table.receivedDate),
    urgencyIdx: index("lab_results_urgency_idx").on(table.urgency),
    patientDateIdx: index("lab_results_patient_date_idx").on(table.patientId, table.performedDate),
    statusDateIdx: index("lab_results_status_date_idx").on(table.status, table.performedDate),
    createdAtIdx: index("lab_results_created_at_idx").on(table.createdAt),
  };
});

// Laboratory Result Details - детализированные результаты (новая система)
export const labResultDetails = pgTable("lab_result_details", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: varchar("order_id").references(() => labOrders.id).notNull(),
  parameterId: varchar("parameter_id").references(() => labParameters.id).notNull(),
  value: varchar("value", { length: 255 }), // значение результата (может быть текстом)
  numericValue: decimal("numeric_value", { precision: 15, scale: 6 }), // числовое значение для графиков
  status: varchar("status", { length: 20 }).default("normal"), // normal, low, high, critical_low, critical_high
  referenceRangeId: varchar("reference_range_id").references(() => referenceRanges.id),
  flags: varchar("flags", { length: 50 }), // дополнительные флаги (например, "H", "L", "*")
  notes: text("notes"),
  reportedDate: timestamp("reported_date").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => {
  return {
    statusCheck: check("lab_result_details_status_check", sql`${table.status} IN ('normal', 'low', 'high', 'critical_low', 'critical_high')`),
    orderIdIdx: index("lab_result_details_order_id_idx").on(table.orderId),
    parameterIdIdx: index("lab_result_details_parameter_id_idx").on(table.parameterId),
    statusIdx: index("lab_result_details_status_idx").on(table.status),
    reportedDateIdx: index("lab_result_details_reported_date_idx").on(table.reportedDate),
    orderParameterIdx: index("lab_result_details_order_parameter_idx").on(table.orderId, table.parameterId),
  };
});

// Define relations
export const ownersRelations = relations(owners, ({ many }) => ({
  patients: many(patients),
}));

export const patientsRelations = relations(patients, ({ one, many }) => ({
  owner: one(owners, {
    fields: [patients.ownerId],
    references: [owners.id],
  }),
  appointments: many(appointments),
  medicalRecords: many(medicalRecords),
  invoices: many(invoices),
  files: many(patientFiles),
  labResults: many(labResults),
  labOrders: many(labOrders),
}));

export const doctorsRelations = relations(doctors, ({ many }) => ({
  appointments: many(appointments),
  medicalRecords: many(medicalRecords),
  labResults: many(labResults),
  labOrders: many(labOrders),
}));

export const appointmentsRelations = relations(appointments, ({ one, many }) => ({
  patient: one(patients, {
    fields: [appointments.patientId],
    references: [patients.id],
  }),
  doctor: one(doctors, {
    fields: [appointments.doctorId],
    references: [doctors.id],
  }),
  medicalRecords: many(medicalRecords),
  invoices: many(invoices),
  queueEntries: many(queueEntries),
}));

export const queueEntriesRelations = relations(queueEntries, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [queueEntries.tenantId],
    references: [tenants.id],
  }),
  branch: one(branches, {
    fields: [queueEntries.branchId],
    references: [branches.id],
  }),
  appointment: one(appointments, {
    fields: [queueEntries.appointmentId],
    references: [appointments.id],
  }),
  patient: one(patients, {
    fields: [queueEntries.patientId],
    references: [patients.id],
  }),
  owner: one(owners, {
    fields: [queueEntries.ownerId],
    references: [owners.id],
  }),
  calls: many(queueCalls),
}));

export const queueCallsRelations = relations(queueCalls, ({ one }) => ({
  tenant: one(tenants, {
    fields: [queueCalls.tenantId],
    references: [tenants.id],
  }),
  branch: one(branches, {
    fields: [queueCalls.branchId],
    references: [branches.id],
  }),
  queueEntry: one(queueEntries, {
    fields: [queueCalls.queueEntryId],
    references: [queueEntries.id],
  }),
  calledByUser: one(users, {
    fields: [queueCalls.calledBy],
    references: [users.id],
  }),
}));

export const medicalRecordsRelations = relations(medicalRecords, ({ one, many }) => ({
  patient: one(patients, {
    fields: [medicalRecords.patientId],
    references: [patients.id],
  }),
  doctor: one(doctors, {
    fields: [medicalRecords.doctorId],
    references: [doctors.id],
  }),
  appointment: one(appointments, {
    fields: [medicalRecords.appointmentId],
    references: [appointments.id],
  }),
  medications: many(medications),
  files: many(patientFiles),
  labResults: many(labResults),
}));

export const medicationsRelations = relations(medications, ({ one }) => ({
  record: one(medicalRecords, {
    fields: [medications.recordId],
    references: [medicalRecords.id],
  }),
}));

export const invoicesRelations = relations(invoices, ({ one, many }) => ({
  patient: one(patients, {
    fields: [invoices.patientId],
    references: [patients.id],
  }),
  appointment: one(appointments, {
    fields: [invoices.appointmentId],
    references: [appointments.id],
  }),
  items: many(invoiceItems),
}));

export const invoiceItemsRelations = relations(invoiceItems, ({ one }) => ({
  invoice: one(invoices, {
    fields: [invoiceItems.invoiceId],
    references: [invoices.id],
  }),
}));

// Relations for new tables
export const patientFilesRelations = relations(patientFiles, ({ one }) => ({
  patient: one(patients, {
    fields: [patientFiles.patientId],
    references: [patients.id],
  }),
  uploadedByUser: one(users, {
    fields: [patientFiles.uploadedBy],
    references: [users.id],
  }),
  medicalRecord: one(medicalRecords, {
    fields: [patientFiles.medicalRecordId],
    references: [medicalRecords.id],
  }),
}));

export const labResultsRelations = relations(labResults, ({ one }) => ({
  patient: one(patients, {
    fields: [labResults.patientId],
    references: [patients.id],
  }),
  doctor: one(doctors, {
    fields: [labResults.doctorId],
    references: [doctors.id],
  }),
  medicalRecord: one(medicalRecords, {
    fields: [labResults.medicalRecordId],
    references: [medicalRecords.id],
  }),
}));

// Relations for new laboratory system
export const labStudiesRelations = relations(labStudies, ({ many }) => ({
  parameters: many(labParameters),
  orders: many(labOrders),
}));

export const labParametersRelations = relations(labParameters, ({ one, many }) => ({
  study: one(labStudies, {
    fields: [labParameters.studyId],
    references: [labStudies.id],
  }),
  referenceRanges: many(referenceRanges),
  resultDetails: many(labResultDetails),
}));

export const referenceRangesRelations = relations(referenceRanges, ({ one, many }) => ({
  parameter: one(labParameters, {
    fields: [referenceRanges.parameterId],
    references: [labParameters.id],
  }),
  resultDetails: many(labResultDetails),
}));

export const labOrdersRelations = relations(labOrders, ({ one, many }) => ({
  patient: one(patients, {
    fields: [labOrders.patientId],
    references: [patients.id],
  }),
  doctor: one(doctors, {
    fields: [labOrders.doctorId],
    references: [doctors.id],
  }),
  appointment: one(appointments, {
    fields: [labOrders.appointmentId],
    references: [appointments.id],
  }),
  medicalRecord: one(medicalRecords, {
    fields: [labOrders.medicalRecordId],
    references: [medicalRecords.id],
  }),
  study: one(labStudies, {
    fields: [labOrders.studyId],
    references: [labStudies.id],
  }),
  resultDetails: many(labResultDetails),
}));

export const labResultDetailsRelations = relations(labResultDetails, ({ one }) => ({
  order: one(labOrders, {
    fields: [labResultDetails.orderId],
    references: [labOrders.id],
  }),
  parameter: one(labParameters, {
    fields: [labResultDetails.parameterId],
    references: [labParameters.id],
  }),
  referenceRange: one(referenceRanges, {
    fields: [labResultDetails.referenceRangeId],
    references: [referenceRanges.id],
  }),
}));

// Integration and fiscal tables relations
export const catalogItemsRelations = relations(catalogItems, ({ many }) => ({
  markings: many(catalogItemMarkings),
}));

export const catalogItemMarkingsRelations = relations(catalogItemMarkings, ({ one }) => ({
  catalogItem: one(catalogItems, {
    fields: [catalogItemMarkings.catalogItemId],
    references: [catalogItems.id],
  }),
}));

export const integrationAccountsRelations = relations(integrationAccounts, ({ many }) => ({
  mappings: many(integrationMappings),
  fiscalReceipts: many(fiscalReceipts),
  paymentIntents: many(paymentIntents),
  jobs: many(integrationJobs),
  logs: many(integrationLogs),
}));

export const integrationMappingsRelations = relations(integrationMappings, ({ one }) => ({
  integrationAccount: one(integrationAccounts, {
    fields: [integrationMappings.integrationAccountId],
    references: [integrationAccounts.id],
  }),
}));

export const fiscalReceiptsRelations = relations(fiscalReceipts, ({ one, many }) => ({
  invoice: one(invoices, {
    fields: [fiscalReceipts.invoiceId],
    references: [invoices.id],
  }),
  integrationAccount: one(integrationAccounts, {
    fields: [fiscalReceipts.integrationAccountId],
    references: [integrationAccounts.id],
  }),
  paymentIntents: many(paymentIntents),
}));

export const paymentIntentsRelations = relations(paymentIntents, ({ one }) => ({
  invoice: one(invoices, {
    fields: [paymentIntents.invoiceId],
    references: [invoices.id],
  }),
  fiscalReceipt: one(fiscalReceipts, {
    fields: [paymentIntents.fiscalReceiptId],
    references: [fiscalReceipts.id],
  }),
  integrationAccount: one(integrationAccounts, {
    fields: [paymentIntents.integrationAccountId],
    references: [integrationAccounts.id],
  }),
}));

export const integrationJobsRelations = relations(integrationJobs, ({ one, many }) => ({
  integrationAccount: one(integrationAccounts, {
    fields: [integrationJobs.integrationAccountId],
    references: [integrationAccounts.id],
  }),
  logs: many(integrationLogs),
}));

export const integrationLogsRelations = relations(integrationLogs, ({ one }) => ({
  integrationAccount: one(integrationAccounts, {
    fields: [integrationLogs.integrationAccountId],
    references: [integrationAccounts.id],
  }),
  job: one(integrationJobs, {
    fields: [integrationLogs.jobId],
    references: [integrationJobs.id],
  }),
  user: one(users, {
    fields: [integrationLogs.userId],
    references: [users.id],
  }),
}));

// Enhanced user schema with roles and full user data - MATCHES REPLIT ORIGINAL SCHEMA
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  lastLogin: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  role: z.enum(["admin", "user", "врач", "администратор", "менеджер"] as const),
  status: z.enum(["active", "inactive"] as const).default("active"),
  password: z.string()
    .min(10, "Пароль должен содержать минимум 10 символов для медицинских систем")
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$/, 
           "Пароль должен содержать: строчные буквы (a-z), заглавные буквы (A-Z), цифры (0-9) и специальные символы (@$!%*?&)"),
  username: z.string().min(3, "Имя пользователя должно содержать минимум 3 символа"),
  fullName: z.string().min(2, "Полное имя должно содержать минимум 2 символа"),
  email: z.string().email("Неверный формат email").optional(),
  phone: z.string().optional(),
  phoneVerified: z.boolean().default(false),
  twoFactorEnabled: z.boolean().default(false),
  twoFactorMethod: z.enum(["sms", "disabled"] as const).default("sms"),
});

// Schema for updating user - password is completely optional for editing
export const updateUserSchema = createInsertSchema(users).omit({
  id: true,
  lastLogin: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  role: z.enum(["admin", "user", "врач", "администратор", "менеджер"] as const),
  status: z.enum(["active", "inactive"] as const).default("active"),
  password: z.string().optional(), // Completely optional - no validation when empty
  username: z.string().min(3, "Имя пользователя должно содержать минимум 3 символа"),
  fullName: z.string().min(2, "Полное имя должно содержать минимум 2 символа"),
  email: z.string().email("Неверный формат email").optional(),
  phone: z.string().optional(),
  phoneVerified: z.boolean().default(false),
  twoFactorEnabled: z.boolean().default(false),
  twoFactorMethod: z.enum(["sms", "disabled"] as const).default("sms"),
});

// Login schema for authentication - MATCHES REPLIT ORIGINAL SCHEMA
export const loginSchema = z.object({
  username: z.string().min(1, "Имя пользователя обязательно"),
  password: z.string().min(1, "Пароль обязателен"),
  branchId: z.string().min(1, "Выбор филиала обязателен"),
});

// ROLE_PERMISSIONS moved to client/src/contexts/AuthContext.tsx to avoid HMR cascades

// Tenant schema for validation
export const insertTenantSchema = createInsertSchema(tenants).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  status: z.enum(TENANT_STATUS).default("trial"),
  legalEntityId: z.string().uuid("Неверный формат ID юр.лица").optional().or(z.literal("")),
  slug: z.string().min(3, "Slug должен содержать минимум 3 символа").regex(/^[a-z0-9-]+$/, "Slug может содержать только строчные буквы, цифры и дефисы"),
  email: z.string().email("Неверный формат email").optional().or(z.literal("")),
  billingEmail: z.string().email("Неверный формат email").optional().or(z.literal("")),
  phone: z.string().optional(),
  inn: z.string().regex(/^\d{10}$/).or(z.string().regex(/^\d{12}$/)).or(z.literal("")).optional(), // ИНН может быть 10 или 12 цифр
  kpp: z.string().regex(/^\d{9}$/).or(z.literal("")).optional(), // КПП должен состоять из 9 цифр
  ogrn: z.string().regex(/^\d{13}$/).or(z.string().regex(/^\d{15}$/)).or(z.literal("")).optional(), // ОГРН 13 цифр, ОГРНИП 15 цифр
  veterinaryLicenseNumber: z.string().optional(),
  veterinaryLicenseIssueDate: z.coerce.date().optional(),
  logoUrl: z.string().url("Неверный формат URL").optional().or(z.literal("")),
});

export type Tenant = typeof tenants.$inferSelect;
export type InsertTenant = z.infer<typeof insertTenantSchema>;

// Branch schema for validation
export const insertBranchSchema = createInsertSchema(branches).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  legalEntityId: z.string().uuid("Неверный формат ID юр.лица").optional().or(z.literal("")),
  status: z.enum(["active", "inactive", "maintenance"] as const).default("active"),
  phone: z.string().regex(/^\+?[1-9]\d{10,14}$/, "Неверный формат номера телефона").optional().or(z.literal("")),
  email: z.string().email().optional().or(z.literal("")),
});

// Legal Entity schema for validation
export const insertLegalEntitySchema = createInsertSchema(legalEntities).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  legalName: z.string().min(3, "Полное наименование должно содержать минимум 3 символа"),
  shortName: z.string().optional(),
  inn: z.string().regex(/^\d{10}$/, "ИНН юр.лица должен состоять из 10 цифр").or(z.string().regex(/^\d{12}$/, "ИНН ИП должен состоять из 12 цифр")),
  kpp: z.string().regex(/^\d{9}$/, "КПП должен состоять из 9 цифр").optional().or(z.literal("")),
  ogrn: z.string().regex(/^\d{13}$/, "ОГРН должен состоять из 13 цифр").or(z.string().regex(/^\d{15}$/, "ОГРНИП должен состоять из 15 цифр")),
  legalAddress: z.string().min(10, "Юридический адрес должен содержать минимум 10 символов"),
  actualAddress: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("Неверный формат email").optional().or(z.literal("")),
  website: z.string().url("Неверный формат URL").optional().or(z.literal("")),
  bankName: z.string().optional(),
  bik: z.string().regex(/^\d{9}$/, "БИК должен состоять из 9 цифр").optional().or(z.literal("")),
  correspondentAccount: z.string().regex(/^\d{20}$/, "Корр. счет должен состоять из 20 цифр").optional().or(z.literal("")),
  paymentAccount: z.string().regex(/^\d{20}$/, "Расчетный счет должен состоять из 20 цифр").optional().or(z.literal("")),
  directorName: z.string().optional(),
  directorPosition: z.string().optional(),
  accountantName: z.string().optional(),
  veterinaryLicenseNumber: z.string().optional(),
  veterinaryLicenseIssueDate: z.union([z.coerce.date(), z.literal("")]).transform(val => val === "" ? undefined : val).optional(),
  veterinaryLicenseIssuedBy: z.string().optional(),
  logoUrl: z.string().url("Неверный формат URL").optional().or(z.literal("")),
  stampUrl: z.string().url("Неверный формат URL").optional().or(z.literal("")),
  notes: z.string().optional(),
  isActive: z.boolean().default(true),
});

export type LegalEntity = typeof legalEntities.$inferSelect;
export type InsertLegalEntity = z.infer<typeof insertLegalEntitySchema>;

// Zod schemas for validation
export const insertOwnerSchema = createInsertSchema(owners).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  email: z.string().email().optional().or(z.literal("")),
  dateOfBirth: z.union([z.coerce.date(), z.literal("")]).transform(val => val === "" ? undefined : val).optional(),
  gender: z.string().optional().or(z.literal("")),
  passportSeries: z.string().regex(/^\d{4}$/, "Серия паспорта должна состоять из 4 цифр").or(z.literal("")).optional(),
  passportNumber: z.string().regex(/^\d{6}$/, "Номер паспорта должен состоять из 6 цифр").or(z.literal("")).optional(),
  passportIssuedBy: z.string().optional(),
  passportIssueDate: z.union([z.coerce.date(), z.literal("")]).transform(val => val === "" ? undefined : val).optional(),
  registrationAddress: z.string().optional(),
  residenceAddress: z.string().optional(),
  personalDataConsentGiven: z.boolean().default(false),
  personalDataConsentDate: z.union([z.coerce.date(), z.literal("")]).transform(val => val === "" ? undefined : val).optional(),
});

export const insertPatientSchema = createInsertSchema(patients).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  status: z.enum(PATIENT_STATUS).default("healthy"),
  gender: z.enum(PATIENT_GENDER).optional(),
  birthDate: z.coerce.date().optional(),
  weight: z.coerce.number().min(0, "Weight must be positive").transform(val => val?.toString()).optional(),
});

export const insertPatientOwnerSchema = createInsertSchema(patientOwners).omit({
  id: true,
  createdAt: true,
}).extend({
  isPrimary: z.boolean().default(false),
});

export const insertDoctorSchema = createInsertSchema(doctors).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  email: z.string().email().optional().or(z.literal("")),
});

export const insertAppointmentSchema = createInsertSchema(appointments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  tenantId: true, // Added on server
  branchId: true, // Added on server
}).extend({
  status: z.enum(APPOINTMENT_STATUS).default("scheduled"),
  appointmentDate: z.coerce.date(),
  duration: z.number().int().min(1, "Duration must be at least 1 minute"),
  appointmentType: z.string().min(1, "Appointment type is required").or(z.literal("")).transform(val => val || "Консультация"),
});

export const insertQueueEntrySchema = createInsertSchema(queueEntries).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  status: z.enum(QUEUE_STATUS).default("waiting"),
  priority: z.enum(QUEUE_PRIORITY).default("normal"),
  arrivalTime: z.coerce.date().optional(),
  expectedWaitTime: z.number().int().min(0).optional().nullable(),
});

export const insertQueueCallSchema = createInsertSchema(queueCalls).omit({
  id: true,
  createdAt: true,
}).extend({
  calledAt: z.coerce.date().optional(),
  displayedUntil: z.coerce.date().optional().nullable(),
  voiceAnnounced: z.boolean().default(false),
  acknowledged: z.boolean().default(false),
});

export const insertMedicalRecordSchema = createInsertSchema(medicalRecords).omit({
  id: true,
  tenantId: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  status: z.enum(MEDICAL_RECORD_STATUS).default("active"),
  visitDate: z.coerce.date(),
  nextVisit: z.coerce.date().optional().nullable(),
  temperature: z.string().optional().nullable().transform(val => {
    if (!val || val === '') return undefined;
    const num = parseFloat(val);
    if (isNaN(num)) return undefined;
    if (num < 30 || num > 45) throw new Error("Temperature must be between 30-45°C");
    return val;
  }),
  weight: z.string().optional().nullable().transform(val => {
    if (!val || val === '') return undefined;
    const num = parseFloat(val);
    if (isNaN(num)) return undefined;
    if (num < 0) throw new Error("Weight must be positive");
    return val;
  }),
});

export const insertMedicationSchema = createInsertSchema(medications).omit({
  id: true,
  createdAt: true,
});

export const insertServiceSchema = createInsertSchema(services).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  price: z.coerce.number().min(0, "Price must be positive").transform(val => val.toString()),
  duration: z.number().int().min(1, "Duration must be at least 1 minute").optional(),
});

export const insertProductSchema = createInsertSchema(products).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  price: z.coerce.number().min(0, "Price must be positive").transform(val => val.toString()),
  stock: z.number().int().min(0, "Stock cannot be negative").default(0),
  minStock: z.number().int().min(0, "Min stock cannot be negative").default(0),
  unitsPerPackage: z.number().int().min(1, "Units per package must be at least 1").default(1),
  vat: z.number().int().nullable().optional(), // null (без НДС), 0, 5, 7, 10, 20
  isMarked: z.boolean().default(false),
  productType: z.enum(['product', 'service']).default('product'),
});

export const insertInvoiceSchema = createInsertSchema(invoices).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  invoiceNumber: z.string().optional(), // Make invoiceNumber optional for auto-generation
  status: z.enum(INVOICE_STATUS).default("pending"),
  issueDate: z.coerce.date().optional(),
  dueDate: z.preprocess((val) => {
    // Convert empty strings to null/undefined
    if (val === '' || val === null || val === undefined) return undefined;
    return val;
  }, z.coerce.date().optional()),
  subtotal: z.coerce.number().min(0, "Subtotal must be positive").transform(val => val.toString()),
  discount: z.coerce.number().min(0, "Discount cannot be negative").default(0).transform(val => val.toString()),
  total: z.coerce.number().min(0, "Total must be positive").transform(val => val.toString()),
});

export const insertInvoiceItemSchema = createInsertSchema(invoiceItems).omit({
  id: true,
  createdAt: true,
}).extend({
  itemType: z.enum(INVOICE_ITEM_TYPE),
  quantity: z.number().int().min(1, "Quantity must be at least 1"),
  price: z.coerce.number().min(0, "Price must be positive").transform(val => val.toString()),
  total: z.coerce.number().min(0, "Total must be positive").transform(val => val.toString()),
  // Поля для фискальных чеков (54-ФЗ)
  vatRate: z.enum(['0', '10', '20', 'not_applicable']).default('20').optional(),
  productCode: z.string().optional(), // Для маркированных товаров  
  markingStatus: z.string().optional(), // Статус маркировки
});

// Patient Files schema for validation
export const insertPatientFileSchema = createInsertSchema(patientFiles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  fileType: z.enum(FILE_TYPES),
  fileSize: z.number().min(1, "Размер файла должен быть больше 0").max(50 * 1024 * 1024, "Размер файла не должен превышать 50MB"),
  originalName: z.string().min(1, "Имя файла обязательно"),
  fileName: z.string().min(1, "Имя файла в системе обязательно"),
  mimeType: z.string().min(1, "MIME тип обязателен"),
  filePath: z.string().min(1, "Путь к файлу обязателен"),
  description: z.string().optional(),
});

// Lab Results schema for validation
export const insertLabResultSchema = createInsertSchema(labResults).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  status: z.enum(LAB_RESULT_STATUS).default("pending"),
  urgency: z.enum(["normal", "urgent", "stat"] as const).default("normal"),
  testType: z.string().min(1, "Тип анализа обязателен"),
  testName: z.string().min(1, "Название анализа обязательно"),
  performedDate: z.coerce.date(),
  receivedDate: z.coerce.date().optional(),
  results: z.record(z.string(), z.object({
    value: z.string(),
    unit: z.string().optional(),
    status: z.enum(["normal", "abnormal", "critical"] as const).optional(),
  })).refine(results => Object.keys(results).length > 0, "Результаты анализа не могут быть пустыми"),
  normalRanges: z.record(z.string(), z.object({
    min: z.string().optional(),
    max: z.string().optional(),
    reference: z.string().optional(),
  })).optional(),
  notes: z.string().optional(),
  labTechnicianName: z.string().optional(),
});

// New Laboratory System Validation Schemas
export const insertLabStudySchema = createInsertSchema(labStudies).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  name: z.string().min(1, "Название исследования обязательно").max(255, "Название слишком длинное"),
  category: z.string().min(1, "Категория исследования обязательна").max(100, "Категория слишком длинная"),
  code: z.string().max(50, "Код слишком длинный").optional(),
  description: z.string().optional(),
  preparationInstructions: z.string().optional(),
  sampleType: z.string().optional(),
  estimatedDuration: z.number().int().min(1).optional(),
  price: z.string().optional().refine(
    (val) => !val || (!isNaN(Number(val)) && Number(val) >= 0),
    "Цена должна быть положительным числом"
  ),
  isActive: z.boolean().default(true),
});

export const insertLabParameterSchema = createInsertSchema(labParameters).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  name: z.string().min(1, "Название параметра обязательно"),
  code: z.string().min(1, "Код параметра обязателен"),
  unit: z.string().min(1, "Единица измерения обязательна"),
  dataType: z.enum(["numeric", "text", "boolean"] as const),
  sortOrder: z.number().int().min(0),
  isActive: z.boolean().default(true),
});

export const insertReferenceRangeSchema = createInsertSchema(referenceRanges).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  species: z.string().min(1, "Вид животного обязателен"),
  breed: z.string().optional(),
  ageMin: z.number().min(0, "Минимальный возраст не может быть отрицательным").optional(),
  ageMax: z.number().min(0, "Максимальный возраст не может быть отрицательным").optional(),
  sex: z.enum(["male", "female", "both"] as const).default("both"),
  minValue: z.coerce.number().optional(),
  maxValue: z.coerce.number().optional(),
  textValue: z.string().optional(),
  isActive: z.boolean().default(true),
});

export const insertLabOrderSchema = createInsertSchema(labOrders).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  orderDate: z.coerce.date(),
  status: z.enum(["ordered", "collected", "processing", "completed", "cancelled"] as const).default("ordered"),
  urgency: z.enum(["normal", "urgent", "stat"] as const).default("normal"),
  sampleId: z.string().optional(),
  sampleCollectedDate: z.coerce.date().optional(),
  notes: z.string().optional(),
  requestedBy: z.string().optional(),
});

export const insertLabResultDetailSchema = createInsertSchema(labResultDetails).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  value: z.string().min(1, "Значение результата обязательно"),
  numericValue: z.coerce.number().optional(),
  flag: z.enum(["normal", "low", "high", "critical", "abnormal"] as const).default("normal"),
  isAbnormal: z.boolean().default(false),
  testedDate: z.coerce.date().optional(),
  comments: z.string().optional(),
  qualityControl: z.record(z.string(), z.any()).optional(),
});

// Integration and fiscal schemas
export const insertCatalogItemSchema = createInsertSchema(catalogItems).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  type: z.enum(CATALOG_ITEM_TYPE),
  vatRate: z.enum(VAT_RATE).default("20"),
  markingStatus: z.enum(MARKING_STATUS).default("not_required"),
  name: z.string().min(1, "Название обязательно"),
  price: z.coerce.number().min(0, "Цена не может быть отрицательной"),
  stock: z.coerce.number().min(0, "Остаток не может быть отрицательным").optional(),
  minStock: z.coerce.number().min(0, "Минимальный остаток не может быть отрицательным").optional(),
  duration: z.coerce.number().min(1, "Длительность должна быть положительной").optional(),
});

export const insertCatalogItemMarkingSchema = createInsertSchema(catalogItemMarkings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  dataMatrixCode: z.string().min(1, "DataMatrix код обязателен"),
  gtin: z.string().optional(),
  serialNumber: z.string().optional(),
  productionDate: z.coerce.date().optional(),
  expiryDate: z.coerce.date().optional(),
});

export const insertIntegrationAccountSchema = createInsertSchema(integrationAccounts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  name: z.string().min(1, "Название интеграции обязательно"),
  type: z.enum(INTEGRATION_TYPE),
  status: z.enum(INTEGRATION_STATUS).default("inactive"),
  apiCredentials: z.record(z.string(), z.any()),
  settings: z.record(z.string(), z.any()).optional(),
  syncFrequency: z.coerce.number().min(60, "Частота синхронизации минимум 60 секунд").default(3600),
});

export const insertIntegrationMappingSchema = createInsertSchema(integrationMappings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  externalId: z.string().min(1, "Внешний ID обязателен"),
  internalId: z.string().min(1, "Внутренний ID обязателен"),
  entityType: z.string().min(1, "Тип сущности обязателен"),
  metadata: z.record(z.string(), z.any()).optional(),
});

export const insertFiscalReceiptSchema = createInsertSchema(fiscalReceipts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  status: z.enum(FISCAL_RECEIPT_STATUS).default("draft"),
  paymentMethod: z.enum(PAYMENT_METHOD),
  items: z.array(z.record(z.string(), z.any())).min(1, "Должна быть хотя бы одна позиция"),
  totalAmount: z.coerce.number().min(0, "Сумма не может быть отрицательной"),
  vatAmount: z.coerce.number().min(0, "НДС не может быть отрицательным").default(0),
  customerEmail: z.string().email("Неверный формат email").optional(),
  customerPhone: z.string().regex(/^\+?[1-9]\d{10,14}$/, "Неверный формат телефона").optional(),
});

export const insertPaymentIntentSchema = createInsertSchema(paymentIntents).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  amount: z.coerce.number().min(0.01, "Сумма должна быть больше 0"),
  currency: z.string().length(3, "Код валюты должен содержать 3 символа").default("RUB"),
  paymentMethod: z.enum(PAYMENT_METHOD),
  status: z.enum(PAYMENT_INTENT_STATUS).default("pending"),
});

export const insertIntegrationJobSchema = createInsertSchema(integrationJobs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  jobType: z.string().min(1, "Тип задачи обязателен"),
  status: z.enum(INTEGRATION_JOB_STATUS).default("pending"),
  priority: z.coerce.number().min(1).max(10, "Приоритет должен быть от 1 до 10").default(5),
  payload: z.record(z.string(), z.any()).optional(),
  maxAttempts: z.coerce.number().min(1, "Максимум попыток должно быть больше 0").default(3),
});

export const insertIntegrationLogSchema = createInsertSchema(integrationLogs).omit({
  id: true,
  createdAt: true,
}).extend({
  level: z.enum(["debug", "info", "warn", "error"] as const).default("info"),
  event: z.string().min(1, "Событие обязательно"),
  message: z.string().min(1, "Сообщение обязательно"),
  metadata: z.record(z.string(), z.any()).optional(),
});

// System Settings schemas
export const insertSystemSettingSchema = createInsertSchema(systemSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  key: z.string().min(1, "Ключ настройки обязателен"),
  value: z.string().min(1, "Значение настройки обязательно"),
  category: z.string().min(1, "Категория обязательна"),
  description: z.string().optional(),
});

export const updateSystemSettingSchema = insertSystemSettingSchema.partial().extend({
  id: z.string().optional(),
});

// SMS verification schemas
export const insertSmsVerificationCodeSchema = createInsertSchema(smsVerificationCodes).omit({
  id: true,
  createdAt: true,
}).extend({
  purpose: z.enum(SMS_VERIFICATION_PURPOSE),
  phone: z.string().regex(/^\+?[1-9]\d{10,14}$/, "Неверный формат номера телефона"),
  expiresAt: z.coerce.date(),
});

export const verifySmsCodeSchema = z.object({
  userId: z.string(),
  code: z.string().length(6, "SMS код должен содержать 6 цифр"),
  purpose: z.enum(SMS_VERIFICATION_PURPOSE),
});

export const sendSmsCodeSchema = z.object({
  userId: z.string(), 
  phone: z.string().regex(/^\+?[1-9]\d{10,14}$/, "Неверный формат номера телефона"),
  purpose: z.enum(SMS_VERIFICATION_PURPOSE),
});

// Push tokens schemas
export const insertPushTokenSchema = createInsertSchema(pushTokens).omit({
  id: true,
  createdAt: true,
  lastUsedAt: true,
}).extend({
  token: z.string().min(1, "Push token обязателен"),
  platform: z.enum(PUSH_TOKEN_PLATFORMS).optional(),
});

export const registerPushTokenSchema = z.object({
  token: z.string().min(1, "Push token обязателен"),
  deviceId: z.string().optional(),
  platform: z.enum(PUSH_TOKEN_PLATFORMS).optional(),
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type UpdateUser = z.infer<typeof updateUserSchema>;
export type User = typeof users.$inferSelect;

export type SmsVerificationCode = typeof smsVerificationCodes.$inferSelect;
export type InsertSmsVerificationCode = z.infer<typeof insertSmsVerificationCodeSchema>;
export type VerifySmsCode = z.infer<typeof verifySmsCodeSchema>;
export type SendSmsCode = z.infer<typeof sendSmsCodeSchema>;

export type PushToken = typeof pushTokens.$inferSelect;
export type InsertPushToken = z.infer<typeof insertPushTokenSchema>;
export type RegisterPushToken = z.infer<typeof registerPushTokenSchema>;

export type Owner = typeof owners.$inferSelect;
export type InsertOwner = z.infer<typeof insertOwnerSchema>;

export type Patient = typeof patients.$inferSelect;
export type InsertPatient = z.infer<typeof insertPatientSchema>;

export type PatientOwner = typeof patientOwners.$inferSelect;
export type InsertPatientOwner = z.infer<typeof insertPatientOwnerSchema>;

export type Doctor = typeof doctors.$inferSelect;
export type InsertDoctor = z.infer<typeof insertDoctorSchema>;

export type Appointment = typeof appointments.$inferSelect;
export type InsertAppointment = z.infer<typeof insertAppointmentSchema>;

export type QueueEntry = typeof queueEntries.$inferSelect;
export type InsertQueueEntry = z.infer<typeof insertQueueEntrySchema>;

export type QueueCall = typeof queueCalls.$inferSelect;
export type InsertQueueCall = z.infer<typeof insertQueueCallSchema>;

export type MedicalRecord = typeof medicalRecords.$inferSelect;
export type InsertMedicalRecord = z.infer<typeof insertMedicalRecordSchema>;

export type Medication = typeof medications.$inferSelect;
export type InsertMedication = z.infer<typeof insertMedicationSchema>;

export type Service = typeof services.$inferSelect;
export type InsertService = z.infer<typeof insertServiceSchema>;

export type Product = typeof products.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;

export type Invoice = typeof invoices.$inferSelect;
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;

export type InvoiceItem = typeof invoiceItems.$inferSelect;

export type Branch = typeof branches.$inferSelect;
export type InsertBranch = z.infer<typeof insertBranchSchema>;
export type InsertInvoiceItem = z.infer<typeof insertInvoiceItemSchema>;

// New table types
export type PatientFile = typeof patientFiles.$inferSelect;
export type InsertPatientFile = z.infer<typeof insertPatientFileSchema>;

export type LabResult = typeof labResults.$inferSelect;
export type InsertLabResult = z.infer<typeof insertLabResultSchema>;

// New Laboratory System Types
export type LabStudy = typeof labStudies.$inferSelect;
export type InsertLabStudy = z.infer<typeof insertLabStudySchema>;

export type LabParameter = typeof labParameters.$inferSelect;
export type InsertLabParameter = z.infer<typeof insertLabParameterSchema>;

export type ReferenceRange = typeof referenceRanges.$inferSelect;
export type InsertReferenceRange = z.infer<typeof insertReferenceRangeSchema>;

export type LabOrder = typeof labOrders.$inferSelect;
export type InsertLabOrder = z.infer<typeof insertLabOrderSchema>;

export type LabResultDetail = typeof labResultDetails.$inferSelect;
export type InsertLabResultDetail = z.infer<typeof insertLabResultDetailSchema>;

// Integration and fiscal types
export type CatalogItem = typeof catalogItems.$inferSelect;
export type InsertCatalogItem = z.infer<typeof insertCatalogItemSchema>;

export type CatalogItemMarking = typeof catalogItemMarkings.$inferSelect;
export type InsertCatalogItemMarking = z.infer<typeof insertCatalogItemMarkingSchema>;

export type IntegrationAccount = typeof integrationAccounts.$inferSelect;
export type InsertIntegrationAccount = z.infer<typeof insertIntegrationAccountSchema>;

export type IntegrationMapping = typeof integrationMappings.$inferSelect;
export type InsertIntegrationMapping = z.infer<typeof insertIntegrationMappingSchema>;

export type FiscalReceipt = typeof fiscalReceipts.$inferSelect;
export type InsertFiscalReceipt = z.infer<typeof insertFiscalReceiptSchema>;

export type PaymentIntent = typeof paymentIntents.$inferSelect;
export type InsertPaymentIntent = z.infer<typeof insertPaymentIntentSchema>;

export type IntegrationJob = typeof integrationJobs.$inferSelect;
export type InsertIntegrationJob = z.infer<typeof insertIntegrationJobSchema>;

export type IntegrationLog = typeof integrationLogs.$inferSelect;
export type InsertIntegrationLog = z.infer<typeof insertIntegrationLogSchema>;

export type SystemSetting = typeof systemSettings.$inferSelect;
export type InsertSystemSetting = z.infer<typeof insertSystemSettingSchema>;
export type UpdateSystemSetting = z.infer<typeof updateSystemSettingSchema>;

// Dashboard API response types
export interface DashboardStats {
  totalPatients: number;
  todayAppointments: number;
  activeAppointments: number;
  lowStockCount: number;
  pendingPayments: number;
  overduePayments: number;
  totalRevenue: number;
}

// Enhanced appointment type with related data for dashboard
export interface AppointmentWithDetails extends Appointment {
  patient?: Patient;
  doctor?: Doctor;
}

// Enhanced patient type with related data for dashboard  
export interface PatientWithOwner extends Patient {
  owner?: Owner;
}

// Локальная печать фискальных чеков - валидация запросов
export const localPrintRequestSchema = z.object({
  invoiceId: z.string().min(1, "ID счета обязателен"),
  printerType: z.enum(['atol', 'shtrih']).default('atol')
});

export const markPrintedRequestSchema = z.object({
  receipt_id: z.string().min(1, "ID чека обязателен"),
  print_result: z.object({
    success: z.boolean(),
    fiscal_number: z.string().optional(),
    shift_number: z.string().optional(),
    receipt_number: z.string().optional(),
    fiscal_sign: z.string().optional(),
    error: z.string().optional()
  }),
  printed_at: z.string().optional()
});

export type LocalPrintRequest = z.infer<typeof localPrintRequestSchema>;
export type MarkPrintedRequest = z.infer<typeof markPrintedRequestSchema>;

// === РАСШИРЕННАЯ КАССОВАЯ СИСТЕМА ===

// Кассы и кассовые места
export const cashRegisters = pgTable('cash_registers', {
  id: varchar('id', { length: 255 }).primaryKey(),
  tenantId: varchar("tenant_id").references(() => tenants.id).notNull(),
  branchId: varchar('branch_id', { length: 255 }).notNull().references(() => branches.id),
  name: varchar('name', { length: 255 }).notNull(),
  serialNumber: varchar('serial_number', { length: 255 }),
  model: varchar('model', { length: 255 }),
  fiscalDriveNumber: varchar('fiscal_drive_number', { length: 255 }),
  isActive: boolean('is_active').default(true),
  comPort: varchar('com_port', { length: 20 }),
  printerType: varchar('printer_type', { length: 50 }).default('atol'), // atol, shtrih, etc
  settings: jsonb('settings').default({}), // Настройки кассы (скорость, таймауты и т.д.)
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
}, (table) => ({
  tenantIdIdx: index('cash_registers_tenant_id_idx').on(table.tenantId),
}));

// Кассовые смены
export const cashShifts = pgTable('cash_shifts', {
  id: varchar('id', { length: 255 }).primaryKey(),
  registerId: varchar('register_id', { length: 255 }).notNull().references(() => cashRegisters.id),
  cashierId: varchar('cashier_id', { length: 255 }).notNull().references(() => users.id),
  shiftNumber: integer('shift_number').notNull(),
  openedAt: timestamp('opened_at').defaultNow(),
  closedAt: timestamp('closed_at'),
  openingCashAmount: decimal('opening_cash_amount', { precision: 10, scale: 2 }).default('0'),
  closingCashAmount: decimal('closing_cash_amount', { precision: 10, scale: 2 }),
  expectedCashAmount: decimal('expected_cash_amount', { precision: 10, scale: 2 }),
  cashDifference: decimal('cash_difference', { precision: 10, scale: 2 }),
  totalSales: decimal('total_sales', { precision: 10, scale: 2 }).default('0'),
  totalReturns: decimal('total_returns', { precision: 10, scale: 2 }).default('0'),
  receiptsCount: integer('receipts_count').default(0),
  returnsCount: integer('returns_count').default(0),
  status: varchar('status', { length: 20 }).default('open'), // open, closed
  notes: text('notes')
});

// Клиенты/покупатели (расширенная версия владельцев)
export const customers = pgTable('customers', {
  id: varchar('id', { length: 255 }).primaryKey(),
  tenantId: varchar("tenant_id").references(() => tenants.id).notNull(),
  branchId: varchar('branch_id', { length: 255 }).notNull().references(() => branches.id),
  // Основная информация
  type: varchar('type', { length: 20 }).default('individual'), // individual, legal
  firstName: varchar('first_name', { length: 255 }),
  lastName: varchar('last_name', { length: 255 }),
  middleName: varchar('middle_name', { length: 255 }),
  companyName: varchar('company_name', { length: 255 }),
  // Контакты
  phone: varchar('phone', { length: 20 }),
  email: varchar('email', { length: 255 }),
  // Адрес
  country: varchar('country', { length: 100 }).default('Россия'),
  region: varchar('region', { length: 255 }),
  city: varchar('city', { length: 255 }),
  address: text('address'),
  postalCode: varchar('postal_code', { length: 20 }),
  // Система лояльности
  cardNumber: varchar('card_number', { length: 100 }),
  discountPercent: decimal('discount_percent', { precision: 5, scale: 2 }).default('0'),
  bonusPoints: decimal('bonus_points', { precision: 10, scale: 2 }).default('0'),
  totalPurchases: decimal('total_purchases', { precision: 12, scale: 2 }).default('0'),
  purchasesCount: integer('purchases_count').default(0),
  lastVisit: timestamp('last_visit'),
  // Даты рождения для поздравлений
  birthDate: date('birth_date'),
  // Дополнительная информация
  notes: text('notes'),
  tags: text('tags').array(),
  isVip: boolean('is_vip').default(false),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
}, (table) => ({
  tenantIdIdx: index('customers_tenant_id_idx').on(table.tenantId),
}));

// Система скидок
export const discountRules = pgTable('discount_rules', {
  id: varchar('id', { length: 255 }).primaryKey(),
  tenantId: varchar("tenant_id").references(() => tenants.id).notNull(),
  branchId: varchar('branch_id', { length: 255 }).notNull().references(() => branches.id),
  name: varchar('name', { length: 255 }).notNull(),
  type: varchar('type', { length: 50 }).notNull(), // percentage, fixed_amount, accumulative, special
  value: decimal('value', { precision: 10, scale: 2 }).notNull(),
  // Условия применения
  minPurchaseAmount: decimal('min_purchase_amount', { precision: 10, scale: 2 }),
  maxDiscountAmount: decimal('max_discount_amount', { precision: 10, scale: 2 }),
  // Применимость
  applyToProducts: text('apply_to_products').array(), // массив ID товаров
  applyToServices: text('apply_to_services').array(), // массив ID услуг
  applyToCategories: text('apply_to_categories').array(), // массив категорий
  // Время действия
  validFrom: timestamp('valid_from'),
  validTo: timestamp('valid_to'),
  // Дни недели и время
  validDaysOfWeek: text('valid_days_of_week').array(), // 1-7 (понедельник-воскресенье)
  validTimeFrom: time('valid_time_from'),
  validTimeTo: time('valid_time_to'),
  // Ограничения
  usageLimit: integer('usage_limit'), // сколько раз можно использовать
  usageCount: integer('usage_count').default(0),
  isActive: boolean('is_active').default(true),
  isCombinable: boolean('is_combinable').default(false), // можно ли комбинировать с другими скидками
  priority: integer('priority').default(0), // приоритет применения
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
}, (table) => ({
  tenantIdIdx: index('discount_rules_tenant_id_idx').on(table.tenantId),
}));

// Способы оплаты
export const paymentMethods = pgTable('payment_methods', {
  id: varchar('id', { length: 255 }).primaryKey(),
  tenantId: varchar("tenant_id").references(() => tenants.id).notNull(),
  branchId: varchar('branch_id', { length: 255 }).notNull().references(() => branches.id),
  name: varchar('name', { length: 255 }).notNull(),
  type: varchar('type', { length: 50 }).notNull(), // cash, card, mixed, bonus, transfer
  isActive: boolean('is_active').default(true),
  requiresChange: boolean('requires_change').default(false), // нужна ли сдача
  isElectronic: boolean('is_electronic').default(false),
  commission: decimal('commission', { precision: 5, scale: 2 }).default('0'), // комиссия в %
  settings: jsonb('settings').default({}), // настройки эквайринга и т.д.
  createdAt: timestamp('created_at').defaultNow()
}, (table) => ({
  tenantIdIdx: index('payment_methods_tenant_id_idx').on(table.tenantId),
}));

// Транзакции по продажам (чеки)
export const salesTransactions = pgTable('sales_transactions', {
  id: varchar('id', { length: 255 }).primaryKey(),
  tenantId: varchar("tenant_id").references(() => tenants.id).notNull(),
  registerId: varchar('register_id', { length: 255 }).notNull().references(() => cashRegisters.id),
  shiftId: varchar('shift_id', { length: 255 }).notNull().references(() => cashShifts.id),
  cashierId: varchar('cashier_id', { length: 255 }).notNull().references(() => users.id),
  customerId: varchar('customer_id', { length: 255 }).references(() => customers.id),
  invoiceId: varchar('invoice_id', { length: 255 }).references(() => invoices.id), // связь с VetSystem
  
  // Номера документов
  receiptNumber: varchar('receipt_number', { length: 100 }),
  fiscalNumber: varchar('fiscal_number', { length: 100 }),
  shiftNumber: integer('shift_number'),
  
  // Суммы
  subtotal: decimal('subtotal', { precision: 10, scale: 2 }).notNull(),
  discountAmount: decimal('discount_amount', { precision: 10, scale: 2 }).default('0'),
  taxAmount: decimal('tax_amount', { precision: 10, scale: 2 }).default('0'),
  totalAmount: decimal('total_amount', { precision: 10, scale: 2 }).notNull(),
  
  // Детали
  type: varchar('type', { length: 20 }).default('sale'), // sale, return, exchange
  paymentMethodId: varchar('payment_method_id', { length: 255 }).references(() => paymentMethods.id),
  
  // Скидки и бонусы
  appliedDiscounts: jsonb('applied_discounts').default([]), // примененные скидки
  bonusPointsEarned: decimal('bonus_points_earned', { precision: 10, scale: 2 }).default('0'),
  bonusPointsUsed: decimal('bonus_points_used', { precision: 10, scale: 2 }).default('0'),
  
  // Статусы
  isFiscalized: boolean('is_fiscalized').default(false),
  isSynced: boolean('is_synced').default(false),
  
  // Фискальные данные
  fiscalData: jsonb('fiscal_data'),
  
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
}, (table) => ({
  tenantIdIdx: index('sales_transactions_tenant_id_idx').on(table.tenantId),
}));

// Позиции в чеках
export const salesTransactionItems = pgTable('sales_transaction_items', {
  id: varchar('id', { length: 255 }).primaryKey(),
  transactionId: varchar('transaction_id', { length: 255 }).notNull().references(() => salesTransactions.id),
  productId: varchar('product_id', { length: 255 }).references(() => products.id),
  serviceId: varchar('service_id', { length: 255 }).references(() => services.id),
  
  name: varchar('name', { length: 255 }).notNull(),
  sku: varchar('sku', { length: 255 }),
  barcode: varchar('barcode', { length: 255 }),
  
  quantity: decimal('quantity', { precision: 10, scale: 3 }).notNull(),
  unitPrice: decimal('unit_price', { precision: 10, scale: 2 }).notNull(),
  discountAmount: decimal('discount_amount', { precision: 10, scale: 2 }).default('0'),
  totalPrice: decimal('total_price', { precision: 10, scale: 2 }).notNull(),
  
  // НДС
  taxRate: decimal('tax_rate', { precision: 5, scale: 2 }).default('20'),
  taxAmount: decimal('tax_amount', { precision: 10, scale: 2 }).default('0'),
  
  // Маркировка товаров
  markingCodes: text('marking_codes').array(),
  
  createdAt: timestamp('created_at').defaultNow()
});

// Операции с деньгами (внесение/изъятие)
export const cashOperations = pgTable('cash_operations', {
  id: varchar('id', { length: 255 }).primaryKey(),
  tenantId: varchar("tenant_id").references(() => tenants.id).notNull(),
  registerId: varchar('register_id', { length: 255 }).notNull().references(() => cashRegisters.id),
  shiftId: varchar('shift_id', { length: 255 }).notNull().references(() => cashShifts.id),
  cashierId: varchar('cashier_id', { length: 255 }).notNull().references(() => users.id),
  
  type: varchar('type', { length: 20 }).notNull(), // deposit, withdrawal
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  reason: varchar('reason', { length: 255 }),
  notes: text('notes'),
  
  createdAt: timestamp('created_at').defaultNow()
}, (table) => ({
  tenantIdIdx: index('cash_operations_tenant_id_idx').on(table.tenantId),
}));

// Роли и права пользователей в кассовой системе
export const userRoles = pgTable('user_roles', {
  id: varchar('id', { length: 255 }).primaryKey(),
  tenantId: varchar("tenant_id").references(() => tenants.id).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  permissions: jsonb('permissions').default({}), // JSON с правами
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow()
}, (table) => ({
  tenantIdIdx: index('user_roles_tenant_id_idx').on(table.tenantId),
}));

export const userRoleAssignments = pgTable('user_role_assignments', {
  id: varchar('id', { length: 255 }).primaryKey(),
  userId: varchar('user_id', { length: 255 }).notNull().references(() => users.id),
  roleId: varchar('role_id', { length: 255 }).notNull().references(() => userRoles.id),
  branchId: varchar('branch_id', { length: 255 }).references(() => branches.id), // права в конкретном филиале
  assignedAt: timestamp('assigned_at').defaultNow(),
  assignedBy: varchar('assigned_by', { length: 255 }).references(() => users.id)
});

// === Subscription and Billing Tables ===

// Тарифные планы подписок
export const subscriptionPlans = pgTable('subscription_plans', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  name: varchar('name', { length: 100 }).notNull(), // "Базовый", "Стандарт", "Премиум"
  description: text('description'),
  price: decimal('price', { precision: 10, scale: 2 }).notNull(), // Цена в рублях
  billingPeriod: varchar('billing_period', { length: 20 }).notNull().default('monthly'), // monthly, quarterly, yearly
  maxBranches: integer('max_branches').default(1), // Количество филиалов
  maxUsers: integer('max_users').default(5), // Количество пользователей
  maxPatients: integer('max_patients'), // Лимит пациентов (null = без лимита)
  features: jsonb('features'), // Дополнительные возможности плана
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  nameIdx: index('subscription_plans_name_idx').on(table.name),
  isActiveIdx: index('subscription_plans_active_idx').on(table.isActive)
}));

// Подписки клиник (привязаны к филиалам)
export const clinicSubscriptions = pgTable('clinic_subscriptions', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").references(() => tenants.id).notNull(),
  planId: varchar('plan_id').references(() => subscriptionPlans.id).notNull(), // Тарифный план
  status: varchar('status', { length: 20 }).notNull().default('trial'), // active, expired, cancelled, suspended, trial
  startDate: timestamp('start_date').notNull(), // Дата начала подписки
  endDate: timestamp('end_date').notNull(), // Дата окончания подписки
  autoRenew: boolean('auto_renew').default(true), // Автопродление
  trialEndDate: timestamp('trial_end_date'), // Дата окончания триала
  cancelledAt: timestamp('cancelled_at'), // Дата отмены
  cancelReason: text('cancel_reason'), // Причина отмены
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  tenantIdIdx: index('clinic_subscriptions_tenant_id_idx').on(table.tenantId),
  statusIdx: index('clinic_subscriptions_status_idx').on(table.status),
  endDateIdx: index('clinic_subscriptions_end_date_idx').on(table.endDate),
  planIdIdx: index('clinic_subscriptions_plan_idx').on(table.planId)
}));

// Платежи по подпискам
export const subscriptionPayments = pgTable('subscription_payments', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  subscriptionId: varchar('subscription_id').references(() => clinicSubscriptions.id).notNull(),
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  status: varchar('status', { length: 20 }).notNull().default('pending'), // pending, paid, failed, refunded
  paymentMethod: varchar('payment_method', { length: 50 }), // card, yookassa, etc
  yookassaPaymentId: varchar('yookassa_payment_id', { length: 255 }), // ID платежа в YooKassa
  yookassaPaymentUrl: text('yookassa_payment_url'), // URL для оплаты
  periodStart: timestamp('period_start').notNull(), // Начало периода оплаты
  periodEnd: timestamp('period_end').notNull(), // Конец периода оплаты
  paidAt: timestamp('paid_at'), // Дата оплаты
  failedAt: timestamp('failed_at'), // Дата неуспешной попытки
  failureReason: text('failure_reason'), // Причина неудачи
  metadata: jsonb('metadata'), // Дополнительная информация
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  subscriptionIdIdx: index('subscription_payments_subscription_idx').on(table.subscriptionId),
  statusIdx: index('subscription_payments_status_idx').on(table.status),
  yookassaIdIdx: index('subscription_payments_yookassa_idx').on(table.yookassaPaymentId),
  paidAtIdx: index('subscription_payments_paid_at_idx').on(table.paidAt)
}));

// Уведомления об окончании подписки
export const billingNotifications = pgTable('billing_notifications', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  subscriptionId: varchar('subscription_id').references(() => clinicSubscriptions.id).notNull(),
  type: varchar('type', { length: 50 }).notNull(), // expiry_warning_3days, expired, payment_failed
  message: text('message').notNull(),
  sentAt: timestamp('sent_at'),
  scheduledFor: timestamp('scheduled_for').notNull(), // Когда должно быть отправлено
  isSent: boolean('is_sent').default(false),
  recipientEmail: varchar('recipient_email', { length: 255 }),
  recipientPhone: varchar('recipient_phone', { length: 50 }),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull()
}, (table) => ({
  subscriptionIdIdx: index('billing_notifications_subscription_idx').on(table.subscriptionId),
  scheduledForIdx: index('billing_notifications_scheduled_idx').on(table.scheduledFor),
  isSentIdx: index('billing_notifications_sent_idx').on(table.isSent),
  typeIdx: index('billing_notifications_type_idx').on(table.type)
}));

// ========================================
// INTEGRATION CREDENTIALS
// ========================================

// Tenant-specific integration credentials for multi-tenant SaaS
// SECURITY NOTE: In production, credentials should be encrypted at rest
// or stored in a dedicated secrets manager (e.g., HashiCorp Vault, AWS Secrets Manager)
export const integrationCredentials = pgTable('integration_credentials', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar('tenant_id').references(() => tenants.id).notNull(), // Each tenant has their own credentials
  integrationType: varchar('integration_type', { length: 50 }).notNull(), // moysklad, yookassa, etc
  isEnabled: boolean('is_enabled').default(false).notNull(),
  
  // SECURITY WARNING: credentials stored in JSONB
  // For production: implement encryption at rest or use external secrets manager
  // Format: { apiToken?, login?, password?, shopId?, secretKey?, retailStoreId? }
  credentials: jsonb('credentials').notNull(), 
  
  // Additional settings specific to integration type
  settings: jsonb('settings').default({}),
  
  // Sync metadata
  lastSyncAt: timestamp('last_sync_at'),
  lastSyncStatus: varchar('last_sync_status', { length: 50 }), // success, error, pending
  lastSyncError: text('last_sync_error'),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  tenantIdIdx: index('integration_credentials_tenant_idx').on(table.tenantId),
  tenantTypeUnique: uniqueIndex('integration_credentials_tenant_type_unique').on(table.tenantId, table.integrationType),
  typeIdx: index('integration_credentials_type_idx').on(table.integrationType),
  enabledIdx: index('integration_credentials_enabled_idx').on(table.isEnabled)
}));

// ========================================
// DOCUMENT TEMPLATES
// ========================================

export const documentTemplates = pgTable('document_templates', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar('tenant_id').references(() => tenants.id), // NULL = system template, specific ID = tenant override
  name: varchar('name', { length: 255 }).notNull(), // Human-readable name
  type: varchar('type', { length: 100 }).notNull(), // invoice, encounter_summary, etc.
  content: text('content').notNull(), // HTML template with Handlebars placeholders
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  tenantIdIdx: index('document_templates_tenant_idx').on(table.tenantId),
  typeIdx: index('document_templates_type_idx').on(table.type),
  tenantTypeUnique: uniqueIndex('document_templates_tenant_type_unique').on(table.tenantId, table.type), // One template per type per tenant
  activeIdx: index('document_templates_active_idx').on(table.isActive)
}));

// ========================================
// CLINICAL CASES MODULE
// ========================================

// Клинические случаи (Clinical Cases) - основная сущность для ведения истории болезни
export const clinicalCases = pgTable('clinical_cases', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar('tenant_id').references(() => tenants.id).notNull(),
  branchId: varchar('branch_id').references(() => branches.id).notNull(),
  patientId: varchar('patient_id').references(() => patients.id).notNull(),
  reasonForVisit: text('reason_for_visit').notNull(), // Причина обращения
  status: varchar('status', { length: 20 }).default('open').notNull(), // open, closed
  startDate: timestamp('start_date').defaultNow().notNull(),
  closeDate: timestamp('close_date'),
  createdByUserId: varchar('created_by_user_id').references(() => users.id).notNull(),
  vetaisId: integer('vetais_id'), // ID из Vetais (medical_hospitalization)
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  tenantIdIdx: index('clinical_cases_tenant_idx').on(table.tenantId),
  branchIdIdx: index('clinical_cases_branch_idx').on(table.branchId),
  patientIdIdx: index('clinical_cases_patient_idx').on(table.patientId),
  statusIdx: index('clinical_cases_status_idx').on(table.status),
  startDateIdx: index('clinical_cases_start_date_idx').on(table.startDate),
  vetaisIdIdx: index('clinical_cases_vetais_id_idx').on(table.vetaisId),
  statusCheck: check('clinical_cases_status_check', sql`${table.status} IN ('open', 'closed')`)
}));

// Обследования/Приемы (Clinical Encounters) - записи о каждом приеме в рамках клинического случая
export const clinicalEncounters = pgTable('clinical_encounters', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar('tenant_id').references(() => tenants.id).notNull(),
  branchId: varchar('branch_id').references(() => branches.id).notNull(),
  clinicalCaseId: varchar('clinical_case_id').references(() => clinicalCases.id).notNull(),
  doctorId: varchar('doctor_id').references(() => users.id).notNull(), // Changed to reference users table
  encounterDate: timestamp('encounter_date').defaultNow().notNull(),
  anamnesis: text('anamnesis'), // Анамнез и данные осмотра
  diagnosis: text('diagnosis'), // Диагноз
  treatmentPlan: text('treatment_plan'), // План лечения и назначения
  notes: text('notes'), // Дополнительные заметки
  vetaisId: integer('vetais_id'), // ID из Vetais (medical_exams)
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  tenantIdIdx: index('clinical_encounters_tenant_idx').on(table.tenantId),
  branchIdIdx: index('clinical_encounters_branch_idx').on(table.branchId),
  caseIdIdx: index('clinical_encounters_case_idx').on(table.clinicalCaseId),
  doctorIdIdx: index('clinical_encounters_doctor_idx').on(table.doctorId),
  encounterDateIdx: index('clinical_encounters_date_idx').on(table.encounterDate),
  vetaisIdIdx: index('clinical_encounters_vetais_id_idx').on(table.vetaisId)
}));

// Лабораторные анализы (Lab Analyses) - назначенные анализы в рамках обследования
export const labAnalyses = pgTable('lab_analyses', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar('tenant_id').references(() => tenants.id).notNull(),
  branchId: varchar('branch_id').references(() => branches.id).notNull(),
  encounterId: varchar('encounter_id').references(() => clinicalEncounters.id).notNull(),
  analysisName: varchar('analysis_name', { length: 255 }).notNull(),
  status: varchar('status', { length: 20 }).default('ordered').notNull(), // ordered, sample_taken, completed
  orderDate: timestamp('order_date').defaultNow().notNull(),
  completionDate: timestamp('completion_date'),
  results: text('results'), // Результаты анализа
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  tenantIdIdx: index('lab_analyses_tenant_idx').on(table.tenantId),
  branchIdIdx: index('lab_analyses_branch_idx').on(table.branchId),
  encounterIdIdx: index('lab_analyses_encounter_idx').on(table.encounterId),
  statusIdx: index('lab_analyses_status_idx').on(table.status),
  orderDateIdx: index('lab_analyses_order_date_idx').on(table.orderDate),
  statusCheck: check('lab_analyses_status_check', sql`${table.status} IN ('ordered', 'sample_taken', 'completed')`)
}));

// Прикрепленные файлы (Attachments) - файлы, привязанные к различным сущностям
export const attachments = pgTable('attachments', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar('tenant_id').references(() => tenants.id).notNull(),
  branchId: varchar('branch_id').references(() => branches.id).notNull(),
  entityId: varchar('entity_id').notNull(), // ID сущности, к которой прикреплен файл
  entityType: varchar('entity_type', { length: 50 }).notNull(), // lab_analysis, clinical_encounter, clinical_case
  fileName: varchar('file_name', { length: 255 }).notNull(),
  filePath: varchar('file_path', { length: 500 }).notNull(),
  mimeType: varchar('mime_type', { length: 100 }).notNull(),
  fileSize: integer('file_size'), // Размер файла в байтах
  uploadedByUserId: varchar('uploaded_by_user_id').references(() => users.id).notNull(),
  vetaisId: integer('vetais_id'), // ID из Vetais (medical_media_data)
  createdAt: timestamp('created_at').defaultNow().notNull()
}, (table) => ({
  tenantIdIdx: index('attachments_tenant_idx').on(table.tenantId),
  branchIdIdx: index('attachments_branch_idx').on(table.branchId),
  entityIdx: index('attachments_entity_idx').on(table.entityId, table.entityType),
  entityTypeIdx: index('attachments_entity_type_idx').on(table.entityType),
  vetaisIdIdx: index('attachments_vetais_id_idx').on(table.vetaisId),
  entityTypeCheck: check('attachments_entity_type_check', sql`${table.entityType} IN ('lab_analysis', 'clinical_encounter', 'clinical_case')`)
}));

// Чаты/Диалоги (Conversations) - переписка клиента с клиникой
export const conversations = pgTable('conversations', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar('tenant_id').references(() => tenants.id).notNull(),
  ownerId: varchar('owner_id').references(() => owners.id).notNull(),
  subject: varchar('subject', { length: 500 }).notNull(), // Тема диалога
  status: varchar('status', { length: 30 }).default('open').notNull(), // open, closed_by_client, closed_by_staff
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  tenantIdIdx: index('conversations_tenant_idx').on(table.tenantId),
  ownerIdIdx: index('conversations_owner_idx').on(table.ownerId),
  statusIdx: index('conversations_status_idx').on(table.status),
  updatedAtIdx: index('conversations_updated_at_idx').on(table.updatedAt),
  statusCheck: check('conversations_status_check', sql`${table.status} IN ('open', 'closed_by_client', 'closed_by_staff')`)
}));

// Сообщения в чате (Messages) - отдельные сообщения в рамках диалога
export const messages = pgTable('messages', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  conversationId: varchar('conversation_id').references(() => conversations.id).notNull(),
  senderId: varchar('sender_id').notNull(), // ID отправителя (owner_id или user_id)
  senderType: varchar('sender_type', { length: 20 }).notNull(), // client, staff
  messageText: text('message_text').notNull(),
  isRead: boolean('is_read').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull()
}, (table) => ({
  conversationIdIdx: index('messages_conversation_idx').on(table.conversationId),
  senderIdIdx: index('messages_sender_idx').on(table.senderId),
  isReadIdx: index('messages_is_read_idx').on(table.isRead),
  createdAtIdx: index('messages_created_at_idx').on(table.createdAt),
  senderTypeCheck: check('messages_sender_type_check', sql`${table.senderType} IN ('client', 'staff')`)
}));

// Call Logs (История звонков) - журнал телефонных звонков из Mango Office
export const callLogs = pgTable('call_logs', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar('tenant_id').references(() => tenants.id).notNull(),
  branchId: varchar('branch_id').references(() => branches.id),
  
  // Информация о звонке
  externalCallId: varchar('external_call_id', { length: 255 }), // ID звонка в Mango Office
  direction: varchar('direction', { length: 20 }).notNull(), // inbound, outbound
  status: varchar('status', { length: 30 }).notNull(), // answered, missed, busy, failed, no_answer
  
  // Номера телефонов
  fromNumber: varchar('from_number', { length: 50 }).notNull(), // Номер звонящего
  toNumber: varchar('to_number', { length: 50 }).notNull(), // Номер получателя
  
  // Связь с владельцем (если найден по номеру)
  ownerId: varchar('owner_id').references(() => owners.id),
  
  // Информация о пользователе который принял/совершил звонок
  userId: varchar('user_id').references(() => users.id),
  
  // Детали звонка
  duration: integer('duration').default(0), // Длительность в секундах
  recordingUrl: text('recording_url'), // Ссылка на запись разговора
  startedAt: timestamp('started_at').notNull(), // Время начала звонка
  answeredAt: timestamp('answered_at'), // Время ответа (если был ответ)
  endedAt: timestamp('ended_at'), // Время окончания
  
  // Дополнительные данные
  notes: text('notes'), // Заметки о звонке
  metadata: jsonb('metadata'), // Дополнительная информация от Mango Office
  
  createdAt: timestamp('created_at').defaultNow().notNull()
}, (table) => ({
  tenantIdIdx: index('call_logs_tenant_idx').on(table.tenantId),
  branchIdIdx: index('call_logs_branch_idx').on(table.branchId),
  ownerIdIdx: index('call_logs_owner_idx').on(table.ownerId),
  userIdIdx: index('call_logs_user_idx').on(table.userId),
  externalCallIdIdx: index('call_logs_external_call_id_idx').on(table.externalCallId),
  fromNumberIdx: index('call_logs_from_number_idx').on(table.fromNumber),
  startedAtIdx: index('call_logs_started_at_idx').on(table.startedAt),
  directionCheck: check('call_logs_direction_check', sql`${table.direction} IN ('inbound', 'outbound')`),
  statusCheck: check('call_logs_status_check', sql`${table.status} IN ('answered', 'missed', 'busy', 'failed', 'no_answer')`)
}));

// === Схемы для валидации ===

export const insertCashRegisterSchema = createInsertSchema(cashRegisters).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertCashShiftSchema = createInsertSchema(cashShifts).omit({
  id: true,
  openedAt: true
});

export const insertCustomerSchema = createInsertSchema(customers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  totalPurchases: true,
  purchasesCount: true,
  lastVisit: true
});

export const insertDiscountRuleSchema = createInsertSchema(discountRules).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  usageCount: true
});

export const insertPaymentMethodSchema = createInsertSchema(paymentMethods).omit({
  id: true,
  createdAt: true
});

export const insertSalesTransactionSchema = createInsertSchema(salesTransactions).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertSalesTransactionItemSchema = createInsertSchema(salesTransactionItems).omit({
  id: true,
  createdAt: true
});

export const insertCashOperationSchema = createInsertSchema(cashOperations).omit({
  id: true,
  createdAt: true
});

export const insertUserRoleSchema = createInsertSchema(userRoles).omit({
  id: true,
  createdAt: true
});

// === Типы ===

export type CashRegister = typeof cashRegisters.$inferSelect;
export type InsertCashRegister = z.infer<typeof insertCashRegisterSchema>;

export type CashShift = typeof cashShifts.$inferSelect;
export type InsertCashShift = z.infer<typeof insertCashShiftSchema>;

export type Customer = typeof customers.$inferSelect;
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;

export type DiscountRule = typeof discountRules.$inferSelect;
export type InsertDiscountRule = z.infer<typeof insertDiscountRuleSchema>;

export type PaymentMethod = typeof paymentMethods.$inferSelect;
export type InsertPaymentMethod = z.infer<typeof insertPaymentMethodSchema>;

export type SalesTransaction = typeof salesTransactions.$inferSelect;
export type InsertSalesTransaction = z.infer<typeof insertSalesTransactionSchema>;

export type SalesTransactionItem = typeof salesTransactionItems.$inferSelect;
export type InsertSalesTransactionItem = z.infer<typeof insertSalesTransactionItemSchema>;

export type CashOperation = typeof cashOperations.$inferSelect;
export type InsertCashOperation = z.infer<typeof insertCashOperationSchema>;

export const insertUserRoleAssignmentSchema = createInsertSchema(userRoleAssignments).omit({
  id: true,
  assignedAt: true
});

export type UserRole = typeof userRoles.$inferSelect;
export type InsertUserRole = z.infer<typeof insertUserRoleSchema>;

export type UserRoleAssignment = typeof userRoleAssignments.$inferSelect;
export type InsertUserRoleAssignment = z.infer<typeof insertUserRoleAssignmentSchema>;

// Billing schemas and types
export const insertSubscriptionPlanSchema = createInsertSchema(subscriptionPlans).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertClinicSubscriptionSchema = createInsertSchema(clinicSubscriptions).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertSubscriptionPaymentSchema = createInsertSchema(subscriptionPayments).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertBillingNotificationSchema = createInsertSchema(billingNotifications).omit({
  id: true,
  createdAt: true
});

export type SubscriptionPlan = typeof subscriptionPlans.$inferSelect;
export type InsertSubscriptionPlan = z.infer<typeof insertSubscriptionPlanSchema>;

export type ClinicSubscription = typeof clinicSubscriptions.$inferSelect;
export type InsertClinicSubscription = z.infer<typeof insertClinicSubscriptionSchema>;

export type SubscriptionPayment = typeof subscriptionPayments.$inferSelect;
export type InsertSubscriptionPayment = z.infer<typeof insertSubscriptionPaymentSchema>;

export type BillingNotification = typeof billingNotifications.$inferSelect;
export type InsertBillingNotification = z.infer<typeof insertBillingNotificationSchema>;

// Integration credentials schemas and types
export const insertIntegrationCredentialsSchema = createInsertSchema(integrationCredentials).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastSyncAt: true,
  lastSyncStatus: true,
  lastSyncError: true
});

export type IntegrationCredentials = typeof integrationCredentials.$inferSelect;
export type InsertIntegrationCredentials = z.infer<typeof insertIntegrationCredentialsSchema>;

// Clinical Cases schemas and types
export const insertClinicalCaseSchema = createInsertSchema(clinicalCases).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  tenantId: true,
  branchId: true
});

export const insertClinicalEncounterSchema = createInsertSchema(clinicalEncounters).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  tenantId: true,
  branchId: true
});

export const insertLabAnalysisSchema = createInsertSchema(labAnalyses).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  tenantId: true,
  branchId: true
});

export const insertAttachmentSchema = createInsertSchema(attachments).omit({
  id: true,
  createdAt: true,
  tenantId: true,
  branchId: true
});

export type ClinicalCase = typeof clinicalCases.$inferSelect;
export type InsertClinicalCase = z.infer<typeof insertClinicalCaseSchema>;

export type ClinicalEncounter = typeof clinicalEncounters.$inferSelect;
export type InsertClinicalEncounter = z.infer<typeof insertClinicalEncounterSchema>;

export type LabAnalysis = typeof labAnalyses.$inferSelect;
export type InsertLabAnalysis = z.infer<typeof insertLabAnalysisSchema>;

export type Attachment = typeof attachments.$inferSelect;
export type InsertAttachment = z.infer<typeof insertAttachmentSchema>;

// Conversations and Messages schemas and types
export const insertConversationSchema = createInsertSchema(conversations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  tenantId: true
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true
});

export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = z.infer<typeof insertConversationSchema>;

export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;

// Call Logs schemas and types
export const insertCallLogSchema = createInsertSchema(callLogs).omit({
  id: true,
  createdAt: true,
  tenantId: true
});

export type CallLog = typeof callLogs.$inferSelect;
export type InsertCallLog = z.infer<typeof insertCallLogSchema>;

// ========================================
// HOSPITAL MODULE (Inpatient/Стационар)
// ========================================

// Клетки/боксы в стационаре (Cages)
export const cages = pgTable('cages', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar('tenant_id').references(() => tenants.id).notNull(),
  branchId: varchar('branch_id').references(() => branches.id).notNull(),
  name: varchar('name', { length: 100 }).notNull(), // "Бокс 3", "VIP-палата"
  status: varchar('status', { length: 20 }).default('available').notNull(), // available, occupied, maintenance
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  tenantIdIdx: index('cages_tenant_idx').on(table.tenantId),
  branchIdIdx: index('cages_branch_idx').on(table.branchId),
  statusIdx: index('cages_status_idx').on(table.status),
  statusCheck: check('cages_status_check', sql`${table.status} IN ('available', 'occupied', 'maintenance')`)
}));

// Пребывания в стационаре (Hospital Stays)
export const hospitalStays = pgTable('hospital_stays', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar('tenant_id').references(() => tenants.id).notNull(),
  branchId: varchar('branch_id').references(() => branches.id).notNull(),
  patientId: varchar('patient_id').references(() => patients.id).notNull(),
  cageId: varchar('cage_id').references(() => cages.id).notNull(),
  activeInvoiceId: varchar('active_invoice_id').references(() => invoices.id).notNull(), // Ключевая связь для биллинга
  status: varchar('status', { length: 20 }).default('active').notNull(), // active, discharged
  admittedAt: timestamp('admitted_at').defaultNow().notNull(),
  dischargedAt: timestamp('discharged_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  tenantIdIdx: index('hospital_stays_tenant_idx').on(table.tenantId),
  branchIdIdx: index('hospital_stays_branch_idx').on(table.branchId),
  patientIdIdx: index('hospital_stays_patient_idx').on(table.patientId),
  cageIdIdx: index('hospital_stays_cage_idx').on(table.cageId),
  statusIdx: index('hospital_stays_status_idx').on(table.status),
  activeInvoiceIdx: index('hospital_stays_invoice_idx').on(table.activeInvoiceId),
  statusCheck: check('hospital_stays_status_check', sql`${table.status} IN ('active', 'discharged')`)
}));

// Журнал манипуляций/процедур (Treatment Log)
export const treatmentLog = pgTable('treatment_log', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar('tenant_id').references(() => tenants.id).notNull(),
  branchId: varchar('branch_id').references(() => branches.id).notNull(),
  hospitalStayId: varchar('hospital_stay_id').references(() => hospitalStays.id).notNull(),
  serviceId: varchar('service_id').references(() => services.id).notNull(), // Оказанная услуга
  performerName: varchar('performer_name', { length: 255 }).notNull(), // Имя сотрудника
  performedAt: timestamp('performed_at').defaultNow().notNull(),
  notes: text('notes'), // Заметки, например "Препарат введен в правую лапу"
  createdAt: timestamp('created_at').defaultNow().notNull()
}, (table) => ({
  tenantIdIdx: index('treatment_log_tenant_idx').on(table.tenantId),
  branchIdIdx: index('treatment_log_branch_idx').on(table.branchId),
  hospitalStayIdIdx: index('treatment_log_stay_idx').on(table.hospitalStayId),
  serviceIdIdx: index('treatment_log_service_idx').on(table.serviceId),
  performedAtIdx: index('treatment_log_performed_at_idx').on(table.performedAt)
}));

// Zod schemas для валидации
export const insertCageSchema = createInsertSchema(cages).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  tenantId: true
});

export const insertHospitalStaySchema = createInsertSchema(hospitalStays).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  tenantId: true
});

export const insertTreatmentLogSchema = createInsertSchema(treatmentLog).omit({
  id: true,
  createdAt: true,
  tenantId: true
});

export type Cage = typeof cages.$inferSelect;
export type InsertCage = z.infer<typeof insertCageSchema>;

export type HospitalStay = typeof hospitalStays.$inferSelect;
export type InsertHospitalStay = z.infer<typeof insertHospitalStaySchema>;

export type TreatmentLog = typeof treatmentLog.$inferSelect;
export type InsertTreatmentLog = z.infer<typeof insertTreatmentLogSchema>;

// Document Templates schemas and types
export const insertDocumentTemplateSchema = createInsertSchema(documentTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export type DocumentTemplate = typeof documentTemplates.$inferSelect;
export type InsertDocumentTemplate = z.infer<typeof insertDocumentTemplateSchema>;

// ========================================
// LABORATORY INTEGRATIONS
// ========================================

// External Laboratory Integration Types
export const EXTERNAL_LAB_TYPE = ['vet_union', 'chance_bio', 'other'] as const;
export const LAB_INTEGRATION_STATUS = ['active', 'inactive', 'testing', 'error'] as const;
export const ANALYZER_CONNECTION_TYPE = ['serial', 'tcp_ip'] as const;
export const ANALYZER_PROTOCOL = ['astm_lis2a2', 'hl7', 'custom'] as const;
export const ANALYZER_STATUS = ['online', 'offline', 'error', 'maintenance'] as const;
export const LAB_IMPORT_STATUS = ['pending', 'processing', 'completed', 'failed'] as const;

// External Laboratory Integrations - настройки подключения к внешним лабораториям
export const externalLabIntegrations = pgTable('external_lab_integrations', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar('tenant_id').references(() => tenants.id).notNull(),
  branchId: varchar('branch_id').references(() => branches.id),
  
  labType: varchar('lab_type', { length: 50 }).notNull(), // vet_union, chance_bio, other
  labName: varchar('lab_name', { length: 255 }).notNull(), // Название лаборатории
  
  apiUrl: text('api_url'), // URL API лаборатории
  apiKey: text('api_key'), // API ключ (зашифрованный)
  apiSecret: text('api_secret'), // API секрет (зашифрованный)
  clientId: varchar('client_id', { length: 255 }), // ID клиента в системе лаборатории
  contractNumber: varchar('contract_number', { length: 100 }), // Номер договора
  
  email: varchar('email', { length: 255 }), // Email для получения результатов
  phone: varchar('phone', { length: 50 }), // Телефон для связи
  contactPerson: varchar('contact_person', { length: 255 }), // Контактное лицо
  
  autoImportEnabled: boolean('auto_import_enabled').default(false), // Автоматический импорт результатов
  importSchedule: varchar('import_schedule', { length: 50 }), // Расписание импорта (cron формат)
  webhookUrl: text('webhook_url'), // URL для получения webhook уведомлений
  webhookSecret: text('webhook_secret'), // Секрет для верификации webhook
  
  status: varchar('status', { length: 20 }).default('inactive'),
  lastSyncAt: timestamp('last_sync_at'),
  lastError: text('last_error'),
  
  settings: jsonb('settings'), // Дополнительные настройки
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  tenantIdIdx: index('ext_lab_integrations_tenant_idx').on(table.tenantId),
  branchIdIdx: index('ext_lab_integrations_branch_idx').on(table.branchId),
  labTypeIdx: index('ext_lab_integrations_type_idx').on(table.labType),
  statusIdx: index('ext_lab_integrations_status_idx').on(table.status),
  labTypeCheck: check('ext_lab_integrations_type_check', sql`${table.labType} IN ('vet_union', 'chance_bio', 'other')`),
  statusCheck: check('ext_lab_integrations_status_check', sql`${table.status} IN ('active', 'inactive', 'testing', 'error')`)
}));

// Laboratory Analyzers - подключенные анализаторы крови/мочи
export const labAnalyzers = pgTable('lab_analyzers', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar('tenant_id').references(() => tenants.id).notNull(),
  branchId: varchar('branch_id').references(() => branches.id).notNull(),
  
  name: varchar('name', { length: 255 }).notNull(), // Название анализатора
  manufacturer: varchar('manufacturer', { length: 255 }), // Производитель
  model: varchar('model', { length: 255 }), // Модель
  serialNumber: varchar('serial_number', { length: 100 }), // Серийный номер
  analyzerType: varchar('analyzer_type', { length: 50 }), // hematology, chemistry, urine, coagulation
  
  connectionType: varchar('connection_type', { length: 20 }).default('serial'), // serial, tcp_ip
  protocol: varchar('protocol', { length: 50 }).default('astm_lis2a2'), // astm_lis2a2, hl7, custom
  
  // Настройки COM-порта
  comPort: varchar('com_port', { length: 20 }), // COM1, COM2, etc.
  baudRate: integer('baud_rate').default(9600),
  dataBits: integer('data_bits').default(8),
  parity: varchar('parity', { length: 10 }).default('none'), // none, odd, even
  stopBits: varchar('stop_bits', { length: 10 }).default('1'), // 1, 1.5, 2
  
  // Настройки TCP/IP
  ipAddress: varchar('ip_address', { length: 45 }),
  port: integer('port'),
  
  // Маппинг тестов
  testMapping: jsonb('test_mapping'), // Сопоставление кодов тестов анализатора с системой
  
  status: varchar('status', { length: 20 }).default('offline'), // online, offline, error, maintenance
  lastHeartbeat: timestamp('last_heartbeat'),
  lastError: text('last_error'),
  
  autoReceive: boolean('auto_receive').default(true), // Автоматически принимать результаты
  requireConfirmation: boolean('require_confirmation').default(false), // Требовать подтверждение результатов
  
  settings: jsonb('settings'), // Дополнительные настройки
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  tenantIdIdx: index('lab_analyzers_tenant_idx').on(table.tenantId),
  branchIdIdx: index('lab_analyzers_branch_idx').on(table.branchId),
  statusIdx: index('lab_analyzers_status_idx').on(table.status),
  connectionTypeCheck: check('lab_analyzers_conn_type_check', sql`${table.connectionType} IN ('serial', 'tcp_ip')`),
  protocolCheck: check('lab_analyzers_protocol_check', sql`${table.protocol} IN ('astm_lis2a2', 'hl7', 'custom')`),
  statusCheck: check('lab_analyzers_status_check', sql`${table.status} IN ('online', 'offline', 'error', 'maintenance')`)
}));

// Lab Result Imports - импортированные результаты из лабораторий и анализаторов
export const labResultImports = pgTable('lab_result_imports', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar('tenant_id').references(() => tenants.id).notNull(),
  branchId: varchar('branch_id').references(() => branches.id).notNull(),
  
  source: varchar('source', { length: 50 }).notNull(), // external_lab, analyzer, manual_file
  externalLabId: varchar('external_lab_id').references(() => externalLabIntegrations.id),
  analyzerId: varchar('analyzer_id').references(() => labAnalyzers.id),
  
  labOrderId: varchar('lab_order_id').references(() => labOrders.id), // Связь с заказом на анализ
  patientId: varchar('patient_id').references(() => patients.id),
  
  externalOrderNumber: varchar('external_order_number', { length: 100 }), // Номер заказа в лаборатории
  sampleId: varchar('sample_id', { length: 100 }), // ID пробы
  
  rawData: text('raw_data'), // Сырые данные (ASTM, JSON, XML)
  parsedData: jsonb('parsed_data'), // Распарсенные данные
  
  fileName: varchar('file_name', { length: 255 }), // Имя файла (для ручного импорта)
  fileUrl: text('file_url'), // Путь к файлу
  
  status: varchar('status', { length: 20 }).default('pending'), // pending, processing, completed, failed
  errorMessage: text('error_message'),
  
  processedBy: varchar('processed_by').references(() => users.id),
  processedAt: timestamp('processed_at'),
  
  resultsCreated: integer('results_created').default(0), // Количество созданных результатов
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  tenantIdIdx: index('lab_result_imports_tenant_idx').on(table.tenantId),
  branchIdIdx: index('lab_result_imports_branch_idx').on(table.branchId),
  sourceIdx: index('lab_result_imports_source_idx').on(table.source),
  statusIdx: index('lab_result_imports_status_idx').on(table.status),
  labOrderIdIdx: index('lab_result_imports_order_idx').on(table.labOrderId),
  patientIdIdx: index('lab_result_imports_patient_idx').on(table.patientId),
  externalLabIdIdx: index('lab_result_imports_ext_lab_idx').on(table.externalLabId),
  analyzerIdIdx: index('lab_result_imports_analyzer_idx').on(table.analyzerId),
  statusCheck: check('lab_result_imports_status_check', sql`${table.status} IN ('pending', 'processing', 'completed', 'failed')`)
}));

// Zod schemas for lab integrations
export const insertExternalLabIntegrationSchema = createInsertSchema(externalLabIntegrations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  tenantId: true
}).extend({
  labType: z.enum(EXTERNAL_LAB_TYPE),
  status: z.enum(LAB_INTEGRATION_STATUS).default('inactive'),
  labName: z.string().min(2, 'Название лаборатории обязательно'),
  email: z.string().email('Неверный формат email').optional().or(z.literal('')),
  autoImportEnabled: z.boolean().default(false)
});

export const insertLabAnalyzerSchema = createInsertSchema(labAnalyzers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  tenantId: true
}).extend({
  connectionType: z.enum(ANALYZER_CONNECTION_TYPE).default('serial'),
  protocol: z.enum(ANALYZER_PROTOCOL).default('astm_lis2a2'),
  status: z.enum(ANALYZER_STATUS).default('offline'),
  name: z.string().min(2, 'Название анализатора обязательно'),
  baudRate: z.number().int().default(9600),
  dataBits: z.number().int().default(8),
  parity: z.enum(['none', 'odd', 'even']).default('none'),
  stopBits: z.enum(['1', '1.5', '2']).default('1'),
  port: z.number().int().min(1).max(65535).optional(),
  autoReceive: z.boolean().default(true),
  requireConfirmation: z.boolean().default(false)
});

export const insertLabResultImportSchema = createInsertSchema(labResultImports).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  tenantId: true
}).extend({
  status: z.enum(LAB_IMPORT_STATUS).default('pending'),
  source: z.enum(['external_lab', 'analyzer', 'manual_file'])
});

// Types for lab integrations
export type ExternalLabIntegration = typeof externalLabIntegrations.$inferSelect;
export type InsertExternalLabIntegration = z.infer<typeof insertExternalLabIntegrationSchema>;

export type LabAnalyzer = typeof labAnalyzers.$inferSelect;
export type InsertLabAnalyzer = z.infer<typeof insertLabAnalyzerSchema>;

export type LabResultImport = typeof labResultImports.$inferSelect;
export type InsertLabResultImport = z.infer<typeof insertLabResultImportSchema>;

// ============================================
// DICOM IMAGING INTEGRATION
// ============================================

// DICOM Modality types
export const DICOM_MODALITY = ['CR', 'DX', 'US', 'CT', 'MR', 'XA', 'RF', 'OT'] as const;
export const DICOM_STUDY_STATUS = ['scheduled', 'in_progress', 'completed', 'cancelled'] as const;
export const DICOM_DEVICE_STATUS = ['online', 'offline', 'maintenance', 'error'] as const;

// DICOM Devices - рентген-аппараты, УЗИ-аппараты и другие DICOM-устройства
export const dicomDevices = pgTable('dicom_devices', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar('tenant_id').references(() => tenants.id).notNull(),
  branchId: varchar('branch_id').references(() => branches.id).notNull(),
  
  name: varchar('name', { length: 255 }).notNull(), // Название аппарата
  modality: varchar('modality', { length: 10 }).notNull(), // CR, DX, US, CT, MR, etc.
  manufacturer: varchar('manufacturer', { length: 255 }), // Производитель
  model: varchar('model', { length: 255 }), // Модель
  serialNumber: varchar('serial_number', { length: 100 }), // Серийный номер
  
  aeTitle: varchar('ae_title', { length: 16 }), // DICOM Application Entity Title
  ipAddress: varchar('ip_address', { length: 45 }), // IP адрес устройства
  port: integer('port').default(104), // DICOM порт (по умолчанию 104)
  
  connectionType: varchar('connection_type', { length: 20 }).default('network'), // network, usb, folder_watch
  watchFolder: text('watch_folder'), // Папка для мониторинга новых файлов
  
  status: varchar('status', { length: 20 }).default('offline'),
  lastConnectedAt: timestamp('last_connected_at'),
  lastError: text('last_error'),
  
  settings: jsonb('settings'), // Дополнительные настройки
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  tenantIdIdx: index('dicom_devices_tenant_idx').on(table.tenantId),
  branchIdIdx: index('dicom_devices_branch_idx').on(table.branchId),
  aeTitleIdx: index('dicom_devices_ae_title_idx').on(table.aeTitle),
  modalityCheck: check('dicom_devices_modality_check', sql`${table.modality} IN ('CR', 'DX', 'US', 'CT', 'MR', 'XA', 'RF', 'OT')`),
  statusCheck: check('dicom_devices_status_check', sql`${table.status} IN ('online', 'offline', 'maintenance', 'error')`)
}));

// DICOM Studies - исследования (сессии сканирования)
export const dicomStudies = pgTable('dicom_studies', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar('tenant_id').references(() => tenants.id).notNull(),
  branchId: varchar('branch_id').references(() => branches.id).notNull(),
  
  patientId: varchar('patient_id').references(() => patients.id).notNull(),
  encounterId: varchar('encounter_id').references(() => clinicalEncounters.id), // Связь с визитом
  
  studyInstanceUid: varchar('study_instance_uid', { length: 64 }).notNull().unique(), // DICOM Study Instance UID
  accessionNumber: varchar('accession_number', { length: 64 }), // Номер направления
  
  studyDate: timestamp('study_date'), // Дата исследования
  studyTime: varchar('study_time', { length: 14 }), // Время исследования (HHMMSS.FFFFFF)
  studyDescription: text('study_description'), // Описание исследования
  
  modality: varchar('modality', { length: 10 }).notNull(), // CR, DX, US, etc.
  bodyPart: varchar('body_part', { length: 100 }), // Область исследования
  
  referringPhysician: varchar('referring_physician', { length: 255 }), // Направивший врач
  performingPhysician: varchar('performing_physician', { length: 255 }), // Выполняющий врач
  
  numberOfSeries: integer('number_of_series').default(0),
  numberOfInstances: integer('number_of_instances').default(0),
  
  status: varchar('status', { length: 20 }).default('completed'),
  
  deviceId: varchar('device_id').references(() => dicomDevices.id), // С какого аппарата
  
  interpretation: text('interpretation'), // Заключение врача
  interpretedBy: varchar('interpreted_by').references(() => users.id),
  interpretedAt: timestamp('interpreted_at'),
  
  thumbnailPath: text('thumbnail_path'), // Путь к превью
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  tenantIdIdx: index('dicom_studies_tenant_idx').on(table.tenantId),
  branchIdIdx: index('dicom_studies_branch_idx').on(table.branchId),
  patientIdIdx: index('dicom_studies_patient_idx').on(table.patientId),
  encounterIdIdx: index('dicom_studies_encounter_idx').on(table.encounterId),
  studyDateIdx: index('dicom_studies_date_idx').on(table.studyDate),
  modalityIdx: index('dicom_studies_modality_idx').on(table.modality),
  statusCheck: check('dicom_studies_status_check', sql`${table.status} IN ('scheduled', 'in_progress', 'completed', 'cancelled')`)
}));

// DICOM Series - серии внутри исследования
export const dicomSeries = pgTable('dicom_series', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar('tenant_id').references(() => tenants.id).notNull(),
  
  studyId: varchar('study_id').references(() => dicomStudies.id).notNull(),
  
  seriesInstanceUid: varchar('series_instance_uid', { length: 64 }).notNull().unique(), // DICOM Series Instance UID
  seriesNumber: integer('series_number'), // Номер серии
  seriesDescription: text('series_description'), // Описание серии
  
  modality: varchar('modality', { length: 10 }).notNull(),
  bodyPart: varchar('body_part', { length: 100 }),
  
  numberOfInstances: integer('number_of_instances').default(0),
  
  thumbnailPath: text('thumbnail_path'), // Путь к превью серии
  
  createdAt: timestamp('created_at').defaultNow().notNull()
}, (table) => ({
  studyIdIdx: index('dicom_series_study_idx').on(table.studyId),
  tenantIdIdx: index('dicom_series_tenant_idx').on(table.tenantId)
}));

// DICOM Instances - отдельные изображения (снимки)
export const dicomInstances = pgTable('dicom_instances', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar('tenant_id').references(() => tenants.id).notNull(),
  
  seriesId: varchar('series_id').references(() => dicomSeries.id).notNull(),
  
  sopInstanceUid: varchar('sop_instance_uid', { length: 64 }).notNull().unique(), // DICOM SOP Instance UID
  sopClassUid: varchar('sop_class_uid', { length: 64 }), // SOP Class UID
  instanceNumber: integer('instance_number'), // Номер изображения в серии
  
  filePath: text('file_path').notNull(), // Путь к DICOM файлу
  fileSize: integer('file_size'), // Размер файла в байтах
  checksum: varchar('checksum', { length: 64 }), // SHA-256 хэш файла
  
  // Image parameters
  rows: integer('rows'), // Высота изображения
  columns: integer('columns'), // Ширина изображения
  bitsAllocated: integer('bits_allocated'), // Бит на пиксель
  photometricInterpretation: varchar('photometric_interpretation', { length: 50 }),
  
  windowCenter: decimal('window_center', { precision: 10, scale: 2 }), // Центр окна яркости
  windowWidth: decimal('window_width', { precision: 10, scale: 2 }), // Ширина окна яркости
  
  thumbnailPath: text('thumbnail_path'), // Путь к превью
  
  annotations: jsonb('annotations'), // Аннотации и измерения
  
  createdAt: timestamp('created_at').defaultNow().notNull()
}, (table) => ({
  seriesIdIdx: index('dicom_instances_series_idx').on(table.seriesId),
  tenantIdIdx: index('dicom_instances_tenant_idx').on(table.tenantId)
}));

// Zod schemas for DICOM
export const insertDicomDeviceSchema = createInsertSchema(dicomDevices).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  tenantId: true
}).extend({
  modality: z.enum(DICOM_MODALITY),
  status: z.enum(DICOM_DEVICE_STATUS).default('offline'),
  name: z.string().min(2, 'Название устройства обязательно'),
  port: z.number().int().min(1).max(65535).default(104)
});

export const insertDicomStudySchema = createInsertSchema(dicomStudies).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  tenantId: true
}).extend({
  modality: z.enum(DICOM_MODALITY),
  status: z.enum(DICOM_STUDY_STATUS).default('completed'),
  studyInstanceUid: z.string().min(1, 'Study Instance UID обязателен'),
  patientId: z.string().min(1, 'ID пациента обязателен')
});

export const insertDicomSeriesSchema = createInsertSchema(dicomSeries).omit({
  id: true,
  createdAt: true,
  tenantId: true
}).extend({
  modality: z.enum(DICOM_MODALITY),
  seriesInstanceUid: z.string().min(1, 'Series Instance UID обязателен'),
  studyId: z.string().min(1, 'ID исследования обязателен')
});

export const insertDicomInstanceSchema = createInsertSchema(dicomInstances).omit({
  id: true,
  createdAt: true,
  tenantId: true
}).extend({
  sopInstanceUid: z.string().min(1, 'SOP Instance UID обязателен'),
  seriesId: z.string().min(1, 'ID серии обязателен'),
  filePath: z.string().min(1, 'Путь к файлу обязателен')
});

// Types for DICOM
export type DicomDevice = typeof dicomDevices.$inferSelect;
export type InsertDicomDevice = z.infer<typeof insertDicomDeviceSchema>;

export type DicomStudy = typeof dicomStudies.$inferSelect;
export type InsertDicomStudy = z.infer<typeof insertDicomStudySchema>;

export type DicomSeries = typeof dicomSeries.$inferSelect;
export type InsertDicomSeries = z.infer<typeof insertDicomSeriesSchema>;

export type DicomInstance = typeof dicomInstances.$inferSelect;
export type InsertDicomInstance = z.infer<typeof insertDicomInstanceSchema>;

// ========================================
// CRM SYSTEM
// ========================================

// Client Interactions - история всех взаимодействий с клиентом
export const clientInteractions = pgTable('client_interactions', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar('tenant_id').references(() => tenants.id).notNull(),
  branchId: varchar('branch_id').references(() => branches.id),
  
  ownerId: varchar('owner_id').references(() => owners.id).notNull(),
  userId: varchar('user_id').references(() => users.id), // Staff member who made the interaction
  
  type: varchar('type', { length: 20 }).notNull(), // call, sms, email, push, visit, note, complaint, feedback
  channel: varchar('channel', { length: 20 }), // inbound, outbound
  subject: varchar('subject', { length: 255 }),
  content: text('content'), // Message content or notes
  
  // For linked entities
  appointmentId: varchar('appointment_id').references(() => appointments.id),
  invoiceId: varchar('invoice_id').references(() => invoices.id),
  campaignId: varchar('campaign_id'),
  
  // Metadata
  metadata: jsonb('metadata'), // Additional data (call duration, delivery status, etc.)
  
  createdAt: timestamp('created_at').defaultNow().notNull()
}, (table) => ({
  tenantIdIdx: index('client_interactions_tenant_idx').on(table.tenantId),
  ownerIdIdx: index('client_interactions_owner_idx').on(table.ownerId),
  typeIdx: index('client_interactions_type_idx').on(table.type),
  createdAtIdx: index('client_interactions_created_idx').on(table.createdAt),
  branchIdIdx: index('client_interactions_branch_idx').on(table.branchId)
}));

// Health Reminders - напоминания о вакцинации/обработках
export const healthReminders = pgTable('health_reminders', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar('tenant_id').references(() => tenants.id).notNull(),
  branchId: varchar('branch_id').references(() => branches.id),
  
  patientId: varchar('patient_id').references(() => patients.id).notNull(),
  ownerId: varchar('owner_id').references(() => owners.id).notNull(),
  
  type: varchar('type', { length: 30 }).notNull(), // vaccination, deworming, flea_tick, checkup, surgery_followup, dental, custom
  title: varchar('title', { length: 255 }).notNull(), // E.g., "Вакцинация от бешенства"
  description: text('description'),
  
  dueDate: date('due_date').notNull(), // When the reminder is due
  status: varchar('status', { length: 20 }).default('pending'), // pending, sent, acknowledged, completed, cancelled
  
  // Notification settings
  notifyDaysBefore: integer('notify_days_before').default(7), // Days before to send reminder
  notifyVia: text('notify_via').array(), // ['sms', 'push', 'email']
  
  // Tracking
  sentAt: timestamp('sent_at'), // When notification was sent
  acknowledgedAt: timestamp('acknowledged_at'), // When client acknowledged
  completedAt: timestamp('completed_at'), // When the action was completed
  
  // Link to source record if applicable
  medicalRecordId: varchar('medical_record_id').references(() => medicalRecords.id),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  tenantIdIdx: index('health_reminders_tenant_idx').on(table.tenantId),
  patientIdIdx: index('health_reminders_patient_idx').on(table.patientId),
  ownerIdIdx: index('health_reminders_owner_idx').on(table.ownerId),
  statusIdx: index('health_reminders_status_idx').on(table.status),
  dueDateIdx: index('health_reminders_due_date_idx').on(table.dueDate),
  typeIdx: index('health_reminders_type_idx').on(table.type)
}));

// Marketing Campaigns - маркетинговые рассылки
export const marketingCampaigns = pgTable('marketing_campaigns', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar('tenant_id').references(() => tenants.id).notNull(),
  branchId: varchar('branch_id').references(() => branches.id), // null = all branches
  
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  
  channel: varchar('channel', { length: 20 }).notNull(), // sms, email, push
  status: varchar('status', { length: 20 }).default('draft'), // draft, scheduled, running, completed, paused, cancelled
  
  // Targeting
  targetSegments: text('target_segments').array(), // ['vip', 'regular', 'lost']
  targetFilters: jsonb('target_filters'), // Additional filters (last visit > 30 days, etc.)
  
  // Content
  subject: varchar('subject', { length: 255 }), // For email
  content: text('content').notNull(), // Message template with placeholders
  
  // Scheduling
  scheduledAt: timestamp('scheduled_at'), // When to send
  startedAt: timestamp('started_at'), // When campaign started
  completedAt: timestamp('completed_at'), // When campaign finished
  
  // Stats
  totalRecipients: integer('total_recipients').default(0),
  sentCount: integer('sent_count').default(0),
  deliveredCount: integer('delivered_count').default(0),
  failedCount: integer('failed_count').default(0),
  openedCount: integer('opened_count').default(0), // For email
  clickedCount: integer('clicked_count').default(0), // For email with links
  
  createdBy: varchar('created_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  tenantIdIdx: index('marketing_campaigns_tenant_idx').on(table.tenantId),
  statusIdx: index('marketing_campaigns_status_idx').on(table.status),
  channelIdx: index('marketing_campaigns_channel_idx').on(table.channel),
  scheduledAtIdx: index('marketing_campaigns_scheduled_idx').on(table.scheduledAt)
}));

// Campaign Recipients - получатели рассылки
export const campaignRecipients = pgTable('campaign_recipients', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  campaignId: varchar('campaign_id').references(() => marketingCampaigns.id).notNull(),
  ownerId: varchar('owner_id').references(() => owners.id).notNull(),
  
  status: varchar('status', { length: 20 }).default('pending'), // pending, sent, delivered, failed, opened, clicked
  sentAt: timestamp('sent_at'),
  deliveredAt: timestamp('delivered_at'),
  openedAt: timestamp('opened_at'),
  clickedAt: timestamp('clicked_at'),
  failureReason: text('failure_reason'),
  
  createdAt: timestamp('created_at').defaultNow().notNull()
}, (table) => ({
  campaignIdIdx: index('campaign_recipients_campaign_idx').on(table.campaignId),
  ownerIdIdx: index('campaign_recipients_owner_idx').on(table.ownerId),
  statusIdx: index('campaign_recipients_status_idx').on(table.status)
}));

// Zod schemas for CRM
export const insertClientInteractionSchema = createInsertSchema(clientInteractions).omit({
  id: true,
  createdAt: true,
  tenantId: true
}).extend({
  type: z.enum(INTERACTION_TYPE),
  ownerId: z.string().min(1, 'ID владельца обязателен')
});

export const insertHealthReminderSchema = createInsertSchema(healthReminders).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  tenantId: true
}).extend({
  type: z.enum(REMINDER_TYPE),
  status: z.enum(REMINDER_STATUS).default('pending'),
  patientId: z.string().min(1, 'ID пациента обязателен'),
  ownerId: z.string().min(1, 'ID владельца обязателен'),
  dueDate: z.string().or(z.date()),
  notifyVia: z.array(z.enum(CAMPAIGN_CHANNEL)).default(['sms', 'push'])
});

export const insertMarketingCampaignSchema = createInsertSchema(marketingCampaigns).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  tenantId: true,
  totalRecipients: true,
  sentCount: true,
  deliveredCount: true,
  failedCount: true,
  openedCount: true,
  clickedCount: true,
  startedAt: true,
  completedAt: true
}).extend({
  channel: z.enum(CAMPAIGN_CHANNEL),
  status: z.enum(CAMPAIGN_STATUS).default('draft'),
  name: z.string().min(2, 'Название кампании обязательно'),
  content: z.string().min(1, 'Текст сообщения обязателен'),
  targetSegments: z.array(z.enum(CLIENT_SEGMENT)).default(['regular', 'vip'])
});

export const insertCampaignRecipientSchema = createInsertSchema(campaignRecipients).omit({
  id: true,
  createdAt: true
});

// CRM Types
export type ClientInteraction = typeof clientInteractions.$inferSelect;
export type InsertClientInteraction = z.infer<typeof insertClientInteractionSchema>;

export type HealthReminder = typeof healthReminders.$inferSelect;
export type InsertHealthReminder = z.infer<typeof insertHealthReminderSchema>;

export type MarketingCampaign = typeof marketingCampaigns.$inferSelect;
export type InsertMarketingCampaign = z.infer<typeof insertMarketingCampaignSchema>;

export type CampaignRecipient = typeof campaignRecipients.$inferSelect;
export type InsertCampaignRecipient = z.infer<typeof insertCampaignRecipientSchema>;

// Demo Requests - заявки на демонстрацию с лендинга
export const DEMO_REQUEST_STATUS = ['new', 'contacted', 'demo_scheduled', 'demo_completed', 'converted', 'rejected'] as const;

export const demoRequests = pgTable('demo_requests', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  
  fullName: varchar('full_name', { length: 255 }).notNull(),
  clinicName: varchar('clinic_name', { length: 255 }).notNull(),
  phone: varchar('phone', { length: 50 }).notNull(),
  email: varchar('email', { length: 255 }).notNull(),
  city: varchar('city', { length: 100 }),
  branchCount: varchar('branch_count', { length: 20 }),
  currentSystem: varchar('current_system', { length: 50 }),
  comment: text('comment'),
  
  status: varchar('status', { length: 20 }).default('new').notNull(),
  notes: text('notes'),
  
  emailSent: boolean('email_sent').default(false),
  telegramSent: boolean('telegram_sent').default(false),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  statusIdx: index('demo_requests_status_idx').on(table.status),
  createdAtIdx: index('demo_requests_created_idx').on(table.createdAt)
}));

export const insertDemoRequestSchema = createInsertSchema(demoRequests).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  status: true,
  notes: true,
  emailSent: true,
  telegramSent: true
});

export type DemoRequest = typeof demoRequests.$inferSelect;
export type InsertDemoRequest = z.infer<typeof insertDemoRequestSchema>;