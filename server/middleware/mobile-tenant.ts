import { Request, Response, NextFunction } from 'express';
import { drizzle } from 'drizzle-orm/node-postgres';
import { pool } from '../db-local';
import * as schema from "@shared/schema";
import { PoolClient } from 'pg';
import { requestDbStorage } from '../storage';

/**
 * Mobile Tenant Context Middleware
 * 
 * Sets up tenant context for mobile clients based on JWT token tenantId.
 * This ensures RLS (Row Level Security) is enforced for mobile API requests.
 * 
 * MUST be placed AFTER authenticateToken middleware.
 */
export async function mobileTenantMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Mobile clients should have user with tenantId from JWT
  const tenantId = req.user?.tenantId;
  
  if (!tenantId) {
    return res.status(403).json({ error: 'Invalid token: missing tenant information' });
  }

  let client: PoolClient | null = null;
  
  try {
    // Get connection from pool
    client = await pool.connect();
    
    // Create Drizzle instance for this connection
    const db = drizzle(client, { schema });
    
    // Set tenant context for RLS
    await client.query('BEGIN');
    await client.query(`SET LOCAL app.current_tenant_id = '${tenantId}'`);
    
    // Store db instance on request for cleanup
    req.db = db;
    
    // Cleanup function
    const cleanup = async (error?: Error) => {
      if (!client) return;
      
      try {
        if (error) {
          await client.query('ROLLBACK');
        } else {
          await client.query('COMMIT');
        }
      } catch (err) {
        console.error('Error during transaction cleanup:', err);
      } finally {
        client.release();
      }
    };
    
    // Cleanup on response finish
    res.on('finish', () => cleanup());
    res.on('close', () => cleanup());
    res.on('error', (error) => cleanup(error));
    
    // Run request within AsyncLocalStorage context (enables tenant-scoped storage)
    requestDbStorage.run(db, () => {
      next();
    });
  } catch (error) {
    if (client) {
      try {
        await client.query('ROLLBACK');
        client.release();
      } catch (err) {
        console.error('Error releasing connection:', err);
      }
    }
    console.error('Mobile tenant middleware error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Unauthenticated Mobile Middleware
 * 
 * For unauthenticated mobile endpoints (like SMS send-code),
 * we don't have tenantId yet. These endpoints must handle cross-tenant
 * lookups carefully and only expose minimal information.
 */
export async function unauthenticatedMobileMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  // For unauthenticated routes, we use global db (no tenant context)
  // This is intentional - phone lookup needs to work across tenants
  // Security must be handled at the endpoint level
  next();
}
