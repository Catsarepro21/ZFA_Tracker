import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Get root element
const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Root element not found");

// Create root
const root = createRoot(rootElement);

// Render App component
root.render(<App />);
