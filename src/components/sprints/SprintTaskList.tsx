"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ArrowRightIcon,
  CheckCircleIcon,
  CircleIcon,
  ClockIcon,
  Loader2Icon,
  PlusIcon,
  RefreshCw,
  UserIcon,
  XCircleIcon,
} from "lucide-react";
import { toast } from "sonner";
import CreateTaskModal from "@/components/tasks/CreateTaskModal";

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  assignee: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
    imageUrl: string | null;
  } | null;
}

interface SprintStatistics {
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  todoTasks: number;
}

interface SprintTaskListProps {
  projectId: string;
  sprintId: string;
}

export default function SprintTaskList({ projectId, sprintId }: SprintTaskListProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);
  const [createTaskModalOpen, setCreateTaskModalOpen] = useState(false);
  const [projectMembers, setProjectMembers] = useState<any[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const router = useRouter();

  // Fetch project members for task assignment
  const fetchProjectMembers = useCallback(async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/members`);
      if (!response.ok) {
        throw new Error("Failed to fetch project members");
      }
      const data = await response.json();
      const formattedMembers = data.map((member: any) => ({
        id: member.id,
        name: member.name
      }));
      setProjectMembers(formattedMembers);
    } catch (error) {
      console.error("Error fetching project members:", error);
    }
  }, [projectId]);

  // Fetch all sprint tasks
  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);
      // Add timestamp to prevent caching
      const timestamp = new Date().getTime();
      const response = await fetch(`/api/projects/${projectId}/sprints/${sprintId}/tasks?_=${timestamp}`, {
        cache: 'no-store'
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch sprint tasks: ${response.statusText}`);
      }
      
      const data = await response.json();
      setTasks(data.tasks);
      
      // Signal to parent components that sprint data has changed
      if (typeof window !== 'undefined') {
        const event = new CustomEvent('sprint-data-updated', { 
          detail: { sprintId, projectId } 
        });
        window.dispatchEvent(event);
      }
      
      return data.tasks;
    } catch (err) {
      console.error("Error fetching sprint tasks:", err);
      setError(err instanceof Error ? err.message : "Failed to load tasks");
      return null;
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [projectId, sprintId]);

  // Calculate sprint statistics
  const calculateStatistics = useCallback((): SprintStatistics => {
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(task => task.status === "done").length;
    const inProgressTasks = tasks.filter(task => task.status === "in-progress").length;
    const todoTasks = tasks.filter(task => task.status === "todo").length;
    
    return { totalTasks, completedTasks, inProgressTasks, todoTasks };
  }, [tasks]);

  // Initial data fetching
  useEffect(() => {
    fetchProjectMembers();
    fetchTasks();
  }, [fetchProjectMembers, fetchTasks]);

  // Manual refresh function
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchTasks();
    
    // Force page refresh to update all components
    router.refresh();
    
    toast.success("Sprint data refreshed");
  };

  // Update task status
  const handleStatusChange = async (taskId: string, newStatus: string) => {
    setUpdatingTaskId(taskId);
    
    try {
      const response = await fetch(`/api/projects/${projectId}/tasks/${taskId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        throw new Error('Failed to update task status');
      }

      // Update local state optimistically
      setTasks(tasks.map(task => 
        task.id === taskId ? { ...task, status: newStatus } : task
      ));
      
      // Broadcast statistics update event
      if (typeof window !== 'undefined') {
        const stats = calculateStatistics();
        const event = new CustomEvent('sprint-statistics-updated', { 
          detail: { sprintId, projectId, statistics: stats } 
        });
        window.dispatchEvent(event);
      }
      
      toast.success("Task status updated");
      
      // Force page refresh to update all components
      router.refresh();
    } catch (error) {
      console.error('Error updating task status:', error);
      toast.error("Failed to update task status");
    } finally {
      setUpdatingTaskId(null);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "low":
        return "bg-gray-200 text-gray-800";
      case "medium":
        return "bg-blue-200 text-blue-800";
      case "high":
        return "bg-orange-200 text-orange-800";
      case "urgent":
        return "bg-red-200 text-red-800";
      default:
        return "bg-gray-200 text-gray-800";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "todo":
        return <CircleIcon className="h-4 w-4 text-gray-500" />;
      case "in-progress":
        return <ClockIcon className="h-4 w-4 text-blue-500" />;
      case "review":
        return <ArrowRightIcon className="h-4 w-4 text-orange-500" />;
      case "done":
        return <CheckCircleIcon className="h-4 w-4 text-green-500" />;
      default:
        return <CircleIcon className="h-4 w-4 text-gray-500" />;
    }
  };

  const handleTaskCreation = async (taskData: any) => {
    try {
      // First create the task
      const response = await fetch(`/api/projects/${projectId}/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(taskData),
      });

      if (!response.ok) {
        throw new Error('Failed to create task');
      }

      const newTask = await response.json();
      
      // Then assign the task to the sprint
      const assignResponse = await fetch(`/api/projects/${projectId}/tasks/assign-sprint`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          taskIds: [newTask.id],
          sprintId: sprintId
        }),
      });

      if (!assignResponse.ok) {
        console.error('Created task but failed to assign to sprint');
        // Still add task to UI but warn user
        toast.warning("Task created but couldn't assign to sprint");
      } else {
        toast.success("Task created and added to sprint");
      }
      
      // Fetch updated task with sprint assignment
      const updatedTaskResponse = await fetch(`/api/projects/${projectId}/tasks/${newTask.id}`);
      const updatedTask = updatedTaskResponse.ok ? await updatedTaskResponse.json() : newTask;
      
      // Update local state
      const updatedTasks = [...tasks, { ...updatedTask, sprintId }];
      setTasks(updatedTasks);
      
      // Close the modal
      setCreateTaskModalOpen(false);
      
      // Broadcast statistics update event
      if (typeof window !== 'undefined') {
        // Calculate new statistics based on updated tasks
        const totalTasks = updatedTasks.length;
        const completedTasks = updatedTasks.filter(task => task.status === "done").length;
        const inProgressTasks = updatedTasks.filter(task => task.status === "in-progress").length;
        const todoTasks = updatedTasks.filter(task => task.status === "todo").length;
        
        const event = new CustomEvent('sprint-statistics-updated', { 
          detail: { 
            sprintId, 
            projectId, 
            statistics: { totalTasks, completedTasks, inProgressTasks, todoTasks } 
          } 
        });
        window.dispatchEvent(event);
      }
      
      // Force page refresh to update all components with new statistics
      router.refresh();
    } catch (error) {
      console.error('Error creating task:', error);
      toast.error("Failed to create task");
      throw error;
    }
  };

  if (loading && !isRefreshing) {
    return (
      <div className="animate-fadeIn">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-medium bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Sprint Tasks</h3>
          <div className="bg-muted/50 h-9 w-28 rounded-md animate-pulse"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Card key={i} className="overflow-hidden border border-blue-100/50 dark:border-blue-900/20 animate-pulse-soft" style={{ animationDelay: `${i * 100}ms` }}>
              <CardHeader className="pb-2">
                <Skeleton className="h-5 w-4/5" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-2/3" />
              </CardContent>
              <CardFooter className="flex justify-between">
                <Skeleton className="h-8 w-24" />
                <Skeleton className="h-6 w-16" />
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="bg-red-50 border-red-200 shadow-sm animate-scaleIn">
        <CardContent className="pt-6">
          <div className="flex items-center">
            <XCircleIcon className="h-5 w-5 text-red-500 mr-2" />
            <p className="text-red-700">Error loading tasks: {error}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={() => window.location.reload()}
          >
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }
  
  // Calculate current statistics for display
  const stats = calculateStatistics();

  return (
    <div className="animate-fadeIn">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-medium bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Sprint Tasks ({stats.totalTasks})
          </h3>
          <Button 
            variant="outline" 
            size="sm" 
            className="h-8 px-2 text-muted-foreground"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>
        <Button
          size="sm"
          className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 transition-all shadow-sm hover:shadow-md transform hover:-translate-y-0.5"
          onClick={() => setCreateTaskModalOpen(true)}
        >
          <PlusIcon className="h-4 w-4 mr-1" /> Add Task
        </Button>
      </div>

      {tasks.length === 0 ? (
        <Card className="text-center p-8 border-dashed border-2 border-blue-200 dark:border-blue-900/30 bg-blue-50/50 dark:bg-blue-900/10 shadow-sm animate-scaleIn">
          <CardContent className="pt-6">
            <div className="w-16 h-16 mx-auto bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mb-4">
              <PlusIcon className="h-8 w-8 text-blue-500 dark:text-blue-400" />
            </div>
            <p className="text-muted-foreground mb-4">This sprint has no tasks yet.</p>
            <Button 
              onClick={() => setCreateTaskModalOpen(true)}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 transition-all shadow-sm hover:shadow-md transform hover:-translate-y-0.5"
            >
              <PlusIcon className="h-4 w-4 mr-1" /> Add First Task
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tasks.map((task, index) => (
            <Card 
              key={task.id} 
              className="overflow-hidden hover:shadow-md transition-all duration-300 border-blue-100 dark:border-blue-900/30 hover:-translate-y-1 bg-white dark:bg-gray-900 animate-scaleIn" 
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <CardHeader className="pb-2 relative">
                <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-blue-500 to-indigo-500"></div>
                <CardTitle className="text-base flex items-start justify-between">
                  <div className="line-clamp-2 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">{task.title}</div>
                </CardTitle>
                <CardDescription className="line-clamp-2">
                  {task.description || "No description provided"}
                </CardDescription>
              </CardHeader>
              <CardContent className="pb-2">
                <div className="flex justify-between items-center">
                  <Badge className={`${getPriorityColor(task.priority)} shadow-sm`}>
                    {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                  </Badge>
                  
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center">
                          {task.assignee ? (
                            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/40 dark:to-indigo-900/40 flex items-center justify-center text-xs font-medium shadow-sm">
                              {task.assignee.firstName?.charAt(0) || ''}
                              {task.assignee.lastName?.charAt(0) || ''}
                            </div>
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center">
                              <UserIcon className="h-3.5 w-3.5 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        {task.assignee 
                          ? `Assigned to: ${task.assignee.firstName || ''} ${task.assignee.lastName || ''}` 
                          : 'Unassigned'}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between items-center">
                <Select
                  defaultValue={task.status}
                  onValueChange={(value) => handleStatusChange(task.id, value)}
                  disabled={updatingTaskId === task.id}
                >
                  <SelectTrigger className="w-32 h-8 bg-muted/50 border-blue-100 dark:border-blue-900/30">
                    {updatingTaskId === task.id ? (
                      <div className="flex items-center">
                        <Loader2Icon className="h-3 w-3 mr-1 animate-spin" />
                        <span>Updating...</span>
                      </div>
                    ) : (
                      <div className="flex items-center">
                        {getStatusIcon(task.status)}
                        <span className="ml-1 capitalize">
                          {task.status.replace("-", " ")}
                        </span>
                      </div>
                    )}
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todo">
                      <div className="flex items-center">
                        <CircleIcon className="h-3.5 w-3.5 text-gray-500 mr-1" />
                        <span>To Do</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="in-progress">
                      <div className="flex items-center">
                        <ClockIcon className="h-3.5 w-3.5 text-blue-500 mr-1" />
                        <span>In Progress</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="review">
                      <div className="flex items-center">
                        <ArrowRightIcon className="h-3.5 w-3.5 text-orange-500 mr-1" />
                        <span>Review</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="done">
                      <div className="flex items-center">
                        <CheckCircleIcon className="h-3.5 w-3.5 text-green-500 mr-1" />
                        <span>Done</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                
                <Button 
                  variant="outline" 
                  size="sm"
                  className="border-blue-100 dark:border-blue-900/30 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400"
                  onClick={() => router.push(`/projects/${projectId}/tasks/${task.id}`)}
                >
                  View
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      <CreateTaskModal
        isOpen={createTaskModalOpen}
        onClose={() => setCreateTaskModalOpen(false)}
        onCreate={handleTaskCreation}
        projectId={projectId}
        projectMembers={projectMembers}
      />
    </div>
  );
} 