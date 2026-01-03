/**
 * IPC Library for webview-bun
 * Supports bidirectional communication with callbacks and return objects
 */

import type { IPCMessage, IPCHandler, AsyncCallback, PendingCall } from './types.js';
import { getInitHTML } from './webview-client.js';

// Re-export types for convenience
export type { IPCMessage, IPCHandler, AsyncCallback, PendingCall } from './types.js';

export class IPC {
  private handlers: Map<string, IPCHandler> = new Map();
  private callbacks: Map<string, AsyncCallback> = new Map();
  private pendingCalls: Map<string, PendingCall> = new Map();
  private webview: any;
  private isWebViewReady: boolean = false;

  constructor(webview?: any) {
    this.webview = webview;
    this.setupWebViewBridge();
  }

  /**
   * Set up the webview bridge for communication
   */
  private setupWebViewBridge() {
    if (!this.webview) {
      console.warn('IPC: No webview instance provided. IPC will be initialized later.');
      return;
    }

    // Expose IPC functions to the webview - bind sends messages FROM WebView TO Bun
    this.webview.bind('ipc_send', (message: string) => {
      console.log('IPC: Received message from WebView:', message);
      try {
        const parsed: IPCMessage = JSON.parse(message);
        this.handleMessage(parsed);
      } catch (error) {
        console.error('IPC: Failed to parse message:', error);
      }
    });

    // Note: The webview side should be initialized via the IPC.getInitScript() method
    // which should be injected into the HTML content
    this.isWebViewReady = true;
    console.log('IPC: Bun side initialized, waiting for WebView...');
  }

  /**
   * Get the initialization script for the webview
   * This should be injected into the HTML content
   */
  static getInitScript(): string {
    return getInitHTML();
  }


  /**
   * Handle incoming messages from the webview
   */
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

  /**
   * Handle method calls from the webview
   */
  private async handleCall(message: IPCMessage) {
    const { id, method, args = [] } = message;
    if (!id || !method) return;
    
    const handler = this.handlers.get(method);

    if (!handler) {
      this.sendToWebView({
        id,
        type: 'error',
        error: `Method '${method}' not found`
      });
      return;
    }

    try {
      // Process arguments, replacing callback objects with actual functions
      const processedArgs = args.map((arg: any) => {
        if (arg && typeof arg === 'object' && arg.__callback && arg.id) {
          return (...callbackArgs: any[]) => {
            this.sendToWebView({
              id: this.generateId(),
              type: 'callback',
              callbackId: arg.id,
              args: callbackArgs
            });
          };
        }
        return arg;
      });

      const result = await handler.handler(...processedArgs);
      
      this.sendToWebView({
        id,
        type: 'response',
        result
      });
    } catch (error) {
      this.sendToWebView({
        id,
        type: 'error',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Handle callback calls from the webview
   */
  private async handleCallback(message: IPCMessage) {
    const { callbackId, args = [] } = message;
    if (!callbackId) return;
    
    const callback = this.callbacks.get(callbackId);

    if (callback) {
      try {
        await callback(...(args || []));
      } catch (error) {
        console.error(`IPC: Error in callback ${callbackId}:`, error);
      }
    }
  }

  /**
   * Handle response messages from the webview
   */
  private handleResponse(message: IPCMessage) {
    const { id, result } = message;
    if (!id) return;
    
    const pending = this.pendingCalls.get(id);
    
    if (pending) {
      pending.resolve(result);
      this.pendingCalls.delete(id);
    }
  }

  /**
   * Handle error messages from the webview
   */
  private handleError(message: IPCMessage) {
    const { id, error } = message;
    if (!id) return;
    
    const pending = this.pendingCalls.get(id);
    
    if (pending) {
      pending.reject(new Error(error));
      this.pendingCalls.delete(id);
    }
  }

  /**
   * Send a message to the webview
   */
  private sendToWebView(message: IPCMessage) {
    if (!this.webview) {
      throw new Error('IPC: Webview not initialized');
    }
    
    const messageStr = JSON.stringify(message);
    console.log('IPC: Sending to WebView:', message);
    
    // Try multiple approaches to ensure the message reaches the WebView
    try {
      // Approach 1: Direct eval with properly escaped string
      const escapedMessage = messageStr.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
      this.webview.eval(`window.ipc_onmessage && window.ipc_onmessage('${escapedMessage}')`);
    } catch (error) {
      console.error('IPC: Failed to send via eval:', error);
      
      // Approach 2: Try with setTimeout to ensure message is processed
      try {
        this.webview.eval(`setTimeout(() => window.ipc_onmessage && window.ipc_onmessage('${messageStr.replace(/"/g, '\\"')}'), 0)`);
      } catch (error2) {
        console.error('IPC: Failed to send via setTimeout:', error2);
      }
    }
  }

  /**
   * Register a handler for a method
   */
  register(method: string, handler: AsyncCallback, description?: string) {
    this.handlers.set(method, { handler, description });
  }

  /**
   * Unregister a handler
   */
  unregister(method: string) {
    this.handlers.delete(method);
  }

  /**
   * Call a method on the webview side
   */
  async call(method: string, ...args: any[]): Promise<any> {
    if (!this.isWebViewReady) {
      throw new Error('IPC: Webview not ready');
    }

    const id = this.generateId();
    
    // Process arguments, replacing callback functions with callback objects
    const processedArgs = args.map((arg, index) => {
      if (typeof arg === 'function') {
        const callbackId = 'cb_' + method + '_' + index + '_' + Date.now();
        this.callbacks.set(callbackId, arg);
        return { __callback: true, id: callbackId };
      }
      return arg;
    });

    return new Promise((resolve, reject) => {
      this.pendingCalls.set(id, { resolve, reject });
      
      this.sendToWebView({
        id,
        type: 'call',
        method,
        args: processedArgs
      });
    });
  }

  /**
   * Generate a unique message ID
   */
  private generateId(): string {
    return 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Get all registered methods
   */
  getMethods(): string[] {
    return Array.from(this.handlers.keys());
  }

  /**
   * Check if a method is registered
   */
  hasMethod(method: string): boolean {
    return this.handlers.has(method);
  }

  /**
   * Clear all handlers and callbacks
   */
  clear() {
    this.handlers.clear();
    this.callbacks.clear();
    this.pendingCalls.clear();
  }
}

export default IPC;
