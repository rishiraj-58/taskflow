"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Calendar } from "@/components/ui/calendar";
import { useToast } from "@/components/ui/use-toast";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ArrowLeft, CalendarIcon, PlusCircle, Pencil, Trash2, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";
import { format } from "date-fns";

interface Feature {
  id: string;
  name: string;
  description: string | null;
  priority: string;
  status: string;
}

interface Milestone {
  id: string;
  name: string;
  description: string | null;
  startDate: Date;
  endDate: Date;
  status: string;
  features: Feature[];
  roadmapId: string;
}

export default function MilestoneDetailPage({ 
  params 
}: { 
  params: { projectId: string; roadmapId: string; milestoneId: string } 
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [milestone, setMilestone] = useState<Milestone | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Edit milestone state
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    name: "",
    description: "",
    startDate: new Date(),
    endDate: new Date(),
    status: "PLANNED",
  });
  const [isSaving, setIsSaving] = useState(false);

  // Add feature state
  const [showAddFeature, setShowAddFeature] = useState(false);
  const [featureData, setFeatureData] = useState({
    name: "",
    description: "",
    priority: "MEDIUM",
    status: "PLANNED",
  });
  const [isAddingFeature, setIsAddingFeature] = useState(false);

  // Delete milestone state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchMilestoneData();
  }, [params.milestoneId]);

  const fetchMilestoneData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/milestones/${params.milestoneId}`);
      
      if (!response.ok) {
        throw new Error("Failed to fetch milestone details");
      }
      
      const data = await response.json();
      
      // Format dates
      setMilestone({
        ...data,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
      });

      // Initialize edit form with current values
      setEditData({
        name: data.name,
        description: data.description || "",
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        status: data.status,
      });
    } catch (err) {
      console.error("Error fetching milestone:", err);
      setError(err instanceof Error ? err.message : "An unknown error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleEditMilestone = async () => {
    try {
      setIsSaving(true);
      
      const response = await fetch(`/api/milestones/${params.milestoneId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(editData),
      });
      
      if (!response.ok) {
        throw new Error("Failed to update milestone");
      }
      
      toast({
        title: "Milestone updated",
        description: "The milestone has been successfully updated",
      });
      
      setIsEditing(false);
      fetchMilestoneData();
    } catch (err) {
      console.error("Error updating milestone:", err);
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to update milestone",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddFeature = async () => {
    try {
      setIsAddingFeature(true);
      
      const response = await fetch(`/api/milestones/${params.milestoneId}/features`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(featureData),
      });
      
      if (!response.ok) {
        throw new Error("Failed to add feature");
      }
      
      toast({
        title: "Feature added",
        description: "The feature has been successfully added to the milestone",
      });
      
      setFeatureData({
        name: "",
        description: "",
        priority: "MEDIUM",
        status: "PLANNED",
      });
      
      setShowAddFeature(false);
      fetchMilestoneData();
    } catch (err) {
      console.error("Error adding feature:", err);
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to add feature",
        variant: "destructive",
      });
    } finally {
      setIsAddingFeature(false);
    }
  };

  const handleDeleteFeature = async (featureId: string) => {
    try {
      const response = await fetch(`/api/features/${featureId}`, {
        method: "DELETE",
      });
      
      if (!response.ok) {
        throw new Error("Failed to delete feature");
      }
      
      toast({
        title: "Feature deleted",
        description: "The feature has been successfully deleted",
      });
      
      fetchMilestoneData();
    } catch (err) {
      console.error("Error deleting feature:", err);
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to delete feature",
        variant: "destructive",
      });
    }
  };

  const handleDeleteMilestone = async () => {
    try {
      setIsDeleting(true);
      
      const response = await fetch(`/api/milestones/${params.milestoneId}`, {
        method: "DELETE",
      });
      
      if (!response.ok) {
        throw new Error("Failed to delete milestone");
      }
      
      toast({
        title: "Milestone deleted",
        description: "The milestone has been successfully deleted",
      });
      
      router.push(`/projects/${params.projectId}/roadmaps/${params.roadmapId}`);
    } catch (err) {
      console.error("Error deleting milestone:", err);
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to delete milestone",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status.toUpperCase()) {
      case 'PLANNED':
        return <Badge variant="outline">Planned</Badge>;
      case 'IN_PROGRESS':
        return <Badge variant="default" className="bg-blue-600">In Progress</Badge>;
      case 'COMPLETED':
        return <Badge variant="default" className="bg-green-600">Completed</Badge>;
      case 'DELAYED':
        return <Badge variant="default" className="bg-amber-600">Delayed</Badge>;
      case 'CANCELLED':
        return <Badge variant="default" className="bg-red-600">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority.toUpperCase()) {
      case 'LOW':
        return <Badge variant="outline" className="bg-blue-100">Low</Badge>;
      case 'MEDIUM':
        return <Badge variant="outline" className="bg-green-100">Medium</Badge>;
      case 'HIGH':
        return <Badge variant="outline" className="bg-amber-100">High</Badge>;
      case 'CRITICAL':
        return <Badge variant="outline" className="bg-red-100">Critical</Badge>;
      default:
        return <Badge variant="outline">{priority}</Badge>;
    }
  };

  const getFeatureProgress = () => {
    if (!milestone || !milestone.features.length) return 0;
    const completed = milestone.features.filter(f => f.status === 'COMPLETED').length;
    return Math.round((completed / milestone.features.length) * 100);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading milestone details...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="mx-auto h-12 w-12 text-amber-500 mb-4" />
        <h2 className="text-2xl font-bold mb-2">Error Loading Milestone</h2>
        <p className="text-muted-foreground mb-6">{error}</p>
        <Button onClick={() => router.push(`/projects/${params.projectId}/roadmaps/${params.roadmapId}`)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Roadmap
        </Button>
      </div>
    );
  }

  if (!milestone) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="mx-auto h-12 w-12 text-amber-500 mb-4" />
        <h2 className="text-2xl font-bold mb-2">Milestone Not Found</h2>
        <p className="text-muted-foreground mb-6">
          The milestone you're looking for could not be found.
        </p>
        <Button onClick={() => router.push(`/projects/${params.projectId}/roadmaps/${params.roadmapId}`)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Roadmap
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-8">
      <div className="flex items-center gap-2">
        <Button 
          variant="outline" 
          size="icon"
          onClick={() => router.push(`/projects/${params.projectId}/roadmaps/${params.roadmapId}`)}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{milestone.name}</h1>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {getStatusBadge(milestone.status)}
            <span>•</span>
            <span>{format(milestone.startDate, "MMM d")} - {format(milestone.endDate, "MMM d, yyyy")}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Details</CardTitle>
              <Button variant="outline" onClick={() => setIsEditing(true)}>
                <Pencil className="h-4 w-4 mr-2" />
                Edit
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <p className="font-medium">Description</p>
                <p className="text-muted-foreground">{milestone.description || "No description provided"}</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1">
                  <p className="font-medium">Start Date</p>
                  <p className="text-muted-foreground">{format(milestone.startDate, "MMMM d, yyyy")}</p>
                </div>
                
                <div className="space-y-1">
                  <p className="font-medium">End Date</p>
                  <p className="text-muted-foreground">{format(milestone.endDate, "MMMM d, yyyy")}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Features</CardTitle>
              <Button variant="outline" onClick={() => setShowAddFeature(true)}>
                <PlusCircle className="h-4 w-4 mr-2" />
                Add Feature
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Completion Progress</span>
                  <span>
                    {milestone.features.filter(f => f.status === 'COMPLETED').length} of {milestone.features.length} completed
                  </span>
                </div>
                <Progress value={getFeatureProgress()} />
              </div>
              
              {milestone.features.length > 0 ? (
                <div className="divide-y">
                  {milestone.features.map((feature) => (
                    <div key={feature.id} className="py-4 first:pt-0 last:pb-0">
                      <div className="flex justify-between items-start mb-2">
                        <div className="space-y-1">
                          <div className="font-medium flex items-center">
                            {feature.name}
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            {getStatusBadge(feature.status)}
                            {getPriorityBadge(feature.priority)}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteFeature(feature.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                      {feature.description && (
                        <p className="text-sm text-muted-foreground">{feature.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="mx-auto w-12 h-12 bg-muted rounded-full flex items-center justify-center mb-3">
                    <CheckCircle2 className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-medium mb-1">No Features</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Add features to track progress on this milestone
                  </p>
                  <Button variant="outline" onClick={() => setShowAddFeature(true)}>
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Add First Feature
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button className="w-full" variant="default" onClick={() => setIsEditing(true)}>
                <Pencil className="h-4 w-4 mr-2" />
                Edit Milestone
              </Button>
              
              <Button className="w-full" variant="outline" onClick={() => setShowAddFeature(true)}>
                <PlusCircle className="h-4 w-4 mr-2" />
                Add Feature
              </Button>
              
              <Button 
                className="w-full" 
                variant="destructive"
                onClick={() => setShowDeleteConfirm(true)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Milestone
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Edit Milestone Dialog */}
      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>Edit Milestone</DialogTitle>
            <DialogDescription>
              Update details for this milestone
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={editData.name}
                onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                placeholder="Milestone name"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={editData.description}
                onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                placeholder="Describe the milestone objectives"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Start Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(editData.startDate, "PPP")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={editData.startDate}
                      onSelect={(date) => date && setEditData({ ...editData, startDate: date })}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="grid gap-2">
                <Label>End Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(editData.endDate, "PPP")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={editData.endDate}
                      onSelect={(date) => date && setEditData({ ...editData, endDate: date })}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Status</Label>
              <Select
                value={editData.status}
                onValueChange={(value) => setEditData({ ...editData, status: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PLANNED">Planned</SelectItem>
                  <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                  <SelectItem value="DELAYED">Delayed</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditing(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              onClick={handleEditMilestone}
              disabled={isSaving}
            >
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Feature Dialog */}
      <Dialog open={showAddFeature} onOpenChange={setShowAddFeature}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>Add Feature</DialogTitle>
            <DialogDescription>
              Add a new feature to this milestone
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="featureName">Name</Label>
              <Input
                id="featureName"
                value={featureData.name}
                onChange={(e) => setFeatureData({ ...featureData, name: e.target.value })}
                placeholder="Feature name"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="featureDescription">Description</Label>
              <Textarea
                id="featureDescription"
                value={featureData.description}
                onChange={(e) => setFeatureData({ ...featureData, description: e.target.value })}
                placeholder="Describe the feature"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Priority</Label>
                <Select
                  value={featureData.priority}
                  onValueChange={(value) => setFeatureData({ ...featureData, priority: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOW">Low</SelectItem>
                    <SelectItem value="MEDIUM">Medium</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                    <SelectItem value="CRITICAL">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label>Status</Label>
                <Select
                  value={featureData.status}
                  onValueChange={(value) => setFeatureData({ ...featureData, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PLANNED">Planned</SelectItem>
                    <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                    <SelectItem value="COMPLETED">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowAddFeature(false)}
              disabled={isAddingFeature}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddFeature}
              disabled={isAddingFeature || !featureData.name}
            >
              {isAddingFeature ? "Adding..." : "Add Feature"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Delete Milestone</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this milestone? This action cannot be undone and will also delete all associated features.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteConfirm(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteMilestone}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete Milestone"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 