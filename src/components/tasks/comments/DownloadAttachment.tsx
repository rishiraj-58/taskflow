"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, File, FileText, Image, Paperclip } from "lucide-react";
import { generateDownloadUrl } from "@/lib/s3";

interface DownloadAttachmentProps {
  attachment: {
    id: string;
    filename: string;
    contentType: string;
    key: string;
    size: number;
  };
}

export function DownloadAttachment({ attachment }: DownloadAttachmentProps) {
  const [loading, setLoading] = useState(false);

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (contentType: string) => {
    if (contentType.startsWith('image/')) {
      return <Image className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />;
    } else if (
      contentType === 'application/pdf' ||
      contentType.includes('document') ||
      contentType.includes('text/')
    ) {
      return <FileText className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />;
    }
    return <File className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />;
  };

  const handleDownload = async () => {
    try {
      setLoading(true);
      
      // Call backend to get a presigned URL for the attachment
      const response = await fetch(`/api/attachments/${attachment.id}/download`);
      
      if (!response.ok) {
        throw new Error('Failed to get download URL');
      }
      
      const { downloadUrl } = await response.json();
      
      // Open the URL in a new tab
      window.open(downloadUrl, '_blank');
    } catch (error) {
      console.error('Error downloading file:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-between text-xs bg-background rounded p-2">
      <div className="flex items-center gap-1.5 overflow-hidden">
        {getFileIcon(attachment.contentType)}
        <span className="truncate">{attachment.filename}</span>
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          ({formatFileSize(attachment.size)})
        </span>
      </div>
      <Button 
        type="button" 
        variant="ghost" 
        size="sm" 
        onClick={handleDownload}
        disabled={loading}
        className="h-6 w-6 p-0"
      >
        <Download className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
} 