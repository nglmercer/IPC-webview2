# IPC Library for webview-bun

A powerful IPC (Inter-Process Communication) library for webview-bun that supports bidirectional communication with callbacks and return objects.

## Features

- ✅ **Bidirectional Communication**: Send messages from Bun to WebView and vice versa
- ✅ **Callback Support**: Pass JavaScript functions as callbacks that work across the bridge
- ✅ **Return Objects**: Methods can return complex objects and data structures
- ✅ **Promise-based**: All async operations use Promises for clean async/await syntax
- ✅ **TypeScript Support**: Full TypeScript definitions included
- ✅ **Error Handling**: Comprehensive error handling across the IPC bridge

## Installation

The library is already included in this project with `webview-bun` as a dependency.

```bash
# Dependencies are already installed
bun install
```

## Quick Start

### Basic Usage

```typescript
import { Webview } from "webview-bun";
import IPC from "./src/ipc.js";

// Create webview instance
const webview = new Webview();
webview.title = "My App";
webview.size = { width: 800, height: 600, hint: 1 };

// Initialize IPC
const ipc = new IPC(webview);

// Register a handler that can be called from WebView
ipc.register("greet", async (name: string) => {
  return { message: `Hello, ${name}!`, timestamp: Date.now() };
});

// Start webview
webview.navigate("data:text/html,<h1>Hello</h1>");
webview.run();
```

### Using Callbacks

```typescript
// Register a handler with a callback
ipc.register("processData", async (data: any[], callback: (progress: number) => void) => {
  for (let i = 0; i < data.length; i++) {
    // Process data
    await processItem(data[i]);
    
    // Update progress via callback
    const progress = Math.round(((i + 1) / data.length) * 100);
    callback(progress);
  }
  
  return { success: true, processed: data.length };
});
```

### Multiple Callbacks

```typescript
ipc.register("complexOperation", async (
  params: any,
  onSuccess: (result: any) => void,
  onError: (error: string) => void
) => {
  try {
    const result = await performOperation(params);
    onSuccess(result);
    return { status: "completed" };
  } catch (error) {
    onError(error.message);
    return { status: "failed" };
  }
});
```

## WebView API

The IPC library automatically injects a global `ipc` object into the WebView context.

### Calling Bun Methods from WebView

```javascript
// Simple call
const result = await window.ipc.call('greet', 'World');
console.log(result); // { message: "Hello, World!", timestamp: 1234567890 }

// Call with callback
await window.ipc.call('processData', [1, 2, 3, 4, 5], (progress) => {
  console.log('Progress:', progress + '%');
});

// Call with multiple callbacks
await window.ipc.call('complexOperation', { value: 42 },
  (result) => console.log('Success:', result),
  (error) => console.error('Error:', error)
);
```

## Bun API

### Registering Handlers

```typescript
// Register a simple handler
ipc.register('methodName', async (arg1, arg2) => {
  // Your logic here
  return { result: 'data' };
});

// Register with description (for documentation)
ipc.register('getData', async (id: number) => {
  return { id, name: `Item ${id}` };
}, 'Fetch data by ID');
```

### Calling WebView Methods

```typescript
// Call a method on the WebView side
const result = await ipc.call('webViewMethod', arg1, arg2);
```

### Managing Handlers

```typescript
// Check if a method is registered
if (ipc.hasMethod('getData')) {
  console.log('Method exists');
}

// Get all registered methods
const methods = ipc.getMethods();
console.log('Available methods:', methods);

// Unregister a method
ipc.unregister('oldMethod');

// Clear all handlers and callbacks
ipc.clear();
```

## Example

Run the included example to see the IPC library in action:

```bash
bun run example.ts
```

This will launch a webview window with several interactive examples demonstrating:
- Simple method calls with return objects
- Data fetching with async operations
- Progress callbacks for long-running operations
- Complex operations with success/error callbacks
- File list retrieval

## How It Works

1. **Message Types**: The library uses JSON messages with types:
   - `call`: Call a method
   - `callback`: Execute a callback
   - `response`: Return a result
   - `error`: Return an error

2. **Callback Serialization**: Functions are serialized into callback IDs, allowing them to cross the bridge and be called later.

3. **Promise Handling**: All async operations use Promises, making it easy to use async/await syntax.

4. **Error Propagation**: Errors are properly caught and propagated across the bridge with detailed error messages.

## Advanced Usage

### Custom Error Handling

```typescript
ipc.register('riskyOperation', async (input: string) => {
  if (!input) {
    throw new Error('Input is required');
  }
  
  try {
    const result = await performRiskyTask(input);
    return result;
  } catch (error) {
    // Error will be automatically propagated to WebView
    throw error;
  }
});
```

### Async Operations

```typescript
ipc.register('fetchData', async (url: string) => {
  const response = await fetch(url);
  const data = await response.json();
  return data;
});
```

### Streaming with Callbacks

```typescript
ipc.register('streamData', async (
  count: number,
  onItem: (item: any) => void,
  onComplete: () => void
) => {
  for (let i = 0; i < count; i++) {
    const item = await fetchItem(i);
    onItem(item);
  }
  onComplete();
  return { total: count };
});
```

## API Reference

### IPC Class

#### Constructor
```typescript
constructor(webview?: Webview)
```

#### Methods

- `register(method: string, handler: AsyncCallback, description?: string)` - Register a handler
- `unregister(method: string)` - Unregister a handler
- `call(method: string, ...args: any[]): Promise<any>` - Call a method on the other side
- `hasMethod(method: string): boolean` - Check if a method is registered
- `getMethods(): string[]` - Get all registered method names
- `clear()` - Clear all handlers and callbacks

### Types

```typescript
type AsyncCallback = (...args: any[]) => Promise<any>;

interface IPCMessage {
  id: string;
  type: 'call' | 'callback' | 'response' | 'error';
  method?: string;
  args?: any[];
  callbackId?: string;
  result?: any;
  error?: string;
}
```

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.
