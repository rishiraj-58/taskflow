"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { ArrowLeft, Edit, Trash2, FileText, Download, Calendar } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { getDocumentUrl } from "@/lib/document-utils";

interface Document {
  id: string;
  title: string;
  content: string | null;
  fileUrl: string | null;
  createdAt: string;
  updatedAt: string;
  project: {
    id: string;
    name: string;
  };
}

export default function DocumentPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  
  const [document, setDocument] = useState<Document | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const projectId = params.projectId as string;
  const documentId = params.documentId as string;
  
  useEffect(() => {
    fetchDocument();
  }, [documentId, projectId]);
  
  async function fetchDocument() {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/documents/${documentId}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch document: ${response.statusText}`);
      }
      
      const data = await response.json();
      setDocument(data);
      
      // If it's a file, get the download URL
      if (data.fileUrl) {
        const url = await getDocumentUrl(data.fileUrl);
        setDownloadUrl(url);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load document");
      toast({
        title: "Error",
        description: "There was a problem loading the document",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }
  
  const handleEditDocument = () => {
    router.push(`/projects/${projectId}/documents/${documentId}/edit`);
  };

  const handleDownloadDocument = async () => {
    if (!document?.fileUrl || !downloadUrl) return;

    try {
      // Create an anchor element and set the href to the file URL
      const link = globalThis.document.createElement("a");
      link.href = downloadUrl;
      link.download = document.title;
      globalThis.document.body.appendChild(link);
      link.click();
      globalThis.document.body.removeChild(link);
    } catch (error) {
      console.error("Error downloading document:", error);
      toast({
        title: "Download failed",
        description: "There was a problem downloading the file",
        variant: "destructive",
      });
    }
  };
  
  const confirmDelete = () => {
    setIsDeleteDialogOpen(true);
  };
  
  const handleDeleteDocument = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/documents/${documentId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete document");
      }

      toast({
        title: "Document deleted",
        description: "The document was deleted successfully"
      });
      
      // Navigate back to documents list
      router.push(`/projects/${projectId}/documents`);
    } catch (error) {
      console.error("Error deleting document:", error);
      toast({
        title: "Delete failed",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
    }
  };
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  if (error || !document) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <p className="text-destructive mb-4">
          {error || "Document not found"}
        </p>
        <div className="flex gap-4">
          <Button onClick={fetchDocument}>Retry</Button>
          <Button variant="outline" onClick={() => router.push(`/projects/${projectId}/documents`)}>
            Back to Documents
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <Button 
          variant="ghost" 
          className="flex items-center gap-2"
          onClick={() => router.push(`/projects/${projectId}/documents`)}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Documents
        </Button>
        <div className="flex gap-2">
          {!document.fileUrl && (
            <Button 
              variant="outline" 
              onClick={handleEditDocument}
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          )}
          {document.fileUrl && downloadUrl && (
            <Button 
              variant="outline" 
              onClick={handleDownloadDocument}
            >
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
          )}
          <Button 
            variant="destructive" 
            onClick={confirmDelete}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>
      
      <Card className="mb-6">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-2xl">{document.title}</CardTitle>
              <CardDescription>
                <div className="flex items-center gap-2 mt-2">
                  <Calendar className="h-4 w-4" />
                  <span>
                    Last updated on {formatDate(document.updatedAt)}
                  </span>
                </div>
              </CardDescription>
            </div>
            <Badge variant={document.fileUrl ? "default" : "outline"}>
              {document.fileUrl ? "File" : "Document"}
            </Badge>
          </div>
        </CardHeader>
        
        <Separator />
        
        <CardContent className="pt-6">
          {document.fileUrl ? (
            <div className="flex flex-col items-center justify-center p-8 bg-muted/20 rounded-md">
              <FileText className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">External File</h3>
              <p className="text-muted-foreground mb-4 text-center">
                This document links to an external file.
              </p>
              {downloadUrl ? (
                <Button onClick={handleDownloadDocument}>
                  <Download className="h-4 w-4 mr-2" />
                  Download File
                </Button>
              ) : (
                <p className="text-destructive">
                  Error loading file. Please try again later.
                </p>
              )}
            </div>
          ) : (
            <div className="prose prose-sm max-w-none">
              <pre className="whitespace-pre-wrap font-sans p-4 bg-muted/20 rounded-md">
                {document.content}
              </pre>
            </div>
          )}
        </CardContent>
      </Card>
      
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the document &quot;
              {document.title}&quot;. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteDocument}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
} 