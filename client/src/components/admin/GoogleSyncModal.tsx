import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { apiRequest } from "@/lib/queryClient";
import { useAdmin } from "@/hooks/useAdmin";
import { CheckCircle2, XCircle } from "lucide-react";

interface GoogleSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function GoogleSyncModal({
  isOpen,
  onClose
}: GoogleSyncModalProps) {
  const { password } = useAdmin();
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<'syncing' | 'success' | 'error'>('syncing');
  const [errorMessage, setErrorMessage] = useState("");
  
  useEffect(() => {
    if (isOpen) {
      setProgress(0);
      setStatus('syncing');
      setErrorMessage("");
      
      // Start the sync process
      syncWithGoogleSheets();
      
      // Show animation of progress even if the sync process is quick
      const interval = setInterval(() => {
        setProgress(prev => {
          if (status === 'syncing' && prev < 90) {
            return prev + 5;
          }
          return prev;
        });
      }, 200);
      
      return () => clearInterval(interval);
    }
  }, [isOpen]);
  
  const syncWithGoogleSheets = async () => {
    try {
      const response = await fetch('/api/admin/sync-sheets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to sync with Google Sheets');
      }
      
      // Update the last sync timestamp
      await updateLastSyncTime();
      
      setProgress(100);
      setStatus('success');
    } catch (error) {
      setProgress(100);
      setStatus('error');
      setErrorMessage(error instanceof Error ? error.message : "Failed to sync with Google Sheets");
    }
  };
  
  const updateLastSyncTime = async () => {
    try {
      // Get current Google Sheets config
      const configResponse = await fetch('/api/admin/sheets-config');
      if (!configResponse.ok) {
        throw new Error('Failed to fetch Google Sheets configuration');
      }
      
      const config = await configResponse.json();
      
      // Update the lastSyncTimestamp
      const updateResponse = await fetch('/api/admin/sheets-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...config,
          lastSyncTimestamp: Date.now()
        })
      });
      
      if (!updateResponse.ok) {
        throw new Error('Failed to update last sync timestamp');
      }
    } catch (error) {
      console.error('Error updating last sync timestamp:', error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Syncing with Google Sheets</DialogTitle>
        </DialogHeader>
        
        <div className="py-6">
          {status === 'syncing' && (
            <>
              <div className="flex justify-between mb-2">
                <span>Syncing data...</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </>
          )}
          
          {status === 'success' && (
            <div className="text-center">
              <CheckCircle2 className="h-16 w-16 text-[#4caf50] mx-auto mb-4" />
              <h4 className="text-lg font-medium mb-2">Sync Complete!</h4>
              <p className="text-text-secondary mb-4">
                All volunteer data has been successfully synced to Google Sheets.
              </p>
              <Button onClick={onClose}>Close</Button>
            </div>
          )}
          
          {status === 'error' && (
            <div className="text-center">
              <XCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
              <h4 className="text-lg font-medium mb-2">Sync Failed</h4>
              <p className="text-text-secondary mb-4">
                {errorMessage || "There was an error syncing to Google Sheets. Please check your configuration and try again."}
              </p>
              <Button onClick={onClose}>Close</Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
