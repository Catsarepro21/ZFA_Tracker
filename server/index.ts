// server/index.ts
import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { log } from './vite';
import { registerRoutes } from './routes';
import { storage } from './storage';
import { syncToGoogleSheets } from './sheets';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create Express app
const app = express();

// Register routes
const server = await registerRoutes(app);

// WebSocket for real-time updates (optional)
const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  log('WebSocket client connected');
  
  ws.on('close', () => {
    log('WebSocket client disconnected');
  });
});

// Auto-sync functionality
let isAutoSyncRunning = false;
let autoSyncInterval: NodeJS.Timeout | null = null;

setupAutoSync();

// Error handling middleware
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// In production, serve the frontend static files
if (process.env.NODE_ENV === 'production') {
  console.log('Serving static files from client build');
  
  // Serve static files from the client build directory
  app.use(express.static(path.join(__dirname, '../../client/dist')));
  
  // For any other request, send the index.html file
  app.get('*', (req, res) => {
    // Skip API routes - they're handled by the API routes above
    if (req.path.startsWith('/api/')) {
      return res.status(404).json({ error: 'API endpoint not found' });
    }
    
    res.sendFile(path.join(__dirname, '../../client/dist/index.html'));
  });
}

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  log(`Server running on port ${PORT}`);
});

async function setupAutoSync() {
  try {
    const autoSyncEnabled = await storage.getSetting('autoSyncEnabled');
    
    if (autoSyncEnabled === 'true') {
      startAutoSync();
    }
    
    // Check every minute if auto-sync has been enabled/disabled
    setInterval(async () => {
      const currentAutoSyncSetting = await storage.getSetting('autoSyncEnabled');
      
      if (currentAutoSyncSetting === 'true' && !isAutoSyncRunning) {
        log('Auto-sync enabled, starting hourly sync');
        startAutoSync();
      } else if (currentAutoSyncSetting !== 'true' && isAutoSyncRunning) {
        log('Auto-sync disabled, stopping hourly sync');
        stopAutoSync();
      }
    }, 60 * 1000); // Check every minute
    
  } catch (err) {
    log('Error setting up auto-sync:', err);
  }
}

function startAutoSync() {
  if (isAutoSyncRunning) return;
  
  isAutoSyncRunning = true;
  
  // Run sync immediately
  performAutoSync();
  
  // Then run every hour
  autoSyncInterval = setInterval(() => {
    performAutoSync();
  }, 60 * 60 * 1000); // Every hour
}

function stopAutoSync() {
  if (!isAutoSyncRunning) return;
  
  isAutoSyncRunning = false;
  
  if (autoSyncInterval) {
    clearInterval(autoSyncInterval);
    autoSyncInterval = null;
  }
}

async function performAutoSync() {
  try {
    // Check if we're online before attempting sync
    const isOnline = await checkOnlineStatus();
    
    if (!isOnline) {
      log('Auto-sync: Device appears to be offline, skipping sync');
      return;
    }
    
    log('Auto-sync: Starting automatic sync with Google Sheets');
    
    // Get Google Sheets config
    const spreadsheetId = await storage.getSetting('googleSheetId');
    const sheetName = await storage.getSetting('googleSheetName');
    
    if (!spreadsheetId || !sheetName) {
      log('Auto-sync: Missing Google Sheets configuration');
      return;
    }
    
    // Perform sync
    await syncToGoogleSheets({ spreadsheetId, sheetName }, storage);
    
    // Update last sync time
    const now = new Date().toISOString();
    await storage.updateSetting('lastSyncTime', now);
    
    log('Auto-sync: Sync completed successfully');
    
    // Notify connected clients
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocketServer.OPEN) {
        client.send(JSON.stringify({ 
          type: 'sync-completed',
          timestamp: now
        }));
      }
    });
    
  } catch (err) {
    log('Auto-sync: Error during automatic sync:', err);
  }
}

async function checkOnlineStatus(): Promise<boolean> {
  try {
    // Simple connectivity check
    const response = await fetch('https://www.google.com', { 
      method: 'HEAD',
      // Short timeout
      signal: AbortSignal.timeout(5000)
    });
    return response.ok;
  } catch (err) {
    return false;
  }
}

export { app, server };
