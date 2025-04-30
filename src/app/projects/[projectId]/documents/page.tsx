"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PlusIcon, FolderIcon, SearchIcon, FileIcon } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Spinner } from "@/components/ui/spinner";
import { Separator } from "@/components/ui/separator";
import DocumentList from "@/components/documents/DocumentList";
import UploadDocumentModal from "@/components/documents/UploadDocumentModal";
import CreateDocumentModal from "@/components/documents/CreateDocumentModal";

interface Document {
  id: string;
  title: string;
  content: string | null;
  fileUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function DocumentsPage() {
  const params = useParams();
  const { toast } = useToast();
  
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentTab, setCurrentTab] = useState("all");
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [projectName, setProjectName] = useState("");

  const projectId = params.projectId as string;
  
  const fetchDocuments = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log("Fetching documents for project:", projectId);
      // Use a more random cache-busting query parameter
      const cacheBuster = `nocache=${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const response = await fetch(`/api/projects/${projectId}/documents?${cacheBuster}`, {
        // Add cache control to the fetch request
        cache: 'no-store',
        headers: {
          'Pragma': 'no-cache',
          'Cache-Control': 'no-cache'
        }
      });
      
      console.log("Document fetch response status:", response.status);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch documents: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log("Documents fetched successfully:", data);
      
      // Extract documents from the response (new format)
      if (data.documents) {
        console.log("Using new response format with documents array");
        setDocuments(data.documents);
      } else {
        console.log("Using old response format with direct documents array");
        setDocuments(data);
      }
    } catch (err) {
      console.error("Error fetching documents:", err);
      setError(err instanceof Error ? err.message : "Failed to load documents");
      toast({
        title: "Error",
        description: "There was a problem loading the documents",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    if (projectId) {
      console.log("Document page mounted or projectId changed, fetching documents for:", projectId);
      fetchDocuments();
      fetchProjectDetails();
    }
  }, [projectId]);
  
  // Force refresh on window focus
  useEffect(() => {
    const handleFocus = () => {
      console.log("Window focused, refreshing documents");
      fetchDocuments();
    };
    
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);
  
  async function fetchProjectDetails() {
    try {
      const response = await fetch(`/api/projects/${projectId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch project details");
      }
      const data = await response.json();
      setProjectName(data.name);
    } catch (error) {
      console.error("Error fetching project details:", error);
    }
  }
  
  const filteredDocuments = documents.filter(doc => {
    // Enhanced debugging for document fileUrl values
    console.log(`Document ${doc.id} (${doc.title}):`, { 
      fileUrl: doc.fileUrl, 
      fileUrlType: typeof doc.fileUrl,
      fileUrlLength: doc.fileUrl ? doc.fileUrl.length : 0,
      content: doc.content ? 'Has content' : null
    });
    
    // First filter by search query
    const matchesSearch = doc.title.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Then filter by tab/type
    if (currentTab === "all") return matchesSearch;
    
    // For files tab - IMPROVED: Check for any non-empty fileUrl values
    if (currentTab === "files") {
      // Ensure fileUrl is not null, undefined, or empty string
      const hasFileUrl = Boolean(doc.fileUrl && doc.fileUrl.trim() !== "");
      console.log(`  [${doc.title}] Files tab check:`, { 
        hasFileUrl, 
        fileUrl: doc.fileUrl,
      });
      return matchesSearch && hasFileUrl;
    }
    
    // For notes tab - no fileUrl but has content
    if (currentTab === "notes") {
      const isNote = (!doc.fileUrl || doc.fileUrl.trim() === "") && doc.content !== null;
      console.log(`  [${doc.title}] Notes tab check:`, isNote);
      return matchesSearch && isNote;
    }
    
    return matchesSearch;
  });
  
  const handleDocumentCreated = () => {
    setIsCreateModalOpen(false);
    fetchDocuments();
    toast({
      title: "Document created",
      description: "The document was created successfully",
    });
  };
  
  const handleDocumentUploaded = () => {
    console.log("Document uploaded callback triggered - refreshing document list");
    setIsUploadModalOpen(false);
    
    // Add a small delay before fetching to ensure the database has updated
    setTimeout(() => {
      fetchDocuments();
      
      toast({
        title: "Document uploaded",
        description: "The document was uploaded successfully. If the document doesn't appear, click Refresh.",
      });
    }, 500);
  };
  
  const handleDocumentDeleted = () => {
    fetchDocuments();
    toast({
      title: "Document deleted",
      description: "The document was deleted successfully",
    });
  };

  // Count of documents by type for displaying special messages
  const getDocumentCounts = () => {
    const filesCount = documents.filter(doc => doc.fileUrl && doc.fileUrl.trim() !== "").length;
    const notesCount = documents.filter(doc => (!doc.fileUrl || doc.fileUrl.trim() === "") && doc.content !== null).length;
    
    return { filesCount, notesCount, totalCount: documents.length };
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">{projectName} Documents</h1>
          <p className="text-muted-foreground">
            Manage your project documentation and files
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={fetchDocuments}
            className="mr-1"
          >
            Refresh
          </Button>
          <Button 
            variant="outline" 
            onClick={() => setIsCreateModalOpen(true)}
          >
            <FileIcon className="h-4 w-4 mr-2" />
            Create Document
          </Button>
          <Button onClick={() => setIsUploadModalOpen(true)}>
            <PlusIcon className="h-4 w-4 mr-2" />
            Upload File
          </Button>
        </div>
      </div>
      
      <Separator className="my-6" />
      
      <div className="flex flex-col gap-6">
        <div className="flex justify-between items-center">
          <Tabs 
            defaultValue="all" 
            className="w-[400px]"
            value={currentTab}
            onValueChange={setCurrentTab}
          >
            <TabsList>
              <TabsTrigger value="all">All Documents</TabsTrigger>
              <TabsTrigger value="files">Files</TabsTrigger>
              <TabsTrigger value="notes">Notes</TabsTrigger>
            </TabsList>
          </Tabs>
          
          <div className="relative">
            <SearchIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search documents..."
              className="pl-9 w-[300px]"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        
        {/* File count summary */}
        {!loading && !error && (
          <div className="text-sm text-muted-foreground">
            {getDocumentCounts().totalCount === 0 ? (
              <p>No documents found. Upload a file or create a document to get started.</p>
            ) : (
              <p>
                Found {getDocumentCounts().totalCount} document{getDocumentCounts().totalCount !== 1 ? 's' : ''}: 
                {getDocumentCounts().filesCount > 0 && ` ${getDocumentCounts().filesCount} file${getDocumentCounts().filesCount !== 1 ? 's' : ''}`}
                {getDocumentCounts().filesCount > 0 && getDocumentCounts().notesCount > 0 && ' and'}
                {getDocumentCounts().notesCount > 0 && ` ${getDocumentCounts().notesCount} note${getDocumentCounts().notesCount !== 1 ? 's' : ''}`}
              </p>
            )}
          </div>
        )}
        
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <Spinner className="h-8 w-8" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <p className="text-destructive mb-4">{error}</p>
            <Button onClick={fetchDocuments}>Retry</Button>
          </div>
        ) : (
          <DocumentList 
            documents={filteredDocuments} 
            onDocumentDeleted={handleDocumentDeleted}
            projectId={projectId}
          />
        )}
      </div>
      
      <UploadDocumentModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onUploadComplete={handleDocumentUploaded}
        projectId={projectId}
      />
      
      <CreateDocumentModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onDocumentCreated={handleDocumentCreated}
        projectId={projectId}
      />
    </div>
  );
} 