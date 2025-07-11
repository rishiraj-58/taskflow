"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import { 
  Users, 
  UserPlus, 
  Mail, 
  Upload, 
  Search, 
  Settings, 
  Plus,
  Download,
  Filter,
  MoreHorizontal,
  Crown,
  Shield,
  User
} from "lucide-react";
import TeamMembers from "./TeamMembers";
import EnhancedInvitationModal from "./EnhancedInvitationModal";
import BulkInvitationModal from "./BulkInvitationModal";
import TeamMemberBrowser from "./TeamMemberBrowser";
import InvitationManagementDashboard from "./InvitationManagementDashboard";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface TeamMember {
  id: string;
  userId: string;
  email: string;
  name: string;
  firstName: string;
  lastName: string;
  imageUrl?: string;
  role: 'ADMIN' | 'MEMBER';
  status: string;
  joinedAt: string;
}

interface TeamManagementHubProps {
  workspaceId: string;
  currentUserEmail?: string;
  userRole: string;
  onMemberUpdate?: () => void;
}

export default function TeamManagementHub({ 
  workspaceId, 
  currentUserEmail, 
  userRole,
  onMemberUpdate 
}: TeamManagementHubProps) {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  
  // Modal states
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [showBulkInviteModal, setShowBulkInviteModal] = useState(false);
  const [showMemberBrowser, setShowMemberBrowser] = useState(false);
  const [addMemberMethod, setAddMemberMethod] = useState<'email' | 'browse' | 'bulk'>('email');
  
  const { toast } = useToast();

  const canManageMembers = userRole === 'ADMIN' || userRole === 'OWNER';

  useEffect(() => {
    fetchTeamMembers();
  }, [workspaceId]);

  const fetchTeamMembers = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/workspaces/${workspaceId}/members`);
      
      if (!response.ok) {
        throw new Error("Failed to fetch team members");
      }
      
      const data = await response.json();
      setMembers(data);
    } catch (error) {
      console.error("Error fetching team members:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load team members. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleMemberUpdate = () => {
    fetchTeamMembers();
    if (onMemberUpdate) onMemberUpdate();
  };

  const filteredMembers = members.filter(member =>
    member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getRoleStats = () => {
    const stats = {
      total: members.length,
      admins: members.filter(m => m.role === 'ADMIN').length,
      members: members.filter(m => m.role === 'MEMBER').length,
      pending: members.filter(m => m.status === 'PENDING').length,
    };
    return stats;
  };

  const stats = getRoleStats();

  const handleAddMemberClick = (method: 'email' | 'browse' | 'bulk') => {
    setAddMemberMethod(method);
    switch(method) {
      case 'email':
        setShowAddMemberModal(true);
        break;
      case 'browse':
        setShowMemberBrowser(true);
        break;
      case 'bulk':
        setShowBulkInviteModal(true);
        break;
    }
  };

  const exportMemberList = () => {
    const csvContent = [
      ['Name', 'Email', 'Role', 'Status', 'Joined Date'],
      ...members.map(member => [
        member.name,
        member.email,
        member.role,
        member.status,
        new Date(member.joinedAt).toLocaleDateString()
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `workspace-members-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="flex flex-col space-y-4 md:flex-row md:justify-between md:items-start md:space-y-0">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Team Management</h2>
          <p className="text-muted-foreground">
            Manage your workspace team members and invitations
          </p>
        </div>
        
        <div className="flex flex-col space-y-2 md:flex-row md:space-y-0 md:space-x-2">
          {/* Quick Stats */}
          <div className="flex space-x-2">
            <Badge variant="outline" className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {stats.total} Total
            </Badge>
            <Badge variant="outline" className="flex items-center gap-1">
              <Crown className="h-3 w-3" />
              {stats.admins} Admins
            </Badge>
            {stats.pending > 0 && (
              <Badge variant="outline" className="flex items-center gap-1 text-yellow-600">
                <Mail className="h-3 w-3" />
                {stats.pending} Pending
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Action Bar */}
      {canManageMembers && (
        <Card className="border-dashed border-2 border-blue-200 bg-blue-50/30">
          <CardContent className="pt-6">
            <div className="flex flex-col space-y-4 md:flex-row md:justify-between md:items-center md:space-y-0">
              <div>
                <h3 className="font-semibold text-blue-900">Add Team Members</h3>
                <p className="text-sm text-blue-700">
                  Invite colleagues to collaborate in your workspace
                </p>
              </div>
              
              <div className="flex flex-wrap gap-2">
                <Button 
                  onClick={() => handleAddMemberClick('email')}
                  className="flex items-center gap-2"
                >
                  <Mail className="h-4 w-4" />
                  Email Invite
                </Button>
                
                <Button 
                  variant="outline"
                  onClick={() => handleAddMemberClick('browse')}
                  className="flex items-center gap-2"
                >
                  <Search className="h-4 w-4" />
                  Browse Users
                </Button>
                
                <Button 
                  variant="outline"
                  onClick={() => handleAddMemberClick('bulk')}
                  className="flex items-center gap-2"
                >
                  <Upload className="h-4 w-4" />
                  Bulk Import
                </Button>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Team Actions</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={exportMemberList}>
                      <Download className="h-4 w-4 mr-2" />
                      Export Member List
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Settings className="h-4 w-4 mr-2" />
                      Domain Settings
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search and Filter */}
      <Card>
        <CardHeader>
          <div className="flex flex-col space-y-4 md:flex-row md:justify-between md:items-center md:space-y-0">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Team Members ({filteredMembers.length})
              </CardTitle>
              <CardDescription>
                Manage roles and permissions for your team
              </CardDescription>
            </div>
            
            <div className="flex items-center space-x-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search members..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-full md:w-64"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <TeamMembers
            members={filteredMembers}
            currentUserEmail={currentUserEmail}
            userRole={userRole}
            workspaceId={workspaceId}
            onMemberRemoved={handleMemberUpdate}
          />
        </CardContent>
      </Card>

      {/* Invitation Management */}
      <InvitationManagementDashboard workspaceId={workspaceId} />

      {/* Modals */}
      <EnhancedInvitationModal
        isOpen={showAddMemberModal}
        onClose={() => setShowAddMemberModal(false)}
        workspaceId={workspaceId}
        onInvite={handleMemberUpdate}
      />

      <BulkInvitationModal
        isOpen={showBulkInviteModal}
        onClose={() => setShowBulkInviteModal(false)}
        workspaceId={workspaceId}
        onInvite={handleMemberUpdate}
      />

      <TeamMemberBrowser
        isOpen={showMemberBrowser}
        onClose={() => setShowMemberBrowser(false)}
        workspaceId={workspaceId}
        onSelect={(selectedMembers) => {
          console.log('Selected members:', selectedMembers);
          // Handle member selection for project assignment
          toast({
            title: "Members Selected",
            description: `Selected ${selectedMembers.length} members for project assignment.`,
          });
        }}
        title="Browse Team Members"
        description="Select members to add to projects or assign tasks"
      />
    </div>
  );
} 