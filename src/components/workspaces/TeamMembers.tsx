"use client";

import { useState } from "react";
import { 
  UserCog, 
  UserMinus, 
  MoreHorizontal,
  Loader2,
  AlertCircle,
  CheckCircle,
  Clock,
  Mail,
  Calendar
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
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";

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

  const getAvatarColor = (name: string) => {
    const colors = [
      "bg-blue-100 text-blue-800",
      "bg-green-100 text-green-800",
      "bg-purple-100 text-purple-800",
      "bg-yellow-100 text-yellow-800",
      "bg-red-100 text-red-800",
      "bg-indigo-100 text-indigo-800",
      "bg-pink-100 text-pink-800",
      "bg-teal-100 text-teal-800"
    ];
    
    const index = Math.abs(name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)) % colors.length;
    return colors[index];
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'OWNER':
        return 'bg-purple-600 hover:bg-purple-700';
      case 'ADMIN':
        return 'bg-blue-600 hover:bg-blue-700';
      default:
        return 'bg-gray-600 hover:bg-gray-700';
    }
  };

  const getStatusBadgeVariant = (status: string | undefined) => {
    if (!status) return 'bg-gray-400';
    switch (status.toUpperCase()) {
      case 'ACTIVE':
        return 'bg-green-600';
      case 'PENDING':
        return 'bg-yellow-600';
      default:
        return 'bg-gray-600';
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
      <Card className="overflow-hidden border border-gray-200 dark:border-gray-800 animate-fadeIn">
        <div className="overflow-x-auto">
          <table className="w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800/50">
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
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
              {members.map((member, index) => (
                <tr 
                  key={member.id} 
                  className={`${member.email === currentUserEmail ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''} hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors`}
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <Avatar className={`h-10 w-10 ${getAvatarColor(member.name)} dark:bg-gray-800 dark:text-gray-300`}>
                          <AvatarImage src="" alt={member.name} />
                          <AvatarFallback>{getInitials(member.name)}</AvatarFallback>
                        </Avatar>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900 dark:text-white flex items-center">
                          {member.name}
                          {member.email === currentUserEmail && (
                            <Badge variant="outline" className="ml-2 border-blue-200 text-blue-700 dark:border-blue-800 dark:text-blue-400 text-xs">
                              You
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center mt-1">
                          <Mail className="h-3 w-3 mr-1 inline-block" />
                          {member.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge className={getRoleBadgeVariant(member.role)}>
                      {member.role.toLowerCase()}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center">
                      <Calendar className="h-3.5 w-3.5 mr-1.5" />
                      {new Date(member.joinedAt).toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'short', 
                        day: 'numeric' 
                      })}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Badge 
                        className={`${getStatusBadgeVariant(member.status)}`}
                      >
                        <div className="flex items-center space-x-1">
                          {member.status?.toUpperCase() === 'ACTIVE' ? (
                            <CheckCircle className="h-3 w-3 mr-1" />
                          ) : (
                            <Clock className="h-3 w-3 mr-1" />
                          )}
                          <span>{member.status?.toLowerCase() || 'active'}</span>
                        </div>
                      </Badge>
                    </div>
                  </td>
                  {canManageMembers && (
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-full">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Actions</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56 animate-scaleIn">
                          <DropdownMenuItem className="cursor-pointer">
                            <UserCog className="h-4 w-4 mr-2" />
                            <span>Change role</span>
                          </DropdownMenuItem>
                          
                          <DropdownMenuSeparator />
                          
                          {(userRole === 'OWNER' || (userRole === 'ADMIN' && member.role !== 'OWNER')) && 
                            member.email !== currentUserEmail && (
                            <DropdownMenuItem 
                              className="text-red-600 focus:text-red-600 cursor-pointer"
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
      </Card>

      <Dialog 
        open={removeMemberDialogOpen} 
        onOpenChange={setRemoveMemberDialogOpen}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center text-red-600 dark:text-red-400">
              <AlertCircle className="h-5 w-5 mr-2" />
              Remove team member
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to remove <span className="font-medium">{memberToRemove?.name}</span> from this workspace?<br />
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-md flex items-start">
              <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
          
          <DialogFooter className="sm:justify-end">
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
              className="gap-1"
            >
              {isRemoving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Removing...
                </>
              ) : (
                <>
                  <UserMinus className="mr-2 h-4 w-4" />
                  Remove Member
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 