/**
 * WebView-side IPC client
 * This code runs inside the WebView context
 */

export function getWebViewClientScript(): string {
  return `
    (function() {
      console.log('IPC: Starting WebView client initialization...');
      
      const ipc = {
        idCounter: 0,
        callbacks: new Map(),
        pendingCalls: new Map(),
        
        generateId() {
          return 'msg_' + (++this.idCounter) + '_' + Date.now();
        },
        
        // Send a message to the Bun side using the bound function
        send(message) {
          if (typeof window.ipc_send === 'function') {
            const messageStr = JSON.stringify(message);
            console.log('IPC: WebView sending to Bun:', message);
            window.ipc_send(messageStr);
          } else {
            console.error('IPC: ipc_send function not available');
            throw new Error('IPC bridge not initialized');
          }
        },
        
        // Call a method on the Bun side
        async call(method, ...args) {
          const id = this.generateId();
          console.log('IPC: WebView calling method:', method, 'with id:', id);
          
          return new Promise((resolve, reject) => {
            this.pendingCalls.set(id, { resolve, reject });
            
            // Set a timeout to prevent hanging
            const timeout = setTimeout(() => {
              this.pendingCalls.delete(id);
              reject(new Error('IPC call timeout'));
            }, 30000);
            
            // Store original resolve/reject to clear timeout
            const originalResolve = resolve;
            const originalReject = reject;
            
            // Wrap resolve to clear timeout
            this.pendingCalls.set(id, {
              resolve: (...args) => {
                clearTimeout(timeout);
                return originalResolve(...args);
              },
              reject: (...args) => {
                clearTimeout(timeout);
                return originalReject(...args);
              }
            });
            
            // Replace callback functions with callback IDs
            const processedArgs = args.map((arg, index) => {
              if (typeof arg === 'function') {
                const callbackId = 'cb_' + method + '_' + index + '_' + Date.now();
                this.callbacks.set(callbackId, arg);
                return { __callback: true, id: callbackId };
              }
              return arg;
            });
            
            this.send({
              id: id,
              type: 'call',
              method: method,
              args: processedArgs
            });
          });
        },
        
        // Handle incoming messages from Bun
        handleMessage(message) {
          console.log('IPC: WebView received from Bun:', message);
          
          if (message.type === 'response') {
            const pending = this.pendingCalls.get(message.id);
            if (pending) {
              console.log('IPC: WebView resolving promise for id:', message.id);
              pending.resolve(message.result);
              this.pendingCalls.delete(message.id);
            } else {
              console.warn('IPC: WebView no pending call found for id:', message.id);
            }
          } else if (message.type === 'error') {
            const pending = this.pendingCalls.get(message.id);
            if (pending) {
              console.log('IPC: WebView rejecting promise for id:', message.id);
              pending.reject(new Error(message.error));
              this.pendingCalls.delete(message.id);
            } else {
              console.warn('IPC: WebView no pending call found for error id:', message.id);
            }
          } else if (message.type === 'callback') {
            const callback = this.callbacks.get(message.callbackId);
            if (callback) {
              console.log('IPC: WebView executing callback:', message.callbackId);
              try {
                callback(...(message.args || []));
              } catch (error) {
                console.error('IPC: WebView callback error:', error);
              }
            } else {
              console.warn('IPC: WebView no callback found for id:', message.callbackId);
            }
          }
        }
      };
      
      // Listen for messages from Bun
      window.ipc_onmessage = (messageStr) => {
        console.log('IPC: WebView ipc_onmessage called');
        try {
          const message = JSON.parse(messageStr);
          ipc.handleMessage(message);
        } catch (error) {
          console.error('IPC: WebView failed to parse message:', error);
        }
      };
      
      // Expose to global scope
      window.ipc = ipc;
      console.log('IPC: WebView client initialized successfully');
      console.log('IPC: ipc_send available:', typeof window.ipc_send);
    })();
  `;
}

export function getInitHTML(): string {
  return `<script>${getWebViewClientScript()}<\/script>`;
}
