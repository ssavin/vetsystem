import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertOwnerSchema, insertPatientSchema, insertDoctorSchema,
  insertAppointmentSchema, insertMedicalRecordSchema, insertMedicationSchema,
  insertServiceSchema, insertProductSchema, insertInvoiceSchema, insertInvoiceItemSchema,
  insertUserSchema, loginSchema
} from "@shared/schema";
import { z } from "zod";
import { seedDatabase } from "./seed-data";
import { authenticateToken, requireRole, requireModuleAccess, generateTokens } from "./middleware/auth";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import * as veterinaryAI from './ai/veterinary-ai';

export async function registerRoutes(app: Express): Promise<Server> {
  // Add cookie parser middleware
  app.use(cookieParser());
  
  // Enable trust proxy for rate limiting behind reverse proxy
  app.set('trust proxy', 1);

  // Rate limiting for authentication endpoints - healthcare security
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // limit each IP to 5 auth requests per windowMs
    message: { error: 'Слишком много попыток входа. Попробуйте через 15 минут.' },
    standardHeaders: true,
    legacyHeaders: false
  });

  // General API rate limiting
  const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: { error: 'Превышен лимит запросов. Попробуйте позже.' },
    standardHeaders: true,
    legacyHeaders: false
  });

  app.use('/api/', generalLimiter);

  // Helper function to validate request body
  const validateBody = (schema: z.ZodSchema) => {
    return (req: any, res: any, next: any) => {
      try {
        req.body = schema.parse(req.body);
        next();
      } catch (error) {
        res.status(400).json({ error: "Validation failed", details: error });
      }
    };
  };

  // OWNER ROUTES - Protected PHI data
  app.get("/api/owners", authenticateToken, requireModuleAccess('owners'), async (req, res) => {
    try {
      const owners = await storage.getOwners();
      res.json(owners);
    } catch (error) {
      console.error("Error fetching owners:", error);
      res.status(500).json({ error: "Failed to fetch owners" });
    }
  });

  app.get("/api/owners/:id", authenticateToken, requireModuleAccess('owners'), async (req, res) => {
    try {
      const owner = await storage.getOwner(req.params.id);
      if (!owner) {
        return res.status(404).json({ error: "Owner not found" });
      }
      res.json(owner);
    } catch (error) {
      console.error("Error fetching owner:", error);
      res.status(500).json({ error: "Failed to fetch owner" });
    }
  });

  app.post("/api/owners", authenticateToken, requireModuleAccess('owners'), validateBody(insertOwnerSchema), async (req, res) => {
    try {
      const owner = await storage.createOwner(req.body);
      res.status(201).json(owner);
    } catch (error) {
      console.error("Error creating owner:", error);
      res.status(500).json({ error: "Failed to create owner" });
    }
  });

  app.put("/api/owners/:id", authenticateToken, requireModuleAccess('owners'), validateBody(insertOwnerSchema.partial()), async (req, res) => {
    try {
      const owner = await storage.updateOwner(req.params.id, req.body);
      res.json(owner);
    } catch (error) {
      console.error("Error updating owner:", error);
      res.status(500).json({ error: "Failed to update owner" });
    }
  });

  app.delete("/api/owners/:id", authenticateToken, requireModuleAccess('owners'), async (req, res) => {
    try {
      await storage.deleteOwner(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting owner:", error);
      res.status(500).json({ error: "Failed to delete owner" });
    }
  });

  app.get("/api/owners/search/:query", authenticateToken, requireModuleAccess('owners'), async (req, res) => {
    try {
      const owners = await storage.searchOwners(req.params.query);
      res.json(owners);
    } catch (error) {
      console.error("Error searching owners:", error);
      res.status(500).json({ error: "Failed to search owners" });
    }
  });

  // PATIENT ROUTES - Protected PHI data
  app.get("/api/patients", authenticateToken, requireModuleAccess('patients'), async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;
      const patients = await storage.getPatients(limit, offset);
      res.json(patients);
    } catch (error) {
      console.error("Error fetching patients:", error);
      res.status(500).json({ error: "Failed to fetch patients" });
    }
  });

  app.get("/api/patients/:id", authenticateToken, requireModuleAccess('patients'), async (req, res) => {
    try {
      const patient = await storage.getPatient(req.params.id);
      if (!patient) {
        return res.status(404).json({ error: "Patient not found" });
      }
      res.json(patient);
    } catch (error) {
      console.error("Error fetching patient:", error);
      res.status(500).json({ error: "Failed to fetch patient" });
    }
  });

  app.get("/api/patients/owner/:ownerId", authenticateToken, requireModuleAccess('patients'), async (req, res) => {
    try {
      const patients = await storage.getPatientsByOwner(req.params.ownerId);
      res.json(patients);
    } catch (error) {
      console.error("Error fetching patients by owner:", error);
      res.status(500).json({ error: "Failed to fetch patients by owner" });
    }
  });

  app.post("/api/patients", authenticateToken, requireModuleAccess('patients'), validateBody(insertPatientSchema), async (req, res) => {
    try {
      const patient = await storage.createPatient(req.body);
      res.status(201).json(patient);
    } catch (error) {
      console.error("Error creating patient:", error);
      res.status(500).json({ error: "Failed to create patient" });
    }
  });

  app.put("/api/patients/:id", authenticateToken, requireModuleAccess('patients'), validateBody(insertPatientSchema.partial()), async (req, res) => {
    try {
      const patient = await storage.updatePatient(req.params.id, req.body);
      res.json(patient);
    } catch (error) {
      console.error("Error updating patient:", error);
      res.status(500).json({ error: "Failed to update patient" });
    }
  });

  app.delete("/api/patients/:id", authenticateToken, requireModuleAccess('patients'), async (req, res) => {
    try {
      await storage.deletePatient(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting patient:", error);
      res.status(500).json({ error: "Failed to delete patient" });
    }
  });

  app.get("/api/patients/search/:query", authenticateToken, requireModuleAccess('patients'), async (req, res) => {
    try {
      const patients = await storage.searchPatients(req.params.query);
      res.json(patients);
    } catch (error) {
      console.error("Error searching patients:", error);
      res.status(500).json({ error: "Failed to search patients" });
    }
  });

  // DOCTOR ROUTES - Protected PHI data
  app.get("/api/doctors", authenticateToken, requireModuleAccess('doctors'), async (req, res) => {
    try {
      const doctors = await storage.getDoctors();
      res.json(doctors);
    } catch (error) {
      console.error("Error fetching doctors:", error);
      res.status(500).json({ error: "Failed to fetch doctors" });
    }
  });

  app.get("/api/doctors/active", authenticateToken, requireModuleAccess('doctors'), async (req, res) => {
    try {
      const doctors = await storage.getActiveDoctors();
      res.json(doctors);
    } catch (error) {
      console.error("Error fetching active doctors:", error);
      res.status(500).json({ error: "Failed to fetch active doctors" });
    }
  });

  app.get("/api/doctors/:id", authenticateToken, requireModuleAccess('doctors'), async (req, res) => {
    try {
      const doctor = await storage.getDoctor(req.params.id);
      if (!doctor) {
        return res.status(404).json({ error: "Doctor not found" });
      }
      res.json(doctor);
    } catch (error) {
      console.error("Error fetching doctor:", error);
      res.status(500).json({ error: "Failed to fetch doctor" });
    }
  });

  app.post("/api/doctors", authenticateToken, requireRole('руководитель', 'администратор'), validateBody(insertDoctorSchema), async (req, res) => {
    try {
      const doctor = await storage.createDoctor(req.body);
      res.status(201).json(doctor);
    } catch (error) {
      console.error("Error creating doctor:", error);
      res.status(500).json({ error: "Failed to create doctor" });
    }
  });

  app.put("/api/doctors/:id", authenticateToken, requireRole('руководитель', 'администратор'), validateBody(insertDoctorSchema.partial()), async (req, res) => {
    try {
      const doctor = await storage.updateDoctor(req.params.id, req.body);
      res.json(doctor);
    } catch (error) {
      console.error("Error updating doctor:", error);
      res.status(500).json({ error: "Failed to update doctor" });
    }
  });

  app.delete("/api/doctors/:id", authenticateToken, requireRole('руководитель'), async (req, res) => {
    try {
      await storage.deleteDoctor(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting doctor:", error);
      res.status(500).json({ error: "Failed to delete doctor" });
    }
  });

  // APPOINTMENT ROUTES - Protected PHI data
  app.get("/api/appointments", authenticateToken, requireModuleAccess('appointments'), async (req, res) => {
    try {
      const date = req.query.date ? new Date(req.query.date as string) : undefined;
      const appointments = await storage.getAppointments(date);
      res.json(appointments);
    } catch (error) {
      console.error("Error fetching appointments:", error);
      res.status(500).json({ error: "Failed to fetch appointments" });
    }
  });

  app.get("/api/appointments/:id", authenticateToken, requireModuleAccess('appointments'), async (req, res) => {
    try {
      const appointment = await storage.getAppointment(req.params.id);
      if (!appointment) {
        return res.status(404).json({ error: "Appointment not found" });
      }
      res.json(appointment);
    } catch (error) {
      console.error("Error fetching appointment:", error);
      res.status(500).json({ error: "Failed to fetch appointment" });
    }
  });

  app.get("/api/appointments/doctor/:doctorId", authenticateToken, requireModuleAccess('appointments'), async (req, res) => {
    try {
      const date = req.query.date ? new Date(req.query.date as string) : undefined;
      const appointments = await storage.getAppointmentsByDoctor(req.params.doctorId, date);
      res.json(appointments);
    } catch (error) {
      console.error("Error fetching appointments by doctor:", error);
      res.status(500).json({ error: "Failed to fetch appointments by doctor" });
    }
  });

  app.get("/api/appointments/patient/:patientId", authenticateToken, requireModuleAccess('appointments'), async (req, res) => {
    try {
      const appointments = await storage.getAppointmentsByPatient(req.params.patientId);
      res.json(appointments);
    } catch (error) {
      console.error("Error fetching appointments by patient:", error);
      res.status(500).json({ error: "Failed to fetch appointments by patient" });
    }
  });

  app.post("/api/appointments", authenticateToken, requireModuleAccess('appointments'), validateBody(insertAppointmentSchema), async (req, res) => {
    try {
      // Check for appointment conflicts
      const hasConflict = await storage.checkAppointmentConflicts(
        req.body.doctorId,
        new Date(req.body.appointmentDate),
        req.body.duration
      );
      
      if (hasConflict) {
        return res.status(409).json({ error: "Appointment conflicts with existing schedule" });
      }

      const appointment = await storage.createAppointment(req.body);
      res.status(201).json(appointment);
    } catch (error) {
      console.error("Error creating appointment:", error);
      res.status(500).json({ error: "Failed to create appointment" });
    }
  });

  app.put("/api/appointments/:id", authenticateToken, requireModuleAccess('appointments'), validateBody(insertAppointmentSchema.partial()), async (req, res) => {
    try {
      // Check for appointment conflicts if date/time/doctor is being changed
      if (req.body.doctorId || req.body.appointmentDate || req.body.duration) {
        const current = await storage.getAppointment(req.params.id);
        if (!current) {
          return res.status(404).json({ error: "Appointment not found" });
        }

        const doctorId = req.body.doctorId || current.doctorId;
        const appointmentDate = req.body.appointmentDate ? new Date(req.body.appointmentDate) : current.appointmentDate;
        const duration = req.body.duration || current.duration;

        const hasConflict = await storage.checkAppointmentConflicts(
          doctorId,
          appointmentDate,
          duration,
          req.params.id
        );
        
        if (hasConflict) {
          return res.status(409).json({ error: "Appointment conflicts with existing schedule" });
        }
      }

      const appointment = await storage.updateAppointment(req.params.id, req.body);
      res.json(appointment);
    } catch (error) {
      console.error("Error updating appointment:", error);
      res.status(500).json({ error: "Failed to update appointment" });
    }
  });

  app.delete("/api/appointments/:id", authenticateToken, requireModuleAccess('appointments'), async (req, res) => {
    try {
      await storage.deleteAppointment(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting appointment:", error);
      res.status(500).json({ error: "Failed to delete appointment" });
    }
  });

  // MEDICAL RECORDS ROUTES - Protected PHI data
  app.get("/api/medical-records", authenticateToken, requireModuleAccess('medical_records'), async (req, res) => {
    try {
      const patientId = req.query.patientId as string | undefined;
      const records = await storage.getMedicalRecords(patientId);
      res.json(records);
    } catch (error) {
      console.error("Error fetching medical records:", error);
      res.status(500).json({ error: "Failed to fetch medical records" });
    }
  });

  app.get("/api/medical-records/:id", authenticateToken, requireModuleAccess('medical_records'), async (req, res) => {
    try {
      const record = await storage.getMedicalRecord(req.params.id);
      if (!record) {
        return res.status(404).json({ error: "Medical record not found" });
      }
      res.json(record);
    } catch (error) {
      console.error("Error fetching medical record:", error);
      res.status(500).json({ error: "Failed to fetch medical record" });
    }
  });

  app.post("/api/medical-records", authenticateToken, requireModuleAccess('medical_records'), validateBody(insertMedicalRecordSchema), async (req, res) => {
    try {
      const record = await storage.createMedicalRecord(req.body);
      res.status(201).json(record);
    } catch (error) {
      console.error("Error creating medical record:", error);
      res.status(500).json({ error: "Failed to create medical record" });
    }
  });

  app.put("/api/medical-records/:id", authenticateToken, requireModuleAccess('medical_records'), validateBody(insertMedicalRecordSchema.partial()), async (req, res) => {
    try {
      const record = await storage.updateMedicalRecord(req.params.id, req.body);
      res.json(record);
    } catch (error) {
      console.error("Error updating medical record:", error);
      res.status(500).json({ error: "Failed to update medical record" });
    }
  });

  app.delete("/api/medical-records/:id", authenticateToken, requireModuleAccess('medical_records'), async (req, res) => {
    try {
      await storage.deleteMedicalRecord(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting medical record:", error);
      res.status(500).json({ error: "Failed to delete medical record" });
    }
  });

  // MEDICATION ROUTES
  app.get("/api/medical-records/:recordId/medications", authenticateToken, requireModuleAccess('medical_records'), async (req, res) => {
    try {
      const medications = await storage.getMedicationsByRecord(req.params.recordId);
      res.json(medications);
    } catch (error) {
      console.error("Error fetching medications:", error);
      res.status(500).json({ error: "Failed to fetch medications" });
    }
  });

  app.post("/api/medications", authenticateToken, requireModuleAccess('medical_records'), validateBody(insertMedicationSchema), async (req, res) => {
    try {
      const medication = await storage.createMedication(req.body);
      res.status(201).json(medication);
    } catch (error) {
      console.error("Error creating medication:", error);
      res.status(500).json({ error: "Failed to create medication" });
    }
  });

  app.put("/api/medications/:id", authenticateToken, requireModuleAccess('medical_records'), validateBody(insertMedicationSchema.partial()), async (req, res) => {
    try {
      const medication = await storage.updateMedication(req.params.id, req.body);
      res.json(medication);
    } catch (error) {
      console.error("Error updating medication:", error);
      res.status(500).json({ error: "Failed to update medication" });
    }
  });

  app.delete("/api/medications/:id", authenticateToken, requireModuleAccess('medical_records'), async (req, res) => {
    try {
      await storage.deleteMedication(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting medication:", error);
      res.status(500).json({ error: "Failed to delete medication" });
    }
  });

  // SERVICE ROUTES
  app.get("/api/services", async (req, res) => {
    try {
      const activeOnly = req.query.activeOnly === 'true';
      const services = await storage.getServices(activeOnly);
      res.json(services);
    } catch (error) {
      console.error("Error fetching services:", error);
      res.status(500).json({ error: "Failed to fetch services" });
    }
  });

  app.get("/api/services/:id", async (req, res) => {
    try {
      const service = await storage.getService(req.params.id);
      if (!service) {
        return res.status(404).json({ error: "Service not found" });
      }
      res.json(service);
    } catch (error) {
      console.error("Error fetching service:", error);
      res.status(500).json({ error: "Failed to fetch service" });
    }
  });

  app.post("/api/services", validateBody(insertServiceSchema), async (req, res) => {
    try {
      const service = await storage.createService(req.body);
      res.status(201).json(service);
    } catch (error) {
      console.error("Error creating service:", error);
      res.status(500).json({ error: "Failed to create service" });
    }
  });

  app.put("/api/services/:id", validateBody(insertServiceSchema.partial()), async (req, res) => {
    try {
      const service = await storage.updateService(req.params.id, req.body);
      res.json(service);
    } catch (error) {
      console.error("Error updating service:", error);
      res.status(500).json({ error: "Failed to update service" });
    }
  });

  app.delete("/api/services/:id", async (req, res) => {
    try {
      await storage.deleteService(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting service:", error);
      res.status(500).json({ error: "Failed to delete service" });
    }
  });

  app.get("/api/services/search/:query", async (req, res) => {
    try {
      const services = await storage.searchServices(req.params.query);
      res.json(services);
    } catch (error) {
      console.error("Error searching services:", error);
      res.status(500).json({ error: "Failed to search services" });
    }
  });

  // PRODUCT ROUTES
  app.get("/api/products", async (req, res) => {
    try {
      const activeOnly = req.query.activeOnly === 'true';
      const products = await storage.getProducts(activeOnly);
      res.json(products);
    } catch (error) {
      console.error("Error fetching products:", error);
      res.status(500).json({ error: "Failed to fetch products" });
    }
  });

  app.get("/api/products/low-stock", async (req, res) => {
    try {
      const products = await storage.getLowStockProducts();
      res.json(products);
    } catch (error) {
      console.error("Error fetching low stock products:", error);
      res.status(500).json({ error: "Failed to fetch low stock products" });
    }
  });

  app.get("/api/products/:id", async (req, res) => {
    try {
      const product = await storage.getProduct(req.params.id);
      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }
      res.json(product);
    } catch (error) {
      console.error("Error fetching product:", error);
      res.status(500).json({ error: "Failed to fetch product" });
    }
  });

  app.post("/api/products", validateBody(insertProductSchema), async (req, res) => {
    try {
      const product = await storage.createProduct(req.body);
      res.status(201).json(product);
    } catch (error) {
      console.error("Error creating product:", error);
      res.status(500).json({ error: "Failed to create product" });
    }
  });

  app.put("/api/products/:id", validateBody(insertProductSchema.partial()), async (req, res) => {
    try {
      const product = await storage.updateProduct(req.params.id, req.body);
      res.json(product);
    } catch (error) {
      console.error("Error updating product:", error);
      res.status(500).json({ error: "Failed to update product" });
    }
  });

  app.put("/api/products/:id/stock", async (req, res) => {
    try {
      const { quantity } = req.body;
      if (typeof quantity !== 'number') {
        return res.status(400).json({ error: "Quantity must be a number" });
      }
      const product = await storage.updateProductStock(req.params.id, quantity);
      res.json(product);
    } catch (error) {
      console.error("Error updating product stock:", error);
      res.status(500).json({ error: "Failed to update product stock" });
    }
  });

  app.delete("/api/products/:id", async (req, res) => {
    try {
      await storage.deleteProduct(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting product:", error);
      res.status(500).json({ error: "Failed to delete product" });
    }
  });

  app.get("/api/products/search/:query", async (req, res) => {
    try {
      const products = await storage.searchProducts(req.params.query);
      res.json(products);
    } catch (error) {
      console.error("Error searching products:", error);
      res.status(500).json({ error: "Failed to search products" });
    }
  });

  // INVOICE ROUTES - Protected financial data
  app.get("/api/invoices", authenticateToken, requireModuleAccess('finance'), async (req, res) => {
    try {
      const status = req.query.status as string | undefined;
      const invoices = await storage.getInvoices(status);
      res.json(invoices);
    } catch (error) {
      console.error("Error fetching invoices:", error);
      res.status(500).json({ error: "Failed to fetch invoices" });
    }
  });

  app.get("/api/invoices/overdue", authenticateToken, requireModuleAccess('finance'), async (req, res) => {
    try {
      const invoices = await storage.getOverdueInvoices();
      res.json(invoices);
    } catch (error) {
      console.error("Error fetching overdue invoices:", error);
      res.status(500).json({ error: "Failed to fetch overdue invoices" });
    }
  });

  app.get("/api/invoices/:id", authenticateToken, requireModuleAccess('finance'), async (req, res) => {
    try {
      const invoice = await storage.getInvoice(req.params.id);
      if (!invoice) {
        return res.status(404).json({ error: "Invoice not found" });
      }
      res.json(invoice);
    } catch (error) {
      console.error("Error fetching invoice:", error);
      res.status(500).json({ error: "Failed to fetch invoice" });
    }
  });

  app.get("/api/invoices/patient/:patientId", authenticateToken, requireModuleAccess('finance'), async (req, res) => {
    try {
      const invoices = await storage.getInvoicesByPatient(req.params.patientId);
      res.json(invoices);
    } catch (error) {
      console.error("Error fetching invoices by patient:", error);
      res.status(500).json({ error: "Failed to fetch invoices by patient" });
    }
  });

  app.post("/api/invoices", authenticateToken, requireModuleAccess('finance'), validateBody(insertInvoiceSchema), async (req, res) => {
    try {
      const invoice = await storage.createInvoice(req.body);
      res.status(201).json(invoice);
    } catch (error) {
      console.error("Error creating invoice:", error);
      res.status(500).json({ error: "Failed to create invoice" });
    }
  });

  app.put("/api/invoices/:id", authenticateToken, requireModuleAccess('finance'), validateBody(insertInvoiceSchema.partial()), async (req, res) => {
    try {
      const invoice = await storage.updateInvoice(req.params.id, req.body);
      res.json(invoice);
    } catch (error) {
      console.error("Error updating invoice:", error);
      res.status(500).json({ error: "Failed to update invoice" });
    }
  });

  app.delete("/api/invoices/:id", authenticateToken, requireModuleAccess('finance'), async (req, res) => {
    try {
      await storage.deleteInvoice(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting invoice:", error);
      res.status(500).json({ error: "Failed to delete invoice" });
    }
  });

  // INVOICE ITEM ROUTES
  app.get("/api/invoices/:invoiceId/items", authenticateToken, requireModuleAccess('finance'), async (req, res) => {
    try {
      const items = await storage.getInvoiceItems(req.params.invoiceId);
      res.json(items);
    } catch (error) {
      console.error("Error fetching invoice items:", error);
      res.status(500).json({ error: "Failed to fetch invoice items" });
    }
  });

  app.post("/api/invoice-items", authenticateToken, requireModuleAccess('finance'), validateBody(insertInvoiceItemSchema), async (req, res) => {
    try {
      const item = await storage.createInvoiceItem(req.body);
      res.status(201).json(item);
    } catch (error) {
      console.error("Error creating invoice item:", error);
      res.status(500).json({ error: "Failed to create invoice item" });
    }
  });

  app.delete("/api/invoice-items/:id", authenticateToken, requireModuleAccess('finance'), async (req, res) => {
    try {
      await storage.deleteInvoiceItem(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting invoice item:", error);
      res.status(500).json({ error: "Failed to delete invoice item" });
    }
  });

  // SEED DATABASE ROUTE (development only)
  app.post("/api/seed-database", async (req, res) => {
    try {
      await seedDatabase();
      res.json({ message: "Database seeded successfully" });
    } catch (error) {
      console.error("Error seeding database:", error);
      res.status(500).json({ error: "Failed to seed database" });
    }
  });

  // DASHBOARD/STATISTICS ROUTES
  // AI ASSISTANCE ROUTES
  app.post("/api/ai/analyze-symptoms", authenticateToken, requireModuleAccess('medical_records'), async (req, res) => {
    try {
      const analysis = await veterinaryAI.analyzeSymptoms(req.body);
      res.json(analysis);
    } catch (error) {
      console.error("AI symptom analysis error:", error);
      res.status(500).json({ error: "Ошибка анализа симптомов ИИ" });
    }
  });

  app.post("/api/ai/generate-soap", authenticateToken, requireModuleAccess('medical_records'), async (req, res) => {
    try {
      const soapNotes = await veterinaryAI.generateSOAPNotes(req.body);
      res.json(soapNotes);
    } catch (error) {
      console.error("AI SOAP generation error:", error);
      res.status(500).json({ error: "Ошибка генерации SOAP заметки" });
    }
  });

  app.post("/api/ai/analyze-image", authenticateToken, requireModuleAccess('medical_records'), async (req, res) => {
    try {
      const { base64Image, imageType, context } = req.body;
      const analysis = await veterinaryAI.analyzeVeterinaryImage(base64Image, imageType, context);
      res.json(analysis);
    } catch (error) {
      console.error("AI image analysis error:", error);
      res.status(500).json({ error: "Ошибка анализа изображения" });
    }
  });

  app.post("/api/ai/treatment-plan", authenticateToken, requireModuleAccess('medical_records'), async (req, res) => {
    try {
      const treatmentPlan = await veterinaryAI.generateTreatmentPlan(req.body);
      res.json(treatmentPlan);
    } catch (error) {
      console.error("AI treatment plan error:", error);
      res.status(500).json({ error: "Ошибка создания плана лечения" });
    }
  });

  app.post("/api/ai/chat", authenticateToken, async (req, res) => {
    try {
      const { question, conversationHistory } = req.body;
      const response = await veterinaryAI.clientChatAssistant(question, conversationHistory);
      res.json({ response });
    } catch (error) {
      console.error("AI chat error:", error);
      res.status(500).json({ error: "Ошибка ИИ-консультанта" });
    }
  });

  // DASHBOARD ROUTES
  app.get("/api/dashboard/stats", async (req, res) => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const [
        totalPatientsResult,
        todayAppointments,
        lowStockProducts,
        overdueInvoices,
        pendingInvoices,
        paidInvoices
      ] = await Promise.all([
        storage.getPatients(1000, 0), // Get all patients for count
        storage.getAppointments(today),
        storage.getLowStockProducts(),
        storage.getOverdueInvoices(),
        storage.getInvoices('pending'),
        storage.getInvoices('paid')
      ]);

      const stats = {
        totalPatients: totalPatientsResult.length,
        todayAppointments: todayAppointments.length,
        activeAppointments: todayAppointments.filter(a => a.status === 'in_progress').length,
        lowStockCount: lowStockProducts.length,
        pendingPayments: pendingInvoices.length,
        overduePayments: overdueInvoices.length,
        totalRevenue: paidInvoices.reduce((sum, inv) => sum + parseFloat(inv.total), 0)
      };

      res.json(stats);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ error: "Failed to fetch dashboard statistics" });
    }
  });

  // AUTHENTICATION ROUTES  
  // Get active branches for login selection
  app.get("/api/branches/active", async (req, res) => {
    try {
      const branches = await storage.getActiveBranches();
      res.json(branches);
    } catch (error) {
      console.error("Error fetching active branches:", error);
      res.status(500).json({ error: "Ошибка получения списка филиалов" });
    }
  });

  app.post("/api/auth/login", authLimiter, validateBody(loginSchema), async (req, res) => {
    try {
      const { username, password, branchId } = req.body;
      
      // Get user by username
      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.status(401).json({ error: "Неверный логин или пароль" });
      }

      if (user.status !== 'active') {
        return res.status(401).json({ error: "Аккаунт заблокирован" });
      }
      
      // Verify password with bcrypt
      const isValidPassword = await storage.verifyPassword(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ error: "Неверный логин или пароль" });
      }
      
      // Verify user has access to the selected branch
      const selectedBranch = await storage.getBranch(branchId);
      if (!selectedBranch || selectedBranch.status !== 'active') {
        return res.status(400).json({ error: "Выбранный филиал недоступен" });
      }
      
      // TODO: Add proper branch access validation based on user.branchId
      // For now, allow access to all active branches

      // Generate JWT tokens with branch info
      const { accessToken, refreshToken } = generateTokens({
        id: user.id,
        username: user.username,
        role: user.role,
        branchId: branchId
      });

      // Update last login
      await storage.updateUserLastLogin(user.id);
      
      // Set secure cookies
      res.cookie('accessToken', accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 15 * 60 * 1000 // 15 minutes - match JWT expiry
      });

      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });
      
      // Return user info (without password) and branch info
      const { password: _, ...userInfo } = user;
      res.json({ 
        user: userInfo, 
        currentBranch: { id: selectedBranch.id, name: selectedBranch.name },
        message: "Успешный вход" 
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Ошибка сервера" });
    }
  });

  app.post("/api/auth/logout", async (req, res) => {
    try {
      // Clear cookies
      res.clearCookie('accessToken');
      res.clearCookie('refreshToken');
      res.json({ message: "Успешный выход" });
    } catch (error) {
      console.error("Logout error:", error);
      res.status(500).json({ error: "Ошибка сервера" });
    }
  });

  app.get("/api/auth/me", authenticateToken, async (req, res) => {
    try {
      // User data is already validated and attached by authenticateToken middleware
      let currentBranch = null;
      if (req.user?.branchId) {
        const branch = await storage.getBranch(req.user.branchId);
        if (branch) {
          currentBranch = { id: branch.id, name: branch.name };
        }
      }
      res.json({ user: req.user, currentBranch });
    } catch (error) {
      console.error("Auth me error:", error);
      res.status(500).json({ error: "Ошибка сервера" });
    }
  });

  // USER MANAGEMENT ROUTES (for administrators)
  app.get("/api/users", authenticateToken, requireRole('руководитель', 'администратор'), async (req, res) => {
    try {
      const users = await storage.getUsers();
      // Remove passwords from response
      const safeUsers = users.map(({ password, ...user }) => user);
      res.json(safeUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  app.post("/api/users", authenticateToken, requireRole('руководитель', 'администратор'), validateBody(insertUserSchema), async (req, res) => {
    try {
      const newUser = await storage.createUser(req.body);
      const { password: _, ...safeUser } = newUser;
      res.status(201).json(safeUser);
    } catch (error) {
      console.error("Error creating user:", error);
      res.status(500).json({ error: "Failed to create user" });
    }
  });

  // PATCH route for user updates (with safe password handling)
  app.patch("/api/users/:id", authenticateToken, requireRole('руководитель', 'администратор'), async (req, res) => {
    try {
      // Create update schema that allows partial updates and optional password
      const updateUserSchema = insertUserSchema.partial().extend({
        password: z.string()
          .min(10, "Пароль должен содержать минимум 10 символов для медицинских систем")
          .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, 
                 "Пароль должен содержать: строчные и заглавные буквы, цифры и символы")
          .optional() // Make password optional for updates
      });
      
      const validatedData = updateUserSchema.parse(req.body);
      
      // Remove empty password field to prevent overwriting
      if (validatedData.password === '' || validatedData.password === undefined) {
        delete validatedData.password;
      }
      
      const updatedUser = await storage.updateUser(req.params.id, validatedData);
      const { password: _, ...safeUser } = updatedUser;
      res.json(safeUser);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Validation failed", details: error.errors });
      }
      console.error("Error updating user:", error);
      res.status(500).json({ error: "Failed to update user" });
    }
  });

  app.put("/api/users/:id", authenticateToken, requireRole('руководитель', 'администратор'), validateBody(insertUserSchema.partial()), async (req, res) => {
    try {
      const updatedUser = await storage.updateUser(req.params.id, req.body);
      const { password: _, ...safeUser } = updatedUser;
      res.json(safeUser);
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ error: "Failed to update user" });
    }
  });

  app.delete("/api/users/:id", authenticateToken, requireRole('руководитель'), async (req, res) => {
    try {
      await storage.deleteUser(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ error: "Failed to delete user" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}