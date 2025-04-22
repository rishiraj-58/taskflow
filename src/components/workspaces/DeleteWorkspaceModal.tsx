"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { AlertTriangle } from "lucide-react";

interface DeleteWorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  workspaceName: string;
  onDelete: () => void;
}

export default function DeleteWorkspaceModal({ isOpen, onClose, workspaceId, workspaceName, onDelete }: DeleteWorkspaceModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [confirmName, setConfirmName] = useState("");
  const { toast } = useToast();

  const handleDelete = async () => {
    if (confirmName !== workspaceName) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Workspace name does not match.",
      });
      return;
    }

    setIsLoading(true);
    
    try {
      const response = await fetch(`/api/workspaces/${workspaceId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        toast({
          title: "Workspace deleted",
          description: `"${workspaceName}" has been permanently deleted.`,
        });
        onDelete();
      } else {
        const data = await response.json();
        toast({
          variant: "destructive",
          title: "Error deleting workspace",
          description: data.error || "Failed to delete workspace.",
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "An unexpected error occurred.",
      });
      console.error("Error deleting workspace:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCloseModal = () => {
    setConfirmName("");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleCloseModal()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-red-600 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Delete Workspace
          </DialogTitle>
        </DialogHeader>
        
        <div className="py-4 space-y-4">
          <div className="text-sm text-gray-700 dark:text-gray-300 space-y-3">
            <p>
              This action <span className="font-bold">cannot be undone</span>. This will permanently delete the 
              <span className="font-bold"> {workspaceName}</span> workspace and all of its data.
            </p>
            <p>
              Please type <span className="font-bold">{workspaceName}</span> to confirm.
            </p>
          </div>
          
          <input
            type="text"
            value={confirmName}
            onChange={(e) => setConfirmName(e.target.value)}
            placeholder="Type workspace name to confirm"
            className="mt-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm"
          />
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button 
            type="button" 
            variant="outline" 
            onClick={handleCloseModal} 
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button 
            type="button" 
            variant="destructive" 
            onClick={handleDelete} 
            disabled={isLoading || confirmName !== workspaceName}
          >
            {isLoading ? "Deleting..." : "Delete Workspace"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 