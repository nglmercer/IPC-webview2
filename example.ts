import { Webview } from "webview-bun-fork";
import IPC from "./src/ipc.js";

// Create webview instance
const webview = new Webview();
webview.title = "IPC Example";
webview.size = { width: 800, height: 600, hint: 1 };

// Initialize IPC
const ipc = new IPC(webview);

// Register handlers that can be called from the webview
ipc.register("greet", async (name: string) => {
  console.log(`Bun: Received greet request for ${name}`);
  return { message: `Hello, ${name}!`, timestamp: Date.now() };
}, "Simple greeting handler");

ipc.register("getData", async (id: number) => {
  console.log(`Bun: Fetching data for ID ${id}`);
  // Simulate async operation
  await new Promise(resolve => setTimeout(resolve, 100));
  return {
    id,
    name: `Item ${id}`,
    description: `This is item ${id}`,
    createdAt: new Date().toISOString()
  };
}, "Fetch data by ID");

ipc.register("processWithCallback", async (data: any[], callback: (progress: number) => void) => {
  console.log(`Bun: Processing ${data.length} items with callback`);
  for (let i = 0; i < data.length; i++) {
    // Simulate processing
    await new Promise(resolve => setTimeout(resolve, 200));
    const progress = Math.round(((i + 1) / data.length) * 100);
    console.log(`Bun: Progress ${progress}%`);
    callback(progress);
  }
  return { success: true, processed: data.length };
}, "Process items with progress callback");

ipc.register("complexOperation", async (params: any, onSuccess: (result: any) => void, onError: (error: string) => void) => {
  console.log(`Bun: Complex operation with params:`, params);
  
  if (!params.value) {
    onError("Value is required");
    return { success: false };
  }
  
  try {
    const result = {
      value: params.value * 2,
      timestamp: Date.now()
    };
    onSuccess(result);
    return { success: true };
  } catch (error) {
    onError(error instanceof Error ? error.message : "Unknown error");
    return { success: false };
  }
}, "Complex operation with success/error callbacks");

ipc.register("getFileList", async () => {
  console.log(`Bun: Getting file list`);
  // Return a list of files
  return {
    files: [
      { name: "document.txt", size: 1024, type: "text" },
      { name: "image.png", size: 2048, type: "image" },
      { name: "data.json", size: 512, type: "json" }
    ],
    total: 3
  };
}, "Get list of files");

// HTML content for the webview
const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>IPC Example</title>
  ${IPC.getInitScript()}
  <style>
    body {
      font-family: Arial, sans-serif;
      padding: 20px;
      max-width: 800px;
      margin: 0 auto;
    }
    .section {
      margin: 20px 0;
      padding: 15px;
      border: 1px solid #ddd;
      border-radius: 5px;
    }
    button {
      padding: 10px 15px;
      margin: 5px;
      cursor: pointer;
      background: #007bff;
      color: white;
      border: none;
      border-radius: 3px;
    }
    button:hover {
      background: #0056b3;
    }
    #log {
      background: #f5f5f5;
      padding: 10px;
      border-radius: 3px;
      max-height: 300px;
      overflow-y: auto;
      font-family: monospace;
      font-size: 12px;
    }
    .log-entry {
      margin: 2px 0;
      padding: 2px 5px;
    }
    .log-info { color: #333; }
    .log-success { color: #28a745; }
    .log-error { color: #dc3545; }
  </style>
</head>
<body>
  <h1>IPC Example - webview-bun</h1>
  
  <div class="section">
    <h2>Simple Call</h2>
    <button onclick="testGreet()">Test Greet</button>
    <div id="greet-result"></div>
  </div>
  
  <div class="section">
    <h2>Fetch Data</h2>
    <button onclick="testGetData()">Get Data (ID: 42)</button>
    <div id="data-result"></div>
  </div>
  
  <div class="section">
    <h2>Callback Example</h2>
    <button onclick="testCallback()">Test with Callback</button>
    <div id="callback-result"></div>
  </div>
  
  <div class="section">
    <h2>Complex Operation</h2>
    <button onclick="testComplex()">Test Complex Operation</button>
    <div id="complex-result"></div>
  </div>
  
  <div class="section">
    <h2>File List</h2>
    <button onclick="testFileList()">Get File List</button>
    <div id="files-result"></div>
  </div>
  
  <div class="section">
    <h2>Log</h2>
    <div id="log"></div>
  </div>

  <script>
    function log(message, type = 'info') {
      const logDiv = document.getElementById('log');
      const entry = document.createElement('div');
      entry.className = 'log-entry log-' + type;
      entry.textContent = new Date().toLocaleTimeString() + ' - ' + message;
      logDiv.appendChild(entry);
      logDiv.scrollTop = logDiv.scrollHeight;
    }
    
    async function testGreet() {
      try {
        log('Calling greet...', 'info');
        const result = await window.ipc.call('greet', 'World');
        log('Greet result: ' + JSON.stringify(result), 'success');
        document.getElementById('greet-result').innerHTML = 
          '<pre>' + JSON.stringify(result, null, 2) + '</pre>';
      } catch (error) {
        log('Error: ' + error.message, 'error');
      }
    }
    
    async function testGetData() {
      try {
        log('Calling getData...', 'info');
        const result = await window.ipc.call('getData', 42);
        log('Data result: ' + JSON.stringify(result), 'success');
        document.getElementById('data-result').innerHTML = 
          '<pre>' + JSON.stringify(result, null, 2) + '</pre>';
      } catch (error) {
        log('Error: ' + error.message, 'error');
      }
    }
    
    async function testCallback() {
      try {
        log('Calling processWithCallback...', 'info');
        const resultDiv = document.getElementById('callback-result');
        resultDiv.innerHTML = 'Processing...<br>';
        
        const data = [1, 2, 3, 4, 5];
        const result = await window.ipc.call('processWithCallback', data, (progress) => {
          log('Progress: ' + progress + '%', 'info');
          resultDiv.innerHTML += 'Progress: ' + progress + '%<br>';
        });
        
        log('Callback result: ' + JSON.stringify(result), 'success');
        resultDiv.innerHTML += '<br>Completed!<br><pre>' + JSON.stringify(result, null, 2) + '</pre>';
      } catch (error) {
        log('Error: ' + error.message, 'error');
      }
    }
    
    async function testComplex() {
      try {
        log('Calling complexOperation...', 'info');
        const resultDiv = document.getElementById('complex-result');
        resultDiv.innerHTML = 'Processing...<br>';
        
        const params = { value: 21 };
        const result = await window.ipc.call('complexOperation', params, 
          (success) => {
            log('Success: ' + JSON.stringify(success), 'success');
            resultDiv.innerHTML += 'Success: ' + JSON.stringify(success) + '<br>';
          },
          (error) => {
            log('Error: ' + error, 'error');
            resultDiv.innerHTML += 'Error: ' + error + '<br>';
          }
        );
        
        log('Complex result: ' + JSON.stringify(result), 'success');
        resultDiv.innerHTML += '<br>Result:<br><pre>' + JSON.stringify(result, null, 2) + '</pre>';
      } catch (error) {
        log('Error: ' + error.message, 'error');
      }
    }
    
    async function testFileList() {
      try {
        log('Calling getFileList...', 'info');
        const result = await window.ipc.call('getFileList');
        log('Files result: ' + JSON.stringify(result), 'success');
        
        let html = '<ul>';
        result.files.forEach(file => {
          html += '<li>' + file.name + ' (' + file.size + ' bytes, ' + file.type + ')</li>';
        });
        html += '</ul>';
        html += '<pre>Total: ' + result.total + '</pre>';
        document.getElementById('files-result').innerHTML = html;
      } catch (error) {
        log('Error: ' + error.message, 'error');
      }
    }
    
    log('IPC ready!', 'success');
  </script>
</body>
</html>
`;

// Set the HTML content
webview.navigate(`data:text/html,${encodeURIComponent(html)}`);

try {
  webview.runNonBlocking();
  console.log("Bun: Webview started");
} catch (error: any) {
  console.error("Bun: Webview error:", error);
} finally {
  // Always shutdown IPC gracefully before exiting
  console.log("Bun: Shutting down IPC...");
  console.log("Bun: IPC shutdown complete");
}
