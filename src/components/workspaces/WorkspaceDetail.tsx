"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import TeamMembers from "./TeamMembers";
import InvitationModal from "./InvitationModal";
import DeleteWorkspaceModal from "./DeleteWorkspaceModal";

interface Member {
  id: string;
  userId: string;
  email: string;
  name: string;
  role: string;
  joinedAt: Date;
  status?: string;
}

interface WorkspaceDetailProps {
  workspaceId: string;
}

export default function WorkspaceDetail({ workspaceId }: WorkspaceDetailProps) {
  const { user } = useUser();
  const router = useRouter();
  const [workspace, setWorkspace] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);
  const [workspaceName, setWorkspaceName] = useState('');
  const [workspaceDescription, setWorkspaceDescription] = useState('');
  
  useEffect(() => {
    const fetchWorkspace = async () => {
      try {
        setLoading(true);
        const formattedWorkspace = await getWorkspaceData(workspaceId);
        setWorkspaceName(formattedWorkspace.name);
        setWorkspaceDescription(formattedWorkspace.description || '');
        setWorkspace(formattedWorkspace);
      } catch (err) {
        console.error('Error fetching workspace:', err);
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchWorkspace();
  }, [workspaceId]);

  // Helper function to fetch workspace data
  const getWorkspaceData = async (id: string) => {
    const response = await fetch(`/api/workspaces/${id}`);
    
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Failed to fetch workspace');
    }
    
    const data = await response.json();
    
    // Convert dates from strings to Date objects
    return {
      ...data,
      createdAt: new Date(data.createdAt),
      members: data.members.map((member: any) => ({
        ...member,
        joinedAt: new Date(member.joinedAt),
      })),
    };
  };

  // Refresh workspace after a new invitation is sent
  const handleInvitationSent = async () => {
    try {
      const formattedWorkspace = await getWorkspaceData(workspaceId);
      setWorkspace(formattedWorkspace);
    } catch (err) {
      console.error('Error refreshing workspace data:', err);
    }
  };
  
  const handleUpdateWorkspace = async () => {
    try {
      setUpdating(true);
      
      const response = await fetch(`/api/workspaces/${workspaceId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: workspaceName,
          description: workspaceDescription,
        }),
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update workspace');
      }
      
      const updatedWorkspace = await response.json();
      
      setWorkspace({
        ...workspace,
        name: updatedWorkspace.name,
        description: updatedWorkspace.description,
      });
      
      setError(null);
    } catch (err) {
      console.error('Error updating workspace:', err);
      setError(err instanceof Error ? err.message : 'Failed to update workspace');
    } finally {
      setUpdating(false);
    }
  };
  
  const handleDeleteWorkspace = async () => {
    // This function gets called after successful deletion in the modal
    // No need to do the actual deletion here - it's handled in the modal
    // Just redirect to workspaces list
    router.push('/workspaces');
  };
  
  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading workspace...</div>;
  }
  
  if (error && !workspace) {
    return <div className="text-center py-12 text-red-500">Error: {error}</div>;
  }
  
  if (!workspace) {
    return <div className="text-center py-12">Workspace not found</div>;
  }

  const userRole = workspace.userRole || 'MEMBER';
  const isOwnerOrAdmin = userRole === 'OWNER' || userRole === 'ADMIN';

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{workspace.name}</h1>
        <p className="text-muted-foreground mt-2">{workspace.description}</p>
      </div>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <span className="block sm:inline">{error}</span>
        </div>
      )}
      
      <Tabs defaultValue="members" className="w-full">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="members">Team Members</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-4 py-4">
          <Card>
            <CardHeader>
              <CardTitle>Workspace Overview</CardTitle>
              <CardDescription>Basic information about your workspace</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Workspace Name</h3>
                <p className="mt-1">{workspace.name}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Description</h3>
                <p className="mt-1">{workspace.description || 'No description'}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Created</h3>
                <p className="mt-1">{workspace.createdAt.toLocaleDateString()}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Members</h3>
                <p className="mt-1">{workspace.members.length} members</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Your Role</h3>
                <p className="mt-1 capitalize">{userRole.toLowerCase()}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="members" className="py-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Team Members</h2>
            {isOwnerOrAdmin && (
              <button
                onClick={() => setIsInviteModalOpen(true)}
                disabled={updating}
                className="inline-flex items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {updating ? "Processing..." : "Invite Team Member"}
              </button>
            )}
          </div>
          
          <TeamMembers 
            members={workspace.members} 
            currentUserEmail={user?.primaryEmailAddress?.emailAddress}
            userRole={userRole}
            workspaceId={workspaceId}
          />
        </TabsContent>
        
        <TabsContent value="settings" className="space-y-4 py-4">
          <Card>
            <CardHeader>
              <CardTitle>Workspace Settings</CardTitle>
              <CardDescription>Manage your workspace settings</CardDescription>
            </CardHeader>
            <CardContent>
              {isOwnerOrAdmin ? (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Workspace Name</h3>
                    <input
                      type="text"
                      value={workspaceName}
                      onChange={(e) => setWorkspaceName(e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      disabled={updating}
                    />
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Description</h3>
                    <textarea
                      rows={3}
                      value={workspaceDescription}
                      onChange={(e) => setWorkspaceDescription(e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      disabled={updating}
                    />
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={handleUpdateWorkspace}
                      disabled={updating || !workspaceName.trim()}
                      className="inline-flex items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {updating ? "Saving..." : "Save Changes"}
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-500">You don't have permission to modify workspace settings.</p>
              )}
            </CardContent>
          </Card>
          
          {userRole === 'OWNER' && (
            <Card className="border-red-300 dark:border-red-700">
              <CardHeader>
                <CardTitle className="text-red-600 dark:text-red-400">Danger Zone</CardTitle>
                <CardDescription>Actions that cannot be undone</CardDescription>
              </CardHeader>
              <CardContent>
                <button
                  type="button"
                  onClick={() => setIsDeleteModalOpen(true)}
                  disabled={updating}
                  className="inline-flex items-center rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {updating ? "Processing..." : "Delete Workspace"}
                </button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
      
      <InvitationModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        onInvite={handleInvitationSent}
        workspaceId={workspaceId}
      />
      
      <DeleteWorkspaceModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        workspaceId={workspaceId}
        workspaceName={workspace?.name || ''}
        onDelete={handleDeleteWorkspace}
      />
    </div>
  );
} 