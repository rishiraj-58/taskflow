"use client";

import { useState } from "react";
import Link from "next/link";
import { formatDistanceToNow, parseISO } from "date-fns";
import { 
  CalendarIcon, 
  Clock, 
  AlertCircle, 
  CheckCircle2,
  User2,
  Tag,
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  CheckCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

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
  onStatusChange: (taskId: string, newStatus: string) => void;
  className?: string;
  style?: React.CSSProperties;
}

export function TaskCard({ task, projectId, onStatusChange, className, style }: TaskCardProps) {
  const [updating, setUpdating] = useState(false);

  const handleStatusChange = async (newStatus: string) => {
    setUpdating(true);
    await onStatusChange(task.id, newStatus);
    setUpdating(false);
  };

  // Determine due date status
  const getDueDateStatus = () => {
    if (!task.dueDate) return null;
    
    try {
      const dueDate = parseISO(task.dueDate);
      const now = new Date();
      const isPast = dueDate < now;
      const isToday = dueDate.toDateString() === now.toDateString();
      const isTomorrow = new Date(now.setDate(now.getDate() + 1)).toDateString() === dueDate.toDateString();
      
      if (isPast) return "overdue";
      if (isToday) return "today";
      if (isTomorrow) return "tomorrow";
      return "upcoming";
    } catch (e) {
      console.error("Error parsing due date:", e);
      return null;
    }
  };

  const dueDateStatus = getDueDateStatus();

  // Status configuration
  const statusConfig = {
    "todo": { 
      label: "To Do", 
      icon: ArrowDownLeft,
      color: "text-blue-500 dark:text-blue-400",
      bg: "bg-blue-100 dark:bg-blue-900/30"
    },
    "in-progress": { 
      label: "In Progress", 
      icon: ArrowRight,
      color: "text-amber-500 dark:text-amber-400",
      bg: "bg-amber-100 dark:bg-amber-900/30"
    },
    "review": { 
      label: "In Review", 
      icon: ArrowUpRight,
      color: "text-purple-500 dark:text-purple-400",
      bg: "bg-purple-100 dark:bg-purple-900/30"
    },
    "done": { 
      label: "Done", 
      icon: CheckCircle,
      color: "text-green-500 dark:text-green-400",
      bg: "bg-green-100 dark:bg-green-900/30"
    }
  };

  // Priority configuration
  const priorityConfig = {
    "urgent": { 
      label: "Urgent", 
      icon: AlertCircle,
      color: "text-red-600 dark:text-red-500",
      bg: "bg-red-100 dark:bg-red-900/30" 
    },
    "high": { 
      label: "High", 
      icon: AlertCircle,
      color: "text-orange-600 dark:text-orange-500",
      bg: "bg-orange-100 dark:bg-orange-900/30" 
    },
    "medium": { 
      label: "Medium", 
      icon: Clock,
      color: "text-blue-600 dark:text-blue-500",
      bg: "bg-blue-100 dark:bg-blue-900/30" 
    },
    "low": { 
      label: "Low", 
      icon: CheckCircle2,
      color: "text-gray-600 dark:text-gray-400",
      bg: "bg-gray-100 dark:bg-gray-800" 
    }
  };

  // Type configuration
  const typeConfig = {
    "bug": { 
      label: "Bug", 
      color: "text-red-600 dark:text-red-500",
      bg: "bg-red-100 dark:bg-red-900/30" 
    },
    "feature": { 
      label: "Feature", 
      color: "text-green-600 dark:text-green-500",
      bg: "bg-green-100 dark:bg-green-900/30" 
    },
    "improvement": { 
      label: "Improvement", 
      color: "text-sky-600 dark:text-sky-500",
      bg: "bg-sky-100 dark:bg-sky-900/30" 
    },
    "task": { 
      label: "Task", 
      color: "text-blue-600 dark:text-blue-500",
      bg: "bg-blue-100 dark:bg-blue-900/30" 
    },
    "documentation": { 
      label: "Documentation", 
      color: "text-purple-600 dark:text-purple-500",
      bg: "bg-purple-100 dark:bg-purple-900/30" 
    }
  };

  // Due date configuration
  const dueDateConfig = {
    "overdue": { 
      color: "text-red-600 dark:text-red-500",
      bg: "bg-red-100 dark:bg-red-900/30" 
    },
    "today": { 
      color: "text-amber-600 dark:text-amber-500",
      bg: "bg-amber-100 dark:bg-amber-900/30" 
    },
    "tomorrow": { 
      color: "text-orange-600 dark:text-orange-500",
      bg: "bg-orange-100 dark:bg-orange-900/30" 
    },
    "upcoming": { 
      color: "text-blue-600 dark:text-blue-500",
      bg: "bg-blue-100 dark:bg-blue-900/30" 
    }
  };

  // Get status display configuration
  const statusDisplay = statusConfig[task.status];
  const priorityDisplay = priorityConfig[task.priority];
  const typeDisplay = typeConfig[task.type];
  const StatusIcon = statusDisplay.icon;
  const PriorityIcon = priorityDisplay.icon;

  return (
    <Card 
      className={cn(
        "overflow-hidden group transition-all duration-300",
        className
      )}
      style={style}
    >
      <CardHeader className="p-4 pb-0 flex flex-row items-start justify-between gap-2">
        <div className="space-y-1.5 flex-1">
          <Link 
            href={`/projects/${projectId}/tasks/${task.id}`} 
            className="block group-hover:text-primary transition-colors"
          >
            <h3 className="font-medium text-base leading-tight line-clamp-2 hover:underline transition-all">
              {task.title}
            </h3>
          </Link>
        </div>
        
        <Badge 
          variant="outline"
          className={cn(
            "flex items-center gap-1 font-normal",
            statusDisplay.color,
            statusDisplay.bg
          )}
        >
          <StatusIcon size={12} />
          <span>{statusDisplay.label}</span>
        </Badge>
      </CardHeader>
      
      <CardContent className="p-4 pt-3">
        {task.description ? (
          <p className="text-sm text-muted-foreground line-clamp-3 mb-3">
            {task.description}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground/70 italic mb-3">No description provided</p>
        )}
        
        <div className="flex flex-wrap gap-2 mt-2">
          <Badge 
            variant="outline"
            className={cn(
              "flex items-center gap-1 font-normal",
              priorityDisplay.color,
              priorityDisplay.bg
            )}
          >
            <PriorityIcon size={12} />
            <span>{priorityDisplay.label}</span>
          </Badge>
          
          <Badge 
            variant="outline"
            className={cn(
              "flex items-center gap-1 font-normal",
              typeDisplay.color,
              typeDisplay.bg
            )}
          >
            <Tag size={12} />
            <span>{typeDisplay.label}</span>
          </Badge>
        </div>
      </CardContent>
      
      <CardFooter className="p-4 pt-0 flex flex-wrap justify-between items-center gap-2 text-sm">
        <div className="flex items-center gap-2">
          {task.assigneeName ? (
            <div className="flex items-center gap-1.5" title={`Assigned to ${task.assigneeName}`}>
              <Avatar className="h-6 w-6">
                <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                  {task.assigneeName.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              <span className="text-xs text-muted-foreground">{task.assigneeName}</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-muted-foreground/70">
              <User2 size={14} />
              <span className="text-xs">Unassigned</span>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {task.dueDate && (
            <div 
              className={cn(
                "flex items-center gap-1.5 text-xs",
                dueDateStatus && dueDateConfig[dueDateStatus].color
              )}
              title={`Due: ${new Date(task.dueDate).toLocaleDateString()}`}
            >
              <CalendarIcon size={14} />
              <span>
                {dueDateStatus === "today" 
                  ? "Today" 
                  : dueDateStatus === "tomorrow" 
                    ? "Tomorrow"
                    : formatDistanceToNow(parseISO(task.dueDate), { addSuffix: true })}
              </span>
            </div>
          )}
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-7 px-2 text-xs rounded-full"
                disabled={updating}
              >
                Change Status
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {Object.entries(statusConfig).map(([value, config]) => (
                <DropdownMenuItem
                  key={value}
                  disabled={task.status === value || updating}
                  className={cn(
                    "flex items-center gap-2",
                    task.status === value && "bg-accent"
                  )}
                  onClick={() => handleStatusChange(value)}
                >
                  <config.icon size={14} className={config.color} />
                  <span>{config.label}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardFooter>
    </Card>
  );
} 