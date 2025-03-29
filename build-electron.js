const { execSync } = require('child_process');
const { existsSync, mkdirSync, copyFileSync, renameSync } = require('fs');
const { join } = require('path');

// This script builds the app for production with Electron

// Ensure we're in production mode
process.env.NODE_ENV = 'production';

// Helper to run commands
function runCommand(command) {
  console.log(`Running: ${command}`);
  execSync(command, { stdio: 'inherit' });
}

// Build steps
console.log('⚡ Building for Electron...');

// 1. Create backup of the original package.json
console.log('📄 Preparing package.json for Electron...');
if (existsSync('package.json')) {
  copyFileSync('package.json', 'package.json.bak');
  
  // Copy our Electron package.json
  copyFileSync('package-electron.json', 'package.json');
}

try {
  // 2. Build React frontend
  console.log('📦 Building frontend...');
  runCommand('npm run build');

  // 3. Build the Electron app
  console.log('🔧 Building Electron app...');
  runCommand('npx electron-builder build --config electron-builder.json');

  console.log('✅ Build complete! The packaged application is in the electron-dist folder.');
} catch (error) {
  console.error('❌ Error during build:', error);
} finally {
  // 4. Restore the original package.json
  console.log('🔄 Restoring original package.json...');
  if (existsSync('package.json.bak')) {
    renameSync('package.json.bak', 'package.json');
  }
}