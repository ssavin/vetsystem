import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, decimal, boolean, timestamp, jsonb, check, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Define enum constants
export const PATIENT_STATUS = ['healthy', 'sick', 'recovering', 'deceased'] as const;
export const APPOINTMENT_STATUS = ['scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show'] as const;
export const MEDICAL_RECORD_STATUS = ['active', 'completed', 'follow_up_required'] as const;
export const INVOICE_STATUS = ['pending', 'paid', 'overdue', 'cancelled'] as const;
export const INVOICE_ITEM_TYPE = ['service', 'product'] as const;
export const PATIENT_GENDER = ['male', 'female', 'unknown'] as const;

// File and lab analysis enums
export const FILE_TYPES = ['medical_image', 'xray', 'scan', 'receipt', 'lab_result', 'vaccine_record', 'document', 'other'] as const;
export const LAB_RESULT_STATUS = ['pending', 'in_progress', 'completed', 'abnormal', 'critical'] as const;
export const LAB_ORDER_STATUS = ['pending', 'sample_taken', 'in_progress', 'completed', 'cancelled'] as const;
export const LAB_PARAMETER_STATUS = ['normal', 'low', 'high', 'critical_low', 'critical_high'] as const;
export const LAB_URGENCY = ['routine', 'urgent', 'stat'] as const;

// User roles and permissions
export const USER_ROLES = ['врач', 'администратор', 'менеджер', 'менеджер_склада', 'руководитель'] as const;
export const USER_STATUS = ['active', 'inactive'] as const;
export const SMS_VERIFICATION_PURPOSE = ['phone_verification', '2fa'] as const;
export const TWO_FACTOR_METHOD = ['sms', 'disabled'] as const;
export const BRANCH_STATUS = ['active', 'inactive', 'maintenance'] as const;

// Branches table for multi-location clinic support - MUST be defined before users table
export const branches = pgTable("branches", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
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
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Enhanced users table for role-based authentication - MATCHES REPLIT ORIGINAL SCHEMA
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: varchar("username", { length: 100 }).notNull().unique(),
  password: text("password").notNull(),
  email: varchar("email", { length: 255 }),
  fullName: varchar("full_name", { length: 255 }).notNull(),
  role: varchar("role", { length: 50 }).notNull(),
  status: varchar("status", { length: 20 }).default("active"),
  lastLogin: timestamp("last_login"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  phone: varchar("phone", { length: 20 }),
  phoneVerified: boolean("phone_verified").default(false),
  twoFactorEnabled: boolean("two_factor_enabled").default(false),
  twoFactorMethod: varchar("two_factor_method", { length: 10 }).default("sms"),
  branchId: varchar("branch_id"),
});

// SMS Verification Codes table
export const smsVerificationCodes = pgTable("sms_verification_codes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  phone: varchar("phone", { length: 20 }).notNull(),
  codeHash: text("code_hash").notNull(),
  purpose: varchar("purpose", { length: 20 }).notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  attemptCount: integer("attempt_count").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => {
  return {
    purposeCheck: check("sms_codes_purpose_check", sql`${table.purpose} IN ('phone_verification', '2fa')`),
    userIdIdx: index("sms_codes_user_id_idx").on(table.userId),
    phoneIdx: index("sms_codes_phone_idx").on(table.phone),
    expiresAtIdx: index("sms_codes_expires_at_idx").on(table.expiresAt),
    purposeIdx: index("sms_codes_purpose_idx").on(table.purpose),
  };
});

// Owners table
export const owners = pgTable("owners", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 50 }).notNull(),
  email: varchar("email", { length: 255 }),
  address: text("address"),
  branchId: varchar("branch_id").references(() => branches.id), // Temporarily nullable for migration
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => {
  return {
    nameIdx: index("owners_name_idx").on(table.name),
    phoneIdx: index("owners_phone_idx").on(table.phone),
    emailIdx: index("owners_email_idx").on(table.email),
    branchIdIdx: index("owners_branch_id_idx").on(table.branchId),
    createdAtIdx: index("owners_created_at_idx").on(table.createdAt),
  };
});

// Patients table
export const patients = pgTable("patients", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
  species: varchar("species", { length: 100 }).notNull(),
  breed: varchar("breed", { length: 255 }),
  gender: varchar("gender", { length: 10 }),
  birthDate: timestamp("birth_date"),
  color: varchar("color", { length: 255 }),
  weight: decimal("weight", { precision: 5, scale: 2 }),
  microchipNumber: varchar("microchip_number", { length: 255 }),
  isNeutered: boolean("is_neutered").default(false),
  allergies: text("allergies"),
  chronicConditions: text("chronic_conditions"),
  specialMarks: text("special_marks"),
  status: varchar("status", { length: 20 }).default("healthy"),
  ownerId: varchar("owner_id").references(() => owners.id).notNull(),
  branchId: varchar("branch_id").references(() => branches.id), // Temporarily nullable for migration
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => {
  return {
    statusCheck: check("patients_status_check", sql`${table.status} IN ('healthy', 'sick', 'recovering', 'deceased')`),
    genderCheck: check("patients_gender_check", sql`${table.gender} IN ('male', 'female', 'unknown')`),
    weightCheck: check("patients_weight_check", sql`${table.weight} >= 0`),
    ownerIdIdx: index("patients_owner_id_idx").on(table.ownerId),
    microchipIdx: index("patients_microchip_idx").on(table.microchipNumber),
    statusIdx: index("patients_status_idx").on(table.status),
    createdAtIdx: index("patients_created_at_idx").on(table.createdAt),
    nameIdx: index("patients_name_idx").on(table.name),
    speciesIdx: index("patients_species_idx").on(table.species),
    breedIdx: index("patients_breed_idx").on(table.breed),
    branchIdIdx: index("patients_branch_id_idx").on(table.branchId),
  };
});

// Doctors table
export const doctors = pgTable("doctors", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
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
    patientIdIdx: index("appointments_patient_id_idx").on(table.patientId),
    doctorIdIdx: index("appointments_doctor_id_idx").on(table.doctorId),
    appointmentDateIdx: index("appointments_date_idx").on(table.appointmentDate),
    statusIdx: index("appointments_status_idx").on(table.status),
    branchIdIdx: index("appointments_branch_id_idx").on(table.branchId),
    doctorDateIdx: index("appointments_doctor_date_idx").on(table.doctorId, table.appointmentDate),
  };
});

// Medical Records table
export const medicalRecords = pgTable("medical_records", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  patientId: varchar("patient_id").references(() => patients.id).notNull(),
  doctorId: varchar("doctor_id").references(() => doctors.id).notNull(),
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
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => {
  return {
    statusCheck: check("medical_records_status_check", sql`${table.status} IN ('active', 'completed', 'follow_up_required')`),
    temperatureCheck: check("medical_records_temperature_check", sql`${table.temperature} >= 30.0 AND ${table.temperature} <= 45.0`),
    weightCheck: check("medical_records_weight_check", sql`${table.weight} >= 0`),
    patientIdIdx: index("medical_records_patient_id_idx").on(table.patientId),
    doctorIdIdx: index("medical_records_doctor_id_idx").on(table.doctorId),
    visitDateIdx: index("medical_records_visit_date_idx").on(table.visitDate),
    statusIdx: index("medical_records_status_idx").on(table.status),
    branchIdIdx: index("medical_records_branch_id_idx").on(table.branchId),
    patientDateIdx: index("medical_records_patient_date_idx").on(table.patientId, table.visitDate),
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
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => {
  return {
    recordIdIdx: index("medications_record_id_idx").on(table.recordId),
    nameIdx: index("medications_name_idx").on(table.name),
  };
});

// Services table
export const services = pgTable("services", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
  category: varchar("category", { length: 255 }).notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  duration: integer("duration"), // in minutes, for services
  description: text("description"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => {
  return {
    priceCheck: check("services_price_check", sql`${table.price} >= 0`),
    durationCheck: check("services_duration_check", sql`${table.duration} IS NULL OR ${table.duration} > 0`),
    nameIdx: index("services_name_idx").on(table.name),
    categoryIdx: index("services_category_idx").on(table.category),
    activeIdx: index("services_active_idx").on(table.isActive),
  };
});

// Products table
export const products = pgTable("products", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
  category: varchar("category", { length: 255 }).notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  stock: integer("stock").default(0),
  minStock: integer("min_stock").default(0),
  unit: varchar("unit", { length: 50 }).notNull(),
  description: text("description"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => {
  return {
    priceCheck: check("products_price_check", sql`${table.price} >= 0`),
    stockCheck: check("products_stock_check", sql`${table.stock} >= 0`),
    minStockCheck: check("products_min_stock_check", sql`${table.minStock} >= 0`),
    nameIdx: index("products_name_idx").on(table.name),
    categoryIdx: index("products_category_idx").on(table.category),
    activeIdx: index("products_active_idx").on(table.isActive),
    stockIdx: index("products_stock_idx").on(table.stock),
    lowStockIdx: index("products_low_stock_idx").on(table.stock, table.minStock),
    activeStockIdx: index("products_active_stock_idx").on(table.isActive, table.stock),
    createdAtIdx: index("products_created_at_idx").on(table.createdAt),
  };
});

// Invoices table
export const invoices = pgTable("invoices", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
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
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => {
  return {
    statusCheck: check("invoices_status_check", sql`${table.status} IN ('pending', 'paid', 'overdue', 'cancelled')`),
    subtotalCheck: check("invoices_subtotal_check", sql`${table.subtotal} >= 0`),
    discountCheck: check("invoices_discount_check", sql`${table.discount} >= 0`),
    totalCheck: check("invoices_total_check", sql`${table.total} >= 0`),
    dueDateCheck: check("invoices_due_date_check", sql`${table.dueDate} IS NULL OR ${table.dueDate} >= ${table.issueDate}`),
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
  };
});

// Laboratory Studies catalog - справочник исследований
export const labStudies = pgTable("lab_studies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
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

// Enhanced user schema with roles and full user data - MATCHES REPLIT ORIGINAL SCHEMA
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  lastLogin: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  role: z.enum(["admin", "user", "врач", "администратор", "менеджер"] as const),
  status: z.enum(["active", "inactive"] as const).default("active"),
  password: z.string().min(1, "Пароль обязателен"),
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

// Branch schema for validation
export const insertBranchSchema = createInsertSchema(branches).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  status: z.enum(["active", "inactive", "maintenance"] as const).default("active"),
  phone: z.string().regex(/^\+?[1-9]\d{10,14}$/, "Неверный формат номера телефона"),
  email: z.string().email().optional().or(z.literal("")),
});

// Zod schemas for validation
export const insertOwnerSchema = createInsertSchema(owners).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  email: z.string().email().optional().or(z.literal("")),
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
}).extend({
  status: z.enum(APPOINTMENT_STATUS).default("scheduled"),
  appointmentDate: z.coerce.date(),
  duration: z.number().int().min(1, "Duration must be at least 1 minute"),
});

export const insertMedicalRecordSchema = createInsertSchema(medicalRecords).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  status: z.enum(MEDICAL_RECORD_STATUS).default("active"),
  visitDate: z.coerce.date(),
  nextVisit: z.coerce.date().optional(),
  temperature: z.coerce.number().min(30).max(45, "Temperature must be between 30-45°C").transform(val => val?.toString()).optional(),
  weight: z.coerce.number().min(0, "Weight must be positive").transform(val => val?.toString()).optional(),
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
});

export const insertInvoiceSchema = createInsertSchema(invoices).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  status: z.enum(INVOICE_STATUS).default("pending"),
  issueDate: z.coerce.date().optional(),
  dueDate: z.coerce.date().optional(),
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
  name: z.string().min(1, "Название исследования обязательно"),
  category: z.string().min(1, "Категория исследования обязательна"),
  description: z.string().optional(),
  sampleType: z.string().min(1, "Тип образца обязателен"),
  turnaroundTime: z.number().int().min(1, "Время выполнения должно быть больше 0"),
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

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type SmsVerificationCode = typeof smsVerificationCodes.$inferSelect;
export type InsertSmsVerificationCode = z.infer<typeof insertSmsVerificationCodeSchema>;
export type VerifySmsCode = z.infer<typeof verifySmsCodeSchema>;
export type SendSmsCode = z.infer<typeof sendSmsCodeSchema>;

export type Owner = typeof owners.$inferSelect;
export type InsertOwner = z.infer<typeof insertOwnerSchema>;

export type Patient = typeof patients.$inferSelect;
export type InsertPatient = z.infer<typeof insertPatientSchema>;

export type Doctor = typeof doctors.$inferSelect;
export type InsertDoctor = z.infer<typeof insertDoctorSchema>;

export type Appointment = typeof appointments.$inferSelect;
export type InsertAppointment = z.infer<typeof insertAppointmentSchema>;

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