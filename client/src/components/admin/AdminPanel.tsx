import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Download, RefreshCcw, Save, AlertCircle, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAdmin } from "@/hooks/useAdmin";
import { apiRequest } from "@/lib/queryClient";
import { useQuery } from "@tanstack/react-query";
import { PasswordChange, GoogleSheetsConfig } from "@shared/schema";

interface AdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSyncClick: () => void;
}

export default function AdminPanel({
  isOpen,
  onClose,
  onSyncClick
}: AdminPanelProps) {
  const { password } = useAdmin();
  // Password state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [isPasswordSubmitting, setIsPasswordSubmitting] = useState(false);
  
  // Google Sheets state
  const [sheetId, setSheetId] = useState("");
  const [serviceAccount, setServiceAccount] = useState("");
  const [sheetsError, setSheetsError] = useState("");
  const [isSheetsSubmitting, setIsSheetsSubmitting] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState("");
  
  const { toast } = useToast();
  
  // Fetch Google Sheets configuration
  const { data: sheetsConfig, isLoading } = useQuery<GoogleSheetsConfig>({
    queryKey: ['/api/admin/sheets-config'],
    enabled: isOpen && !!password,
    queryFn: async () => {
      const response = await fetch(`/api/admin/sheets-config?password=${encodeURIComponent(password)}`, {
        headers: {
          'X-ADMIN-PASSWORD': password
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch Google Sheets configuration');
      }
      
      return response.json();
    }
  });
  
  // Set Google Sheets config when data is loaded
  useEffect(() => {
    if (sheetsConfig) {
      setSheetId(sheetsConfig.sheetId || '');
      setServiceAccount(sheetsConfig.serviceAccount || '');
    }
  }, [sheetsConfig]);
  
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError("");
    
    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords don't match");
      return;
    }
    
    setIsPasswordSubmitting(true);
    
    try {
      const passwordData = {
        currentPassword,
        newPassword,
        confirmPassword
      };
      
      const response = await fetch('/api/admin/password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-ADMIN-PASSWORD': password
        },
        body: JSON.stringify(passwordData)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to change password');
      }
      
      toast({
        title: "Success",
        description: "Password changed successfully"
      });
      
      // Reset form
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      setPasswordError(error instanceof Error ? error.message : "Failed to change password");
    } finally {
      setIsPasswordSubmitting(false);
    }
  };
  
  const handleSheetsConfigSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSheetsError("");
    
    if (!sheetId.trim() || !serviceAccount.trim()) {
      setSheetsError("Both Sheet ID and Service Account JSON are required");
      return;
    }
    
    setIsSheetsSubmitting(true);
    
    try {
      // Use a header for admin authentication
      const config = {
        sheetId: sheetId.trim(),
        serviceAccount: serviceAccount.trim()
      };
      
      const headers = {
        'Content-Type': 'application/json',
        'X-ADMIN-PASSWORD': password
      };
      
      const response = await fetch('/api/admin/sheets-config', {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(config)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save configuration');
      }
      
      toast({
        title: "Success",
        description: "Google Sheets configuration saved"
      });
    } catch (error) {
      setSheetsError(error instanceof Error ? error.message : "Failed to save configuration");
    } finally {
      setIsSheetsSubmitting(false);
    }
  };
  
  const handleExportCsv = () => {
    // Create a new XMLHttpRequest instead of using anchor link
    const xhr = new XMLHttpRequest();
    xhr.open('GET', '/api/admin/export-csv', true);
    xhr.setRequestHeader('X-ADMIN-PASSWORD', password);
    xhr.responseType = 'blob';
    
    xhr.onload = function() {
      if (xhr.status === 200) {
        // Create a download link
        const url = window.URL.createObjectURL(new Blob([xhr.response]));
        const a = document.createElement('a');
        a.href = url;
        a.download = 'volunteer_events.csv';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        toast({
          title: "Error",
          description: "Failed to download CSV file",
          variant: "destructive"
        });
      }
    };
    
    xhr.send();
  };
  
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploadedFileName(file.name);
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        // Validate that it's a valid JSON
        JSON.parse(content);
        setServiceAccount(content);
        toast({
          title: "Success",
          description: "Service account JSON file loaded successfully"
        });
      } catch (error) {
        toast({
          title: "Error",
          description: "Invalid JSON file. Please upload a valid service account JSON file.",
          variant: "destructive"
        });
      }
    };
    reader.readAsText(file);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="flex flex-row items-center justify-between">
          <DialogTitle>Admin Panel</DialogTitle>
          <DialogClose asChild>
            <Button variant="ghost" size="icon">
              <X className="h-4 w-4" />
            </Button>
          </DialogClose>
        </DialogHeader>
        
        <Tabs defaultValue="data" className="mt-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="data">Data Management</TabsTrigger>
            <TabsTrigger value="sheets">Google Sheets</TabsTrigger>
            <TabsTrigger value="password">Change Password</TabsTrigger>
          </TabsList>
          
          <TabsContent value="data" className="py-4">
            <h3 className="text-lg font-medium mb-4">Data Management</h3>
            <div className="flex flex-wrap gap-3">
              <Button 
                onClick={handleExportCsv}
                className="bg-primary hover:bg-primary/90"
              >
                <Download className="mr-2 h-4 w-4" />
                Export CSV
              </Button>
              <Button 
                onClick={onSyncClick}
                className="bg-[#4caf50] hover:bg-[#4caf50]/90 text-white"
              >
                <RefreshCcw className="mr-2 h-4 w-4" />
                Sync to Google Sheets
              </Button>
            </div>
          </TabsContent>
          
          <TabsContent value="sheets" className="py-4">
            <h3 className="text-lg font-medium mb-4">Google Sheets Configuration</h3>
            
            {isLoading ? (
              <div className="text-center py-4">Loading configuration...</div>
            ) : (
              <form onSubmit={handleSheetsConfigSave} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="sheet-id">Google Sheet ID</Label>
                  <Input
                    id="sheet-id"
                    placeholder="Enter Google Sheet ID"
                    value={sheetId}
                    onChange={(e) => setSheetId(e.target.value)}
                    disabled={isSheetsSubmitting}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="service-account">Service Account JSON</Label>
                  <div className="mb-2">
                    <div className="flex items-center gap-2">
                      <Label 
                        htmlFor="service-account-file" 
                        className="cursor-pointer bg-primary/10 hover:bg-primary/20 px-3 py-2 rounded-md text-sm transition-colors"
                      >
                        Upload JSON File
                      </Label>
                      {uploadedFileName && (
                        <span className="text-xs text-text-secondary">{uploadedFileName}</span>
                      )}
                    </div>
                    <Input
                      id="service-account-file"
                      type="file"
                      accept=".json"
                      onChange={handleFileUpload}
                      disabled={isSheetsSubmitting}
                      className="hidden"
                    />
                  </div>
                  <Textarea
                    id="service-account"
                    placeholder="Or paste your service account JSON here"
                    value={serviceAccount}
                    onChange={(e) => setServiceAccount(e.target.value)}
                    disabled={isSheetsSubmitting}
                    className="h-36"
                  />
                </div>
                
                {sheetsError && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{sheetsError}</AlertDescription>
                  </Alert>
                )}
                
                <Button 
                  type="submit"
                  disabled={isSheetsSubmitting}
                  className="bg-primary hover:bg-primary/90"
                >
                  <Save className="mr-2 h-4 w-4" />
                  Save Configuration
                </Button>
              </form>
            )}
          </TabsContent>
          
          <TabsContent value="password" className="py-4">
            <h3 className="text-lg font-medium mb-4">Change Admin Password</h3>
            
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="current-password">Current Password</Label>
                <Input
                  id="current-password"
                  type="password"
                  placeholder="Enter current password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  disabled={isPasswordSubmitting}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <Input
                  id="new-password"
                  type="password"
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={isPasswordSubmitting}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm New Password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={isPasswordSubmitting}
                  required
                />
              </div>
              
              {passwordError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{passwordError}</AlertDescription>
                </Alert>
              )}
              
              <Button 
                type="submit"
                disabled={isPasswordSubmitting}
                className="bg-primary hover:bg-primary/90"
              >
                Change Password
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
