"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { 
  Loader2, 
  Search, 
  UserPlus, 
  Mail, 
  MessageSquare, 
  MoreHorizontal, 
  CheckCircle2, 
  Users,
  Building,
  Star,
  Award
} from "lucide-react";

export default function TeamPage() {
  const { user } = useUser();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [workspaces, setWorkspaces] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState("all");
  
  useEffect(() => {
    const fetchTeamMembers = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/team/members');
        
        if (!response.ok) {
          throw new Error("Failed to fetch team members");
        }
        
        const data = await response.json();
        setTeamMembers(data);
      } catch (err) {
        console.error("Error fetching team members:", err);
        setError(err instanceof Error ? err.message : "An unknown error occurred");
        // Use placeholder data in case of error
        setTeamMembers(getPlaceholderTeamMembers());
      } finally {
        setLoading(false);
      }
    };

    const fetchWorkspaces = async () => {
      try {
        const response = await fetch('/api/workspaces');
        
        if (!response.ok) {
          throw new Error("Failed to fetch workspaces");
        }
        
        const data = await response.json();
        setWorkspaces(data);
      } catch (err) {
        console.error("Error fetching workspaces:", err);
        // Use placeholder data
        setWorkspaces(getPlaceholderWorkspaces());
      }
    };

    fetchTeamMembers();
    fetchWorkspaces();
  }, []);

  // Placeholder data for development or when API fails
  const getPlaceholderTeamMembers = () => {
    return [
      {
        id: "1",
        userId: "user_1",
        email: "john.doe@example.com",
        name: "John Doe",
        role: "ADMIN",
        status: "ACTIVE",
        joinedAt: new Date().toISOString(),
        imageUrl: "",
        workspace: { id: "1", name: "Main Workspace" }
      },
      {
        id: "2",
        userId: "user_2",
        email: "jane.smith@example.com",
        name: "Jane Smith",
        role: "MEMBER",
        status: "ACTIVE",
        joinedAt: new Date().toISOString(),
        imageUrl: "",
        workspace: { id: "1", name: "Main Workspace" }
      },
      {
        id: "3",
        userId: "user_3",
        email: "mike.johnson@example.com",
        name: "Mike Johnson",
        role: "MEMBER",
        status: "ACTIVE",
        joinedAt: new Date().toISOString(),
        imageUrl: "",
        workspace: { id: "1", name: "Main Workspace" }
      },
      {
        id: "4",
        userId: "user_4",
        email: "sarah.williams@example.com",
        name: "Sarah Williams",
        role: "OWNER",
        status: "ACTIVE",
        joinedAt: new Date().toISOString(),
        imageUrl: "",
        workspace: { id: "2", name: "Design Team" }
      },
      {
        id: "5",
        userId: "user_5",
        email: "alex.wilson@example.com",
        name: "Alex Wilson",
        role: "MEMBER",
        status: "INACTIVE",
        joinedAt: new Date().toISOString(),
        imageUrl: "",
        workspace: { id: "2", name: "Design Team" }
      }
    ];
  };

  // Placeholder workspaces for development
  const getPlaceholderWorkspaces = () => {
    return [
      {
        id: "1",
        name: "Main Workspace",
        memberCount: 15
      },
      {
        id: "2",
        name: "Design Team",
        memberCount: 8
      },
      {
        id: "3",
        name: "Engineering",
        memberCount: 12
      },
      {
        id: "4",
        name: "Marketing",
        memberCount: 6
      }
    ];
  };

  const filteredMembers = teamMembers.filter(member => {
    // Filter by search query
    const matchesQuery = 
      member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.role.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Filter by tab
    if (activeTab === "all") return matchesQuery;
    if (activeTab === "admin" && member.role === "ADMIN") return matchesQuery;
    if (activeTab === "member" && member.role === "MEMBER") return matchesQuery;
    return false;
  });

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading team members...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-500 font-bold mb-4">
          Error: {error}
        </div>
        <div className="bg-gray-100 p-4 rounded text-left overflow-auto max-h-96 text-sm">
          <p className="mb-2">Something went wrong while fetching team members.</p>
          <p className="mb-2">Please try again or contact support if the issue persists.</p>
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
          <h1 className="text-3xl font-bold tracking-tight">Team Members</h1>
          <p className="text-muted-foreground">Manage your organization's team members and their access.</p>
        </div>
        <Button>
          <UserPlus className="h-4 w-4 mr-2" />
          Invite Team Member
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Team Overview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total Members</span>
                <Badge variant="outline">{teamMembers.length}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Admins</span>
                <Badge variant="outline">
                  {teamMembers.filter(m => m.role === "ADMIN").length}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Members</span>
                <Badge variant="outline">
                  {teamMembers.filter(m => m.role === "MEMBER").length}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Active</span>
                <Badge variant="outline">
                  {teamMembers.filter(m => m.status === "ACTIVE").length}
                </Badge>
              </div>
            </div>

            <div className="pt-4 border-t">
              <h3 className="text-sm font-medium mb-3">Workspaces</h3>
              <div className="space-y-2">
                {workspaces.map(workspace => (
                  <div key={workspace.id} className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Building className="h-4 w-4 mr-2 text-muted-foreground" />
                      <span className="text-sm truncate max-w-[150px]">{workspace.name}</span>
                    </div>
                    <Badge variant="outline">{workspace.memberCount || 0}</Badge>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="md:col-span-3 space-y-4">
          <div className="flex flex-col sm:flex-row justify-between gap-4">
            <Tabs defaultValue="all" className="w-full sm:w-auto" onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="admin">Admins</TabsTrigger>
                <TabsTrigger value="member">Members</TabsTrigger>
              </TabsList>
            </Tabs>
            
            <div className="relative w-full sm:w-auto max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search team members..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="grid grid-cols-1 divide-y">
                {filteredMembers.length > 0 ? (
                  filteredMembers.map(member => (
                    <div key={member.id} className="p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={member.imageUrl} alt={member.name} />
                          <AvatarFallback>{getInitials(member.name)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{member.name}</div>
                          <div className="text-sm text-muted-foreground">{member.email}</div>
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-2 sm:gap-4 ml-auto">
                        <div className="flex items-center">
                          {member.role === "ADMIN" ? (
                            <Badge className="bg-blue-600">Admin</Badge>
                          ) : member.role === "OWNER" ? (
                            <Badge className="bg-purple-600">Owner</Badge>
                          ) : (
                            <Badge>Member</Badge>
                          )}
                          
                          {member.status === "ACTIVE" && (
                            <Badge variant="outline" className="ml-2 text-green-600 border-green-600">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Active
                            </Badge>
                          )}
                        </div>
                        
                        <div className="flex gap-2">
                          <Button variant="ghost" size="icon">
                            <Mail className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon">
                            <MessageSquare className="h-4 w-4" />
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>View Profile</DropdownMenuItem>
                              <DropdownMenuItem>Edit Permissions</DropdownMenuItem>
                              <DropdownMenuItem className="text-red-600">Remove Member</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-12 text-center">
                    <Users className="h-12 w-12 mx-auto text-muted-foreground opacity-50" />
                    <h3 className="mt-4 text-lg font-medium">No team members found</h3>
                    <p className="text-muted-foreground mt-1">
                      {searchQuery 
                        ? "Try adjusting your search query" 
                        : "Start by inviting team members to your organization"}
                    </p>
                    {!searchQuery && (
                      <Button className="mt-4">
                        <UserPlus className="h-4 w-4 mr-2" />
                        Invite Team Member
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Team Achievements</CardTitle>
          <CardDescription>Recognize the contributions of your team members</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-md border border-yellow-200 dark:border-yellow-800">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-medium">Most Active Contributor</h3>
                  <p className="text-sm text-muted-foreground mt-1">Highest activity this month</p>
                </div>
                <Star className="h-5 w-5 text-yellow-500" />
              </div>
              <div className="mt-4 flex items-center gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarImage src="" alt="Top Contributor" />
                  <AvatarFallback>TC</AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-medium text-sm">Sarah Johnson</div>
                  <div className="text-xs text-muted-foreground">42 contributions</div>
                </div>
              </div>
            </div>
            
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-md border border-blue-200 dark:border-blue-800">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-medium">Bug Hunter</h3>
                  <p className="text-sm text-muted-foreground mt-1">Fixed the most bugs</p>
                </div>
                <Award className="h-5 w-5 text-blue-500" />
              </div>
              <div className="mt-4 flex items-center gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarImage src="" alt="Bug Hunter" />
                  <AvatarFallback>BH</AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-medium text-sm">Alex Wong</div>
                  <div className="text-xs text-muted-foreground">15 bugs resolved</div>
                </div>
              </div>
            </div>
            
            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-md border border-green-200 dark:border-green-800">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-medium">Sprint Champion</h3>
                  <p className="text-sm text-muted-foreground mt-1">Most tasks completed on time</p>
                </div>
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              </div>
              <div className="mt-4 flex items-center gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarImage src="" alt="Sprint Champion" />
                  <AvatarFallback>SC</AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-medium text-sm">Michael Chen</div>
                  <div className="text-xs text-muted-foreground">24 tasks completed</div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 