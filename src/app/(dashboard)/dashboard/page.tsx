"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { 
  ArrowRight, 
  BarChart3, 
  CheckCircle, 
  Clock, 
  Layers, 
  Map, 
  Milestone, 
  ArrowUpRight,
  Sparkles,
  Zap,
  ListTodo
} from "lucide-react";

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
      {/* Hero section with gradient */}
      <div className="relative rounded-xl overflow-hidden mb-10 animate-scaleIn">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 via-purple-600/20 to-pink-600/20 animate-gradient"></div>
        <div className="relative bg-white/80 dark:bg-gray-900/90 backdrop-blur-sm p-8 rounded-xl border border-gray-200 dark:border-gray-800">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
            <div>
              <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Welcome back, {user?.firstName || 'there'}!
              </h1>
              <p className="text-muted-foreground mt-2 max-w-xl">
                Your personal command center for all things project management. Here's what's happening today.
              </p>
            </div>
            <div className="mt-4 md:mt-0">
              <Link href="/projects/new">
                <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 group">
                  <Sparkles className="mr-2 h-4 w-4 group-hover:animate-pulse-soft" />
                  New Project
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
        {[
          {
            title: "Projects",
            value: stats.projects,
            description: "Active projects",
            icon: <Layers className="h-5 w-5 text-blue-600" />,
            color: "from-blue-50 to-blue-100/50 dark:from-blue-950/40 dark:to-blue-900/20",
            iconBg: "bg-blue-100 dark:bg-blue-900/30",
            delay: "0s"
          },
          {
            title: "Tasks",
            value: stats.tasks,
            description: "Across all projects",
            icon: <ListTodo className="h-5 w-5 text-green-600" />,
            color: "from-green-50 to-green-100/50 dark:from-green-950/40 dark:to-green-900/20",
            iconBg: "bg-green-100 dark:bg-green-900/30",
            delay: "0.1s"
          },
          {
            title: "Completed",
            value: stats.completedTasks,
            description: `${stats.tasks > 0 ? Math.round((stats.completedTasks / stats.tasks) * 100) : 0}% completion rate`,
            icon: <CheckCircle className="h-5 w-5 text-teal-600" />,
            color: "from-teal-50 to-teal-100/50 dark:from-teal-950/40 dark:to-teal-900/20",
            iconBg: "bg-teal-100 dark:bg-teal-900/30",
            delay: "0.2s"
          },
          {
            title: "Workspaces",
            value: stats.workspaces,
            description: "Active workspaces",
            icon: <BarChart3 className="h-5 w-5 text-purple-600" />,
            color: "from-purple-50 to-purple-100/50 dark:from-purple-950/40 dark:to-purple-900/20",
            iconBg: "bg-purple-100 dark:bg-purple-900/30",
            delay: "0.3s"
          }
        ].map((stat, index) => (
          <div 
            key={index} 
            className="animate-scaleIn" 
            style={{ animationDelay: stat.delay }}
          >
            <Card className={`overflow-hidden border-0 shadow-md hover:shadow-lg transition-all duration-300 bg-gradient-to-br ${stat.color} hover:translate-y-[-4px]`}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className={`h-10 w-10 rounded-full ${stat.iconBg} flex items-center justify-center mb-4`}>
                      {stat.icon}
                    </div>
                    <p className="text-sm font-medium">{stat.title}</p>
                    {loading ? (
                      <div className="relative overflow-hidden">
                        <Skeleton className="h-9 w-16 mt-1" />
                        <div className="absolute inset-0 animate-shimmer"></div>
                      </div>
                    ) : (
                      <p className="text-3xl font-bold mt-2">{stat.value}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
                  </div>
                  <div className="hidden md:block opacity-10">
                    <div className="text-8xl font-bold">{loading ? "-" : stat.value}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        ))}
      </div>

      {/* Recent activity & Quick actions */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="col-span-2 border border-gray-200 dark:border-gray-800 shadow-md hover:shadow-lg transition-all duration-300 animate-slideInRight">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle>Recent Activity</CardTitle>
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                View all
              </Button>
            </div>
            <CardDescription>Your latest project updates and activities</CardDescription>
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
                <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 mb-4">
                  <Clock className="h-10 w-10 text-muted-foreground opacity-50" />
                </div>
                <p>No recent activity to display</p>
                <p className="text-sm mt-1">Create a new project or task to get started</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border border-gray-200 dark:border-gray-800 shadow-md hover:shadow-lg transition-all duration-300 animate-slideInRight" style={{ animationDelay: "0.1s" }}>
          <CardHeader className="pb-2">
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Shortcuts to common tasks</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {[
              { text: "Create New Task", href: "/tasks/new", icon: <ListTodo className="h-4 w-4 mr-2" /> },
              { text: "View Workspaces", href: "/workspaces", icon: <BarChart3 className="h-4 w-4 mr-2" /> },
              { text: "Manage Projects", href: "/projects", icon: <Layers className="h-4 w-4 mr-2" /> },
              { text: "Roadmap Planning", href: "/roadmap", icon: <Map className="h-4 w-4 mr-2" /> },
              { text: "Invite Team Member", href: "/team", icon: <Zap className="h-4 w-4 mr-2" /> }
            ].map((action, index) => (
              <Link href={action.href} key={index}>
                <Button 
                  variant="outline" 
                  className="w-full justify-start hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-200 group" 
                >
                  {action.icon}
                  {action.text}
                  <ArrowRight className="ml-auto h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                </Button>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Roadmap Planning */}
      <div className="mt-10 animate-fadeIn" style={{ animationDelay: "0.4s" }}>
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Roadmap Planning</h2>
            <p className="text-muted-foreground">Visualize your product roadmap, set milestones, and prioritize features</p>
          </div>
          <Link href="/roadmap">
            <Button variant="outline" className="group">
              View All
              <ArrowRight className="ml-2 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
            </Button>
          </Link>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              title: "Visual Roadmap",
              desc: "Create a visual timeline of your product development with key milestones",
              icon: <Map className="h-6 w-6 text-blue-600 dark:text-blue-400" />,
              action: "Create a Roadmap",
              href: "/roadmap",
              color: "from-blue-50 to-white dark:from-blue-950/20 dark:to-gray-950",
              border: "border-blue-100 dark:border-blue-900",
              iconBg: "bg-blue-100 dark:bg-blue-900/30",
              actionColor: "text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
            },
            {
              title: "Feature Prioritization",
              desc: "Prioritize features based on business value, user impact, and resources",
              icon: <ArrowUpRight className="h-6 w-6 text-green-600 dark:text-green-400" />,
              action: "Manage Features",
              href: "/roadmap",
              color: "from-green-50 to-white dark:from-green-950/20 dark:to-gray-950",
              border: "border-green-100 dark:border-green-900",
              iconBg: "bg-green-100 dark:bg-green-900/30",
              actionColor: "text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300"
            },
            {
              title: "Milestone Management",
              desc: "Define achievable milestones with clear deliverables and track progress",
              icon: <Milestone className="h-6 w-6 text-purple-600 dark:text-purple-400" />,
              action: "Create Milestones",
              href: "/roadmap",
              color: "from-purple-50 to-white dark:from-purple-950/20 dark:to-gray-950",
              border: "border-purple-100 dark:border-purple-900",
              iconBg: "bg-purple-100 dark:bg-purple-900/30",
              actionColor: "text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300"
            }
          ].map((card, index) => (
            <Card 
              key={index} 
              className={`bg-gradient-to-br ${card.color} ${card.border} hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 animate-scaleIn`}
              style={{ animationDelay: `${0.5 + index * 0.1}s` }}
            >
              <CardContent className="p-6">
                <div className={`h-12 w-12 rounded-full ${card.iconBg} flex items-center justify-center mb-4 animate-pulse-soft`}>
                  {card.icon}
                </div>
                <h3 className="text-lg font-medium mb-2">{card.title}</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {card.desc}
                </p>
                <Link href={card.href}>
                  <Button variant="ghost" className={`pl-0 ${card.actionColor} group`}>
                    {card.action}
                    <ArrowRight className="ml-2 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
} 