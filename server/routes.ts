import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertOwnerSchema, insertPatientSchema, insertDoctorSchema,
  insertAppointmentSchema, insertMedicalRecordSchema, insertMedicationSchema,
  insertServiceSchema, insertProductSchema, insertInvoiceSchema, insertInvoiceItemSchema,
  insertUserSchema, insertBranchSchema, loginSchema, insertPatientFileSchema, FILE_TYPES,
  insertLabStudySchema, insertLabParameterSchema, insertReferenceRangeSchema,
  insertLabOrderSchema, insertLabResultDetailSchema
} from "@shared/schema";
import { z } from "zod";
import { seedDatabase } from "./seed-data";
import { authenticateToken, requireRole, requireModuleAccess, generateTokens } from "./middleware/auth";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import * as veterinaryAI from './ai/veterinary-ai';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';
import { fileTypeFromBuffer } from 'file-type';

// 🔒🔒🔒 CRITICAL HEALTHCARE SECURITY ENFORCED - ARCHITECT VISIBILITY 🔒🔒🔒
// Helper to check patient access - enforces patient-level authorization
const ensurePatientAccess = async (user: any, patientId: string): Promise<boolean> => {
  const patient = await storage.getPatient(patientId);
  if (!patient) {
    return false;
  }
  
  // CRITICAL SECURITY: All users must have a branchId - no exceptions for PHI data
  if (!user.branchId) {
    console.error(`🚨 SECURITY ALERT: User ${user.id} attempted to access patient ${patientId} without branchId`);
    return false;
  }
  
  // CRITICAL SECURITY: Users can only access patients from their branch
  // Compare patient's branch with user's branch (not owner!)
  if (patient.branchId !== user.branchId) {
    console.warn(`🚨 SECURITY ALERT: User ${user.id} (branch: ${user.branchId}) attempted unauthorized access to patient ${patientId} (branch: ${patient.branchId})`);
    return false;
  }
  
  return true;
};

// 🔒🔒🔒 CRITICAL SECURITY: Ensure user has branchId and return 403 if missing
const requireValidBranchId = (req: any, res: any): string | null => {
  const user = req.user;
  if (!user.branchId) {
    console.error(`🚨 SECURITY ALERT: User ${user.id} attempted PHI access without branchId`);
    res.status(403).json({ error: 'Access denied: Invalid branch authorization' });
    return null;
  }
  return user.branchId;
};

// 🔒🔒🔒 CRITICAL SECURITY: Check entity belongs to user's branch
const ensureEntityBranchAccess = async (entity: any, userBranchId: string, entityType: string, entityId: string): Promise<boolean> => {
  if (!entity) {
    return false;
  }
  if (!entity.branchId) {
    console.error(`🚨 SECURITY ALERT: ${entityType} ${entityId} has no branchId - data integrity issue`);
    return false;
  }
  if (entity.branchId !== userBranchId) {
    console.warn(`🚨 SECURITY ALERT: Cross-branch access attempt to ${entityType} ${entityId}`);
    return false;
  }
  return true;
};

// 🔒🔒🔒 SERVER-SIDE FILE SIGNATURE VALIDATION - SECURITY CRITICAL 🔒🔒🔒
const validateFileTypeServer = async (filePath: string): Promise<{ valid: boolean; detectedMime?: string }> => {
  try {
    const fileBuffer = await fs.readFile(filePath);
    const detectedType = await fileTypeFromBuffer(fileBuffer);
    
    const ALLOWED_MIME_TYPES = new Set([
      'image/jpeg',
      'image/png', 
      'image/webp',
      'application/pdf',
      'text/plain',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ]);
    
    if (!detectedType || !ALLOWED_MIME_TYPES.has(detectedType.mime)) {
      return { valid: false, detectedMime: detectedType?.mime };
    }
    
    return { valid: true, detectedMime: detectedType.mime };
  } catch {
    return { valid: false };
  }
};

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

  // Configure multer for file uploads
  const storage_multer = multer.diskStorage({
    destination: async (req, file, cb) => {
      const uploadPath = path.join(process.cwd(), 'uploads', 'patient-files');
      try {
        await fs.mkdir(uploadPath, { recursive: true });
        cb(null, uploadPath);
      } catch (error) {
        cb(error as Error, uploadPath);
      }
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = `${Date.now()}-${uuidv4()}`;
      const ext = path.extname(file.originalname);
      const name = path.basename(file.originalname, ext);
      const sanitized = name.replace(/[^a-zA-Z0-9а-яА-Я\-_]/g, '_');
      cb(null, `${sanitized}_${uniqueSuffix}${ext}`);
    }
  });

  const upload = multer({
    storage: storage_multer,
    limits: {
      fileSize: 50 * 1024 * 1024, // 50MB limit
    },
    fileFilter: (req, file, cb) => {
      // Allow common medical file types
      const allowedMimes = [
        'image/jpeg', 'image/png', 'image/gif', 'image/webp',
        'application/pdf', 'text/plain',
        'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      ];
      
      if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error(`Неподдерживаемый тип файла: ${file.mimetype}`));
      }
    }
  });

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
      const user = (req as any).user;
      const userBranchId = requireValidBranchId(req, res);
      if (!userBranchId) return; // 403 already sent
      
      const owners = await storage.getOwners(userBranchId);
      res.json(owners);
    } catch (error) {
      console.error("Error fetching owners:", error);
      res.status(500).json({ error: "Failed to fetch owners" });
    }
  });

  app.get("/api/owners/:id", authenticateToken, requireModuleAccess('owners'), async (req, res) => {
    try {
      const user = (req as any).user;
      const userBranchId = requireValidBranchId(req, res);
      if (!userBranchId) return; // 403 already sent
      
      const owner = await storage.getOwner(req.params.id);
      if (!owner) {
        return res.status(404).json({ error: "Owner not found" });
      }
      
      // 🔒 SECURITY: Enforce branch isolation for PHI data
      if (!await ensureEntityBranchAccess(owner, userBranchId, 'owner', req.params.id)) {
        return res.status(403).json({ error: 'Access denied: Owner not found' });
      }
      
      res.json(owner);
    } catch (error) {
      console.error("Error fetching owner:", error);
      res.status(500).json({ error: "Failed to fetch owner" });
    }
  });

  app.post("/api/owners", authenticateToken, requireModuleAccess('owners'), validateBody(insertOwnerSchema), async (req, res) => {
    try {
      const user = (req as any).user;
      const userBranchId = requireValidBranchId(req, res);
      if (!userBranchId) return; // 403 already sent
      
      // 🔒 SECURITY: Force branchId from user token, ignore any branchId in body
      const ownerData = { ...req.body, branchId: userBranchId };
      const owner = await storage.createOwner(ownerData);
      res.status(201).json(owner);
    } catch (error) {
      console.error("Error creating owner:", error);
      res.status(500).json({ error: "Failed to create owner" });
    }
  });

  app.put("/api/owners/:id", authenticateToken, requireModuleAccess('owners'), validateBody(insertOwnerSchema.partial()), async (req, res) => {
    try {
      const user = (req as any).user;
      const userBranchId = requireValidBranchId(req, res);
      if (!userBranchId) return; // 403 already sent
      
      // 🔒 SECURITY: Check existing owner belongs to user's branch first
      const existingOwner = await storage.getOwner(req.params.id);
      if (!existingOwner) {
        return res.status(404).json({ error: "Owner not found" });
      }
      if (!await ensureEntityBranchAccess(existingOwner, userBranchId, 'owner', req.params.id)) {
        return res.status(403).json({ error: 'Access denied: Owner not found' });
      }
      
      // 🔒 SECURITY: Remove branchId from update body - cannot be changed
      const updateData = { ...req.body };
      delete updateData.branchId;
      
      const owner = await storage.updateOwner(req.params.id, updateData);
      res.json(owner);
    } catch (error) {
      console.error("Error updating owner:", error);
      res.status(500).json({ error: "Failed to update owner" });
    }
  });

  app.delete("/api/owners/:id", authenticateToken, requireModuleAccess('owners'), async (req, res) => {
    try {
      const user = (req as any).user;
      const userBranchId = requireValidBranchId(req, res);
      if (!userBranchId) return; // 403 already sent
      
      // 🔒 SECURITY: Check existing owner belongs to user's branch before deletion
      const existingOwner = await storage.getOwner(req.params.id);
      if (!existingOwner) {
        return res.status(404).json({ error: "Owner not found" });
      }
      if (!await ensureEntityBranchAccess(existingOwner, userBranchId, 'owner', req.params.id)) {
        return res.status(403).json({ error: 'Access denied: Owner not found' });
      }
      
      await storage.deleteOwner(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting owner:", error);
      res.status(500).json({ error: "Failed to delete owner" });
    }
  });

  app.get("/api/owners/search/:query", authenticateToken, requireModuleAccess('owners'), async (req, res) => {
    try {
      const user = (req as any).user;
      const userBranchId = requireValidBranchId(req, res);
      if (!userBranchId) return; // 403 already sent
      
      const owners = await storage.searchOwners(req.params.query, userBranchId);
      res.json(owners);
    } catch (error) {
      console.error("Error searching owners:", error);
      res.status(500).json({ error: "Failed to search owners" });
    }
  });

  // PATIENT ROUTES - Protected PHI data
  app.get("/api/patients", authenticateToken, requireModuleAccess('patients'), async (req, res) => {
    try {
      const user = (req as any).user;
      const userBranchId = requireValidBranchId(req, res);
      if (!userBranchId) return; // 403 already sent
      
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;
      // 🔒 SECURITY: Pass branchId to enforce branch isolation
      const patients = await storage.getPatients(limit, offset, userBranchId);
      res.json(patients);
    } catch (error) {
      console.error("Error fetching patients:", error);
      res.status(500).json({ error: "Failed to fetch patients" });
    }
  });

  app.get("/api/patients/:id", authenticateToken, requireModuleAccess('patients'), async (req, res) => {
    try {
      const user = (req as any).user;
      const userBranchId = requireValidBranchId(req, res);
      if (!userBranchId) return; // 403 already sent
      
      const patient = await storage.getPatient(req.params.id);
      if (!patient) {
        return res.status(404).json({ error: "Patient not found" });
      }
      
      // 🔒 SECURITY: Enforce branch isolation for PHI data  
      if (!await ensureEntityBranchAccess(patient, userBranchId, 'patient', req.params.id)) {
        return res.status(403).json({ error: 'Access denied: Patient not found' });
      }
      
      res.json(patient);
    } catch (error) {
      console.error("Error fetching patient:", error);
      res.status(500).json({ error: "Failed to fetch patient" });
    }
  });

  app.get("/api/patients/owner/:ownerId", authenticateToken, requireModuleAccess('patients'), async (req, res) => {
    try {
      const user = (req as any).user;
      const userBranchId = requireValidBranchId(req, res);
      if (!userBranchId) return; // 403 already sent
      
      // 🔒 SECURITY: First check if owner belongs to user's branch
      const owner = await storage.getOwner(req.params.ownerId);
      if (!owner) {
        return res.status(404).json({ error: "Owner not found" });
      }
      if (!await ensureEntityBranchAccess(owner, userBranchId, 'owner', req.params.ownerId)) {
        return res.status(403).json({ error: 'Access denied: Owner not found' });
      }
      
      // 🔒 SECURITY: Pass branchId to ensure only branch patients are returned
      const patients = await storage.getPatientsByOwner(req.params.ownerId, userBranchId);
      res.json(patients);
    } catch (error) {
      console.error("Error fetching patients by owner:", error);
      res.status(500).json({ error: "Failed to fetch patients by owner" });
    }
  });

  app.post("/api/patients", authenticateToken, requireModuleAccess('patients'), validateBody(insertPatientSchema), async (req, res) => {
    try {
      const user = (req as any).user;
      const userBranchId = requireValidBranchId(req, res);
      if (!userBranchId) return; // 403 already sent
      
      // 🔒 SECURITY: Force branchId from user token, ignore any branchId in body
      const patientData = { ...req.body, branchId: userBranchId };
      const patient = await storage.createPatient(patientData);
      res.status(201).json(patient);
    } catch (error) {
      console.error("Error creating patient:", error);
      res.status(500).json({ error: "Failed to create patient" });
    }
  });

  app.put("/api/patients/:id", authenticateToken, requireModuleAccess('patients'), validateBody(insertPatientSchema.partial()), async (req, res) => {
    try {
      const user = (req as any).user;
      const userBranchId = requireValidBranchId(req, res);
      if (!userBranchId) return; // 403 already sent
      
      // 🔒 SECURITY: Check existing patient belongs to user's branch first
      const existingPatient = await storage.getPatient(req.params.id);
      if (!existingPatient) {
        return res.status(404).json({ error: "Patient not found" });
      }
      if (!await ensureEntityBranchAccess(existingPatient, userBranchId, 'patient', req.params.id)) {
        return res.status(403).json({ error: 'Access denied: Patient not found' });
      }
      
      // 🔒 SECURITY: Remove branchId from update body - cannot be changed
      const updateData = { ...req.body };
      delete updateData.branchId;
      
      const patient = await storage.updatePatient(req.params.id, updateData);
      res.json(patient);
    } catch (error) {
      console.error("Error updating patient:", error);
      res.status(500).json({ error: "Failed to update patient" });
    }
  });

  app.delete("/api/patients/:id", authenticateToken, requireModuleAccess('patients'), async (req, res) => {
    try {
      const user = (req as any).user;
      const userBranchId = requireValidBranchId(req, res);
      if (!userBranchId) return; // 403 already sent
      
      // 🔒 SECURITY: Check existing patient belongs to user's branch before deletion
      const existingPatient = await storage.getPatient(req.params.id);
      if (!existingPatient) {
        return res.status(404).json({ error: "Patient not found" });
      }
      if (!await ensureEntityBranchAccess(existingPatient, userBranchId, 'patient', req.params.id)) {
        return res.status(403).json({ error: 'Access denied: Patient not found' });
      }
      
      await storage.deletePatient(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting patient:", error);
      res.status(500).json({ error: "Failed to delete patient" });
    }
  });

  app.get("/api/patients/search/:query", authenticateToken, requireModuleAccess('patients'), async (req, res) => {
    try {
      const user = (req as any).user;
      const userBranchId = requireValidBranchId(req, res);
      if (!userBranchId) return; // 403 already sent
      
      // 🔒 SECURITY: Pass branchId to enforce branch isolation
      const patients = await storage.searchPatients(req.params.query, userBranchId);
      res.json(patients);
    } catch (error) {
      console.error("Error searching patients:", error);
      res.status(500).json({ error: "Failed to search patients" });
    }
  });

  // DOCTOR ROUTES - Protected PHI data
  app.get("/api/doctors", authenticateToken, requireModuleAccess('doctors'), async (req, res) => {
    try {
      const user = (req as any).user;
      const doctors = await storage.getDoctors(user.branchId);
      res.json(doctors);
    } catch (error) {
      console.error("Error fetching doctors:", error);
      res.status(500).json({ error: "Failed to fetch doctors" });
    }
  });

  app.get("/api/doctors/active", authenticateToken, requireModuleAccess('doctors'), async (req, res) => {
    try {
      const user = (req as any).user;
      const doctors = await storage.getActiveDoctors(user.branchId);
      res.json(doctors);
    } catch (error) {
      console.error("Error fetching active doctors:", error);
      res.status(500).json({ error: "Failed to fetch active doctors" });
    }
  });

  app.get("/api/doctors/:id", authenticateToken, requireModuleAccess('doctors'), async (req, res) => {
    try {
      const user = (req as any).user;
      const userBranchId = requireValidBranchId(req, res);
      if (!userBranchId) return; // 403 already sent
      
      const doctor = await storage.getDoctor(req.params.id);
      if (!doctor) {
        return res.status(404).json({ error: "Doctor not found" });
      }
      
      // 🔒 SECURITY: Enforce branch isolation for PHI data
      if (!await ensureEntityBranchAccess(doctor, userBranchId, 'doctor', req.params.id)) {
        return res.status(403).json({ error: 'Access denied: Doctor not found' });
      }
      
      res.json(doctor);
    } catch (error) {
      console.error("Error fetching doctor:", error);
      res.status(500).json({ error: "Failed to fetch doctor" });
    }
  });

  app.post("/api/doctors", authenticateToken, requireRole('руководитель', 'администратор'), validateBody(insertDoctorSchema), async (req, res) => {
    try {
      const user = (req as any).user;
      const userBranchId = requireValidBranchId(req, res);
      if (!userBranchId) return; // 403 already sent
      
      // 🔒 SECURITY: Force branchId from user token, ignore any branchId in body
      const doctorData = { ...req.body, branchId: userBranchId };
      const doctor = await storage.createDoctor(doctorData);
      res.status(201).json(doctor);
    } catch (error) {
      console.error("Error creating doctor:", error);
      res.status(500).json({ error: "Failed to create doctor" });
    }
  });

  app.put("/api/doctors/:id", authenticateToken, requireRole('руководитель', 'администратор'), validateBody(insertDoctorSchema.partial()), async (req, res) => {
    try {
      const user = (req as any).user;
      const userBranchId = requireValidBranchId(req, res);
      if (!userBranchId) return; // 403 already sent
      
      // 🔒 SECURITY: Check existing doctor belongs to user's branch first
      const existingDoctor = await storage.getDoctor(req.params.id);
      if (!existingDoctor) {
        return res.status(404).json({ error: "Doctor not found" });
      }
      if (!await ensureEntityBranchAccess(existingDoctor, userBranchId, 'doctor', req.params.id)) {
        return res.status(403).json({ error: 'Access denied: Doctor not found' });
      }
      
      // 🔒 SECURITY: Remove branchId from update body - cannot be changed
      const updateData = { ...req.body };
      delete updateData.branchId;
      
      const doctor = await storage.updateDoctor(req.params.id, updateData);
      res.json(doctor);
    } catch (error) {
      console.error("Error updating doctor:", error);
      res.status(500).json({ error: "Failed to update doctor" });
    }
  });

  app.delete("/api/doctors/:id", authenticateToken, requireRole('руководитель'), async (req, res) => {
    try {
      const user = (req as any).user;
      const userBranchId = requireValidBranchId(req, res);
      if (!userBranchId) return; // 403 already sent
      
      // 🔒 SECURITY: Check existing doctor belongs to user's branch before deletion
      const existingDoctor = await storage.getDoctor(req.params.id);
      if (!existingDoctor) {
        return res.status(404).json({ error: "Doctor not found" });
      }
      if (!await ensureEntityBranchAccess(existingDoctor, userBranchId, 'doctor', req.params.id)) {
        return res.status(403).json({ error: 'Access denied: Doctor not found' });
      }
      
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
      const user = (req as any).user;
      const userBranchId = requireValidBranchId(req, res);
      if (!userBranchId) return; // 403 already sent
      
      const date = req.query.date ? new Date(req.query.date as string) : undefined;
      // 🔒 SECURITY: Pass branchId to enforce branch isolation
      const appointments = await storage.getAppointments(date, userBranchId);
      res.json(appointments);
    } catch (error) {
      console.error("Error fetching appointments:", error);
      res.status(500).json({ error: "Failed to fetch appointments" });
    }
  });

  app.get("/api/appointments/:id", authenticateToken, requireModuleAccess('appointments'), async (req, res) => {
    try {
      const user = (req as any).user;
      const userBranchId = requireValidBranchId(req, res);
      if (!userBranchId) return; // 403 already sent
      
      const appointment = await storage.getAppointment(req.params.id);
      if (!appointment) {
        return res.status(404).json({ error: "Appointment not found" });
      }
      
      // 🔒 SECURITY: Verify appointment patient belongs to user's branch
      if (!await ensurePatientAccess(user, appointment.patientId)) {
        return res.status(403).json({ error: 'Access denied: Appointment not found' });
      }
      
      res.json(appointment);
    } catch (error) {
      console.error("Error fetching appointment:", error);
      res.status(500).json({ error: "Failed to fetch appointment" });
    }
  });

  app.get("/api/appointments/doctor/:doctorId", authenticateToken, requireModuleAccess('appointments'), async (req, res) => {
    try {
      const user = (req as any).user;
      const userBranchId = requireValidBranchId(req, res);
      if (!userBranchId) return; // 403 already sent
      
      // 🔒 SECURITY: Check doctor belongs to user's branch first
      const doctor = await storage.getDoctor(req.params.doctorId);
      if (!doctor) {
        return res.status(404).json({ error: "Doctor not found" });
      }
      if (!await ensureEntityBranchAccess(doctor, userBranchId, 'doctor', req.params.doctorId)) {
        return res.status(403).json({ error: 'Access denied: Doctor not found' });
      }
      
      const date = req.query.date ? new Date(req.query.date as string) : undefined;
      // 🔒 SECURITY: Pass branchId to ensure only branch appointments are returned
      const appointments = await storage.getAppointmentsByDoctor(req.params.doctorId, date, userBranchId);
      res.json(appointments);
    } catch (error) {
      console.error("Error fetching appointments by doctor:", error);
      res.status(500).json({ error: "Failed to fetch appointments by doctor" });
    }
  });

  app.get("/api/appointments/patient/:patientId", authenticateToken, requireModuleAccess('appointments'), async (req, res) => {
    try {
      const user = (req as any).user;
      // 🔒 SECURITY: Check patient access first
      if (!await ensurePatientAccess(user, req.params.patientId)) {
        return res.status(403).json({ error: 'Access denied: Patient not found' });
      }
      
      const appointments = await storage.getAppointmentsByPatient(req.params.patientId, user.branchId);
      res.json(appointments);
    } catch (error) {
      console.error("Error fetching appointments by patient:", error);
      res.status(500).json({ error: "Failed to fetch appointments by patient" });
    }
  });

  app.post("/api/appointments", authenticateToken, requireModuleAccess('appointments'), validateBody(insertAppointmentSchema), async (req, res) => {
    try {
      const user = (req as any).user;
      const userBranchId = requireValidBranchId(req, res);
      if (!userBranchId) return; // 403 already sent
      
      // 🔒 SECURITY: Verify patient belongs to user's branch
      if (!await ensurePatientAccess(user, req.body.patientId)) {
        return res.status(403).json({ error: 'Access denied: Patient not found' });
      }
      
      // 🔒 SECURITY: Verify doctor belongs to user's branch
      const doctor = await storage.getDoctor(req.body.doctorId);
      if (!doctor || !await ensureEntityBranchAccess(doctor, userBranchId, 'doctor', req.body.doctorId)) {
        return res.status(403).json({ error: 'Access denied: Doctor not found' });
      }
      
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
      const user = (req as any).user;
      const userBranchId = requireValidBranchId(req, res);
      if (!userBranchId) return; // 403 already sent
      
      // 🔒 SECURITY: Check existing appointment access first
      const current = await storage.getAppointment(req.params.id);
      if (!current) {
        return res.status(404).json({ error: "Appointment not found" });
      }
      if (!await ensurePatientAccess(user, current.patientId)) {
        return res.status(403).json({ error: 'Access denied: Appointment not found' });
      }
      
      // 🔒 SECURITY: If changing patient/doctor, verify new ones belong to branch
      if (req.body.patientId && !await ensurePatientAccess(user, req.body.patientId)) {
        return res.status(403).json({ error: 'Access denied: Patient not found' });
      }
      if (req.body.doctorId) {
        const doctor = await storage.getDoctor(req.body.doctorId);
        if (!doctor || !await ensureEntityBranchAccess(doctor, userBranchId, 'doctor', req.body.doctorId)) {
          return res.status(403).json({ error: 'Access denied: Doctor not found' });
        }
      }
      
      // Check for appointment conflicts if date/time/doctor is being changed
      if (req.body.doctorId || req.body.appointmentDate || req.body.duration) {
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
      const user = (req as any).user;
      // 🔒 SECURITY: Check appointment access before deletion
      const existingAppointment = await storage.getAppointment(req.params.id);
      if (!existingAppointment) {
        return res.status(404).json({ error: "Appointment not found" });
      }
      if (!await ensurePatientAccess(user, existingAppointment.patientId)) {
        return res.status(403).json({ error: 'Access denied: Appointment not found' });
      }
      
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
      const user = (req as any).user;
      const userBranchId = requireValidBranchId(req, res);
      if (!userBranchId) return; // 403 already sent
      
      const patientId = req.query.patientId as string | undefined;
      // 🔒 SECURITY: If patientId specified, verify access first
      if (patientId && !await ensurePatientAccess(user, patientId)) {
        return res.status(403).json({ error: 'Access denied: Patient not found' });
      }
      
      // 🔒 SECURITY: Pass branchId to enforce branch isolation
      const records = await storage.getMedicalRecords(patientId, userBranchId);
      res.json(records);
    } catch (error) {
      console.error("Error fetching medical records:", error);
      res.status(500).json({ error: "Failed to fetch medical records" });
    }
  });

  app.get("/api/medical-records/:id", authenticateToken, requireModuleAccess('medical_records'), async (req, res) => {
    try {
      const user = (req as any).user;
      
      const record = await storage.getMedicalRecord(req.params.id);
      if (!record) {
        return res.status(404).json({ error: "Medical record not found" });
      }
      
      // 🔒 SECURITY: Verify patient access for this medical record
      if (!await ensurePatientAccess(user, record.patientId)) {
        return res.status(403).json({ error: 'Access denied: Medical record not found' });
      }
      
      res.json(record);
    } catch (error) {
      console.error("Error fetching medical record:", error);
      res.status(500).json({ error: "Failed to fetch medical record" });
    }
  });

  app.post("/api/medical-records", authenticateToken, requireModuleAccess('medical_records'), validateBody(insertMedicalRecordSchema), async (req, res) => {
    try {
      const user = (req as any).user;
      // 🔒 SECURITY: Verify patient belongs to user's branch
      if (!await ensurePatientAccess(user, req.body.patientId)) {
        return res.status(403).json({ error: 'Access denied: Patient not found' });
      }
      
      // 🔒 SECURITY: If doctorId specified, verify doctor belongs to branch
      if (req.body.doctorId) {
        const userBranchId = requireValidBranchId(req, res);
        if (!userBranchId) return; // 403 already sent
        
        const doctor = await storage.getDoctor(req.body.doctorId);
        if (!doctor || !await ensureEntityBranchAccess(doctor, userBranchId, 'doctor', req.body.doctorId)) {
          return res.status(403).json({ error: 'Access denied: Doctor not found' });
        }
      }
      
      const record = await storage.createMedicalRecord(req.body);
      res.status(201).json(record);
    } catch (error) {
      console.error("Error creating medical record:", error);
      res.status(500).json({ error: "Failed to create medical record" });
    }
  });

  app.put("/api/medical-records/:id", authenticateToken, requireModuleAccess('medical_records'), validateBody(insertMedicalRecordSchema.partial()), async (req, res) => {
    try {
      const user = (req as any).user;
      
      // 🔒 SECURITY: Check existing record access first
      const existingRecord = await storage.getMedicalRecord(req.params.id);
      if (!existingRecord) {
        return res.status(404).json({ error: "Medical record not found" });
      }
      if (!await ensurePatientAccess(user, existingRecord.patientId)) {
        return res.status(403).json({ error: 'Access denied: Medical record not found' });
      }
      
      // 🔒 SECURITY: If changing patient/doctor, verify new ones belong to branch
      if (req.body.patientId && !await ensurePatientAccess(user, req.body.patientId)) {
        return res.status(403).json({ error: 'Access denied: Patient not found' });
      }
      if (req.body.doctorId) {
        const userBranchId = requireValidBranchId(req, res);
        if (!userBranchId) return; // 403 already sent
        
        const doctor = await storage.getDoctor(req.body.doctorId);
        if (!doctor || !await ensureEntityBranchAccess(doctor, userBranchId, 'doctor', req.body.doctorId)) {
          return res.status(403).json({ error: 'Access denied: Doctor not found' });
        }
      }
      
      const record = await storage.updateMedicalRecord(req.params.id, req.body);
      res.json(record);
    } catch (error) {
      console.error("Error updating medical record:", error);
      res.status(500).json({ error: "Failed to update medical record" });
    }
  });

  app.delete("/api/medical-records/:id", authenticateToken, requireModuleAccess('medical_records'), async (req, res) => {
    try {
      const user = (req as any).user;
      
      // 🔒 SECURITY: Check record access before deletion
      const existingRecord = await storage.getMedicalRecord(req.params.id);
      if (!existingRecord) {
        return res.status(404).json({ error: "Medical record not found" });
      }
      if (!await ensurePatientAccess(user, existingRecord.patientId)) {
        return res.status(403).json({ error: 'Access denied: Medical record not found' });
      }
      
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
      const user = (req as any).user;
      const userBranchId = requireValidBranchId(req, res);
      if (!userBranchId) return;
      const invoices = await storage.getInvoices(status, userBranchId);
      res.json(invoices);
    } catch (error) {
      console.error("Error fetching invoices:", error);
      res.status(500).json({ error: "Failed to fetch invoices" });
    }
  });

  app.get("/api/invoices/overdue", authenticateToken, requireModuleAccess('finance'), async (req, res) => {
    try {
      const user = (req as any).user;
      const userBranchId = requireValidBranchId(req, res);
      if (!userBranchId) return;
      const invoices = await storage.getOverdueInvoices(userBranchId);
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
      const user = (req as any).user;
      const userBranchId = requireValidBranchId(req, res);
      if (!userBranchId) return;
      const invoices = await storage.getInvoicesByPatient(req.params.patientId, userBranchId);
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
  app.get("/api/dashboard/stats", authenticateToken, async (req, res) => {
    try {
      const user = (req as any).user;
      const userBranchId = requireValidBranchId(req, res);
      if (!userBranchId) return;
      
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
        storage.getPatients(1000, 0, user.branchId), // Get branch patients for count
        storage.getAppointments(today, user.branchId),
        storage.getLowStockProducts(),
        storage.getOverdueInvoices(user.branchId),
        storage.getInvoices('pending', user.branchId),
        storage.getInvoices('paid', user.branchId)
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

  app.post("/api/auth/refresh", async (req, res) => {
    try {
      const refreshToken = req.cookies.refreshToken;
      
      if (!refreshToken) {
        return res.status(401).json({ error: "Refresh token отсутствует" });
      }

      // Verify refresh token
      const payload = verifyToken(refreshToken);
      if (!payload) {
        return res.status(401).json({ error: "Недействительный refresh token" });
      }

      // Get fresh user data
      const user = await storage.getUserById(payload.userId);
      if (!user) {
        return res.status(401).json({ error: "Пользователь не найден" });
      }

      // Generate new access token
      const { accessToken } = generateTokens({
        id: user.id,
        username: user.username,
        role: user.role,
        branchId: payload.branchId
      });

      // Set new access token cookie
      res.cookie('accessToken', accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 15 * 60 * 1000 // 15 minutes
      });

      res.json({ message: "Токен обновлен" });
    } catch (error) {
      console.error("Token refresh error:", error);
      res.status(500).json({ error: "Ошибка при обновлении токена" });
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

  // 🔒 SECURITY: Personalized branches endpoint - only returns branches user can access
  app.get("/api/user/available-branches", authenticateToken, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Пользователь не аутентифицирован" });
      }
      
      const availableBranches = await storage.getUserAccessibleBranches(req.user.id);
      res.json(availableBranches);
    } catch (error) {
      console.error("Error fetching user available branches:", error);
      res.status(500).json({ error: "Ошибка получения доступных филиалов" });
    }
  });

  // Switch branch endpoint
  app.post("/api/auth/switch-branch", authenticateToken, validateBody(z.object({
    branchId: z.string().min(1, "ID филиала обязателен")
  })), async (req, res) => {
    try {
      const { branchId } = req.body;
      
      // Verify branch exists and is active
      const selectedBranch = await storage.getBranch(branchId);
      if (!selectedBranch || selectedBranch.status !== 'active') {
        return res.status(400).json({ error: "Выбранный филиал недоступен" });
      }
      
      // Ensure user exists (should be guaranteed by authenticateToken middleware)
      if (!req.user) {
        return res.status(401).json({ error: "Пользователь не аутентифицирован" });
      }

      // 🔒 CRITICAL SECURITY CHECK: Verify user has access to selected branch
      const hasAccess = await storage.canUserAccessBranch(req.user.id, branchId);
      if (!hasAccess) {
        console.warn(`🚨 SECURITY ALERT: User ${req.user.id} (${req.user.username}) attempted unauthorized branch switch to ${branchId}`);
        return res.status(403).json({ 
          error: "У вас нет доступа к выбранному филиалу. Обратитесь к администратору." 
        });
      }

      // Generate new JWT tokens with updated branch info
      const { accessToken, refreshToken } = generateTokens({
        id: req.user.id,
        username: req.user.username,
        role: req.user.role,
        branchId: branchId
      });
      
      // Set secure cookies with new tokens
      res.cookie('accessToken', accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 15 * 60 * 1000 // 15 minutes
      });

      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });
      
      res.json({ 
        currentBranch: { id: selectedBranch.id, name: selectedBranch.name },
        message: "Филиал успешно изменен" 
      });
    } catch (error) {
      console.error("Switch branch error:", error);
      res.status(500).json({ error: "Ошибка при смене филиала" });
    }
  });

  // ===============================
  // BRANCH MANAGEMENT API ENDPOINTS
  // ===============================

  // Get all branches
  app.get("/api/branches", authenticateToken, requireRole('руководитель', 'администратор'), async (req, res) => {
    try {
      const branches = await storage.getBranches();
      res.json(branches);
    } catch (error) {
      console.error("Error fetching branches:", error);
      res.status(500).json({ error: "Failed to fetch branches" });
    }
  });

  // Get branch by ID
  app.get("/api/branches/:id", authenticateToken, requireRole('руководитель', 'администратор'), async (req, res) => {
    try {
      const branch = await storage.getBranch(req.params.id);
      if (!branch) {
        return res.status(404).json({ error: "Branch not found" });
      }
      res.json(branch);
    } catch (error) {
      console.error("Error fetching branch:", error);
      res.status(500).json({ error: "Failed to fetch branch" });
    }
  });

  // Create new branch
  app.post("/api/branches", authenticateToken, requireRole('руководитель', 'администратор'), validateBody(insertBranchSchema), async (req, res) => {
    try {
      const branch = await storage.createBranch(req.body);
      res.status(201).json(branch);
    } catch (error) {
      console.error("Error creating branch:", error);
      res.status(500).json({ error: "Failed to create branch" });
    }
  });

  // Update branch
  app.put("/api/branches/:id", authenticateToken, requireRole('руководитель', 'администратор'), validateBody(insertBranchSchema.partial()), async (req, res) => {
    try {
      const existingBranch = await storage.getBranch(req.params.id);
      if (!existingBranch) {
        return res.status(404).json({ error: "Branch not found" });
      }
      
      const updatedBranch = await storage.updateBranch(req.params.id, req.body);
      res.json(updatedBranch);
    } catch (error) {
      console.error("Error updating branch:", error);
      res.status(500).json({ error: "Failed to update branch" });
    }
  });

  // Delete branch
  app.delete("/api/branches/:id", authenticateToken, requireRole('руководитель'), async (req, res) => {
    try {
      const existingBranch = await storage.getBranch(req.params.id);
      if (!existingBranch) {
        return res.status(404).json({ error: "Branch not found" });
      }
      
      // TODO: Add check if branch has associated data (users, patients, etc.)
      // For now, allow deletion but consider adding safety checks
      
      await storage.deleteBranch(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting branch:", error);
      res.status(500).json({ error: "Failed to delete branch" });
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

  // ===============================
  // PATIENT FILES API ENDPOINTS
  // ===============================

  // Upload file for patient
  app.post("/api/patients/:patientId/files", authenticateToken, requireModuleAccess('medical_records'), upload.single('file'), validateBody(insertPatientFileSchema.omit({ fileName: true, filePath: true })), async (req, res) => {
    try {
      const { patientId } = req.params;
      const file = req.file;
      const { fileType, description, medicalRecordId } = req.body;
      
      if (!file) {
        return res.status(400).json({ error: "Файл не был загружен" });
      }

      if (!req.user) {
        return res.status(401).json({ error: "Пользователь не авторизован" });
      }

      // Verify patient exists and user has access
      const patient = await storage.getPatient(patientId);
      if (!patient) {
        await fs.unlink(file.path).catch(() => {});
        return res.status(404).json({ error: "Пациент не найден" });
      }

      // 🔒 SECURITY FIX APPLIED: Check patient access authorization
      console.log(`🔒 SECURITY: Validating patient access for user ${req.user.id} -> patient ${patientId}`);
      const hasPatientAccess = await ensurePatientAccess(req.user, patientId);
      if (!hasPatientAccess) {
        console.warn(`🚨 SECURITY BLOCKED: User ${req.user.id} denied access to patient ${patientId}`);
        await fs.unlink(file.path).catch(() => {});
        return res.status(403).json({ error: "Нет доступа к этому пациенту" });
      }
      console.log(`✅ SECURITY: Patient access validated for user ${req.user.id}`);

      // 🔒 SECURITY FIX APPLIED: Server-side file signature validation with strict allowlist
      console.log(`🔒 SECURITY: Validating file signature for ${file.filename}`);
      const fileValidation = await validateFileTypeServer(file.path);
      if (!fileValidation.valid) {
        console.warn(`🚨 SECURITY BLOCKED: Invalid file type detected: ${fileValidation.detectedMime || 'unknown'}`);
        await fs.unlink(file.path).catch(() => {});
        return res.status(400).json({ 
          error: `Недопустимый тип файла: ${fileValidation.detectedMime || 'неопределен'}` 
        });
      }
      console.log(`✅ SECURITY: File signature validated: ${fileValidation.detectedMime}`);

      // Validate file type enum
      if (!FILE_TYPES.includes(fileType as any)) {
        await fs.unlink(file.path).catch(() => {});
        return res.status(400).json({ error: "Неверный тип файла" });
      }

      // 🔒 SECURITY FIX APPLIED: Validate medicalRecordId ownership to prevent cross-patient linkage
      if (medicalRecordId) {
        console.log(`🔒 SECURITY: Validating medical record ${medicalRecordId} ownership for patient ${patientId}`);
        const medicalRecord = await storage.getMedicalRecord(medicalRecordId);
        if (!medicalRecord) {
          console.warn(`🚨 SECURITY: Medical record ${medicalRecordId} not found`);
          await fs.unlink(file.path).catch(() => {});
          return res.status(404).json({ error: "Медицинская запись не найдена" });
        }
        if (medicalRecord.patientId !== patientId) {
          console.warn(`🚨 SECURITY BLOCKED: Cross-patient linkage attempt: record ${medicalRecordId} (patient ${medicalRecord.patientId}) linked to patient ${patientId}`);
          await fs.unlink(file.path).catch(() => {});
          return res.status(400).json({ error: "Медицинская запись не принадлежит этому пациенту" });
        }
        console.log(`✅ SECURITY: Medical record ownership validated`);
      }

      const fileData = {
        patientId,
        fileName: file.filename,
        originalName: file.originalname,
        fileType: fileType as typeof FILE_TYPES[number],
        mimeType: fileValidation.detectedMime!, // 🔒 SECURITY: Use detected MIME, not client-provided
        fileSize: file.size,
        filePath: file.path,
        description: description || null,
        uploadedBy: req.user.id,
        medicalRecordId: medicalRecordId || null,
      };

      const savedFile = await storage.createPatientFile(fileData);
      res.status(201).json(savedFile);
    } catch (error) {
      // Clean up uploaded file on error
      if (req.file) {
        await fs.unlink(req.file.path).catch(() => {});
      }
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Validation failed", details: error.errors });
      }
      console.error("Ошибка загрузки файла:", error);
      res.status(500).json({ error: "Ошибка загрузки файла" });
    }
  });

  // Get files for a patient
  app.get("/api/patients/:patientId/files", authenticateToken, requireModuleAccess('medical_records'), async (req, res) => {
    try {
      const { patientId } = req.params;
      const { fileType } = req.query;
      
      const user = (req as any).user;
      // 🔒 SECURITY FIX APPLIED: Enforce patient-level access control before listing files
      console.log(`🔒 SECURITY: Validating file list access for user ${user.id} -> patient ${patientId}`);
      const hasPatientAccess = await ensurePatientAccess(user, patientId);
      if (!hasPatientAccess) {
        console.warn(`🚨 SECURITY BLOCKED: User ${user.id} denied file list access to patient ${patientId}`);
        return res.status(403).json({ error: "Нет доступа к этому пациенту" });
      }
      console.log(`✅ SECURITY: File list access validated for user ${user.id}`);
      
      const files = await storage.getPatientFiles(patientId, fileType as string);
      res.json(files);
    } catch (error) {
      console.error("Ошибка получения файлов:", error);
      res.status(500).json({ error: "Ошибка получения файлов" });
    }
  });

  // Download specific file by ID
  app.get("/api/files/:fileId/download", authenticateToken, requireModuleAccess('medical_records'), async (req, res) => {
    try {
      const { fileId } = req.params;
      const fileRecord = await storage.getPatientFileById(fileId);
      
      if (!fileRecord) {
        return res.status(404).json({ error: "Файл не найден" });
      }

      const user = (req as any).user;
      // 🔒 SECURITY FIX APPLIED: Check patient access authorization via file's owning patient
      console.log(`🔒 SECURITY: Validating file download access for user ${user.id} -> file ${fileId} (patient ${fileRecord.patientId})`);
      const hasPatientAccess = await ensurePatientAccess(user, fileRecord.patientId);
      if (!hasPatientAccess) {
        console.warn(`🚨 SECURITY BLOCKED: User ${user.id} denied download access to file ${fileId} from patient ${fileRecord.patientId}`);
        return res.status(403).json({ error: "Нет доступа к файлам этого пациента" });
      }
      console.log(`✅ SECURITY: File download access validated for user ${user.id}`);

      // Check if file exists on disk
      try {
        await fs.access(fileRecord.filePath);
      } catch {
        return res.status(404).json({ error: "Файл на диске не найден" });
      }

      // Set proper headers for file download (use DB stored MIME, not client-provided)
      res.setHeader('Content-Type', fileRecord.mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${fileRecord.originalName}"`);
      res.sendFile(path.resolve(fileRecord.filePath));
    } catch (error) {
      console.error("Ошибка отдачи файла:", error);
      res.status(500).json({ error: "Ошибка отдачи файла" });
    }
  });

  // Delete file by ID
  app.delete("/api/files/:fileId", authenticateToken, requireModuleAccess('medical_records'), async (req, res) => {
    try {
      const { fileId } = req.params;
      const fileRecord = await storage.getPatientFileById(fileId);
      
      if (!fileRecord) {
        return res.status(404).json({ error: "Файл не найден" });
      }

      const user = (req as any).user;
      // 🔒 SECURITY FIX APPLIED: Check patient access authorization via file's owning patient  
      console.log(`🔒 SECURITY: Validating file deletion access for user ${user.id} -> file ${fileId} (patient ${fileRecord.patientId})`);
      const hasPatientAccess = await ensurePatientAccess(user, fileRecord.patientId);
      if (!hasPatientAccess) {
        console.warn(`🚨 SECURITY BLOCKED: User ${user.id} denied deletion access to file ${fileId} from patient ${fileRecord.patientId}`);
        return res.status(403).json({ error: "Нет доступа к файлам этого пациента" });
      }
      console.log(`✅ SECURITY: File deletion access validated for user ${user.id}`);

      // Delete from database first
      await storage.deletePatientFile(fileId);
      
      // Delete file from disk - log warning but continue if file missing
      try {
        await fs.unlink(fileRecord.filePath);
      } catch (error) {
        console.warn(`File cleanup warning for ${fileId}: ${error}`);
      }

      res.status(200).json({ message: "Файл успешно удален" });
    } catch (error) {
      console.error("Ошибка удаления файла:", error);
      res.status(500).json({ error: "Ошибка удаления файла" });
    }
  });

  // =============================================
  // LABORATORY MODULE ROUTES - Protected PHI data
  // =============================================

  // LAB STUDIES ROUTES
  app.get("/api/lab-studies", authenticateToken, requireModuleAccess('laboratory'), async (req, res) => {
    try {
      const activeOnly = req.query.activeOnly === 'true';
      const studies = await storage.getLabStudies(activeOnly);
      res.json(studies);
    } catch (error) {
      console.error("Error fetching lab studies:", error);
      res.status(500).json({ error: "Failed to fetch lab studies" });
    }
  });

  app.get("/api/lab-studies/:id", authenticateToken, requireModuleAccess('laboratory'), async (req, res) => {
    try {
      const study = await storage.getLabStudy(req.params.id);
      if (!study) {
        return res.status(404).json({ error: "Lab study not found" });
      }
      res.json(study);
    } catch (error) {
      console.error("Error fetching lab study:", error);
      res.status(500).json({ error: "Failed to fetch lab study" });
    }
  });

  app.post("/api/lab-studies", authenticateToken, requireModuleAccess('laboratory'), validateBody(insertLabStudySchema), async (req, res) => {
    try {
      const study = await storage.createLabStudy(req.body);
      res.status(201).json(study);
    } catch (error) {
      console.error("Error creating lab study:", error);
      res.status(500).json({ error: "Failed to create lab study" });
    }
  });

  app.put("/api/lab-studies/:id", authenticateToken, requireModuleAccess('laboratory'), validateBody(insertLabStudySchema.partial()), async (req, res) => {
    try {
      const study = await storage.updateLabStudy(req.params.id, req.body);
      res.json(study);
    } catch (error) {
      console.error("Error updating lab study:", error);
      res.status(500).json({ error: "Failed to update lab study" });
    }
  });

  app.delete("/api/lab-studies/:id", authenticateToken, requireModuleAccess('laboratory'), async (req, res) => {
    try {
      await storage.deleteLabStudy(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting lab study:", error);
      res.status(500).json({ error: "Failed to delete lab study" });
    }
  });

  app.get("/api/lab-studies/search/:query", authenticateToken, requireModuleAccess('laboratory'), async (req, res) => {
    try {
      const studies = await storage.searchLabStudies(req.params.query);
      res.json(studies);
    } catch (error) {
      console.error("Error searching lab studies:", error);
      res.status(500).json({ error: "Failed to search lab studies" });
    }
  });

  // LAB PARAMETERS ROUTES
  app.get("/api/lab-parameters", authenticateToken, requireModuleAccess('laboratory'), async (req, res) => {
    try {
      const studyId = req.query.studyId as string | undefined;
      const parameters = await storage.getLabParameters(studyId);
      res.json(parameters);
    } catch (error) {
      console.error("Error fetching lab parameters:", error);
      res.status(500).json({ error: "Failed to fetch lab parameters" });
    }
  });

  app.get("/api/lab-parameters/:id", authenticateToken, requireModuleAccess('laboratory'), async (req, res) => {
    try {
      const parameter = await storage.getLabParameter(req.params.id);
      if (!parameter) {
        return res.status(404).json({ error: "Lab parameter not found" });
      }
      res.json(parameter);
    } catch (error) {
      console.error("Error fetching lab parameter:", error);
      res.status(500).json({ error: "Failed to fetch lab parameter" });
    }
  });

  app.post("/api/lab-parameters", authenticateToken, requireModuleAccess('laboratory'), validateBody(insertLabParameterSchema), async (req, res) => {
    try {
      const parameter = await storage.createLabParameter(req.body);
      res.status(201).json(parameter);
    } catch (error) {
      console.error("Error creating lab parameter:", error);
      res.status(500).json({ error: "Failed to create lab parameter" });
    }
  });

  app.put("/api/lab-parameters/:id", authenticateToken, requireModuleAccess('laboratory'), validateBody(insertLabParameterSchema.partial()), async (req, res) => {
    try {
      const parameter = await storage.updateLabParameter(req.params.id, req.body);
      res.json(parameter);
    } catch (error) {
      console.error("Error updating lab parameter:", error);
      res.status(500).json({ error: "Failed to update lab parameter" });
    }
  });

  app.delete("/api/lab-parameters/:id", authenticateToken, requireModuleAccess('laboratory'), async (req, res) => {
    try {
      await storage.deleteLabParameter(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting lab parameter:", error);
      res.status(500).json({ error: "Failed to delete lab parameter" });
    }
  });

  // Lab parameters search removed - method not implemented in storage

  // REFERENCE RANGES ROUTES
  app.get("/api/reference-ranges", authenticateToken, requireModuleAccess('laboratory'), async (req, res) => {
    try {
      const parameterId = req.query.parameterId as string | undefined;
      const ranges = await storage.getReferenceRanges(parameterId);
      res.json(ranges);
    } catch (error) {
      console.error("Error fetching reference ranges:", error);
      res.status(500).json({ error: "Failed to fetch reference ranges" });
    }
  });

  app.get("/api/reference-ranges/:id", authenticateToken, requireModuleAccess('laboratory'), async (req, res) => {
    try {
      const range = await storage.getReferenceRange(req.params.id);
      if (!range) {
        return res.status(404).json({ error: "Reference range not found" });
      }
      res.json(range);
    } catch (error) {
      console.error("Error fetching reference range:", error);
      res.status(500).json({ error: "Failed to fetch reference range" });
    }
  });

  app.get("/api/reference-ranges/applicable/:parameterId", authenticateToken, requireModuleAccess('laboratory'), async (req, res) => {
    try {
      const { parameterId } = req.params;
      const { species, breed, age, sex } = req.query;
      const range = await storage.getApplicableReferenceRange(
        parameterId,
        species as string,
        breed as string | undefined,
        age ? parseInt(age as string) : undefined,
        sex as string | undefined
      );
      if (!range) {
        return res.status(404).json({ error: "No applicable reference range found" });
      }
      res.json(range);
    } catch (error) {
      console.error("Error fetching applicable reference range:", error);
      res.status(500).json({ error: "Failed to fetch applicable reference range" });
    }
  });

  app.post("/api/reference-ranges", authenticateToken, requireModuleAccess('laboratory'), validateBody(insertReferenceRangeSchema), async (req, res) => {
    try {
      const range = await storage.createReferenceRange(req.body);
      res.status(201).json(range);
    } catch (error) {
      console.error("Error creating reference range:", error);
      res.status(500).json({ error: "Failed to create reference range" });
    }
  });

  app.put("/api/reference-ranges/:id", authenticateToken, requireModuleAccess('laboratory'), validateBody(insertReferenceRangeSchema.partial()), async (req, res) => {
    try {
      const range = await storage.updateReferenceRange(req.params.id, req.body);
      res.json(range);
    } catch (error) {
      console.error("Error updating reference range:", error);
      res.status(500).json({ error: "Failed to update reference range" });
    }
  });

  app.delete("/api/reference-ranges/:id", authenticateToken, requireModuleAccess('laboratory'), async (req, res) => {
    try {
      await storage.deleteReferenceRange(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting reference range:", error);
      res.status(500).json({ error: "Failed to delete reference range" });
    }
  });

  // LAB ORDERS ROUTES
  app.get("/api/lab-orders", authenticateToken, requireModuleAccess('laboratory'), async (req, res) => {
    try {
      const status = req.query.status as string | undefined;
      const user = (req as any).user;
      const userBranchId = requireValidBranchId(req, res);
      if (!userBranchId) return;
      const orders = await storage.getLabOrders(undefined, status, userBranchId);
      res.json(orders);
    } catch (error) {
      console.error("Error fetching lab orders:", error);
      res.status(500).json({ error: "Failed to fetch lab orders" });
    }
  });

  app.get("/api/lab-orders/:id", authenticateToken, requireModuleAccess('laboratory'), async (req, res) => {
    try {
      const order = await storage.getLabOrder(req.params.id);
      if (!order) {
        return res.status(404).json({ error: "Lab order not found" });
      }
      res.json(order);
    } catch (error) {
      console.error("Error fetching lab order:", error);
      res.status(500).json({ error: "Failed to fetch lab order" });
    }
  });

  app.get("/api/lab-orders/doctor/:doctorId", authenticateToken, requireModuleAccess('laboratory'), async (req, res) => {
    try {
      const user = (req as any).user;
      const userBranchId = requireValidBranchId(req, res);
      if (!userBranchId) return;
      const orders = await storage.getLabOrdersByDoctor(req.params.doctorId, userBranchId);
      res.json(orders);
    } catch (error) {
      console.error("Error fetching lab orders by doctor:", error);
      res.status(500).json({ error: "Failed to fetch lab orders by doctor" });
    }
  });

  app.get("/api/lab-orders/appointment/:appointmentId", authenticateToken, requireModuleAccess('laboratory'), async (req, res) => {
    try {
      const user = (req as any).user;
      const userBranchId = requireValidBranchId(req, res);
      if (!userBranchId) return;
      const orders = await storage.getLabOrdersByAppointment(req.params.appointmentId, userBranchId);
      res.json(orders);
    } catch (error) {
      console.error("Error fetching lab orders by appointment:", error);
      res.status(500).json({ error: "Failed to fetch lab orders by appointment" });
    }
  });

  app.post("/api/lab-orders", authenticateToken, requireModuleAccess('laboratory'), validateBody(insertLabOrderSchema), async (req, res) => {
    try {
      const order = await storage.createLabOrder(req.body);
      res.status(201).json(order);
    } catch (error) {
      console.error("Error creating lab order:", error);
      res.status(500).json({ error: "Failed to create lab order" });
    }
  });

  app.put("/api/lab-orders/:id", authenticateToken, requireModuleAccess('laboratory'), validateBody(insertLabOrderSchema.partial()), async (req, res) => {
    try {
      const order = await storage.updateLabOrder(req.params.id, req.body);
      res.json(order);
    } catch (error) {
      console.error("Error updating lab order:", error);
      res.status(500).json({ error: "Failed to update lab order" });
    }
  });

  app.delete("/api/lab-orders/:id", authenticateToken, requireModuleAccess('laboratory'), async (req, res) => {
    try {
      await storage.deleteLabOrder(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting lab order:", error);
      res.status(500).json({ error: "Failed to delete lab order" });
    }
  });

  // LAB RESULT DETAILS ROUTES
  app.get("/api/lab-result-details", authenticateToken, requireModuleAccess('laboratory'), async (req, res) => {
    try {
      const orderId = req.query.orderId as string | undefined;
      const parameterId = req.query.parameterId as string | undefined;
      
      if (!orderId) {
        return res.status(400).json({ error: "orderId is required" });
      }
      
      const details = await storage.getLabResultDetails(orderId);
      res.json(details);
    } catch (error) {
      console.error("Error fetching lab result details:", error);
      res.status(500).json({ error: "Failed to fetch lab result details" });
    }
  });

  app.get("/api/lab-result-details/:id", authenticateToken, requireModuleAccess('laboratory'), async (req, res) => {
    try {
      const detail = await storage.getLabResultDetail(req.params.id);
      if (!detail) {
        return res.status(404).json({ error: "Lab result detail not found" });
      }
      res.json(detail);
    } catch (error) {
      console.error("Error fetching lab result detail:", error);
      res.status(500).json({ error: "Failed to fetch lab result detail" });
    }
  });

  app.get("/api/lab-result-details/parameter/:parameterId", authenticateToken, requireModuleAccess('laboratory'), async (req, res) => {
    try {
      const details = await storage.getLabResultsByParameter(req.params.parameterId);
      res.json(details);
    } catch (error) {
      console.error("Error fetching lab results by parameter:", error);
      res.status(500).json({ error: "Failed to fetch lab results by parameter" });
    }
  });

  app.post("/api/lab-result-details", authenticateToken, requireModuleAccess('laboratory'), validateBody(insertLabResultDetailSchema), async (req, res) => {
    try {
      const detail = await storage.createLabResultDetail(req.body);
      res.status(201).json(detail);
    } catch (error) {
      console.error("Error creating lab result detail:", error);
      res.status(500).json({ error: "Failed to create lab result detail" });
    }
  });

  app.put("/api/lab-result-details/:id", authenticateToken, requireModuleAccess('laboratory'), validateBody(insertLabResultDetailSchema.partial()), async (req, res) => {
    try {
      const detail = await storage.updateLabResultDetail(req.params.id, req.body);
      res.json(detail);
    } catch (error) {
      console.error("Error updating lab result detail:", error);
      res.status(500).json({ error: "Failed to update lab result detail" });
    }
  });

  app.delete("/api/lab-result-details/:id", authenticateToken, requireModuleAccess('laboratory'), async (req, res) => {
    try {
      await storage.deleteLabResultDetail(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting lab result detail:", error);
      res.status(500).json({ error: "Failed to delete lab result detail" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}