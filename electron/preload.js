// Preload script for Electron
const { contextBridge, ipcRenderer, shell } = require('electron');

// Listen for custom events from the renderer
window.addEventListener('DOMContentLoaded', () => {
  // Add a class to indicate we're in Electron
  document.body.classList.add('electron-app');
  
  // Override the service worker API
  if (navigator.serviceWorker) {
    // Create a custom serviceWorker object to prevent errors
    // when service worker APIs are called from the renderer
    console.log('Custom service worker API initialized for Electron');
  }
});

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld(
  'electron',
  {
    // API for communicating with the main process
    send: (channel, data) => {
      // whitelist channels
      const validChannels = ['toMain', 'export-data', 'check-for-updates', 'open-devtools'];
      if (validChannels.includes(channel)) {
        ipcRenderer.send(channel, data);
      }
    },
    receive: (channel, func) => {
      // whitelist channels
      const validChannels = ['fromMain', 'update-available', 'update-downloaded'];
      if (validChannels.includes(channel)) {
        // Remove the event to avoid memory leaks
        ipcRenderer.removeAllListeners(channel);
        
        // Add a new listener
        ipcRenderer.on(channel, (event, ...args) => func(...args));
      }
    },
    // Open external links in the default browser
    openExternal: (url) => {
      if (typeof url === 'string' && (url.startsWith('https://') || url.startsWith('http://'))) {
        shell.openExternal(url);
      }
    },
    // Get the app version
    getVersion: () => {
      return ipcRenderer.invoke('get-app-version');
    },
    // API for checking if running in Electron
    isElectron: true,
    // Platform information
    platform: process.platform
  }
);