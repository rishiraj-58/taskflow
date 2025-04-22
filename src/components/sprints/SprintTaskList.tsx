"use client";

import { useState, useEffect } from "react";
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
  const router = useRouter();

  useEffect(() => {
    const fetchProjectMembers = async () => {
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
    };

    fetchProjectMembers();
  }, [projectId]);

  useEffect(() => {
    async function fetchTasks() {
      try {
        setLoading(true);
        const response = await fetch(`/api/projects/${projectId}/sprints/${sprintId}`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch sprint tasks: ${response.statusText}`);
        }
        
        const data = await response.json();
        setTasks(data.tasks);
      } catch (err) {
        console.error("Error fetching sprint tasks:", err);
        setError(err instanceof Error ? err.message : "Failed to load tasks");
      } finally {
        setLoading(false);
      }
    }

    fetchTasks();
  }, [projectId, sprintId]);

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

      // Update local state
      setTasks(tasks.map(task => 
        task.id === taskId ? { ...task, status: newStatus } : task
      ));
      
      toast.success("Task status updated");
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
      setTasks(prevTasks => [...prevTasks, { ...updatedTask, sprintId }]);
      
      // Close the modal
      setCreateTaskModalOpen(false);
    } catch (error) {
      console.error('Error creating task:', error);
      toast.error("Failed to create task");
      throw error;
    }
  };

  if (loading) {
    return (
      <div>
        <h3 className="text-lg font-medium mb-4">Sprint Tasks</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Card key={i} className="overflow-hidden">
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
      <Card className="bg-red-50 border-red-200">
        <CardContent className="pt-6">
          <div className="flex items-center">
            <XCircleIcon className="h-5 w-5 text-red-500 mr-2" />
            <p className="text-red-700">Error loading tasks: {error}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="mt-2"
            onClick={() => window.location.reload()}
          >
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium">Sprint Tasks</h3>
        <Button
          size="sm"
          onClick={() => setCreateTaskModalOpen(true)}
        >
          <PlusIcon className="h-4 w-4 mr-1" /> Add Task
        </Button>
      </div>

      {tasks.length === 0 ? (
        <Card className="text-center p-8">
          <CardContent className="pt-6">
            <p className="text-muted-foreground mb-4">This sprint has no tasks yet.</p>
            <Button 
              onClick={() => setCreateTaskModalOpen(true)}
            >
              <PlusIcon className="h-4 w-4 mr-1" /> Add First Task
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tasks.map(task => (
            <Card key={task.id} className="overflow-hidden hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-start justify-between">
                  <div className="line-clamp-2">{task.title}</div>
                </CardTitle>
                <CardDescription className="line-clamp-2">
                  {task.description || "No description provided"}
                </CardDescription>
              </CardHeader>
              <CardContent className="pb-2">
                <div className="flex justify-between items-center">
                  <Badge className={`${getPriorityColor(task.priority)}`}>
                    {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                  </Badge>
                  
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center">
                          {task.assignee ? (
                            <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs">
                              {task.assignee.firstName?.charAt(0) || ''}
                              {task.assignee.lastName?.charAt(0) || ''}
                            </div>
                          ) : (
                            <UserIcon className="h-4 w-4 text-gray-400" />
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
                  <SelectTrigger className="w-32 h-8">
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