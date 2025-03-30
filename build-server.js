import { build } from 'esbuild';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// First build the client
console.log("Building client...");
const clientResult = await import('child_process').then(cp => {
  return new Promise((resolve, reject) => {
    const process = cp.exec('cd client && vite build', (error, stdout, stderr) => {
      if (error) {
        reject(error);
        return;
      }
      resolve({ stdout, stderr });
    });
    
    process.stdout.on('data', (data) => console.log(data));
    process.stderr.on('data', (data) => console.error(data));
  });
});

console.log("Building server...");
// Then build the server
try {
  await build({
    entryPoints: ['server/index.ts'],
    bundle: true,
    platform: 'node',
    target: ['node16'],
    outfile: 'dist/index.js',
    external: ['express', 'pg', 'googleapis', 'ws'],
    format: 'esm',
    banner: {
      js: '// This file is generated - do not edit directly\n',
    },
  });
  console.log("Build completed successfully!");
} catch (error) {
  console.error("Build failed:", error);
  process.exit(1);
}
