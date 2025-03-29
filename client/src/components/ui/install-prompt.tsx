import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, X } from 'lucide-react';
import { checkInstallable, promptInstall } from '@/lib/serviceWorker';

// Function to check if app is running in Electron
const isElectron = () => {
  // Check if window.electron exists (set by our preload script)
  if (typeof window !== 'undefined' && window.electron) {
    return true;
  }
  
  // Fallback detection
  const userAgent = navigator.userAgent.toLowerCase();
  return userAgent.indexOf(' electron/') > -1;
};

export function InstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  
  useEffect(() => {
    // Don't show install prompt if running in Electron
    if (isElectron()) {
      return;
    }
    
    // Check if the app is installable after a delay
    const timeoutId = setTimeout(async () => {
      const isInstallable = await checkInstallable();
      
      // Show prompt only if the app can be installed
      // and the user hasn't previously dismissed the prompt
      if (isInstallable && !localStorage.getItem('pwa-install-dismissed')) {
        setShowPrompt(true);
      }
    }, 5000); // 5 second delay to not distract from initial experience
    
    return () => clearTimeout(timeoutId);
  }, []);
  
  const handleInstall = async () => {
    setIsInstalling(true);
    try {
      const installed = await promptInstall();
      if (installed) {
        setShowPrompt(false);
      }
    } catch (error) {
      console.error('Installation error:', error);
    } finally {
      setIsInstalling(false);
    }
  };
  
  const handleDismiss = () => {
    // Remember the dismissal for a week
    const expiry = Date.now() + (7 * 24 * 60 * 60 * 1000); // 7 days
    localStorage.setItem('pwa-install-dismissed', expiry.toString());
    setShowPrompt(false);
  };
  
  if (!showPrompt) return null;
  
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 p-4 shadow-lg border-t z-40">
      <div className="container mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="bg-primary rounded-full p-2">
            <Download className="h-6 w-6 text-white" />
          </div>
          <div>
            <h3 className="font-medium text-lg">Install Volunteer Tracker</h3>
            <p className="text-gray-600 dark:text-gray-300 text-sm">
              Install this app on your device for offline access
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleDismiss}
          >
            <X className="h-4 w-4 mr-1" /> 
            No Thanks
          </Button>
          <Button
            onClick={handleInstall}
            disabled={isInstalling}
            className="bg-primary hover:bg-primary/90"
            size="sm"
          >
            <Download className="h-4 w-4 mr-1" />
            {isInstalling ? 'Installing...' : 'Install'}
          </Button>
        </div>
      </div>
    </div>
  );
}