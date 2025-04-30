import { useState } from "react";
import { Button } from "@/components/ui/button";
import { 
  Download, 
  File, 
  FileText, 
  FileImage, 
  FileArchive, 
  FileCode,
  FileSpreadsheet,
  Trash2
} from "lucide-react";
import { getDocumentUrl } from "@/lib/document-utils";
import { Spinner } from "@/components/ui/spinner";
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

interface FileDisplayProps {
  document: {
    id: string;
    title: string;
    fileUrl: string | null;
    createdAt: string;
    updatedAt: string;
  };
  onDeleted?: () => void;
}

export function FileDisplay({ document, onDeleted }: FileDisplayProps) {
  const [loading, setLoading] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();

  // Skip rendering if no fileUrl or if it's empty
  if (!document.fileUrl || document.fileUrl.trim() === "") {
    console.log(`FileDisplay: Skipping document ${document.id} (${document.title}) due to missing fileUrl`);
    return null;
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (filename: string) => {
    // Extract extension from filename or fileUrl
    const extension = (filename || "").split('.').pop()?.toLowerCase();
    
    switch (extension) {
      case 'pdf':
        return <FileText className="h-5 w-5 flex-shrink-0 text-red-500" />;
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
        return <FileImage className="h-5 w-5 flex-shrink-0 text-blue-500" />;
      case 'doc':
      case 'docx':
      case 'txt':
        return <FileText className="h-5 w-5 flex-shrink-0 text-blue-700" />;
      case 'xls':
      case 'xlsx':
      case 'csv':
        return <FileSpreadsheet className="h-5 w-5 flex-shrink-0 text-green-600" />;
      case 'zip':
      case 'rar':
        return <FileArchive className="h-5 w-5 flex-shrink-0 text-yellow-600" />;
      case 'js':
      case 'ts':
      case 'html':
      case 'css':
      case 'json':
        return <FileCode className="h-5 w-5 flex-shrink-0 text-purple-600" />;
      default:
        return <File className="h-5 w-5 flex-shrink-0 text-gray-500" />;
    }
  };

  const handleDownload = async () => {
    try {
      setLoading(true);
      
      // If we already have a download URL, use it
      if (downloadUrl) {
        window.open(downloadUrl, '_blank');
        return;
      }
      
      // Get the download URL for the file
      console.log(`Getting download URL for: ${document.fileUrl}`);
      const url = await getDocumentUrl(document.fileUrl);
      
      if (!url) {
        throw new Error('Failed to generate download URL');
      }
      
      // Save the URL for future use
      setDownloadUrl(url);
      
      // Open in new tab
      window.open(url, '_blank');
    } catch (error) {
      console.error('Error downloading file:', error);
      toast({
        title: "Download failed",
        description: "There was a problem downloading the file",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/documents/${document.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete document");
      }

      toast({
        title: "File deleted",
        description: "The file was successfully deleted"
      });
      
      if (onDeleted) {
        onDeleted();
      }
      
      setIsDeleteDialogOpen(false);
    } catch (error) {
      console.error("Error deleting document:", error);
      toast({
        title: "Delete failed",
        description: "There was a problem deleting the file",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Extract the filename from fileUrl if possible
  const getFileName = () => {
    if (!document.fileUrl) return document.title;
    
    // Try to get the filename from the fileUrl (it's often the last part after the last slash)
    const urlParts = document.fileUrl.split('/');
    let filename = urlParts[urlParts.length - 1] || document.title;
    
    // Remove any URL parameters
    filename = filename.split('?')[0];
    
    // If it has a UUID or random string, try to clean it up
    const matches = filename.match(/(.+)_[a-f0-9-]{8,}\.(.+)/i);
    if (matches) {
      return `${matches[1]}.${matches[2]}`;
    }
    
    return filename;
  };

  return (
    <>
      <div className="flex items-center justify-between bg-muted/20 rounded p-3 border">
        <div className="flex items-center gap-3 overflow-hidden">
          {getFileIcon(getFileName())}
          <div className="overflow-hidden">
            <p className="font-medium truncate">{document.title}</p>
            <p className="text-xs text-muted-foreground">
              {getFileName()} • {new Date(document.updatedAt).toLocaleDateString()}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button 
            type="button" 
            variant="ghost" 
            size="icon"
            onClick={handleDownload}
            disabled={loading}
          >
            {loading ? (
              <Spinner className="h-4 w-4" />
            ) : (
              <Download className="h-4 w-4" />
            )}
          </Button>
          <Button 
            type="button" 
            variant="ghost" 
            size="icon"
            onClick={() => setIsDeleteDialogOpen(true)}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </div>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete File</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the file "{document.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? <Spinner className="h-4 w-4 mr-2" /> : null}
              {isDeleting ? "Deleting..." : "Delete File"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
} 