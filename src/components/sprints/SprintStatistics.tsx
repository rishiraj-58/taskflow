"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ListChecksIcon,
  CheckCircleIcon,
  ClockIcon,
  ChevronRightIcon,
} from "lucide-react";
import SprintProgressBar from "@/components/sprints/SprintProgressBar";

interface SprintStatisticsProps {
  initialTotalTasks: number;
  initialCompletedTasks: number;
  initialInProgressTasks: number;
  initialTodoTasks: number;
  sprintId: string;
  daysRemaining: number;
  sprintDuration: number;
}

export default function SprintStatistics({ 
  initialTotalTasks,
  initialCompletedTasks,
  initialInProgressTasks,
  initialTodoTasks,
  sprintId,
  daysRemaining,
  sprintDuration
}: SprintStatisticsProps) {
  // Initialize state with the props
  const [stats, setStats] = useState({
    totalTasks: initialTotalTasks,
    completedTasks: initialCompletedTasks,
    inProgressTasks: initialInProgressTasks,
    todoTasks: initialTodoTasks
  });

  // Set up event listeners for real-time updates
  useEffect(() => {
    const handleStatisticsUpdate = (event: any) => {
      const { detail } = event;
      
      // Only update if this is for our sprint
      if (detail.sprintId === sprintId) {
        setStats(detail.statistics);
      }
    };
    
    // Listen for statistics update events
    window.addEventListener('sprint-statistics-updated', handleStatisticsUpdate);
    
    // Cleanup
    return () => {
      window.removeEventListener('sprint-statistics-updated', handleStatisticsUpdate);
    };
  }, [sprintId]);

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-4 animate-scaleIn" style={{ animationDelay: "100ms" }}>
      <Card className="bg-white dark:bg-gray-900 border-blue-100 dark:border-blue-900/30 shadow-sm overflow-hidden group hover:shadow-md hover:-translate-y-1 transition-all duration-300">
        <div className="absolute top-0 w-full h-1 bg-gradient-to-r from-violet-500 to-blue-500"></div>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center text-muted-foreground">
            <ClockIcon className="h-4 w-4 mr-2 text-violet-500 dark:text-violet-400 group-hover:animate-pulse" />
            Duration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col">
            <span className="text-2xl font-bold">
              {sprintDuration} days
            </span>
            {daysRemaining > 0 && (
              <span className="text-xs mt-1 text-muted-foreground">
                {Math.floor((sprintDuration - daysRemaining) / sprintDuration * 100)}% elapsed
              </span>
            )}
          </div>
        </CardContent>
      </Card>
      
      <Card className="bg-white dark:bg-gray-900 border-blue-100 dark:border-blue-900/30 shadow-sm overflow-hidden group hover:shadow-md hover:-translate-y-1 transition-all duration-300">
        <div className="absolute top-0 w-full h-1 bg-gradient-to-r from-blue-500 to-cyan-500"></div>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center text-muted-foreground">
            <ListChecksIcon className="h-4 w-4 mr-2 text-blue-500 dark:text-blue-400 group-hover:animate-pulse" />
            Total Tasks
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col">
            <span className="text-2xl font-bold">{stats.totalTasks}</span>
            <div className="flex gap-2 mt-1">
              <span className="inline-flex items-center text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-1.5 rounded">
                <span className="h-2 w-2 rounded-full bg-blue-500 mr-1"></span>{stats.todoTasks} to do
              </span>
              <span className="inline-flex items-center text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 px-1.5 rounded">
                <span className="h-2 w-2 rounded-full bg-amber-500 mr-1"></span>{stats.inProgressTasks} in progress
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card className="bg-white dark:bg-gray-900 border-blue-100 dark:border-blue-900/30 shadow-sm overflow-hidden group hover:shadow-md hover:-translate-y-1 transition-all duration-300">
        <div className="absolute top-0 w-full h-1 bg-gradient-to-r from-cyan-500 to-emerald-500"></div>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center text-muted-foreground">
            <CheckCircleIcon className="h-4 w-4 mr-2 text-emerald-500 dark:text-emerald-400 group-hover:animate-pulse" />
            Completed
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col">
            <span className="text-2xl font-bold">{stats.completedTasks}</span>
            <span className="text-xs mt-1 text-muted-foreground">
              of {stats.totalTasks} tasks ({stats.totalTasks ? Math.round((stats.completedTasks / stats.totalTasks) * 100) : 0}%)
            </span>
          </div>
        </CardContent>
      </Card>
      
      <Card className="bg-white dark:bg-gray-900 border-blue-100 dark:border-blue-900/30 shadow-sm overflow-hidden group hover:shadow-md hover:-translate-y-1 transition-all duration-300">
        <div className="absolute top-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-green-500"></div>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center text-muted-foreground">
            <ChevronRightIcon className="h-4 w-4 mr-2 text-emerald-500 dark:text-emerald-400 group-hover:animate-pulse" />
            Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <SprintProgressBar 
            completedTasks={stats.completedTasks} 
            totalTasks={stats.totalTasks}
            className="mt-2"
          />
        </CardContent>
      </Card>
    </div>
  );
} 