"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { 
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle 
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TaskList } from "@/components/tasks/TaskList";
import KanbanBoard from "@/components/tasks/KanbanBoard";
import CalendarView from "@/components/tasks/CalendarView";
import { PlusCircle, KanbanSquare, List, Calendar } from "lucide-react";
import { Task } from "@/types/task";
import CreateTaskModal from "@/components/tasks/CreateTaskModal";

interface TasksPageProps {
  params: {
    projectId: string;
  };
}

export default function TasksPage({ params }: TasksPageProps) {
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState("kanban");
  const [projectMembers, setProjectMembers] = useState<{id: string, name: string}[]>([]);
  const [projectName, setProjectName] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Fetch tasks for the project
  useEffect(() => {
    const fetchTasks = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/projects/${params.projectId}/tasks`);
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || "Failed to fetch tasks");
        }
        
        const data = await response.json();
        
        if (Array.isArray(data)) {
          setTasks(data);
        } else {
          setTasks([]);
        }
      } catch (err) {
        console.error("Error fetching tasks:", err);
        setError(err instanceof Error ? err.message : "Failed to fetch tasks");
      } finally {
        setLoading(false);
      }
    };

    // Fetch project details to get name
    const fetchProject = async () => {
      try {
        const response = await fetch(`/api/projects/${params.projectId}`);
        
        if (!response.ok) return;
        
        const data = await response.json();
        setProjectName(data.name || "Project");
      } catch (err) {
        console.error("Error fetching project details:", err);
      }
    };

    // Fetch project members
    const fetchProjectMembers = async () => {
      try {
        const response = await fetch(`/api/projects/${params.projectId}/members`);
        
        if (!response.ok) return;
        
        const data = await response.json();
        
        if (Array.isArray(data)) {
          setProjectMembers(data);
        }
      } catch (err) {
        console.error("Error fetching project members:", err);
      }
    };

    fetchTasks();
    fetchProject();
    fetchProjectMembers();
  }, [params.projectId]);

  // Handle task creation
  const handleCreateTask = async (taskData: any) => {
    try {
      const response = await fetch(`/api/projects/${params.projectId}/tasks`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(taskData),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to create task");
      }
      
      const newTask = await response.json();
      
      // Add the new task to the list
      setTasks(prevTasks => [newTask, ...prevTasks]);
      setIsCreateModalOpen(false);
    } catch (error) {
      console.error("Error creating task:", error);
      throw error;
    }
  };

  // Handle status change for a task
  const handleStatusChange = async (taskId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/projects/${params.projectId}/tasks/${taskId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        throw new Error("Failed to update task status");
      }

      const updatedTask = await response.json();
      
      // Update the tasks list
      setTasks(prevTasks => 
        prevTasks.map(task => 
          task.id === taskId ? { ...task, status: newStatus as any, updatedAt: updatedTask.updatedAt } : task
        )
      );
    } catch (err) {
      console.error("Error updating task status:", err);
      throw err;
    }
  };

  return (
    <div className="container mx-auto px-4 py-4 h-[calc(100vh-60px)] flex flex-col">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 gap-4">
        <div>
          <h1 className="text-2xl font-bold">{projectName} Tasks</h1>
          <p className="text-muted-foreground">
            Manage and track your project tasks
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button 
            onClick={() => setIsCreateModalOpen(true)}
            className="ml-auto"
          >
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Task
          </Button>
        </div>
      </div>
      
      <Card className="flex-1 flex flex-col overflow-hidden">
        <CardHeader className="py-3 border-b">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <CardTitle>Tasks</CardTitle>
            
            <Tabs value={viewMode} onValueChange={setViewMode} className="w-full md:w-auto">
              <TabsList className="h-12">
                <TabsTrigger value="kanban" className="text-base h-10 px-6">
                  <KanbanSquare className="h-5 w-5 mr-2" />
                  Kanban
                </TabsTrigger>
                <TabsTrigger value="list" className="text-base h-10 px-6">
                  <List className="h-5 w-5 mr-2" />
                  List
                </TabsTrigger>
                <TabsTrigger value="calendar" className="text-base h-10 px-6">
                  <Calendar className="h-5 w-5 mr-2" />
                  Calendar
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        
        <CardContent className="p-2 flex-1 overflow-auto">
          {viewMode === "kanban" && (
            <KanbanBoard 
              projectId={params.projectId}
              tasks={tasks}
              loading={loading}
              error={error}
              onStatusChange={handleStatusChange}
            />
          )}
          
          {viewMode === "list" && (
            <TaskList 
              projectId={params.projectId} 
            />
          )}
          
          {viewMode === "calendar" && (
            <CalendarView 
              projectId={params.projectId}
              tasks={tasks}
              loading={loading}
              error={error}
            />
          )}
        </CardContent>
      </Card>
      
      <CreateTaskModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreate={handleCreateTask}
        projectId={params.projectId}
        projectMembers={projectMembers}
      />
    </div>
  );
} 