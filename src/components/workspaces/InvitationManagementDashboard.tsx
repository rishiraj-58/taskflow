"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { 
  Mail, 
  Clock, 
  AlertTriangle, 
  RotateCcw, 
  X, 
  CheckCircle2,
  Calendar,
  User,
  Crown,
  RefreshCw
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface PendingInvitation {
  id: string;
  email: string;
  role: 'ADMIN' | 'MEMBER';
  status: string;
  expiresAt: string;
  createdAt: string;
  inviter: {
    name: string;
    email: string;
  };
}

interface InvitationManagementDashboardProps {
  workspaceId: string;
}

export default function InvitationManagementDashboard({ workspaceId }: InvitationManagementDashboardProps) {
  const [invitations, setInvitations] = useState<PendingInvitation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [cancellingInvitation, setCancellingInvitation] = useState<PendingInvitation | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchInvitations();
  }, [workspaceId]);

  const fetchInvitations = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/workspaces/${workspaceId}/invitations`);
      
      if (!response.ok) {
        throw new Error("Failed to fetch invitations");
      }
      
      const data = await response.json();
      setInvitations(data);
    } catch (error) {
      console.error("Error fetching invitations:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load invitations. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendInvitation = async (invitation: PendingInvitation) => {
    try {
      setActionLoading(invitation.id);
      const response = await fetch(`/api/workspaces/${workspaceId}/invitations/${invitation.id}/resend`, {
        method: "POST",
      });
      
      if (!response.ok) {
        throw new Error("Failed to resend invitation");
      }
      
      toast({
        title: "Invitation Resent",
        description: `A new invitation has been sent to ${invitation.email}.`,
      });
      
      // Refresh invitations list
      fetchInvitations();
    } catch (error) {
      console.error("Error resending invitation:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to resend invitation. Please try again.",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancelInvitation = async (invitation: PendingInvitation) => {
    try {
      setActionLoading(invitation.id);
      const response = await fetch(`/api/workspaces/${workspaceId}/invitations/${invitation.id}`, {
        method: "DELETE",
      });
      
      if (!response.ok) {
        throw new Error("Failed to cancel invitation");
      }
      
      toast({
        title: "Invitation Cancelled",
        description: `The invitation to ${invitation.email} has been cancelled.`,
      });
      
      // Remove from local state
      setInvitations(prev => prev.filter(inv => inv.id !== invitation.id));
      setCancellingInvitation(null);
    } catch (error) {
      console.error("Error cancelling invitation:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to cancel invitation. Please try again.",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const getTimeUntilExpiration = (expiresAt: string) => {
    const now = new Date();
    const expiration = new Date(expiresAt);
    const diffInHours = Math.max(0, Math.floor((expiration.getTime() - now.getTime()) / (1000 * 60 * 60)));
    const diffInDays = Math.floor(diffInHours / 24);
    
    if (diffInDays > 0) {
      return `${diffInDays} day${diffInDays !== 1 ? 's' : ''} left`;
    } else if (diffInHours > 0) {
      return `${diffInHours} hour${diffInHours !== 1 ? 's' : ''} left`;
    } else {
      return "Expired";
    }
  };

  const isExpired = (expiresAt: string) => {
    return new Date(expiresAt) < new Date();
  };

  const getRoleIcon = (role: string) => {
    return role === 'ADMIN' ? <Crown className="h-3 w-3 text-yellow-600" /> : <User className="h-3 w-3 text-blue-600" />;
  };

  const getRoleBadge = (role: string) => {
    return role === 'ADMIN' 
      ? <Badge variant="default" className="bg-yellow-100 text-yellow-800 text-xs">Admin</Badge>
      : <Badge variant="secondary" className="text-xs">Member</Badge>;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Pending Invitations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
              <p className="text-sm text-muted-foreground">Loading invitations...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Pending Invitations
            </CardTitle>
            <CardDescription>
              Manage workspace invitations that haven't been accepted yet
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={fetchInvitations}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          {invitations.length === 0 ? (
            <div className="text-center py-8">
              <Mail className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Pending Invitations</h3>
              <p className="text-gray-500">
                All sent invitations have been accepted or have expired.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {invitations.map((invitation) => (
                <Card key={invitation.id} className={`${isExpired(invitation.expiresAt) ? 'bg-red-50 border-red-200' : ''}`}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4 text-gray-500" />
                            <span className="font-medium text-gray-900 truncate">
                              {invitation.email}
                            </span>
                          </div>
                          {getRoleBadge(invitation.role)}
                          {isExpired(invitation.expiresAt) && (
                            <Badge variant="destructive" className="text-xs">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              Expired
                            </Badge>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <div className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            <span>Invited by {invitation.inviter.name}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            <span>{new Date(invitation.createdAt).toLocaleDateString()}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span className={isExpired(invitation.expiresAt) ? 'text-red-600' : ''}>
                              {getTimeUntilExpiration(invitation.expiresAt)}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 ml-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleResendInvitation(invitation)}
                          disabled={actionLoading === invitation.id}
                        >
                          {actionLoading === invitation.id ? (
                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600 mr-2" />
                          ) : (
                            <RotateCcw className="h-3 w-3 mr-2" />
                          )}
                          Resend
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCancellingInvitation(invitation)}
                          disabled={actionLoading === invitation.id}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <X className="h-3 w-3 mr-2" />
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={!!cancellingInvitation} onOpenChange={() => setCancellingInvitation(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Invitation</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel the invitation to {cancellingInvitation?.email}? 
              This action cannot be undone, and they will no longer be able to use this invitation link to join the workspace.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Invitation</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => cancellingInvitation && handleCancelInvitation(cancellingInvitation)}
            >
              Cancel Invitation
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
} 