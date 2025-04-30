"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Loader2, 
  Map, 
  Calendar, 
  Clock, 
  ArrowRight, 
  PlusCircle, 
  Milestone, 
  ArrowUpRight,
  Flag,
  CheckCircle2 
} from "lucide-react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DatePicker } from "@/components/ui/date-picker";
import { useToast } from "@/components/ui/use-toast";

interface Roadmap {
  id: string;
  name: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  projectId: string;
  milestones: Milestone[];
}

interface Milestone {
  id: string;
  name: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  status: string;
  features: Feature[];
}

interface Feature {
  id: string;
  name: string;
  description?: string;
  priority: string;
  status: string;
}

export default function ProjectRoadmapsPage({ params }: { params: { projectId: string } }) {
  const router = useRouter();
  const { toast } = useToast();
  const [project, setProject] = useState<any>(null);
  const [roadmaps, setRoadmaps] = useState<Roadmap[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    startDate: new Date(),
    endDate: new Date(new Date().setMonth(new Date().getMonth() + 6))
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch project details
        const projectResponse = await fetch(`/api/projects/${params.projectId}`);
        
        if (!projectResponse.ok) {
          throw new Error("Failed to fetch project details");
        }
        
        const projectData = await projectResponse.json();
        setProject(projectData);
        
        // Fetch roadmaps
        const roadmapsResponse = await fetch(`/api/projects/${params.projectId}/roadmaps`);
        
        if (!roadmapsResponse.ok) {
          throw new Error("Failed to fetch roadmaps");
        }
        
        const roadmapsData = await roadmapsResponse.json();
        setRoadmaps(roadmapsData.map((roadmap: any) => ({
          ...roadmap,
          startDate: new Date(roadmap.startDate),
          endDate: new Date(roadmap.endDate),
          milestones: roadmap.milestones.map((milestone: any) => ({
            ...milestone,
            startDate: new Date(milestone.startDate),
            endDate: new Date(milestone.endDate)
          }))
        })));
      } catch (err) {
        console.error("Error fetching data:", err);
        setError(err instanceof Error ? err.message : "An unknown error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [params.projectId]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleDateChange = (date: Date | undefined, field: 'startDate' | 'endDate') => {
    if (date) {
      setFormData({
        ...formData,
        [field]: date
      });
    }
  };

  const handleCreateRoadmap = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const response = await fetch(`/api/projects/${params.projectId}/roadmaps`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });
      
      if (!response.ok) {
        throw new Error("Failed to create roadmap");
      }
      
      const newRoadmap = await response.json();
      
      // Add the new roadmap to the list
      setRoadmaps([...roadmaps, {
        ...newRoadmap,
        startDate: new Date(newRoadmap.startDate),
        endDate: new Date(newRoadmap.endDate),
        milestones: []
      }]);
      
      toast({
        title: "Roadmap created",
        description: "Your roadmap has been created successfully."
      });
      
      // Close the dialog and reset the form
      setCreateDialogOpen(false);
      setFormData({
        name: "",
        description: "",
        startDate: new Date(),
        endDate: new Date(new Date().setMonth(new Date().getMonth() + 6))
      });
    } catch (err) {
      console.error("Error creating roadmap:", err);
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to create roadmap",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getMilestoneProgress = (milestone: Milestone) => {
    if (!milestone.features.length) return 0;
    const completed = milestone.features.filter(f => f.status === 'COMPLETED').length;
    return Math.round((completed / milestone.features.length) * 100);
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

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading roadmaps...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-500 font-bold mb-4">
          Error: {error}
        </div>
        <Button onClick={() => window.location.reload()} className="mt-4">
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{project?.name}: Roadmaps</h1>
          <p className="text-muted-foreground">
            Plan your product roadmap, set milestones, and prioritize features
          </p>
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="h-4 w-4 mr-2" />
              Create Roadmap
            </Button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={handleCreateRoadmap}>
              <DialogHeader>
                <DialogTitle>Create a New Roadmap</DialogTitle>
                <DialogDescription>
                  Define the high-level direction and timeline for your project.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 my-6">
                <div className="space-y-2">
                  <Label htmlFor="name">Roadmap Name</Label>
                  <Input 
                    id="name" 
                    name="name"
                    placeholder="e.g., Q3 2023 Product Roadmap" 
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea 
                    id="description" 
                    name="description"
                    placeholder="Describe the goals and focus of this roadmap" 
                    value={formData.description}
                    onChange={handleInputChange}
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Start Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start text-left">
                          <Calendar className="h-4 w-4 mr-2" />
                          {formData.startDate ? format(formData.startDate, "PPP") : "Select date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <DatePicker
                          mode="single"
                          selected={formData.startDate}
                          onSelect={(date) => handleDateChange(date, 'startDate')}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="space-y-2">
                    <Label>End Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start text-left">
                          <Calendar className="h-4 w-4 mr-2" />
                          {formData.endDate ? format(formData.endDate, "PPP") : "Select date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <DatePicker
                          mode="single"
                          selected={formData.endDate}
                          onSelect={(date) => handleDateChange(date, 'endDate')}
                          fromDate={formData.startDate}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setCreateDialogOpen(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create Roadmap"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {roadmaps.length > 0 ? (
        <div className="space-y-6">
          {roadmaps.map((roadmap) => (
            <Card key={roadmap.id} className="overflow-hidden">
              <CardHeader>
                <div className="flex flex-col md:flex-row justify-between items-start gap-2">
                  <div>
                    <CardTitle className="text-2xl">{roadmap.name}</CardTitle>
                    <CardDescription className="mt-2">
                      {roadmap.description || "No description provided"}
                    </CardDescription>
                  </div>
                  <div className="flex flex-wrap gap-2 items-center">
                    <div className="flex items-center text-sm">
                      <Calendar className="h-4 w-4 mr-1 text-muted-foreground" />
                      <span className="text-muted-foreground">
                        {format(roadmap.startDate, "MMM d, yyyy")} - {format(roadmap.endDate, "MMM d, yyyy")}
                      </span>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => router.push(`/projects/${params.projectId}/roadmaps/${roadmap.id}`)}
                    >
                      <ArrowUpRight className="h-4 w-4 mr-1" />
                      View Details
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium">Timeline Progress</h3>
                    <span className="text-sm text-muted-foreground">
                      {Math.round(((new Date().getTime() - roadmap.startDate.getTime()) / 
                        (roadmap.endDate.getTime() - roadmap.startDate.getTime())) * 100)}% Complete
                    </span>
                  </div>
                  <div className="w-full bg-muted h-3 rounded-full overflow-hidden">
                    <div 
                      className="bg-primary h-full transition-all duration-300 ease-in-out"
                      style={{ 
                        width: `${Math.round(((new Date().getTime() - roadmap.startDate.getTime()) / 
                          (roadmap.endDate.getTime() - roadmap.startDate.getTime())) * 100)}%` 
                      }}
                    ></div>
                  </div>
                </div>

                {roadmap.milestones.length > 0 ? (
                  <div className="mt-6">
                    <h3 className="text-sm font-medium mb-3">Key Milestones</h3>
                    <div className="space-y-4">
                      {roadmap.milestones.slice(0, 3).map((milestone) => (
                        <div key={milestone.id} className="flex items-center">
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center mr-4 flex-shrink-0">
                            <Flag className="h-5 w-5 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center">
                              <p className="font-medium truncate">{milestone.name}</p>
                              <div className="ml-2">{getStatusBadge(milestone.status)}</div>
                            </div>
                            <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                              <span>{format(milestone.endDate, "MMM d, yyyy")}</span>
                              {milestone.features.length > 0 && (
                                <div className="flex items-center">
                                  <CheckCircle2 className="h-3 w-3 mr-1" />
                                  <span>{getMilestoneProgress(milestone)}% Complete</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    {roadmap.milestones.length > 3 && (
                      <Button 
                        variant="ghost" 
                        className="mt-4 w-full text-primary"
                        onClick={() => router.push(`/projects/${params.projectId}/roadmaps/${roadmap.id}`)}
                      >
                        View All {roadmap.milestones.length} Milestones
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="mt-6 p-6 border border-dashed rounded-md text-center">
                    <Milestone className="h-8 w-8 mx-auto text-muted-foreground opacity-50" />
                    <h3 className="mt-2 font-medium">No Milestones Yet</h3>
                    <p className="text-sm text-muted-foreground mt-1 mb-4">
                      Add milestones to break down your roadmap into achievable goals
                    </p>
                    <Button 
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/projects/${params.projectId}/roadmaps/${roadmap.id}`)}
                    >
                      <PlusCircle className="h-4 w-4 mr-2" />
                      Add Milestone
                    </Button>
                  </div>
                )}
              </CardContent>
              <CardFooter className="bg-muted/50">
                <Button 
                  variant="link" 
                  className="ml-auto"
                  onClick={() => router.push(`/projects/${params.projectId}/roadmaps/${roadmap.id}`)}
                >
                  Manage Roadmap
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 border rounded-md">
          <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
            <Map className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium">No Roadmaps Yet</h3>
          <p className="text-muted-foreground mt-1 mb-4">
            Create your first roadmap to start planning the future of your project
          </p>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <PlusCircle className="h-4 w-4 mr-2" />
            Create First Roadmap
          </Button>
        </div>
      )}
    </div>
  );
} 