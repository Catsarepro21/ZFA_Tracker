import React from 'react';
import { createRoot } from 'react-dom/client';
import SimpleApp from './SimpleApp';
import './index.css';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element not found');
}

const root = createRoot(rootElement);
root.render(<SimpleApp />);