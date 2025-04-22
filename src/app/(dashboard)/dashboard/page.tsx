"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { ArrowRight, BarChart3, CheckCircle, Clock, Layers } from "lucide-react";

export default function DashboardPage() {
  const { user } = useUser();
  const [stats, setStats] = useState({
    projects: 0,
    tasks: 0,
    completedTasks: 0,
    workspaces: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate loading dashboard data
    const timer = setTimeout(() => {
      setStats({
        projects: 5,
        tasks: 18,
        completedTasks: 7,
        workspaces: 2
      });
      setLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="container mx-auto p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Welcome back, {user?.firstName}! Here's an overview of your projects and tasks.
          </p>
        </div>
        <div className="mt-4 md:mt-0">
          <Link href="/projects/new">
            <Button>
              Create New Project
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <StatsCard
          title="Total Projects"
          value={stats.projects}
          description="Active projects"
          icon={<Layers className="h-5 w-5 text-blue-600" />}
          loading={loading}
        />
        <StatsCard
          title="Total Tasks"
          value={stats.tasks}
          description="Across all projects"
          icon={<Clock className="h-5 w-5 text-yellow-600" />}
          loading={loading}
        />
        <StatsCard
          title="Completed Tasks"
          value={stats.completedTasks}
          description={`${stats.tasks > 0 ? Math.round((stats.completedTasks / stats.tasks) * 100) : 0}% completion rate`}
          icon={<CheckCircle className="h-5 w-5 text-green-600" />}
          loading={loading}
        />
        <StatsCard
          title="Workspaces"
          value={stats.workspaces}
          description="Active workspaces"
          icon={<BarChart3 className="h-5 w-5 text-purple-600" />}
          loading={loading}
        />
      </div>

      {/* Recent activity */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="col-span-2">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Your recent project and task activity</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center space-x-4">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-[250px]" />
                      <Skeleton className="h-4 w-[200px]" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-10 text-muted-foreground">
                <p>No recent activity to display.</p>
                <p className="text-sm mt-1">Create a new project or task to get started.</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common tasks and shortcuts</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link href="/tasks/new">
              <Button variant="outline" className="w-full justify-start">
                Create New Task
              </Button>
            </Link>
            <Link href="/workspaces">
              <Button variant="outline" className="w-full justify-start">
                View Workspaces
              </Button>
            </Link>
            <Link href="/projects">
              <Button variant="outline" className="w-full justify-start">
                Manage Projects
              </Button>
            </Link>
            <Link href="/team">
              <Button variant="outline" className="w-full justify-start">
                Invite Team Member
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatsCard({ 
  title, 
  value, 
  description, 
  icon, 
  loading 
}: { 
  title: string; 
  value: number; 
  description: string; 
  icon: React.ReactNode;
  loading: boolean;
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            {loading ? (
              <Skeleton className="h-9 w-16 mt-1" />
            ) : (
              <p className="text-3xl font-bold">{value}</p>
            )}
            <p className="text-xs text-muted-foreground mt-1">{description}</p>
          </div>
          <div className="rounded-full p-2 bg-muted">{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
} 