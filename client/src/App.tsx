import { Switch, Route, useLocation } from "wouter";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import { OfflineIndicator } from "@/components/ui/offline-indicator";
import { InstallPrompt } from "@/components/ui/install-prompt";
import { useEffect, useState, useCallback } from "react";
import { isElectron } from "@/hooks/useElectron";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const [location] = useLocation();
  const [isElectronApp, setIsElectronApp] = useState(false);

  // Set Electron status on mount
  useEffect(() => {
    const electronStatus = isElectron();
    setIsElectronApp(electronStatus);
    
    // Apply a body class for Electron-specific styling
    if (electronStatus) {
      document.body.classList.add('electron-app');
      console.log('Running in Electron environment');
      
      // Use the preload API if available
      if (window.electron && window.electron.getVersion) {
        console.log('Electron preload API available');
        
        // Display app version in console
        window.electron.getVersion()
          .then((version) => {
            console.log(`Volunteer Tracker version: ${version}`);
          })
          .catch((err) => console.error('Error getting version:', err));
      }
    }
  }, []);
  
  // Handle messages from Electron main process
  const handleElectronMessages = useCallback((message: any) => {
    console.log('Received message from Electron main process:', message);
    
    if (message && message.action) {
      switch (message.action) {
        case 'add-volunteer':
          window.dispatchEvent(new CustomEvent('open-add-volunteer-modal'));
          break;
        case 'add-event':
          window.dispatchEvent(new CustomEvent('open-add-event-modal'));
          break;
        case 'open-admin':
          window.dispatchEvent(new CustomEvent('open-admin-modal'));
          break;
        case 'export-prompt':
          window.dispatchEvent(new CustomEvent('open-export-dialog'));
          break;
        case 'check-updates':
          console.log('Check for updates requested');
          break;
        default:
          break;
      }
    }
  }, []);
  
  // Set up Electron message listener
  useEffect(() => {
    // Only set up in Electron environment
    if (!isElectronApp || !window.electron) return;
    
    // Set up the message handler
    window.electron.receive('fromMain', handleElectronMessages);
    
    return () => {
      // Register a noop function to overwrite the previous handler
      if (window.electron) {
        window.electron.receive('fromMain', () => {});
      }
    };
  }, [isElectronApp, handleElectronMessages]);

  // Handle PWA shortcut actions from URL parameters
  useEffect(() => {
    // Skip shortcut handling in Electron
    if (isElectronApp) return;
    
    const params = new URLSearchParams(window.location.search);
    const action = params.get('action');
    
    if (action) {
      // Handle PWA shortcut actions
      switch (action) {
        case 'add-volunteer':
          window.dispatchEvent(new CustomEvent('open-add-volunteer-modal'));
          break;
        case 'add-event':
          window.dispatchEvent(new CustomEvent('open-add-event-modal'));
          break;
        default:
          break;
      }
      
      // Remove the action parameter from URL to avoid triggering again on refresh
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }
  }, [location, isElectronApp]);

  return (
    <>
      <Router />
      <OfflineIndicator />
      <InstallPrompt />
    </>
  );
}

export default App;
