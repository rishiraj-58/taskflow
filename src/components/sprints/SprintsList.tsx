"use client";

import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import SprintProgressBar from "./SprintProgressBar";
import CreateSprintModal from "./CreateSprintModal";

interface Sprint {
  id: string;
  name: string;
  description: string | null;
  startDate: string;
  endDate: string;
  completedTasks: number;
  totalTasks: number;
  projectId: string;
  status: string;
}

interface SprintsListProps {
  projectId: string;
}

export function SprintsList({ projectId }: SprintsListProps) {
  const router = useRouter();
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchSprints = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) {
        setIsLoading(true);
      }
      
      const timestamp = new Date().getTime();
      const response = await fetch(`/api/projects/${projectId}/sprints?_=${timestamp}`, {
        cache: 'no-store'
      });
      
      if (!response.ok) {
        throw new Error("Failed to fetch sprints");
      }
      
      const data = await response.json();
      
      const processedData = data.map((sprint: any) => ({
        ...sprint,
        completedTasks: typeof sprint.completedTasks === 'number' ? sprint.completedTasks : 0,
        totalTasks: typeof sprint.totalTasks === 'number' ? sprint.totalTasks : 0,
        status: sprint.status || getSprintStatus(sprint)
      }));
      
      setSprints(processedData);
    } catch (error) {
      console.error("Error fetching sprints:", error);
      setError("Failed to load sprints. Please try again.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (projectId) {
      fetchSprints();
    }
  }, [projectId, fetchSprints]);

  useEffect(() => {
    const handleSprintUpdate = (event: any) => {
      if (event.detail && event.detail.projectId === projectId) {
        fetchSprints(false);
      }
    };

    window.addEventListener('sprint-data-updated', handleSprintUpdate);
    
    return () => {
      window.removeEventListener('sprint-data-updated', handleSprintUpdate);
    };
  }, [projectId, fetchSprints]);

  const handleSprintCreated = (newSprint: Sprint) => {
    setSprints((prevSprints) => [...prevSprints, newSprint]);
    setIsCreateModalOpen(false);
  };

  const getSprintStatus = (sprint: Sprint) => {
    const today = new Date();
    const startDate = new Date(sprint.startDate);
    const endDate = new Date(sprint.endDate);

    if (today < startDate) return "upcoming";
    if (today > endDate) return "completed";
    return "active";
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "upcoming":
        return <Badge variant="outline" className="bg-blue-100 text-blue-800">Upcoming</Badge>;
      case "active":
        return <Badge variant="outline" className="bg-green-100 text-green-800">Active</Badge>;
      case "completed":
        return <Badge variant="outline" className="bg-gray-100 text-gray-800">Completed</Badge>;
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <p className="text-gray-500">Loading sprints...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 text-red-800 rounded-md">
        <p>{error}</p>
        <Button 
          variant="outline" 
          className="mt-2"
          onClick={() => window.location.reload()}
        >
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Sprints</h2>
        <Button 
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center gap-2"
        >
          <Plus size={16} />
          <span>New Sprint</span>
        </Button>
      </div>

      {sprints.length === 0 ? (
        <Card className="border border-dashed border-gray-300 bg-gray-50">
          <CardContent className="flex flex-col items-center justify-center p-6">
            <p className="text-muted-foreground text-center mb-4">
              No sprints yet. Create your first sprint to start organizing your tasks.
            </p>
            <Button 
              variant="outline" 
              onClick={() => setIsCreateModalOpen(true)}
              className="flex items-center gap-2"
            >
              <Plus size={16} />
              <span>Create Sprint</span>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sprints.map((sprint) => {
            const status = getSprintStatus(sprint);
            
            return (
              <Card 
                key={sprint.id} 
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => router.push(`/projects/${projectId}/sprints/${sprint.id}`)}
              >
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg font-medium">{sprint.name}</CardTitle>
                    {getStatusBadge(status)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {sprint.description && (
                    <p className="text-sm text-gray-600 line-clamp-2">{sprint.description}</p>
                  )}
                  
                  <SprintProgressBar 
                    completedTasks={sprint.completedTasks || 0} 
                    totalTasks={sprint.totalTasks || 0} 
                  />
                  
                  <div className="flex justify-between items-center">
                    <div className="text-xs text-gray-500">
                      {(sprint.totalTasks || 0) === 0 ? (
                        <span>No tasks</span>
                      ) : (
                        <span>
                          {sprint.completedTasks || 0} of {sprint.totalTasks || 0} tasks completed
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex justify-between text-xs text-gray-500">
                    <div>
                      <span className="block font-medium">Start:</span>
                      <span>{format(new Date(sprint.startDate), "MMM d, yyyy")}</span>
                    </div>
                    <div className="text-right">
                      <span className="block font-medium">End:</span>
                      <span>{format(new Date(sprint.endDate), "MMM d, yyyy")}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <CreateSprintModal
        projectId={projectId}
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={handleSprintCreated}
      />
    </div>
  );
} 