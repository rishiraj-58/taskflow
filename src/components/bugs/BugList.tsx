"use client";

import { useState } from "react";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader,
  TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import EditBugModal from "./EditBugModal";
import { formatDistanceToNow } from "date-fns";
import type { Bug } from "@/lib/types";

interface BugListProps {
  bugs: Bug[];
  loading: boolean;
  error: string | null;
  projectId: string;
  onBugUpdated: (bug: Bug) => void;
  onBugDeleted: (bugId: string) => void;
}

export function BugList({ 
  bugs, 
  loading, 
  error, 
  projectId,
  onBugUpdated,
  onBugDeleted 
}: BugListProps) {
  const { toast } = useToast();
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedBug, setSelectedBug] = useState<Bug | null>(null);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "OPEN":
        return <Badge variant="default" className="bg-red-500">Open</Badge>;
      case "IN_PROGRESS":
        return <Badge variant="default" className="bg-blue-500">In Progress</Badge>;
      case "FIXED":
        return <Badge variant="default" className="bg-yellow-500">Fixed</Badge>;
      case "VERIFIED":
        return <Badge variant="default" className="bg-green-500">Verified</Badge>;
      case "CLOSED":
        return <Badge variant="outline" className="bg-gray-200 text-gray-800">Closed</Badge>;
      case "REOPENED":
        return <Badge variant="default" className="bg-purple-500">Reopened</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "LOW":
        return <Badge variant="outline" className="border-blue-500 text-blue-500">Low</Badge>;
      case "MEDIUM":
        return <Badge variant="outline" className="border-yellow-500 text-yellow-500">Medium</Badge>;
      case "HIGH":
        return <Badge variant="outline" className="border-orange-500 text-orange-500">High</Badge>;
      case "CRITICAL":
        return <Badge variant="outline" className="border-red-500 text-red-500">Critical</Badge>;
      default:
        return <Badge variant="outline">{priority}</Badge>;
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case "LOW":
        return <Badge variant="outline" className="border-blue-500 text-blue-500">Low</Badge>;
      case "MEDIUM":
        return <Badge variant="outline" className="border-yellow-500 text-yellow-500">Medium</Badge>;
      case "HIGH":
        return <Badge variant="outline" className="border-orange-500 text-orange-500">High</Badge>;
      case "CRITICAL":
        return (
          <Badge variant="outline" className="border-red-500 text-red-500 flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" />
            <span>Critical</span>
          </Badge>
        );
      default:
        return <Badge variant="outline">{severity}</Badge>;
    }
  };

  const handleEditClick = (bug: Bug) => {
    setSelectedBug(bug);
    setEditModalOpen(true);
  };

  const handleDeleteClick = (bug: Bug) => {
    setSelectedBug(bug);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedBug) return;

    try {
      const response = await fetch(`/api/projects/${projectId}/bugs/${selectedBug.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete bug");
      }

      onBugDeleted(selectedBug.id);
      setDeleteDialogOpen(false);
      
      toast({
        title: "Bug deleted",
        description: "The bug has been permanently deleted.",
      });
    } catch (error) {
      console.error("Error deleting bug:", error);
      toast({
        title: "Error",
        description: "Failed to delete the bug. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleUpdateBug = async (updatedBugData: any) => {
    if (!selectedBug) return;

    try {
      const response = await fetch(`/api/projects/${projectId}/bugs/${selectedBug.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatedBugData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update bug");
      }

      const updatedBug = await response.json();
      onBugUpdated(updatedBug);
      setEditModalOpen(false);
      
      toast({
        title: "Bug updated",
        description: "The bug has been updated successfully.",
      });
    } catch (error) {
      console.error("Error updating bug:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update bug",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-6 text-center">
        <p className="text-red-500 mb-2">{error}</p>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => window.location.reload()}
        >
          Try Again
        </Button>
      </div>
    );
  }

  if (bugs.length === 0) {
    return (
      <div className="text-center py-8 border border-dashed rounded-md">
        <p className="text-muted-foreground">No bugs found</p>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Severity</TableHead>
              <TableHead>Reported By</TableHead>
              <TableHead>Assigned To</TableHead>
              <TableHead>Reported</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {bugs.map((bug) => (
              <TableRow key={bug.id}>
                <TableCell className="font-medium">{bug.title}</TableCell>
                <TableCell>{getStatusBadge(bug.status)}</TableCell>
                <TableCell>{getPriorityBadge(bug.priority)}</TableCell>
                <TableCell>{getSeverityBadge(bug.severity)}</TableCell>
                <TableCell>
                  {bug.reporter ? `${bug.reporter.firstName} ${bug.reporter.lastName}` : "Unknown"}
                </TableCell>
                <TableCell>
                  {bug.assignee ? `${bug.assignee.firstName} ${bug.assignee.lastName}` : "Unassigned"}
                </TableCell>
                <TableCell>
                  {formatDistanceToNow(new Date(bug.createdAt), { addSuffix: true })}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEditClick(bug)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-red-500"
                      onClick={() => handleDeleteClick(bug)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {selectedBug && (
        <>
          <EditBugModal
            isOpen={editModalOpen}
            onClose={() => setEditModalOpen(false)}
            onSubmit={handleUpdateBug}
            bug={selectedBug}
            projectId={projectId}
          />

          <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete Bug</DialogTitle>
                <DialogDescription>
                  Are you sure you want to delete the bug "{selectedBug.title}"? This action cannot be undone.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setDeleteDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDeleteConfirm}
                >
                  Delete
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}
    </>
  );
} 