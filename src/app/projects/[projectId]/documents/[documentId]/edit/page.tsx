"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
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
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/spinner";
import { ArrowLeft, Save, X } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Document {
  id: string;
  title: string;
  content: string | null;
  fileUrl: string | null;
}

// Define form schema with Zod
const formSchema = z.object({
  title: z.string().min(1, "Title is required").max(100, "Title is too long"),
  content: z.string().min(1, "Content is required"),
});

type FormValues = z.infer<typeof formSchema>;

export default function EditDocumentPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  
  const [document, setDocument] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  const projectId = params.projectId as string;
  const documentId = params.documentId as string;
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      content: "",
    },
  });
  
  useEffect(() => {
    fetchDocument();
  }, [documentId]);
  
  async function fetchDocument() {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/documents/${documentId}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch document: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // If it's a file document, redirect to view page
      if (data.fileUrl) {
        toast({
          title: "Cannot edit file",
          description: "File documents cannot be edited directly",
          variant: "destructive",
        });
        router.push(`/projects/${projectId}/documents/${documentId}`);
        return;
      }
      
      setDocument(data);
      
      // Set form values
      form.reset({
        title: data.title,
        content: data.content || "",
      });
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
  
  const onSubmit = async (data: FormValues) => {
    setIsSaving(true);
    
    try {
      const response = await fetch(`/api/documents/${documentId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: data.title,
          content: data.content,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update document");
      }

      toast({
        title: "Success",
        description: "Document updated successfully",
      });
      
      // Navigate back to document view
      router.push(`/projects/${projectId}/documents/${documentId}`);
    } catch (error) {
      console.error("Error updating document:", error);
      toast({
        title: "Update failed",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleCancel = () => {
    router.push(`/projects/${projectId}/documents/${documentId}`);
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
          onClick={handleCancel}
        >
          <ArrowLeft className="h-4 w-4" />
          Cancel
        </Button>
        <div className="flex gap-2">
          <Button 
            variant="default" 
            onClick={form.handleSubmit(onSubmit)}
            disabled={isSaving}
          >
            {isSaving ? (
              <>
                <Spinner className="mr-2 h-4 w-4" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save
              </>
            )}
          </Button>
        </div>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Edit Document</CardTitle>
        </CardHeader>
        <CardContent>
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
                name="content"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Content</FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field} 
                        placeholder="Enter document content..." 
                        className="min-h-[400px] font-mono text-sm"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Hidden submit button for form validation */}
              <button type="submit" className="hidden" />
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
} 