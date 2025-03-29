import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";

// Register service worker for PWA support
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then(registration => {
        console.log('Service Worker registered with scope:', registration.scope);
      })
      .catch(error => {
        console.error('Service Worker registration failed:', error);
      });
  });
}

// Check if app was launched from installed PWA
const isPWA = window.matchMedia('(display-mode: standalone)').matches || 
              (window.navigator as any).standalone === true;

// The FireOS detection (for tablet compatibility)
const userAgent = navigator.userAgent.toLowerCase();
const isFireOS = userAgent.indexOf('silk') > -1 || 
                userAgent.indexOf('kftt') > -1 || 
                userAgent.indexOf('kfot') > -1 || 
                userAgent.indexOf('kfjwi') > -1 || 
                userAgent.indexOf('kfjwa') > -1 || 
                userAgent.indexOf('kfsowi') > -1 || 
                userAgent.indexOf('kfthwi') > -1 || 
                userAgent.indexOf('kfthwa') > -1 || 
                userAgent.indexOf('kfapwi') > -1 || 
                userAgent.indexOf('kfapwa') > -1;

// Add classes to body for conditional styling if needed
if (isPWA) document.body.classList.add('pwa-mode');
if (isFireOS) document.body.classList.add('fire-os');

createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <App />
    <Toaster />
  </QueryClientProvider>
);
