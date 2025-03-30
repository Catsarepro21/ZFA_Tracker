// server/vite.ts
import express from 'express';
import { Server } from 'http';

export function log(message: string, source = "express") {
  console.log(`${new Date().toLocaleTimeString()} [${source}] ${message}`);
}

export async function setupVite(app: any, server: Server) {
  log("Server running in production mode - serving static files");
  serveStatic(app);
  return server;
}

export function serveStatic(app: any) {
  app.use(express.static("dist/client"));
  app.get("*", (req: any, res: any) => {
    if (req.path.startsWith('/api')) return; // Let API routes handle themselves
    
    // Import path dynamically to avoid conflicts
    import('path').then(pathModule => {
      res.sendFile(pathModule.resolve("dist/client/index.html"));
    }).catch(err => {
      console.error("Error loading path module:", err);
      res.status(500).send("Server error");
    });
  });
}
