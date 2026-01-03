/**
 * IPC Library for webview-bun
 * Supports bidirectional communication with callbacks and return objects
 */

import type { IPCMessage, IPCHandler, AsyncCallback, PendingCall } from './types.js';
import { getInitHTML } from './webview-client.js';

// Re-export types for convenience
export type { IPCMessage, IPCHandler, AsyncCallback, PendingCall } from './types.js';

export class IPC {
  private handlers = new Map<string, IPCHandler>();
  private callbacks = new Map<string, AsyncCallback>();
  private pendingCalls = new Map<string, PendingCall>();
  private webview?: any;

  constructor(webview?: any) {
    this.webview = webview;
    this.setupWebViewBridge();
  }

  private setupWebViewBridge() {
    if (!this.webview) return;

    this.webview.bind('ipc_send', (message: string) => {
      try {
        const parsed: IPCMessage = JSON.parse(message);
        this.handleMessage(parsed);
      } catch (error) {
        console.error('IPC: Failed to parse message:', error);
      }
    });
  }

  static getInitScript(): string {
    return getInitHTML();
  }

  private async handleMessage(message: IPCMessage) {
    switch (message.type) {
      case 'call':
        await this.handleCall(message);
        break;
      case 'callback':
        await this.handleCallback(message);
        break;
      case 'response':
        this.handleResponse(message);
        break;
      case 'error':
        this.handleError(message);
        break;
    }
  }

  private async handleCall(message: IPCMessage & { type: 'call' }) {
    const { id, method, args = [] } = message;
    const handler = this.handlers.get(method);

    if (!handler) {
      this.sendToWebView({ id, type: 'error', error: `Method '${method}' not found` });
      return;
    }

    try {
      const processedArgs = args.map(arg =>
        arg?.__callback && arg.id
          ? (...callbackArgs: any[]) =>
              this.sendToWebView({
                id: this.generateId(),
                type: 'callback',
                callbackId: arg.id,
                args: callbackArgs
              })
          : arg
      );

      const result = await handler.handler(...processedArgs);
      this.sendToWebView({ id, type: 'response', result });
    } catch (error) {
      this.sendToWebView({
        id,
        type: 'error',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  private async handleCallback(message: IPCMessage & { type: 'callback' }) {
    const callback = this.callbacks.get(message.callbackId);
    if (callback) {
      try {
        await callback(...(message.args || []));
      } catch (error) {
        console.error(`IPC: Error in callback ${message.callbackId}:`, error);
      }
    }
  }

  private handleResponse(message: IPCMessage & { type: 'response' }) {
    const pending = this.pendingCalls.get(message.id);
    if (pending) {
      pending.resolve(message.result);
      this.pendingCalls.delete(message.id);
    }
  }

  private handleError(message: IPCMessage & { type: 'error' }) {
    const pending = this.pendingCalls.get(message.id);
    if (pending) {
      pending.reject(new Error(message.error));
      this.pendingCalls.delete(message.id);
    }
  }

  private sendToWebView(message: IPCMessage) {
    if (!this.webview) throw new Error('IPC: Webview not initialized');
    
    const messageStr = JSON.stringify(message);
    const escaped = messageStr.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    this.webview.eval(`window.ipc_onmessage && window.ipc_onmessage('${escaped}')`);
  }

  register(method: string, handler: AsyncCallback, description?: string) {
    this.handlers.set(method, { handler, description });
  }

  unregister(method: string) {
    this.handlers.delete(method);
  }

  async call(method: string, ...args: any[]): Promise<any> {
    const id = this.generateId();
    const processedArgs = args.map((arg, index) => {
      if (typeof arg === 'function') {
        const callbackId = `cb_${method}_${index}_${Date.now()}`;
        this.callbacks.set(callbackId, arg);
        return { __callback: true, id: callbackId };
      }
      return arg;
    });

    return new Promise((resolve, reject) => {
      this.pendingCalls.set(id, { resolve, reject });
      this.sendToWebView({ id, type: 'call', method, args: processedArgs });
    });
  }

  private generateId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  getMethods(): string[] {
    return Array.from(this.handlers.keys());
  }

  hasMethod(method: string): boolean {
    return this.handlers.has(method);
  }

  clear() {
    this.handlers.clear();
    this.callbacks.clear();
    this.pendingCalls.clear();
  }
}

export default IPC;
