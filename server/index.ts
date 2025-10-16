import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { startNotificationScheduler } from "./jobs/notification-scheduler";
import { startQueueCleanupScheduler } from "./jobs/queue-cleanup-scheduler";
import { startHealthNotificationsScheduler } from "./jobs/health-notifications-scheduler";
import { startHospitalBillingScheduler } from "./jobs/hospital-billing-scheduler";
import { tenantResolver } from "./middleware/tenant-resolver";
import { tenantDbMiddleware } from "./middleware/tenant-db";

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
  const server = await registerRoutes(app);

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
