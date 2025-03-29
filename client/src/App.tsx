import { useState } from "react";

// Simple App component for initial testing
function App() {
  const [count, setCount] = useState(0);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-100">
      <header className="bg-primary text-white p-4 shadow-md w-full mb-8 text-center">
        <h1 className="text-xl font-medium">Volunteer Tracker</h1>
      </header>
      
      <div className="bg-white p-8 rounded-lg shadow-md">
        <h2 className="text-2xl font-bold mb-4">Welcome to Volunteer Tracker</h2>
        <p className="mb-4">We're fixing the application.</p>
        
        <div className="flex items-center justify-center gap-4 mt-6">
          <button 
            onClick={() => setCount(c => c - 1)}
            className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
          >
            -
          </button>
          <span className="text-xl font-bold">{count}</span>
          <button 
            onClick={() => setCount(c => c + 1)}
            className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90"
          >
            +
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;
