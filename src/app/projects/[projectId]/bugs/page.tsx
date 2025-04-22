"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { BugList } from "@/components/bugs/BugList";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CreateBugModal from "@/components/bugs/CreateBugModal";
import BugDashboard from "@/components/bugs/BugDashboard";
import type { Bug } from "@/lib/types";

export default function BugsPage({ params }: { params: { projectId: string } }) {
  const router = useRouter();
  const { toast } = useToast();
  const [bugs, setBugs] = useState<Bug[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [projectName, setProjectName] = useState("Project");
  const [openModal, setOpenModal] = useState(false);
  const [projectMembers, setProjectMembers] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState("all");

  // Fetch bugs and project info when the page loads
  useEffect(() => {
    const fetchBugs = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/projects/${params.projectId}/bugs`);
        
        if (!response.ok) {
          throw new Error("Failed to load bugs");
        }
        
        const data = await response.json();
        setBugs(data);
      } catch (err) {
        console.error("Error fetching bugs:", err);
        setError("Could not load bugs. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    const fetchProject = async () => {
      try {
        const response = await fetch(`/api/projects/${params.projectId}`);
        
        if (!response.ok) {
          throw new Error("Failed to load project");
        }
        
        const project = await response.json();
        setProjectName(project.name);
      } catch (err) {
        console.error("Error fetching project:", err);
      }
    };

    const fetchProjectMembers = async () => {
      try {
        const response = await fetch(`/api/projects/${params.projectId}/members`);
        
        if (!response.ok) {
          throw new Error("Failed to load project members");
        }
        
        const data = await response.json();
        setProjectMembers(data);
      } catch (err) {
        console.error("Error fetching project members:", err);
      }
    };

    fetchBugs();
    fetchProject();
    fetchProjectMembers();
  }, [params.projectId]);

  const handleCreateBug = async (bugData: any) => {
    try {
      const response = await fetch(`/api/projects/${params.projectId}/bugs`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(bugData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create bug");
      }

      const newBug = await response.json();
      setBugs((prevBugs) => [newBug, ...prevBugs]);
      setOpenModal(false);
      
      toast({
        title: "Bug created",
        description: "Your bug has been created successfully.",
      });
    } catch (error) {
      console.error("Error creating bug:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create bug",
        variant: "destructive",
      });
    }
  };

  const filteredBugs = () => {
    switch (activeTab) {
      case "open":
        return bugs.filter(bug => bug.status === "OPEN");
      case "in-progress":
        return bugs.filter(bug => bug.status === "IN_PROGRESS");
      case "fixed":
        return bugs.filter(bug => bug.status === "FIXED" || bug.status === "VERIFIED");
      case "closed":
        return bugs.filter(bug => bug.status === "CLOSED");
      case "critical":
        return bugs.filter(bug => 
          bug.priority === "CRITICAL" || bug.severity === "CRITICAL");
      default:
        return bugs;
    }
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{projectName} Bugs</h1>
          <p className="text-muted-foreground">
            Track and manage bugs for your project
          </p>
        </div>
        
        <Button onClick={() => setOpenModal(true)} className="gap-1">
          <Plus className="h-4 w-4" />
          Report Bug
        </Button>
      </div>

      <Tabs defaultValue="all" className="w-full mb-6" onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="all">All Bugs</TabsTrigger>
          <TabsTrigger value="open">Open</TabsTrigger>
          <TabsTrigger value="in-progress">In Progress</TabsTrigger>
          <TabsTrigger value="fixed">Fixed</TabsTrigger>
          <TabsTrigger value="closed">Closed</TabsTrigger>
          <TabsTrigger value="critical">Critical</TabsTrigger>
        </TabsList>
        
        <TabsContent value="all" className="pt-2">
          <BugDashboard bugs={bugs} />
          <BugList 
            bugs={filteredBugs()} 
            loading={loading} 
            error={error} 
            projectId={params.projectId}
            onBugUpdated={(updatedBug) => {
              setBugs(prevBugs => 
                prevBugs.map(bug => bug.id === updatedBug.id ? updatedBug : bug)
              );
            }}
            onBugDeleted={(bugId) => {
              setBugs(prevBugs => prevBugs.filter(bug => bug.id !== bugId));
            }}
          />
        </TabsContent>
        
        <TabsContent value="open" className="pt-2">
          <BugList 
            bugs={filteredBugs()} 
            loading={loading} 
            error={error}
            projectId={params.projectId}
            onBugUpdated={(updatedBug) => {
              setBugs(prevBugs => 
                prevBugs.map(bug => bug.id === updatedBug.id ? updatedBug : bug)
              );
            }}
            onBugDeleted={(bugId) => {
              setBugs(prevBugs => prevBugs.filter(bug => bug.id !== bugId));
            }}
          />
        </TabsContent>
        
        <TabsContent value="in-progress" className="pt-2">
          <BugList 
            bugs={filteredBugs()} 
            loading={loading} 
            error={error}
            projectId={params.projectId}
            onBugUpdated={(updatedBug) => {
              setBugs(prevBugs => 
                prevBugs.map(bug => bug.id === updatedBug.id ? updatedBug : bug)
              );
            }}
            onBugDeleted={(bugId) => {
              setBugs(prevBugs => prevBugs.filter(bug => bug.id !== bugId));
            }}
          />
        </TabsContent>
        
        <TabsContent value="fixed" className="pt-2">
          <BugList 
            bugs={filteredBugs()} 
            loading={loading} 
            error={error}
            projectId={params.projectId}
            onBugUpdated={(updatedBug) => {
              setBugs(prevBugs => 
                prevBugs.map(bug => bug.id === updatedBug.id ? updatedBug : bug)
              );
            }}
            onBugDeleted={(bugId) => {
              setBugs(prevBugs => prevBugs.filter(bug => bug.id !== bugId));
            }}
          />
        </TabsContent>
        
        <TabsContent value="closed" className="pt-2">
          <BugList 
            bugs={filteredBugs()} 
            loading={loading} 
            error={error}
            projectId={params.projectId}
            onBugUpdated={(updatedBug) => {
              setBugs(prevBugs => 
                prevBugs.map(bug => bug.id === updatedBug.id ? updatedBug : bug)
              );
            }}
            onBugDeleted={(bugId) => {
              setBugs(prevBugs => prevBugs.filter(bug => bug.id !== bugId));
            }}
          />
        </TabsContent>
        
        <TabsContent value="critical" className="pt-2">
          <BugList 
            bugs={filteredBugs()} 
            loading={loading} 
            error={error}
            projectId={params.projectId}
            onBugUpdated={(updatedBug) => {
              setBugs(prevBugs => 
                prevBugs.map(bug => bug.id === updatedBug.id ? updatedBug : bug)
              );
            }}
            onBugDeleted={(bugId) => {
              setBugs(prevBugs => prevBugs.filter(bug => bug.id !== bugId));
            }}
          />
        </TabsContent>
      </Tabs>

      <CreateBugModal
        isOpen={openModal}
        onClose={() => setOpenModal(false)}
        onSubmit={handleCreateBug}
        projectId={params.projectId}
        projectMembers={projectMembers}
      />
    </div>
  );
} 