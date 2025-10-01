import { Request, Response, NextFunction } from 'express';
import { drizzle } from 'drizzle-orm/node-postgres';
import { pool } from '../db-local';
import * as schema from "@shared/schema";
import { PoolClient } from 'pg';
import { requestDbStorage } from '../storage';

// Extend Express Request to include tenant database context
declare global {
  namespace Express {
    interface Request {
      dbClient?: PoolClient;
      db?: ReturnType<typeof drizzle>;
    }
  }
}

/**
 * Tenant Database Middleware
 * 
 * Establishes a dedicated database connection for each request and sets tenant context.
 * This ensures:
 * 1. All queries in a request use the same connection (eliminates pool contention)
 * 2. SET LOCAL app.tenant_id is set once per request (not per query)
 * 3. Proper transaction lifecycle (BEGIN -> queries -> COMMIT/ROLLBACK)
 * 4. Connection is always released back to pool
 * 
 * Usage: Place this middleware AFTER tenantResolver and BEFORE routes
 */
export async function tenantDbMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Skip database setup for non-tenant requests or if no tenant resolved
  // (e.g., health checks, static assets, tenant table queries)
  if (!req.tenantId && !req.isSuperAdmin) {
    return next();
  }

  let client: PoolClient | null = null;
  
  try {
    // Acquire a dedicated connection from pool for this request
    client = await pool.connect();
    
    // Start transaction
    await client.query('BEGIN');
    
    // Set tenant context for RLS policies (if tenant exists)
    if (req.tenantId) {
      // Use set_config() for safe parameterized tenant_id setting
      // set_config(name, value, is_local=true) sets session variable within transaction
      await client.query('SELECT set_config($1, $2, true)', ['app.tenant_id', req.tenantId]);
    }
    
    // Create Drizzle instance on this connection and attach to request
    req.dbClient = client;
    req.db = drizzle({ client, schema });
    
    // Setup cleanup on response finish/error
    const cleanup = async (error?: Error) => {
      if (!client) return;
      
      try {
        if (error) {
          await client.query('ROLLBACK');
        } else {
          await client.query('COMMIT');
        }
      } catch (cleanupError) {
        console.error('Error during transaction cleanup:', cleanupError);
      } finally {
        client.release();
        client = null;
      }
    };
    
    // Register cleanup handlers
    res.on('finish', () => cleanup());
    res.on('error', (error) => cleanup(error));
    res.on('close', () => {
      // Connection closed unexpectedly
      if (client) cleanup(new Error('Connection closed'));
    });
    
    // Run the rest of the request within AsyncLocalStorage context
    // This makes req.db available to all storage methods
    requestDbStorage.run(req.db, () => {
      next();
    });
  } catch (error) {
    // Error during setup - release connection and pass error
    if (client) {
      try {
        await client.query('ROLLBACK');
        client.release();
      } catch (releaseError) {
        console.error('Error releasing connection:', releaseError);
      }
    }
    
    console.error('TenantDbMiddleware error:', error);
    return res.status(500).json({ 
      error: 'Database connection error',
      message: 'Не удалось установить соединение с базой данных'
    });
  }
}
