import { Webview } from "webview-bun-fork";
import IPC from "./src/ipc.js";
import indexHtml from "./index.html" assert { type: "text" };
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


// Set the HTML content}
const html = `
${IPC.getInitScript()}
${indexHtml}
`
webview.setHTML(html);


//webview.eval(IPC.getInitScript())
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
