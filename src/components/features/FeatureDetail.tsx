import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Pencil, Trash2, AlertTriangle } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import EditFeatureForm from "./EditFeatureForm";
import { Feature } from "./FeaturesList";

interface FeatureDetailProps {
  featureId: string;
}

export default function FeatureDetail({ featureId }: FeatureDetailProps) {
  const [feature, setFeature] = useState<Feature | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    async function fetchFeature() {
      setLoading(true);
      setError(null);
      
      try {
        const response = await fetch(`/api/features/${featureId}`);
        
        if (!response.ok) {
          throw new Error("Failed to fetch feature details");
        }
        
        const data = await response.json();
        setFeature(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An unknown error occurred");
        toast({
          title: "Error",
          description: "Failed to load feature details",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    }
    
    if (featureId) {
      fetchFeature();
    }
  }, [featureId, toast]);

  const handleFeatureUpdated = (updatedFeature: Feature) => {
    setFeature(updatedFeature);
    setIsEditDialogOpen(false);
    toast({
      title: "Success",
      description: "Feature updated successfully",
    });
  };

  const handleDeleteFeature = async () => {
    if (!feature) return;
    
    setIsDeleting(true);
    
    try {
      const response = await fetch(`/api/features/${feature.id}`, {
        method: "DELETE",
      });
      
      if (!response.ok) {
        throw new Error("Failed to delete feature");
      }
      
      toast({
        title: "Success",
        description: "Feature deleted successfully",
      });
      
      // Navigate back to the milestone or roadmap page
      if (feature.milestoneId) {
        router.push(`/milestones/${feature.milestoneId}`);
      } else {
        router.push("/roadmaps");
      }
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to delete feature",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusColors: Record<string, string> = {
      PLANNED: "bg-blue-100 text-blue-800",
      "IN_PROGRESS": "bg-yellow-100 text-yellow-800",
      COMPLETED: "bg-green-100 text-green-800",
      DELAYED: "bg-red-100 text-red-800",
    };
    
    return (
      <Badge className={statusColors[status] || "bg-gray-100 text-gray-800"}>
        {status.replace("_", " ")}
      </Badge>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const priorityColors: Record<string, string> = {
      LOW: "bg-blue-100 text-blue-800",
      MEDIUM: "bg-yellow-100 text-yellow-800",
      HIGH: "bg-orange-100 text-orange-800",
      CRITICAL: "bg-red-100 text-red-800",
    };
    
    return (
      <Badge className={priorityColors[priority] || "bg-gray-100 text-gray-800"}>
        {priority}
      </Badge>
    );
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
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <AlertTriangle className="h-12 w-12 text-red-500" />
        <p className="text-lg font-medium text-center">{error}</p>
        <Button onClick={() => window.location.reload()}>Try Again</Button>
      </div>
    );
  }

  if (!feature) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <AlertTriangle className="h-12 w-12 text-yellow-500" />
        <p className="text-lg font-medium text-center">Feature not found</p>
        <Button onClick={() => router.back()}>Go Back</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between">
          <div>
            <CardTitle className="text-2xl">{feature.name}</CardTitle>
            {feature.milestone && (
              <CardDescription>
                Milestone: {feature.milestone.name}
              </CardDescription>
            )}
          </div>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setIsEditDialogOpen(true)}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="text-red-500 hover:text-red-700"
              onClick={() => setIsDeleteDialogOpen(true)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-2">Status & Priority</h3>
            <div className="flex gap-3">
              {getStatusBadge(feature.status)}
              {getPriorityBadge(feature.priority)}
            </div>
          </div>
          
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-2">Description</h3>
            <p className="text-sm whitespace-pre-wrap">
              {feature.description || "No description provided."}
            </p>
          </div>
          
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-2">Dates</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="font-medium">Created</p>
                <p>{new Date(feature.createdAt).toLocaleDateString()}</p>
              </div>
              <div>
                <p className="font-medium">Last Updated</p>
                <p>{new Date(feature.updatedAt).toLocaleDateString()}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit Feature Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Feature</DialogTitle>
            <DialogDescription>
              Make changes to the feature details.
            </DialogDescription>
          </DialogHeader>
          {feature && (
            <EditFeatureForm
              feature={feature}
              onFeatureUpdated={() => handleFeatureUpdated(feature)}
              onCancel={() => setIsEditDialogOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Feature</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this feature? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteFeature}
              disabled={isDeleting}
            >
              {isDeleting ? <Spinner className="h-4 w-4 mr-2" /> : null}
              {isDeleting ? "Deleting..." : "Delete Feature"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 