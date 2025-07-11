'use client';

import { useState } from 'react';
import { useUser, UserButton } from '@clerk/nextjs';
import { useWorkspaceContext } from '@/hooks/useWorkspaceContext';
import { usePermissions } from '@/hooks/usePermissions';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { 
  Menu,
  ChevronDown,
  Building2,
  FolderOpen,
  Plus,
  Settings
} from 'lucide-react';
import Logo from '@/components/Logo';

interface NavigationHeaderProps {
  onMobileMenuToggle?: () => void;
}

export function NavigationHeader({ onMobileMenuToggle }: NavigationHeaderProps) {
  const { user } = useUser();
  const { 
    currentWorkspace, 
    currentProject, 
    availableWorkspaces: workspaces, 
    availableProjects: projects,
    setCurrentWorkspace,
    setCurrentProject 
  } = useWorkspaceContext();
  const { role: userRole, can } = usePermissions();

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'WORKSPACE_CREATOR': return 'bg-purple-100 text-purple-800';
      case 'PROJECT_MANAGER': return 'bg-blue-100 text-blue-800';
      case 'DEVELOPER': return 'bg-green-100 text-green-800';
      case 'STAKEHOLDER': return 'bg-orange-100 text-orange-800';
      case 'TEAM_LEAD': return 'bg-indigo-100 text-indigo-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'WORKSPACE_CREATOR': return 'Executive';
      case 'PROJECT_MANAGER': return 'PM';
      case 'DEVELOPER': return 'Developer';
      case 'STAKEHOLDER': return 'Stakeholder';
      case 'TEAM_LEAD': return 'Tech Lead';
      default: return role;
    }
  };

  return (
    <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-50">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left side */}
          <div className="flex items-center space-x-4">
            {/* Mobile menu button */}
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden"
              onClick={onMobileMenuToggle}
            >
              <Menu className="w-5 h-5" />
            </Button>

            {/* Logo */}
            <div className="flex-shrink-0">
              <Logo />
            </div>

            {/* Workspace Selector */}
            <div className="hidden sm:flex items-center space-x-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="max-w-xs">
                    <Building2 className="w-4 h-4 mr-2" />
                    <span className="truncate">
                      {currentWorkspace?.name || 'Select Workspace'}
                    </span>
                    <ChevronDown className="w-4 h-4 ml-2" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-64">
                  <DropdownMenuLabel>Switch Workspace</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {workspaces.map((workspace) => (
                    <DropdownMenuItem
                      key={workspace.id}
                      onClick={() => setCurrentWorkspace(workspace)}
                      className={currentWorkspace?.id === workspace.id ? 'bg-blue-50' : ''}
                    >
                      <Building2 className="w-4 h-4 mr-2" />
                      <div>
                        <div className="font-medium">{workspace.name}</div>
                      </div>
                    </DropdownMenuItem>
                  ))}
                  {can('workspace', 'create') && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem>
                        <Plus className="w-4 h-4 mr-2" />
                        Create New Workspace
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Project Selector */}
              {currentWorkspace && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="max-w-xs">
                      <FolderOpen className="w-4 h-4 mr-2" />
                      <span className="truncate">
                        {currentProject?.name || 'Select Project'}
                      </span>
                      <ChevronDown className="w-4 h-4 ml-2" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-64">
                    <DropdownMenuLabel>Switch Project</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => setCurrentProject(null)}
                      className={!currentProject ? 'bg-blue-50' : ''}
                    >
                      <Building2 className="w-4 h-4 mr-2" />
                      All Projects
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    {projects.map((project) => (
                      <DropdownMenuItem
                        key={project.id}
                        onClick={() => setCurrentProject(project)}
                        className={currentProject?.id === project.id ? 'bg-blue-50' : ''}
                      >
                        <FolderOpen className="w-4 h-4 mr-2" />
                        <div>
                          <div className="font-medium">{project.name}</div>
                        </div>
                      </DropdownMenuItem>
                    ))}
                    {can('project', 'create') && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem>
                          <Plus className="w-4 h-4 mr-2" />
                          Create New Project
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>

          {/* Right side */}
          <div className="flex items-center space-x-4">
            {/* User Role Badge */}
            {userRole && (
              <Badge 
                variant="secondary" 
                className={`hidden sm:inline-flex ${getRoleColor(userRole)}`}
              >
                {getRoleDisplayName(userRole)}
              </Badge>
            )}

            {/* Settings Button */}
            <Button variant="ghost" size="sm">
              <Settings className="w-4 h-4" />
            </Button>

            {/* User Menu */}
            <div className="flex items-center">
              <UserButton 
                afterSignOutUrl="/"
                appearance={{
                  elements: {
                    userButtonAvatarBox: "w-8 h-8",
                  },
                }}
              />
            </div>
          </div>
        </div>

        {/* Mobile context bar */}
        <div className="sm:hidden border-t border-gray-200 py-2">
          <div className="flex items-center space-x-2 text-sm">
            <span className="text-gray-500">Workspace:</span>
            <span className="font-medium truncate">
              {currentWorkspace?.name || 'None'}
            </span>
            {currentProject && (
              <>
                <span className="text-gray-400">•</span>
                <span className="text-gray-500">Project:</span>
                <span className="font-medium truncate">{currentProject.name}</span>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
} 