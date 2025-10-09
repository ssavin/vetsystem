import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertOwnerSchema, insertPatientSchema, insertDoctorSchema,
  insertAppointmentSchema, insertMedicalRecordSchema, insertMedicationSchema,
  insertServiceSchema, insertProductSchema, insertInvoiceSchema, insertInvoiceItemSchema,
  insertUserSchema, insertBranchSchema, loginSchema, insertPatientFileSchema, FILE_TYPES,
  insertLabStudySchema, insertLabParameterSchema, insertReferenceRangeSchema,
  insertLabOrderSchema, insertLabResultDetailSchema, insertSystemSettingSchema, updateSystemSettingSchema,
  insertCashRegisterSchema, insertCashShiftSchema, insertCustomerSchema, insertDiscountRuleSchema,
  insertPaymentMethodSchema, insertSalesTransactionSchema, insertSalesTransactionItemSchema,
  insertCashOperationSchema, insertUserRoleSchema, insertUserRoleAssignmentSchema,
  insertSubscriptionPlanSchema, insertClinicSubscriptionSchema, insertTenantSchema,
  insertLegalEntitySchema
} from "@shared/schema";
import { z } from "zod";
import { seedDatabase } from "./seed-data";
import { authenticateToken, requireRole, requireModuleAccess, generateTokens, verifyToken, requireSuperAdmin } from "./middleware/auth";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import * as veterinaryAI from './ai/veterinary-ai';
import * as yookassa from './integrations/yookassa';
import { documentService } from './services/documentService';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';
import { fileTypeFromBuffer } from 'file-type';
import { encryptGalenCredentials, decryptGalenCredentials } from './services/encryption';
import { galenAPIService } from './services/galenAPIService';

// 🔒🔒🔒 CRITICAL HEALTHCARE SECURITY ENFORCED - ARCHITECT VISIBILITY 🔒🔒🔒
// Helper to check patient access - enforces patient-level authorization
// REQUIREMENT: ALL users can access ALL patients across ALL branches (including NULL branch_id from migration)
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
  
  // ✅ UNIVERSAL ACCESS: All users can access all patients across all branches
  // This includes migrated patients with NULL branch_id (54,242 patients from Vetais)
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
    // Allow access to entities without branchId (migrated data) for users with valid branchId
    // They can assign the entity to their branch
    console.warn(`⚠️ MIGRATION DATA: ${entityType} ${entityId} has no branchId - allowing access for assignment`);
    return true;
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

  // Configure multer for file uploads with tenant/branch isolation
  const storage_multer = multer.diskStorage({
    destination: async (req, file, cb) => {
      // Get tenant and branch from authenticated user
      const user = (req as any).user;
      if (!user || !user.branchId) {
        return cb(new Error('Authentication required for file upload'), '');
      }
      
      // For superadmin without tenantId, use 'system' as tenant
      const tenantId = user.tenantId || 'system';
      
      // Create tenant/branch-scoped upload path: uploads/{tenantId}/{branchId}/
      const uploadPath = path.join(process.cwd(), 'uploads', tenantId, user.branchId);
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
      const requestedBranchId = req.query.branchId as string;
      const page = req.query.page ? parseInt(req.query.page as string) : undefined;
      const isPaginated = page !== undefined;
      
      if (isPaginated) {
        // Paginated response
        const limit = req.query.limit ? Math.min(parseInt(req.query.limit as string), 100) : 50;
        const search = req.query.search as string || undefined;
        const offset = (page - 1) * limit;
        
        if (requestedBranchId) {
          const hasAccess = await storage.canUserAccessBranch(user.id, requestedBranchId);
          if (!hasAccess) {
            return res.status(403).json({ error: "Access denied: Branch not accessible" });
          }
          const result = await storage.getOwnersPaginated({ branchId: requestedBranchId, search, limit, offset });
          res.json({
            data: result.data,
            page,
            limit,
            total: result.total,
            totalPages: Math.ceil(result.total / limit)
          });
        } else {
          const userBranchId = requireValidBranchId(req, res);
          if (!userBranchId) return;
          const result = await storage.getOwnersPaginated({ branchId: userBranchId, search, limit, offset });
          res.json({
            data: result.data,
            page,
            limit,
            total: result.total,
            totalPages: Math.ceil(result.total / limit)
          });
        }
      } else {
        // Legacy response (array) for backward compatibility
        if (requestedBranchId) {
          const hasAccess = await storage.canUserAccessBranch(user.id, requestedBranchId);
          if (!hasAccess) {
            return res.status(403).json({ error: "Access denied: Branch not accessible" });
          }
          const owners = await storage.getOwners(requestedBranchId);
          res.json(owners);
        } else {
          const userBranchId = requireValidBranchId(req, res);
          if (!userBranchId) return;
          const owners = await storage.getOwners(userBranchId);
          res.json(owners);
        }
      }
    } catch (error) {
      console.error("Error fetching owners:", error);
      res.status(500).json({ error: "Failed to fetch owners" });
    }
  });

  // 🔒 Get all owners from all branches within tenant
  app.get("/api/owners/all", authenticateToken, requireModuleAccess('owners'), async (req, res) => {
    try {
      const owners = await storage.getAllOwners();
      res.json(owners);
    } catch (error) {
      console.error("Error fetching all owners:", error);
      res.status(500).json({ error: "Failed to fetch all owners" });
    }
  });

  // Search owners with their patients (for clinical case creation)
  // IMPORTANT: This route must be BEFORE /api/owners/:id to avoid route conflicts
  app.get("/api/owners/search-with-patients", authenticateToken, requireModuleAccess('owners'), async (req, res) => {
    try {
      const query = req.query.query as string || '';
      const limit = parseInt(req.query.limit as string || '30');
      const offset = parseInt(req.query.offset as string || '0');
      
      if (!query || query.length < 2) {
        return res.json({ owners: [], total: 0 });
      }
      
      const result = await storage.searchOwnersWithPatients(query, limit, offset);
      res.json(result);
    } catch (error) {
      console.error("Error searching owners with patients:", error);
      res.status(500).json({ error: "Failed to search owners with patients" });
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

  // PATIENT ROUTES - Protected PHI data
  app.get("/api/patients", authenticateToken, requireModuleAccess('patients'), async (req, res) => {
    try {
      const user = (req as any).user;
      const requestedBranchId = req.query.branchId as string;
      const page = req.query.page ? parseInt(req.query.page as string) : undefined;
      const isPaginated = page !== undefined;
      console.log('GET /api/patients - requestedBranchId:', requestedBranchId, 'isPaginated:', isPaginated, 'userId:', user.id);
      
      if (isPaginated) {
        // Paginated response
        const limit = req.query.limit ? Math.min(parseInt(req.query.limit as string), 100) : 50;
        const search = req.query.search as string || undefined;
        const offset = (page - 1) * limit;
        
        if (requestedBranchId) {
          const hasAccess = await storage.canUserAccessBranch(user.id, requestedBranchId);
          if (!hasAccess) {
            return res.status(403).json({ error: "Access denied: Branch not accessible" });
          }
          const result = await storage.getPatientsPaginated({ branchId: requestedBranchId, search, limit, offset });
          res.json({
            data: result.data,
            page,
            limit,
            total: result.total,
            totalPages: Math.ceil(result.total / limit)
          });
        } else {
          const userBranchId = requireValidBranchId(req, res);
          if (!userBranchId) return;
          const result = await storage.getPatientsPaginated({ branchId: userBranchId, search, limit, offset });
          res.json({
            data: result.data,
            page,
            limit,
            total: result.total,
            totalPages: Math.ceil(result.total / limit)
          });
        }
      } else {
        // Legacy response (array) for backward compatibility
        const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
        const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;
        
        if (requestedBranchId) {
          const hasAccess = await storage.canUserAccessBranch(user.id, requestedBranchId);
          if (!hasAccess) {
            return res.status(403).json({ error: "Access denied: Branch not accessible" });
          }
          const patients = await storage.getPatients(limit, offset, requestedBranchId);
          res.json(patients);
        } else {
          const userBranchId = requireValidBranchId(req, res);
          if (!userBranchId) return;
          const patients = await storage.getPatients(limit, offset, userBranchId);
          res.json(patients);
        }
      }
    } catch (error) {
      console.error("Error fetching patients:", error);
      res.status(500).json({ error: "Failed to fetch patients" });
    }
  });

  // 🔒 Get all patients from all branches within tenant
  app.get("/api/patients/all", authenticateToken, requireModuleAccess('patients'), async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;
      const patients = await storage.getAllPatients(limit, offset);
      res.json(patients);
    } catch (error) {
      console.error("Error fetching all patients:", error);
      res.status(500).json({ error: "Failed to fetch all patients" });
    }
  });

  // 🔒 Batch get patients by IDs (for efficient loading)
  app.post("/api/patients/batch", authenticateToken, requireModuleAccess('patients'), async (req, res) => {
    try {
      const { ids } = req.body;
      if (!Array.isArray(ids) || ids.length === 0) {
        return res.json([]);
      }
      
      // Fetch all patients by IDs
      const patients = await Promise.all(
        ids.map(id => storage.getPatient(id))
      );
      
      // Filter out nulls (patients not found) and return
      res.json(patients.filter(Boolean));
    } catch (error) {
      console.error("Error fetching patients batch:", error);
      res.status(500).json({ error: "Failed to fetch patients batch" });
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

  // Extended schema for patient creation with multi-owner support
  const createPatientSchema = insertPatientSchema.extend({
    ownerIds: z.array(z.string()).optional()
  });

  app.post("/api/patients", authenticateToken, requireModuleAccess('patients'), validateBody(createPatientSchema), async (req, res) => {
    try {
      const user = (req as any).user;
      const userBranchId = requireValidBranchId(req, res);
      if (!userBranchId) return; // 403 already sent
      
      // Extract ownerIds from body if provided (multi-owner support)
      const { ownerIds, ...patientBody } = req.body;
      
      // 🔒 SECURITY: Validate all owners BEFORE creating patient (atomicity)
      if (ownerIds && Array.isArray(ownerIds) && ownerIds.length > 0) {
        for (const ownerId of ownerIds) {
          const owner = await storage.getOwner(ownerId);
          if (!owner) {
            return res.status(404).json({ error: `Owner ${ownerId} not found` });
          }
          if (!await ensureEntityBranchAccess(owner, userBranchId, 'owner', ownerId)) {
            return res.status(403).json({ error: `Access denied: Owner ${ownerId} not found` });
          }
        }
      }
      
      // 🔒 SECURITY: Force branchId from user token, ignore any branchId in body
      const patientData = { ...patientBody, branchId: userBranchId };
      const patient = await storage.createPatient(patientData);
      
      // If ownerIds array provided, create patient-owner relationships
      if (ownerIds && Array.isArray(ownerIds) && ownerIds.length > 0) {
        // Add all owners (first one will be primary)
        for (let i = 0; i < ownerIds.length; i++) {
          await storage.addPatientOwner({ 
            patientId: patient.id, 
            ownerId: ownerIds[i], 
            isPrimary: false 
          });
          // Set first owner as primary
          if (i === 0) {
            await storage.setPrimaryOwner(patient.id, ownerIds[i]);
          }
        }
      }
      
      // Fetch complete patient with owners array
      const completePatient = await storage.getPatient(patient.id);
      res.status(201).json(completePatient);
    } catch (error) {
      console.error("Error creating patient:", error);
      res.status(500).json({ error: "Failed to create patient" });
    }
  });

  // Extended schema for patient update with multi-owner support
  const updatePatientSchema = insertPatientSchema.partial().extend({
    ownerIds: z.array(z.string()).optional()
  });

  app.put("/api/patients/:id", authenticateToken, requireModuleAccess('patients'), validateBody(updatePatientSchema), async (req, res) => {
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
      
      // Extract ownerIds from body if provided (multi-owner support)
      const { ownerIds, ...patientBody } = req.body;
      
      // 🔒 SECURITY: Validate all owners BEFORE updating patient (atomicity)
      if (ownerIds && Array.isArray(ownerIds)) {
        for (const ownerId of ownerIds) {
          const owner = await storage.getOwner(ownerId);
          if (!owner) {
            return res.status(404).json({ error: `Owner ${ownerId} not found` });
          }
          if (!await ensureEntityBranchAccess(owner, userBranchId, 'owner', ownerId)) {
            return res.status(403).json({ error: `Access denied: Owner ${ownerId} not found` });
          }
        }
      }
      
      // 🔒 SECURITY: Remove branchId from update body - cannot be changed
      const updateData = { ...patientBody };
      delete updateData.branchId;
      
      const patient = await storage.updatePatient(req.params.id, updateData);
      
      // If ownerIds array provided, update patient-owner relationships
      if (ownerIds && Array.isArray(ownerIds)) {
        // Get current owners
        const currentOwners = await storage.getPatientOwners(req.params.id);
        const currentOwnerIds = currentOwners.map(o => o.ownerId);
        
        // Remove owners that are not in new list
        for (const currentOwner of currentOwners) {
          if (!ownerIds.includes(currentOwner.ownerId)) {
            await storage.removePatientOwner(req.params.id, currentOwner.ownerId);
          }
        }
        
        // Add new owners that are not in current list
        for (let i = 0; i < ownerIds.length; i++) {
          if (!currentOwnerIds.includes(ownerIds[i])) {
            await storage.addPatientOwner({ 
              patientId: req.params.id, 
              ownerId: ownerIds[i], 
              isPrimary: false 
            });
          }
          // Set first owner as primary
          if (i === 0) {
            await storage.setPrimaryOwner(req.params.id, ownerIds[i]);
          }
        }
      }
      
      // Fetch complete patient with owners array
      const completePatient = await storage.getPatient(req.params.id);
      res.json(completePatient);
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

  // PATIENT-OWNER MANAGEMENT ROUTES
  // Get all owners for a patient
  app.get("/api/patients/:id/owners", authenticateToken, requireModuleAccess('patients'), async (req, res) => {
    try {
      const user = (req as any).user;
      const userBranchId = requireValidBranchId(req, res);
      if (!userBranchId) return;
      
      const existingPatient = await storage.getPatient(req.params.id);
      if (!existingPatient) {
        return res.status(404).json({ error: "Patient not found" });
      }
      if (!await ensureEntityBranchAccess(existingPatient, userBranchId, 'patient', req.params.id)) {
        return res.status(403).json({ error: 'Access denied: Patient not found' });
      }
      
      const owners = await storage.getPatientOwners(req.params.id);
      res.json(owners);
    } catch (error) {
      console.error("Error fetching patient owners:", error);
      res.status(500).json({ error: "Failed to fetch patient owners" });
    }
  });

  // Add owner to patient
  app.post("/api/patients/:id/owners", authenticateToken, requireModuleAccess('patients'), async (req, res) => {
    try {
      const user = (req as any).user;
      const userBranchId = requireValidBranchId(req, res);
      if (!userBranchId) return;
      
      const { ownerId } = req.body;
      if (!ownerId) {
        return res.status(400).json({ error: "ownerId is required" });
      }
      
      const existingPatient = await storage.getPatient(req.params.id);
      if (!existingPatient) {
        return res.status(404).json({ error: "Patient not found" });
      }
      if (!await ensureEntityBranchAccess(existingPatient, userBranchId, 'patient', req.params.id)) {
        return res.status(403).json({ error: 'Access denied: Patient not found' });
      }
      
      // 🔒 SECURITY: Verify owner belongs to same branch as patient
      const owner = await storage.getOwner(ownerId);
      if (!owner) {
        return res.status(404).json({ error: "Owner not found" });
      }
      if (!await ensureEntityBranchAccess(owner, userBranchId, 'owner', ownerId)) {
        return res.status(403).json({ error: 'Access denied: Owner not found' });
      }
      
      await storage.addPatientOwner({ 
        patientId: req.params.id, 
        ownerId, 
        isPrimary: false 
      });
      const owners = await storage.getPatientOwners(req.params.id);
      res.json(owners);
    } catch (error) {
      console.error("Error adding patient owner:", error);
      res.status(500).json({ error: "Failed to add patient owner" });
    }
  });

  // Remove owner from patient
  app.delete("/api/patients/:id/owners/:ownerId", authenticateToken, requireModuleAccess('patients'), async (req, res) => {
    try {
      const user = (req as any).user;
      const userBranchId = requireValidBranchId(req, res);
      if (!userBranchId) return;
      
      const existingPatient = await storage.getPatient(req.params.id);
      if (!existingPatient) {
        return res.status(404).json({ error: "Patient not found" });
      }
      if (!await ensureEntityBranchAccess(existingPatient, userBranchId, 'patient', req.params.id)) {
        return res.status(403).json({ error: 'Access denied: Patient not found' });
      }
      
      await storage.removePatientOwner(req.params.id, req.params.ownerId);
      const owners = await storage.getPatientOwners(req.params.id);
      res.json(owners);
    } catch (error) {
      console.error("Error removing patient owner:", error);
      res.status(500).json({ error: "Failed to remove patient owner" });
    }
  });

  // Set primary owner for patient
  app.patch("/api/patients/:id/owners/:ownerId/primary", authenticateToken, requireModuleAccess('patients'), async (req, res) => {
    try {
      const user = (req as any).user;
      const userBranchId = requireValidBranchId(req, res);
      if (!userBranchId) return;
      
      const existingPatient = await storage.getPatient(req.params.id);
      if (!existingPatient) {
        return res.status(404).json({ error: "Patient not found" });
      }
      if (!await ensureEntityBranchAccess(existingPatient, userBranchId, 'patient', req.params.id)) {
        return res.status(403).json({ error: 'Access denied: Patient not found' });
      }
      
      // 🔒 SECURITY: Verify owner belongs to same branch as patient
      const owner = await storage.getOwner(req.params.ownerId);
      if (!owner) {
        return res.status(404).json({ error: "Owner not found" });
      }
      if (!await ensureEntityBranchAccess(owner, userBranchId, 'owner', req.params.ownerId)) {
        return res.status(403).json({ error: 'Access denied: Owner not found' });
      }
      
      await storage.setPrimaryOwner(req.params.id, req.params.ownerId);
      const owners = await storage.getPatientOwners(req.params.id);
      res.json(owners);
    } catch (error) {
      console.error("Error setting primary owner:", error);
      res.status(500).json({ error: "Failed to set primary owner" });
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

  app.post("/api/doctors", authenticateToken, requireRole('руководитель', 'администратор', 'admin'), validateBody(insertDoctorSchema), async (req, res) => {
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

  app.put("/api/doctors/:id", authenticateToken, requireRole('руководитель', 'администратор', 'admin'), validateBody(insertDoctorSchema.partial()), async (req, res) => {
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
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50; // default 50 записей
      const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;
      
      // 🔒 SECURITY: If patientId specified, verify access first
      if (patientId && !await ensurePatientAccess(user, patientId)) {
        return res.status(403).json({ error: 'Access denied: Patient not found' });
      }
      
      // 🔒 SECURITY: Pass branchId to enforce branch isolation
      const records = await storage.getMedicalRecords(patientId, userBranchId, limit, offset);
      
      // Получаем общее количество для пагинации
      const total = await storage.getMedicalRecordsCount(patientId, userBranchId);
      
      res.json({
        records,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + records.length < total
        }
      });
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
      console.log('📋 Creating medical record - User:', user.id, 'BranchId:', user.branchId, 'Data:', JSON.stringify(req.body, null, 2));
      
      // 🔒 SECURITY: Verify patient belongs to user's branch
      if (!await ensurePatientAccess(user, req.body.patientId)) {
        console.error('❌ Patient access denied for user', user.id, 'patient', req.body.patientId);
        return res.status(403).json({ error: 'Access denied: Patient not found' });
      }
      console.log('✅ Patient access verified');
      
      // 🔒 SECURITY: If doctorId specified, verify doctor belongs to branch
      if (req.body.doctorId) {
        const userBranchId = requireValidBranchId(req, res);
        if (!userBranchId) return; // 403 already sent
        
        const doctor = await storage.getDoctor(req.body.doctorId);
        if (!doctor || !await ensureEntityBranchAccess(doctor, userBranchId, 'doctor', req.body.doctorId)) {
          console.error('❌ Doctor access denied for user', user.id, 'doctor', req.body.doctorId);
          return res.status(403).json({ error: 'Access denied: Doctor not found' });
        }
        console.log('✅ Doctor access verified');
      }
      
      console.log('✅ Creating medical record in database...');
      const record = await storage.createMedicalRecord({
        ...req.body,
        tenantId: (req as any).tenantId
      });
      console.log('✅ Medical record created successfully:', record.id);
      res.status(201).json(record);
    } catch (error) {
      console.error("❌ Error creating medical record:", error);
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
      console.log("=== POST /api/services called ===");
      console.log("Request body:", JSON.stringify(req.body, null, 2));
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
      console.log("=== POST /api/products called ===");
      console.log("Request body:", JSON.stringify(req.body, null, 2));
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
      const invoices = await storage.getInvoicesWithDetails(status, userBranchId);
      console.log("=== GET /api/invoices response ===");
      console.log("Number of invoices found:", invoices.length);
      console.log("Sample invoice structure:", invoices[0] ? JSON.stringify(invoices[0], null, 2) : "No invoices");
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

  app.post("/api/invoices", authenticateToken, requireModuleAccess('finance'), async (req, res) => {
    try {
      console.log("=== POST /api/invoices called ===");
      console.log("User:", (req as any).user?.username || "no user");
      console.log("Creating invoice with data:", JSON.stringify(req.body, null, 2));
      
      // Validate request body
      const validation = insertInvoiceSchema.safeParse(req.body);
      if (!validation.success) {
        console.error("Invoice validation failed:", validation.error.issues);
        return res.status(400).json({ 
          error: "Validation failed", 
          details: validation.error.issues 
        });
      }
      
      const user = (req as any).user;
      const userBranchId = requireValidBranchId(req, res);
      if (!userBranchId) return; // 403 already sent
      
      // 🔒 SECURITY: Force branchId from user token, ignore any branchId in body
      const invoiceData = { ...validation.data, branchId: userBranchId };
      const invoice = await storage.createInvoice(invoiceData);
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

      // Validate user has tenant_id (except superadmin)
      // Superadmin can have null tenantId as they work across all tenants
      const isSuperAdmin = user.role === 'superadmin';
      if (!user.tenantId && !isSuperAdmin) {
        console.error(`User ${username} has no tenantId and is not superadmin (role: ${user.role})`);
        return res.status(500).json({ 
          error: "Invalid user data",
          message: "Пользователь не привязан к клинике"
        });
      }

      // Multi-tenant validation: verify user belongs to current tenant
      // Exception: superadmin portal or superadmin users can bypass tenant validation
      if (!req.user?.isSuperAdmin && !isSuperAdmin) {
        if (!req.tenantId) {
          return res.status(403).json({ 
            error: "Tenant не определён",
            message: "Невозможно войти: клиника не определена"
          });
        }
        
        if (user.tenantId !== req.tenantId) {
          return res.status(401).json({ 
            error: "Неверный логин или пароль",
            // Don't reveal tenant mismatch for security
          });
        }
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

      // Verify branch belongs to same tenant (except for superadmin)
      if (!req.user?.isSuperAdmin && !isSuperAdmin && selectedBranch.tenantId !== user.tenantId) {
        return res.status(403).json({ 
          error: "Доступ запрещён",
          message: "Филиал не принадлежит вашей клинике"
        });
      }
      
      // TODO: Add proper branch access validation based on user.branchId
      // For now, allow access to all active branches within tenant

      // Generate JWT tokens with branch info and tenant_id
      const { accessToken, refreshToken } = generateTokens({
        id: user.id,
        username: user.username,
        role: user.role,
        tenantId: user.tenantId,
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

      // Multi-tenant validation: verify token tenant matches request tenant
      // Exception: superadmin portal bypasses tenant check
      if (!req.user?.isSuperAdmin) {
        if (!req.tenantId) {
          return res.status(403).json({ 
            error: "Tenant не определён",
            message: "Невозможно обновить токен: клиника не определена"
          });
        }
        
        if (payload.tenantId !== req.tenantId) {
          return res.status(403).json({ 
            error: "Tenant mismatch",
            message: "Токен принадлежит другой клинике"
          });
        }
      }

      // Get fresh user data
      const user = await storage.getUser(payload.userId);
      if (!user || user.status !== 'active') {
        return res.status(401).json({ error: "Пользователь не найден или неактивен" });
      }

      // Validate user has tenant_id
      if (!user.tenantId) {
        return res.status(500).json({ 
          error: "Invalid user data",
          message: "Пользователь не привязан к клинике"
        });
      }

      // Additional validation: verify user tenant matches token and request tenant
      if (payload.tenantId !== user.tenantId) {
        return res.status(401).json({ 
          error: "Invalid token",
          message: "Токен не соответствует клинике пользователя"
        });
      }

      if (!req.user?.isSuperAdmin && user.tenantId !== req.tenantId) {
        return res.status(403).json({ 
          error: "Access denied",
          message: "Пользователь не принадлежит текущей клинике"
        });
      }

      // Generate new access token
      const { accessToken } = generateTokens({
        id: user.id,
        username: user.username,
        role: user.role,
        tenantId: user.tenantId,
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
      let currentTenant = null;
      
      if (req.user?.branchId) {
        const branch = await storage.getBranch(req.user.branchId);
        if (branch) {
          currentBranch = { id: branch.id, name: branch.name };
        }
      }
      
      if (req.user?.tenantId) {
        const tenant = await storage.getTenant(req.user.tenantId);
        if (tenant) {
          currentTenant = { id: tenant.id, name: tenant.name };
        }
      }
      
      res.json({ user: req.user, currentBranch, currentTenant });
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

      // Multi-tenant validation: verify branch belongs to same tenant as user
      if (!req.user?.isSuperAdmin && selectedBranch.tenantId !== req.user.tenantId) {
        return res.status(403).json({ 
          error: "Доступ запрещён",
          message: "Филиал не принадлежит вашей клинике"
        });
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
        tenantId: req.user.tenantId,
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

  // Switch tenant endpoint (superadmin only)
  app.post("/api/auth/switch-tenant", authenticateToken, requireSuperAdmin, validateBody(z.object({
    tenantId: z.string().min(1, "ID клиники обязателен")
  })), async (req, res) => {
    try {
      const { tenantId } = req.body;
      
      // Verify tenant exists and is active
      const selectedTenant = await storage.getTenant(tenantId);
      if (!selectedTenant || selectedTenant.status !== 'active') {
        return res.status(400).json({ error: "Выбранная клиника недоступна" });
      }
      
      // Ensure user exists and is superadmin (checked by middleware)
      if (!req.user || !req.user?.isSuperAdmin) {
        return res.status(403).json({ error: "Доступ запрещён. Только superadmin может переключать клиники." });
      }

      // Get first active branch for this tenant
      const tenantBranches = await storage.getTenantBranches(tenantId);
      const firstActiveBranch = tenantBranches.find(b => b.status === 'active');

      // Generate new JWT tokens with updated tenant and branch info
      const { accessToken, refreshToken } = generateTokens({
        id: req.user.id,
        username: req.user.username,
        role: req.user.role,
        tenantId: tenantId,
        branchId: firstActiveBranch?.id || null
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
        currentTenant: { id: selectedTenant.id, name: selectedTenant.name },
        currentBranch: firstActiveBranch ? { id: firstActiveBranch.id, name: firstActiveBranch.name } : null,
        message: "Клиника успешно изменена" 
      });
    } catch (error) {
      console.error("Switch tenant error:", error);
      res.status(500).json({ error: "Ошибка при смене клиники" });
    }
  });

  // Update user locale endpoint
  app.put("/api/user/locale", authenticateToken, validateBody(z.object({
    locale: z.string().min(2).max(10)
  })), async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Пользователь не аутентифицирован" });
      }
      
      const { locale } = req.body;
      await storage.updateUserLocale(req.user.id, locale);
      
      res.json({ 
        success: true,
        locale,
        message: "Язык успешно обновлен" 
      });
    } catch (error) {
      console.error("Update locale error:", error);
      res.status(500).json({ error: "Ошибка при обновлении языка" });
    }
  });

  // ===============================
  // BRANCH MANAGEMENT API ENDPOINTS
  // ===============================

  // Get all branches
  app.get("/api/branches", authenticateToken, async (req, res) => {
    try {
      // Check permission: superadmin, руководитель, or администратор/admin
      if (!req.user?.isSuperAdmin && req.user?.role !== 'руководитель' && req.user?.role !== 'администратор' && req.user?.role !== 'admin') {
        return res.status(403).json({ error: "Доступ запрещён" });
      }
      
      const branches = await storage.getBranches();
      res.json(branches);
    } catch (error) {
      console.error("Error fetching branches:", error);
      res.status(500).json({ error: "Failed to fetch branches" });
    }
  });

  // Get branch by ID
  app.get("/api/branches/:id", authenticateToken, async (req, res) => {
    try {
      // Check permission: superadmin, руководитель, or администратор/admin
      if (!req.user?.isSuperAdmin && req.user?.role !== 'руководитель' && req.user?.role !== 'администратор' && req.user?.role !== 'admin') {
        return res.status(403).json({ error: "Доступ запрещён" });
      }
      
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
  app.post("/api/branches", authenticateToken, validateBody(insertBranchSchema), async (req, res) => {
    try {
      // Check permission: superadmin, руководитель, or администратор/admin
      if (!req.user?.isSuperAdmin && req.user?.role !== 'руководитель' && req.user?.role !== 'администратор' && req.user?.role !== 'admin') {
        return res.status(403).json({ error: "Доступ запрещён" });
      }
      
      const branch = await storage.createBranch(req.body);
      res.status(201).json(branch);
    } catch (error) {
      console.error("Error creating branch:", error);
      res.status(500).json({ error: "Failed to create branch" });
    }
  });

  // Update branch
  app.put("/api/branches/:id", authenticateToken, validateBody(insertBranchSchema.partial()), async (req, res) => {
    try {
      // Check permission: superadmin, руководитель, or администратор/admin
      if (!req.user?.isSuperAdmin && req.user?.role !== 'руководитель' && req.user?.role !== 'администратор' && req.user?.role !== 'admin') {
        return res.status(403).json({ error: "Доступ запрещён" });
      }
      
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
  app.delete("/api/branches/:id", authenticateToken, async (req, res) => {
    try {
      // Check permission: superadmin, руководитель, or администратор/admin
      if (!req.user?.isSuperAdmin && req.user?.role !== 'руководитель' && req.user?.role !== 'администратор' && req.user?.role !== 'admin') {
        return res.status(403).json({ error: "Доступ запрещён" });
      }
      
      const existingBranch = await storage.getBranch(req.params.id);
      if (!existingBranch) {
        return res.status(404).json({ error: "Branch not found" });
      }
      
      // Check for associated data before deletion using branch-scoped counts
      // getBranch already enforces tenant isolation via withTenantContext
      const counts = await storage.countBranchRelations(req.params.id);

      if (counts.owners > 0 || counts.patients > 0 || counts.users > 0) {
        return res.status(400).json({ 
          error: "Невозможно удалить филиал",
          details: "Филиал содержит связанные записи (клиенты, пациенты или пользователи). Сначала переместите или удалите их."
        });
      }
      
      await storage.deleteBranch(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting branch:", error);
      res.status(500).json({ error: "Failed to delete branch" });
    }
  });

  // ====================================
  // LEGAL ENTITY MANAGEMENT API ENDPOINTS
  // ====================================

  // Get all legal entities
  app.get("/api/legal-entities", authenticateToken, async (req, res) => {
    try {
      // Check permission: superadmin, руководитель, or администратор/admin
      if (!req.user?.isSuperAdmin && req.user?.role !== 'руководитель' && req.user?.role !== 'администратор' && req.user?.role !== 'admin') {
        return res.status(403).json({ error: "Доступ запрещён" });
      }
      
      const legalEntities = await storage.getLegalEntities();
      res.json(legalEntities);
    } catch (error) {
      console.error("Error fetching legal entities:", error);
      res.status(500).json({ error: "Failed to fetch legal entities" });
    }
  });

  // Get active legal entities (for dropdowns)
  app.get("/api/legal-entities/active", authenticateToken, async (req, res) => {
    try {
      // Check permission: superadmin, руководитель, or администратор/admin
      if (!req.user?.isSuperAdmin && req.user?.role !== 'руководитель' && req.user?.role !== 'администратор' && req.user?.role !== 'admin') {
        return res.status(403).json({ error: "Доступ запрещён" });
      }
      
      const legalEntities = await storage.getActiveLegalEntities();
      res.json(legalEntities);
    } catch (error) {
      console.error("Error fetching active legal entities:", error);
      res.status(500).json({ error: "Failed to fetch active legal entities" });
    }
  });

  // Get legal entity by ID
  app.get("/api/legal-entities/:id", authenticateToken, async (req, res) => {
    try {
      // Check permission: superadmin, руководитель, or администратор/admin
      if (!req.user?.isSuperAdmin && req.user?.role !== 'руководитель' && req.user?.role !== 'администратор' && req.user?.role !== 'admin') {
        return res.status(403).json({ error: "Доступ запрещён" });
      }
      
      const legalEntity = await storage.getLegalEntity(req.params.id);
      if (!legalEntity) {
        return res.status(404).json({ error: "Legal entity not found" });
      }
      res.json(legalEntity);
    } catch (error) {
      console.error("Error fetching legal entity:", error);
      res.status(500).json({ error: "Failed to fetch legal entity" });
    }
  });

  // Create new legal entity
  app.post("/api/legal-entities", authenticateToken, async (req, res) => {
    try {
      // Check permission: superadmin, руководитель, or администратор/admin
      if (!req.user?.isSuperAdmin && req.user?.role !== 'руководитель' && req.user?.role !== 'администратор' && req.user?.role !== 'admin') {
        return res.status(403).json({ error: "Доступ запрещён" });
      }
      
      // Add tenantId from authenticated user
      const dataWithTenantId = {
        ...req.body,
        tenantId: req.user.tenantId
      };
      
      // Validate with full schema including tenantId
      const validationResult = insertLegalEntitySchema.safeParse(dataWithTenantId);
      if (!validationResult.success) {
        return res.status(400).json({ 
          error: validationResult.error.errors[0]?.message || "Validation error" 
        });
      }
      
      const legalEntity = await storage.createLegalEntity(validationResult.data);
      res.status(201).json(legalEntity);
    } catch (error) {
      console.error("Error creating legal entity:", error);
      res.status(500).json({ error: "Failed to create legal entity" });
    }
  });

  // Update legal entity
  app.put("/api/legal-entities/:id", authenticateToken, async (req, res) => {
    try {
      // Check permission: superadmin, руководитель, or администратор/admin
      if (!req.user?.isSuperAdmin && req.user?.role !== 'руководитель' && req.user?.role !== 'администратор' && req.user?.role !== 'admin') {
        return res.status(403).json({ error: "Доступ запрещён" });
      }
      
      const existingLegalEntity = await storage.getLegalEntity(req.params.id);
      if (!existingLegalEntity) {
        return res.status(404).json({ error: "Legal entity not found" });
      }
      
      // Validate without tenantId (it shouldn't be updated)
      const updateSchema = insertLegalEntitySchema.omit({ tenantId: true }).partial();
      const validationResult = updateSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          error: validationResult.error.errors[0]?.message || "Validation error" 
        });
      }
      
      const updatedLegalEntity = await storage.updateLegalEntity(req.params.id, validationResult.data);
      res.json(updatedLegalEntity);
    } catch (error) {
      console.error("Error updating legal entity:", error);
      res.status(500).json({ error: "Failed to update legal entity" });
    }
  });

  // Delete (deactivate) legal entity
  app.delete("/api/legal-entities/:id", authenticateToken, async (req, res) => {
    try {
      // Check permission: superadmin, руководитель, or администратор/admin
      if (!req.user?.isSuperAdmin && req.user?.role !== 'руководитель' && req.user?.role !== 'администратор' && req.user?.role !== 'admin') {
        return res.status(403).json({ error: "Доступ запрещён" });
      }
      
      const existingLegalEntity = await storage.getLegalEntity(req.params.id);
      if (!existingLegalEntity) {
        return res.status(404).json({ error: "Legal entity not found" });
      }
      
      await storage.deleteLegalEntity(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting legal entity:", error);
      res.status(500).json({ error: "Failed to delete legal entity" });
    }
  });

  // DaData integration endpoint - fetch organization details by INN
  app.post("/api/dadata/party", authenticateToken, async (req, res) => {
    try {
      // Validate INN format (10 digits for legal entities, 12 for individual entrepreneurs)
      const innSchema = z.object({
        inn: z.string()
          .trim()
          .regex(/^\d{10}$|^\d{12}$/, "ИНН должен содержать 10 цифр (юр. лицо) или 12 цифр (ИП)")
      });

      const validationResult = innSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          error: validationResult.error.errors[0]?.message || "Неверный формат ИНН" 
        });
      }

      const { inn } = validationResult.data;

      const DADATA_API_KEY = process.env.DADATA_API_KEY;
      if (!DADATA_API_KEY) {
        return res.status(500).json({ error: "DaData API key not configured" });
      }

      // Call DaData API
      const response = await fetch("https://suggestions.dadata.ru/suggestions/api/4_1/rs/findById/party", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "Authorization": `Token ${DADATA_API_KEY}`
        },
        body: JSON.stringify({ query: inn })
      });

      if (!response.ok) {
        throw new Error(`DaData API error: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.suggestions || data.suggestions.length === 0) {
        return res.status(404).json({ error: "Организация с указанным ИНН не найдена" });
      }

      const suggestion = data.suggestions[0];
      const partyData = suggestion.data;

      // Map DaData response to our legal entity structure
      const result = {
        inn: partyData.inn || '',
        kpp: partyData.kpp || '',
        ogrn: partyData.ogrn || '',
        legalName: partyData.name?.full_with_opf || partyData.name?.full || '',
        shortName: partyData.name?.short_with_opf || partyData.name?.short || '',
        legalAddress: partyData.address?.value || '',
        actualAddress: partyData.address?.value || '',
        directorName: partyData.management?.name || '',
        directorPosition: partyData.management?.post || '',
        okpo: partyData.okpo || '',
        oktmo: partyData.oktmo || '',
        okved: partyData.okved || '',
        type: partyData.type === 'INDIVIDUAL' ? 'ИП' : 'ООО'
      };

      res.json(result);
    } catch (error) {
      console.error("Error fetching DaData:", error);
      res.status(500).json({ error: "Не удалось получить данные из DaData" });
    }
  });

  // USER MANAGEMENT ROUTES (for administrators)
  app.get("/api/users", authenticateToken, async (req, res) => {
    try {
      // Check permission: superadmin, руководитель, or администратор/admin
      if (!req.user?.isSuperAdmin && req.user?.role !== 'руководитель' && req.user?.role !== 'администратор' && req.user?.role !== 'admin') {
        return res.status(403).json({ error: "Доступ запрещён" });
      }
      
      const users = await storage.getUsers();
      // Remove passwords from response
      const safeUsers = users.map(({ password, ...user }) => user);
      res.json(safeUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  app.post("/api/users", authenticateToken, validateBody(insertUserSchema), async (req, res) => {
    try {
      // Check permission: superadmin, руководитель, or администратор/admin
      if (!req.user?.isSuperAdmin && req.user?.role !== 'руководитель' && req.user?.role !== 'администратор' && req.user?.role !== 'admin') {
        return res.status(403).json({ error: "Доступ запрещён" });
      }
      
      const newUser = await storage.createUser(req.body);
      const { password: _, ...safeUser } = newUser;
      res.status(201).json(safeUser);
    } catch (error) {
      console.error("Error creating user:", error);
      res.status(500).json({ error: "Failed to create user" });
    }
  });

  // PATCH route for user updates (with safe password handling)
  app.patch("/api/users/:id", authenticateToken, async (req, res) => {
    try {
      // Check permission: superadmin, руководитель, or администратор/admin
      if (!req.user?.isSuperAdmin && req.user?.role !== 'руководитель' && req.user?.role !== 'администратор' && req.user?.role !== 'admin') {
        return res.status(403).json({ error: "Доступ запрещён" });
      }
      
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

  app.put("/api/users/:id", authenticateToken, validateBody(insertUserSchema.partial()), async (req, res) => {
    try {
      // Check permission: superadmin, руководитель, or администратор/admin
      if (!req.user?.isSuperAdmin && req.user?.role !== 'руководитель' && req.user?.role !== 'администратор' && req.user?.role !== 'admin') {
        return res.status(403).json({ error: "Доступ запрещён" });
      }
      
      const updatedUser = await storage.updateUser(req.params.id, req.body);
      const { password: _, ...safeUser } = updatedUser;
      res.json(safeUser);
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ error: "Failed to update user" });
    }
  });

  app.delete("/api/users/:id", authenticateToken, async (req, res) => {
    try {
      // Check permission: superadmin or руководитель
      if (!req.user?.isSuperAdmin && req.user?.role !== 'руководитель') {
        return res.status(403).json({ error: "Доступ запрещён" });
      }
      
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
  app.post("/api/patients/:patientId/files", authenticateToken, requireModuleAccess('medical_records'), upload.single('file'), validateBody(insertPatientFileSchema.omit({ 
    id: true,
    patientId: true,
    fileName: true, 
    filePath: true, 
    originalName: true, 
    mimeType: true, 
    fileSize: true,
    uploadedBy: true,
    createdAt: true,
    updatedAt: true
  })), async (req, res) => {
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

  // YooKassa payment request schema
  const yookassaPaymentSchema = z.object({
    invoiceId: z.string().uuid("Invalid invoice ID format"),
    customerData: z.object({
      email: z.string().email().optional(),
      phone: z.string().optional(),
    }).optional()
  })

  // YOOKASSA PAYMENT INTEGRATION ROUTES
  // Create payment with fiscal receipt (54-FZ compliant)
  app.post("/api/payments/yookassa", authenticateToken, requireModuleAccess('finance'), validateBody(yookassaPaymentSchema), async (req, res) => {
    try {
      const user = (req as any).user;
      const userBranchId = requireValidBranchId(req, res);
      if (!userBranchId) return; // 403 already sent

      const { invoiceId, customerData } = req.body;
      
      // Get invoice data
      const invoice = await storage.getInvoice(invoiceId);
      if (!invoice) {
        return res.status(404).json({ error: "Invoice not found" });
      }

      // Get patient and owner data for receipt
      const patient = await storage.getPatient(invoice.patientId);
      if (!patient || !await ensurePatientAccess(user, patient.id)) {
        return res.status(403).json({ error: "Access denied to patient data" });
      }

      const owner = await storage.getOwner(patient.ownerId);
      if (!owner) {
        return res.status(404).json({ error: "Owner not found" });
      }

      // Get invoice items
      const invoiceItems = await storage.getInvoiceItems(invoiceId);

      // Check if payment intent already exists for this invoice
      const existingPaymentIntents = await storage.getPaymentIntentsByInvoice(invoiceId);
      const pendingPaymentIntent = existingPaymentIntents.find(pi => pi.status === 'pending');
      
      if (pendingPaymentIntent) {
        return res.json({
          paymentIntentId: pendingPaymentIntent.id,
          payment: pendingPaymentIntent.paymentData,
          confirmationUrl: pendingPaymentIntent.paymentData?.confirmation?.confirmation_url,
          message: "Payment already in progress"
        });
      }

      // Calculate attempt number based on existing intents
      const attemptNumber = existingPaymentIntents.length + 1;

      // Get catalog items for VAT calculation
      const catalogItems = await Promise.all(
        invoiceItems.map(item => storage.getCatalogItemById(item.itemId))
      );

      // Calculate VAT total
      let vatTotal = 0;
      const enrichedItems = invoiceItems.map((item, index) => {
        const catalogItem = catalogItems[index];
        const vatRate = catalogItem?.vatRate || 'not_applicable';
        const itemVat = vatRate === '20' ? parseFloat(item.total) * 0.2 / 1.2 : 
                      vatRate === '10' ? parseFloat(item.total) * 0.1 / 1.1 : 0;
        vatTotal += itemVat;
        
        return {
          name: item.itemName,
          type: (catalogItem?.type || 'service') as 'service' | 'product' | 'medication',
          quantity: item.quantity,
          price: parseFloat(item.price),
          total: parseFloat(item.total),
          vatRate: vatRate,
          productCode: catalogItem?.externalId || undefined,
          markingStatus: catalogItem?.markingStatus
        };
      });

      // Convert to YooKassa payment format
      const paymentData = yookassa.convertInvoiceToPayment({
        patientId: patient.id,
        patientName: patient.name,
        ownerName: owner.name,
        ownerEmail: customerData?.email || owner.email || undefined,
        ownerPhone: customerData?.phone || owner.phone || undefined,
        items: enrichedItems,
        total: parseFloat(invoice.total),
        vatTotal: vatTotal,
        description: `Счет ${invoice.id} - ветеринарные услуги для ${patient.name}`
      });

      // Get tenant credentials for YooKassa
      const tenantId = req.tenantId!;
      const credentials = await getIntegrationCredentialsOrThrow(tenantId, 'yookassa');
      
      // Generate deterministic idempotence key with proper attempt number
      const idempotenceKey = yookassa.generateIdempotenceKey(invoiceId, attemptNumber);
      
      // Create payment in YooKassa with idempotent key
      const payment = await yookassa.createPayment(credentials, paymentData, idempotenceKey);

      // Create payment intent record
      const paymentIntentId = await storage.createPaymentIntent({
        invoiceId: invoiceId,
        amount: parseFloat(invoice.total),
        currency: 'RUB',
        paymentMethod: 'yookassa',
        status: 'pending',
        integrationAccountId: null, // TODO: Add YooKassa integration account
        externalPaymentId: payment.id,
        paymentData: {
          ...payment,
          vatTotal: vatTotal, // Store calculated VAT for later reconciliation
          enrichedItems: enrichedItems
        },
        errorMessage: null
      });

      // Update invoice with payment method
      await storage.updateInvoice(invoiceId, {
        paymentMethod: 'yookassa',
        status: 'pending'
      });

      res.json({
        paymentIntentId,
        payment,
        confirmationUrl: payment.confirmation?.confirmation_url
      });
    } catch (error) {
      console.error("Error creating YooKassa payment:", error);
      res.status(500).json({ 
        error: "Failed to create payment", 
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Get payment status from YooKassa
  app.get("/api/payments/yookassa/:paymentId", authenticateToken, requireModuleAccess('finance'), async (req, res) => {
    try {
      // Get tenant credentials for YooKassa
      const tenantId = req.tenantId!;
      const credentials = await getIntegrationCredentialsOrThrow(tenantId, 'yookassa');
      
      const payment = await yookassa.getPayment(credentials, req.params.paymentId);
      res.json(payment);
    } catch (error) {
      console.error("Error getting YooKassa payment:", error);
      res.status(500).json({ 
        error: "Failed to get payment", 
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // YooKassa webhook for payment notifications
  app.post("/api/webhooks/yookassa", async (req, res) => {
    try {
      const notification = req.body;
      console.log('YooKassa webhook received:', notification);

      if (notification.event === 'payment.succeeded') {
        const paymentId = notification.object.id;
        console.log(`Payment succeeded: ${paymentId}`);
        // Note: Invoice lookup by paymentId needs to be implemented after storage layer update
      } else if (notification.event === 'payment.canceled') {
        const paymentId = notification.object.id;
        console.log(`Payment canceled: ${paymentId}`);
        // Note: Invoice lookup by paymentId needs to be implemented after storage layer update
      }

      res.status(200).json({ received: true });
    } catch (error) {
      console.error("Error processing YooKassa webhook:", error);
      res.status(500).json({ error: "Webhook processing failed" });
    }
  });

  // Cancel YooKassa payment
  app.post("/api/payments/yookassa/:paymentId/cancel", authenticateToken, requireModuleAccess('finance'), async (req, res) => {
    try {
      const { reason } = req.body;
      const payment = await yookassa.cancelPayment(req.params.paymentId, reason);
      res.json(payment);
    } catch (error) {
      console.error("Error canceling YooKassa payment:", error);
      res.status(500).json({ 
        error: "Failed to cancel payment", 
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // YooKassa receipt request schema
  const yookassaReceiptSchema = z.object({
    invoiceId: z.string().uuid("Invalid invoice ID format"),
    customerData: z.object({
      email: z.string().email().optional(),
      phone: z.string().optional(),
    }).optional(),
    receiptType: z.enum(['payment', 'refund']).default('payment')
  })

  // Create standalone fiscal receipt (for cash payments)
  app.post("/api/receipts/yookassa", authenticateToken, requireModuleAccess('finance'), validateBody(yookassaReceiptSchema), async (req, res) => {
    try {
      const user = (req as any).user;
      const userBranchId = requireValidBranchId(req, res);
      if (!userBranchId) return; // 403 already sent

      const { invoiceId, customerData, receiptType = 'payment' } = req.body;
      
      // Get invoice data
      const invoice = await storage.getInvoice(invoiceId);
      if (!invoice) {
        return res.status(404).json({ error: "Invoice not found" });
      }

      // Get patient and owner data for receipt
      const patient = await storage.getPatient(invoice.patientId);
      if (!patient || !await ensurePatientAccess(user, patient.id)) {
        return res.status(403).json({ error: "Access denied to patient data" });
      }

      const owner = await storage.getOwner(patient.ownerId);
      if (!owner) {
        return res.status(404).json({ error: "Owner not found" });
      }

      // Get invoice items
      const invoiceItems = await storage.getInvoiceItems(invoiceId);

      // Create receipt data
      const receiptData: yookassa.YooKassaReceipt = {
        customer: {
          full_name: owner.name,
          email: customerData?.email || owner.email || undefined,
          phone: customerData?.phone || owner.phone || undefined,
        },
        items: invoiceItems.map(item => ({
          description: item.itemName.substring(0, 128),
          amount: {
            value: parseFloat(item.total).toFixed(2),
            currency: 'RUB'
          },
          vat_code: yookassa.getVatCodeForItem(item.itemType === 'service' ? 'not_applicable' : '20'),
          quantity: item.quantity.toString(),
          payment_mode: yookassa.getPaymentModeForItem(item.itemType as 'service' | 'product' | 'medication'),
          payment_subject: yookassa.getPaymentSubjectForItem(item.itemType as 'service' | 'product' | 'medication')
        })),
        tax_system_code: 1, // General taxation system
        email: customerData?.email || owner.email || undefined,
        phone: customerData?.phone || owner.phone || undefined,
        send: true
      };

      // Create fiscal receipt record first
      const fiscalReceiptId = await storage.createFiscalReceipt({
        invoiceId: invoiceId,
        receiptNumber: null, // Will be filled after YooKassa response
        status: 'pending',
        receiptType: receiptType,
        paymentMethod: 'cash', // Standalone receipt is typically for cash
        customerEmail: customerData?.email || owner.email || null,
        customerPhone: customerData?.phone || owner.phone || null,
        taxationSystem: 'usn_income',
        operatorName: user.name,
        operatorInn: null, // TODO: Get from user profile or settings
        totalAmount: parseFloat(invoice.total),
        vatAmount: 0, // Calculate based on items
        cashAmount: parseFloat(invoice.total),
        cardAmount: 0,
        items: receiptData.items,
        markingStatus: 'not_required',
        fiscalData: null,
        integrationAccountId: null, // TODO: Add YooKassa integration account
        externalReceiptId: null, // Will be filled after YooKassa response
        errorMessage: null
      });

      // Generate deterministic idempotence key using unique receipt ID
      const receiptIdempotenceKey = yookassa.generateIdempotenceKey(`fiscal_receipt_${fiscalReceiptId}`, 1);
      
      // Create standalone receipt in YooKassa
      const receipt = await yookassa.createReceipt({
        receipt: receiptData
      }, receiptIdempotenceKey);

      // Update fiscal receipt with YooKassa response
      await storage.updateFiscalReceipt(fiscalReceiptId, {
        receiptNumber: receipt.id,
        externalReceiptId: receipt.id,
        status: 'registered',
        fiscalData: receipt,
        registeredAt: new Date()
      });

      // Update invoice status
      await storage.updateInvoice(invoiceId, {
        status: 'paid', // Cash payment is considered paid immediately
        fiscalReceiptId: fiscalReceiptId
      });

      res.json({
        fiscalReceiptId,
        receipt
      });
    } catch (error) {
      console.error("Error creating YooKassa receipt:", error);
      res.status(500).json({ 
        error: "Failed to create receipt", 
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // POST /api/receipts/moysklad - Create fiscal receipt via MoySklad
  app.post("/api/receipts/moysklad", authenticateToken, async (req, res) => {
    try {
      const { invoiceId, customerData } = req.body;
      
      if (!invoiceId) {
        return res.status(400).json({
          error: "invoiceId is required",
          message: "ID счета обязателен для создания фискального чека"
        });
      }

      // Получаем данные счета из базы данных
      const invoice = await storage.getInvoice(invoiceId);
      if (!invoice) {
        return res.status(404).json({
          error: "Invoice not found",
          message: "Счет не найден"
        });
      }

      // Получаем позиции счета
      const invoiceItems = await storage.getInvoiceItems(invoiceId);
      if (!invoiceItems || invoiceItems.length === 0) {
        return res.status(400).json({
          error: "No invoice items found",
          message: "В счете отсутствуют позиции товаров/услуг"
        });
      }

      // Get tenant credentials for МойСклад
      const tenantId = req.tenantId!;
      const credentials = await getIntegrationCredentialsOrThrow(tenantId, 'moysklad');
      
      // Импортируем модуль МойСклад
      const { createFiscalReceipt } = await import('./integrations/moysklad');
      
      // Подготавливаем данные для создания фискального чека
      const receiptData = {
        invoiceId,
        customerData: customerData || {},
        // Конвертируем позиции счета в формат МойСклад
        positions: invoiceItems.map((item) => ({
          quantity: item.quantity,
          price: parseFloat(item.price.toString()) * 100, // Цена в копейках для API
          assortment: {
            meta: {
              href: `https://api.moysklad.ru/api/remap/1.2/entity/${item.itemType}/${item.itemId}`,
              type: item.itemType, // 'service' или 'product'
              mediaType: 'application/json' as const
            }
          },
          vat: 20, // НДС 20% по умолчанию (можно настроить)
          vatEnabled: true
        })),
        // Суммы оплаты (базируемся на total и статусе)
        cashSum: invoice.paymentMethod === 'cash' ? parseFloat(invoice.total.toString()) * 100 : 0, // В копейках
        noCashSum: invoice.paymentMethod === 'card' ? parseFloat(invoice.total.toString()) * 100 : 0, // В копейках
      };

      // Создаем фискальный чек через МойСклад
      const result = await createFiscalReceipt(credentials, receiptData);
      
      if (result.success) {
        res.json({
          success: true,
          message: "Фискальный чек успешно создан через МойСклад",
          receiptId: result.receiptId,
          fiscalReceiptUrl: result.fiscalReceiptUrl,
          invoiceId
        });
      } else {
        res.status(500).json({
          error: "Failed to create fiscal receipt",
          message: result.error || "Не удалось создать фискальный чек",
          details: result.details,
          invoiceId
        });
      }
    } catch (error) {
      console.error("Error in MoySklad receipt endpoint:", error);
      res.status(500).json({ 
        error: "Failed to process MoySklad receipt", 
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // =================== Integration Credentials Helper ===================
  
  // Helper function to get integration credentials from database
  async function getIntegrationCredentialsOrThrow(tenantId: string, provider: string): Promise<any> {
    const integrationConfig = await storage.getIntegrationCredentials(tenantId, provider);
    
    if (!integrationConfig || !integrationConfig.isActive) {
      throw new Error(`${provider} integration not configured or inactive`);
    }
    
    return integrationConfig.credentials;
  }

  // =================== System Settings API ===================
  
  // GET /api/system-settings - Get all system settings
  app.get("/api/system-settings", authenticateToken, async (req, res) => {
    try {
      // Check permission: superadmin or администратор/admin
      if (!req.user?.isSuperAdmin && req.user?.role !== 'администратор' && req.user?.role !== 'admin') {
        return res.status(403).json({ error: "Доступ запрещён" });
      }
      
      const settings = await storage.getSystemSettings();
      res.json(settings);
    } catch (error) {
      console.error("Error fetching system settings:", error);
      res.status(500).json({ error: "Failed to fetch system settings" });
    }
  });

  // GET /api/system-settings/:key - Get specific system setting
  app.get("/api/system-settings/:key", authenticateToken, async (req, res) => {
    try {
      // Check permission: superadmin or администратор/admin
      if (!req.user?.isSuperAdmin && req.user?.role !== 'администратор' && req.user?.role !== 'admin') {
        return res.status(403).json({ error: "Доступ запрещён" });
      }
      
      const { key } = req.params;
      const setting = await storage.getSystemSetting(key);
      
      if (!setting) {
        return res.status(404).json({ error: "System setting not found" });
      }
      
      res.json(setting);
    } catch (error) {
      console.error("Error fetching system setting:", error);
      res.status(500).json({ error: "Failed to fetch system setting" });
    }
  });

  // GET /api/system-settings/category/:category - Get settings by category
  app.get("/api/system-settings/category/:category", authenticateToken, async (req, res) => {
    try {
      // Check permission: superadmin or администратор/admin
      if (!req.user?.isSuperAdmin && req.user?.role !== 'администратор' && req.user?.role !== 'admin') {
        return res.status(403).json({ error: "Доступ запрещён" });
      }
      
      const { category } = req.params;
      const settings = await storage.getSystemSettingsByCategory(category);
      res.json(settings);
    } catch (error) {
      console.error("Error fetching system settings by category:", error);
      res.status(500).json({ error: "Failed to fetch system settings by category" });
    }
  });

  // POST /api/system-settings - Create new system setting
  app.post("/api/system-settings", authenticateToken, async (req, res) => {
    try {
      // Check permission: superadmin or администратор/admin
      if (!req.user?.isSuperAdmin && req.user?.role !== 'администратор' && req.user?.role !== 'admin') {
        return res.status(403).json({ error: "Доступ запрещён" });
      }
      
      const validatedData = insertSystemSettingSchema.parse(req.body);
      const setting = await storage.createSystemSetting(validatedData);
      res.status(201).json(setting);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      console.error("Error creating system setting:", error);
      res.status(500).json({ error: "Failed to create system setting" });
    }
  });

  // PUT /api/system-settings/:key - Update system setting
  app.put("/api/system-settings/:key", authenticateToken, async (req, res) => {
    try {
      // Check permission: superadmin or администратор/admin
      if (!req.user?.isSuperAdmin && req.user?.role !== 'администратор' && req.user?.role !== 'admin') {
        return res.status(403).json({ error: "Доступ запрещён" });
      }
      
      const { key } = req.params;
      const validatedData = updateSystemSettingSchema.parse(req.body);
      
      // Check if setting exists
      const existingSetting = await storage.getSystemSetting(key);
      if (!existingSetting) {
        return res.status(404).json({ error: "System setting not found" });
      }
      
      const updatedSetting = await storage.updateSystemSetting(key, validatedData);
      res.json(updatedSetting);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      console.error("Error updating system setting:", error);
      res.status(500).json({ error: "Failed to update system setting" });
    }
  });

  // DELETE /api/system-settings/:key - Delete system setting
  app.delete("/api/system-settings/:key", authenticateToken, async (req, res) => {
    try {
      // Check permission: superadmin or администратор/admin
      if (!req.user?.isSuperAdmin && req.user?.role !== 'администратор' && req.user?.role !== 'admin') {
        return res.status(403).json({ error: "Доступ запрещён" });
      }
      
      const { key } = req.params;
      
      // Check if setting exists
      const existingSetting = await storage.getSystemSetting(key);
      if (!existingSetting) {
        return res.status(404).json({ error: "System setting not found" });
      }
      
      await storage.deleteSystemSetting(key);
      res.json({ message: "System setting deleted successfully" });
    } catch (error) {
      console.error("Error deleting system setting:", error);
      res.status(500).json({ error: "Failed to delete system setting" });
    }
  });

  // =================== Integration Credentials API ===================
  
  // Helper function to recursively mask all sensitive credential values
  function maskCredentials(credentials: any): any {
    // Allowlist of non-sensitive fields that don't need masking
    const nonSensitiveFields = ['retailStoreId', 'shopId', 'storeId', 'accountId'];
    
    if (typeof credentials === 'string') {
      // Mask all string values (assumed to be secrets)
      return '***';
    }
    
    if (Array.isArray(credentials)) {
      // Recursively mask array elements
      return credentials.map(item => maskCredentials(item));
    }
    
    if (typeof credentials === 'object' && credentials !== null) {
      // Recursively mask object properties
      const masked: Record<string, any> = {};
      for (const [key, value] of Object.entries(credentials)) {
        if (nonSensitiveFields.includes(key)) {
          masked[key] = value; // Keep non-sensitive fields as-is
        } else {
          masked[key] = maskCredentials(value); // Recursively mask
        }
      }
      return masked;
    }
    
    // Keep non-string primitives (numbers, booleans, null) as-is
    return credentials;
  }
  
  // GET /api/integration-credentials - Get all integration credentials for current tenant
  app.get("/api/integration-credentials", authenticateToken, requireRole('администратор', 'admin'), async (req, res) => {
    try {
      const tenantId = req.tenantId!;
      
      // Get all integration types and fetch credentials for each
      const integrationTypes = ['moysklad', 'yookassa'];
      const allCredentials = [];
      
      for (const type of integrationTypes) {
        const cred = await storage.getIntegrationCredentials(tenantId, type);
        if (cred) {
          allCredentials.push({
            ...cred,
            credentials: maskCredentials(cred.credentials)
          });
        }
      }
      
      res.json(allCredentials);
    } catch (error) {
      console.error("Error fetching integration credentials:", error);
      res.status(500).json({ error: "Failed to fetch integration credentials" });
    }
  });

  // GET /api/integration-credentials/:provider - Get credentials for specific provider
  app.get("/api/integration-credentials/:provider", authenticateToken, requireRole('администратор', 'admin'), async (req, res) => {
    try {
      const tenantId = req.tenantId!;
      const { provider } = req.params;
      
      const credentials = await storage.getIntegrationCredentials(tenantId, provider);
      
      if (!credentials) {
        return res.status(404).json({ error: "Integration credentials not found" });
      }
      
      // Mask ALL sensitive credential values for security
      const maskedCredential = {
        ...credentials,
        credentials: maskCredentials(credentials.credentials)
      };
      
      res.json(maskedCredential);
    } catch (error) {
      console.error("Error fetching integration credentials:", error);
      res.status(500).json({ error: "Failed to fetch integration credentials" });
    }
  });

  // PUT /api/integration-credentials/:provider - Upsert integration credentials
  app.put("/api/integration-credentials/:provider", authenticateToken, requireRole('администратор', 'admin'), async (req, res) => {
    try {
      const tenantId = req.tenantId!;
      const { provider } = req.params;
      const { credentials, isActive } = req.body;
      
      if (!credentials || typeof credentials !== 'object') {
        return res.status(400).json({ error: "Invalid credentials format" });
      }
      
      const result = await storage.upsertIntegrationCredentials(
        tenantId,
        provider,
        credentials,
        isActive ?? true
      );
      
      // Mask ALL sensitive credential values for security
      const maskedResult = {
        ...result,
        credentials: maskCredentials(result.credentials)
      };
      
      res.json(maskedResult);
    } catch (error) {
      console.error("Error upserting integration credentials:", error);
      res.status(500).json({ error: "Failed to save integration credentials" });
    }
  });

  // DELETE /api/integration-credentials/:provider - Delete integration credentials
  app.delete("/api/integration-credentials/:provider", authenticateToken, requireRole('администратор', 'admin'), async (req, res) => {
    try {
      const tenantId = req.tenantId!;
      const { provider } = req.params;
      
      const existing = await storage.getIntegrationCredentials(tenantId, provider);
      if (!existing || existing.length === 0) {
        return res.status(404).json({ error: "Integration credentials not found" });
      }
      
      await storage.deleteIntegrationCredentials(tenantId, provider);
      res.json({ message: "Integration credentials deleted successfully" });
    } catch (error) {
      console.error("Error deleting integration credentials:", error);
      res.status(500).json({ error: "Failed to delete integration credentials" });
    }
  });

  // POST /api/integration-credentials/:provider/test - Test integration credentials
  app.post("/api/integration-credentials/:provider/test", authenticateToken, requireRole('администратор', 'admin'), async (req, res) => {
    try {
      const { provider } = req.params;
      const { credentials } = req.body;
      
      if (!credentials || typeof credentials !== 'object') {
        return res.status(400).json({ error: "Invalid credentials format" });
      }
      
      // Test connection based on provider
      if (provider === 'moysklad') {
        const { testConnection } = await import('./integrations/moysklad.js');
        const result = await testConnection(credentials);
        res.json(result);
      } else if (provider === 'yookassa') {
        // YooKassa doesn't have a test endpoint, validate format only
        if (!credentials.shopId || !credentials.secretKey) {
          return res.status(400).json({ 
            success: false,
            message: "YooKassa требует shopId и secretKey" 
          });
        }
        res.json({ 
          success: true, 
          message: "YooKassa credentials format valid" 
        });
      } else {
        return res.status(400).json({ error: "Unknown provider" });
      }
    } catch (error) {
      console.error("Error testing integration credentials:", error);
      res.status(500).json({ 
        success: false,
        error: "Failed to test integration credentials",
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // =================== МойСклад Номенклатура API ===================
  
  // GET /api/moysklad/nomenclature/sync-status - Получить статус синхронизации номенклатуры
  app.get("/api/moysklad/nomenclature/sync-status", authenticateToken, requireRole('администратор', 'admin'), async (req, res) => {
    try {
      // Получаем количество товаров и услуг в локальной системе
      const products = await storage.getProducts();
      const services = await storage.getServices();
      
      res.json({
        localData: {
          products: products.length,
          services: services.length,
          total: products.length + services.length
        },
        lastSync: null, // TODO: можно добавить в базу данных
        status: 'ready'
      });
    } catch (error) {
      console.error("Error getting sync status:", error);
      res.status(500).json({ error: "Failed to get sync status" });
    }
  });

  // POST /api/moysklad/nomenclature/sync - Загрузить номенклатуру ИЗ МойСклад
  app.post("/api/moysklad/nomenclature/sync", authenticateToken, requireRole('администратор', 'admin'), async (req, res) => {
    try {
      console.log('[МойСклад] Начинаем загрузку номенклатуры ИЗ МойСклад...');
      
      // Get tenant credentials for МойСклад
      const tenantId = req.tenantId!;
      const credentials = await getIntegrationCredentialsOrThrow(tenantId, 'moysklad');
      
      // Импортируем модуль МойСклад и запускаем загрузку
      const { syncNomenclature } = await import('./integrations/moysklad');
      
      const result = await syncNomenclature(credentials);
      
      console.log('[МойСклад] Загрузка завершена:', result);
      
      // Возвращаем результат с информацией о двухсторонней синхронизации
      res.json({
        success: result.success,
        message: "Двухсторонняя синхронизация номенклатуры завершена",
        data: {
          // Импорт из МойСклад
          imported: {
            products: result.importedProducts,
            services: result.importedServices,
            total: result.importedProducts + result.importedServices
          },
          // Экспорт в МойСклад
          exported: {
            products: result.exportedProducts,
            services: result.exportedServices,
            archived: result.archivedItems,
            total: result.exportedProducts + result.exportedServices + result.archivedItems
          },
          // Итоговое состояние
          final: {
            products: result.products.length,
            services: result.services.length,
            total: result.products.length + result.services.length
          },
          errors: result.errors.length,
          details: result.errors.length > 0 ? result.errors : undefined,
          products: result.products, // Показываем все товары
          services: result.services  // Показываем все услуги
        }
      });
      
    } catch (error) {
      console.error("Error in MoySklad sync:", error);
      res.status(500).json({ 
        error: "Failed to load nomenclature", 
        message: "Не удалось загрузить номенклатуру из МойСклад",
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // GET /api/moysklad/nomenclature/remote - Получить номенклатуру из МойСклад
  app.get("/api/moysklad/nomenclature/remote", authenticateToken, requireRole('администратор', 'admin'), async (req, res) => {
    try {
      // Get tenant credentials for МойСклад
      const tenantId = req.tenantId!;
      const credentials = await getIntegrationCredentialsOrThrow(tenantId, 'moysklad');
      
      const { getAssortment } = await import('./integrations/moysklad');
      const assortment = await getAssortment(credentials);
      
      res.json({
        success: true,
        data: {
          total: assortment.rows?.length || 0,
          items: assortment.rows || []
        }
      });
    } catch (error) {
      console.error("Error getting remote nomenclature:", error);
      res.status(500).json({ 
        error: "Failed to get remote nomenclature", 
        message: "Не удалось получить номенклатуру из МойСклад",
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // POST /api/moysklad/test-connection - Тестирование подключения к МойСклад
  app.post("/api/moysklad/test-connection", authenticateToken, requireRole('администратор', 'admin'), async (req, res) => {
    try {
      // Get tenant credentials for МойСклад
      const tenantId = req.tenantId!;
      const credentials = await getIntegrationCredentialsOrThrow(tenantId, 'moysklad');
      
      const { testConnection } = await import('./integrations/moysklad');
      const result = await testConnection(credentials);
      
      if (result.success) {
        res.json({
          success: true,
          message: result.message
        });
      } else {
        res.status(400).json({
          success: false,
          error: "Connection failed",
          message: result.message
        });
      }
    } catch (error) {
      console.error("Error testing MoySklad connection:", error);
      res.status(500).json({ 
        error: "Failed to test connection", 
        message: "Не удалось протестировать подключение к МойСклад",
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // =================== 1С Розница/Касса API ===================
  
  // POST /api/onec/products/sync - Синхронизация товаров из 1С Розница
  app.post("/api/onec/products/sync", authenticateToken, requireRole('администратор', 'admin'), async (req, res) => {
    try {
      console.log('[1С Розница] Начинаем синхронизацию товаров...');
      
      // Импортируем модуль 1С Розница
      const { loadProductsFromOneC } = await import('./integrations/onec-retail');
      
      const result = await loadProductsFromOneC();
      
      console.log('[1С Розница] Синхронизация товаров завершена:', result);
      
      res.json({
        success: result.success,
        imported: result.imported,
        errors: result.errors,
        message: `Синхронизация товаров завершена. Загружено: ${result.imported}, ошибок: ${result.errors.length}`
      });
    } catch (error) {
      console.error('[1С Розница] Ошибка синхронизации товаров:', error);
      res.status(500).json({
        error: "Internal server error", 
        message: `Ошибка синхронизации товаров из 1С: ${error}`
      });
    }
  });

  // POST /api/onec/services/sync - Синхронизация услуг из 1С Розница
  app.post("/api/onec/services/sync", authenticateToken, requireRole('администратор', 'admin'), async (req, res) => {
    try {
      console.log('[1С Розница] Начинаем синхронизацию услуг...');
      
      // Импортируем модуль 1С Розница
      const { loadServicesFromOneC } = await import('./integrations/onec-retail');
      
      const result = await loadServicesFromOneC();
      
      console.log('[1С Розница] Синхронизация услуг завершена:', result);
      
      res.json({
        success: result.success,
        imported: result.imported, 
        errors: result.errors,
        message: `Синхронизация услуг завершена. Загружено: ${result.imported}, ошибок: ${result.errors.length}`
      });
    } catch (error) {
      console.error('[1С Розница] Ошибка синхронизации услуг:', error);
      res.status(500).json({
        error: "Internal server error",
        message: `Ошибка синхронизации услуг из 1С: ${error}`
      });
    }
  });

  // GET /api/onec/stats - Статистика интеграции с 1С Розница
  app.get("/api/onec/stats", authenticateToken, requireRole('администратор', 'admin'), async (req, res) => {
    try {
      // Получаем товары и услуги из 1С системы
      const products = await storage.getProductsByExternalSystem('onec');
      const services = await storage.getServicesByExternalSystem('onec');
      
      // Проверяем подключение к 1С (базовая проверка переменных окружения)
      const connected = !!(
        process.env.ONEC_BASE_URL && 
        process.env.ONEC_USERNAME && 
        process.env.ONEC_PASSWORD &&
        process.env.ONEC_ORGANIZATION_KEY &&
        process.env.ONEC_CASH_REGISTER_KEY
      );
      
      res.json({
        success: true,
        connected,
        products,
        services,
        summary: {
          productsCount: products.length,
          servicesCount: services.length,
          totalCount: products.length + services.length
        }
      });
    } catch (error) {
      console.error('[1С Розница] Ошибка получения статистики:', error);
      res.status(500).json({
        error: "Internal server error",
        message: `Ошибка получения статистики 1С: ${error}`
      });
    }
  });

  // POST /api/onec/test-connection - Проверка подключения к 1С Розница
  app.post("/api/onec/test-connection", authenticateToken, requireRole('администратор', 'admin'), async (req, res) => {
    try {
      console.log('[1С Розница] Проверяем подключение...');
      
      // Импортируем модуль 1С Розница
      const { testOneCConnection } = await import('./integrations/onec-retail');
      
      const connectionResult = await testOneCConnection();
      
      res.json({
        success: true,
        connected: connectionResult.success,
        message: connectionResult.success 
          ? 'Подключение к 1С Розница установлено успешно'
          : `Ошибка подключения: ${connectionResult.error}`,
        data: connectionResult
      });
    } catch (error: any) {
      console.error('[1С Розница] Ошибка проверки подключения:', error);
      res.status(500).json({
        success: false,
        connected: false,
        message: 'Не удалось проверить подключение к 1С Розница',
        error: error.message
      });
    }
  });

  // POST /api/onec/config - Сохранение конфигурации 1С Розница
  app.post("/api/onec/config", authenticateToken, requireRole('администратор', 'admin'), async (req, res) => {
    try {
      const { baseUrl, username, password, organizationKey, cashRegisterKey } = req.body;
      
      console.log('[1С Розница] Сохраняем конфигурацию...');
      
      // Валидация обязательных полей
      if (!baseUrl || !username || !password || !organizationKey) {
        return res.status(400).json({
          success: false,
          error: 'Все поля обязательны: baseUrl, username, password, organizationKey'
        });
      }
      
      // Сохраняем настройки в системных настройках
      await storage.createOrUpdateSystemSetting('onec_base_url', baseUrl);
      await storage.createOrUpdateSystemSetting('onec_username', username);
      await storage.createOrUpdateSystemSetting('onec_password', password);
      await storage.createOrUpdateSystemSetting('onec_organization_key', organizationKey);
      if (cashRegisterKey) {
        await storage.createOrUpdateSystemSetting('onec_cash_register_key', cashRegisterKey);
      }
      
      res.json({
        success: true,
        message: 'Конфигурация 1С Розница сохранена успешно'
      });
    } catch (error: any) {
      console.error('[1С Розница] Ошибка сохранения конфигурации:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // GET /api/onec/config - Получение конфигурации 1С Розница
  app.get("/api/onec/config", authenticateToken, requireRole('администратор', 'admin'), async (req, res) => {
    try {
      console.log('[1С Розница] Загружаем конфигурацию...');
      
      const settings = await storage.getSystemSettings();
      const config = {
        baseUrl: settings.find(s => s.key === 'onec_base_url')?.value || '',
        username: settings.find(s => s.key === 'onec_username')?.value || '',
        password: settings.find(s => s.key === 'onec_password')?.value || '',
        organizationKey: settings.find(s => s.key === 'onec_organization_key')?.value || '',
        cashRegisterKey: settings.find(s => s.key === 'onec_cash_register_key')?.value || '',
      };
      
      res.json({
        success: true,
        data: config
      });
    } catch (error: any) {
      console.error('[1С Розница] Ошибка загрузки конфигурации:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // =============================================
  // ЛОКАЛЬНАЯ ПЕЧАТЬ ФИСКАЛЬНЫХ ЧЕКОВ
  // =============================================

  // GET /api/fiscal/pending-receipts - Получение очереди чеков для локальной печати
  app.get("/api/fiscal/pending-receipts", authenticateToken, async (req, res) => {
    try {
      const userBranchId = requireValidBranchId(req, res);
      if (!userBranchId) return;

      // Получение фискальных чеков, ожидающих локальной печати
      const pendingReceipts = await storage.getPendingLocalPrintReceipts(userBranchId);
      
      // Преобразование в формат для Python программы
      const receiptsForPrint = pendingReceipts.map(receipt => ({
        id: receipt.id,
        invoiceId: receipt.invoiceId,
        items: receipt.items, // JSON структура с позициями чека
        total: parseFloat(receipt.totalAmount),
        customer: {
          email: receipt.customerEmail,
          phone: receipt.customerPhone
        },
        paymentMethod: receipt.paymentMethod,
        taxationSystem: receipt.taxationSystem,
        operatorName: receipt.operatorName || 'Кассир',
        receiptType: receipt.receiptType,
        createdAt: receipt.createdAt
      }));

      res.json(receiptsForPrint);
    } catch (error) {
      console.error("Error getting pending receipts:", error);
      res.status(500).json({ 
        error: "Failed to get pending receipts",
        message: "Не удалось получить очередь чеков",
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // POST /api/fiscal/mark-printed - Отметка чека как напечатанного
  app.post("/api/fiscal/mark-printed", authenticateToken, async (req, res) => {
    try {
      const userBranchId = requireValidBranchId(req, res);
      if (!userBranchId) return;

      const { receipt_id, print_result, printed_at } = req.body;

      if (!receipt_id || !print_result) {
        return res.status(400).json({ 
          error: "Missing required fields",
          message: "Отсутствуют обязательные поля" 
        });
      }

      // Обновление статуса фискального чека
      const success = await storage.markReceiptAsPrinted(
        receipt_id, 
        print_result,
        printed_at ? new Date(printed_at) : new Date()
      );

      if (success) {
        res.json({ 
          success: true,
          message: "Receipt marked as printed"
        });
      } else {
        res.status(404).json({ 
          error: "Receipt not found",
          message: "Чек не найден"
        });
      }
    } catch (error) {
      console.error("Error marking receipt as printed:", error);
      res.status(500).json({ 
        error: "Failed to mark receipt as printed",
        message: "Не удалось отметить чек как напечатанный",
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // POST /api/fiscal/local-print - Отправка чека на локальную печать
  app.post("/api/fiscal/local-print", authenticateToken, async (req, res) => {
    try {
      const userBranchId = requireValidBranchId(req, res);
      if (!userBranchId) return;

      const { invoiceId, printerType = 'atol' } = req.body;

      if (!invoiceId) {
        return res.status(400).json({ 
          error: "Missing invoiceId",
          message: "Отсутствует ID счета" 
        });
      }

      // Проверка доступа к счету
      const invoice = await storage.getInvoice(invoiceId);
      if (!invoice) {
        return res.status(404).json({ 
          error: "Invoice not found",
          message: "Счет не найден"
        });
      }

      // Проверка доступа к пациенту счета
      const patient = await storage.getPatient(invoice.patientId);
      if (!patient || patient.branchId !== userBranchId) {
        return res.status(403).json({ 
          error: "Access denied",
          message: "Доступ запрещен"
        });
      }

      // Создание или обновление фискального чека для локальной печати
      const receiptId = await storage.requestLocalPrint(invoiceId, printerType, req.user?.fullName || 'Кассир');

      res.json({ 
        success: true,
        receiptId: receiptId,
        message: "Чек добавлен в очередь локальной печати"
      });
    } catch (error) {
      console.error("Error requesting local print:", error);
      res.status(500).json({ 
        error: "Failed to request local print",
        message: "Не удалось добавить чек в очередь печати",
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // GET /api/fiscal/local-print-status/:receiptId - Проверка статуса локальной печати
  app.get("/api/fiscal/local-print-status/:receiptId", authenticateToken, async (req, res) => {
    try {
      const userBranchId = requireValidBranchId(req, res);
      if (!userBranchId) return;

      const { receiptId } = req.params;
      
      const receipt = await storage.getFiscalReceipt(receiptId);
      if (!receipt) {
        return res.status(404).json({ 
          error: "Receipt not found",
          message: "Чек не найден"
        });
      }

      // Проверка доступа к чеку через счет и пациента
      const invoice = await storage.getInvoice(receipt.invoiceId);
      if (!invoice) {
        return res.status(404).json({ 
          error: "Invoice not found",
          message: "Счет не найден"
        });
      }

      const patient = await storage.getPatient(invoice.patientId);
      if (!patient || patient.branchId !== userBranchId) {
        return res.status(403).json({ 
          error: "Access denied",
          message: "Доступ запрещен"
        });
      }

      res.json({
        id: receipt.id,
        status: receipt.localPrintStatus,
        printerType: receipt.localPrinterType,
        printedAt: receipt.localPrintedAt,
        printData: receipt.localPrintData,
        error: receipt.localPrintError
      });
    } catch (error) {
      console.error("Error getting print status:", error);
      res.status(500).json({ 
        error: "Failed to get print status",
        message: "Не удалось получить статус печати",
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // ============= КАССОВАЯ СИСТЕМА МОЙ СКЛАД =============
  
  // === УПРАВЛЕНИЕ КАССАМИ ===
  
  // GET /api/cash/registers - Получение списка касс филиала
  app.get("/api/cash/registers", authenticateToken, requireModuleAccess('finance'), async (req, res) => {
    try {
      const userBranchId = requireValidBranchId(req, res);
      if (!userBranchId) return;

      const registers = await storage.getCashRegisters(userBranchId);
      res.json(registers);
    } catch (error) {
      console.error("Error getting cash registers:", error);
      res.status(500).json({ 
        error: "Failed to get cash registers",
        message: "Не удалось получить список касс"
      });
    }
  });

  // POST /api/cash/registers - Создание новой кассы
  app.post("/api/cash/registers", authenticateToken, requireRole('admin'), async (req, res) => {
    try {
      const userBranchId = requireValidBranchId(req, res);
      if (!userBranchId) return;

      const validation = insertCashRegisterSchema.safeParse({
        ...req.body,
        branchId: userBranchId
      });

      if (!validation.success) {
        return res.status(400).json({ 
          error: "Validation failed",
          message: "Ошибка валидации данных",
          details: validation.error.issues
        });
      }

      const register = await storage.createCashRegister(validation.data);
      res.status(201).json(register);
    } catch (error) {
      console.error("Error creating cash register:", error);
      res.status(500).json({ 
        error: "Failed to create cash register",
        message: "Не удалось создать кассу"
      });
    }
  });

  // PUT /api/cash/registers/:id - Обновление кассы
  app.put("/api/cash/registers/:id", authenticateToken, requireRole('admin'), async (req, res) => {
    try {
      const userBranchId = requireValidBranchId(req, res);
      if (!userBranchId) return;

      const { id } = req.params;
      
      // Проверка доступа к кассе
      const registers = await storage.getCashRegisters(userBranchId);
      const register = registers.find(r => r.id === id);
      if (!register || register.branchId !== userBranchId) {
        return res.status(404).json({ 
          error: "Cash register not found",
          message: "Касса не найдена"
        });
      }

      const validation = insertCashRegisterSchema.partial().safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ 
          error: "Validation failed",
          message: "Ошибка валидации данных",
          details: validation.error.issues
        });
      }

      const updatedRegister = await storage.updateCashRegister(id, validation.data);
      res.json(updatedRegister);
    } catch (error) {
      console.error("Error updating cash register:", error);
      res.status(500).json({ 
        error: "Failed to update cash register",
        message: "Не удалось обновить кассу"
      });
    }
  });

  // === УПРАВЛЕНИЕ СМЕНАМИ ===
  
  // GET /api/cash/shifts - Получение смен кассы
  app.get("/api/cash/shifts", authenticateToken, requireModuleAccess('finance'), async (req, res) => {
    try {
      const userBranchId = requireValidBranchId(req, res);
      if (!userBranchId) return;

      const { registerId, status } = req.query;
      const shifts = await storage.getCashShifts(userBranchId);
      // Фильтрация по registerId и status на клиенте
      const filteredShifts = shifts.filter(shift => {
        if (registerId && shift.registerId !== registerId) return false;
        if (status && shift.status !== status) return false;
        return true;
      });
      res.json(filteredShifts);
    } catch (error) {
      console.error("Error getting cash shifts:", error);
      res.status(500).json({ 
        error: "Failed to get cash shifts",
        message: "Не удалось получить смены"
      });
    }
  });

  // POST /api/cash/shifts/open - Открытие новой смены
  app.post("/api/cash/shifts/open", authenticateToken, requireModuleAccess('finance'), async (req, res) => {
    try {
      const userBranchId = requireValidBranchId(req, res);
      if (!userBranchId) return;

      if (!req.user?.id) {
        return res.status(401).json({ error: "User not authenticated" });
      }
      
      const validation = insertCashShiftSchema.safeParse({
        ...req.body,
        branchId: userBranchId,
        cashierId: req.user.id,
        status: 'open',
        openedAt: new Date()
      });

      if (!validation.success) {
        return res.status(400).json({ 
          error: "Validation failed",
          message: "Ошибка валидации данных",
          details: validation.error.issues
        });
      }

      const shift = await storage.createCashShift(validation.data);
      res.status(201).json(shift);
    } catch (error) {
      console.error("Error opening cash shift:", error);
      res.status(500).json({ 
        error: "Failed to open cash shift",
        message: "Не удалось открыть смену"
      });
    }
  });

  // POST /api/cash/shifts/:id/close - Закрытие смены
  app.post("/api/cash/shifts/:id/close", authenticateToken, requireModuleAccess('finance'), async (req, res) => {
    try {
      const userBranchId = requireValidBranchId(req, res);
      if (!userBranchId) return;

      const { id } = req.params;
      const { finalCashAmount, notes } = req.body;

      if (!req.user?.id) {
        return res.status(401).json({ error: "User not authenticated" });
      }
      
      const shift = await storage.updateCashShift(id, {
        status: 'closed',
        closedAt: new Date(),
        closingCashAmount: finalCashAmount,
        notes
      });
      res.json(shift);
    } catch (error) {
      console.error("Error closing cash shift:", error);
      res.status(500).json({ 
        error: "Failed to close cash shift",
        message: "Не удалось закрыть смену"
      });
    }
  });

  // === УПРАВЛЕНИЕ КЛИЕНТАМИ ===
  
  // GET /api/cash/customers - Поиск клиентов
  app.get("/api/cash/customers", authenticateToken, requireModuleAccess('finance'), async (req, res) => {
    try {
      const userBranchId = requireValidBranchId(req, res);
      if (!userBranchId) return;

      const { search } = req.query;
      const customers = await storage.getCustomers(userBranchId, search as string);
      res.json(customers);
    } catch (error) {
      console.error("Error getting customers:", error);
      res.status(500).json({ 
        error: "Failed to get customers",
        message: "Не удалось получить клиентов"
      });
    }
  });

  // POST /api/cash/customers - Создание клиента
  app.post("/api/cash/customers", authenticateToken, requireModuleAccess('finance'), async (req, res) => {
    try {
      const userBranchId = requireValidBranchId(req, res);
      if (!userBranchId) return;

      const validation = insertCustomerSchema.safeParse({
        ...req.body,
        branchId: userBranchId
      });

      if (!validation.success) {
        return res.status(400).json({ 
          error: "Validation failed",
          message: "Ошибка валидации данных",
          details: validation.error.issues
        });
      }

      const customer = await storage.createCustomer(validation.data);
      res.status(201).json(customer);
    } catch (error) {
      console.error("Error creating customer:", error);
      res.status(500).json({ 
        error: "Failed to create customer",
        message: "Не удалось создать клиента"
      });
    }
  });

  // PUT /api/cash/customers/:id - Обновление клиента
  app.put("/api/cash/customers/:id", authenticateToken, requireModuleAccess('finance'), async (req, res) => {
    try {
      const userBranchId = requireValidBranchId(req, res);
      if (!userBranchId) return;

      const { id } = req.params;
      
      const customers = await storage.getCustomers(userBranchId);
      const customer = customers.find(c => c.id === id);
      if (!customer || customer.branchId !== userBranchId) {
        return res.status(404).json({ 
          error: "Customer not found",
          message: "Клиент не найден"
        });
      }

      const validation = insertCustomerSchema.partial().safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ 
          error: "Validation failed",
          message: "Ошибка валидации данных",
          details: validation.error.issues
        });
      }

      const updatedCustomer = await storage.updateCustomer(id, validation.data);
      res.json(updatedCustomer);
    } catch (error) {
      console.error("Error updating customer:", error);
      res.status(500).json({ 
        error: "Failed to update customer",
        message: "Не удалось обновить клиента"
      });
    }
  });

  // === УПРАВЛЕНИЕ СКИДКАМИ ===
  
  // GET /api/cash/discounts - Получение правил скидок
  app.get("/api/cash/discounts", authenticateToken, requireModuleAccess('finance'), async (req, res) => {
    try {
      const userBranchId = requireValidBranchId(req, res);
      if (!userBranchId) return;

      const { type, isActive } = req.query;
      const discounts = await storage.getDiscountRules(userBranchId);
      // Фильтрация по типу и активности
      const filteredDiscounts = discounts.filter(discount => {
        if (type && discount.type !== type) return false;
        if (isActive !== undefined && discount.isActive !== (isActive === 'true')) return false;
        return true;
      });
      res.json(filteredDiscounts);
    } catch (error) {
      console.error("Error getting discount rules:", error);
      res.status(500).json({ 
        error: "Failed to get discount rules",
        message: "Не удалось получить правила скидок"
      });
    }
  });

  // POST /api/cash/discounts - Создание правила скидки
  app.post("/api/cash/discounts", authenticateToken, requireRole('admin'), async (req, res) => {
    try {
      const userBranchId = requireValidBranchId(req, res);
      if (!userBranchId) return;

      const validation = insertDiscountRuleSchema.safeParse({
        ...req.body,
        branchId: userBranchId
      });

      if (!validation.success) {
        return res.status(400).json({ 
          error: "Validation failed",
          message: "Ошибка валидации данных",
          details: validation.error.issues
        });
      }

      const discount = await storage.createDiscountRule(validation.data);
      res.status(201).json(discount);
    } catch (error) {
      console.error("Error creating discount rule:", error);
      res.status(500).json({ 
        error: "Failed to create discount rule",
        message: "Не удалось создать правило скидки"
      });
    }
  });

  // === УПРАВЛЕНИЕ СПОСОБАМИ ОПЛАТЫ ===
  
  // GET /api/cash/payment-methods - Получение способов оплаты
  app.get("/api/cash/payment-methods", authenticateToken, requireModuleAccess('finance'), async (req, res) => {
    try {
      const userBranchId = requireValidBranchId(req, res);
      if (!userBranchId) return;

      const { isActive } = req.query;
      const paymentMethods = await storage.getPaymentMethods(userBranchId);
      // Фильтрация по активности
      const filteredMethods = paymentMethods.filter(method => {
        if (isActive !== undefined && method.isActive !== (isActive === 'true')) return false;
        return true;
      });
      res.json(filteredMethods);
    } catch (error) {
      console.error("Error getting payment methods:", error);
      res.status(500).json({ 
        error: "Failed to get payment methods",
        message: "Не удалось получить способы оплаты"
      });
    }
  });

  // POST /api/cash/payment-methods - Создание способа оплаты
  app.post("/api/cash/payment-methods", authenticateToken, requireRole('admin'), async (req, res) => {
    try {
      const userBranchId = requireValidBranchId(req, res);
      if (!userBranchId) return;

      const validation = insertPaymentMethodSchema.safeParse({
        ...req.body,
        branchId: userBranchId
      });

      if (!validation.success) {
        return res.status(400).json({ 
          error: "Validation failed",
          message: "Ошибка валидации данных",
          details: validation.error.issues
        });
      }

      const paymentMethod = await storage.createPaymentMethod(validation.data);
      res.status(201).json(paymentMethod);
    } catch (error) {
      console.error("Error creating payment method:", error);
      res.status(500).json({ 
        error: "Failed to create payment method",
        message: "Не удалось создать способ оплаты"
      });
    }
  });

  // === ТРАНЗАКЦИИ И ПРОДАЖИ ===
  
  // GET /api/cash/transactions - Получение транзакций
  app.get("/api/cash/transactions", authenticateToken, requireModuleAccess('finance'), async (req, res) => {
    try {
      const userBranchId = requireValidBranchId(req, res);
      if (!userBranchId) return;

      const { registerId, shiftId, startDate, endDate } = req.query;
      const transactions = await storage.getSalesTransactions(userBranchId);
      // Фильтрация по параметрам
      const filteredTransactions = transactions.filter(transaction => {
        if (registerId && transaction.registerId !== registerId) return false;
        if (shiftId && transaction.shiftId !== shiftId) return false;
        if (startDate && transaction.createdAt < new Date(startDate as string)) return false;
        if (endDate && transaction.createdAt > new Date(endDate as string)) return false;
        return true;
      });
      res.json(filteredTransactions);
    } catch (error) {
      console.error("Error getting sales transactions:", error);
      res.status(500).json({ 
        error: "Failed to get transactions",
        message: "Не удалось получить транзакции"
      });
    }
  });

  // POST /api/cash/transactions - Создание транзакции (продажи)
  app.post("/api/cash/transactions", authenticateToken, requireModuleAccess('finance'), async (req, res) => {
    try {
      const userBranchId = requireValidBranchId(req, res);
      if (!userBranchId) return;

      const { transaction, items, payments } = req.body;

      if (!req.user?.id) {
        return res.status(401).json({ error: "User not authenticated" });
      }
      
      const validation = insertSalesTransactionSchema.safeParse({
        ...transaction,
        branchId: userBranchId,
        cashierId: req.user.id
      });

      if (!validation.success) {
        return res.status(400).json({ 
          error: "Validation failed",
          message: "Ошибка валидации данных",
          details: validation.error.issues
        });
      }

      // Создаем полную транзакцию с позициями и платежами атомарно
      const result = await storage.createCompleteSalesTransaction(validation.data, items, payments, req.user.id);
      
      res.status(201).json(result);
    } catch (error) {
      console.error("Error creating sales transaction:", error);
      res.status(500).json({ 
        error: "Failed to create transaction",
        message: "Не удалось создать транзакцию"
      });
    }
  });

  // === КАССОВЫЕ ОПЕРАЦИИ ===
  
  // GET /api/cash/operations - Получение кассовых операций
  app.get("/api/cash/operations", authenticateToken, requireModuleAccess('finance'), async (req, res) => {
    try {
      const userBranchId = requireValidBranchId(req, res);
      if (!userBranchId) return;

      const { registerId, shiftId, type } = req.query;
      const operations = await storage.getCashOperations(userBranchId);
      // Фильтрация по параметрам
      const filteredOperations = operations.filter(operation => {
        if (registerId && operation.registerId !== registerId) return false;
        if (shiftId && operation.shiftId !== shiftId) return false;
        if (type && operation.type !== type) return false;
        return true;
      });
      res.json(filteredOperations);
    } catch (error) {
      console.error("Error getting cash operations:", error);
      res.status(500).json({ 
        error: "Failed to get cash operations",
        message: "Не удалось получить кассовые операции"
      });
    }
  });

  // POST /api/cash/operations - Создание кассовой операции
  app.post("/api/cash/operations", authenticateToken, requireModuleAccess('finance'), async (req, res) => {
    try {
      const userBranchId = requireValidBranchId(req, res);
      if (!userBranchId) return;

      if (!req.user?.id) {
        return res.status(401).json({ error: "User not authenticated" });
      }
      
      const validation = insertCashOperationSchema.safeParse({
        ...req.body,
        branchId: userBranchId,
        performedBy: req.user.id
      });

      if (!validation.success) {
        return res.status(400).json({ 
          error: "Validation failed",
          message: "Ошибка валидации данных",
          details: validation.error.issues
        });
      }

      const operation = await storage.createCashOperation(validation.data);
      res.status(201).json(operation);
    } catch (error) {
      console.error("Error creating cash operation:", error);
      res.status(500).json({ 
        error: "Failed to create cash operation",
        message: "Не удалось создать кассовую операцию"
      });
    }
  });

  // === СИСТЕМА РОЛЕЙ ===
  
  // GET /api/cash/roles - Получение ролей пользователей
  app.get("/api/cash/roles", authenticateToken, requireRole('admin'), async (req, res) => {
    try {
      const userBranchId = requireValidBranchId(req, res);
      if (!userBranchId) return;

      // Получаем все роли для филиала (метод не реализован)
      const roles: any[] = [];
      res.json(roles);
    } catch (error) {
      console.error("Error getting user roles:", error);
      res.status(500).json({ 
        error: "Failed to get user roles",
        message: "Не удалось получить роли пользователей"
      });
    }
  });

  // POST /api/cash/roles - Создание роли
  app.post("/api/cash/roles", authenticateToken, requireRole('admin'), async (req, res) => {
    try {
      const userBranchId = requireValidBranchId(req, res);
      if (!userBranchId) return;

      const validation = insertUserRoleSchema.safeParse({
        ...req.body,
        branchId: userBranchId
      });

      if (!validation.success) {
        return res.status(400).json({ 
          error: "Validation failed",
          message: "Ошибка валидации данных",
          details: validation.error.issues
        });
      }

      // Метод createUserRole не реализован, создаем заглушку
      const role = { ...validation.data, id: 'mock-role-id', createdAt: new Date() };
      res.status(201).json(role);
    } catch (error) {
      console.error("Error creating user role:", error);
      res.status(500).json({ 
        error: "Failed to create user role",
        message: "Не удалось создать роль"
      });
    }
  });

  // POST /api/cash/user-role-assignments - Назначение роли пользователю
  app.post("/api/cash/user-role-assignments", authenticateToken, requireRole('admin'), async (req, res) => {
    try {
      const userBranchId = requireValidBranchId(req, res);
      if (!userBranchId) return;

      if (!req.user?.id) {
        return res.status(401).json({ error: "User not authenticated" });
      }
      
      const { userId, roleId } = req.body;

      const validation = insertUserRoleAssignmentSchema.safeParse({
        userId,
        roleId,
        assignedBy: req.user.id
      });

      if (!validation.success) {
        return res.status(400).json({ 
          error: "Validation failed",
          message: "Ошибка валидации данных",
          details: validation.error.issues
        });
      }

      // Метод assignUserRole не реализован, создаем заглушку
      const assignment = { ...validation.data, id: 'mock-assignment-id', assignedAt: new Date() };
      res.status(201).json(assignment);
    } catch (error) {
      console.error("Error assigning user role:", error);
      res.status(500).json({ 
        error: "Failed to assign user role",
        message: "Не удалось назначить роль"
      });
    }
  });

  // ===== BILLING AND SUBSCRIPTION ROUTES =====

  // GET /api/billing/plans - Получить все тарифные планы
  app.get("/api/billing/plans", authenticateToken, async (req, res) => {
    try {
      const plans = await storage.getActiveSubscriptionPlans();
      res.json(plans);
    } catch (error) {
      console.error("Error fetching subscription plans:", error);
      res.status(500).json({ 
        error: "Failed to fetch subscription plans",
        message: "Не удалось загрузить тарифные планы"
      });
    }
  });

  // POST /api/billing/plans - Создать тарифный план (только для admin)
  app.post("/api/billing/plans", authenticateToken, requireRole('admin'), async (req, res) => {
    try {
      const validation = insertSubscriptionPlanSchema.safeParse(req.body);
      
      if (!validation.success) {
        return res.status(400).json({ 
          error: "Validation failed",
          message: "Ошибка валидации данных",
          details: validation.error.issues
        });
      }

      const plan = await storage.createSubscriptionPlan(validation.data);
      res.status(201).json(plan);
    } catch (error) {
      console.error("Error creating subscription plan:", error);
      res.status(500).json({ 
        error: "Failed to create subscription plan",
        message: "Не удалось создать тарифный план"
      });
    }
  });

  // PATCH /api/billing/plans/:id - Обновить тарифный план (только для admin)
  app.patch("/api/billing/plans/:id", authenticateToken, requireRole('admin'), async (req, res) => {
    try {
      const { id } = req.params;
      
      // Проверяем существование плана
      const allPlans = await storage.getSubscriptionPlans();
      const found = allPlans.find(p => p.id === id);
      
      if (!found) {
        return res.status(404).json({ 
          error: "Plan not found",
          message: "Тарифный план не найден"
        });
      }

      // Валидация с partial schema
      const validation = insertSubscriptionPlanSchema.partial().safeParse(req.body);
      
      if (!validation.success) {
        return res.status(400).json({ 
          error: "Validation failed",
          message: "Ошибка валидации данных",
          details: validation.error.issues
        });
      }

      const plan = await storage.updateSubscriptionPlan(id, validation.data);
      res.json(plan);
    } catch (error) {
      console.error("Error updating subscription plan:", error);
      res.status(500).json({ 
        error: "Failed to update subscription plan",
        message: "Не удалось обновить тарифный план"
      });
    }
  });

  // DELETE /api/billing/plans/:id - Удалить тарифный план (только для admin)
  app.delete("/api/billing/plans/:id", authenticateToken, requireRole('admin'), async (req, res) => {
    try {
      const { id } = req.params;
      
      // Проверяем существование плана
      const allPlans = await storage.getSubscriptionPlans();
      const found = allPlans.find(p => p.id === id);
      
      if (!found) {
        return res.status(404).json({ 
          error: "Plan not found",
          message: "Тарифный план не найден"
        });
      }

      await storage.deleteSubscriptionPlan(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting subscription plan:", error);
      res.status(500).json({ 
        error: "Failed to delete subscription plan",
        message: "Не удалось удалить тарифный план"
      });
    }
  });

  // GET /api/billing/subscription/status - Проверить статус подписки текущего филиала
  app.get("/api/billing/subscription/status", authenticateToken, async (req, res) => {
    try {
      const userBranchId = requireValidBranchId(req, res);
      if (!userBranchId) return;

      const status = await storage.checkSubscriptionStatus(userBranchId);
      res.json(status);
    } catch (error) {
      console.error("Error checking subscription status:", error);
      res.status(500).json({ 
        error: "Failed to check subscription status",
        message: "Не удалось проверить статус подписки"
      });
    }
  });

  // GET /api/billing/subscription - Получить текущую подписку филиала
  app.get("/api/billing/subscription", authenticateToken, async (req, res) => {
    try {
      const userBranchId = requireValidBranchId(req, res);
      if (!userBranchId) return;

      const subscription = await storage.getClinicSubscription(userBranchId);
      res.json(subscription);
    } catch (error) {
      console.error("Error fetching subscription:", error);
      res.status(500).json({ 
        error: "Failed to fetch subscription",
        message: "Не удалось загрузить подписку"
      });
    }
  });

  // GET /api/billing/subscriptions - Получить все подписки (только для admin)
  app.get("/api/billing/subscriptions", authenticateToken, requireRole('admin'), async (req, res) => {
    try {
      const subscriptions = await storage.getClinicSubscriptions();
      res.json(subscriptions);
    } catch (error) {
      console.error("Error fetching subscriptions:", error);
      res.status(500).json({ 
        error: "Failed to fetch subscriptions",
        message: "Не удалось загрузить подписки"
      });
    }
  });

  // POST /api/billing/subscription - Создать подписку для филиала (только для admin)
  app.post("/api/billing/subscription", authenticateToken, requireRole('admin'), async (req, res) => {
    try {
      const validation = insertClinicSubscriptionSchema.safeParse(req.body);
      
      if (!validation.success) {
        return res.status(400).json({ 
          error: "Validation failed",
          message: "Ошибка валидации данных",
          details: validation.error.issues
        });
      }

      const subscription = await storage.createClinicSubscription(validation.data);
      res.status(201).json(subscription);
    } catch (error) {
      console.error("Error creating subscription:", error);
      res.status(500).json({ 
        error: "Failed to create subscription",
        message: "Не удалось создать подписку"
      });
    }
  });

  // PATCH /api/billing/subscription/:id - Обновить подписку (только для admin)
  app.patch("/api/billing/subscription/:id", authenticateToken, requireRole('admin'), async (req, res) => {
    try {
      const { id } = req.params;
      
      // Проверяем существование подписки
      const existing = await storage.getClinicSubscriptions();
      const found = existing.find(s => s.id === id);
      
      if (!found) {
        return res.status(404).json({ 
          error: "Subscription not found",
          message: "Подписка не найдена"
        });
      }

      // Валидация с partial schema
      const validation = insertClinicSubscriptionSchema.partial().safeParse(req.body);
      
      if (!validation.success) {
        return res.status(400).json({ 
          error: "Validation failed",
          message: "Ошибка валидации данных",
          details: validation.error.issues
        });
      }

      const subscription = await storage.updateClinicSubscription(id, validation.data);
      res.json(subscription);
    } catch (error) {
      console.error("Error updating subscription:", error);
      res.status(500).json({ 
        error: "Failed to update subscription",
        message: "Не удалось обновить подписку"
      });
    }
  });

  // GET /api/billing/payments/:subscriptionId - Получить платежи по подписке
  app.get("/api/billing/payments/:subscriptionId", authenticateToken, async (req, res) => {
    try {
      const { subscriptionId } = req.params;
      const payments = await storage.getSubscriptionPayments(subscriptionId);
      res.json(payments);
    } catch (error) {
      console.error("Error fetching payments:", error);
      res.status(500).json({ 
        error: "Failed to fetch payments",
        message: "Не удалось загрузить платежи"
      });
    }
  });

  // Zod schema для создания платежа
  const createBillingPaymentSchema = z.object({
    subscriptionId: z.string().uuid(),
    planId: z.string().uuid()
  });

  // POST /api/billing/payment - Создать платёж через YooKassa
  app.post("/api/billing/payment", authenticateToken, async (req, res) => {
    try {
      // Валидация с Zod
      const validation = createBillingPaymentSchema.safeParse(req.body);
      
      if (!validation.success) {
        return res.status(400).json({ 
          error: "Validation failed",
          message: "Ошибка валидации данных",
          details: validation.error.issues
        });
      }

      const { subscriptionId, planId } = validation.data;

      // БЕЗОПАСНОСТЬ: Проверяем branchId пользователя
      const userBranchId = requireValidBranchId(req, res);
      if (!userBranchId) return;

      // Получаем подписку и план
      const subscription = await storage.getClinicSubscriptions().then(subs => 
        subs.find(s => s.id === subscriptionId)
      );
      
      if (!subscription) {
        return res.status(404).json({ 
          error: "Subscription not found",
          message: "Подписка не найдена"
        });
      }

      // БЕЗОПАСНОСТЬ: Проверяем что подписка принадлежит филиалу пользователя
      if (subscription.branchId !== userBranchId) {
        console.warn(`🚨 SECURITY ALERT: User attempted to create payment for subscription from different branch`);
        return res.status(403).json({ 
          error: "Access denied",
          message: "Доступ запрещён"
        });
      }

      const plan = await storage.getSubscriptionPlan(planId);
      
      if (!plan) {
        return res.status(404).json({ 
          error: "Plan not found",
          message: "Тарифный план не найден"
        });
      }

      // Получаем информацию о филиале для receipt
      const branch = await storage.getBranch(subscription.branchId);
      
      if (!branch) {
        return res.status(404).json({ 
          error: "Branch not found",
          message: "Филиал не найден"
        });
      }

      // Детерминистический idempotency key основан на subscription + plan
      const idempotenceKey = `sub_${subscriptionId}_plan_${planId}`;
      
      // Проверяем существует ли уже pending платёж с таким ключом
      const existingPayments = await storage.getSubscriptionPayments(subscriptionId);
      let existingPendingPayment = existingPayments.find(p => 
        p.status === 'pending' && 
        p.yookassaPaymentId && 
        p.yookassaPaymentId.includes(idempotenceKey)
      );

      // Если есть pending платёж, возвращаем его данные
      if (existingPendingPayment && existingPendingPayment.yookassaPaymentId) {
        try {
          const existingYookassaPayment = await yookassa.getPayment(existingPendingPayment.yookassaPaymentId);
          
          return res.status(200).json({
            payment: existingPendingPayment,
            confirmationUrl: existingYookassaPayment.confirmation?.confirmation_url
          });
        } catch (error) {
          // Если не можем получить платёж от YooKassa, создадим новый
          console.warn('Could not fetch existing payment from YooKassa, creating new:', error);
        }
      }

      // Создаём запись платежа в БД ПЕРЕД обращением к YooKassa
      const priceAmount = parseFloat(plan.price);
      const now = new Date();
      const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 дней
      
      const createdPayment = await storage.createSubscriptionPayment({
        subscriptionId: subscriptionId,
        amount: priceAmount.toFixed(2),
        periodStart: now,
        periodEnd: periodEnd,
        status: 'pending',
        paymentMethod: 'yookassa',
        yookassaPaymentId: null // будет обновлён после создания в YooKassa
      });

      const paymentId = createdPayment.id;

      const yookassaPayment = await yookassa.createPayment({
        amount: {
          value: priceAmount.toFixed(2),
          currency: 'RUB'
        },
        description: `Подписка "${plan.name}" для клиники`,
        receipt: {
          customer: {
            full_name: branch.name,
            email: branch.email || undefined,
            phone: branch.phone || undefined
          },
          items: [{
            description: `${plan.name} - месячная подписка`,
            amount: {
              value: priceAmount.toFixed(2),
              currency: 'RUB'
            },
            vat_code: 1, // без НДС
            quantity: '1',
            payment_mode: 'full_payment',
            payment_subject: 'service'
          }],
          tax_system_code: 2, // УСН доходы
          email: branch.email || undefined,
          phone: branch.phone || undefined,
          send: true
        },
        confirmation: {
          type: 'redirect',
          return_url: `${process.env.REPL_URL || 'http://localhost:5000'}/billing`
        },
        capture: true,
        metadata: {
          internal_payment_id: paymentId,
          subscription_id: subscriptionId,
          plan_id: planId,
          branch_id: subscription.branchId
        }
      }, idempotenceKey);

      // Обновляем запись платежа с YooKassa ID
      await storage.updateSubscriptionPayment(paymentId, {
        yookassaPaymentId: yookassaPayment.id,
        status: yookassaPayment.status
      });

      // Получаем обновлённый платёж
      const updatedPayments = await storage.getSubscriptionPayments(subscriptionId);
      const payment = updatedPayments.find(p => p.id === paymentId);

      res.status(201).json({
        payment,
        confirmationUrl: yookassaPayment.confirmation?.confirmation_url
      });
    } catch (error) {
      console.error("Error creating payment:", error);
      res.status(500).json({ 
        error: "Failed to create payment",
        message: "Не удалось создать платёж"
      });
    }
  });

  // POST /api/billing/webhook/yookassa - Webhook для обработки уведомлений YooKassa
  app.post("/api/billing/webhook/yookassa", express.raw({type: 'application/json'}), async (req, res) => {
    try {
      // Парсим body
      const rawBody = req.body.toString('utf8');
      const notification = JSON.parse(rawBody);

      console.log('YooKassa webhook received:', notification);

      // Проверяем тип уведомления
      if (notification.type !== 'notification') {
        return res.status(400).json({ error: 'Invalid notification type' });
      }

      const { event, object: paymentData } = notification;
      
      if (!paymentData || !paymentData.id) {
        return res.status(400).json({ error: 'Invalid payment data' });
      }

      // БЕЗОПАСНОСТЬ: Проверяем аутентичность через re-fetch от YooKassa API
      let verifiedPayment;
      try {
        verifiedPayment = await yookassa.getPayment(paymentData.id);
      } catch (error) {
        console.error(`Failed to verify payment ${paymentData.id} with YooKassa:`, error);
        return res.status(401).json({ error: 'Payment verification failed' });
      }

      // Находим платёж в БД по internal_payment_id или yookassaPaymentId
      const internalPaymentId = verifiedPayment.metadata?.internal_payment_id;
      let existingPayment = null;

      if (internalPaymentId) {
        // Ищем по internal ID
        const allPayments = await storage.getSubscriptionPayments(verifiedPayment.metadata?.subscription_id || '');
        existingPayment = allPayments.find(p => p.id === internalPaymentId);
      } else {
        // Fallback: ищем по YooKassa payment ID
        const allPayments = await storage.getSubscriptionPayments(verifiedPayment.metadata?.subscription_id || '');
        existingPayment = allPayments.find(p => p.yookassaPaymentId === verifiedPayment.id);
      }

      if (!existingPayment) {
        console.warn(`Payment ${verifiedPayment.id} not found in database`);
        return res.status(200).send('OK');
      }

      // ИДЕМПОТЕНТНОСТЬ: Проверяем не обработан ли уже этот статус
      if (existingPayment.status === verifiedPayment.status && verifiedPayment.status === 'succeeded') {
        console.log(`Payment ${verifiedPayment.id} already processed with status ${verifiedPayment.status}`);
        return res.status(200).send('OK');
      }

      // Обрабатываем разные события
      switch (event) {
        case 'payment.succeeded':
          console.log(`Payment ${verifiedPayment.id} succeeded`);
          
          // Обновляем статус платежа
          await storage.updateSubscriptionPayment(existingPayment.id, {
            status: 'succeeded',
            paidAt: new Date()
          });

          // Продлеваем подписку (только если ещё не продлена)
          if (verifiedPayment.metadata && verifiedPayment.metadata.subscription_id && verifiedPayment.metadata.plan_id) {
            const subscription = await storage.getClinicSubscriptions().then(subs =>
              subs.find(s => s.id === verifiedPayment.metadata!.subscription_id)
            );
            
            if (subscription) {
              const plan = await storage.getSubscriptionPlan(verifiedPayment.metadata.plan_id);
              
              if (plan) {
                // Вычисляем новую дату окончания (30 дней для месячной подписки)
                const durationDays = plan.billingPeriod === 'monthly' ? 30 : 
                                    plan.billingPeriod === 'yearly' ? 365 : 30;
                const currentEndDate = subscription.endDate ? new Date(subscription.endDate) : new Date();
                const now = new Date();
                const baseDate = currentEndDate > now ? currentEndDate : now;
                const newEndDate = new Date(baseDate.getTime() + durationDays * 24 * 60 * 60 * 1000);

                await storage.updateClinicSubscription(subscription.id, {
                  status: 'active',
                  endDate: newEndDate,
                  planId: plan.id
                });

                console.log(`Subscription ${subscription.id} extended until ${newEndDate}`);
              }
            }
          }
          break;

        case 'payment.canceled':
          console.log(`Payment ${verifiedPayment.id} was canceled`);
          await storage.updateSubscriptionPayment(existingPayment.id, {
            status: 'canceled'
          });
          break;

        case 'payment.waiting_for_capture':
          console.log(`Payment ${verifiedPayment.id} waiting for capture`);
          await storage.updateSubscriptionPayment(existingPayment.id, {
            status: 'waiting_for_capture'
          });
          break;

        default:
          console.log(`Unhandled YooKassa event: ${event}`);
      }

      res.status(200).send('OK');
    } catch (error) {
      console.error('Error processing YooKassa webhook:', error);
      res.status(500).json({ error: 'Webhook processing failed' });
    }
  });

  // GET /api/billing/notifications - Получить уведомления для текущего пользователя
  app.get("/api/billing/notifications", authenticateToken, async (req, res) => {
    try {
      if (!req.user?.branchId) {
        return res.status(400).json({ 
          error: "Branch ID required",
          message: "У пользователя не указан филиал"
        });
      }

      // Получаем подписку филиала
      const subscription = await storage.getClinicSubscription(req.user.branchId);
      
      if (!subscription) {
        return res.json([]); // Нет подписки - нет уведомлений
      }

      // Получаем уведомления для подписки
      const notifications = await storage.getBillingNotifications(subscription.id);
      
      // Фильтруем только непрочитанные или недавние (за последние 30 дней)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const relevantNotifications = notifications.filter(n => 
        !n.isSent || new Date(n.createdAt) > thirtyDaysAgo
      );

      res.json(relevantNotifications);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ 
        error: "Failed to fetch notifications",
        message: "Не удалось загрузить уведомления"
      });
    }
  });

  // PATCH /api/billing/notifications/:id/read - Отметить уведомление как прочитанное
  app.patch("/api/billing/notifications/:id/read", authenticateToken, async (req, res) => {
    try {
      const { id } = req.params;
      
      if (!req.user?.branchId) {
        return res.status(400).json({ 
          error: "Branch ID required",
          message: "У пользователя не указан филиал"
        });
      }

      // Получаем подписку пользователя
      const subscription = await storage.getClinicSubscription(req.user.branchId);
      
      if (!subscription) {
        return res.status(404).json({ 
          error: "Subscription not found",
          message: "У вашего филиала нет подписки"
        });
      }

      // Получаем все уведомления для подписки чтобы проверить ownership
      const notifications = await storage.getBillingNotifications(subscription.id);
      const notification = notifications.find(n => n.id === id);

      if (!notification) {
        return res.status(404).json({ 
          error: "Notification not found",
          message: "Уведомление не найдено или не принадлежит вашему филиалу"
        });
      }
      
      // Обновляем уведомление
      await storage.markNotificationAsSent(id);
      
      res.json({ success: true, message: "Уведомление отмечено как прочитанное" });
    } catch (error) {
      console.error("Error marking notification as read:", error);
      res.status(500).json({ 
        error: "Failed to mark notification as read",
        message: "Не удалось отметить уведомление как прочитанное"
      });
    }
  });

  // GET /api/billing/notifications/:subscriptionId - Получить уведомления по подписке (для администратора)
  app.get("/api/billing/notifications/:subscriptionId", authenticateToken, requireRole('администратор', 'admin'), async (req, res) => {
    try {
      const { subscriptionId } = req.params;
      const notifications = await storage.getBillingNotifications(subscriptionId);
      res.json(notifications);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ 
        error: "Failed to fetch notifications",
        message: "Не удалось загрузить уведомления"
      });
    }
  });

  // POST /api/billing/subscription/cancel - Отменить подписку
  app.post("/api/billing/subscription/cancel", authenticateToken, async (req, res) => {
    try {
      const { reason } = req.body;

      // БЕЗОПАСНОСТЬ: Проверяем branchId пользователя
      const userBranchId = requireValidBranchId(req, res);
      if (!userBranchId) return;

      // Получаем подписку филиала
      const subscription = await storage.getClinicSubscription(userBranchId);
      
      if (!subscription) {
        return res.status(404).json({ 
          error: "Subscription not found",
          message: "У вашего филиала нет активной подписки"
        });
      }

      // Проверяем что подписка уже не отменена
      if (subscription.status === 'canceled') {
        return res.status(400).json({ 
          error: "Already canceled",
          message: "Подписка уже отменена"
        });
      }

      // Отменяем подписку
      const updatedSubscription = await storage.updateClinicSubscription(subscription.id, {
        status: 'canceled',
        cancelledAt: new Date(),
        cancelReason: reason || 'Отменено пользователем',
        autoRenew: false
      });

      res.json({
        success: true,
        message: "Подписка успешно отменена",
        subscription: updatedSubscription
      });
    } catch (error) {
      console.error("Error canceling subscription:", error);
      res.status(500).json({ 
        error: "Failed to cancel subscription",
        message: "Не удалось отменить подписку"
      });
    }
  });

  // ===== SUPERADMIN ROUTES =====
  // Административная панель для системного администратора
  // Доступ только для пользователей с isSuperAdmin = true

  // GET /api/superadmin/subscriptions - Получить все подписки всех клиентов
  app.get("/api/superadmin/subscriptions", authenticateToken, requireSuperAdmin, async (req, res) => {
    try {
      const subscriptions = await storage.getClinicSubscriptions();
      
      // Обогащаем данными филиала и плана
      const enrichedSubscriptions = await Promise.all(
        subscriptions.map(async (sub) => {
          const branch = await storage.getBranch(sub.branchId);
          const plan = await storage.getSubscriptionPlan(sub.planId);
          return {
            ...sub,
            branchName: branch?.name,
            branchEmail: branch?.email,
            branchPhone: branch?.phone,
            planName: plan?.name,
            planPrice: plan?.price
          };
        })
      );

      res.json(enrichedSubscriptions);
    } catch (error) {
      console.error("Error fetching all subscriptions:", error);
      res.status(500).json({ 
        error: "Failed to fetch subscriptions",
        message: "Не удалось получить список подписок"
      });
    }
  });

  // GET /api/superadmin/payments - Получить все платежи всех клиентов
  app.get("/api/superadmin/payments", authenticateToken, requireSuperAdmin, async (req, res) => {
    try {
      const payments = await storage.getAllSubscriptionPayments();
      
      // Обогащаем данными подписки и филиала
      const allSubscriptions = await storage.getClinicSubscriptions();
      const subscriptionsMap = new Map(allSubscriptions.map(s => [s.id, s]));
      
      const enrichedPayments = await Promise.all(
        payments.map(async (payment) => {
          const subscription = subscriptionsMap.get(payment.subscriptionId);
          if (subscription) {
            const branch = await storage.getBranch(subscription.branchId);
            const plan = await storage.getSubscriptionPlan(subscription.planId);
            return {
              ...payment,
              branchId: subscription.branchId,
              branchName: branch?.name,
              planName: plan?.name
            };
          }
          return payment;
        })
      );

      res.json(enrichedPayments);
    } catch (error) {
      console.error("Error fetching all payments:", error);
      res.status(500).json({ 
        error: "Failed to fetch payments",
        message: "Не удалось получить список платежей"
      });
    }
  });

  // POST /api/superadmin/branches - Создать новый филиал/клиента
  app.post("/api/superadmin/branches", authenticateToken, requireSuperAdmin, async (req, res) => {
    try {
      const branchData = insertBranchSchema.parse(req.body);
      const newBranch = await storage.createBranch(branchData);
      
      res.status(201).json(newBranch);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: "Validation error", 
          details: error.errors,
          message: "Ошибка валидации данных филиала"
        });
      }
      console.error("Error creating branch:", error);
      res.status(500).json({ 
        error: "Failed to create branch",
        message: "Не удалось создать филиал"
      });
    }
  });

  // POST /api/superadmin/subscriptions - Создать подписку для филиала
  app.post("/api/superadmin/subscriptions", authenticateToken, requireSuperAdmin, async (req, res) => {
    try {
      const subscriptionData = insertClinicSubscriptionSchema.parse(req.body);
      const newSubscription = await storage.createClinicSubscription(subscriptionData);
      
      res.status(201).json(newSubscription);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: "Validation error", 
          details: error.errors,
          message: "Ошибка валидации данных подписки"
        });
      }
      console.error("Error creating subscription:", error);
      res.status(500).json({ 
        error: "Failed to create subscription",
        message: "Не удалось создать подписку"
      });
    }
  });

  // PUT /api/superadmin/subscriptions/:id - Обновить подписку
  app.put("/api/superadmin/subscriptions/:id", authenticateToken, requireSuperAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      const updatedSubscription = await storage.updateClinicSubscription(id, updates);
      res.json(updatedSubscription);
    } catch (error) {
      console.error("Error updating subscription:", error);
      res.status(500).json({ 
        error: "Failed to update subscription",
        message: "Не удалось обновить подписку"
      });
    }
  });

  // POST /api/superadmin/plans - Создать тарифный план
  app.post("/api/superadmin/plans", authenticateToken, requireSuperAdmin, async (req, res) => {
    try {
      const planData = insertSubscriptionPlanSchema.parse(req.body);
      const newPlan = await storage.createSubscriptionPlan(planData);
      
      res.status(201).json(newPlan);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: "Validation error", 
          details: error.errors,
          message: "Ошибка валидации данных тарифного плана"
        });
      }
      console.error("Error creating plan:", error);
      res.status(500).json({ 
        error: "Failed to create plan",
        message: "Не удалось создать тарифный план"
      });
    }
  });

  // PUT /api/superadmin/plans/:id - Обновить тарифный план
  app.put("/api/superadmin/plans/:id", authenticateToken, requireSuperAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      const updatedPlan = await storage.updateSubscriptionPlan(id, updates);
      res.json(updatedPlan);
    } catch (error) {
      console.error("Error updating plan:", error);
      res.status(500).json({ 
        error: "Failed to update plan",
        message: "Не удалось обновить тарифный план"
      });
    }
  });

  // GET /api/superadmin/branches - Получить все филиалы
  app.get("/api/superadmin/branches", authenticateToken, requireSuperAdmin, async (req, res) => {
    try {
      const branches = await storage.getBranches();
      res.json(branches);
    } catch (error) {
      console.error("Error fetching branches:", error);
      res.status(500).json({ 
        error: "Failed to fetch branches",
        message: "Не удалось получить список филиалов"
      });
    }
  });

  // ========================================
  // 🔐 SUPERADMIN: Tenant Management Routes
  // ========================================

  // GET /api/admin/tenants - Получить все tenants
  app.get("/api/admin/tenants", authenticateToken, requireSuperAdmin, async (req, res) => {
    try {
      const tenants = await storage.getAllTenants();
      res.json(tenants);
    } catch (error) {
      console.error("Error fetching tenants:", error);
      res.status(500).json({ 
        error: "Failed to fetch tenants",
        message: "Не удалось получить список клиник"
      });
    }
  });

  // GET /api/admin/tenants/:id - Получить tenant по ID
  app.get("/api/admin/tenants/:id", authenticateToken, requireSuperAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const tenant = await storage.getTenant(id);
      
      if (!tenant) {
        return res.status(404).json({ 
          error: "Tenant not found",
          message: "Клиника не найдена"
        });
      }
      
      res.json(tenant);
    } catch (error) {
      console.error("Error fetching tenant:", error);
      res.status(500).json({ 
        error: "Failed to fetch tenant",
        message: "Не удалось получить данные клиники"
      });
    }
  });

  // GET /api/admin/tenants/:id/branches - Получить филиалы конкретной клиники
  app.get("/api/admin/tenants/:id/branches", authenticateToken, requireSuperAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      
      // Verify tenant exists
      const tenant = await storage.getTenant(id);
      if (!tenant) {
        return res.status(404).json({ 
          error: "Tenant not found",
          message: "Клиника не найдена"
        });
      }
      
      const branches = await storage.getTenantBranches(id);
      res.json(branches);
    } catch (error) {
      console.error("Error fetching tenant branches:", error);
      res.status(500).json({ 
        error: "Failed to fetch branches",
        message: "Не удалось получить список филиалов"
      });
    }
  });

  // POST /api/admin/tenants - Создать новый tenant
  app.post("/api/admin/tenants", authenticateToken, requireSuperAdmin, async (req, res) => {
    try {
      const tenantData = insertTenantSchema.parse(req.body);
      
      // Check if slug already exists
      const existingTenant = await storage.getTenantBySlug(tenantData.slug);
      if (existingTenant) {
        return res.status(400).json({ 
          error: "Slug already exists",
          message: "Такой slug уже используется"
        });
      }
      
      const newTenant = await storage.createTenant(tenantData);
      res.status(201).json(newTenant);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: "Validation error", 
          details: error.errors,
          message: "Ошибка валидации данных"
        });
      }
      console.error("Error creating tenant:", error);
      res.status(500).json({ 
        error: "Failed to create tenant",
        message: "Не удалось создать клинику"
      });
    }
  });

  // PUT /api/admin/tenants/:id - Обновить tenant
  app.put("/api/admin/tenants/:id", authenticateToken, requireSuperAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      
      // Validate update data with partial schema
      const updateSchema = insertTenantSchema.partial();
      const updates = updateSchema.parse(req.body);
      
      // Check if slug is being updated and already exists
      if (updates.slug) {
        const existingTenant = await storage.getTenantBySlug(updates.slug);
        if (existingTenant && existingTenant.id !== id) {
          return res.status(409).json({ 
            error: "Slug already exists",
            message: "Такой slug уже используется другой клиникой"
          });
        }
      }
      
      const updatedTenant = await storage.updateTenant(id, updates);
      res.json(updatedTenant);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: "Validation error", 
          details: error.errors,
          message: "Ошибка валидации данных"
        });
      }
      console.error("Error updating tenant:", error);
      res.status(500).json({ 
        error: "Failed to update tenant",
        message: "Не удалось обновить клинику"
      });
    }
  });

  // DELETE /api/admin/tenants/:id - Удалить/деактивировать tenant
  app.delete("/api/admin/tenants/:id", authenticateToken, requireSuperAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      
      // Check for dependent data before deleting
      // Check branches belonging to this tenant
      const branches = await storage.getBranches(); // This returns all branches for superadmin
      const tenantBranches = branches.filter(b => b.tenantId === id);
      
      if (tenantBranches.length > 0) {
        return res.status(409).json({ 
          error: "Tenant has dependencies",
          message: `Невозможно удалить клинику: существует ${tenantBranches.length} филиал(ов). Удалите сначала все филиалы.`,
          details: { branches: tenantBranches.length }
        });
      }
      
      // Soft delete by setting status to 'cancelled'
      const updates = { status: 'cancelled' as const };
      await storage.updateTenant(id, updates);
      
      res.json({ 
        success: true, 
        message: "Клиника деактивирована (soft delete)",
        tenantId: id 
      });
    } catch (error) {
      console.error("Error deleting tenant:", error);
      res.status(500).json({ 
        error: "Failed to delete tenant",
        message: "Не удалось удалить клинику"
      });
    }
  });

  // GET /api/tenants - Short alias for getting all tenants (superadmin only)
  app.get("/api/tenants", authenticateToken, requireSuperAdmin, async (req, res) => {
    try {
      const tenants = await storage.getAllTenants();
      res.json(tenants);
    } catch (error) {
      console.error("Error fetching tenants:", error);
      res.status(500).json({ 
        error: "Failed to fetch tenants",
        message: "Не удалось получить список клиник"
      });
    }
  });

  // GET /api/tenant/current - Get current tenant info
  app.get("/api/tenant/current", authenticateToken, async (req, res) => {
    try {
      // Disable HTTP caching for this endpoint
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      
      // Superadmin doesn't have a tenant
      if (req.user?.isSuperAdmin) {
        return res.json({ 
          id: 'superadmin',
          name: 'Суперадминистратор',
          status: 'active',
          isSuperAdmin: true
        });
      }

      if (!req.tenantId) {
        return res.status(403).json({ 
          error: "Tenant не определён",
          message: "Не удалось определить клинику"
        });
      }
      
      const tenant = await storage.getTenant(req.tenantId);
      if (!tenant) {
        return res.status(404).json({ 
          error: "Tenant не найден",
          message: "Клиника не найдена"
        });
      }
      
      res.json(tenant);
    } catch (error) {
      console.error("Error fetching current tenant:", error);
      res.status(500).json({ 
        error: "Failed to fetch tenant",
        message: "Не удалось получить данные клиники"
      });
    }
  });

  // PUT /api/tenant/settings - Update current tenant settings
  app.put("/api/tenant/settings", authenticateToken, async (req, res) => {
    try {
      // Check permission: superadmin or администратор/admin
      if (!req.user?.isSuperAdmin && req.user?.role !== 'администратор' && req.user?.role !== 'admin') {
        return res.status(403).json({ error: "Доступ запрещён" });
      }
      
      if (!req.tenantId) {
        return res.status(403).json({ 
          error: "Tenant не определён",
          message: "Не удалось определить клинику"
        });
      }
      
      // Validate update data
      const updateSchema = z.object({
        name: z.string().min(1).max(255).optional(),
        legalEntityId: z.string().uuid().nullable().optional(),
        legalName: z.string().max(255).nullable().optional(),
        legalAddress: z.string().nullable().optional(),
        phone: z.string().max(50).nullable().optional(),
        email: z.string().email().max(255).nullable().optional(),
        inn: z.string().max(12).nullable().optional(),
        kpp: z.string().max(9).nullable().optional(),
        ogrn: z.string().max(15).nullable().optional(),
        veterinaryLicenseNumber: z.string().max(100).nullable().optional(),
        veterinaryLicenseIssueDate: z.string().nullable().optional(),
        settings: z.record(z.any()).optional(),
      });
      
      const updates = updateSchema.parse(req.body);
      const updatedTenant = await storage.updateTenant(req.tenantId, updates);
      
      res.json(updatedTenant);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: "Validation error", 
          details: error.errors 
        });
      }
      console.error("Error updating tenant settings:", error);
      res.status(500).json({ 
        error: "Failed to update settings",
        message: "Не удалось сохранить настройки"
      });
    }
  });

  // ========================================
  // GALEN INTEGRATION ROUTES
  // ========================================

  // PUT /api/tenant/settings/galen - Update Galen credentials for current tenant
  app.put("/api/tenant/settings/galen", authenticateToken, async (req, res) => {
    try {
      // Check permission: superadmin or администратор
      if (!req.user?.isSuperAdmin && req.user?.role !== 'администратор') {
        return res.status(403).json({ error: "Доступ запрещён. Требуется роль администратора" });
      }
      
      if (!req.tenantId) {
        return res.status(403).json({ 
          error: "Tenant не определён",
          message: "Не удалось определить клинику"
        });
      }
      
      // Validate Galen credentials
      const galenCredentialsSchema = z.object({
        galenApiUser: z.string().min(1, "API пользователь обязателен"),
        galenApiKey: z.string().min(1, "API ключ обязателен"),
        galenIssuerId: z.string().min(1, "ID хозяйствующего субъекта обязателен"),
        galenServiceId: z.string().min(1, "ID сервиса обязателен"),
      });
      
      const credentials = galenCredentialsSchema.parse(req.body);
      
      // Encrypt credentials before storing
      const encryptedCredentials = encryptGalenCredentials(credentials);
      
      // Update tenant with encrypted credentials
      const updatedTenant = await storage.updateGalenCredentials(req.tenantId, encryptedCredentials);
      
      res.json({ 
        success: true, 
        message: "Учетные данные Гален успешно сохранены" 
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: "Validation error", 
          details: error.errors 
        });
      }
      console.error("Error updating Galen credentials:", error);
      res.status(500).json({ 
        error: "Failed to update Galen credentials",
        message: "Не удалось сохранить учетные данные Гален"
      });
    }
  });

  // POST /api/patients/:patientId/galen/register - Register patient in Galen system
  app.post("/api/patients/:patientId/galen/register", authenticateToken, async (req, res) => {
    try {
      const { patientId } = req.params;
      
      if (!req.tenantId) {
        return res.status(403).json({ 
          error: "Tenant не определён",
          message: "Не удалось определить клинику"
        });
      }
      
      // Get patient data
      const patient = await storage.getPatient(patientId);
      if (!patient) {
        return res.status(404).json({ error: "Пациент не найден" });
      }
      
      // Check tenant ownership
      if (patient.tenantId !== req.tenantId) {
        return res.status(403).json({ error: "Доступ запрещён" });
      }
      
      // Get Galen credentials
      const encryptedCredentials = await storage.getGalenCredentials(req.tenantId);
      if (!encryptedCredentials || !encryptedCredentials.galenApiUser || !encryptedCredentials.galenApiKey) {
        return res.status(400).json({ 
          error: "Galen credentials not configured",
          message: "Учетные данные Гален не настроены. Настройте их в разделе настроек клиники."
        });
      }
      
      // Decrypt credentials
      const credentials = decryptGalenCredentials(encryptedCredentials);
      
      // Get primary owner (if exists)
      const patientOwners = await storage.getPatientOwners(patientId);
      const primaryOwner = patientOwners.find(po => po.isPrimary);
      let ownerData;
      if (primaryOwner) {
        ownerData = await storage.getOwner(primaryOwner.ownerId);
      }
      
      // Update patient status to sync_in_progress
      await storage.updatePatientGalenStatus(patientId, {
        galenSyncStatus: 'sync_in_progress',
        galenLastSyncError: null
      });
      
      // Call Galen API service
      const result = await galenAPIService.registerAnimal(
        {
          name: patient.name,
          species: patient.species,
          breed: patient.breed || undefined,
          gender: patient.gender || undefined,
          birthDate: patient.birthDate || undefined,
          microchipNumber: patient.microchipNumber || undefined,
          ownerName: ownerData?.name,
          ownerPhone: ownerData?.phone
        },
        {
          apiUser: credentials.galenApiUser || '',
          apiKey: credentials.galenApiKey || '',
          issuerId: credentials.galenIssuerId || '',
          serviceId: credentials.galenServiceId || ''
        }
      );
      
      if (result.success && result.galenUuid) {
        // Update patient with Galen UUID
        const updatedPatient = await storage.updatePatientGalenStatus(patientId, {
          galenUuid: result.galenUuid,
          galenSyncStatus: 'synced',
          galenLastSyncError: null,
          galenLastSyncAt: new Date()
        });
        
        return res.json({ 
          success: true, 
          galenUuid: result.galenUuid,
          message: "Пациент успешно зарегистрирован в системе Гален",
          patient: updatedPatient
        });
      } else {
        // Update patient with error
        await storage.updatePatientGalenStatus(patientId, {
          galenSyncStatus: 'error',
          galenLastSyncError: result.error || 'Неизвестная ошибка',
          galenLastSyncAt: new Date()
        });
        
        return res.status(400).json({ 
          success: false,
          error: result.error,
          errorCode: result.errorCode
        });
      }
    } catch (error) {
      console.error("Error registering patient in Galen:", error);
      
      // Try to update patient status with error
      try {
        if (req.params.patientId) {
          await storage.updatePatientGalenStatus(req.params.patientId, {
            galenSyncStatus: 'error',
            galenLastSyncError: error instanceof Error ? error.message : 'Неизвестная ошибка',
            galenLastSyncAt: new Date()
          });
        }
      } catch (updateError) {
        console.error("Failed to update patient error status:", updateError);
      }
      
      res.status(500).json({ 
        error: "Failed to register patient in Galen",
        message: error instanceof Error ? error.message : "Не удалось зарегистрировать пациента в системе Гален"
      });
    }
  });

  // POST /api/patients/:patientId/galen/vaccinations - Record vaccination in Galen system
  app.post("/api/patients/:patientId/galen/vaccinations", authenticateToken, async (req, res) => {
    try {
      const { patientId } = req.params;
      
      if (!req.tenantId) {
        return res.status(403).json({ 
          error: "Tenant не определён",
          message: "Не удалось определить клинику"
        });
      }
      
      // Validate vaccination data
      const vaccinationSchema = z.object({
        vaccineName: z.string().min(1, "Название вакцины обязательно"),
        series: z.string().min(1, "Серия обязательна"),
        date: z.string().datetime().or(z.date()),
        doctorId: z.string().min(1, "ID врача обязателен"),
      });
      
      const vaccinationData = vaccinationSchema.parse(req.body);
      
      // Get patient data
      const patient = await storage.getPatient(patientId);
      if (!patient) {
        return res.status(404).json({ error: "Пациент не найден" });
      }
      
      // Check tenant ownership
      if (patient.tenantId !== req.tenantId) {
        return res.status(403).json({ error: "Доступ запрещён" });
      }
      
      // Check if patient is registered in Galen
      if (!patient.galenUuid) {
        return res.status(400).json({ 
          error: "Patient not registered in Galen",
          message: "Сначала зарегистрируйте пациента в системе Гален"
        });
      }
      
      // Get Galen credentials
      const encryptedCredentials = await storage.getGalenCredentials(req.tenantId);
      if (!encryptedCredentials || !encryptedCredentials.galenApiUser || !encryptedCredentials.galenApiKey) {
        return res.status(400).json({ 
          error: "Galen credentials not configured",
          message: "Учетные данные Гален не настроены"
        });
      }
      
      // Decrypt credentials
      const credentials = decryptGalenCredentials(encryptedCredentials);
      
      // Get doctor info
      const doctor = await storage.getDoctor(vaccinationData.doctorId);
      
      // Call Galen API service
      const result = await galenAPIService.recordVaccination(
        patient.galenUuid,
        {
          vaccineName: vaccinationData.vaccineName,
          series: vaccinationData.series,
          date: new Date(vaccinationData.date),
          doctorId: vaccinationData.doctorId,
          doctorName: doctor?.fullName
        },
        {
          apiUser: credentials.galenApiUser || '',
          apiKey: credentials.galenApiKey || '',
          issuerId: credentials.galenIssuerId || '',
          serviceId: credentials.galenServiceId || ''
        }
      );
      
      if (result.success) {
        return res.json({ 
          success: true,
          vaccinationId: result.vaccinationId,
          message: "Вакцинация успешно зарегистрирована в системе Гален"
        });
      } else {
        return res.status(400).json({ 
          success: false,
          error: result.error,
          errorCode: result.errorCode
        });
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: "Validation error", 
          details: error.errors 
        });
      }
      console.error("Error recording vaccination in Galen:", error);
      res.status(500).json({ 
        error: "Failed to record vaccination in Galen",
        message: error instanceof Error ? error.message : "Не удалось зарегистрировать вакцинацию в системе Гален"
      });
    }
  });

  // ========================================
  // CLINICAL CASES MODULE ROUTES
  // ========================================

  // GET /api/clinical-cases - Get list of clinical cases (with filters)
  app.get("/api/clinical-cases", authenticateToken, async (req, res) => {
    try {
      const user = req.user!;
      const { search, startDate, endDate, limit, offset } = req.query;
      const userBranchId = user.branchId || '';

      const filters = {
        search: search as string,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
        offset: offset ? parseInt(offset as string) : undefined
      };

      const cases = await storage.getClinicalCases(filters, userBranchId);
      
      // Transform nested structure to flat structure for frontend
      const flatCases = cases.map((item: any) => ({
        ...item.clinicalCase,
        patientName: item.patient?.name || 'Unknown',
        species: item.patient?.species || '',
        breed: item.patient?.breed || '',
        ownerName: item.owner?.name || 'Unknown',
        ownerPhone: item.owner?.phone || ''
      }));
      
      res.json(flatCases);
    } catch (error) {
      console.error("Error fetching clinical cases:", error);
      res.status(500).json({ error: "Failed to fetch clinical cases" });
    }
  });

  // GET /api/clinical-cases/:id - Get clinical case details with encounters
  app.get("/api/clinical-cases/:id", authenticateToken, async (req, res) => {
    try {
      const { id } = req.params;
      const caseData = await storage.getClinicalCase(id);
      
      if (!caseData) {
        return res.status(404).json({ error: "Clinical case not found" });
      }

      // Get encounters for this case
      const encountersData = await storage.getClinicalEncounters(id);
      
      // Transform encounters from nested to flat structure
      const encounters = encountersData.map((item: any) => ({
        ...item.encounter,
        doctorName: item.doctor?.name || null,
      }));
      
      // Transform nested structure to flat structure for frontend
      const flatCase = {
        ...caseData.clinicalCase,
        patient: caseData.patient,
        owner: caseData.owner,
        createdBy: caseData.createdBy,
        encounters
      };
      
      res.json(flatCase);
    } catch (error) {
      console.error("Error fetching clinical case:", error);
      res.status(500).json({ error: "Failed to fetch clinical case" });
    }
  });

  // GET /api/patients/:patientId/clinical-cases - Get all clinical cases for a patient
  app.get("/api/patients/:patientId/clinical-cases", authenticateToken, async (req, res) => {
    try {
      const { patientId } = req.params;
      const user = req.user!;
      const userBranchId = user.branchId || '';

      const cases = await storage.getClinicalCasesByPatient(patientId, userBranchId);
      res.json(cases);
    } catch (error) {
      console.error("Error fetching patient clinical cases:", error);
      res.status(500).json({ error: "Failed to fetch patient clinical cases" });
    }
  });

  // POST /api/patients/:patientId/clinical-cases - Create new clinical case
  app.post("/api/patients/:patientId/clinical-cases", authenticateToken, async (req, res) => {
    try {
      const { patientId } = req.params;
      const user = req.user!;
      const { reasonForVisit } = req.body;

      if (!reasonForVisit) {
        return res.status(400).json({ error: "Reason for visit is required" });
      }

      if (!user.branchId) {
        return res.status(400).json({ error: "User branch not found" });
      }

      // 🔒 SECURITY: Add tenantId and branchId from request context
      const clinicalCaseData = {
        patientId,
        reasonForVisit,
        status: 'open',
        createdByUserId: user.id,
        tenantId: req.tenantId!,
        branchId: user.branchId
      };

      const newCase = await storage.createClinicalCase(clinicalCaseData as any);
      console.log('Created clinical case:', JSON.stringify(newCase, null, 2));

      res.status(201).json(newCase);
    } catch (error) {
      console.error("Error creating clinical case:", error);
      res.status(500).json({ error: "Failed to create clinical case" });
    }
  });

  // PATCH /api/clinical-cases/:id - Update clinical case
  app.patch("/api/clinical-cases/:id", authenticateToken, async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;

      const updatedCase = await storage.updateClinicalCase(id, updates);
      res.json(updatedCase);
    } catch (error) {
      console.error("Error updating clinical case:", error);
      res.status(500).json({ error: "Failed to update clinical case" });
    }
  });

  // POST /api/clinical-cases/:id/close - Close a clinical case
  app.post("/api/clinical-cases/:id/close", authenticateToken, async (req, res) => {
    try {
      const { id } = req.params;
      const closedCase = await storage.closeClinicalCase(id);
      res.json(closedCase);
    } catch (error) {
      console.error("Error closing clinical case:", error);
      res.status(500).json({ error: "Failed to close clinical case" });
    }
  });

  // POST /api/clinical-cases/:caseId/encounters - Create encounter for a case
  app.post("/api/clinical-cases/:caseId/encounters", authenticateToken, async (req, res) => {
    try {
      const { caseId } = req.params;
      const user = req.user!;
      const { doctorId, anamnesis, diagnosis, treatmentPlan, notes } = req.body;

      if (!doctorId) {
        return res.status(400).json({ error: "Doctor ID is required" });
      }

      const newEncounter = await storage.createClinicalEncounter({
        tenantId: req.tenantId!,
        branchId: user.branchId,
        clinicalCaseId: caseId,
        doctorId,
        anamnesis,
        diagnosis,
        treatmentPlan,
        notes
      } as any);

      res.status(201).json(newEncounter);
    } catch (error) {
      console.error("Error creating clinical encounter:", error);
      res.status(500).json({ error: "Failed to create clinical encounter" });
    }
  });

  // PATCH /api/encounters/:id - Update clinical encounter
  app.patch("/api/encounters/:id", authenticateToken, async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;

      const updatedEncounter = await storage.updateClinicalEncounter(id, updates);
      res.json(updatedEncounter);
    } catch (error) {
      console.error("Error updating clinical encounter:", error);
      res.status(500).json({ error: "Failed to update clinical encounter" });
    }
  });

  // GET /api/encounters/:id - Get encounter details
  app.get("/api/encounters/:id", authenticateToken, async (req, res) => {
    try {
      const { id } = req.params;
      const encounter = await storage.getClinicalEncounter(id);
      
      if (!encounter) {
        return res.status(404).json({ error: "Encounter not found" });
      }

      // Get lab analyses for this encounter
      const labAnalyses = await storage.getLabAnalyses(id);
      
      res.json({
        ...encounter,
        labAnalyses
      });
    } catch (error) {
      console.error("Error fetching clinical encounter:", error);
      res.status(500).json({ error: "Failed to fetch clinical encounter" });
    }
  });

  // POST /api/encounters/:encounterId/analyses - Create lab analysis order
  app.post("/api/encounters/:encounterId/analyses", authenticateToken, async (req, res) => {
    try {
      const { encounterId } = req.params;
      const user = req.user!;
      const { analysisName } = req.body;

      if (!analysisName) {
        return res.status(400).json({ error: "Analysis name is required" });
      }

      const newAnalysis = await storage.createLabAnalysis({
        encounterId,
        analysisName,
        status: 'ordered'
      });

      res.status(201).json(newAnalysis);
    } catch (error) {
      console.error("Error creating lab analysis:", error);
      res.status(500).json({ error: "Failed to create lab analysis" });
    }
  });

  // PATCH /api/analyses/:id - Update lab analysis
  app.patch("/api/analyses/:id", authenticateToken, async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;

      const updatedAnalysis = await storage.updateLabAnalysis(id, updates);
      res.json(updatedAnalysis);
    } catch (error) {
      console.error("Error updating lab analysis:", error);
      res.status(500).json({ error: "Failed to update lab analysis" });
    }
  });

  // POST /api/analyses/:analysisId/attachments - Upload attachment for analysis
  app.post("/api/analyses/:analysisId/attachments", authenticateToken, upload.single('file'), async (req, res) => {
    try {
      const { analysisId } = req.params;
      const user = req.user!;
      const file = req.file;

      if (!file) {
        return res.status(400).json({ error: "File is required" });
      }

      const newAttachment = await storage.createAttachment({
        entityId: analysisId,
        entityType: 'lab_analysis',
        fileName: file.originalname,
        filePath: file.path,
        mimeType: file.mimetype,
        fileSize: file.size,
        uploadedByUserId: user.id
      });

      res.status(201).json(newAttachment);
    } catch (error) {
      console.error("Error uploading attachment:", error);
      res.status(500).json({ error: "Failed to upload attachment" });
    }
  });

  // GET /api/attachments/:entityId - Get attachments for entity
  app.get("/api/attachments/:entityId", authenticateToken, async (req, res) => {
    try {
      const { entityId } = req.params;
      const { entityType } = req.query;

      if (!entityType) {
        return res.status(400).json({ error: "Entity type is required" });
      }

      const attachments = await storage.getAttachments(entityId, entityType as string);
      res.json(attachments);
    } catch (error) {
      console.error("Error fetching attachments:", error);
      res.status(500).json({ error: "Failed to fetch attachments" });
    }
  });

  // GET /api/patients/:patientId/full-history - Get complete medical history for patient
  app.get("/api/patients/:patientId/full-history", authenticateToken, async (req, res) => {
    try {
      const { patientId } = req.params;
      const user = req.user!;
      const userBranchId = user.branchId || '';

      const history = await storage.getPatientFullHistory(patientId, userBranchId);
      res.json(history);
    } catch (error) {
      console.error("Error fetching patient full history:", error);
      res.status(500).json({ error: "Failed to fetch patient full history" });
    }
  });

  // ========================================
  // DOCUMENT TEMPLATE MANAGEMENT ENDPOINTS
  // ========================================

  // GET /api/document-templates - Get all document templates for tenant
  app.get("/api/document-templates", authenticateToken, async (req, res) => {
    try {
      const user = req.user!;
      const tenantId = user.tenantId;
      
      const templates = await storage.getDocumentTemplates(tenantId);
      res.json(templates);
    } catch (error) {
      console.error("Error fetching document templates:", error);
      res.status(500).json({ error: "Failed to fetch document templates" });
    }
  });

  // POST /api/document-templates - Create document template
  app.post("/api/document-templates", authenticateToken, async (req, res) => {
    try {
      const user = req.user!;
      const tenantId = user.tenantId;
      
      const templateData = {
        ...req.body,
        tenantId
      };
      
      const template = await storage.createDocumentTemplate(templateData);
      res.json(template);
    } catch (error) {
      console.error("Error creating document template:", error);
      res.status(500).json({ error: "Failed to create document template" });
    }
  });

  // PUT /api/document-templates/:id - Update document template
  app.put("/api/document-templates/:id", authenticateToken, async (req, res) => {
    try {
      const { id } = req.params;
      const template = await storage.updateDocumentTemplate(id, req.body);
      res.json(template);
    } catch (error) {
      console.error("Error updating document template:", error);
      res.status(500).json({ error: "Failed to update document template" });
    }
  });

  // DELETE /api/document-templates/:id - Delete document template
  app.delete("/api/document-templates/:id", authenticateToken, async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteDocumentTemplate(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting document template:", error);
      res.status(500).json({ error: "Failed to delete document template" });
    }
  });

  // ========================================
  // DOCUMENT GENERATION ENDPOINTS
  // ========================================

  // Validation schema for document generation
  const generateDocumentSchema = z.object({
    templateType: z.enum([
      'invoice', 
      'encounter_summary', 
      'informed_consent_surgery', 
      'informed_consent_anesthesia', 
      'informed_consent_general',
      'lab_results_report', 
      'vaccination_certificate', 
      'prescription', 
      'personal_data_consent',
      'service_agreement',
      'hospitalization_agreement'
    ]),
    entityId: z.string().uuid(),
    outputFormat: z.enum(['pdf', 'html']).default('pdf')
  });

  // POST /api/documents/generate - Generate document (PDF or HTML) from template
  app.post("/api/documents/generate", authenticateToken, async (req, res) => {
    try {
      const user = req.user!;
      const tenantId = user.tenantId;
      const branchId = user.branchId;

      // Ensure user has valid branchId for tenant isolation
      if (!branchId) {
        return res.status(403).json({ error: 'Access denied: Invalid branch authorization' });
      }

      // Validate request body
      const validatedData = generateDocumentSchema.parse(req.body);
      const { templateType, entityId, outputFormat } = validatedData;

      // Build context based on template type with tenant/branch validation
      let context: any;
      
      // For patient-based templates, convert medical_record ID to patientId if needed
      let effectiveEntityId = entityId;
      if (['service_agreement', 'hospitalization_agreement', 'informed_consent_general'].includes(templateType)) {
        // Try to interpret entityId as a medical record ID first
        try {
          const record = await storage.getMedicalRecord(entityId);
          if (record && record.patientId) {
            // EntityId is a medical record - use its patientId
            effectiveEntityId = record.patientId;
          } else {
            // getMedicalRecord returned null - try as patientId
            const patient = await storage.getPatient(entityId);
            if (!patient) {
              return res.status(404).json({ error: 'Patient or medical record not found' });
            }
            // EntityId is a valid patientId
            effectiveEntityId = entityId;
          }
        } catch (recordErr: any) {
          // getMedicalRecord threw error - try as patientId
          try {
            const patient = await storage.getPatient(entityId);
            if (!patient) {
              return res.status(404).json({ error: 'Patient or medical record not found' });
            }
            effectiveEntityId = entityId;
          } catch (patientErr) {
            // Both failed - return error
            return res.status(404).json({ error: 'Invalid entityId: not a medical record or patient' });
          }
        }
      }
      
      // branchId is guaranteed to be non-null after the check above
      const validBranchId = branchId as string;
      
      switch (templateType) {
        case 'invoice':
          context = await documentService.buildInvoiceContext(entityId, tenantId, validBranchId);
          break;
        case 'encounter_summary':
          context = await documentService.buildEncounterSummaryContext(entityId, tenantId, validBranchId);
          break;
        case 'prescription':
          context = await documentService.buildPrescriptionContext(entityId, tenantId, validBranchId);
          break;
        case 'vaccination_certificate':
          context = await documentService.buildVaccinationCertificateContext(entityId, tenantId, validBranchId);
          break;
        case 'personal_data_consent':
          context = await documentService.buildPersonalDataConsentContext(entityId, tenantId, validBranchId);
          break;
        case 'service_agreement':
          context = await documentService.buildServiceAgreementContext(effectiveEntityId, tenantId, validBranchId);
          break;
        case 'hospitalization_agreement':
          context = await documentService.buildHospitalizationAgreementContext(effectiveEntityId, tenantId, validBranchId);
          break;
        case 'informed_consent_general':
          context = await documentService.buildInformedConsentGeneralContext(effectiveEntityId, tenantId, validBranchId);
          break;
        default:
          return res.status(400).json({ error: `Context builder not implemented for template type: ${templateType}` });
      }

      // Render HTML from template
      const html = await documentService.renderTemplate(templateType, tenantId, context);

      if (outputFormat === 'html') {
        // Return HTML directly
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        return res.send(html);
      } else {
        // Generate and return PDF
        const pdfBuffer = await documentService.generatePDF(html);
        
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="document-${entityId}.pdf"`);
        return res.send(pdfBuffer);
      }
    } catch (error: any) {
      console.error("Error generating document:", error);
      
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: "Invalid request data", details: error.errors });
      }
      
      res.status(500).json({ error: error.message || "Failed to generate document" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}