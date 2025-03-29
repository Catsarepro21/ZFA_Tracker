import React, { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';

// Basic Counter component
function Counter() {
  // No custom hooks, just basic React useState
  const [count, setCount] = useState(0);
  
  return (
    <div className="p-4 border rounded-lg bg-white shadow-md">
      <h2 className="text-xl font-bold mb-4">Counter Test</h2>
      <div className="flex items-center justify-center gap-4">
        <button 
          onClick={() => setCount(count - 1)}
          className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
        >
          -
        </button>
        <span className="text-2xl font-bold">{count}</span>
        <button 
          onClick={() => setCount(count + 1)}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          +
        </button>
      </div>
    </div>
  );
}

// App Component
function MinimalApp() {
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
      <h1 className="text-3xl font-bold mb-8">Minimal React App</h1>
      <Counter />
    </div>
  );
}

// Get root element
const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element not found');
}

// Create root and render
const root = createRoot(rootElement);
root.render(
  <StrictMode>
    <MinimalApp />
  </StrictMode>
);