import { type Request, type Response, type NextFunction } from 'express';
import { db } from '../db-local';
import { tenants } from '@shared/schema';
import { eq, or } from 'drizzle-orm';

// Extend Express Request to include tenant information
declare global {
  namespace Express {
    interface Request {
      tenantId?: string;
      tenantSlug?: string;
      isSuperAdmin?: boolean;
    }
  }
}

/**
 * TenantResolver Middleware
 * 
 * Extracts tenant from subdomain or custom domain and sets tenant context:
 * - Parses Host header to extract subdomain (e.g., clinic1.vetsystem.ru)
 * - Special handling for admin.vetsystem.ru (superadmin portal)
 * - Looks up tenant in database by slug or custom domain
 * - Sets req.tenantId for downstream middleware and routes
 * - Sets req.tenantSlug for logging/debugging
 * - Sets req.isSuperAdmin=true for admin subdomain
 * 
 * URL Structure:
 * - https://clinic1.vetsystem.ru → tenant with slug 'clinic1'
 * - https://admin.vetsystem.ru → superadmin portal (BYPASSRLS)
 * - https://custom-domain.com → tenant with customDomain='custom-domain.com'
 * - http://localhost:5000 → default-tenant-001 (development)
 */
export async function tenantResolver(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    // Extract host from request (prefer X-Forwarded-Host if behind proxy)
    const rawHost = (req.get('x-forwarded-host') || req.get('host') || '').toString();
    
    // Normalize host: remove port, lowercase, strip www prefix
    // Example: www.Custom-Domain.com:443 → custom-domain.com
    const hostname = rawHost.split(',')[0].split(':')[0].toLowerCase();
    const host = hostname.startsWith('www.') ? hostname.slice(4) : hostname;
    
    // Development: localhost or 127.0.0.1 → use default tenant
    if (host.includes('localhost') || host.includes('127.0.0.1') || host.includes('replit.dev')) {
      req.tenantId = 'default-tenant-001';
      req.tenantSlug = 'default';
      req.isSuperAdmin = false;
      return next();
    }

    // Extract subdomain from host
    // Expected formats:
    // - clinic1.vetsystem.ru → subdomain='clinic1'
    // - admin.vetsystem.ru → subdomain='admin' (superadmin)
    // - custom-domain.com → no subdomain, lookup by domain
    // - www.custom-domain.com → custom-domain.com (www stripped above)
    const parts = host.split('.');
    
    // Check for admin subdomain (superadmin portal)
    // SECURITY NOTE: This only sets a flag based on hostname.
    // Actual superadmin authorization MUST be enforced in auth middleware
    // by checking authenticated user's isSuperAdmin role before allowing
    // BYPASSRLS operations or cross-tenant access.
    if (parts[0] === 'admin') {
      req.isSuperAdmin = true;
      req.tenantSlug = 'admin';
      // Superadmin has no tenant_id (will use BYPASSRLS role)
      // Auth middleware must validate actual superadmin credentials
      return next();
    }

    // Try to find tenant by subdomain slug or custom domain
    let tenant;
    
    if (parts.length >= 3) {
      // Subdomain-based tenant (e.g., clinic1.vetsystem.ru)
      const subdomain = parts[0];
      tenant = await db.query.tenants.findFirst({
        where: eq(tenants.slug, subdomain),
      });
    } else {
      // Custom domain tenant (e.g., my-clinic.com)
      tenant = await db.query.tenants.findFirst({
        where: or(
          eq(tenants.canonicalDomain, host),
          eq(tenants.customDomain, host)
        ),
      });
    }

    if (!tenant) {
      return res.status(404).json({ 
        error: 'Tenant not found',
        message: `No clinic found for domain: ${host}. Please check your URL.`
      });
    }

    // Check tenant status
    if (tenant.status === 'suspended') {
      return res.status(403).json({ 
        error: 'Tenant suspended',
        message: 'This clinic account has been suspended. Please contact support.'
      });
    }

    if (tenant.status === 'cancelled') {
      return res.status(403).json({ 
        error: 'Tenant cancelled',
        message: 'This clinic subscription has been cancelled.'
      });
    }

    // Set tenant context in request
    req.tenantId = tenant.id;
    req.tenantSlug = tenant.slug;
    req.isSuperAdmin = false;

    next();
  } catch (error) {
    console.error('TenantResolver error:', error);
    res.status(500).json({ 
      error: 'Tenant resolution failed',
      message: 'Unable to determine clinic from request'
    });
  }
}
