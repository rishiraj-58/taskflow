'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { UserRole } from '@prisma/client';
import { usePermissions } from '@/hooks/usePermissions';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  FolderOpen,
  CheckSquare,
  Users,
  Calendar,
  Bug,
  BarChart3,
  Settings,
  Zap,
  Target,
  Code2,
  Eye,
  ShieldCheck,
  X
} from 'lucide-react';

interface SidebarProps {
  workspace: any;
  project: any;
  userRole: UserRole | null;
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
}

interface NavigationItem {
  name: string;
  href: string;
  icon: any;
  badge?: string;
  roles: UserRole[];
  requiresProject?: boolean;
}

const navigationItems: NavigationItem[] = [
  // Universal Dashboard (role-based routing)
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    roles: [UserRole.WORKSPACE_CREATOR, UserRole.PROJECT_MANAGER, UserRole.DEVELOPER, UserRole.STAKEHOLDER, UserRole.TEAM_LEAD],
  },
  
  // Common Navigation (visible to multiple roles)
  {
    name: 'Projects',
    href: '/projects',
    icon: FolderOpen,
    roles: [UserRole.WORKSPACE_CREATOR, UserRole.PROJECT_MANAGER, UserRole.DEVELOPER, UserRole.STAKEHOLDER, UserRole.TEAM_LEAD],
  },
  {
    name: 'My Tasks',
    href: '/tasks',
    icon: CheckSquare,
    roles: [UserRole.DEVELOPER, UserRole.PROJECT_MANAGER, UserRole.TEAM_LEAD],
  },
  {
    name: 'Sprint Planning',
    href: '/sprints',
    icon: Calendar,
    roles: [UserRole.PROJECT_MANAGER, UserRole.TEAM_LEAD],
    requiresProject: true,
  },
  {
    name: 'Team Management',
    href: '/team',
    icon: Users,
    roles: [UserRole.PROJECT_MANAGER, UserRole.TEAM_LEAD, UserRole.WORKSPACE_CREATOR],
  },
  {
    name: 'Bug Tracking',
    href: '/bugs',
    icon: Bug,
    roles: [UserRole.PROJECT_MANAGER, UserRole.DEVELOPER, UserRole.TEAM_LEAD],
    requiresProject: true,
  },
  {
    name: 'Analytics',
    href: '/analytics',
    icon: BarChart3,
    roles: [UserRole.WORKSPACE_CREATOR, UserRole.PROJECT_MANAGER, UserRole.STAKEHOLDER],
  },
  {
    name: 'AI Assistant',
    href: '/ai',
    icon: Zap,
    roles: [UserRole.WORKSPACE_CREATOR, UserRole.PROJECT_MANAGER, UserRole.DEVELOPER, UserRole.STAKEHOLDER, UserRole.TEAM_LEAD],
  },
];

export function Sidebar({ workspace, project, userRole, isMobileOpen, onMobileClose }: SidebarProps) {
  const pathname = usePathname();
  const { can } = usePermissions();

  const filteredItems = navigationItems.filter(item => {
    // Check if user role is allowed for this item
    if (!userRole || !item.roles.includes(userRole)) {
      return false;
    }
    
    // Check if item requires a project and we have one
    if (item.requiresProject && !project) {
      return false;
    }
    
    return true;
  });

  const handleItemClick = () => {
    if (onMobileClose) {
      onMobileClose();
    }
  };

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Mobile close button */}
      {isMobileOpen && (
        <div className="flex items-center justify-between p-4 border-b border-gray-200 lg:hidden">
          <span className="text-lg font-semibold">Navigation</span>
          <Button variant="ghost" size="sm" onClick={onMobileClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>
      )}

      {/* Context Info */}
      <div className="p-4 border-b border-gray-200">
        <div className="space-y-2">
          {workspace && (
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Workspace</p>
              <p className="text-sm font-medium text-gray-900 truncate">{workspace.name}</p>
            </div>
          )}
          {project && (
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Project</p>
              <p className="text-sm font-medium text-gray-900 truncate">{project.name}</p>
            </div>
          )}
        </div>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {filteredItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={handleItemClick}
              className={cn(
                'group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors',
                isActive
                  ? 'bg-blue-100 text-blue-700 border-r-2 border-blue-700'
                  : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
              )}
            >
              <item.icon
                className={cn(
                  'mr-3 h-5 w-5 flex-shrink-0',
                  isActive ? 'text-blue-700' : 'text-gray-400 group-hover:text-gray-500'
                )}
              />
              <span className="truncate">{item.name}</span>
              {item.badge && (
                <Badge variant="secondary" className="ml-auto">
                  {item.badge}
                </Badge>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Settings */}
      <div className="p-4 border-t border-gray-200">
        <Link
          href="/settings"
          onClick={handleItemClick}
          className={cn(
            'group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors',
            pathname === '/settings'
              ? 'bg-blue-100 text-blue-700'
              : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
          )}
        >
          <Settings className="mr-3 h-5 w-5 flex-shrink-0 text-gray-400 group-hover:text-gray-500" />
          Settings
        </Link>
      </div>
    </div>
  );

  // Mobile sidebar
  if (isMobileOpen) {
    return (
      <>
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-gray-600 bg-opacity-75 z-40 lg:hidden" 
          onClick={onMobileClose}
        />
        
        {/* Sidebar */}
        <div className="fixed inset-y-0 left-0 flex flex-col w-64 bg-white border-r border-gray-200 z-50 lg:hidden">
          {sidebarContent}
        </div>
      </>
    );
  }

  // Desktop sidebar
  return (
    <div className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 lg:pt-16 lg:bg-white lg:border-r lg:border-gray-200">
      {sidebarContent}
    </div>
  );
} 