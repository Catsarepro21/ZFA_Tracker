import { useEffect, useState, useCallback } from 'react';

// Function to check if app is running in Electron
export const isElectron = () => {
  // Check if window.electron exists (set by our preload script)
  if (typeof window !== 'undefined' && window.electron) {
    return true;
  }
  
  // Fallback detection
  const userAgent = navigator.userAgent.toLowerCase();
  return userAgent.indexOf(' electron/') > -1;
};

// Custom hook for using Electron features
export function useElectron() {
  const [appVersion, setAppVersion] = useState<string | null>(null);
  const [isElectronApp, setIsElectronApp] = useState(false);
  
  // Set up once on component mount
  useEffect(() => {
    const electronAvailable = isElectron();
    setIsElectronApp(electronAvailable);
    
    // Only try to get version if Electron is available
    if (electronAvailable && window.electron && window.electron.getVersion) {
      window.electron.getVersion()
        .then((version: string) => setAppVersion(version))
        .catch((err: any) => console.error('Error getting app version:', err));
    }
  }, []);
  
  // Export data to a file using Electron's native file dialog
  const exportData = useCallback(async (format: 'csv' | 'json', content: string): Promise<boolean> => {
    if (!isElectronApp || !window.electron) {
      console.error('Electron API not available for export');
      return false;
    }
    
    try {
      // Send data to main process for file save dialog
      window.electron.send('export-data', { format, content });
      
      // Create a Promise that resolves when we get a response
      return new Promise((resolve) => {
        const responseHandler = (response: any) => {
          if (response.response === 'Export successful') {
            resolve(true);
          } else if (response.response === 'Export failed') {
            console.error('Export failed:', response.error);
            resolve(false);
          }
        };
        
        // Listen for the response
        window.electron.receive('fromMain', responseHandler);
        
        // Set a timeout in case we don't get a response
        setTimeout(() => {
          resolve(false);
        }, 10000);
      });
    } catch (error) {
      console.error('Error exporting data:', error);
      return false;
    }
  }, [isElectronApp]);
  
  // Open Chrome DevTools
  const openDevTools = useCallback(() => {
    if (isElectronApp && window.electron) {
      window.electron.send('open-devtools', {});
    }
  }, [isElectronApp]);
  
  // Open an external link in the default browser
  const openExternalLink = useCallback((url: string): boolean => {
    if (isElectronApp && window.electron && window.electron.openExternal) {
      window.electron.openExternal(url);
      return true;
    }
    return false;
  }, [isElectronApp]);
  
  return {
    isElectronApp,
    appVersion,
    exportData,
    openDevTools,
    openExternalLink
  };
}