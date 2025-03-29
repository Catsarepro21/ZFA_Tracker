import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { register as registerServiceWorker } from "./lib/serviceWorker";
import { Toaster } from "@/components/ui/toaster";

// Register service worker for PWA functionality
if (import.meta.env.PROD) {
  registerServiceWorker({
    onSuccess: () => console.log('Service Worker registration successful'),
    onUpdate: () => console.log('New content available; please refresh')
  });
}

createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <App />
    <Toaster />
  </QueryClientProvider>
);
