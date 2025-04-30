"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, ArrowLeft, Calendar, Clock, PlusCircle, Settings, Milestone as MilestoneIcon, CheckCircle2, AlertTriangle } from "lucide-react";
import { format, differenceInDays, isBefore, isAfter } from "date-fns";
import { AddMilestoneModal } from "@/components/roadmaps/AddMilestoneModal";
import { ManageRoadmapModal } from "@/components/roadmaps/ManageRoadmapModal";

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
}

interface Roadmap {
  id: string;
  name: string;
  description: string | null;
  startDate: Date;
  endDate: Date;
  projectId: string;
  milestones: Milestone[];
}

export default function RoadmapDetailPage({ 
  params 
}: { 
  params: { projectId: string; roadmapId: string } 
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [roadmap, setRoadmap] = useState<Roadmap | null>(null);
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addMilestoneOpen, setAddMilestoneOpen] = useState(false);
  const [manageRoadmapOpen, setManageRoadmapOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("all");

  useEffect(() => {
    fetchData();
  }, [params.projectId, params.roadmapId]);

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
      
      // Fetch roadmap details
      const roadmapResponse = await fetch(`/api/roadmaps/${params.roadmapId}`);
      
      if (!roadmapResponse.ok) {
        throw new Error("Failed to fetch roadmap details");
      }
      
      const roadmapData = await roadmapResponse.json();
      
      // Format dates
      setRoadmap({
        ...roadmapData,
        startDate: new Date(roadmapData.startDate),
        endDate: new Date(roadmapData.endDate),
        milestones: roadmapData.milestones.map((milestone: any) => ({
          ...milestone,
          startDate: new Date(milestone.startDate),
          endDate: new Date(milestone.endDate),
        }))
      });
    } catch (err) {
      console.error("Error fetching data:", err);
      setError(err instanceof Error ? err.message : "An unknown error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleMilestoneAdded = () => {
    fetchData();
    toast({
      title: "Milestone added",
      description: "The milestone has been successfully added to the roadmap"
    });
  };

  const handleRoadmapUpdated = () => {
    fetchData();
    toast({
      title: "Roadmap updated",
      description: "Roadmap details have been successfully updated"
    });
  };

  const getMilestoneProgress = (milestone: Milestone) => {
    if (!milestone.features.length) return 0;
    const completed = milestone.features.filter(f => f.status === 'COMPLETED').length;
    return Math.round((completed / milestone.features.length) * 100);
  };

  const getTimeProgress = (startDate: Date, endDate: Date) => {
    const totalDays = differenceInDays(endDate, startDate);
    const daysPassed = differenceInDays(new Date(), startDate);
    
    if (daysPassed <= 0) return 0;
    if (daysPassed >= totalDays) return 100;
    
    return Math.round((daysPassed / totalDays) * 100);
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

  const getMilestoneStatusColor = (status: string) => {
    switch (status.toUpperCase()) {
      case 'PLANNED':
        return 'bg-gray-200';
      case 'IN_PROGRESS':
        return 'bg-blue-600';
      case 'COMPLETED':
        return 'bg-green-600';
      case 'DELAYED':
        return 'bg-amber-600';
      case 'CANCELLED':
        return 'bg-red-600';
      default:
        return 'bg-gray-200';
    }
  };

  const getFilteredMilestones = () => {
    if (!roadmap) return [];
    
    if (activeTab === "all") {
      return roadmap.milestones;
    }
    
    return roadmap.milestones.filter(milestone => 
      milestone.status.toUpperCase() === activeTab.toUpperCase()
    );
  };

  const getTotalFeatures = () => {
    if (!roadmap) return 0;
    return roadmap.milestones.reduce((acc, milestone) => acc + milestone.features.length, 0);
  };

  const getCompletedFeatures = () => {
    if (!roadmap) return 0;
    return roadmap.milestones.reduce((acc, milestone) => 
      acc + milestone.features.filter(f => f.status === 'COMPLETED').length, 0
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading roadmap details...</span>
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

  if (!roadmap) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="mx-auto h-12 w-12 text-amber-500 mb-4" />
        <h2 className="text-2xl font-bold mb-2">Roadmap Not Found</h2>
        <p className="text-muted-foreground mb-6">
          The roadmap you're looking for could not be found.
        </p>
        <Button 
          onClick={() => router.push(`/projects/${params.projectId}/roadmaps`)}
          className="mt-2"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Roadmaps
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="icon"
            onClick={() => router.push(`/projects/${params.projectId}/roadmaps`)}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{roadmap.name}</h1>
            <p className="text-muted-foreground">
              {roadmap.description || "No description provided"}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline"
            onClick={() => setAddMilestoneOpen(true)}
          >
            <PlusCircle className="h-4 w-4 mr-2" />
            Add Milestone
          </Button>
          <Button 
            variant="secondary"
            onClick={() => setManageRoadmapOpen(true)}
          >
            <Settings className="h-4 w-4 mr-2" />
            Manage Roadmap
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Roadmap Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-1">
              <p className="text-sm font-medium">Timeline</p>
              <div className="flex items-center">
                <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                <span>
                  {format(roadmap.startDate, "MMM d, yyyy")} - {format(roadmap.endDate, "MMM d, yyyy")}
                </span>
              </div>
              <div className="mt-2">
                <p className="text-sm mb-1">Progress: {getTimeProgress(roadmap.startDate, roadmap.endDate)}%</p>
                <Progress value={getTimeProgress(roadmap.startDate, roadmap.endDate)} className="h-2" />
              </div>
            </div>

            <div className="space-y-1">
              <p className="text-sm font-medium">Milestones</p>
              <div className="flex items-center">
                <MilestoneIcon className="h-4 w-4 mr-2 text-muted-foreground" />
                <span>{roadmap.milestones.length} total milestones</span>
              </div>
              <div className="flex gap-2 flex-wrap mt-1">
                <Badge variant="outline" className="bg-gray-100">
                  {roadmap.milestones.filter(m => m.status === 'PLANNED').length} Planned
                </Badge>
                <Badge variant="outline" className="bg-blue-100">
                  {roadmap.milestones.filter(m => m.status === 'IN_PROGRESS').length} In Progress
                </Badge>
                <Badge variant="outline" className="bg-green-100">
                  {roadmap.milestones.filter(m => m.status === 'COMPLETED').length} Completed
                </Badge>
              </div>
            </div>

            <div className="space-y-1">
              <p className="text-sm font-medium">Features</p>
              <div className="flex items-center">
                <CheckCircle2 className="h-4 w-4 mr-2 text-muted-foreground" />
                <span>{getCompletedFeatures()} of {getTotalFeatures()} features completed</span>
              </div>
              <div className="mt-2">
                <p className="text-sm mb-1">
                  Progress: {getTotalFeatures() > 0 
                    ? Math.round((getCompletedFeatures() / getTotalFeatures()) * 100) 
                    : 0}%
                </p>
                <Progress 
                  value={getTotalFeatures() > 0 
                    ? Math.round((getCompletedFeatures() / getTotalFeatures()) * 100) 
                    : 0} 
                  className="h-2" 
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">Milestones</h2>
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="PLANNED">Planned</TabsTrigger>
              <TabsTrigger value="IN_PROGRESS">In Progress</TabsTrigger>
              <TabsTrigger value="COMPLETED">Completed</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value={activeTab} className="pt-4">
            <div className="grid grid-cols-1 gap-6">
              {getFilteredMilestones().length > 0 ? (
                getFilteredMilestones().map((milestone) => (
                  <Card key={milestone.id}>
                    <CardHeader className="pb-3">
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${getMilestoneStatusColor(milestone.status)}`}></div>
                          <CardTitle>{milestone.name}</CardTitle>
                          {getStatusBadge(milestone.status)}
                        </div>
                        <div className="flex items-center text-sm">
                          <Calendar className="h-4 w-4 mr-1 text-muted-foreground" />
                          <span className="text-muted-foreground">
                            {format(milestone.startDate, "MMM d")} - {format(milestone.endDate, "MMM d, yyyy")}
                          </span>
                        </div>
                      </div>
                      <CardDescription className="mt-2">
                        {milestone.description || "No description provided"}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span>Feature Progress</span>
                            <span>
                              {milestone.features.filter(f => f.status === 'COMPLETED').length} of {milestone.features.length} completed
                            </span>
                          </div>
                          <Progress value={getMilestoneProgress(milestone)} />
                        </div>
                        
                        {milestone.features.length > 0 && (
                          <div className="mt-4">
                            <h4 className="text-sm font-medium mb-2">Features</h4>
                            <ul className="space-y-1">
                              {milestone.features.map((feature) => (
                                <li key={feature.id} className="flex items-center justify-between">
                                  <span className="text-sm">{feature.name}</span>
                                  {getStatusBadge(feature.status)}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        
                        <div className="flex justify-end pt-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => router.push(`/projects/${params.projectId}/roadmaps/${params.roadmapId}/milestones/${milestone.id}`)}
                          >
                            Manage Milestone
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="text-center py-12 border rounded-md">
                  <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                    <MilestoneIcon className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-medium">No Milestones</h3>
                  <p className="text-muted-foreground mt-1 mb-4">
                    {activeTab === "all" 
                      ? "This roadmap doesn't have any milestones yet" 
                      : `No ${activeTab.toLowerCase()} milestones found`}
                  </p>
                  {activeTab === "all" && (
                    <Button onClick={() => setAddMilestoneOpen(true)}>
                      <PlusCircle className="h-4 w-4 mr-2" />
                      Add First Milestone
                    </Button>
                  )}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <AddMilestoneModal 
        open={addMilestoneOpen}
        onOpenChange={setAddMilestoneOpen}
        roadmapId={params.roadmapId}
        onMilestoneAdded={handleMilestoneAdded}
      />

      <ManageRoadmapModal 
        open={manageRoadmapOpen}
        onOpenChange={setManageRoadmapOpen}
        roadmapId={params.roadmapId}
        projectId={params.projectId}
        onRoadmapUpdated={handleRoadmapUpdated}
      />
    </div>
  );
} 