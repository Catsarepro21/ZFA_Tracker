import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

try {
  // First, check if client directory exists
  if (fs.existsSync(path.join(__dirname, 'client'))) {
    console.log("Building client...");
    try {
      // Build the client using Vite
      execSync('cd client && vite build', { stdio: 'inherit' });
      console.log("Client build successful!");
    } catch (error) {
      console.error("Client build failed:", error);
      process.exit(1);
    }
  } else {
    console.log("No client directory found, skipping client build.");
  }

  console.log("Building server...");
  // Then build the server using tsc instead of esbuild
  execSync('tsc -p tsconfig.server.json', { stdio: 'inherit' });
  console.log("Server build completed successfully!");
} catch (error) {
  console.error("Server build failed:", error);
  process.exit(1);
}
