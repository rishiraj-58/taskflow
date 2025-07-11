"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  UserPlus, 
  Mail, 
  Upload, 
  Search, 
  Settings,
  ArrowRight,
  Clock,
  CheckCircle
} from "lucide-react";
import { useRouter } from "next/navigation";
import EnhancedInvitationModal from "./EnhancedInvitationModal";
import BulkInvitationModal from "./BulkInvitationModal";
import TeamMemberBrowser from "./TeamMemberBrowser";

interface QuickTeamActionsProps {
  workspaceId: string;
  stats?: {
    totalMembers: number;
    pendingInvitations: number;
    recentJoins: number;
  };
  onUpdate?: () => void;
}

export default function QuickTeamActions({ 
  workspaceId, 
  stats = { totalMembers: 0, pendingInvitations: 0, recentJoins: 0 },
  onUpdate 
}: QuickTeamActionsProps) {
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [showBrowserModal, setShowBrowserModal] = useState(false);
  const router = useRouter();

  const handleUpdate = () => {
    if (onUpdate) onUpdate();
  };

  const navigateToTeamManagement = () => {
    router.push(`/workspaces/${workspaceId}/settings?tab=team`);
  };

  return (
    <Card className="border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-600" />
            <CardTitle className="text-lg">Team Quick Actions</CardTitle>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={navigateToTeamManagement}
            className="text-blue-600 hover:text-blue-800"
          >
            <Settings className="h-4 w-4 mr-1" />
            Manage
          </Button>
        </div>
        <CardDescription>
          Quickly add team members and manage your workspace
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Quick Stats */}
        <div className="flex gap-3">
          <Badge variant="outline" className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            {stats.totalMembers} Members
          </Badge>
          {stats.pendingInvitations > 0 && (
            <Badge variant="outline" className="flex items-center gap-1 text-yellow-600">
              <Clock className="h-3 w-3" />
              {stats.pendingInvitations} Pending
            </Badge>
          )}
          {stats.recentJoins > 0 && (
            <Badge variant="outline" className="flex items-center gap-1 text-green-600">
              <CheckCircle className="h-3 w-3" />
              {stats.recentJoins} Recent
            </Badge>
          )}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Button
            variant="outline"
            onClick={() => setShowInviteModal(true)}
            className="flex items-center gap-2 bg-white hover:bg-blue-50"
          >
            <Mail className="h-4 w-4" />
            <span className="text-sm">Email Invite</span>
          </Button>
          
          <Button
            variant="outline"
            onClick={() => setShowBrowserModal(true)}
            className="flex items-center gap-2 bg-white hover:bg-blue-50"
          >
            <Search className="h-4 w-4" />
            <span className="text-sm">Browse Users</span>
          </Button>
          
          <Button
            variant="outline"
            onClick={() => setShowBulkModal(true)}
            className="flex items-center gap-2 bg-white hover:bg-blue-50"
          >
            <Upload className="h-4 w-4" />
            <span className="text-sm">Bulk Import</span>
          </Button>
        </div>

        {/* Full Management Link */}
        <div className="pt-2 border-t border-blue-200">
          <Button
            variant="ghost"
            onClick={navigateToTeamManagement}
            className="w-full justify-between text-blue-600 hover:text-blue-800 hover:bg-blue-50"
          >
            <span className="text-sm">Full Team Management</span>
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>

      {/* Modals */}
      <EnhancedInvitationModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        workspaceId={workspaceId}
        onInvite={handleUpdate}
      />

      <BulkInvitationModal
        isOpen={showBulkModal}
        onClose={() => setShowBulkModal(false)}
        workspaceId={workspaceId}
        onInvite={handleUpdate}
      />

      <TeamMemberBrowser
        isOpen={showBrowserModal}
        onClose={() => setShowBrowserModal(false)}
        workspaceId={workspaceId}
        onSelect={(members) => {
          console.log('Selected members for project assignment:', members);
          handleUpdate();
        }}
        title="Browse Team Members"
        description="Select members to assign to projects or tasks"
      />
    </Card>
  );
} 