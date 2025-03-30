// server/index.ts
import express from 'express';
import { createServer } from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
// ... import other dependencies

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// CORS and middleware setup
app.use(cors());
app.use(express.json());

// API routes registration
import { registerRoutes } from './routes.js';
await registerRoutes(app);

// In production, serve the frontend static files
if (process.env.NODE_ENV === 'production') {
  console.log('Serving static files from dist/client');
  
  // Serve static files from the client build directory
  app.use(express.static(path.join(__dirname, '../../dist/client')));
  
  // For any other request, send the index.html file
  app.get('*', (req, res) => {
    // Skip API routes - they're handled by the API routes above
    if (req.path.startsWith('/api/')) {
      return res.status(404).json({ error: 'API endpoint not found' });
    }
    
    res.sendFile(path.join(__dirname, '../../dist/client/index.html'));
  });
}

// Start the server
const PORT = process.env.PORT || 5000;
const server = createServer(app);

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// ... rest of your server code (including auto-sync etc.)

export { app, server };
