"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Calendar, 
  Clock, 
  UserCircle, 
  AlertCircle, 
  ArrowLeft, 
  MessageSquare,
  ChevronLeft,
  PenSquare
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CommentList } from "@/components/tasks/comments/CommentList";
import TaskDebuggingHelper from "../../../../../components/tasks/TaskDebuggingHelper";
import { Separator } from "@/components/ui/separator";

// Navigation component for consistent header
function ProjectNavigation({ projectId, projectName }: { projectId: string, projectName: string }) {
  return (
    <div className="bg-muted/40 py-3 px-4 rounded-md mb-6 flex items-center justify-between flex-wrap gap-3">
      <div className="flex items-center gap-2">
        <Link href="/dashboard">
          <Button variant="ghost" size="sm">
            Dashboard
          </Button>
        </Link>
        <span className="text-muted-foreground">/</span>
        <Link href={`/projects/${projectId}`}>
          <Button variant="ghost" size="sm">
            {projectName || 'Project'}
          </Button>
        </Link>
        <span className="text-muted-foreground">/</span>
        <span className="text-sm font-medium">Task Details</span>
      </div>
      <Link href={`/projects/${projectId}`}>
        <Button variant="outline" size="sm">
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back to Project
        </Button>
      </Link>
    </div>
  );
}

interface TaskDetailProps {
  params: {
    projectId: string;
    taskId: string;
  };
}

export default function TaskDetailPage({ params }: TaskDetailProps) {
  const router = useRouter();
  const [task, setTask] = useState<any>(null);
  const [projectName, setProjectName] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTask = async () => {
      setLoading(true);
      try {
        // Fetch task details
        const response = await fetch(`/api/projects/${params.projectId}/tasks/${params.taskId}`);
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || "Failed to fetch task details");
        }
        
        const data = await response.json();
        
        // Fetch project details to get the name
        const projectResponse = await fetch(`/api/projects/${params.projectId}`);
        if (projectResponse.ok) {
          const projectData = await projectResponse.json();
          setProjectName(projectData.name);
        }
        
        setTask(data);
      } catch (err) {
        console.error("Error fetching task:", err);
        setError(err instanceof Error ? err.message : "An error occurred while loading the task");
      } finally {
        setLoading(false);
      }
    };

    fetchTask();
  }, [params.projectId, params.taskId]);

  // Status mapping for styling
  const statusConfig: Record<string, { label: string, color: string, bg: string }> = {
    "todo": { 
      label: "To Do", 
      color: "bg-slate-100 text-slate-800 border-slate-200",
      bg: "bg-slate-50"
    },
    "in-progress": { 
      label: "In Progress", 
      color: "bg-blue-100 text-blue-800 border-blue-200",
      bg: "bg-blue-50" 
    },
    "review": { 
      label: "In Review", 
      color: "bg-yellow-100 text-yellow-800 border-yellow-200",
      bg: "bg-yellow-50" 
    },
    "done": { 
      label: "Done", 
      color: "bg-green-100 text-green-800 border-green-200",
      bg: "bg-green-50" 
    }
  };

  // Priority mapping for styling
  const priorityConfig: Record<string, { label: string, color: string }> = {
    "low": { label: "Low", color: "bg-gray-100 text-gray-800 border-gray-200" },
    "medium": { label: "Medium", color: "bg-blue-100 text-blue-800 border-blue-200" },
    "high": { label: "High", color: "bg-orange-100 text-orange-800 border-orange-200" },
    "urgent": { label: "Urgent", color: "bg-red-100 text-red-800 border-red-200" }
  };

  // Type mapping for styling
  const typeConfig: Record<string, { label: string, color: string }> = {
    "bug": { label: "Bug", color: "bg-red-100 text-red-800 border-red-200" },
    "feature": { label: "Feature", color: "bg-green-100 text-green-800 border-green-200" },
    "improvement": { label: "Improvement", color: "bg-blue-100 text-blue-800 border-blue-200" },
    "task": { label: "Task", color: "bg-purple-100 text-purple-800 border-purple-200" },
    "documentation": { label: "Documentation", color: "bg-yellow-100 text-yellow-800 border-yellow-200" }
  };

  if (loading) {
    return (
      <div className="container max-w-6xl mx-auto p-4 space-y-6">
        <Skeleton className="h-12 w-full rounded-md mb-6" />
        
        <div className="flex justify-between items-start">
          <div>
            <Skeleton className="h-10 w-64 mb-4" />
            <div className="flex gap-2">
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-6 w-24" />
            </div>
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          <div className="md:col-span-2 space-y-6">
            <Skeleton className="h-40 w-full rounded-md" />
            <Skeleton className="h-60 w-full rounded-md" />
          </div>
          
          <div className="space-y-6">
            <Skeleton className="h-40 w-full rounded-md" />
            <Skeleton className="h-40 w-full rounded-md" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container max-w-6xl mx-auto p-4">
        <Link href="/dashboard">
          <Button variant="outline" className="mb-6">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
          </Button>
        </Link>
        
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {error}. Please try again later or contact support.
          </AlertDescription>
        </Alert>
        
        <TaskDebuggingHelper taskId={params.taskId} projectId={params.projectId} />
      </div>
    );
  }

  if (!task) {
    return (
      <div className="container max-w-6xl mx-auto p-4">
        <Link href="/dashboard">
          <Button variant="outline" className="mb-6">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
          </Button>
        </Link>
        
        <Alert className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Task not found</AlertTitle>
          <AlertDescription>
            The requested task could not be found. It may have been deleted or you may not have access to it.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Format the due date if it exists
  let formattedDueDate = null;
  let isPastDue = false;
  if (task.dueDate) {
    const dueDate = new Date(task.dueDate);
    formattedDueDate = format(dueDate, 'PPP');
    isPastDue = dueDate < new Date() && task.status !== 'done';
  }

  // Get configuration for current status (or fallback)
  const currentStatus = statusConfig[task.status] || { 
    label: task.status, 
    color: "bg-slate-100 text-slate-800 border-slate-200",
    bg: "bg-slate-50"
  };

  return (
    <div className="container max-w-6xl mx-auto p-4">
      <ProjectNavigation projectId={params.projectId} projectName={projectName} />
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main content - left 2/3 */}
        <div className="md:col-span-2 space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-3">{task.title}</h1>
              <div className="flex flex-wrap gap-2">
                <Badge className={`${currentStatus.color} border`}>
                  {currentStatus.label}
                </Badge>
                <Badge className={priorityConfig[task.priority]?.color || "bg-gray-100 text-gray-800"}>
                  {priorityConfig[task.priority]?.label || task.priority}
                </Badge>
                <Badge className={typeConfig[task.type]?.color || "bg-gray-100 text-gray-800"}>
                  {typeConfig[task.type]?.label || task.type}
                </Badge>
              </div>
            </div>
            
            <Link href={`/projects/${params.projectId}/tasks/${params.taskId}/edit`}>
              <Button variant="outline">
                <PenSquare className="h-4 w-4 mr-2" />
                Edit Task
              </Button>
            </Link>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>Description</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`prose max-w-none dark:prose-invert ${currentStatus.bg} rounded-md p-4`}>
                {task.description ? (
                  <p className="whitespace-pre-wrap">{task.description}</p>
                ) : (
                  <p className="text-muted-foreground italic">No description provided</p>
                )}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Comments</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {task.projectId ? (
                <CommentList 
                  taskId={params.taskId} 
                  projectId={task.projectId} 
                />
              ) : (
                <div className="text-center py-8 border rounded-md bg-muted/50">
                  <MessageSquare className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-muted-foreground">Comments temporarily unavailable</p>
                  <p className="text-xs text-muted-foreground mt-2">Missing project information</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        
        {/* Sidebar - right 1/3 */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <UserCircle className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Assignee</p>
                  {task.assigneeName ? (
                    <p>{task.assigneeName}</p>
                  ) : (
                    <p className="text-muted-foreground italic">Unassigned</p>
                  )}
                </div>
              </div>
              
              <Separator />
              
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Due Date</p>
                  {formattedDueDate ? (
                    <div>
                      <p className={isPastDue ? "text-red-600 font-medium" : ""}>
                        {formattedDueDate}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(task.dueDate), { addSuffix: true })}
                      </p>
                    </div>
                  ) : (
                    <p className="text-muted-foreground italic">None</p>
                  )}
                </div>
              </div>
              
              <Separator />
              
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Created</p>
                  <p>{format(new Date(task.createdAt), 'PPP')}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(task.createdAt), { addSuffix: true })}
                  </p>
                </div>
              </div>
              
              <Separator />
              
              <div className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Last updated</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(task.updatedAt), { addSuffix: true })}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Related</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Link href={`/projects/${params.projectId}`} className="block">
                <div className="py-3 px-6 hover:bg-muted/50 transition-colors">
                  <p className="font-medium">Project</p>
                  <p className="text-sm text-muted-foreground">{projectName || 'View project'}</p>
                </div>
              </Link>
              <Link href={`/projects/${params.projectId}/tasks`} className="block">
                <div className="py-3 px-6 hover:bg-muted/50 transition-colors border-t">
                  <p className="font-medium">All Tasks</p>
                  <p className="text-sm text-muted-foreground">View all tasks in this project</p>
                </div>
              </Link>
            </CardContent>
          </Card>
          
          {process.env.NODE_ENV !== 'production' && (
            <Card className="bg-muted/30 border-dashed">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Debug Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xs">
                  <p><span className="font-medium">Task ID:</span> {task.id}</p>
                  <p><span className="font-medium">Project ID:</span> {task.projectId}</p>
                  <p><span className="font-medium">Creator:</span> {task.creatorName || 'Unknown'}</p>
                  <p className="mt-2 text-muted-foreground">Development mode only</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
} 