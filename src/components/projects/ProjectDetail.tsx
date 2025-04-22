"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, AlertCircle, Calendar, Users, Clock } from "lucide-react";
import TasksList from "@/components/tasks/TasksList";
import { SprintsList } from "@/components/sprints/SprintsList";

interface ProjectDetailProps {
  projectId: string;
}

export default function ProjectDetail({ projectId }: ProjectDetailProps) {
  const router = useRouter();
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const fetchProject = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch(`/api/projects/${projectId}`);
        
        if (!response.ok) {
          throw new Error("Failed to fetch project details");
        }
        
        const data = await response.json();
        setProject(data);
      } catch (err) {
        console.error("Error fetching project:", err);
        setError(err instanceof Error ? err.message : "An unknown error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchProject();
  }, [projectId]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading project details...</span>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="text-center py-12">
        <div className="text-red-500 font-bold mb-4">
          Error: {error || "Project not found"}
        </div>
        <div className="bg-gray-100 p-4 rounded text-left overflow-auto max-h-96 text-sm">
          <p className="mb-2">Something went wrong while fetching project details.</p>
          <p className="mb-2">Please try again or contact support if the issue persists.</p>
        </div>
        <Button 
          onClick={() => router.push('/projects')}
          className="mt-4"
        >
          Back to Projects
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{project.name}</h1>
            <p className="text-muted-foreground mt-2">
              {project.description || "No description provided"}
            </p>
          </div>
          
          <div className="space-x-2">
            <Button
              onClick={() => router.push(`/projects/${projectId}/tasks/new`)}
              variant="default"
            >
              Add Task
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap gap-4 mt-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            <span>Created on {new Date(project.createdAt).toLocaleDateString()}</span>
          </div>
          <div className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            <span>{project.memberCount || 0} Members</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            <span>{project.taskCount || 0} Tasks</span>
          </div>
        </div>
      </div>
      
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="sprints">Sprints</TabsTrigger>
          <TabsTrigger value="bugs">Bugs</TabsTrigger>
          <TabsTrigger value="files">Files</TabsTrigger>
          <TabsTrigger value="members">Members</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-4 py-4">
          <Card>
            <CardHeader>
              <CardTitle>Project Overview</CardTitle>
              <CardDescription>Basic information about your project</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Project Name</p>
                  <p>{project.name}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Status</p>
                  <p className="capitalize">{project.status.replace(/-/g, ' ')}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Workspace</p>
                  <p>{project.workspaceName}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Created</p>
                  <p>{new Date(project.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
              
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Description</p>
                <p>{project.description || "No description"}</p>
              </div>
              
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Progress</p>
                <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                  <div 
                    className="bg-primary h-full"
                    style={{ width: `${project.progress || 0}%` }}
                  ></div>
                </div>
                <p className="text-xs text-right text-muted-foreground">
                  {project.progress || 0}% Complete
                </p>
              </div>
            </CardContent>
          </Card>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Recent Tasks</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-center text-muted-foreground py-6">
                  No tasks yet. Create your first task to get started.
                </p>
                <div className="text-center mt-4">
                  <Button 
                    variant="outline" 
                    onClick={() => router.push(`/projects/${projectId}/tasks`)}
                  >
                    View Task Board
                  </Button>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Team Members</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-center text-muted-foreground py-6">
                  No team members assigned to this project yet.
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="tasks">
          <div className="py-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Tasks</h2>
              <Button 
                variant="default" 
                onClick={() => router.push(`/projects/${projectId}/tasks`)}
              >
                View Task Board
              </Button>
            </div>
            <TasksList projectId={projectId} />
          </div>
        </TabsContent>
        
        <TabsContent value="sprints">
          <div className="py-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Sprints</h2>
            </div>
            <SprintsList projectId={projectId} />
          </div>
        </TabsContent>
        
        <TabsContent value="bugs">
          <div className="py-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Bug Tracking</h2>
              <Button 
                variant="default" 
                onClick={() => router.push(`/projects/${projectId}/bugs`)}
              >
                View Bug Tracker
              </Button>
            </div>
            <Card>
              <CardHeader>
                <CardTitle>Bug Management</CardTitle>
                <CardDescription>Track and manage bugs for this project</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="mb-4">The bug tracking system allows you to:</p>
                <ul className="list-disc pl-5 space-y-2">
                  <li>Report and track bugs with detailed information</li>
                  <li>Assign bugs to team members</li>
                  <li>Categorize by priority and severity</li>
                  <li>Track bug lifecycle from open to closed</li>
                  <li>View bug statistics and metrics</li>
                </ul>
                <div className="mt-6">
                  <Button onClick={() => router.push(`/projects/${projectId}/bugs`)}>
                    Go to Bug Tracker
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="files">
          <div className="py-6 text-center">
            <p className="text-muted-foreground">File management will be implemented in the next phase.</p>
          </div>
        </TabsContent>
        
        <TabsContent value="members">
          <div className="py-6 text-center">
            <p className="text-muted-foreground">Member management will be implemented in the next phase.</p>
          </div>
        </TabsContent>
        
        <TabsContent value="settings">
          <div className="py-6 text-center">
            <p className="text-muted-foreground">Project settings will be implemented in the next phase.</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
} 