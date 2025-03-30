// Add to server/index.ts
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// In production, serve the frontend static files
if (process.env.NODE_ENV === 'production') {
  console.log('Serving static files from client build');
  
  // Serve static files from the client build directory
  app.use(express.static(path.join(__dirname, '../client/dist')));
  
  // For any other request, send the index.html file
  app.get('*', (req, res) => {
    // Skip API routes - they're handled by the API routes above
    if (req.path.startsWith('/api/')) {
      return res.status(404).json({ error: 'API endpoint not found' });
    }
    
    res.sendFile(path.join(__dirname, '../client/dist/index.html'));
  });
}
