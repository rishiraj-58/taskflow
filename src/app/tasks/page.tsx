"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";

interface Task {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueDate: string | null;
  projectId: string;
  projectName: string;
}

export default function TasksPage() {
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/tasks");
        
        if (!response.ok) {
          throw new Error("Failed to fetch tasks");
        }
        
        const data = await response.json();
        setTasks(data);
      } catch (err) {
        console.error("Error fetching tasks:", err);
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchTasks();
  }, []);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "low": return "bg-secondary/20 text-secondary-foreground";
      case "medium": return "bg-blue-500/20 text-blue-700";
      case "high": return "bg-orange-500/20 text-orange-700";
      case "urgent": return "bg-destructive/20 text-destructive";
      default: return "bg-secondary/20 text-secondary-foreground";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "todo": return "bg-secondary/20 text-secondary-foreground";
      case "in-progress": return "bg-primary/20 text-primary-foreground";
      case "review": return "bg-warning/20 text-warning-foreground";
      case "done": return "bg-success/20 text-success-foreground";
      default: return "bg-secondary/20 text-secondary-foreground";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "todo": return "To Do";
      case "in-progress": return "In Progress";
      case "review": return "In Review";
      case "done": return "Done";
      default: return status;
    }
  };

  if (loading) {
    return (
      <div className="container px-4 py-8 max-w-7xl mx-auto flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin mr-2" />
        <span>Loading tasks...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container px-4 py-8 max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">My Tasks</h1>
        <div className="p-6 bg-destructive/10 rounded-md mb-4">
          <p className="font-medium text-destructive">
            Error loading tasks: {error}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container px-4 py-8 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">My Tasks</h1>
      
      {tasks.length === 0 ? (
        <Card className="p-8 text-center shadow-sm">
          <p className="text-gray-500 mb-4">You don&apos;t have any tasks yet</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {tasks.map((task) => (
            <Card key={task.id} className="overflow-hidden border hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium mb-1">{task.title}</h3>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                      <span>Project:</span>
                      <span className="font-medium">{task.projectName}</span>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <Badge variant="outline" className={getStatusColor(task.status)}>
                        {getStatusLabel(task.status)}
                      </Badge>
                      <Badge variant="outline" className={getPriorityColor(task.priority)}>
                        {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                      </Badge>
                      {task.dueDate && (
                        <Badge variant="outline">
                          Due: {formatDistanceToNow(new Date(task.dueDate), { addSuffix: true })}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => router.push(`/projects/${task.projectId}/tasks/${task.id}`)}
                    className="ml-2"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
} 