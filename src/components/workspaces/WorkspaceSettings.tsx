"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { UserPlus, Trash2 } from "lucide-react";
import InvitationModal from "@/components/workspaces/InvitationModal";
import DeleteWorkspaceModal from "@/components/workspaces/DeleteWorkspaceModal";
import type { Workspace } from "../../types/workspace";
import { Separator } from "@/components/ui/separator";

interface WorkspaceSettingsProps {
  workspace: Workspace;
}

export default function WorkspaceSettings({ workspace }: WorkspaceSettingsProps) {
  const [name, setName] = useState(workspace.name);
  const [description, setDescription] = useState(workspace.description || "");
  const [isUpdating, setIsUpdating] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleUpdateWorkspace = async () => {
    if (!name.trim()) {
      toast({
        variant: "destructive",
        title: "Invalid input",
        description: "Workspace name cannot be empty",
      });
      return;
    }

    setIsUpdating(true);

    try {
      const response = await fetch(`/api/workspaces/${workspace.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          description,
        }),
      });

      if (response.ok) {
        toast({
          title: "Workspace updated",
          description: "Workspace settings have been updated successfully.",
        });
        router.refresh();
      } else {
        const data = await response.json();
        toast({
          variant: "destructive",
          title: "Error updating workspace",
          description: data.error || "Failed to update workspace settings.",
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "An unexpected error occurred.",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Workspace Settings</CardTitle>
          <CardDescription>
            Update your workspace information
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Workspace Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter workspace name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter workspace description"
            />
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={handleUpdateWorkspace} disabled={isUpdating}>
            {isUpdating ? "Updating..." : "Save Changes"}
          </Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Team Management</CardTitle>
          <CardDescription>
            Invite team members to collaborate in this workspace
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            variant="outline" 
            onClick={() => setShowInviteModal(true)}
            className="flex items-center gap-2"
          >
            <UserPlus className="h-4 w-4" />
            Invite Members
          </Button>
        </CardContent>
      </Card>
      
      <Separator className="my-6" />
      
      <Card className="border-destructive/20">
        <CardHeader>
          <CardTitle className="text-destructive">Danger Zone</CardTitle>
          <CardDescription>
            Permanently delete this workspace and all its data
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            variant="destructive" 
            onClick={() => setShowDeleteModal(true)}
            className="flex items-center gap-2"
          >
            <Trash2 className="h-4 w-4" />
            Delete Workspace
          </Button>
        </CardContent>
      </Card>

      {showInviteModal && (
        <InvitationModal
          isOpen={showInviteModal}
          onClose={() => setShowInviteModal(false)}
          workspaceId={workspace.id}
          onInvite={() => router.refresh()}
        />
      )}

      {showDeleteModal && (
        <DeleteWorkspaceModal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          workspaceId={workspace.id}
          workspaceName={workspace.name}
          onDelete={() => router.push('/workspaces')}
        />
      )}
    </div>
  );
} 