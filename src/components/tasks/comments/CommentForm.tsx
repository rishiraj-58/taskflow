"use client";

import { useState, useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Paperclip, Send, X } from "lucide-react";
import { MentionInput } from "@/components/tasks/comments/MentionInput";
import { useToast } from "@/components/ui/use-toast";

interface CommentFormProps {
  taskId: string;
  projectId: string;
  onCommentAdded: (comment: any) => void;
  parentId?: string;
  isReply?: boolean;
}

export function CommentForm({ taskId, projectId, onCommentAdded, parentId, isReply = false }: CommentFormProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [content, setContent] = useState("");
  const [mentions, setMentions] = useState<string[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async () => {
    if (!content.trim()) {
      toast({
        title: "Comment cannot be empty",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      
      // Prepare attachment data
      const attachments = files.map(file => ({
        filename: file.name,
        contentType: file.type,
        size: file.size
      }));
      
      // Submit comment data
      const response = await fetch(`/api/projects/${projectId}/tasks/${taskId}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content,
          parentId,
          mentions,
          attachments
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create comment");
      }
      
      const data = await response.json();
      
      // Upload files if there are any
      if (files.length > 0 && data.uploadUrls) {
        console.log("Received uploadUrls:", data.uploadUrls);
        await Promise.all(
          data.uploadUrls.map(async (urlData: any, index: number) => {
            const file = files[index];
            const { uploadUrl } = urlData;
            
            const uploadResponse = await fetch(uploadUrl, {
              method: "PUT",
              headers: {
                "Content-Type": file.type,
              },
              body: file,
            });
            
            if (!uploadResponse.ok) {
              throw new Error(`Failed to upload ${file.name}`);
            }
          })
        );
      }
      
      onCommentAdded(data.comment);
      setContent("");
      setMentions([]);
      setFiles([]);
      
      toast({
        title: isReply ? "Reply added" : "Comment added",
        description: "Your comment has been added successfully",
      });
    } catch (error) {
      console.error("Error creating comment:", error);
      toast({
        title: "Failed to add comment",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      
      // Check file size limit (10MB per file)
      const oversizedFiles = newFiles.filter(file => file.size > 10 * 1024 * 1024);
      if (oversizedFiles.length > 0) {
        toast({
          title: "File too large",
          description: "Some files exceed the 10MB limit",
          variant: "destructive",
        });
        return;
      }
      
      setFiles(prev => [...prev, ...newFiles]);
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="border rounded-md p-3 bg-card">
      <MentionInput
        value={content}
        onChange={setContent}
        onMentionsChange={setMentions}
        projectId={projectId}
        placeholder={isReply ? "Write a reply..." : "Write a comment..."}
      />
      
      {files.length > 0 && (
        <div className="mt-3 border rounded-md p-2 bg-muted/40">
          <div className="text-xs font-medium mb-1">Attachments:</div>
          <div className="space-y-2">
            {files.map((file, index) => (
              <div key={index} className="flex items-center justify-between text-sm bg-background rounded p-2">
                <div className="flex items-center gap-2 overflow-hidden">
                  <Paperclip className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
                  <span className="truncate">{file.name}</span>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    ({(file.size / 1024).toFixed(1)} KB)
                  </span>
                </div>
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => removeFile(index)}
                  className="h-6 w-6 p-0"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
      
      <div className="flex justify-between mt-3">
        <div>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            multiple
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={triggerFileInput}
            disabled={loading}
          >
            <Paperclip className="h-3.5 w-3.5 mr-1.5" />
            Attach Files
          </Button>
        </div>
        
        <Button
          type="button"
          size="sm"
          onClick={handleSubmit}
          disabled={loading || !content.trim()}
        >
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
          ) : (
            <Send className="h-3.5 w-3.5 mr-1.5" />
          )}
          {isReply ? "Reply" : "Comment"}
        </Button>
      </div>
    </div>
  );
} 