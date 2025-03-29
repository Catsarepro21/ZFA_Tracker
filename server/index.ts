import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { storage } from "./storage";
import { syncToGoogleSheets } from "./sheets";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

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
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

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

  // Get port from environment variable or use 5000 as default
  const port = process.env.PORT ? parseInt(process.env.PORT) : 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
    
    // Set up hourly auto-sync with Google Sheets if enabled
    setupAutoSync();
  });
  
  // Function to check and perform auto-sync
  async function setupAutoSync() {
    setInterval(async () => {
      try {
        // Check if auto-sync is enabled
        const autoSyncStr = await storage.getSetting('googleSheetsAutoSync');
        if (autoSyncStr !== 'true') return;
        
        // Get sync config
        const sheetId = await storage.getSetting('googleSheetsId');
        const serviceAccount = await storage.getSetting('googleServiceAccount');
        
        if (!sheetId || !serviceAccount) {
          log('Auto-sync skipped: Missing Google Sheets configuration');
          return;
        }
        
        // Check if we are online by attempting to connect to Google's DNS
        const isOnline = await checkOnlineStatus();
        if (!isOnline) {
          log('Auto-sync skipped: No internet connection');
          return;
        }
        
        // Perform the sync
        log('Starting auto-sync with Google Sheets...');
        
        const volunteers = await storage.getVolunteers();
        const events = await storage.getEvents();
        
        // Sort volunteers alphabetically
        const sortedVolunteers = [...volunteers].sort((a, b) => 
          a.name.localeCompare(b.name)
        );
        
        const result = await syncToGoogleSheets(sheetId, serviceAccount, sortedVolunteers, events, storage);
        
        // Update last sync timestamp
        await storage.updateSetting('googleSheetsLastSync', Date.now().toString());
        
        log(`Auto-sync completed successfully`);
      } catch (err) {
        log(`Auto-sync error: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    }, 60 * 60 * 1000); // Check every hour
    
    log('Auto-sync scheduler initialized');
  }
  
  // Function to check if we have internet connectivity
  async function checkOnlineStatus(): Promise<boolean> {
    return new Promise((resolve) => {
      const https = require('https');
      const req = https.get('https://8.8.8.8', { timeout: 5000 }, (res: any) => {
        resolve(true);
        req.abort(); // We don't need the actual response
      });
      
      req.on('error', () => {
        resolve(false);
      });
      
      req.on('timeout', () => {
        req.abort();
        resolve(false);
      });
    });
  };
})();
