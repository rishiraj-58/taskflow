"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { Search, User, Mail, Crown, Shield, Users, Plus, Check } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";

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

interface TeamMemberBrowserProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  onSelect: (members: TeamMember[]) => void;
  selectedMemberIds?: string[];
  multiSelect?: boolean;
  title?: string;
  description?: string;
  excludeCurrentUser?: boolean;
}

export default function TeamMemberBrowser({ 
  isOpen, 
  onClose, 
  workspaceId, 
  onSelect, 
  selectedMemberIds = [],
  multiSelect = true,
  title = "Select Team Members",
  description = "Choose team members to add to this project",
  excludeCurrentUser = false
}: TeamMemberBrowserProps) {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [filteredMembers, setFilteredMembers] = useState<TeamMember[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>(selectedMemberIds);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && workspaceId) {
      fetchTeamMembers();
    }
  }, [isOpen, workspaceId]);

  useEffect(() => {
    setSelectedIds(selectedMemberIds);
  }, [selectedMemberIds]);

  useEffect(() => {
    // Filter members based on search query
    if (!searchQuery.trim()) {
      setFilteredMembers(members);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = members.filter(member => 
        member.name.toLowerCase().includes(query) ||
        member.email.toLowerCase().includes(query) ||
        member.firstName.toLowerCase().includes(query) ||
        member.lastName.toLowerCase().includes(query)
      );
      setFilteredMembers(filtered);
    }
  }, [searchQuery, members]);

  const fetchTeamMembers = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/workspaces/${workspaceId}/members`);
      
      if (!response.ok) {
        throw new Error("Failed to fetch team members");
      }
      
      const data = await response.json();
      setMembers(data);
      setFilteredMembers(data);
    } catch (error) {
      console.error("Error fetching team members:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load team members. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleMemberToggle = (member: TeamMember) => {
    if (multiSelect) {
      setSelectedIds(prev => 
        prev.includes(member.userId) 
          ? prev.filter(id => id !== member.userId)
          : [...prev, member.userId]
      );
    } else {
      setSelectedIds([member.userId]);
    }
  };

  const handleConfirm = () => {
    const selectedMembers = members.filter(member => selectedIds.includes(member.userId));
    onSelect(selectedMembers);
    onClose();
  };

  const handleClose = () => {
    setSearchQuery("");
    setSelectedIds(selectedMemberIds);
    onClose();
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return <Crown className="h-3 w-3 text-yellow-600" />;
      case 'MEMBER':
        return <User className="h-3 w-3 text-blue-600" />;
      default:
        return <User className="h-3 w-3 text-gray-600" />;
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return <Badge variant="default" className="bg-yellow-100 text-yellow-800 text-xs">Admin</Badge>;
      case 'MEMBER':
        return <Badge variant="secondary" className="text-xs">Member</Badge>;
      default:
        return <Badge variant="outline" className="text-xs">{role}</Badge>;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {title}
          </DialogTitle>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </DialogHeader>
        
        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search team members by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Selected Count */}
          {multiSelect && selectedIds.length > 0 && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Check className="h-4 w-4" />
              {selectedIds.length} member{selectedIds.length !== 1 ? 's' : ''} selected
            </div>
          )}

          {/* Loading State */}
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                <p className="text-sm text-muted-foreground">Loading team members...</p>
              </div>
            </div>
          )}

          {/* Members List */}
          {!isLoading && (
            <div className="flex-1 overflow-y-auto space-y-2">
              {filteredMembers.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    {searchQuery ? "No members found" : "No team members"}
                  </h3>
                  <p className="text-gray-500">
                    {searchQuery 
                      ? "Try adjusting your search terms" 
                      : "This workspace doesn't have any team members yet"
                    }
                  </p>
                </div>
              ) : (
                filteredMembers.map((member) => (
                  <Card 
                    key={member.userId} 
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      selectedIds.includes(member.userId) 
                        ? 'ring-2 ring-blue-500 bg-blue-50' 
                        : 'hover:bg-gray-50'
                    }`}
                    onClick={() => handleMemberToggle(member)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        {multiSelect && (
                          <Checkbox 
                            checked={selectedIds.includes(member.userId)}
                            readOnly
                          />
                        )}
                        
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={member.imageUrl} alt={member.name} />
                          <AvatarFallback>
                            {member.firstName.charAt(0)}{member.lastName.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium text-gray-900 truncate">
                              {member.name || `${member.firstName} ${member.lastName}`}
                            </h4>
                            {getRoleBadge(member.role)}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-500">
                            <Mail className="h-3 w-3" />
                            <span className="truncate">{member.email}</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-gray-400 mt-1">
                            <span>Joined {new Date(member.joinedAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {getRoleIcon(member.role)}
                          {selectedIds.includes(member.userId) && (
                            <Check className="h-4 w-4 text-blue-600" />
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          )}
        </div>

        <DialogFooter className="pt-4">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleConfirm} 
            disabled={selectedIds.length === 0}
          >
            {multiSelect 
              ? `Add ${selectedIds.length} Member${selectedIds.length !== 1 ? 's' : ''}`
              : 'Select Member'
            }
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 