/**
 * WebView-side IPC client
 * This code runs inside WebView context
 */

function getWebViewClientScript(): string {
  return `
    (function() {
      const ipc = {
        idCounter: 0,
        callbacks: new Map(),
        pendingCalls: new Map(),
        
        generateId() {
          return 'msg_' + (++this.idCounter) + '_' + Date.now();
        },
        
        send(message) {
          if (typeof window.ipc_send !== 'function') {
            throw new Error('IPC bridge not initialized');
          }
          window.ipc_send(JSON.stringify(message));
        },
        
        async call(method, ...args) {
          const id = this.generateId();
          
          return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
              this.pendingCalls.delete(id);
              reject(new Error('IPC call timeout'));
            }, 30000);
            
            this.pendingCalls.set(id, {
              resolve: (val) => { clearTimeout(timeout); resolve(val); },
              reject: (err) => { clearTimeout(timeout); reject(err); }
            });
            
            const processedArgs = args.map((arg, index) => {
              if (typeof arg === 'function') {
                const callbackId = 'cb_' + method + '_' + index + '_' + Date.now();
                this.callbacks.set(callbackId, arg);
                return { __callback: true, id: callbackId };
              }
              return arg;
            });
            
            this.send({ id, type: 'call', method, args: processedArgs });
          });
        },
        
        handleMessage(message) {
          switch (message.type) {
            case 'response': {
              const pending = this.pendingCalls.get(message.id);
              if (pending) {
                pending.resolve(message.result);
                this.pendingCalls.delete(message.id);
              }
              break;
            }
            case 'error': {
              const pending = this.pendingCalls.get(message.id);
              if (pending) {
                pending.reject(new Error(message.error));
                this.pendingCalls.delete(message.id);
              }
              break;
            }
            case 'callback': {
              const callback = this.callbacks.get(message.callbackId);
              if (callback) {
                callback(...(message.args || []));
              }
              break;
            }
          }
        }
      };
      
      window.addEventListener('message', (event) => {
        if (event.data?.startsWith?.('IPC:')) {
          try {
            ipc.handleMessage(JSON.parse(event.data.slice(4)));
          } catch (error) {
            console.error('IPC: WebView failed to parse message:', error);
          }
        }
      });
      
      window.ipc_onmessage = (messageStr) => {
        try {
          ipc.handleMessage(JSON.parse(messageStr));
        } catch (error) {
          console.error('IPC: WebView failed to parse message:', error);
        }
      };
      
      window.ipc = ipc;
    })();
  `;
}

export function getInitHTML(): string {
  return `<script>${getWebViewClientScript()}<\/script>`;
}
