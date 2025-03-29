// TypeScript definitions for Electron preload API

interface Window {
  electron?: {
    isElectron: boolean;
    send: (channel: string, data: any) => void;
    receive: (channel: string, func: (...args: any[]) => void) => void;
    getVersion: () => Promise<string>;
    openExternal: (url: string) => Promise<void>;
  };
}