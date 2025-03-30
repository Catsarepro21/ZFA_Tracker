// client/src/config.ts

/**
 * API configuration for the application
 * 
 * In development: Uses the specified URL or localhost:5000
 * In production: Uses relative URLs (empty base path)
 */
const config = {
  // In production, API calls will be relative to the current domain
  // In development, use localhost or the provided VITE_API_URL
  apiUrl: import.meta.env.DEV 
    ? (import.meta.env.VITE_API_URL || 'http://localhost:5000') 
    : ''
};

export default config;
