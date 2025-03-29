import React from 'react';
import ReactDOM from 'react-dom/client';

function SimpleApp() {
  return (
    <div>
      <h1>Hello from Simple React App</h1>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<SimpleApp />);