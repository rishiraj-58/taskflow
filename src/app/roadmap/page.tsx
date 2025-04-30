"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Loader2, 
  Map, 
  FolderOpen, 
  Search, 
  PlusCircle, 
  Calendar, 
  Users, 
  BarChart3,
  ArrowRight
} from "lucide-react";

interface Project {
  id: string;
  name: string;
  description: string;
  roadmapCount?: number;
  workspaceName?: string;
}

export default function RoadmapPage() {
  const router = useRouter();
  const { user } = useUser();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch("/api/projects");
        
        if (!response.ok) {
          throw new Error("Failed to fetch projects");
        }
        
        const data = await response.json();

        // Add roadmapCount to each project (in a real app, you would fetch this from the API)
        const projectsWithRoadmapCount = data.map((project: Project) => ({
          ...project,
          roadmapCount: Math.floor(Math.random() * 3) // Placeholder for demo
        }));
        
        setProjects(projectsWithRoadmapCount);
        setFilteredProjects(projectsWithRoadmapCount);
      } catch (err) {
        console.error("Error fetching projects:", err);
        setError(err instanceof Error ? err.message : "An unknown error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, []);

  useEffect(() => {
    // Filter projects based on search query and active tab
    const filtered = projects.filter((project) => {
      const matchesSearch = project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (project.description && project.description.toLowerCase().includes(searchQuery.toLowerCase()));
      
      if (activeTab === "all") return matchesSearch;
      if (activeTab === "with-roadmaps") return matchesSearch && (project.roadmapCount || 0) > 0;
      if (activeTab === "without-roadmaps") return matchesSearch && (project.roadmapCount || 0) === 0;
      
      return matchesSearch;
    });
    
    setFilteredProjects(filtered);
  }, [projects, searchQuery, activeTab]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading projects...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-500 font-bold mb-4">
          Error: {error}
        </div>
        <Button onClick={() => window.location.reload()} className="mt-4">
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Roadmap Planning</h1>
          <p className="text-muted-foreground">
            Plan your product roadmap, set milestones, and prioritize features
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <Tabs defaultValue="all" className="w-full sm:w-auto" onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="all">All Projects</TabsTrigger>
            <TabsTrigger value="with-roadmaps">With Roadmaps</TabsTrigger>
            <TabsTrigger value="without-roadmaps">Without Roadmaps</TabsTrigger>
          </TabsList>
        </Tabs>
        
        <div className="relative w-full sm:w-auto max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search projects..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProjects.map((project) => (
          <Card key={project.id} className="overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-xl">{project.name}</CardTitle>
                  <CardDescription className="line-clamp-2 mt-1">
                    {project.description || "No description provided"}
                  </CardDescription>
                </div>
                <div className="flex items-center justify-center h-8 w-8 rounded-full bg-primary/10">
                  <Map className="h-4 w-4 text-primary" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center text-sm gap-4 mb-4">
                <div className="flex items-center">
                  <Calendar className="h-4 w-4 mr-1 text-muted-foreground" />
                  <span>{project.roadmapCount || 0} Roadmaps</span>
                </div>
                <div className="flex items-center">
                  <BarChart3 className="h-4 w-4 mr-1 text-muted-foreground" />
                  <span>{Math.floor(Math.random() * 10)} Milestones</span>
                </div>
              </div>
              
              <div className="flex flex-col gap-2">
                {project.roadmapCount ? (
                  <Button 
                    variant="default" 
                    className="w-full"
                    onClick={() => router.push(`/projects/${project.id}/roadmaps`)}
                  >
                    View Roadmaps
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                ) : (
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => router.push(`/projects/${project.id}/roadmaps/new`)}
                  >
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Create Roadmap
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}

        {filteredProjects.length === 0 && (
          <div className="col-span-full text-center py-12">
            <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
              <Map className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium">No projects found</h3>
            <p className="text-muted-foreground mt-1 mb-4">
              {searchQuery 
                ? "Try adjusting your search query" 
                : "Create your first project to get started with roadmap planning"}
            </p>
            {!searchQuery && (
              <Button onClick={() => router.push("/projects/new")}>
                <PlusCircle className="h-4 w-4 mr-2" />
                Create Project
              </Button>
            )}
          </div>
        )}
      </div>

      <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
        <CardHeader>
          <CardTitle>Roadmap Planning Guide</CardTitle>
          <CardDescription>Learn how to effectively plan your product roadmap</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <div className="font-medium flex items-center">
                <span className="flex h-6 w-6 bg-blue-600 text-white rounded-full items-center justify-center mr-2">1</span>
                Create a Roadmap
              </div>
              <p className="text-sm text-muted-foreground">
                Define your product vision and set the high-level direction for your team
              </p>
            </div>
            <div className="space-y-2">
              <div className="font-medium flex items-center">
                <span className="flex h-6 w-6 bg-blue-600 text-white rounded-full items-center justify-center mr-2">2</span>
                Add Milestones
              </div>
              <p className="text-sm text-muted-foreground">
                Break down your roadmap into achievable milestones with clear timelines
              </p>
            </div>
            <div className="space-y-2">
              <div className="font-medium flex items-center">
                <span className="flex h-6 w-6 bg-blue-600 text-white rounded-full items-center justify-center mr-2">3</span>
                Prioritize Features
              </div>
              <p className="text-sm text-muted-foreground">
                Add features to milestones and prioritize them based on business value
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 