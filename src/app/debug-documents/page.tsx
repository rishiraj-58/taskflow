"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";

export default function DebugDocumentsPage() {
  const [projectId, setProjectId] = useState("");
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<any>(null);
  const [testFileUrl, setTestFileUrl] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [allDocuments, setAllDocuments] = useState<any[]>([]);
  const [loadingAll, setLoadingAll] = useState(false);
  const [directQueryResults, setDirectQueryResults] = useState<any>(null);
  const [runningDirectQuery, setRunningDirectQuery] = useState(false);
  
  const fetchDocuments = async () => {
    if (!projectId) {
      setError("Please enter a project ID");
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // Use a direct API call with the nocache parameter
      const timestamp = Date.now();
      const response = await fetch(`/api/projects/${projectId}/documents?nocache=${timestamp}`, {
        cache: 'no-store',
        headers: {
          'Pragma': 'no-cache',
          'Cache-Control': 'no-cache'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Error fetching documents: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log("Raw API response:", data);
      
      // Extract documents array
      const docArray = data.documents || data;
      setDocuments(docArray);
    } catch (err) {
      console.error("Error:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };
  
  const fetchAllDocuments = async () => {
    setLoadingAll(true);
    setError(null);
    
    try {
      // Direct call to debug endpoint
      const cacheBuster = `nocache=${Date.now()}`;
      const response = await fetch(`/api/documents/all?${cacheBuster}`, {
        cache: 'no-store',
        headers: {
          'Pragma': 'no-cache',
          'Cache-Control': 'no-cache'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Error fetching all documents: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log("Raw API response from debug endpoint:", data);
      
      setAllDocuments(data.documents || []);
    } catch (err) {
      console.error("Error fetching all documents:", err);
      setError(err instanceof Error ? err.message : "Unknown error fetching all documents");
    } finally {
      setLoadingAll(false);
    }
  };
  
  const handleUpload = async () => {
    if (!projectId || !file || !title) {
      setError("Project ID, title and file are required");
      return;
    }
    
    setUploading(true);
    setError(null);
    setUploadResult(null);
    
    try {
      const formData = new FormData();
      formData.append("title", title);
      formData.append("file", file);
      formData.append("projectId", projectId);

      // Upload to API
      const response = await fetch("/api/documents/upload", {
        method: "POST",
        body: formData,
      });
      
      const result = await response.json();
      setUploadResult(result);
      
      if (!response.ok) {
        throw new Error(result.error || "Upload failed");
      }
      
      // Refresh document list
      await fetchDocuments();
      
      // Reset form
      setFile(null);
      setTitle("");
    } catch (err) {
      console.error("Upload error:", err);
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setFile(files[0]);
      // Set title if empty
      if (!title) {
        const fileName = files[0].name.split('.').slice(0, -1).join('.');
        setTitle(fileName);
      }
    }
  };
  
  const testDownload = async () => {
    if (!testFileUrl) return;
    
    setDownloading(true);
    try {
      // If it's an S3 key and not a URL, generate download URL first
      let downloadUrl = testFileUrl;
      
      if (!testFileUrl.startsWith('http')) {
        // Call the API to get a download URL
        const response = await fetch(`/api/documents/get-download-url?key=${encodeURIComponent(testFileUrl)}`);
        if (!response.ok) {
          throw new Error("Failed to generate download URL");
        }
        const data = await response.json();
        downloadUrl = data.url;
        
        // Log the generated URL for debugging
        console.log("Generated download URL:", downloadUrl.substring(0, 50) + "...");
      }
      
      // Open the download URL in a new tab
      window.open(downloadUrl, '_blank');
    } catch (err) {
      console.error("Download error:", err);
      setError(err instanceof Error ? err.message : "Download failed");
    } finally {
      setDownloading(false);
    }
  };
  
  const runDirectQuery = async () => {
    setRunningDirectQuery(true);
    setError(null);
    
    try {
      // Build query parameters
      const params = new URLSearchParams();
      if (projectId) {
        params.append('projectId', projectId);
      }
      params.append('withFileUrlOnly', 'true');
      
      // Call the direct query endpoint
      const response = await fetch(`/api/documents/direct-query?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error(`Error querying database: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log("Direct database query results:", data);
      setDirectQueryResults(data);
    } catch (err) {
      console.error("Direct query error:", err);
      setError(err instanceof Error ? err.message : "Direct query failed");
    } finally {
      setRunningDirectQuery(false);
    }
  };
  
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-4">Debug Documents</h1>
      
      <div className="flex space-x-4 mb-6">
        <Input 
          value={projectId} 
          onChange={(e) => setProjectId(e.target.value)}
          placeholder="Enter Project ID"
          className="max-w-md"
        />
        <Button onClick={fetchDocuments} disabled={loading}>
          {loading ? <Spinner className="mr-2 h-4 w-4" /> : null}
          Fetch Documents
        </Button>
        <Button 
          onClick={fetchAllDocuments} 
          disabled={loadingAll}
          variant="secondary"
        >
          {loadingAll ? <Spinner className="mr-2 h-4 w-4" /> : null}
          Fetch ALL Documents (Debug)
        </Button>
      </div>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      <div className="bg-gray-100 p-4 rounded-md mb-6">
        <h2 className="text-lg font-semibold mb-4">Debug Upload</h2>
        <div className="grid gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Title</label>
            <Input 
              value={title} 
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Document title"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">File</label>
            <Input 
              type="file"
              onChange={handleFileChange}
            />
          </div>
          <Button 
            onClick={handleUpload} 
            disabled={uploading || !file || !title || !projectId}
            className="w-full"
          >
            {uploading ? <Spinner className="mr-2 h-4 w-4" /> : null}
            Test Upload
          </Button>
        </div>
        
        {uploadResult && (
          <div className="mt-4 p-3 bg-gray-50 rounded-md">
            <h3 className="font-medium mb-2">Upload Result:</h3>
            <pre className="text-xs overflow-auto">{JSON.stringify(uploadResult, null, 2)}</pre>
          </div>
        )}
      </div>
      
      <div className="bg-gray-100 p-4 rounded-md mb-6">
        <h2 className="text-lg font-semibold mb-4">Test Download</h2>
        <div className="grid gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">File URL or S3 Key</label>
            <Input 
              value={testFileUrl} 
              onChange={(e) => setTestFileUrl(e.target.value)}
              placeholder="Enter file URL or S3 key"
            />
          </div>
          <Button 
            onClick={testDownload} 
            disabled={downloading || !testFileUrl}
            className="w-full"
          >
            {downloading ? <Spinner className="mr-2 h-4 w-4" /> : null}
            Test Download
          </Button>
        </div>
      </div>
      
      <div className="bg-gray-50 p-4 rounded-md mb-6">
        <h2 className="text-lg font-medium mb-2">Found {documents.length} documents</h2>
        <pre className="text-xs overflow-auto">{JSON.stringify(documents, null, 2)}</pre>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {documents.map(doc => (
          <div key={doc.id} className="border p-4 rounded-md">
            <h3 className="font-bold">{doc.title}</h3>
            <p className="text-sm text-gray-500">ID: {doc.id}</p>
            <p className="text-sm break-all">FileURL: <span className={!doc.fileUrl ? "text-red-500" : ""}>{doc.fileUrl || 'None'}</span></p>
            <p className="text-sm">FileURL Type: <span className="font-mono">{typeof doc.fileUrl}</span></p>
            <p className="text-sm">FileURL Length: <span className="font-mono">{doc.fileUrl ? doc.fileUrl.length : 0}</span></p>
            <p className="text-sm">Created: {new Date(doc.createdAt).toLocaleString()}</p>
            
            {doc.fileUrl && (
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-2"
                onClick={() => {
                  setTestFileUrl(doc.fileUrl);
                  testDownload();
                }}
              >
                Test Download
              </Button>
            )}
          </div>
        ))}
      </div>
      
      {allDocuments.length > 0 && (
        <div className="bg-gray-100 p-4 rounded-md mb-6">
          <h2 className="text-lg font-semibold mb-4">ALL Documents in Database (Debug)</h2>
          <div className="grid grid-cols-1 gap-4">
            {allDocuments.map(doc => (
              <div key={doc.id} className="border p-4 rounded-md bg-white">
                <h3 className="font-bold">{doc.title}</h3>
                <div className="grid grid-cols-2 gap-x-4 text-sm mt-2">
                  <p><strong>ID:</strong> {doc.id}</p>
                  <p><strong>Project ID:</strong> {doc.projectId}</p>
                  <p><strong>Created:</strong> {new Date(doc.createdAt).toLocaleString()}</p>
                  <p><strong>Updated:</strong> {new Date(doc.updatedAt).toLocaleString()}</p>
                  <p><strong>Has Content:</strong> {doc.hasContent ? "Yes" : "No"}</p>
                  <p className={doc.fileUrlNull ? "text-red-500 font-bold" : ""}>
                    <strong>fileUrl NULL:</strong> {doc.fileUrlNull ? "YES" : "No"}
                  </p>
                  <p className={doc.fileUrlEmpty ? "text-orange-500 font-bold" : ""}>
                    <strong>fileUrl Empty:</strong> {doc.fileUrlEmpty ? "YES" : "No"}
                  </p>
                  <p><strong>fileUrl Length:</strong> {doc.fileUrlLength}</p>
                </div>
                <p className="mt-2 text-xs break-all border-t pt-2">
                  <strong>fileUrl:</strong> {doc.fileUrl || "(none)"}
                </p>
                
                {doc.fileUrl && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-2"
                    onClick={() => {
                      setTestFileUrl(doc.fileUrl);
                      testDownload();
                    }}
                  >
                    Test Download
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      
      <div className="bg-blue-50 p-4 rounded-md mb-6 border border-blue-200">
        <h2 className="text-lg font-semibold mb-4">Direct Database Query</h2>
        <p className="text-sm mb-4">
          This bypasses the API and directly queries the database for documents with file URLs.
        </p>
        <div className="flex gap-2 mb-4">
          <Button 
            onClick={runDirectQuery} 
            disabled={runningDirectQuery}
            variant="default"
          >
            {runningDirectQuery ? <Spinner className="mr-2 h-4 w-4" /> : null}
            Run Direct Database Query
          </Button>
        </div>
        
        {directQueryResults && (
          <div>
            <h3 className="font-medium text-sm mb-2">
              Found {directQueryResults.count} documents with fileUrl
            </h3>
            <div className="max-h-80 overflow-y-auto bg-white p-3 rounded border">
              <div className="grid grid-cols-1 divide-y">
                {directQueryResults.documents.map((doc: any) => (
                  <div key={doc.id} className="py-2">
                    <p className="font-bold">{doc.title}</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-1 text-xs">
                      <p><strong>ID:</strong> {doc.id}</p>
                      <p><strong>ProjectID:</strong> {doc.projectId}</p>
                      <p><strong>Created:</strong> {new Date(doc.createdAt).toLocaleString()}</p>
                      <p><strong>Updated:</strong> {new Date(doc.updatedAt).toLocaleString()}</p>
                      <p 
                        className={doc._diagnostic.fileUrlNull ? 'text-red-500' : ''}
                      >
                        <strong>fileUrl NULL:</strong> {doc._diagnostic.fileUrlNull ? 'YES' : 'No'}
                      </p>
                      <p 
                        className={doc._diagnostic.fileUrlEmpty ? 'text-orange-500' : ''}
                      >
                        <strong>fileUrl Empty:</strong> {doc._diagnostic.fileUrlEmpty ? 'YES' : 'No'}
                      </p>
                      <p><strong>fileUrl Type:</strong> {doc._diagnostic.fileUrlType}</p>
                      <p><strong>fileUrl Length:</strong> {doc._diagnostic.fileUrlLength}</p>
                    </div>
                    <p className="text-xs mt-1 break-all"><strong>fileUrl:</strong> {doc.fileUrl}</p>
                    
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="mt-1"
                      onClick={() => {
                        setTestFileUrl(doc.fileUrl);
                        testDownload();
                      }}
                    >
                      Test Download
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 