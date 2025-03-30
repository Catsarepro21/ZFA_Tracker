import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// Remove Replit-specific plugins for Render deployment
export default defineConfig({
  plugins: [
    react(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './client/src'),
      '@shared': path.resolve(__dirname, './shared'),
      '@assets': path.resolve(__dirname, './client/assets'),
    },
  },
  build: {
    outDir: 'dist/client',
    emptyOutDir: true,
  },
});
