"use client";

import { useState } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { CalendarIcon, ClockIcon, UserIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

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

interface TaskCardProps {
  task: Task;
  projectId: string;
  onStatusChange?: (taskId: string, newStatus: string) => void;
}

export function TaskCard({ task, projectId, onStatusChange }: TaskCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  // Status mapping for styling
  const statusConfig = {
    "todo": { 
      label: "To Do", 
      color: "bg-slate-200 text-slate-800" 
    },
    "in-progress": { 
      label: "In Progress", 
      color: "bg-blue-200 text-blue-800" 
    },
    "review": { 
      label: "In Review", 
      color: "bg-yellow-200 text-yellow-800" 
    },
    "done": { 
      label: "Done", 
      color: "bg-green-200 text-green-800" 
    }
  };

  // Priority mapping for styling
  const priorityConfig = {
    "low": { 
      label: "Low", 
      color: "bg-gray-200 text-gray-800" 
    },
    "medium": { 
      label: "Medium", 
      color: "bg-blue-200 text-blue-800" 
    },
    "high": { 
      label: "High", 
      color: "bg-orange-200 text-orange-800" 
    },
    "urgent": { 
      label: "Urgent", 
      color: "bg-red-200 text-red-800" 
    }
  };

  // Type mapping for styling
  const typeConfig = {
    "bug": { 
      label: "Bug", 
      color: "bg-red-200 text-red-800" 
    },
    "feature": { 
      label: "Feature", 
      color: "bg-green-200 text-green-800" 
    },
    "improvement": { 
      label: "Improvement", 
      color: "bg-blue-200 text-blue-800" 
    },
    "task": { 
      label: "Task", 
      color: "bg-purple-200 text-purple-800" 
    },
    "documentation": { 
      label: "Documentation", 
      color: "bg-yellow-200 text-yellow-800" 
    }
  };

  const handleStatusChange = (newStatus: string) => {
    if (onStatusChange) {
      onStatusChange(task.id, newStatus);
    }
  };

  // Handle due date display
  const getDueDateInfo = () => {
    if (!task.dueDate) return null;
    
    try {
      const dueDate = new Date(task.dueDate);
      
      // Check if the date is valid
      if (isNaN(dueDate.getTime())) {
        return null;
      }
      
      const now = new Date();
      const isPastDue = dueDate < now && task.status !== "done";
      
      return {
        formatted: dueDate.toLocaleDateString(),
        relative: formatDistanceToNow(dueDate, { addSuffix: true }),
        isPastDue
      };
    } catch (error) {
      console.error("Error parsing due date:", error);
      return null;
    }
  };

  const dueDateInfo = getDueDateInfo();

  return (
    <Card 
      className={cn(
        "transition-all duration-200 hover:shadow-md",
        isHovered ? "border-primary" : "border-border"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <CardHeader className="p-4 pb-0">
        <div className="flex justify-between items-start gap-2">
          <Link 
            href={`/projects/${projectId}/tasks/${task.id}`}
            className="text-lg font-medium hover:text-primary transition-colors duration-200 line-clamp-2"
          >
            {task.title}
          </Link>
          
          <div className="flex flex-shrink-0 gap-2">
            <Badge variant="outline" className={cn(typeConfig[task.type].color)}>
              {typeConfig[task.type].label}
            </Badge>
            <Badge variant="outline" className={cn(priorityConfig[task.priority].color)}>
              {priorityConfig[task.priority].label}
            </Badge>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-4">
        {task.description && (
          <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
            {task.description}
          </p>
        )}
        
        <div className="flex flex-col gap-3">
          {task.assigneeName && (
            <div className="flex items-center gap-2 text-sm">
              <UserIcon className="h-4 w-4 text-muted-foreground" />
              <div className="flex items-center gap-2">
                <Avatar className="h-5 w-5">
                  <AvatarImage src={`https://avatar.vercel.sh/${task.assigneeId}`} />
                  <AvatarFallback className="text-xs">
                    {task.assigneeName.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <span>{task.assigneeName}</span>
              </div>
            </div>
          )}
          
          {dueDateInfo && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-2 text-sm">
                    <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                    <span className={cn(
                      dueDateInfo.isPastDue ? "text-red-600 font-medium" : ""
                    )}>
                      {dueDateInfo.formatted}
                    </span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{dueDateInfo.relative}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <ClockIcon className="h-4 w-4" />
            <span>
              {(() => {
                try {
                  if (!task.updatedAt) return "Unknown";
                  const date = new Date(task.updatedAt);
                  if (isNaN(date.getTime())) return "Unknown";
                  return `Updated ${formatDistanceToNow(date, { addSuffix: true })}`;
                } catch (error) {
                  console.error("Error formatting date:", error);
                  return "Updated recently";
                }
              })()}
            </span>
          </div>
        </div>
      </CardContent>
      
      <CardFooter className="p-4 pt-0">
        <div className="w-full">
          <Badge className={cn(
            "w-full text-center py-1",
            statusConfig[task.status].color
          )}>
            {statusConfig[task.status].label}
          </Badge>
        </div>
      </CardFooter>
    </Card>
  );
} 