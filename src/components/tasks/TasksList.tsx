"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  PlusCircle, 
  Filter, 
  ChevronDown, 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  Circle, 
  Loader2 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import CreateTaskModal from "./CreateTaskModal";

// Define task type
interface Task {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  type: string;
  assigneeId: string | null;
  assigneeName?: string | null;
  dueDate: Date | null;
  createdAt: Date;
  projectId: string;
}

interface User {
  id: string;
  name: string;
}

interface TasksListProps {
  projectId: string;
}

export default function TasksList({ projectId }: TasksListProps) {
  const router = useRouter();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState<string | null>(null);
  const [members, setMembers] = useState<User[]>([]);

  useEffect(() => {
    const fetchTasks = async () => {
      setLoading(true);
      setError("");
      
      console.log(`Fetching tasks for project: ${projectId}`);
      
      try {
        const response = await fetch(`/api/projects/${projectId}/tasks`);
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to fetch tasks");
        }
        
        const data = await response.json();
        console.log("Tasks data:", data);
        
        // Ensure each task has a projectId field AND format dates
        const tasksWithProject = data.map((task: any) => ({
          ...task,
          projectId: task.projectId || projectId, // Use the task's projectId if available, fallback to URL projectId
          createdAt: new Date(task.createdAt),
          dueDate: task.dueDate ? new Date(task.dueDate) : null,
        }));
        
        setTasks(tasksWithProject);
      } catch (err) {
        console.error("Error fetching tasks:", err);
        setError(err instanceof Error ? err.message : "Failed to load tasks");
      } finally {
        setLoading(false);
      }
    };

    const fetchProjectMembers = async () => {
      try {
        const response = await fetch(`/api/projects/${projectId}/members`);
        
        if (response.ok) {
          const data = await response.json();
          setMembers(data);
        } else {
          console.error("Failed to fetch project members");
        }
      } catch (error) {
        console.error("Error fetching project members:", error);
      }
    };

    fetchTasks();
    fetchProjectMembers();
  }, [projectId]);

  const handleCreateTask = async (task: any) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/projects/${projectId}/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(task),
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create task");
      }
      
      const newTask = await response.json();
      
      // Format dates before adding to state
      newTask.createdAt = new Date(newTask.createdAt);
      newTask.dueDate = newTask.dueDate ? new Date(newTask.dueDate) : null;
      
      setTasks([...tasks, newTask]);
      setIsCreateModalOpen(false);
    } catch (err) {
      console.error("Error creating task:", err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/projects/${projectId}/tasks/${taskId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });
      
      if (!response.ok) {
        throw new Error("Failed to update task status");
      }
      
      // Update task in the local state
      setTasks(tasks.map(task => 
        task.id === taskId ? { ...task, status: newStatus } : task
      ));
    } catch (err) {
      console.error("Error updating task status:", err);
    }
  };

  // Filter tasks based on active tab and priority filter
  const filteredTasks = tasks.filter(task => {
    // Filter by status tab
    if (activeTab !== "all" && task.status !== activeTab) {
      return false;
    }
    
    // Filter by priority
    if (priorityFilter && task.priority !== priorityFilter) {
      return false;
    }
    
    return true;
  });

  // Get task counts by status
  const taskCounts = {
    all: tasks.length,
    todo: tasks.filter(t => t.status === "todo").length,
    "in-progress": tasks.filter(t => t.status === "in-progress").length,
    review: tasks.filter(t => t.status === "review").length,
    done: tasks.filter(t => t.status === "done").length,
  };

  // Status config for styling
  const statusConfig: Record<string, { label: string, icon: React.ReactNode, className: string }> = {
    todo: { 
      label: "To Do", 
      icon: <Circle className="h-4 w-4" />, 
      className: "bg-secondary/20 text-secondary-foreground" 
    },
    "in-progress": { 
      label: "In Progress", 
      icon: <Clock className="h-4 w-4" />, 
      className: "bg-primary/20 text-primary-foreground" 
    },
    review: { 
      label: "In Review", 
      icon: <AlertCircle className="h-4 w-4" />, 
      className: "bg-warning/20 text-warning-foreground" 
    },
    done: { 
      label: "Done", 
      icon: <CheckCircle2 className="h-4 w-4" />, 
      className: "bg-success/20 text-success-foreground" 
    },
  };

  // Priority config for styling
  const priorityConfig: Record<string, { label: string, className: string }> = {
    low: { label: "Low", className: "bg-secondary/20 text-secondary-foreground" },
    medium: { label: "Medium", className: "bg-blue-500/20 text-blue-700" },
    high: { label: "High", className: "bg-orange-500/20 text-orange-700" },
    urgent: { label: "Urgent", className: "bg-destructive/20 text-destructive" },
  };

  // Type config for styling
  const typeConfig: Record<string, { label: string, className: string }> = {
    feature: { label: "Feature", className: "bg-green-500/20 text-green-700" },
    bug: { label: "Bug", className: "bg-red-500/20 text-red-700" },
    improvement: { label: "Improvement", className: "bg-blue-500/20 text-blue-700" },
    task: { label: "Task", className: "bg-purple-500/20 text-purple-700" },
    documentation: { label: "Docs", className: "bg-yellow-500/20 text-yellow-700" },
  };

  if (loading && tasks.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading tasks...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Tabs
          defaultValue="all"
          value={activeTab}
          onValueChange={setActiveTab}
          className="w-full"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <TabsList className="grid w-full sm:w-auto grid-cols-4 sm:grid-cols-5">
              <TabsTrigger value="all" className="text-xs sm:text-sm px-2 sm:px-4">
                All ({taskCounts.all})
              </TabsTrigger>
              <TabsTrigger value="todo" className="text-xs sm:text-sm px-2 sm:px-4">
                To Do ({taskCounts.todo})
              </TabsTrigger>
              <TabsTrigger value="in-progress" className="text-xs sm:text-sm px-2 sm:px-4">
                In Progress ({taskCounts["in-progress"]})
              </TabsTrigger>
              <TabsTrigger value="review" className="text-xs sm:text-sm px-2 sm:px-4">
                Review ({taskCounts.review})
              </TabsTrigger>
              <TabsTrigger value="done" className="text-xs sm:text-sm px-2 sm:px-4 hidden sm:block">
                Done ({taskCounts.done})
              </TabsTrigger>
            </TabsList>
            
            <div className="flex items-center gap-3">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1">
                    <Filter className="h-4 w-4" />
                    Filter
                    {priorityFilter && <span className="ml-1">• 1</span>}
                    <ChevronDown className="h-3 w-3 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-[180px]">
                  <DropdownMenuLabel>Filter by Priority</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={() => setPriorityFilter(null)}
                    className={!priorityFilter ? "bg-accent/50" : ""}
                  >
                    All Priorities
                  </DropdownMenuItem>
                  {Object.entries(priorityConfig).map(([value, { label }]) => (
                    <DropdownMenuItem 
                      key={value}
                      onClick={() => setPriorityFilter(value)}
                      className={priorityFilter === value ? "bg-accent/50" : ""}
                    >
                      {label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              
              <Button onClick={() => setIsCreateModalOpen(true)} size="sm">
                <PlusCircle className="h-4 w-4 mr-1" />
                Add Task
              </Button>
            </div>
          </div>
          
          <TabsContent value="all" className="mt-6">
            <TasksDisplay 
              tasks={filteredTasks} 
              statusConfig={statusConfig} 
              priorityConfig={priorityConfig} 
              typeConfig={typeConfig}
              onStatusChange={handleStatusChange}
              projectId={projectId}
            />
          </TabsContent>
          <TabsContent value="todo" className="mt-6">
            <TasksDisplay 
              tasks={filteredTasks} 
              statusConfig={statusConfig} 
              priorityConfig={priorityConfig} 
              typeConfig={typeConfig}
              onStatusChange={handleStatusChange}
              projectId={projectId}
            />
          </TabsContent>
          <TabsContent value="in-progress" className="mt-6">
            <TasksDisplay 
              tasks={filteredTasks} 
              statusConfig={statusConfig} 
              priorityConfig={priorityConfig} 
              typeConfig={typeConfig}
              onStatusChange={handleStatusChange}
              projectId={projectId}
            />
          </TabsContent>
          <TabsContent value="review" className="mt-6">
            <TasksDisplay 
              tasks={filteredTasks} 
              statusConfig={statusConfig} 
              priorityConfig={priorityConfig} 
              typeConfig={typeConfig}
              onStatusChange={handleStatusChange}
              projectId={projectId}
            />
          </TabsContent>
          <TabsContent value="done" className="mt-6">
            <TasksDisplay 
              tasks={filteredTasks} 
              statusConfig={statusConfig} 
              priorityConfig={priorityConfig} 
              typeConfig={typeConfig}
              onStatusChange={handleStatusChange}
              projectId={projectId}
            />
          </TabsContent>
        </Tabs>
      </div>
      
      <CreateTaskModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreate={handleCreateTask}
        projectId={projectId}
        projectMembers={members}
      />
    </div>
  );
}

interface TasksDisplayProps {
  tasks: Task[];
  statusConfig: Record<string, { label: string, icon: React.ReactNode, className: string }>;
  priorityConfig: Record<string, { label: string, className: string }>;
  typeConfig: Record<string, { label: string, className: string }>;
  onStatusChange: (taskId: string, newStatus: string) => void;
  projectId: string;
}

function TasksDisplay({ 
  tasks, 
  statusConfig, 
  priorityConfig, 
  typeConfig,
  onStatusChange,
  projectId
}: TasksDisplayProps) {
  const router = useRouter();
  
  if (tasks.length === 0) {
    return (
      <Card className="p-8 text-center shadow-sm">
        <p className="text-gray-500 mb-4">No tasks match the current filters</p>
      </Card>
    );
  }
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {tasks.map((task) => (
        <Card key={task.id} className="overflow-hidden border">
          <CardHeader className="p-4 pb-3">
            <div className="flex justify-between items-start gap-4">
              <CardTitle className="text-base line-clamp-1">{task.title}</CardTitle>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <span className="sr-only">Open menu</span>
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-[180px]">
                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => router.push(`/projects/${task.projectId}/tasks/${task.id}`)}>
                    View Details
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel>Change Status</DropdownMenuLabel>
                  {Object.entries(statusConfig).map(([status, { label }]) => (
                    <DropdownMenuItem 
                      key={status}
                      onClick={() => onStatusChange(task.id, status)}
                      disabled={task.status === status}
                      className={task.status === status ? "bg-accent/50" : ""}
                    >
                      {label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <CardDescription className="line-clamp-2 mt-1">
              {task.description || "No description provided"}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0 pb-3">
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className={statusConfig[task.status]?.className || ""}>
                {statusConfig[task.status]?.icon}
                <span className="ml-1">{statusConfig[task.status]?.label}</span>
              </Badge>
              <Badge variant="outline" className={priorityConfig[task.priority]?.className || ""}>
                {priorityConfig[task.priority]?.label}
              </Badge>
              <Badge variant="outline" className={typeConfig[task.type]?.className || ""}>
                {typeConfig[task.type]?.label}
              </Badge>
            </div>
          </CardContent>
          <CardFooter className="p-4 pt-2 flex justify-between text-xs text-muted-foreground border-t">
            <div className="flex items-center">
              <span>
                {task.assigneeName 
                  ? `Assigned to: ${task.assigneeName}` 
                  : "Unassigned"
                }
              </span>
            </div>
            <div className="flex items-center gap-3">
              {task.dueDate && (
                <div className="flex items-center">
                  <Clock className="h-3 w-3 mr-1" />
                  <span>Due: {format(new Date(task.dueDate), "MMM d")}</span>
                </div>
              )}
            </div>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
} 