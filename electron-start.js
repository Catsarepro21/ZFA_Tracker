const { spawn } = require('child_process');
const { existsSync } = require('fs');
const { join } = require('path');

// This script is used to start Electron in development mode

// Set environment variables
process.env.NODE_ENV = 'development';
process.env.USE_LOCALHOST = 'true';

console.log('Starting Electron app in development mode...');

// Start Electron
const electronProcess = spawn('electron', ['.'], {
  shell: true,
  stdio: 'inherit',
  env: process.env
});

electronProcess.on('close', (code) => {
  console.log(`Electron process exited with code ${code}`);
  process.exit(code);
});