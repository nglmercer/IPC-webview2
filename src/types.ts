/**
 * Type definitions for IPC library
 */

export type AsyncCallback = (...args: any[]) => Promise<any>;

export interface IPCMessage {
  id: string;
  type: 'call' | 'callback' | 'response' | 'error';
  method?: string;
  args?: any[];
  callbackId?: string;
  result?: any;
  error?: string;
}

export interface IPCHandler {
  handler: AsyncCallback;
  description?: string;
}

export interface PendingCall {
  resolve: (value: any) => void;
  reject: (reason: any) => void;
}
