import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Upload, FileText, X, Check, Loader2, Paperclip } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Spinner } from "@/components/ui/spinner";

// Define form schema with Zod
const formSchema = z.object({
  title: z.string().min(1, "Title is required").max(100, "Title is too long"),
  file: z.any()
    .refine(file => file?.length > 0, "File is required")
    .refine(files => {
      // Limit file size to 10MB
      return files?.[0]?.size <= 10 * 1024 * 1024;
    }, "File size must be less than 10MB"),
});

type FormValues = z.infer<typeof formSchema>;

interface UploadDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadComplete: () => void;
  projectId: string;
}

export default function UploadDocumentModal({
  isOpen,
  onClose,
  onUploadComplete,
  projectId,
}: UploadDocumentModalProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      file: undefined,
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      setSelectedFile(file);
      form.setValue('file', files);
      
      // Set default title to file name without extension if title is empty
      if (!form.getValues("title")) {
        const fileName = file.name.split(".").slice(0, -1).join(".");
        form.setValue("title", fileName);
      }
    } else {
      setSelectedFile(null);
    }
  };

  const triggerFileInput = () => {
    console.log("Triggering input", fileInputRef.current);
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const clearFileSelection = () => {
    setSelectedFile(null);
    form.resetField("file");
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " bytes";
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
    else return (bytes / 1048576).toFixed(1) + " MB";
  };

  const onSubmit = async (data: FormValues) => {
    if (!selectedFile) {
      toast({
        title: "Error",
        description: "Please select a file to upload",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    
    try {
      // Step 1: Create FormData to send metadata to our API
      const formData = new FormData();
      formData.append("title", data.title);
      formData.append("file", selectedFile);
      formData.append("projectId", projectId);

      // Step 2: Call our API to create document record and get S3 upload URL
      const response = await fetch("/api/documents/upload", {
        method: "POST",
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to initialize document upload");
      }
      
      const responseData = await response.json();
      const { document, uploadUrl } = responseData;
      
      // Step 3: Upload directly to S3 using the pre-signed URL
      const uploadResponse = await fetch(uploadUrl, {
        method: "PUT",
        body: selectedFile,
        headers: {
          "Content-Type": selectedFile.type
        },
      });
      
      if (!uploadResponse.ok) {
        throw new Error("Failed to upload file to storage");
      }

      // Success
      toast({
        title: "Success",
        description: "Document uploaded successfully",
      });

      console.log("Document uploaded to S3 successfully. Document record:", document);
      console.log("Document details:", {
        id: document.id,
        title: document.title,
        fileUrl: document.fileUrl,
        projectId: document.projectId,
        createdAt: document.createdAt
      });
      
      // Reset the form
      form.reset();
      setSelectedFile(null);
      setUploadProgress(0);
      
      // Notify parent component
      console.log("Calling onUploadComplete callback");
      
      // Close dialog first to avoid React state update issues
      onClose();
      
      // Call the callback with a slight delay to ensure UI updates properly
      setTimeout(() => {
        onUploadComplete();
      }, 100);
    } catch (error) {
      console.error("Error uploading document:", error);
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleCloseAndReset = (openState: boolean) => {
    if (!openState) {
      // Only reset when actually closing
      console.log("Resetting form state on close");
      form.reset();
      setSelectedFile(null);
      setUploadProgress(0);
      onClose();
    }
  };

  // Handler for the Cancel button click
  const handleCancel = () => {
    form.reset();
    setSelectedFile(null);
    setUploadProgress(0);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleCloseAndReset}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Upload Document</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Document Title</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Enter document title" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="file"
              render={() => (
                <FormItem>
                  <FormLabel>File</FormLabel>
                  <FormControl>
                    <div className="mt-1">
                      {/* Hidden file input */}
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        className="hidden"
                        accept="*/*"
                      />
                      
                      {/* File selection button - exactly like CommentForm */}
                      <Button
                        type="button"
                        variant="outline"
                        onClick={triggerFileInput}
                        className="w-full"
                        disabled={isUploading}
                      >
                        <Paperclip className="h-4 w-4 mr-2" />
                        Select File
                      </Button>
                      
                      {/* Selected file display */}
                      {selectedFile && (
                        <div className="mt-3 border rounded-md p-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <FileText className="h-5 w-5 text-muted-foreground" />
                              <div>
                                <p className="text-sm font-medium truncate">{selectedFile.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {formatFileSize(selectedFile.size)}
                                </p>
                              </div>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={clearFileSelection}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {isUploading && uploadProgress > 0 && (
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div 
                  className="bg-primary h-2.5 rounded-full" 
                  style={{ width: `${uploadProgress}%` }}
                ></div>
                <p className="text-xs text-muted-foreground mt-1 text-right">
                  {uploadProgress}%
                </p>
              </div>
            )}

            <div className="flex justify-end space-x-3">
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={isUploading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isUploading || !selectedFile}>
                {isUploading ? (
                  <>
                    <Spinner className="mr-2 h-4 w-4" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Upload
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
} 