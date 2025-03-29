import { useEffect, useState } from 'react';
import { Wifi, WifiOff } from 'lucide-react';
import { cn } from '@/lib/utils';

export function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isVisible, setIsVisible] = useState(false);
  
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Show the indicator for a moment when coming back online
      setIsVisible(true);
      setTimeout(() => setIsVisible(false), 3000);
    };
    
    const handleOffline = () => {
      setIsOnline(false);
      // Always show when offline
      setIsVisible(true);
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Initial check
    setIsOnline(navigator.onLine);
    setIsVisible(!navigator.onLine);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  
  // Don't render if we're online and the indicator isn't supposed to be visible
  if (isOnline && !isVisible) return null;
  
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