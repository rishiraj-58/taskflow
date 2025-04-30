"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";

export default function FileUploadTest() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<string>("");
  const [logs, setLogs] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `${new Date().toISOString().substring(11, 19)}: ${message}`]);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    addLog("File input change detected");
    const files = e.target.files;
    if (files && files.length > 0) {
      const selectedFile = files[0];
      addLog(`File selected: ${selectedFile.name} (${selectedFile.size} bytes)`);
      setFile(selectedFile);
    } else {
      addLog("No file selected");
      setFile(null);
    }
  };

  const handleFileBrowse = () => {
    addLog("Browse button clicked");
    // Use vanilla JS to create and trigger file input
    const input = document.createElement('input');
    input.type = 'file';
    
    // Listen for the change event
    input.onchange = (e) => {
      const target = e.target as HTMLInputElement;
      if (target.files && target.files.length > 0) {
        const selectedFile = target.files[0];
        addLog(`File selected manually: ${selectedFile.name} (${selectedFile.size} bytes)`);
        setFile(selectedFile);
      }
    };
    
    // Trigger the file dialog
    addLog("Triggering file dialog");
    input.click();
  };

  const handleFileUpload = async () => {
    if (!file) {
      addLog("Error: No file selected");
      return;
    }

    addLog(`Starting upload of file: ${file.name}`);
    setUploading(true);
    setResult("");

    try {
      // Create FormData
      const formData = new FormData();
      formData.append("file", file);
      formData.append("title", file.name);
      formData.append("projectId", "test-project-id");
      
      addLog("FormData created, sending to API...");

      // Check if we can access the file in FormData
      const fileFromFormData = formData.get("file");
      addLog(`File in FormData: ${fileFromFormData instanceof File ? "Yes" : "No"}`);
      if (fileFromFormData instanceof File) {
        addLog(`FormData file details: ${fileFromFormData.name}, ${fileFromFormData.size} bytes`);
      }

      // Simple direct upload test
      const uploadResponse = await fetch("/api/test-upload", {
        method: "POST",
        body: formData,
      });

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        throw new Error(`Upload failed: ${uploadResponse.status} - ${errorText}`);
      }

      const responseData = await uploadResponse.json();
      addLog("Upload successful!");
      setResult(JSON.stringify(responseData, null, 2));
    } catch (error) {
      addLog(`Error: ${error instanceof Error ? error.message : "Unknown error"}`);
      setResult(`Error: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="container mx-auto p-8 max-w-3xl">
      <h1 className="text-2xl font-bold mb-6">File Upload Test Page</h1>
      
      <div className="bg-muted p-4 rounded-md mb-6">
        <h2 className="text-lg font-semibold mb-4">Step 1: Select a file</h2>
        <div className="flex flex-col gap-4">
          {/* IMPORTANT: Direct button with visible input */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Method 1: Direct file input (Most reliable)</label>
            <input 
              type="file" 
              onChange={handleFileChange}
              className="block w-full text-sm"
            />
          </div>
          
          {/* Alternative method with JavaScript */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Method 2: JavaScript approach</label>
            <Button onClick={handleFileBrowse} variant="outline">
              Browse Files...
            </Button>
          </div>
          
          {/* File display */}
          <div className="mt-2">
            <label className="text-sm font-medium">Selected file:</label>
            {file ? (
              <div className="bg-secondary p-2 rounded mt-1">
                <span>{file.name} ({(file.size / 1024).toFixed(2)} KB)</span>
              </div>
            ) : (
              <span className="text-muted-foreground">No file selected</span>
            )}
          </div>
        </div>
      </div>

      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-4">Step 2: Upload the file</h2>
        <Button 
          onClick={handleFileUpload} 
          disabled={!file || uploading}
        >
          {uploading ? "Uploading..." : "Upload File"}
        </Button>
      </div>

      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-4">Result:</h2>
        <pre className="bg-muted p-4 rounded-md overflow-auto max-h-40">
          {result || "No result yet"}
        </pre>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-4">Logs:</h2>
        <div className="bg-black text-green-400 p-4 rounded-md font-mono text-sm overflow-auto max-h-60">
          {logs.map((log, i) => (
            <div key={i}>{log}</div>
          ))}
          {logs.length === 0 && <div>No logs yet</div>}
        </div>
      </div>
    </div>
  );
} 