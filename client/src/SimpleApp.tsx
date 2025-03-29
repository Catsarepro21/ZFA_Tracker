import React from 'react';

// Simple counter component
const Counter = () => {
  const [count, setCount] = React.useState(0);
  
  return (
    <div className="p-4 border rounded-lg bg-white shadow-md">
      <h2 className="text-xl font-bold mb-4">Counter Test</h2>
      <div className="flex items-center justify-center gap-4">
        <button 
          onClick={() => setCount(c => c - 1)}
          className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
        >
          -
        </button>
        <span className="text-2xl font-bold">{count}</span>
        <button 
          onClick={() => setCount(c => c + 1)}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          +
        </button>
      </div>
    </div>
  );
};

// Main app component
const SimpleApp = () => {
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
      <h1 className="text-3xl font-bold mb-8">React Test App</h1>
      <Counter />
    </div>
  );
};

export default SimpleApp;