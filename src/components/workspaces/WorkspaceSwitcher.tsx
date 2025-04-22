"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  ChevronDown, 
  Plus, 
  Check, 
  ChevronsUpDown, 
  Building2, 
  Loader2 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface Workspace {
  id: string;
  name: string;
}

export default function WorkspaceSwitcher({ 
  currentWorkspaceId,
  onCreateWorkspace
}: { 
  currentWorkspaceId?: string;
  onCreateWorkspace: () => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(null);

  useEffect(() => {
    const fetchWorkspaces = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/workspaces");
        
        if (!response.ok) {
          throw new Error("Failed to fetch workspaces");
        }
        
        const data = await response.json();
        setWorkspaces(data);
        
        // Set current workspace
        if (currentWorkspaceId) {
          const current = data.find((w: Workspace) => w.id === currentWorkspaceId);
          if (current) {
            setCurrentWorkspace(current);
          }
        }
      } catch (error) {
        console.error("Error fetching workspaces:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchWorkspaces();
  }, [currentWorkspaceId]);

  const handleSelect = (workspace: Workspace) => {
    setOpen(false);
    router.push(`/workspaces/${workspace.id}`);
  };

  const handleViewAllWorkspaces = () => {
    setOpen(false);
    router.push("/workspaces");
  };

  if (loading) {
    return (
      <Button variant="outline" className="w-full justify-between" disabled>
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        <span>Loading workspaces...</span>
      </Button>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-label="Select a workspace"
          className="w-full justify-between"
        >
          {currentWorkspace ? (
            <>
              <Building2 className="mr-2 h-4 w-4" />
              <span className="truncate">{currentWorkspace.name}</span>
            </>
          ) : (
            <>
              <Building2 className="mr-2 h-4 w-4" />
              <span>Select a workspace</span>
            </>
          )}
          <ChevronsUpDown className="ml-auto h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0">
        <Command>
          <CommandInput placeholder="Search workspace..." />
          <CommandList>
            <CommandEmpty>No workspace found.</CommandEmpty>
            {workspaces.length > 0 && (
              <CommandGroup heading="Your workspaces">
                {workspaces.map((workspace) => (
                  <CommandItem
                    key={workspace.id}
                    onSelect={() => handleSelect(workspace)}
                    className="flex items-center"
                  >
                    <Building2 className="mr-2 h-4 w-4" />
                    <span className="flex-1 truncate">{workspace.name}</span>
                    {currentWorkspaceId === workspace.id && (
                      <Check className="ml-auto h-4 w-4 text-green-600" />
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            <CommandSeparator />
            <CommandGroup>
              <CommandItem onSelect={onCreateWorkspace}>
                <Plus className="mr-2 h-4 w-4" />
                Create new workspace
              </CommandItem>
              <CommandItem onSelect={handleViewAllWorkspaces}>
                <ChevronDown className="mr-2 h-4 w-4" />
                View all workspaces
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
} 