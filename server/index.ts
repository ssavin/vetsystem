import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { startNotificationScheduler } from "./jobs/notification-scheduler";
import { startQueueCleanupScheduler } from "./jobs/queue-cleanup-scheduler";
import { startHealthNotificationsScheduler } from "./jobs/health-notifications-scheduler";
import { startHospitalBillingScheduler } from "./jobs/hospital-billing-scheduler";
import { tenantResolver } from "./middleware/tenant-resolver";
import { tenantDbMiddleware } from "./middleware/tenant-db";
import { setupWebSocketServer } from "./websocket";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Multi-tenant: Resolve tenant from subdomain BEFORE processing any routes
app.use(tenantResolver);

// Multi-tenant: Establish dedicated DB connection with tenant context for each request
// TEMPORARILY DISABLED - debugging SQL syntax error
// TODO: Re-enable after fixing
// app.use(tenantDbMiddleware);

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      // Only log basic info - never log response bodies that might contain PHI
      const logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      log(logLine);
    }
  });

  next();
});

(async () => {
  // Ensure RLS is properly enabled and policies exist for login-critical tables
  try {
    const { pool } = await import("./db-local");
    await pool.query(`
      DO $$ BEGIN
        -- Ensure RLS is properly enabled (not just FORCE) on critical tables
        ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
        ALTER TABLE users ENABLE ROW LEVEL SECURITY;
        
        -- branches: allow SELECT for all (needed for login page)
        IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'branches_select_all' AND polrelid = 'branches'::regclass) THEN
          EXECUTE 'CREATE POLICY branches_select_all ON branches FOR SELECT USING (true)';
        END IF;
        -- tenants: allow SELECT for all (needed for login page grouping)
        IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'tenants_select_all' AND polrelid = 'tenants'::regclass) THEN
          EXECUTE 'CREATE POLICY tenants_select_all ON tenants FOR SELECT USING (true)';
        END IF;
        -- users: allow SELECT for all (needed for authentication)
        IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'users_select_all' AND polrelid = 'users'::regclass) THEN
          EXECUTE 'CREATE POLICY users_select_all ON users FOR SELECT USING (true)';
        END IF;
      END $$;
    `);
  } catch (e) {
    console.warn("Could not ensure RLS policies for login tables:", e);
  }

  const server = await registerRoutes(app);
  
  // Setup WebSocket server for real-time notifications
  setupWebSocketServer(server);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
    
    // Запускаем scheduler для уведомлений о подписках
    startNotificationScheduler();
    
    // Запускаем scheduler для очистки истекших вызовов очереди
    startQueueCleanupScheduler();
    
    // Запускаем scheduler для health notifications (вакцинации, плановые визиты)
    startHealthNotificationsScheduler();
    
    // Запускаем scheduler для ежедневного биллинга стационара
    startHospitalBillingScheduler();
  });
})();
