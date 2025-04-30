import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  MoreHorizontal,
  FileText,
  FileIcon,
  ExternalLink,
  Trash2,
  Edit,
  Download,
  Calendar,
} from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { useToast } from "@/components/ui/use-toast";
import { getDocumentUrl } from "@/lib/document-utils";
import { FileDisplay } from "./FileDisplay";

interface Document {
  id: string;
  title: string;
  content: string | null;
  fileUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

interface DocumentWithUrl extends Document {
  downloadUrl?: string | null;
}

interface DocumentListProps {
  documents: Document[];
  onDocumentDeleted: () => void;
  projectId: string;
}

export default function DocumentList({
  documents,
  onDocumentDeleted,
  projectId,
}: DocumentListProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [documentToDelete, setDocumentToDelete] = useState<DocumentWithUrl | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [processedDocuments, setProcessedDocuments] = useState<DocumentWithUrl[]>([]);
  const [isLoadingUrls, setIsLoadingUrls] = useState(true);

  // Debug: log document data
  useEffect(() => {
    console.log("DocumentList received documents:", documents);
    
    // Check specifically for files
    const fileDocuments = documents.filter(doc => doc.fileUrl);
    console.log("File documents:", fileDocuments);
    
    // Log current tab from parent
    const urlParams = new URLSearchParams(window.location.search);
    const currentTab = urlParams.get('tab') || 'all';
    console.log("Current UI tab:", currentTab);
  }, [documents]);

  useEffect(() => {
    // Process documents to get download URLs
    async function loadDocumentUrls() {
      setIsLoadingUrls(true);
      
      console.log("Loading document URLs for", documents.length, "documents");
      
      try {
        // Enhanced logging for document properties
        console.log("Original documents before processing:");
        documents.forEach(doc => {
          console.log(`Document ${doc.id} (${doc.title}):`, {
            fileUrl: doc.fileUrl,
            fileUrlType: typeof doc.fileUrl,
            fileUrlLength: doc.fileUrl ? doc.fileUrl.length : 0,
            hasFileUrl: Boolean(doc.fileUrl && doc.fileUrl.trim() !== "")
          });
        });
        
        const docsWithUrls = await Promise.all(
          documents.map(async (doc) => {
            console.log(`Processing document for URL: ${doc.id} (${doc.title})`);
            console.log(`  fileUrl:`, JSON.stringify(doc.fileUrl));
            
            let downloadUrl = null;
            
            // Enhanced fileUrl checking - ensure it's not empty after trimming
            if (doc.fileUrl && doc.fileUrl.trim() !== "") {
              try {
                console.log(`  Getting download URL for key:`, JSON.stringify(doc.fileUrl));
                downloadUrl = await getDocumentUrl(doc.fileUrl);
                console.log(`  Download URL result:`, downloadUrl ? "Success" : "Failed");
                if (downloadUrl) {
                  console.log(`  URL preview: ${downloadUrl.substring(0, 40)}...`);
                }
              } catch (urlError) {
                console.error(`  Error getting URL for document ${doc.id}:`, urlError);
                downloadUrl = null;
              }
            } else {
              console.log(`  No valid fileUrl to process for ${doc.title}`);
            }
            
            return { ...doc, downloadUrl };
          })
        );
        
        console.log("Processed documents with URLs:", docsWithUrls.length);
        setProcessedDocuments(docsWithUrls);
      } catch (error) {
        console.error("Error loading document URLs:", error);
        // Fall back to documents without download URLs
        console.log("Falling back to documents without download URLs");
        setProcessedDocuments(documents.map(doc => ({ ...doc, downloadUrl: null })));
      } finally {
        setIsLoadingUrls(false);
      }
    }
    
    if (documents.length > 0) {
      loadDocumentUrls();
    } else {
      console.log("No documents to process");
      setProcessedDocuments([]);
      setIsLoadingUrls(false);
    }
  }, [documents]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const handleViewDocument = (document: DocumentWithUrl) => {
    if (document.fileUrl && document.downloadUrl) {
      // External file - open in new tab
      window.open(document.downloadUrl, "_blank");
    } else {
      // Internal document - navigate to document page
      router.push(`/projects/${projectId}/documents/${document.id}`);
    }
  };

  const handleEditDocument = (document: DocumentWithUrl) => {
    router.push(`/projects/${projectId}/documents/${document.id}/edit`);
  };

  const handleDownloadDocument = async (document: DocumentWithUrl) => {
    if (!document.fileUrl || !document.downloadUrl) return;
    
    try {
      // Create an anchor element and set the href to the download URL
      const link = globalThis.document.createElement("a");
      link.href = document.downloadUrl;
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

  const confirmDelete = (document: DocumentWithUrl) => {
    setDocumentToDelete(document);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteDocument = async () => {
    if (!documentToDelete) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/documents/${documentToDelete.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete document");
      }

      onDocumentDeleted();
      setIsDeleteDialogOpen(false);
      setDocumentToDelete(null);
    } catch (error) {
      console.error("Error deleting document:", error);
      toast({
        title: "Delete failed",
        description: "There was a problem deleting the document",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  if (documents.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium">No documents found</h3>
        <p className="text-muted-foreground mt-2 mb-6">
          Start by creating a new document or uploading a file
        </p>
      </div>
    );
  }

  if (isLoadingUrls) {
    return (
      <div className="text-center py-12">
        <Spinner className="h-8 w-8 mx-auto mb-4" />
        <h3 className="text-lg font-medium">Loading document URLs...</h3>
        <p className="text-muted-foreground mt-2">
          Please wait while we prepare your documents
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-1 gap-4 mb-6">
        {processedDocuments
          .filter(doc => doc.fileUrl && doc.fileUrl.trim() !== "")
          .map((document) => (
            <FileDisplay 
              key={document.id} 
              document={document} 
              onDeleted={() => {
                onDocumentDeleted();
                // Also remove from local processedDocuments state to avoid re-fetching
                setProcessedDocuments(prev => prev.filter(d => d.id !== document.id));
              }} 
            />
          ))
        }
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {processedDocuments
          .filter(doc => !doc.fileUrl || doc.fileUrl.trim() === "")
          .map((document) => (
          <Card key={document.id} className="overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div className="flex-1 mr-4">
                  <CardTitle className="text-lg truncate">{document.title}</CardTitle>
                  <CardDescription className="flex items-center mt-1 text-xs">
                    <Calendar className="h-3 w-3 mr-1" />
                    Last updated {formatDate(document.updatedAt)}
                  </CardDescription>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleViewDocument(document)}>
                      <FileText className="h-4 w-4 mr-2" />
                      View Document
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleEditDocument(document)}>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={() => confirmDelete(document)}
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>
            <CardContent className="pb-2">
              <div 
                className="h-24 overflow-hidden text-sm opacity-70 cursor-pointer"
                onClick={() => handleViewDocument(document)}
              >
                {document.content ? (
                  <div className="line-clamp-4">{document.content}</div>
                ) : (
                  <div className="flex items-center justify-center h-full bg-muted/30 rounded-md">
                    <FileIcon className="h-10 w-10 text-muted-foreground" />
                  </div>
                )}
              </div>
            </CardContent>
            <CardFooter>
              <div className="w-full flex justify-between items-center">
                <Badge variant="outline">Document</Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleViewDocument(document)}
                  className="text-xs"
                >
                  View Document
                  <ExternalLink className="h-3 w-3 ml-1" />
                </Button>
              </div>
            </CardFooter>
          </Card>
        ))}
      </div>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the document &quot;
              {documentToDelete?.title}&quot;. This action cannot be undone.
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