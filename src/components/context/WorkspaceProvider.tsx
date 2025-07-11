import React, { createContext, useContext, ReactNode } from 'react';
import { useWorkspaceContext } from '@/hooks/useWorkspaceContext';

interface WorkspaceContext {
  id: string;
  name: string;
  slug: string;
}

interface ProjectContext {
  id: string;
  name: string;
  slug: string;
  workspaceId: string;
}

interface WorkspaceContextType {
  currentWorkspace: WorkspaceContext | null;
  currentProject: ProjectContext | null;
  availableWorkspaces: WorkspaceContext[];
  availableProjects: ProjectContext[];
  isLoading: boolean;
  error: string | null;
  setCurrentWorkspace: (workspace: WorkspaceContext) => Promise<void>;
  setCurrentProject: (project: ProjectContext | null) => Promise<void>;
  refreshWorkspaces: () => Promise<void>;
  refreshProjects: () => Promise<void> | undefined;
}

const WorkspaceContextProvider = createContext<WorkspaceContextType | undefined>(undefined);

interface WorkspaceProviderProps {
  children: ReactNode;
}

export function WorkspaceProvider({ children }: WorkspaceProviderProps) {
  const contextValue = useWorkspaceContext();

  return (
    <WorkspaceContextProvider.Provider value={contextValue}>
      {children}
    </WorkspaceContextProvider.Provider>
  );
}

export function useWorkspace(): WorkspaceContextType {
  const context = useContext(WorkspaceContextProvider);
  if (context === undefined) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
}

// Utility hook to get just the current context
export function useCurrentContext() {
  const { currentWorkspace, currentProject } = useWorkspace();
  
  return {
    workspaceId: currentWorkspace?.id || null,
    projectId: currentProject?.id || null,
    workspace: currentWorkspace,
    project: currentProject,
  };
}

// Hook for components that need workspace context validation
export function useRequiredWorkspace() {
  const { currentWorkspace, isLoading, error } = useWorkspace();
  
  if (isLoading) {
    return { workspace: null, isLoading: true, error: null };
  }
  
  if (!currentWorkspace) {
    return { 
      workspace: null, 
      isLoading: false, 
      error: error || 'No workspace selected' 
    };
  }
  
  return { workspace: currentWorkspace, isLoading: false, error: null };
}

// Hook for components that need project context validation
export function useRequiredProject() {
  const { currentProject, currentWorkspace, isLoading, error } = useWorkspace();
  
  if (isLoading) {
    return { project: null, workspace: null, isLoading: true, error: null };
  }
  
  if (!currentWorkspace) {
    return { 
      project: null, 
      workspace: null, 
      isLoading: false, 
      error: 'No workspace selected' 
    };
  }
  
  if (!currentProject) {
    return { 
      project: null, 
      workspace: currentWorkspace, 
      isLoading: false, 
      error: error || 'No project selected' 
    };
  }
  
  return { 
    project: currentProject, 
    workspace: currentWorkspace, 
    isLoading: false, 
    error: null 
  };
}

// Context-aware breadcrumb hook
export function useBreadcrumbs() {
  const { currentWorkspace, currentProject } = useWorkspace();
  
  const breadcrumbs = [];
  
  if (currentWorkspace) {
    breadcrumbs.push({
      label: currentWorkspace.name,
      href: `/workspaces/${currentWorkspace.id}`,
      isActive: !currentProject,
    });
  }
  
  if (currentProject) {
    breadcrumbs.push({
      label: currentProject.name,
      href: `/projects/${currentProject.id}`,
      isActive: true,
    });
  }
  
  return breadcrumbs;
} 