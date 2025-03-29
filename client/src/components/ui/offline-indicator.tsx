import { useEffect, useState } from 'react';
import { Wifi, WifiOff } from 'lucide-react';
import { cn } from '@/lib/utils';

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

export function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isVisible, setIsVisible] = useState(false);
  
  useEffect(() => {
    // In Electron desktop app, modify the behavior of offline indicator
    const isElectronApp = isElectron();
    
    const handleOnline = () => {
      setIsOnline(true);
      // Show the indicator for a moment when coming back online
      if (!isElectronApp) {
        setIsVisible(true);
        setTimeout(() => setIsVisible(false), 3000);
      } else {
        // In Electron, hide immediately when back online since it's less critical
        setIsVisible(false);
      }
    };
    
    const handleOffline = () => {
      setIsOnline(false);
      // Always show when offline
      setIsVisible(true);
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Initial check - in Electron, we might not care about offline state as much
    setIsOnline(navigator.onLine);
    setIsVisible(!navigator.onLine && !isElectronApp);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  
  // Don't render in specific conditions:
  // 1. If we're online and the indicator isn't supposed to be visible
  // 2. If we're in Electron and online (desktop apps typically don't need network indicators)
  if ((isOnline && !isVisible) || (isElectron() && isOnline)) return null;
  
  return (
    <div 
      className={cn(
        "fixed top-4 right-4 flex items-center space-x-2 px-3 py-2 z-50 rounded-md shadow-md text-sm transition-opacity duration-300",
        isOnline 
          ? "bg-green-100 text-green-800 border border-green-200" 
          : "bg-yellow-100 text-yellow-800 border border-yellow-200"
      )}
    >
      {isOnline ? (
        <>
          <Wifi className="h-4 w-4" />
          <span>Back online</span>
        </>
      ) : (
        <>
          <WifiOff className="h-4 w-4" />
          <span>You are offline</span>
        </>
      )}
    </div>
  );
}