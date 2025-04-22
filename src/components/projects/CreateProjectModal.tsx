"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, AlertCircle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface Workspace {
  id: string;
  name: string;
}

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (project: { name: string; description: string; workspaceId: string }) => void;
}

export default function CreateProjectModal({ isOpen, onClose, onCreate }: CreateProjectModalProps) {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    workspaceId: "",
  });
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingWorkspaces, setIsLoadingWorkspaces] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const fetchWorkspaces = async () => {
      try {
        setIsLoadingWorkspaces(true);
        const response = await fetch("/api/workspaces");
        
        if (!response.ok) {
          throw new Error("Failed to fetch workspaces");
        }
        
        const data = await response.json();
        setWorkspaces(data);
        
        // Auto-select first workspace if available
        if (data.length > 0 && !formData.workspaceId) {
          setFormData(prev => ({ ...prev, workspaceId: data[0].id }));
        }
      } catch (err) {
        console.error("Error fetching workspaces:", err);
        setError("Failed to load workspaces. Please try again.");
      } finally {
        setIsLoadingWorkspaces(false);
      }
    };

    if (isOpen) {
      fetchWorkspaces();
    }
  }, [isOpen, formData.workspaceId]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleWorkspaceChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      workspaceId: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast({
        title: "Error",
        description: "Project name is required",
        variant: "destructive",
      });
      return;
    }
    
    if (!formData.workspaceId) {
      toast({
        title: "Error",
        description: "Please select a workspace",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    setError(null);
    
    try {
      await onCreate(formData);
      setFormData({ name: "", description: "", workspaceId: "" });
    } catch (err) {
      console.error("Error creating project:", err);
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setFormData({ name: "", description: "", workspaceId: "" });
      setError(null);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New Project</DialogTitle>
        </DialogHeader>
        
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md flex items-start">
            <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="name">Project Name *</Label>
            <Input
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Enter project name"
              disabled={isSubmitting}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Describe what this project is about"
              disabled={isSubmitting}
              rows={3}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="workspace">Workspace *</Label>
            {isLoadingWorkspaces ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Loading workspaces...</span>
              </div>
            ) : workspaces.length === 0 ? (
              <div className="text-sm text-muted-foreground">
                No workspaces available. Please create a workspace first.
              </div>
            ) : (
              <Select
                value={formData.workspaceId}
                onValueChange={handleWorkspaceChange}
                disabled={isSubmitting}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a workspace" />
                </SelectTrigger>
                <SelectContent>
                  {workspaces.map((workspace) => (
                    <SelectItem key={workspace.id} value={workspace.id}>
                      {workspace.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          
          <DialogFooter className="pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleClose} 
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={
                isSubmitting || 
                isLoadingWorkspaces || 
                workspaces.length === 0 || 
                !formData.name.trim() || 
                !formData.workspaceId
              }
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Project"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 