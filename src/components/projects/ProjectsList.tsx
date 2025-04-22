"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PlusCircle, Calendar, Users, Clock, Loader2 } from "lucide-react";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue, 
} from "@/components/ui/select";
import CreateProjectModal from "./CreateProjectModal";

// Define project type
interface Project {
  id: string;
  name: string;
  description: string;
  status: string;
  workspaceName: string;
  workspaceId: string;
  taskCount: number;
  memberCount: number;
  createdAt: Date;
}

export default function ProjectsList() {
  const router = useRouter();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [workspaceFilter, setWorkspaceFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [availableWorkspaces, setAvailableWorkspaces] = useState<{id: string, name: string}[]>([]);
  const [loadingWorkspaces, setLoadingWorkspaces] = useState(true);

  // Predefined status options with better names and colors
  const statusOptions = [
    { value: 'all', label: 'All Statuses' },
    { value: 'active', label: 'Active', color: 'default' },
    { value: 'completed', label: 'Completed', color: 'secondary' },
    { value: 'on-hold', label: 'On Hold', color: 'destructive' },
    { value: 'planning', label: 'Planning', color: 'outline' },
    { value: 'cancelled', label: 'Cancelled', color: 'outline' }
  ];

  // Fetch workspaces separately
  useEffect(() => {
    const fetchWorkspaces = async () => {
      try {
        setLoadingWorkspaces(true);
        const response = await fetch('/api/workspaces');
        
        if (!response.ok) {
          throw new Error("Failed to fetch workspaces");
        }
        
        const data = await response.json();
        console.log("Fetched workspaces from API:", data);
        
        // Format workspaces for dropdown
        const formattedWorkspaces = data.map((workspace: any) => ({
          id: workspace.id,
          name: workspace.name
        }));
        
        setAvailableWorkspaces(formattedWorkspaces);
      } catch (err) {
        console.error("Error fetching workspaces:", err);
      } finally {
        setLoadingWorkspaces(false);
      }
    };

    fetchWorkspaces();
  }, []);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch('/api/projects');
        
        if (!response.ok) {
          throw new Error("Failed to fetch projects");
        }
        
        const data = await response.json();
        
        // Convert dates from strings to Date objects
        const formattedProjects = data.map((project: any) => ({
          ...project,
          createdAt: new Date(project.createdAt),
        }));
        
        setProjects(formattedProjects);
      } catch (err) {
        console.error("Error fetching projects:", err);
        setError(err instanceof Error ? err.message : "An unknown error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, []);

  const handleCreateProject = async (project: any) => {
    try {
      setLoading(true);
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(project),
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create project");
      }
      
      const newProject = await response.json();
      newProject.createdAt = new Date(newProject.createdAt);
      
      setProjects([...projects, newProject]);
      setIsCreateModalOpen(false);
      
      // Navigate to the new project
      router.push(`/projects/${newProject.id}`);
    } catch (err) {
      console.error("Error creating project:", err);
      setError(err instanceof Error ? err.message : "An unknown error occurred");
    } finally {
      setLoading(false);
    }
  };

  // Filter projects
  const filteredProjects = projects.filter(project => {
    const matchesWorkspace = workspaceFilter === "all" || project.workspaceId === workspaceFilter;
    const matchesStatus = statusFilter === "all" || project.status === statusFilter;
    return matchesWorkspace && matchesStatus;
  });

  // Get unique workspaces for filter
  const workspaces = Array.from(
    new Map(projects.map(project => [
      project.workspaceId, 
      { id: project.workspaceId, name: project.workspaceName }
    ])).values()
  );

  // Debug log for workspaces
  console.log('Available workspaces:', workspaces);

  // Get status types for filter
  const statusTypes = Array.from(
    new Set(projects.map(project => project.status))
  );

  if (loading && projects.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading projects...</span>
      </div>
    );
  }

  if (error && projects.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-red-500 font-bold mb-4">Error: {error}</div>
        <div className="bg-gray-100 p-4 rounded text-left overflow-auto max-h-96 text-sm">
          <p className="mb-2">Something went wrong while fetching your projects.</p>
          <p className="mb-2">Please try again or contact support if the issue persists.</p>
        </div>
        <Button 
          onClick={() => window.location.reload()}
          className="mt-4"
        >
          Refresh Page
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="p-4 bg-card rounded-lg shadow-sm border">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex flex-col sm:flex-row gap-4 sm:items-center">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Workspace</label>
              <Select
                value={workspaceFilter}
                onValueChange={setWorkspaceFilter}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Select workspace" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Workspaces</SelectItem>
                  {loadingWorkspaces ? (
                    <SelectItem value="" disabled>
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        <span>Loading...</span>
                      </div>
                    </SelectItem>
                  ) : availableWorkspaces.length > 0 ? (
                    availableWorkspaces.map((workspace) => (
                      <SelectItem key={workspace.id} value={workspace.id}>
                        {workspace.name}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="" disabled>No workspaces found</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Status</label>
              <Select
                value={statusFilter}
                onValueChange={setStatusFilter}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map(status => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.value !== 'all' ? (
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full bg-${status.color}`}></div>
                          {status.label}
                        </div>
                      ) : status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="mt-2 sm:mt-6">
            <Button
              onClick={() => setIsCreateModalOpen(true)}
              className="w-full sm:w-auto"
            >
              <PlusCircle className="h-4 w-4 mr-2" />
              New Project
            </Button>
          </div>
        </div>
      </div>

      {filteredProjects.length === 0 ? (
        <Card className="p-8 text-center shadow-sm">
          <p className="text-gray-500 mb-6">{
            projects.length > 0 
              ? 'No projects match your filters.' 
              : 'You don\'t have any projects yet.'
          }</p>
          {projects.length === 0 && (
            <Button
              onClick={() => setIsCreateModalOpen(true)}
              size="lg"
              className="gap-2"
            >
              <PlusCircle className="h-4 w-4" />
              Create Your First Project
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredProjects.map((project) => (
            <Link key={project.id} href={`/projects/${project.id}`}>
              <Card className="h-full hover:shadow-md transition-shadow cursor-pointer overflow-hidden border-t-4"
                    style={{
                      borderTopColor: project.status === 'completed' ? 'var(--secondary)' : 
                                       project.status === 'active' ? 'var(--primary)' : 
                                       project.status === 'on-hold' ? 'var(--destructive)' :
                                       'var(--border)'
                    }}
              >
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <CardTitle className="line-clamp-1">{project.name}</CardTitle>
                    <Badge 
                      variant={
                        project.status === 'completed' ? 'secondary' :
                        project.status === 'active' ? 'default' :
                        project.status === 'on-hold' ? 'destructive' : 'outline'
                      }
                    >
                      {project.status.replace(/-/g, ' ')}
                    </Badge>
                  </div>
                  <CardDescription className="line-clamp-2 mt-1">{project.description || 'No description'}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-sm font-medium">
                    {project.workspaceName}
                  </div>
                </CardContent>
                <CardFooter className="text-xs text-muted-foreground flex justify-between border-t pt-4">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    <span>{new Date(project.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      <span>{project.memberCount || 0}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span>{project.taskCount || 0} tasks</span>
                    </div>
                  </div>
                </CardFooter>
              </Card>
            </Link>
          ))}
        </div>
      )}
      
      <CreateProjectModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreate={handleCreateProject}
      />
    </div>
  );
} 