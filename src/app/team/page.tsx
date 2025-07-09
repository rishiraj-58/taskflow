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
      <div className="relative rounded-xl overflow-hidden mb-6">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 via-indigo-600/20 to-purple-600/20 animate-gradient"></div>
        <div className="relative bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm p-6 rounded-xl border border-gray-200 dark:border-gray-800">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="animate-fadeIn">
              <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-br from-blue-600 to-indigo-600 bg-clip-text text-transparent">Team Members</h1>
              <p className="text-muted-foreground">Manage your organization's team members and their access.</p>
            </div>
            <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 transition-all shadow-sm hover:shadow-md transform hover:-translate-y-0.5 animate-scaleIn">
              <UserPlus className="h-4 w-4 mr-2" />
              Invite Team Member
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="md:col-span-1 border-blue-100 dark:border-blue-900/30 shadow-sm hover:shadow-md transition-shadow animate-scaleIn">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center text-xl bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              <Users className="h-5 w-5 mr-2 text-blue-500" />
              Team Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between group hover:bg-blue-50/50 dark:hover:bg-blue-900/10 p-2 rounded-md transition-colors">
                <span className="text-sm text-muted-foreground flex items-center">
                  <Users className="h-4 w-4 mr-2 text-blue-500 group-hover:animate-pulse" />
                  Total Members
                </span>
                <Badge variant="outline" className="bg-blue-100/50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 hover:bg-blue-100 transition-colors">
                  {teamMembers.length}
                </Badge>
              </div>
              <div className="flex items-center justify-between group hover:bg-indigo-50/50 dark:hover:bg-indigo-900/10 p-2 rounded-md transition-colors">
                <span className="text-sm text-muted-foreground flex items-center">
                  <Star className="h-4 w-4 mr-2 text-indigo-500 group-hover:animate-pulse" />
                  Admins
                </span>
                <Badge variant="outline" className="bg-indigo-100/50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 transition-colors">
                  {teamMembers.filter(m => m.role === "ADMIN").length}
                </Badge>
              </div>
              <div className="flex items-center justify-between group hover:bg-violet-50/50 dark:hover:bg-violet-900/10 p-2 rounded-md transition-colors">
                <span className="text-sm text-muted-foreground flex items-center">
                  <Users className="h-4 w-4 mr-2 text-violet-500 group-hover:animate-pulse" />
                  Members
                </span>
                <Badge variant="outline" className="bg-violet-100/50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300 hover:bg-violet-100 transition-colors">
                  {teamMembers.filter(m => m.role === "MEMBER").length}
                </Badge>
              </div>
              <div className="flex items-center justify-between group hover:bg-emerald-50/50 dark:hover:bg-emerald-900/10 p-2 rounded-md transition-colors">
                <span className="text-sm text-muted-foreground flex items-center">
                  <CheckCircle2 className="h-4 w-4 mr-2 text-emerald-500 group-hover:animate-pulse" />
                  Active
                </span>
                <Badge variant="outline" className="bg-emerald-100/50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 transition-colors">
                  {teamMembers.filter(m => m.status === "ACTIVE").length}
                </Badge>
              </div>
            </div>

            <div className="pt-4 border-t">
              <h3 className="text-sm font-medium mb-3 flex items-center">
                <Building className="h-4 w-4 mr-2 text-blue-500" />
                Workspaces
              </h3>
              <div className="space-y-2">
                {workspaces.map((workspace, index) => (
                  <div 
                    key={workspace.id} 
                    className="flex items-center justify-between p-2 rounded-md hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-colors animate-fadeIn" 
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <div className="flex items-center">
                      <Building className="h-4 w-4 mr-2 text-muted-foreground" />
                      <span className="text-sm truncate max-w-[150px]">{workspace.name}</span>
                    </div>
                    <Badge variant="outline" className="bg-blue-100/50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300">
                      {workspace.memberCount || 0}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="md:col-span-3 space-y-4 animate-scaleIn" style={{ animationDelay: "100ms" }}>
          <div className="flex flex-col sm:flex-row justify-between gap-4">
            <Tabs defaultValue="all" className="w-full sm:w-auto" onValueChange={setActiveTab}>
              <TabsList className="bg-muted/70 p-1">
                <TabsTrigger 
                  value="all" 
                  className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800 data-[state=active]:shadow-sm text-base h-9 px-4 transition-all"
                >
                  All
                </TabsTrigger>
                <TabsTrigger 
                  value="admin" 
                  className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800 data-[state=active]:shadow-sm text-base h-9 px-4 transition-all"
                >
                  Admins
                </TabsTrigger>
                <TabsTrigger 
                  value="member" 
                  className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800 data-[state=active]:shadow-sm text-base h-9 px-4 transition-all"
                >
                  Members
                </TabsTrigger>
              </TabsList>
            </Tabs>
            
            <div className="relative w-full sm:w-auto max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search team members..."
                className="pl-8 border-blue-100 dark:border-blue-900/30 focus:border-blue-400 focus:ring focus:ring-blue-300/30 transition-all"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <Card className="border-blue-100 dark:border-blue-900/30 shadow-sm hover:shadow-md transition-shadow overflow-hidden animate-scaleIn" style={{ animationDelay: "200ms" }}>
            <CardHeader>
              <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-blue-500 to-indigo-500"></div>
              <CardTitle className="flex items-center text-xl bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent pl-4">
                <Award className="h-5 w-5 mr-2 text-blue-500" />
                Team Achievements
              </CardTitle>
              <CardDescription className="pl-4">Recognize the contributions of your team members</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-md border border-yellow-200 dark:border-yellow-800 hover:shadow-md hover:-translate-y-1 transition-all duration-300 animate-scaleIn" style={{ animationDelay: "250ms" }}>
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium">Most Active Contributor</h3>
                      <p className="text-sm text-muted-foreground mt-1">Highest activity this month</p>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-yellow-100 dark:bg-yellow-900/40 flex items-center justify-center">
                      <Star className="h-5 w-5 text-yellow-500 animate-pulse-soft" />
                    </div>
                  </div>
                  <div className="mt-4 flex items-center gap-3">
                    <Avatar className="h-8 w-8 ring-2 ring-yellow-200 dark:ring-yellow-800">
                      <AvatarImage src="" alt="Top Contributor" />
                      <AvatarFallback className="bg-gradient-to-br from-yellow-100 to-amber-100 dark:from-yellow-900/40 dark:to-amber-900/40 text-yellow-700 dark:text-yellow-300">
                        TC
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium text-sm">Sarah Johnson</div>
                      <div className="text-xs text-muted-foreground">42 contributions</div>
                    </div>
                  </div>
                </div>
                
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-md border border-blue-200 dark:border-blue-800 hover:shadow-md hover:-translate-y-1 transition-all duration-300 animate-scaleIn" style={{ animationDelay: "300ms" }}>
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium">Bug Hunter</h3>
                      <p className="text-sm text-muted-foreground mt-1">Fixed the most bugs</p>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
                      <Award className="h-5 w-5 text-blue-500 animate-pulse-soft" />
                    </div>
                  </div>
                  <div className="mt-4 flex items-center gap-3">
                    <Avatar className="h-8 w-8 ring-2 ring-blue-200 dark:ring-blue-800">
                      <AvatarImage src="" alt="Bug Hunter" />
                      <AvatarFallback className="bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/40 dark:to-indigo-900/40 text-blue-700 dark:text-blue-300">
                        BH
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium text-sm">Alex Wong</div>
                      <div className="text-xs text-muted-foreground">15 bugs resolved</div>
                    </div>
                  </div>
                </div>
                
                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-md border border-green-200 dark:border-green-800 hover:shadow-md hover:-translate-y-1 transition-all duration-300 animate-scaleIn" style={{ animationDelay: "350ms" }}>
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium">Sprint Champion</h3>
                      <p className="text-sm text-muted-foreground mt-1">Most tasks completed on time</p>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center">
                      <CheckCircle2 className="h-5 w-5 text-green-500 animate-pulse-soft" />
                    </div>
                  </div>
                  <div className="mt-4 flex items-center gap-3">
                    <Avatar className="h-8 w-8 ring-2 ring-green-200 dark:ring-green-800">
                      <AvatarImage src="" alt="Sprint Champion" />
                      <AvatarFallback className="bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900/40 dark:to-emerald-900/40 text-green-700 dark:text-green-300">
                        SC
                      </AvatarFallback>
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
      </div>
    </div>
  );
} 