"use client";

import { useState, useEffect } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Calendar } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { Task } from "@/types/task";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface KanbanBoardProps {
  projectId: string;
  tasks: Task[];
  loading: boolean;
  error: string | null;
  onStatusChange: (taskId: string, newStatus: string) => Promise<void>;
}

export default function KanbanBoard({ 
  projectId, 
  tasks, 
  loading, 
  error, 
  onStatusChange 
}: KanbanBoardProps) {
  // Define columns
  const columns = [
    { id: "todo", title: "To Do" },
    { id: "in-progress", title: "In Progress" },
    { id: "review", title: "In Review" },
    { id: "done", title: "Done" }
  ];

  // Organize tasks by status
  const getTasksByStatus = () => {
    const tasksByStatus: Record<string, Task[]> = {};
    
    // Initialize empty arrays for each column
    columns.forEach(column => {
      tasksByStatus[column.id] = [];
    });
    
    // Distribute tasks to their respective columns
    tasks.forEach(task => {
      if (tasksByStatus[task.status]) {
        tasksByStatus[task.status].push(task);
      } else {
        // If status doesn't match any column (which shouldn't happen), add to todo
        tasksByStatus.todo.push(task);
      }
    });
    
    return tasksByStatus;
  };

  const [tasksByStatus, setTasksByStatus] = useState(getTasksByStatus());

  // Update tasksByStatus when tasks change
  useEffect(() => {
    setTasksByStatus(getTasksByStatus());
  }, [tasks]);

  // Handle drag and drop
  const handleDragEnd = async (result: any) => {
    const { destination, source, draggableId } = result;

    // If dropped outside a droppable area
    if (!destination) return;

    // If dropped in the same position
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    // If the status changed, update in the backend
    if (destination.droppableId !== source.droppableId) {
      // Get the task
      const taskId = draggableId;
      const newStatus = destination.droppableId;

      // Optimistically update UI
      const updatedTasksByStatus = { ...tasksByStatus };
      const taskToMove = updatedTasksByStatus[source.droppableId][source.index];
      
      // Remove from source
      updatedTasksByStatus[source.droppableId].splice(source.index, 1);
      
      // Update task status
      taskToMove.status = newStatus as any;
      
      // Add to destination
      updatedTasksByStatus[destination.droppableId].splice(
        destination.index,
        0,
        taskToMove
      );
      
      setTasksByStatus(updatedTasksByStatus);

      // Update in backend
      try {
        await onStatusChange(taskId, newStatus);
      } catch (error) {
        console.error("Failed to update task status:", error);
        // Revert UI on error - refetch would be better in a real app
        setTasksByStatus(getTasksByStatus());
      }
    } else {
      // Just reordering within the same column
      const updatedTasksByStatus = { ...tasksByStatus };
      const column = updatedTasksByStatus[source.droppableId];
      const taskToMove = column[source.index];
      
      // Remove from source
      column.splice(source.index, 1);
      
      // Add to destination
      column.splice(destination.index, 0, taskToMove);
      
      setTasksByStatus(updatedTasksByStatus);
    }
  };

  // Priority styling
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent": return "bg-red-200 text-red-800";
      case "high": return "bg-orange-200 text-orange-800";
      case "medium": return "bg-blue-200 text-blue-800";
      case "low": return "bg-gray-200 text-gray-800";
      default: return "bg-gray-200 text-gray-800";
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {columns.map(column => (
          <Card key={column.id} className="h-[calc(100vh-100px)]">
            <CardHeader className="p-2">
              <CardTitle className="text-sm font-medium">
                {column.title} <Skeleton className="inline-block w-6 h-6 rounded-full ml-2" />
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 space-y-3">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="w-full h-[140px] rounded-md" />
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          {error}. Please try refreshing the page.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {columns.map(column => (
          <div key={column.id} className="flex flex-col h-full">
            <Card className="flex-1 h-[calc(100vh-100px)] flex flex-col overflow-hidden">
              <CardHeader className="p-2">
                <CardTitle className="text-sm font-medium flex items-center justify-between">
                  <span>
                    {column.title} 
                    <Badge variant="outline" className="ml-2">
                      {tasksByStatus[column.id].length}
                    </Badge>
                  </span>
                </CardTitle>
              </CardHeader>
              
              <Droppable droppableId={column.id}>
                {(provided, snapshot) => (
                  <CardContent 
                    className={cn(
                      "p-3 pt-4 flex-1 overflow-y-auto",
                      snapshot.isDraggingOver ? "bg-accent/50" : ""
                    )}
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                  >
                    {tasksByStatus[column.id].length === 0 ? (
                      <div className="h-full flex items-center justify-center text-sm text-muted-foreground p-4 text-center border border-dashed rounded-md min-h-[140px]">
                        No tasks
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {tasksByStatus[column.id].map((task, index) => (
                          <Draggable key={task.id} draggableId={task.id} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className={cn(
                                  "bg-background rounded-md border p-4 shadow-sm min-h-[140px] flex flex-col justify-between",
                                  snapshot.isDragging ? "shadow-md bg-accent/20" : ""
                                )}
                              >
                                <Link 
                                  href={`/projects/${projectId}/tasks/${task.id}`}
                                  className="block hover:no-underline h-full flex flex-col justify-between"
                                >
                                  <div>
                                    <div className="flex justify-between items-start mb-2">
                                      <h3 className="font-medium text-base line-clamp-2 pr-2 hover:text-primary">
                                        {task.title}
                                      </h3>
                                      <Badge variant="outline" className={getPriorityColor(task.priority)}>
                                        {task.priority}
                                      </Badge>
                                    </div>
                                    
                                    {task.description && (
                                      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                                        {task.description}
                                      </p>
                                    )}
                                  </div>
                                  <div className="flex justify-between items-center text-sm">
                                    <div className="flex items-center gap-1">
                                      {task.assigneeName ? (
                                        <div className="flex items-center">
                                          <Avatar className="h-5 w-5 mr-1">
                                            <AvatarImage src={`https://avatar.vercel.sh/${task.assigneeId}`} />
                                            <AvatarFallback className="text-[10px]">
                                              {task.assigneeName.charAt(0)}
                                            </AvatarFallback>
                                          </Avatar>
                                          <span className="truncate max-w-[80px]">
                                            {task.assigneeName}
                                          </span>
                                        </div>
                                      ) : (
                                        <span className="text-muted-foreground">Unassigned</span>
                                      )}
                                    </div>
                                    
                                    {task.dueDate && (
                                      <div className="flex items-center">
                                        <Calendar className="h-3 w-3 mr-1" />
                                        <span>
                                          {format(new Date(task.dueDate), "MM/dd")}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                </Link>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </CardContent>
                )}
              </Droppable>
            </Card>
          </div>
        ))}
      </div>
    </DragDropContext>
  );
} 