// server/vite.ts
import express from 'express';
import path from 'path';
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
    res.sendFile(path.resolve("dist/client/index.html"));
  });
}
