// Main process file for Electron
const { app, BrowserWindow, Menu, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const process = require('process');
const fs = require('fs');
const os = require('os');
const { promisify } = require('util');

const writeFileAsync = promisify(fs.writeFile);
const packageJson = require('../package.json');

// Handle creating/removing shortcuts on Windows when installing/uninstalling
if (require('electron-squirrel-startup')) {
  app.quit();
}

let mainWindow;
let serverProcess;
const isDev = process.env.NODE_ENV === 'development';
const host = process.env.USE_LOCALHOST === 'true' ? 'localhost' : '0.0.0.0';
const port = process.env.PORT || 3000;

function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, '..', 'generated-icon.png')
  });

  // Load the app
  const loadURL = isDev 
    ? `http://${host}:${port}` 
    : `file://${path.join(__dirname, '../dist/index.html')}`;
  
  if (isDev) {
    console.log(`Loading URL: ${loadURL}`);
    
    // Wait for server to start
    const interval = setInterval(() => {
      mainWindow.loadURL(loadURL)
        .then(() => {
          clearInterval(interval);
          console.log('Application loaded successfully');
        })
        .catch(err => {
          console.log('Waiting for server to start...');
        });
    }, 1000);
    
    // Open DevTools in development mode
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadURL(loadURL);
  }

  // Emitted when the window is closed
  mainWindow.on('closed', () => {
    mainWindow = null;
    if (serverProcess) {
      // Kill server on close
      stopServer();
    }
  });
  
  // Create application menu
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Export Data',
          click: async () => {
            mainWindow.webContents.send('fromMain', { action: 'export-prompt' });
          }
        },
        { type: 'separator' },
        { role: 'quit' }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Data',
      submenu: [
        { 
          label: 'Add New Volunteer',
          click: () => mainWindow.webContents.send('fromMain', { action: 'add-volunteer' })
        },
        { 
          label: 'Add New Event',
          click: () => mainWindow.webContents.send('fromMain', { action: 'add-event' })
        },
        { type: 'separator' },
        { 
          label: 'Admin Panel',
          click: () => mainWindow.webContents.send('fromMain', { action: 'open-admin' })
        }
      ]
    },
    {
      role: 'help',
      submenu: [
        {
          label: 'About Volunteer Tracker',
          click: async () => {
            dialog.showMessageBox(mainWindow, {
              title: 'About Volunteer Tracker',
              message: 'Volunteer Tracker',
              detail: `Version ${packageJson.version}\nA comprehensive volunteer management platform that streamlines event coordination, volunteer tracking, and administrative workflows.`,
              buttons: ['OK']
            });
          }
        },
        {
          label: 'Check for Updates',
          click: async () => {
            mainWindow.webContents.send('fromMain', { action: 'check-updates' });
          }
        }
      ]
    }
  ];
  
  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

async function startServer() {
  if (isDev) {
    console.log('Starting development server...');
    // In development mode, the server is already running thanks to electron-start.js
    return;
  }
  
  console.log('Starting production server...');
  // In production mode, we need to start the server ourselves
  serverProcess = spawn('node', ['server/index.js'], {
    env: { ...process.env, PORT: port.toString(), NODE_ENV: 'production' },
    stdio: 'inherit'
  });
  
  serverProcess.on('error', (err) => {
    console.error('Failed to start server process:', err);
  });
  
  // Wait for server to be ready
  await new Promise((resolve) => setTimeout(resolve, 2000));
}

function stopServer() {
  if (serverProcess && !serverProcess.killed) {
    console.log('Stopping server...');
    if (process.platform === 'win32') {
      spawn('taskkill', ['/pid', serverProcess.pid, '/f', '/t']);
    } else {
      serverProcess.kill('SIGINT');
    }
  }
}

// This method will be called when Electron has finished initialization
app.on('ready', async () => {
  await startServer();
  createWindow();
});

// Quit when all windows are closed
app.on('window-all-closed', () => {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open
  if (mainWindow === null) {
    createWindow();
  }
});

// Listen for IPC events from renderer
ipcMain.on('toMain', (event, data) => {
  // Handle messages from renderer process here
  console.log('Message from renderer:', data);
  
  // Send a response back
  mainWindow.webContents.send('fromMain', { response: 'Message received' });
});

// Get app version
ipcMain.handle('get-app-version', () => {
  return packageJson.version;
});

// Handle export data
ipcMain.on('export-data', async (event, data) => {
  try {
    const { format, content } = data;
    const defaultPath = path.join(app.getPath('documents'), `volunteer-tracker-export.${format}`);
    
    const saveOptions = {
      title: 'Save Exported Data',
      defaultPath,
      filters: [
        format === 'csv' ? { name: 'CSV Files', extensions: ['csv'] } : 
                          { name: 'JSON Files', extensions: ['json'] }
      ]
    };
    
    const { filePath } = await dialog.showSaveDialog(mainWindow, saveOptions);
    
    if (filePath) {
      await writeFileAsync(filePath, content);
      mainWindow.webContents.send('fromMain', { response: 'Export successful', success: true });
    }
  } catch (error) {
    console.error('Export error:', error);
    mainWindow.webContents.send('fromMain', { response: 'Export failed', error: error.message });
  }
});

// Open developer tools
ipcMain.on('open-devtools', () => {
  if (mainWindow) {
    mainWindow.webContents.openDevTools();
  }
});

// Handle app quitting
app.on('quit', () => {
  stopServer();
});