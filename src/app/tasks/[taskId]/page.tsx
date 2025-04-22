"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import  TaskDebuggingHelper  from "@/components/tasks/TaskDebuggingHelper";

interface TaskRedirectProps {
  params: {
    taskId: string;
  };
}

export default function TaskRedirectPage({ params }: TaskRedirectProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  
  console.log("Task redirect page for task:", params.taskId);

  useEffect(() => {
    const redirectToCorrectTaskURL = async () => {
      try {
        // Try the new direct task API first
        console.log(`Fetching task directly from API for task: ${params.taskId}`);
        const directResponse = await fetch(`/api/tasks/${params.taskId}`);
        
        if (directResponse.ok) {
          const taskData = await directResponse.json();
          console.log("Task data from direct API:", taskData);
          
          if (taskData.projectId) {
            const correctUrl = `/projects/${taskData.projectId}/tasks/${params.taskId}`;
            console.log(`Redirecting to: ${correctUrl}`);
            router.replace(correctUrl);
            return;
          }
        } else {
          console.warn("Direct task API failed, falling back to debug API");
        }
        
        // Fall back to the debug API if the direct API fails
        console.log(`Falling back to debug API for task: ${params.taskId}`);
        const debugResponse = await fetch(`/api/debug/task/${params.taskId}`);
        
        if (!debugResponse.ok) {
          const errorData = await debugResponse.json().catch(() => ({}));
          console.error("Failed to get task data from debug API:", errorData);
          throw new Error(errorData.error || "Failed to retrieve task information");
        }
        
        const debugData = await debugResponse.json();
        console.log("Task data from debug API:", debugData);
        
        if (debugData.task && debugData.task.projectId) {
          const correctUrl = `/projects/${debugData.task.projectId}/tasks/${params.taskId}`;
          console.log(`Redirecting to: ${correctUrl}`);
          router.replace(correctUrl);
        } else {
          throw new Error("Could not determine the project for this task");
        }
      } catch (err) {
        console.error("Error during task redirect:", err);
        setError(err instanceof Error ? err.message : "An error occurred");
        setLoading(false);
      }
    };

    // Small delay to ensure router is ready
    const timer = setTimeout(() => {
      redirectToCorrectTaskURL();
    }, 100);
    
    return () => clearTimeout(timer);
  }, [params.taskId, router]);

  if (loading) {
    return (
      <div className="container flex flex-col items-center justify-center h-screen">
        <div className="text-center max-w-md mx-auto">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-lg font-medium mb-2">Redirecting to correct task page...</p>
          <p className="text-sm text-muted-foreground mb-8">Task ID: {params.taskId}</p>
          
          {/* Add debug helper */}
          <TaskDebuggingHelper taskId={params.taskId} projectId="undefined" />
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-md mx-auto mt-16">
      <Alert variant="destructive">
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          {error || "Could not redirect to the task. Please try accessing it through the project page."}
        </AlertDescription>
      </Alert>
      
      {/* Add debug helper */}
      <div className="mt-8">
        <TaskDebuggingHelper taskId={params.taskId} projectId="undefined" />
      </div>
    </div>
  );
} 