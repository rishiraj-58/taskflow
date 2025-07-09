"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PlusCircle, RefreshCcw } from "lucide-react";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import CreateSprintModal from "./CreateSprintModal";
import SprintProgressBar from "./SprintProgressBar";
import Link from "next/link";
import { useRouter } from "next/navigation";

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
  completedTasks?: number;
  totalTasks?: number;
}

interface SprintListProps {
  projectId: string;
}

export default function SprintList({ projectId }: SprintListProps) {
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const router = useRouter();

  const fetchSprints = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/projects/${projectId}/sprints`, {
        // Add cache busting parameter to prevent browser caching
        cache: 'no-store'
      });
      
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
      setIsRefreshing(false);
    }
  }, [projectId]);
  
  useEffect(() => {
    fetchSprints();
  }, [fetchSprints]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchSprints();
    // Force Next.js to refresh cached data
    router.refresh();
  };

  const handleCreateSuccess = (newSprint: Sprint) => {
    setSprints((prevSprints) => [...prevSprints, newSprint]);
    setCreateModalOpen(false);
    // Refresh the list to ensure we have the latest data
    fetchSprints();
  };

  const getStatusBadge = (status: string) => {
    if (!status) {
      return <Badge variant="outline">Unknown</Badge>;
    }
    
    switch (status.toLowerCase()) {
      case "planned":
        return <Badge variant="secondary" className="bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-200">Planned</Badge>;
      case "active":
        return <Badge variant="default" className="bg-blue-500 hover:bg-blue-600">Active</Badge>;
      case "completed":
        return <Badge variant="default" className="bg-green-500 hover:bg-green-600">Completed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading && !isRefreshing) {
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
    return (
      <div className="p-4 border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 rounded-md text-red-600 dark:text-red-400 flex items-center justify-between">
        <span>{error}</span>
        <Button variant="outline" size="sm" onClick={handleRefresh}>
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={handleRefresh} 
          disabled={isRefreshing}
          className="gap-1 text-muted-foreground hover:text-foreground"
        >
          <RefreshCcw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          {isRefreshing ? 'Refreshing...' : 'Refresh'}
        </Button>
        <Button onClick={() => setCreateModalOpen(true)} size="sm" className="gap-1">
          <PlusCircle className="h-4 w-4" />
          New Sprint
        </Button>
      </div>

      {sprints.length === 0 ? (
        <Card className="w-full border border-dashed">
          <CardContent className="pt-6 pb-6 text-center">
            <p className="text-muted-foreground mb-4">No sprints yet. Create your first sprint to start organizing your tasks.</p>
            <Button onClick={() => setCreateModalOpen(true)} size="sm" variant="outline" className="gap-1">
              <PlusCircle className="h-4 w-4" />
              Create Sprint
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {sprints.map((sprint) => (
            <Card key={sprint.id} className="w-full transition-all duration-200 hover:shadow-md">
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
                  completedTasks={sprint.completedTasks || sprint.completedTasksCount || 0} 
                  totalTasks={sprint.totalTasks || (sprint._count?.tasks || 0)} 
                />
              </CardContent>
              <CardFooter className="flex justify-between">
                <span className="text-xs text-muted-foreground">
                  {sprint.totalTasks || sprint._count?.tasks || 0} tasks
                </span>
                <Button variant="ghost" size="sm" asChild>
                  <Link href={`/projects/${projectId}/sprints/${sprint.id}`} prefetch={true}>View Details</Link>
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