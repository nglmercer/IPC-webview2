/**
 * IPC Library for webview-bun
 * 
 * A powerful IPC (Inter-Process Communication) library for webview-bun
 * that supports bidirectional communication with callbacks and return objects.
 * 
 * @see README.md for documentation and usage examples
 * @see example.ts for a complete working example
 * @see src/ipc.ts for the IPC implementation
 */

// Export the main IPC class
export { IPC } from './src/ipc.js';

// Export types
export type { IPCMessage, IPCHandler, AsyncCallback } from './src/ipc.js';

// Export default
export { default as default } from './src/ipc.js';

console.log("IPC Library loaded successfully!");
console.log("Run 'bun run example.ts' to see the library in action.");
