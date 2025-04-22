"use client";

import { useState, useEffect } from "react";
import { Calendar as CalendarIcon, AlertCircle } from "lucide-react";
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isToday, 
  startOfWeek,
  endOfWeek,
  isSameMonth
} from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { Task } from "@/types/task";
import Link from "next/link";

interface CalendarViewProps {
  projectId: string;
  tasks: Task[];
  loading: boolean;
  error: string | null;
}

export default function CalendarView({ projectId, tasks, loading, error }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarDays, setCalendarDays] = useState<Date[]>([]);
  const [tasksGroupedByDate, setTasksGroupedByDate] = useState<Record<string, Task[]>>({});

  // Set up calendar days for the current month
  useEffect(() => {
    // Get the first day of the month
    const firstDay = startOfMonth(currentDate);
    // Get the last day of the month
    const lastDay = endOfMonth(currentDate);
    
    // Get the start of the first week (might include days from previous month)
    const calendarStart = startOfWeek(firstDay);
    // Get the end of the last week (might include days from next month)
    const calendarEnd = endOfWeek(lastDay);
    
    // Get all days in the calendar view including days from previous/next months
    const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
    setCalendarDays(days);
  }, [currentDate]);

  // Group tasks by date
  useEffect(() => {
    const groupedTasks: Record<string, Task[]> = {};
    
    tasks.forEach(task => {
      if (task.dueDate) {
        try {
          // Make sure the date is valid before processing
          const parsedDate = new Date(task.dueDate);
          if (!isNaN(parsedDate.getTime())) {
            const dueDate = format(parsedDate, 'yyyy-MM-dd');
            
            if (!groupedTasks[dueDate]) {
              groupedTasks[dueDate] = [];
            }
            
            groupedTasks[dueDate].push(task);
          }
        } catch (error) {
          console.error("Invalid date format for task:", task.id, task.dueDate, error);
        }
      }
    });
    
    setTasksGroupedByDate(groupedTasks);
  }, [tasks]);

  const goToPreviousMonth = () => {
    setCurrentDate(prevDate => {
      const newDate = new Date(prevDate);
      newDate.setMonth(newDate.getMonth() - 1);
      return newDate;
    });
  };

  const goToNextMonth = () => {
    setCurrentDate(prevDate => {
      const newDate = new Date(prevDate);
      newDate.setMonth(newDate.getMonth() + 1);
      return newDate;
    });
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case "todo": return "bg-slate-200 text-slate-800";
      case "in-progress": return "bg-blue-200 text-blue-800";
      case "review": return "bg-yellow-200 text-yellow-800";
      case "done": return "bg-green-200 text-green-800";
      default: return "bg-gray-200 text-gray-800";
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <Skeleton className="h-10 w-[150px]" />
          <div className="flex gap-2">
            <Skeleton className="h-10 w-[100px]" />
            <Skeleton className="h-10 w-[100px]" />
            <Skeleton className="h-10 w-[100px]" />
          </div>
        </div>
        
        <div className="grid grid-cols-7 gap-2">
          {[...Array(35)].map((_, i) => (
            <Skeleton key={i} className="aspect-square" />
          ))}
        </div>
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
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row justify-between items-center mb-4 gap-4">
        <h2 className="text-xl font-bold">
          {format(currentDate, 'MMMM yyyy')}
        </h2>
        
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={goToPreviousMonth}
          >
            Previous
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={goToToday}
          >
            Today
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={goToNextMonth}
          >
            Next
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-7 gap-x-1 gap-y-2">
        {/* Day labels */}
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div 
            key={day} 
            className="text-center font-medium text-sm py-2"
          >
            {day}
          </div>
        ))}
        
        {/* Calendar grid */}
        {calendarDays.map(day => {
          const dateKey = format(day, 'yyyy-MM-dd');
          const dayTasks = tasksGroupedByDate[dateKey] || [];
          const isCurrentDay = isToday(day);
          const isCurrentMonth = isSameMonth(day, currentDate);
          
          return (
            <div
              key={dateKey}
              className={cn(
                "border rounded-md p-2 min-h-[120px] overflow-y-auto",
                !isCurrentMonth ? "bg-gray-50 opacity-50" : "",
                isCurrentDay ? "bg-primary/5 border-primary/20" : ""
              )}
            >
              <div className="text-right mb-1">
                <span className={cn(
                  "inline-block rounded-full w-7 h-7 text-center leading-7",
                  !isCurrentMonth ? "text-gray-400" : "",
                  isCurrentDay ? "bg-primary text-primary-foreground" : ""
                )}>
                  {format(day, 'd')}
                </span>
              </div>
              
              <div className="space-y-1">
                {dayTasks.map(task => (
                  <Link 
                    href={`/projects/${projectId}/tasks/${task.id}`}
                    key={task.id}
                    className="block"
                  >
                    <div className={cn(
                      "text-xs p-1 rounded truncate hover:bg-accent",
                      getStatusColor(task.status)
                    )}>
                      {task.title}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
} 