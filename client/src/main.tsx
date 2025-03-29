import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { register as registerServiceWorker } from "./lib/serviceWorker";
import { Toaster } from "@/components/ui/toaster";
import { StrictMode } from "react";

// Register service worker for PWA functionality
if (import.meta.env.PROD) {
  registerServiceWorker({
    onSuccess: () => console.log('Service Worker registration successful'),
    onUpdate: () => console.log('New content available; please refresh')
  });
}

// Create root element
const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Root element not found");

const root = createRoot(rootElement);

// Render without StrictMode for development to avoid double-rendering
root.render(
  <QueryClientProvider client={queryClient}>
    <App />
    <Toaster />
  </QueryClientProvider>
);
