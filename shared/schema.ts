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

// Keep the existing users table for system authentication
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

// Owners table
export const owners = pgTable("owners", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 50 }).notNull(),
  email: varchar("email", { length: 255 }),
  address: text("address"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
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
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
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
}));

export const doctorsRelations = relations(doctors, ({ many }) => ({
  appointments: many(appointments),
  medicalRecords: many(medicalRecords),
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

// Keep existing user schema
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
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

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

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
export type InsertInvoiceItem = z.infer<typeof insertInvoiceItemSchema>;

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