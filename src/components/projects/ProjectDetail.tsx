"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, AlertCircle, Calendar, Users, Clock, Upload, Download, Trash2, FileX, File, FileSpreadsheet, FileCode, Archive, HelpCircle, Pencil, UserPlus, UserMinus, MoreHorizontal, MessageSquare, MailOpen, X, Eye, Crown, User, UserX, Map, ArrowUpRight, Milestone } from "lucide-react";
import TasksList from "@/components/tasks/TasksList";
import { SprintsList } from "@/components/sprints/SprintsList";
import { FileIcon, ImageIcon } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import UploadDocumentModal from "@/components/documents/UploadDocumentModal";
import { useToast } from "@/components/ui/use-toast";
import DocumentList from "@/components/documents/DocumentList";
import { Separator } from "@/components/ui/separator";

interface ProjectDetailProps {
  projectId: string;
}

export default function ProjectDetail({ projectId }: ProjectDetailProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recentBugs, setRecentBugs] = useState<any[]>([]);
  const [bugStats, setBugStats] = useState<{
    total: number;
    open: number;
    inProgress: number;
    resolved: number;
  }>({
    total: 0,
    open: 0,
    inProgress: 0,
    resolved: 0
  });
  const [projectFiles, setProjectFiles] = useState<any[]>([]);
  const [fileStats, setFileStats] = useState<{
    documents: number;
    images: number;
    spreadsheets: number;
    code: number;
    archives: number;
    other: number;
  }>({
    documents: 0,
    images: 0,
    spreadsheets: 0,
    code: 0,
    archives: 0,
    other: 0
  });
  const [fileActivity, setFileActivity] = useState<any[]>([]);
  const [projectMembers, setProjectMembers] = useState<any[]>([]);
  const [pendingInvitations, setPendingInvitations] = useState<any[]>([]);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [documents, setDocuments] = useState<any[]>([]);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  
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

  useEffect(() => {
    const fetchBugs = async () => {
      try {
        const response = await fetch(`/api/projects/${projectId}/bugs`);
        
        if (!response.ok) {
          return;
        }
        
        const bugs = await response.json();
        
        // Set recent bugs (5 most recent)
        setRecentBugs(bugs.slice(0, 5));
        
        // Calculate bug statistics
        const total = bugs.length;
        const open = bugs.filter((bug: any) => bug.status === "OPEN").length;
        const inProgress = bugs.filter((bug: any) => bug.status === "IN_PROGRESS").length;
        const resolved = bugs.filter((bug: any) => 
          ["FIXED", "VERIFIED", "CLOSED"].includes(bug.status)
        ).length;
        
        setBugStats({ total, open, inProgress, resolved });
      } catch (error) {
        console.error("Error fetching bugs:", error);
      }
    };

    if (projectId) {
      fetchBugs();
    }
  }, [projectId]);

  useEffect(() => {
    const fetchFiles = async () => {
      try {
        const response = await fetch(`/api/projects/${projectId}/files`);
        
        if (!response.ok) {
          return;
        }
        
        const files = await response.json();
        setProjectFiles(files);
      } catch (error) {
        console.error("Error fetching files:", error);
      }
    };

    if (projectId) {
      fetchFiles();
    }
  }, [projectId]);

  useEffect(() => {
    const fetchFileActivity = async () => {
      try {
        const response = await fetch(`/api/projects/${projectId}/file-activity`);
        
        if (!response.ok) {
          return;
        }
        
        const activity = await response.json();
        setFileActivity(activity);
      } catch (error) {
        console.error("Error fetching file activity:", error);
      }
    };

    if (projectId) {
      fetchFileActivity();
    }
  }, [projectId]);

  useEffect(() => {
    const fetchMembers = async () => {
      try {
        const response = await fetch(`/api/projects/${projectId}/members`);
        
        if (!response.ok) {
          return;
        }
        
        const members = await response.json();
        setProjectMembers(members);
      } catch (error) {
        console.error("Error fetching project members:", error);
      }
    };

    if (projectId) {
      fetchMembers();
    }
  }, [projectId]);

  useEffect(() => {
    const fetchInvitations = async () => {
      try {
        const response = await fetch(`/api/projects/${projectId}/invitations`);
        
        if (!response.ok) {
          return;
        }
        
        const invitations = await response.json();
        setPendingInvitations(invitations);
      } catch (error) {
        console.error("Error fetching pending invitations:", error);
      }
    };

    if (projectId) {
      fetchInvitations();
    }
  }, [projectId]);

  const handleUploadComplete = () => {
    setIsUploadModalOpen(false);
    toast({
      title: "File uploaded",
      description: "Your file has been uploaded successfully",
    });
    // Refresh file list to show new uploads
    fetchDocuments();
  };

  const fetchDocuments = async () => {
    setDocumentsLoading(true);
    try {
      console.log("Fetching documents for project:", projectId);
      const cacheBuster = `nocache=${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const response = await fetch(`/api/projects/${projectId}/documents?${cacheBuster}`, {
        cache: 'no-store',
        headers: {
          'Pragma': 'no-cache',
          'Cache-Control': 'no-cache'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch documents: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log("Documents fetched successfully:", data);
      
      // Extract documents from the response
      if (data.documents) {
        setDocuments(data.documents);
      } else {
        setDocuments(data);
      }
    } catch (err) {
      console.error("Error fetching documents:", err);
      toast({
        title: "Error",
        description: "There was a problem loading the documents",
        variant: "destructive",
      });
    } finally {
      setDocumentsLoading(false);
    }
  };

  useEffect(() => {
    if (projectId) {
      fetchDocuments();
    }
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
          <TabsTrigger value="roadmap">Roadmap</TabsTrigger>
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
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle>Recent Bug Reports</CardTitle>
                  <CardDescription>The latest bugs reported in this project</CardDescription>
                </CardHeader>
                <CardContent>
                  {recentBugs && recentBugs.length > 0 ? (
                    <div className="space-y-4">
                      {recentBugs.map((bug) => (
                        <div key={bug.id} className="flex items-start gap-2 pb-4 border-b last:border-0">
                          <div className="rounded-full w-2 h-2 mt-2 flex-shrink-0" 
                            style={{ 
                              backgroundColor: bug.status === "OPEN" 
                                ? "rgb(239, 68, 68)" 
                                : bug.status === "IN_PROGRESS" 
                                  ? "rgb(59, 130, 246)" 
                                  : "rgb(34, 197, 94)" 
                            }} 
                          />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate text-sm">{bug.title}</div>
                            <div className="flex gap-2 text-xs text-muted-foreground mt-1">
                              <span>{bug.status.replace("_", " ")}</span>
                              <span>•</span>
                              <span>Priority: {bug.priority}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-8 text-center text-muted-foreground">
                      <p>No bugs reported yet</p>
                    </div>
                  )}
                </CardContent>
                <div className="p-4 pt-0">
                  <Button 
                    variant="ghost" 
                    className="w-full"
                    onClick={() => router.push(`/projects/${projectId}/bugs`)}
                  >
                    View all bugs
                  </Button>
                </div>
              </Card>
              
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle>Bug Tracker Features</CardTitle>
                  <CardDescription>Track and manage bugs for this project</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="list-disc pl-5 space-y-2">
                    <li>Report and track bugs with detailed information</li>
                    <li>Assign bugs to team members</li>
                    <li>Categorize by priority and severity</li>
                    <li>Track bug lifecycle from open to closed</li>
                    <li>View bug statistics and metrics</li>
                  </ul>
                  <div className="mt-6">
                    <Button 
                      onClick={() => router.push(`/projects/${projectId}/bugs`)}
                      className="w-full"
                    >
                      Report New Bug
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>Bug Status Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="flex flex-col items-center p-4 bg-muted/50 rounded-lg">
                    <span className="text-3xl font-bold">{bugStats?.total || 0}</span>
                    <span className="text-sm text-muted-foreground">Total Bugs</span>
                  </div>
                  <div className="flex flex-col items-center p-4 bg-red-100 rounded-lg">
                    <span className="text-3xl font-bold text-red-600">{bugStats?.open || 0}</span>
                    <span className="text-sm text-red-600/80">Open Bugs</span>
                  </div>
                  <div className="flex flex-col items-center p-4 bg-blue-100 rounded-lg">
                    <span className="text-3xl font-bold text-blue-600">{bugStats?.inProgress || 0}</span>
                    <span className="text-sm text-blue-600/80">In Progress</span>
                  </div>
                  <div className="flex flex-col items-center p-4 bg-green-100 rounded-lg">
                    <span className="text-3xl font-bold text-green-600">{bugStats?.resolved || 0}</span>
                    <span className="text-sm text-green-600/80">Resolved</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="roadmap">
          <div className="py-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Product Roadmap</h2>
              <Button 
                variant="default" 
                onClick={() => router.push(`/projects/${projectId}/roadmaps`)}
              >
                View Roadmaps
              </Button>
            </div>
            
            <div className="grid grid-cols-1 gap-6">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle>Roadmap Planning</CardTitle>
                  <CardDescription>Plan your product's future with milestones and feature prioritization</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-start gap-4">
                      <div className="bg-blue-100 dark:bg-blue-900/20 p-3 rounded-lg">
                        <Map className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <h3 className="font-medium">Visual Roadmap Timeline</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          Create a visual timeline of your product development, including milestones and key features
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-4">
                      <div className="bg-green-100 dark:bg-green-900/20 p-3 rounded-lg">
                        <ArrowUpRight className="h-6 w-6 text-green-600 dark:text-green-400" />
                      </div>
                      <div>
                        <h3 className="font-medium">Feature Prioritization</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          Prioritize features based on business value, user impact, and resource requirements
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-4">
                      <div className="bg-purple-100 dark:bg-purple-900/20 p-3 rounded-lg">
                        <Milestone className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                      </div>
                      <div>
                        <h3 className="font-medium">Milestone Management</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          Define achievable milestones with clear deliverables and track progress towards goals
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-6">
                    <Button 
                      className="w-full"
                      onClick={() => router.push(`/projects/${projectId}/roadmaps`)}
                    >
                      Go to Roadmap Planning
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="files">
          <div className="py-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Files & Documents</h2>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={fetchDocuments}
                >
                  Refresh
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => router.push(`/projects/${projectId}/documents`)}
                >
                  Go to Documents
                </Button>
                <Button variant="default" onClick={() => setIsUploadModalOpen(true)}>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload File
                </Button>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <Card className="col-span-2">
                <CardHeader>
                  <CardTitle>Project Files</CardTitle>
                  <CardDescription>
                    {documents.length > 0 
                      ? `${documents.length} document${documents.length !== 1 ? 's' : ''} in this project` 
                      : 'No documents found'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {documentsLoading ? (
                    <div className="flex justify-center items-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      <span className="ml-2">Loading documents...</span>
                    </div>
                  ) : (
                    <>
                      {documents.length > 0 ? (
                        <DocumentList 
                          documents={documents}
                          onDocumentDeleted={fetchDocuments}
                          projectId={projectId}
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                          <div className="rounded-full bg-muted p-3 mb-4">
                            <FileX className="h-6 w-6 text-muted-foreground" />
                          </div>
                          <h3 className="text-lg font-medium mb-2">No files uploaded</h3>
                          <p className="text-muted-foreground mb-4 max-w-sm">
                            Upload project files and documents to share with your team
                          </p>
                          <Button variant="outline" onClick={() => setIsUploadModalOpen(true)}>
                            <Upload className="h-4 w-4 mr-2" />
                            Upload File
                          </Button>
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>File Categories</CardTitle>
                  <CardDescription>Organize your project files</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <File className="h-4 w-4 text-blue-500" />
                        <span className="text-sm">Documents</span>
                      </div>
                      <Badge variant="outline">{fileStats?.documents || 0}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <ImageIcon className="h-4 w-4 text-purple-500" />
                        <span className="text-sm">Images</span>
                      </div>
                      <Badge variant="outline">{fileStats?.images || 0}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileSpreadsheet className="h-4 w-4 text-green-500" />
                        <span className="text-sm">Spreadsheets</span>
                      </div>
                      <Badge variant="outline">{fileStats?.spreadsheets || 0}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileCode className="h-4 w-4 text-amber-500" />
                        <span className="text-sm">Code Files</span>
                      </div>
                      <Badge variant="outline">{fileStats?.code || 0}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Archive className="h-4 w-4 text-gray-500" />
                        <span className="text-sm">Archives</span>
                      </div>
                      <Badge variant="outline">{fileStats?.archives || 0}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <HelpCircle className="h-4 w-4 text-gray-400" />
                        <span className="text-sm">Other</span>
                      </div>
                      <Badge variant="outline">{fileStats?.other || 0}</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Latest file operations in this project</CardDescription>
              </CardHeader>
              <CardContent>
                {fileActivity && fileActivity.length > 0 ? (
                  <div className="space-y-4">
                    {fileActivity.map((activity: any) => (
                      <div key={activity.id} className="flex items-start gap-3">
                        <div className="rounded-full bg-muted w-8 h-8 flex items-center justify-center">
                          {activity.type === 'upload' && <Upload className="h-4 w-4" />}
                          {activity.type === 'download' && <Download className="h-4 w-4" />}
                          {activity.type === 'delete' && <Trash2 className="h-4 w-4" />}
                          {activity.type === 'edit' && <Pencil className="h-4 w-4" />}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm">
                            <span className="font-medium">{activity.user.name}</span> {activity.description}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(activity.createdAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-muted-foreground">
                    <p>No recent file activity</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="members">
          <div className="py-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Team Members</h2>
              <Button variant="default">
                <UserPlus className="h-4 w-4 mr-2" />
                Add Member
              </Button>
            </div>
            
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Project Members</CardTitle>
                <CardDescription>Manage the team members for this project</CardDescription>
              </CardHeader>
              <CardContent>
                {projectMembers && projectMembers.length > 0 ? (
                  <div className="divide-y">
                    {projectMembers.map((member: any) => (
                      <div key={member.id} className="py-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarImage src={member.imageUrl} alt={member.name} />
                            <AvatarFallback>
                              {member.name?.substring(0, 2).toUpperCase() || member.email.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{member.name || 'Unnamed User'}</p>
                            <p className="text-sm text-muted-foreground">{member.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge variant={member.role === 'ADMIN' ? 'default' : 'outline'}>
                            {member.role === 'ADMIN' ? 'Admin' : 'Member'}
                          </Badge>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuItem>
                                <Crown className="h-4 w-4 mr-2" />
                                Make Admin
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <MessageSquare className="h-4 w-4 mr-2" />
                                Send Message
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-red-500">
                                <UserMinus className="h-4 w-4 mr-2" />
                                Remove from Project
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 border rounded-md">
                    <UserX className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                    <h3 className="font-medium mb-1">No team members yet</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Add team members to your project to collaborate
                    </p>
                    <Button variant="outline">
                      <UserPlus className="h-4 w-4 mr-2" />
                      Add Team Member
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Pending Invitations</CardTitle>
                  <CardDescription>Team members you've invited to this project</CardDescription>
                </CardHeader>
                <CardContent>
                  {pendingInvitations && pendingInvitations.length > 0 ? (
                    <div className="space-y-4">
                      {pendingInvitations.map((invitation: any) => (
                        <div key={invitation.id} className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{invitation.email}</p>
                            <p className="text-xs text-muted-foreground">
                              Invited {new Date(invitation.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Button variant="ghost" size="sm">
                              <MailOpen className="h-4 w-4 mr-1" />
                              Resend
                            </Button>
                            <Button variant="ghost" size="sm" className="text-red-500">
                              <X className="h-4 w-4 mr-1" />
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 text-muted-foreground">
                      <p>No pending invitations</p>
                    </div>
                  )}
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Member Roles</CardTitle>
                  <CardDescription>Access levels for project members</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <Crown className="h-4 w-4 text-amber-500" /> 
                        <h3 className="font-medium">Project Admin</h3>
                      </div>
                      <p className="text-sm text-muted-foreground ml-6 mt-1">
                        Full access to all project settings, can add/remove team members
                      </p>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-blue-500" /> 
                        <h3 className="font-medium">Team Member</h3>
                      </div>
                      <p className="text-sm text-muted-foreground ml-6 mt-1">
                        Can edit tasks, create sprints, add comments, and upload files
                      </p>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <Eye className="h-4 w-4 text-green-500" /> 
                        <h3 className="font-medium">Viewer</h3>
                      </div>
                      <p className="text-sm text-muted-foreground ml-6 mt-1">
                        Can view project content but cannot make changes
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="settings">
          <div className="py-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Project Settings</h2>
            </div>
            
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>General Settings</CardTitle>
                  <CardDescription>Manage your project details and configuration</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium" htmlFor="projectName">Project Name</label>
                        <input 
                          type="text" 
                          id="projectName" 
                          defaultValue={project.name}
                          className="w-full px-3 py-2 border rounded-md mt-1"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium" htmlFor="projectStatus">Project Status</label>
                        <select
                          id="projectStatus"
                          defaultValue={project.status}
                          className="w-full px-3 py-2 border rounded-md mt-1"
                        >
                          <option value="PLANNING">Planning</option>
                          <option value="IN_PROGRESS">In Progress</option>
                          <option value="ON_HOLD">On Hold</option>
                          <option value="COMPLETED">Completed</option>
                          <option value="CANCELLED">Cancelled</option>
                        </select>
                      </div>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium" htmlFor="projectDescription">Project Description</label>
                      <textarea 
                        id="projectDescription" 
                        defaultValue={project.description}
                        rows={3}
                        className="w-full px-3 py-2 border rounded-md mt-1"
                      />
                    </div>
                    
                    <div className="flex justify-end">
                      <Button variant="outline" className="mr-2">Cancel</Button>
                      <Button>Save Changes</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Notifications</CardTitle>
                  <CardDescription>Configure how and when you receive project notifications</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Task Updates</p>
                        <p className="text-sm text-muted-foreground">Notifications for task creation, updates, and completion</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input type="checkbox" id="taskUpdatesEmail" className="rounded" defaultChecked />
                        <label htmlFor="taskUpdatesEmail" className="text-sm">Email</label>
                        <input type="checkbox" id="taskUpdatesApp" className="rounded ml-4" defaultChecked />
                        <label htmlFor="taskUpdatesApp" className="text-sm">In-app</label>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Member Changes</p>
                        <p className="text-sm text-muted-foreground">When members join or leave the project</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input type="checkbox" id="memberChangesEmail" className="rounded" defaultChecked />
                        <label htmlFor="memberChangesEmail" className="text-sm">Email</label>
                        <input type="checkbox" id="memberChangesApp" className="rounded ml-4" defaultChecked />
                        <label htmlFor="memberChangesApp" className="text-sm">In-app</label>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Sprint Events</p>
                        <p className="text-sm text-muted-foreground">Sprint start, end, and milestone completions</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input type="checkbox" id="sprintEventsEmail" className="rounded" defaultChecked />
                        <label htmlFor="sprintEventsEmail" className="text-sm">Email</label>
                        <input type="checkbox" id="sprintEventsApp" className="rounded ml-4" defaultChecked />
                        <label htmlFor="sprintEventsApp" className="text-sm">In-app</label>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Bug Reports</p>
                        <p className="text-sm text-muted-foreground">New bug reports and status changes</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input type="checkbox" id="bugReportsEmail" className="rounded" defaultChecked />
                        <label htmlFor="bugReportsEmail" className="text-sm">Email</label>
                        <input type="checkbox" id="bugReportsApp" className="rounded ml-4" defaultChecked />
                        <label htmlFor="bugReportsApp" className="text-sm">In-app</label>
                      </div>
                    </div>
                    
                    <div className="flex justify-end mt-6">
                      <Button>Save Notification Settings</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="border-red-100">
                <CardHeader>
                  <CardTitle>Danger Zone</CardTitle>
                  <CardDescription>Irreversible actions that affect your project</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 border border-red-200 rounded-md">
                      <div>
                        <p className="font-medium">Archive Project</p>
                        <p className="text-sm text-muted-foreground">
                          The project will be hidden but can be restored later
                        </p>
                      </div>
                      <Button variant="outline" className="border-red-300 text-red-600 hover:bg-red-50">
                        Archive Project
                      </Button>
                    </div>
                    
                    <div className="flex items-center justify-between p-4 border border-red-200 rounded-md">
                      <div>
                        <p className="font-medium">Delete Project</p>
                        <p className="text-sm text-muted-foreground">
                          This action cannot be undone. All data will be permanently removed.
                        </p>
                      </div>
                      <Button variant="destructive">Delete Project</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>
      <UploadDocumentModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onUploadComplete={handleUploadComplete}
        projectId={projectId}
      />
    </div>
  );
} 