'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import Link from 'next/link';
import {
  Calendar,
  Users,
  Target,
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  Activity,
  Plus,
  Code,
  Zap
} from 'lucide-react';

interface DeveloperDashboardData {
  tasksAssigned: number;
  tasksCompleted: number;
  tasksInProgress: number;
  bugsFixed: number;
  codeReviews: number;
  focusTimeToday: number;
  streakDays: number;
  velocity: number;
  productivity: number;
  completionRate: number;
  todaysTasks: Array<{
    id: string;
    title: string;
    priority: string;
    estimatedTime: string;
    status: string;
    project: string;
    dueDate?: string;
  }>;
  recentActivity: Array<{
    action: string;
    item: string;
    time: string;
    type: 'task' | 'review' | 'bug';
  }>;
  upcomingDeadlines: Array<{
    id: string;
    title: string;
    dueDate: string;
    priority: string;
    daysLeft: number;
  }>;
  weeklyProgress: Array<{
    day: string;
    tasksCompleted: number;
    hoursWorked: number;
  }>;
  skillMetrics: {
    taskTypes: Array<{
      type: string;
      count: number;
      percentage: number;
    }>;
    complexityHandled: {
      simple: number;
      medium: number;
      complex: number;
    };
  };
}

export function DeveloperDashboard() {
  const [data, setData] = useState<DeveloperDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDeveloperData() {
      try {
        setLoading(true);
        const response = await fetch('/api/dashboards/developer');
        
        if (!response.ok) {
          throw new Error('Failed to fetch developer dashboard data');
        }
        
        const dashboardData = await response.json();
        setData(dashboardData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    }

    fetchDeveloperData();
  }, []);

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'critical':
        return 'bg-red-100 text-red-800';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 75) return 'text-blue-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-200 rounded animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Dashboard</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
            Developer Dashboard
          </h1>
          <p className="text-muted-foreground mt-2">
            Track your productivity, manage tasks, and optimize your development workflow
          </p>
        </div>
        <div className="flex gap-2 mt-4 md:mt-0">
          <Link href="/tasks/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Task
            </Button>
          </Link>
          <Link href="/code-metrics">
            <Button variant="outline">
              <Code className="mr-2 h-4 w-4" />
              Code Metrics
            </Button>
          </Link>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Tasks</p>
                <p className="text-2xl font-bold">{data.tasksAssigned}</p>
                <p className="text-xs text-muted-foreground">
                  {data.tasksInProgress} in progress
                </p>
              </div>
              <Target className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Velocity</p>
                <p className="text-2xl font-bold">{data.velocity}</p>
                <div className="flex items-center text-xs text-green-600">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  Tasks/week
                </div>
              </div>
              <Zap className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Productivity</p>
                <p className="text-2xl font-bold">{data.productivity}%</p>
                <Badge className={`${getScoreColor(data.productivity)} bg-opacity-10`}>
                  {data.productivity >= 90 ? 'Excellent' : 
                   data.productivity >= 75 ? 'Good' : 'Needs Focus'}
                </Badge>
              </div>
              <Activity className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Focus Streak</p>
                <p className="text-2xl font-bold">{data.streakDays}</p>
                <div className="flex items-center text-xs text-purple-600">
                  <Clock className="h-3 w-3 mr-1" />
                  {data.focusTimeToday}h focus time
                </div>
              </div>
              <Calendar className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Today's Priorities */}
        <Card className="col-span-2">
          <CardHeader>
            <CardTitle>Today's Tasks</CardTitle>
            <CardDescription>High-priority tasks that need your attention</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.todaysTasks.slice(0, 5).map((task) => (
                <div key={task.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <h4 className="font-medium text-sm">{task.title}</h4>
                    <p className="text-xs text-muted-foreground">{task.project}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={getPriorityColor(task.priority)}>
                      {task.priority}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {task.estimatedTime}
                    </span>
                  </div>
                </div>
              ))}
              {data.todaysTasks.length === 0 && (
                <div className="text-center py-4 text-muted-foreground">
                  <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
                  All caught up! No urgent tasks for today.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Weekly Progress */}
        <Card>
          <CardHeader>
            <CardTitle>Weekly Progress</CardTitle>
            <CardDescription>Your accomplishments this week</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-sm font-medium">Tasks Completed</span>
                <span className="text-sm font-bold">{data.tasksCompleted}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-sm font-medium">Code Reviews</span>
                <span className="text-sm font-bold">{data.codeReviews}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-sm font-medium">Bugs Fixed</span>
                <span className="text-sm font-bold">{data.bugsFixed}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-sm font-medium">Completion Rate</span>
                <span className="text-sm font-bold">{data.completionRate}%</span>
              </div>

              <div className="pt-4">
                <Link href="/tasks">
                  <Button variant="outline" className="w-full">
                    <Target className="mr-2 h-4 w-4" />
                    View All Tasks
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Skill Metrics */}
        <Card>
          <CardHeader>
            <CardTitle>Task Types</CardTitle>
            <CardDescription>Your work distribution</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.skillMetrics.taskTypes.slice(0, 4).map((taskType) => (
                <div key={taskType.type}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="capitalize">{taskType.type}</span>
                    <span>{taskType.percentage}%</span>
                  </div>
                  <Progress value={taskType.percentage} className="h-2" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Deadlines */}
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Deadlines</CardTitle>
            <CardDescription>Tasks requiring attention soon</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.upcomingDeadlines.slice(0, 4).map((deadline) => (
                <div key={deadline.id} className="flex items-center justify-between p-2 border rounded">
                  <div className="flex-1">
                    <h4 className="font-medium text-sm">{deadline.title}</h4>
                    <p className="text-xs text-muted-foreground">Due: {deadline.dueDate}</p>
                  </div>
                  <div className="text-right">
                    <Badge variant={deadline.daysLeft <= 1 ? 'destructive' : deadline.daysLeft <= 3 ? 'default' : 'secondary'}>
                      {deadline.daysLeft}d
                    </Badge>
                  </div>
                </div>
              ))}
              {data.upcomingDeadlines.length === 0 && (
                <div className="text-center py-4 text-muted-foreground text-sm">
                  No upcoming deadlines
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Code Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Complexity Handled</CardTitle>
            <CardDescription>Task complexity distribution</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div className="text-center p-2 bg-green-50 rounded">
                  <div className="text-green-600 font-bold">{data.skillMetrics.complexityHandled.simple}</div>
                  <div className="text-green-600 text-xs">Simple</div>
                </div>
                <div className="text-center p-2 bg-yellow-50 rounded">
                  <div className="text-yellow-600 font-bold">{data.skillMetrics.complexityHandled.medium}</div>
                  <div className="text-yellow-600 text-xs">Medium</div>
                </div>
                <div className="text-center p-2 bg-red-50 rounded">
                  <div className="text-red-600 font-bold">{data.skillMetrics.complexityHandled.complex}</div>
                  <div className="text-red-600 text-xs">Complex</div>
                </div>
              </div>

              <div className="pt-4 border-t">
                <div className="text-sm text-center">
                  <div className="text-lg font-bold">{data.velocity} velocity</div>
                  <div className="text-muted-foreground">Tasks per week</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 