"use client";

import { useState, useEffect } from "react";
import { AlertCircle } from "lucide-react";
import { TaskCard } from "@/components/tasks/TaskCard";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: "todo" | "in-progress" | "review" | "done";
  priority: "low" | "medium" | "high" | "urgent";
  type: "bug" | "feature" | "improvement" | "task" | "documentation";
  assigneeId: string | null;
  assigneeName: string | null;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
}

interface TaskListProps {
  projectId: string;
}

export function TaskList({ projectId }: TaskListProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterAssignee, setFilterAssignee] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("updatedAt");
  const [projectMembers, setProjectMembers] = useState<{id: string, name: string}[]>([]);

  useEffect(() => {
    const fetchTasks = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/projects/${projectId}/tasks`);
        
        console.log("Task fetch response status:", response.status);
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error("Failed to fetch tasks:", errorData);
          throw new Error(errorData.message || "Failed to fetch tasks");
        }
        
        const data = await response.json();
        console.log("Fetched tasks:", data);
        
        if (Array.isArray(data)) {
          setTasks(data);
        } else {
          setTasks([]);
        }
      } catch (err) {
        console.error("Error fetching tasks:", err);
        setError(err instanceof Error ? err.message : "Failed to fetch tasks");
        setTasks([]);
      } finally {
        setLoading(false);
      }
    };

    const fetchProjectMembers = async () => {
      try {
        const response = await fetch(`/api/projects/${projectId}/members`);
        
        if (!response.ok) {
          console.error("Failed to fetch project members");
          return;
        }
        
        const data = await response.json();
        console.log("Fetched project members:", data);
        
        if (Array.isArray(data)) {
          setProjectMembers(data);
        }
      } catch (err) {
        console.error("Error fetching project members:", err);
      }
    };

    fetchTasks();
    fetchProjectMembers();
  }, [projectId]);

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/projects/${projectId}/tasks/${taskId}`, {
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
      
      setTasks(prev => 
        prev.map(task => 
          task.id === taskId ? { ...task, status: newStatus as "todo" | "in-progress" | "review" | "done", updatedAt: updatedTask.updatedAt } : task
        )
      );
    } catch (err) {
      console.error("Error updating task status:", err);
      // You could show an error toast or notification here
    }
  };

  // Filter and sort tasks
  const filteredAndSortedTasks = tasks
    .filter(task => 
      (filterStatus === "all" || task.status === filterStatus) &&
      (filterPriority === "all" || task.priority === filterPriority) &&
      (filterType === "all" || task.type === filterType) &&
      (filterAssignee === "all" || 
       (filterAssignee === "unassigned" && !task.assigneeId) ||
       task.assigneeId === filterAssignee)
    )
    .sort((a, b) => {
      if (sortBy === "updatedAt") {
        try {
          const dateA = a.updatedAt ? new Date(a.updatedAt) : new Date(0);
          const dateB = b.updatedAt ? new Date(b.updatedAt) : new Date(0);
          return dateB.getTime() - dateA.getTime();
        } catch (e) {
          console.error("Error parsing updatedAt date:", e);
          return 0;
        }
      } else if (sortBy === "dueDate") {
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        
        try {
          const dateA = new Date(a.dueDate);
          const dateB = new Date(b.dueDate);
          return dateA.getTime() - dateB.getTime();
        } catch (e) {
          console.error("Error parsing dueDate:", e);
          return 0;
        }
      } else if (sortBy === "priority") {
        const priorityOrder: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      return 0;
    });

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="flex flex-wrap justify-between bg-card/50 p-4 rounded-md border shadow-sm">
          <Skeleton className="h-10 w-[180px] mr-2" />
          <Skeleton className="h-10 w-[180px] mr-2" />
          <Skeleton className="h-10 w-[180px] mr-2" />
          <Skeleton className="h-10 w-[180px] mr-2" />
          <Skeleton className="h-10 w-[180px]" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-[250px] w-full rounded-md" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className="animate-scaleIn">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          {error}. Please try refreshing the page.
        </AlertDescription>
      </Alert>
    );
  }

  const getFilterCount = () => {
    let count = 0;
    if (filterStatus !== "all") count++;
    if (filterPriority !== "all") count++;
    if (filterType !== "all") count++;
    if (filterAssignee !== "all") count++;
    return count;
  };

  const activeFilterCount = getFilterCount();

  return (
    <div className="space-y-6 animate-fadeIn">
      <Card className="bg-card/50 border shadow-sm p-4 rounded-md">
        <div className="flex flex-wrap gap-4 items-center">
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[180px] bg-background/80 backdrop-blur-sm">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="todo">To Do</SelectItem>
              <SelectItem value="in-progress">In Progress</SelectItem>
              <SelectItem value="review">In Review</SelectItem>
              <SelectItem value="done">Done</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterPriority} onValueChange={setFilterPriority}>
            <SelectTrigger className="w-[180px] bg-background/80 backdrop-blur-sm">
              <SelectValue placeholder="Filter by priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priorities</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[180px] bg-background/80 backdrop-blur-sm">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="bug">Bug</SelectItem>
              <SelectItem value="feature">Feature</SelectItem>
              <SelectItem value="improvement">Improvement</SelectItem>
              <SelectItem value="task">Task</SelectItem>
              <SelectItem value="documentation">Documentation</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterAssignee} onValueChange={setFilterAssignee}>
            <SelectTrigger className="w-[180px] bg-background/80 backdrop-blur-sm">
              <SelectValue placeholder="Filter by assignee" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Assignees</SelectItem>
              <SelectItem value="unassigned">Unassigned</SelectItem>
              {projectMembers.map(member => (
                <SelectItem key={member.id} value={member.id}>
                  {member.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[180px] bg-background/80 backdrop-blur-sm">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="updatedAt">Last Updated</SelectItem>
              <SelectItem value="dueDate">Due Date</SelectItem>
              <SelectItem value="priority">Priority</SelectItem>
            </SelectContent>
          </Select>
          
          {activeFilterCount > 0 && (
            <div className="text-sm text-muted-foreground ml-auto">
              <span className="bg-primary/10 text-primary px-2 py-1 rounded-full">
                {activeFilterCount} active filter{activeFilterCount !== 1 ? 's' : ''}
              </span>
            </div>
          )}
        </div>
      </Card>

      {filteredAndSortedTasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 bg-muted/50 rounded-lg border border-dashed shadow-sm animate-scaleIn">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <AlertCircle className="h-8 w-8 text-primary/70" />
          </div>
          <h3 className="text-lg font-medium mb-2">No tasks found</h3>
          <p className="text-sm text-muted-foreground text-center max-w-md">
            {tasks.length === 0 
              ? "There are no tasks in this project yet. Create your first task to get started." 
              : "No tasks match your current filters. Try changing or clearing some filters."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAndSortedTasks.map((task, index) => (
            <div key={task.id} 
              className="animate-fadeIn transform transition-all duration-300 hover:-translate-y-1"
              style={{animationDelay: `${index * 50}ms`}}
            >
              <TaskCard
                task={task}
                projectId={projectId}
                onStatusChange={handleStatusChange}
                className="h-full shadow-sm hover:shadow-md transition-shadow border-t-4"
                style={{
                  borderTopColor: 
                    task.priority === 'urgent' ? 'var(--red-600)' :
                    task.priority === 'high' ? 'var(--orange-600)' :
                    task.priority === 'medium' ? 'var(--blue-600)' :
                    'var(--gray-400)'
                }}
              />
            </div>
          ))}
        </div>
      )}
      
      {filteredAndSortedTasks.length > 0 && (
        <div className="text-sm text-muted-foreground text-center pt-2 pb-4">
          Showing {filteredAndSortedTasks.length} of {tasks.length} tasks
        </div>
      )}
    </div>
  );
} 