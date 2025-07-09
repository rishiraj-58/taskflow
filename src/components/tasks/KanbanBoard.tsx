"use client";

import React, { useState, useCallback, useMemo, memo } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  AlertCircle, 
  CalendarIcon, 
  Clock, 
  User, 
  CheckCircle2,
  Circle,
  PlayCircle,
  Eye
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { Task } from "@/types/task";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

// Priority configuration
const priorityConfig = {
  urgent: {
    color: "bg-red-500",
    text: "text-red-700 dark:text-red-400",
    bg: "bg-red-50 dark:bg-red-950/30",
    border: "border-red-200 dark:border-red-800"
  },
  high: {
    color: "bg-orange-500",
    text: "text-orange-700 dark:text-orange-400",
    bg: "bg-orange-50 dark:bg-orange-950/30",
    border: "border-orange-200 dark:border-orange-800"
  },
  medium: {
    color: "bg-blue-500",
    text: "text-blue-700 dark:text-blue-400",
    bg: "bg-blue-50 dark:bg-blue-950/30",
    border: "border-blue-200 dark:border-blue-800"
  },
  low: {
    color: "bg-slate-500",
    text: "text-slate-700 dark:text-slate-400",
    bg: "bg-slate-50 dark:bg-slate-950/30",
    border: "border-slate-200 dark:border-slate-800"
  }
};

// Column configuration
const columnConfig = {
  todo: {
    title: "To Do",
    icon: Circle,
    color: "border-blue-200 bg-blue-50/30 dark:border-blue-800 dark:bg-blue-950/20",
    headerColor: "bg-blue-500/10 dark:bg-blue-500/20",
    textColor: "text-blue-700 dark:text-blue-300"
  },
  "in-progress": {
    title: "In Progress",
    icon: PlayCircle,
    color: "border-amber-200 bg-amber-50/30 dark:border-amber-800 dark:bg-amber-950/20",
    headerColor: "bg-amber-500/10 dark:bg-amber-500/20",
    textColor: "text-amber-700 dark:text-amber-300"
  },
  review: {
    title: "In Review",
    icon: Eye,
    color: "border-purple-200 bg-purple-50/30 dark:border-purple-800 dark:bg-purple-950/20",
    headerColor: "bg-purple-500/10 dark:bg-purple-500/20",
    textColor: "text-purple-700 dark:text-purple-300"
  },
  done: {
    title: "Done",
    icon: CheckCircle2,
    color: "border-green-200 bg-green-50/30 dark:border-green-800 dark:bg-green-950/20",
    headerColor: "bg-green-500/10 dark:bg-green-500/20",
    textColor: "text-green-700 dark:text-green-300"
  }
};

// Optimized Task Card Component
const TaskCard = memo(({ task, projectId, index }: { task: Task; projectId: string; index: number }) => {
  const priority = priorityConfig[task.priority as keyof typeof priorityConfig] || priorityConfig.medium;
  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'done';

  return (
    <Draggable draggableId={task.id} index={index}>
      {(provided, snapshot) => (
                <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={cn(
            "group relative bg-white dark:bg-gray-900 rounded-lg border p-4 shadow-sm",
            "transition-all duration-150 ease-out",
            "hover:shadow-md hover:border-gray-300 dark:hover:border-gray-600",
            "focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-2",
            "cursor-grab active:cursor-grabbing",
            snapshot.isDragging && [
              "shadow-2xl scale-[1.02] rotate-[0.5deg]",
              "opacity-95",
              "ring-2 ring-blue-500 ring-offset-2"
            ]
          )}
          style={{
            ...provided.draggableProps.style,
            // Let the library handle positioning completely
            zIndex: snapshot.isDragging ? 9999 : 'auto'
          }}
        >
          {/* Priority indicator */}
          <div className={cn(
            "absolute top-2 right-2 w-2 h-2 rounded-full",
            priority.color
          )} />
          
          {/* Overdue indicator */}
          {isOverdue && (
            <div className="absolute top-2 left-2 w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          )}

          <Link 
            href={`/projects/${projectId}/tasks/${task.id}`}
            className="block space-y-3"
            prefetch={false}
          >
            {/* Task title */}
            <h3 className="font-medium text-sm leading-tight line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              {task.title}
            </h3>
            
            {/* Task metadata */}
            <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
              {/* Assignee */}
              <div className="flex items-center gap-1.5">
                {task.assigneeName ? (
                  <div className="flex items-center gap-1">
                    <Avatar className="w-5 h-5">
                      <AvatarImage src={`https://avatar.vercel.sh/${task.assigneeName}`} />
                      <AvatarFallback className="text-xs">
                        {task.assigneeName.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <span className="truncate max-w-16">{task.assigneeName.split(' ')[0]}</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-gray-500">
                    <User className="w-3 h-3" />
                    <span>Unassigned</span>
                  </div>
                )}
              </div>
              
              {/* Due date */}
              {task.dueDate && (
                <div className={cn(
                  "flex items-center gap-1",
                  isOverdue && "text-red-600 dark:text-red-400 font-medium"
                )}>
                  <Clock className="w-3 h-3" />
                  <span>{format(new Date(task.dueDate), "MMM d")}</span>
                </div>
              )}
            </div>

            {/* Priority badge */}
            <div className={cn(
              "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium",
              priority.bg,
              priority.border,
              priority.text
            )}>
              {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
            </div>
          </Link>
        </div>
      )}
    </Draggable>
  );
});

TaskCard.displayName = "TaskCard";

// Optimized Column Component
const Column = memo(({ 
  columnId, 
  tasks, 
  projectId 
}: { 
  columnId: string;
  tasks: Task[];
  projectId: string;
}) => {
  const config = columnConfig[columnId as keyof typeof columnConfig];
  const IconComponent = config.icon;

  return (
    <div className="flex flex-col h-full">
      {/* Column header */}
      <div className={cn(
        "flex items-center justify-between p-4 border-b",
        config.headerColor,
        config.color
      )}>
        <div className="flex items-center gap-2">
          <IconComponent className={cn("w-4 h-4", config.textColor)} />
          <span className={cn("font-semibold text-sm", config.textColor)}>
            {config.title}
          </span>
        </div>
        <Badge variant="secondary" className="text-xs">
          {tasks.length}
        </Badge>
      </div>
      
      {/* Droppable area */}
      <Droppable droppableId={columnId}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={cn(
              "flex-1 p-3 overflow-y-auto transition-all duration-200",
              "scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600",
              "scrollbar-track-transparent",
              config.color,
              snapshot.isDraggingOver && [
                "bg-gray-100/50 dark:bg-gray-800/50",
                "ring-2 ring-blue-500/50 ring-inset"
              ]
            )}
            style={{
              minHeight: "200px",
              height: "calc(100vh - 240px)",
              position: "relative",
              zIndex: snapshot.isDraggingOver ? 5 : 1
            }}
          >
            <div className="space-y-3">
              {tasks.map((task, index) => (
                <TaskCard 
                  key={task.id} 
                  task={task} 
                  projectId={projectId} 
                  index={index} 
                />
              ))}
              
              {tasks.length === 0 && (
                <div className="h-32 flex flex-col items-center justify-center text-sm text-gray-500 dark:text-gray-400 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
                  <IconComponent className="w-8 h-8 mb-2 opacity-50" />
                  <span>No tasks</span>
                </div>
              )}
              
              {provided.placeholder}
            </div>
          </div>
        )}
      </Droppable>
    </div>
  );
});

Column.displayName = "Column";

// Main Kanban Board Component
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
  const columns = Object.keys(columnConfig);
  
  // Optimistic state for immediate UI updates
  const [optimisticTasks, setOptimisticTasks] = useState<Task[]>(tasks);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  
  // Update optimistic state when tasks prop changes
  React.useEffect(() => {
    setOptimisticTasks(tasks);
  }, [tasks]);
  
  // Group tasks by status with memoization
  const tasksByStatus = useMemo(() => {
    return columns.reduce<Record<string, Task[]>>((acc, columnId) => {
      acc[columnId] = optimisticTasks.filter(task => task.status === columnId);
      return acc;
    }, {});
  }, [optimisticTasks, columns]);
  
  // Handle drag end with optimistic updates
  const handleDragEnd = useCallback(async (result: any) => {
    const { destination, source, draggableId } = result;
    
    // Exit if dropped outside or in same position
    if (!destination || 
        (destination.droppableId === source.droppableId && 
         destination.index === source.index)) {
      return;
    }
    
    // Only update if status has changed
    if (destination.droppableId !== source.droppableId) {
      // Find the task being moved
      const taskToMove = optimisticTasks.find(task => task.id === draggableId);
      if (!taskToMove) return;
      
      // Optimistically update the UI immediately
      const updatedTask = { ...taskToMove, status: destination.droppableId };
      setOptimisticTasks(prev => 
        prev.map(task => task.id === draggableId ? updatedTask : task)
      );
      
      // Set updating state for visual feedback
      setIsUpdating(draggableId);
      
      try {
        // Make the actual API call
        await onStatusChange(draggableId, destination.droppableId);
      } catch (error) {
        console.error("Failed to update task status:", error);
        // Revert optimistic update on error
        setOptimisticTasks(prev => 
          prev.map(task => task.id === draggableId ? taskToMove : task)
        );
      } finally {
        setIsUpdating(null);
      }
    }
  }, [onStatusChange, optimisticTasks]);

  // Loading skeleton
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {columns.map((columnId) => (
          <Card key={columnId} className="h-[calc(100vh-200px)] animate-pulse">
            <div className="h-16 border-b bg-gray-100 dark:bg-gray-800"></div>
            <div className="p-4 space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="w-full h-24 rounded-lg bg-gray-200 dark:bg-gray-700"></div>
              ))}
            </div>
          </Card>
        ))}
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          {error}
          <Button variant="outline" size="sm" className="ml-2" onClick={() => window.location.reload()}>
            Refresh
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="relative" style={{ isolation: "isolate" }}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {columns.map((columnId) => (
            <Card 
              key={columnId}
              className="overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300"
              style={{ position: "relative", zIndex: 1 }}
            >
              <Column
                columnId={columnId}
                tasks={tasksByStatus[columnId] || []}
                projectId={projectId}
              />
            </Card>
          ))}
        </div>
      </div>
    </DragDropContext>
  );
} 