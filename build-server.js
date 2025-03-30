// build-server.js
import { build } from 'esbuild';
import fs from 'fs';
import path from 'path';

// Create a simplified version of vite.ts to avoid dependency issues
const createSimplifiedViteTs = () => {
  const content = `
export function log(message, source = "express") {
  console.log(\`\${new Date().toLocaleTimeString()} [\${source}] \${message}\`);
}

export function serveStatic(app) {
  const express = await import('express');
  const p = await import('path');
  app.use(express.default.static("dist/client"));
  app.get("*", (req, res) => {
    if (req.path.startsWith('/api')) return;
    res.sendFile(p.default.resolve("dist/client/index.html"));
  });
}
  `;
  
  fs.mkdirSync('dist', { recursive: true });
  fs.writeFileSync('dist/vite.js', content);
};

// Build client files without Vite
const copyClientStaticFiles = () => {
  const staticDir = path.join('dist', 'client');
  fs.mkdirSync(staticDir, { recursive: true });
  
  // Create a simple index.html for the server to serve
  const indexHtml = `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Volunteer Tracker</title>
    <style>
      body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
      .container { max-width: 800px; margin: 0 auto; }
      h1 { color: #4f46e5; }
      p { line-height: 1.6; }
    </style>
  </head>
  <body>
    <div class="container">
      <h1>Volunteer Tracker</h1>
      <p>
        Your Volunteer Tracker server is running. This is a placeholder page.
        The full web application will be available in a future deployment.
      </p>
      <p>
        You can access the API at the following endpoints:
      </p>
      <ul>
        <li><a href="/api/volunteers">/api/volunteers</a> - Get all volunteers</li>
        <li><a href="/api/events">/api/events</a> - Get all events</li>
      </ul>
    </div>
  </body>
</html>
  `;
  
  fs.writeFileSync(path.join(staticDir, 'index.html'), indexHtml);
};

// Create necessary helper files
createSimplifiedViteTs();
copyClientStaticFiles();

// Build the server application
build({
  entryPoints: ['server/index.ts'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  external: [
    'express', 
    'googleapis', 
    'zod', 
    'ws', 
    'passport', 
    'express-session',
    'drizzle-orm',
    'react',
    'react-dom',
    'path',
    'fs',
    'url'
  ],
  outdir: 'dist',
  banner: {
    js: `
// Import helpers for ESM compatibility
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
import { dirname } from 'path';
const __dirname = dirname(__filename);
`
  }
}).then(() => {
  console.log('✅ Server build complete');
}).catch(() => process.exit(1));
