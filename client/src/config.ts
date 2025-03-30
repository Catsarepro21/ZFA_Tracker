// client/src/config.ts
const config = {
  // In production, API calls will be relative to the current domain
  apiUrl: import.meta.env.DEV ? 'http://localhost:5000' : ''
};

export default config;
