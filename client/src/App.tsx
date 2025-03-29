import { Switch, Route, useLocation } from "wouter";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import { OfflineIndicator } from "@/components/ui/offline-indicator";
import { InstallPrompt } from "@/components/ui/install-prompt";
import { useEffect } from "react";

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

  // Parse URL query parameters to handle PWA shortcut actions
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const action = params.get('action');
    
    if (action) {
      // Handle PWA shortcut actions
      switch (action) {
        case 'add-volunteer':
          // Dispatch event to open add volunteer modal
          window.dispatchEvent(new CustomEvent('open-add-volunteer-modal'));
          break;
        case 'add-event':
          // Dispatch event to open add event modal
          window.dispatchEvent(new CustomEvent('open-add-event-modal'));
          break;
        default:
          break;
      }
      
      // Remove the action parameter from URL to avoid triggering again on refresh
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }
  }, [location]);

  return (
    <>
      <Router />
      <OfflineIndicator />
      <InstallPrompt />
    </>
  );
}

export default App;
