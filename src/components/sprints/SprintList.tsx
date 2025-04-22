"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PlusCircle } from "lucide-react";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import CreateSprintModal from "./CreateSprintModal";
import SprintProgressBar from "./SprintProgressBar";

interface Sprint {
  id: string;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  status: string;
  _count?: {
    tasks: number;
  };
  completedTasksCount?: number;
}

interface SprintListProps {
  projectId: string;
}

export default function SprintList({ projectId }: SprintListProps) {
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  useEffect(() => {
    async function fetchSprints() {
      setLoading(true);
      setError(null);
      
      try {
        const response = await fetch(`/api/projects/${projectId}/sprints`);
        
        if (!response.ok) {
          throw new Error("Failed to fetch sprints");
        }
        
        const data = await response.json();
        setSprints(data);
      } catch (err) {
        console.error("Error fetching sprints:", err);
        setError("Could not load sprints. Please try again later.");
      } finally {
        setLoading(false);
      }
    }
    
    fetchSprints();
  }, [projectId]);

  const handleCreateSuccess = (newSprint: Sprint) => {
    setSprints((prevSprints) => [...prevSprints, newSprint]);
    setCreateModalOpen(false);
  };

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case "planned":
        return <Badge variant="secondary">Planned</Badge>;
      case "active":
        return <Badge variant="default">Active</Badge>;
      case "completed":
        return <Badge variant="default" className="bg-green-500">Completed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="w-full">
            <CardHeader className="pb-2">
              <Skeleton className="h-6 w-2/3" />
              <Skeleton className="h-4 w-full" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-4/5" />
            </CardContent>
            <CardFooter>
              <Skeleton className="h-4 w-1/4" />
            </CardFooter>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return <div className="p-4 text-red-500">{error}</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div></div>
        <Button onClick={() => setCreateModalOpen(true)} size="sm" className="gap-1">
          <PlusCircle className="h-4 w-4" />
          New Sprint
        </Button>
      </div>

      {sprints.length === 0 ? (
        <Card className="w-full">
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">No sprints yet. Create your first sprint to start organizing your tasks.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {sprints.map((sprint) => (
            <Card key={sprint.id} className="w-full">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg">{sprint.name}</CardTitle>
                  {getStatusBadge(sprint.status)}
                </div>
                <CardDescription>
                  {format(new Date(sprint.startDate), "MMM d, yyyy")} - {format(new Date(sprint.endDate), "MMM d, yyyy")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {sprint.description && <p className="text-sm text-muted-foreground mb-3">{sprint.description}</p>}
                <SprintProgressBar 
                  completedTasks={sprint.completedTasksCount || 0} 
                  totalTasks={sprint._count?.tasks || 0} 
                />
              </CardContent>
              <CardFooter className="flex justify-between">
                <span className="text-xs text-muted-foreground">
                  {sprint._count?.tasks || 0} tasks
                </span>
                <Button variant="ghost" size="sm" asChild>
                  <a href={`/projects/${projectId}/sprints/${sprint.id}`}>View Details</a>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      <CreateSprintModal 
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        projectId={projectId}
        onSuccess={handleCreateSuccess}
      />
    </div>
  );
} 