import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { PencilIcon, Trash2Icon, PlusIcon, CheckCircle, Clock, AlertTriangle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import CreateFeatureForm from "./CreateFeatureForm";
import EditFeatureForm from "./EditFeatureForm";

export interface Feature {
  id: string;
  name: string;
  description: string | null;
  status: "PLANNED" | "IN_PROGRESS" | "COMPLETED" | "DELAYED";
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  milestoneId: string;
  milestone?: {
    name: string;
    id: string;
  };
  createdAt: string;
  updatedAt: string;
}

type Milestone = {
  id: string;
  name: string;
};

interface FeaturesListProps {
  features: Feature[];
  milestoneId: string;
  projectId: string;
  loading: boolean;
  error: string | null;
  onFeatureUpdated: () => void;
}

export default function FeaturesList({
  features,
  milestoneId,
  projectId,
  loading,
  error,
  onFeatureUpdated,
}: FeaturesListProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedFeature, setSelectedFeature] = useState<Feature | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [updatingFeatureId, setUpdatingFeatureId] = useState<string | null>(null);

  const getStatusBadge = (status: Feature["status"]) => {
    switch (status) {
      case "PLANNED":
        return <Badge variant="outline">Planned</Badge>;
      case "IN_PROGRESS":
        return <Badge variant="secondary">In Progress</Badge>;
      case "COMPLETED":
        return <Badge>Completed</Badge>;
      case "DELAYED":
        return <Badge variant="destructive">Delayed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPriorityBadge = (priority: Feature["priority"]) => {
    switch (priority) {
      case "LOW":
        return <Badge variant="outline">Low</Badge>;
      case "MEDIUM":
        return <Badge variant="secondary">Medium</Badge>;
      case "HIGH":
        return <Badge>High</Badge>;
      case "CRITICAL":
        return <Badge variant="destructive">Critical</Badge>;
      default:
        return <Badge variant="outline">{priority}</Badge>;
    }
  };

  const handleEditClick = (feature: Feature) => {
    setSelectedFeature(feature);
    setIsEditModalOpen(true);
  };

  const handleDeleteClick = (feature: Feature) => {
    setSelectedFeature(feature);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedFeature) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/features/${selectedFeature.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to delete feature");
      }

      toast({
        title: "Feature deleted",
        description: "The feature has been deleted successfully.",
      });

      setIsDeleteDialogOpen(false);
      onFeatureUpdated();
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "An unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setSelectedFeature(null);
    }
  };

  const updateFeatureStatus = async (featureId: string, newStatus: Feature["status"]) => {
    setUpdatingFeatureId(featureId);
    try {
      const response = await fetch(`/api/features/${featureId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update status");
      }

      toast({
        title: "Status updated",
        description: `Feature status changed to ${newStatus.replace("_", " ")}`,
      });

      onFeatureUpdated();
    } catch (error) {
      console.error("Error updating status:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setUpdatingFeatureId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-8">
        <p className="text-red-500 mb-4">{error}</p>
        <Button onClick={onFeatureUpdated}>Retry</Button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Features</h2>
        <Button
          onClick={() => setIsCreateModalOpen(true)}
          size="sm"
          className="flex items-center gap-1"
        >
          <PlusIcon className="h-4 w-4" />
          Add Feature
        </Button>
      </div>

      {features.length === 0 ? (
        <div className="text-center p-8 border rounded-md">
          <p className="text-muted-foreground mb-4">No features found</p>
          <Button onClick={() => setIsCreateModalOpen(true)}>
            Create your first feature
          </Button>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead className="text-right">Edit/Delete</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {features.map((feature) => (
              <TableRow key={feature.id}>
                <TableCell className="font-medium">{feature.name}</TableCell>
                <TableCell>{getStatusBadge(feature.status)}</TableCell>
                <TableCell>
                  <div className="flex items-center space-x-2">
                    {updatingFeatureId === feature.id ? (
                      <Spinner className="h-4 w-4" />
                    ) : (
                      <>
                        {feature.status !== "PLANNED" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2"
                            onClick={() => updateFeatureStatus(feature.id, "PLANNED")}
                          >
                            <Clock className="h-4 w-4 mr-1" />
                            Plan
                          </Button>
                        )}
                        {feature.status !== "IN_PROGRESS" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2"
                            onClick={() => updateFeatureStatus(feature.id, "IN_PROGRESS")}
                          >
                            <Clock className="h-4 w-4 mr-1" />
                            Start
                          </Button>
                        )}
                        {feature.status !== "COMPLETED" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2"
                            onClick={() => updateFeatureStatus(feature.id, "COMPLETED")}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Complete
                          </Button>
                        )}
                        {feature.status !== "DELAYED" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2"
                            onClick={() => updateFeatureStatus(feature.id, "DELAYED")}
                          >
                            <AlertTriangle className="h-4 w-4 mr-1" />
                            Delay
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </TableCell>
                <TableCell>{getPriorityBadge(feature.priority)}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEditClick(feature)}
                    >
                      <PencilIcon className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteClick(feature)}
                    >
                      <Trash2Icon className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* Create Feature Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>Add New Feature</DialogTitle>
          </DialogHeader>
          <CreateFeatureForm
            projectId={projectId}
            milestoneId={milestoneId}
            onFeatureCreated={() => {
              setIsCreateModalOpen(false);
              onFeatureUpdated();
            }}
            onCancel={() => setIsCreateModalOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Feature Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>Edit Feature</DialogTitle>
          </DialogHeader>
          {selectedFeature && (
            <EditFeatureForm
              feature={selectedFeature}
              onFeatureUpdated={() => {
                setIsEditModalOpen(false);
                onFeatureUpdated();
              }}
              onCancel={() => setIsEditModalOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p>
              Are you sure you want to delete the feature &quot;
              {selectedFeature?.name}&quot;? This action cannot be undone.
            </p>
          </div>
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Spinner className="mr-2 h-4 w-4" /> Deleting...
                </>
              ) : (
                "Delete Feature"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
} 