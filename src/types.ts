/**
 * Type definitions for IPC library
 */

export type AsyncCallback = (...args: any[]) => Promise<any>;

export type IPCMessage =
  | { id: string; type: 'call'; method: string; args?: any[] }
  | { id: string; type: 'response'; result?: any }
  | { id: string; type: 'error'; error?: string }
  | { id: string; type: 'callback'; callbackId: string; args?: any[] };

export interface IPCHandler {
  handler: AsyncCallback;
  description?: string;
}

export interface PendingCall {
  resolve: (value: any) => void;
  reject: (reason: any) => void;
}
