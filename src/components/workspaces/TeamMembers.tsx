"use client";

import { useState } from "react";
import { 
  UserCog, 
  UserMinus, 
  MoreHorizontal,
  Loader2,
  AlertCircle 
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface Member {
  id: string;
  userId: string;
  email: string;
  name: string;
  role: string;
  joinedAt: Date;
  status?: string;
}

interface TeamMembersProps {
  members: Member[];
  currentUserEmail?: string;
  userRole: string;
  workspaceId: string;
  onMemberRemoved?: () => void;
}

export default function TeamMembers({ 
  members, 
  currentUserEmail, 
  userRole, 
  workspaceId,
  onMemberRemoved 
}: TeamMembersProps) {
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);
  const [removeMemberDialogOpen, setRemoveMemberDialogOpen] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<Member | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canManageMembers = userRole === 'ADMIN' || userRole === 'OWNER';
  
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'OWNER':
        return 'bg-purple-600 hover:bg-purple-700';
      case 'ADMIN':
        return 'bg-blue-600 hover:bg-blue-700';
      default:
        return 'bg-gray-600 hover:bg-gray-700';
    }
  };

  const handleRemoveMember = (member: Member) => {
    setMemberToRemove(member);
    setRemoveMemberDialogOpen(true);
  };

  const confirmRemoveMember = async () => {
    if (!memberToRemove) return;
    
    setIsRemoving(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/workspaces/${workspaceId}/members/${memberToRemove.id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to remove member');
      }
      
      setRemoveMemberDialogOpen(false);
      if (onMemberRemoved) {
        onMemberRemoved();
      }
    } catch (err) {
      console.error('Error removing member:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsRemoving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Member
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Role
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Joined
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Status
              </th>
              {canManageMembers && (
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
            {members.map((member) => (
              <tr key={member.id} className={`${member.email === currentUserEmail ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10">
                      <Avatar>
                        <AvatarImage src="" alt={member.name} />
                        <AvatarFallback>{getInitials(member.name)}</AvatarFallback>
                      </Avatar>
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {member.name} {member.email === currentUserEmail && " (You)"}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {member.email}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <Badge className={getRoleBadgeColor(member.role)}>
                    {member.role.toLowerCase()}
                  </Badge>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  {new Date(member.joinedAt).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <Badge variant={member.status === 'ACTIVE' ? 'default' : 'outline'}>
                    {member.status?.toLowerCase() || 'active'}
                  </Badge>
                </td>
                {canManageMembers && (
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Actions</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <UserCog className="h-4 w-4 mr-2" />
                          <span>Change role</span>
                        </DropdownMenuItem>
                        
                        <DropdownMenuSeparator />
                        
                        {(userRole === 'OWNER' || (userRole === 'ADMIN' && member.role !== 'OWNER')) && 
                          member.email !== currentUserEmail && (
                          <DropdownMenuItem 
                            className="text-red-600 focus:text-red-600"
                            onClick={() => handleRemoveMember(member)}
                          >
                            <UserMinus className="h-4 w-4 mr-2" />
                            <span>Remove member</span>
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog 
        open={removeMemberDialogOpen} 
        onOpenChange={setRemoveMemberDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove team member</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove {memberToRemove?.name} from this workspace?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md flex items-start">
              <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setRemoveMemberDialogOpen(false)}
              disabled={isRemoving}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={confirmRemoveMember}
              disabled={isRemoving}
            >
              {isRemoving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Removing...
                </>
              ) : (
                'Remove member'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 