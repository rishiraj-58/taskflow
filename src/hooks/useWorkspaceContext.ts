import { useState, useEffect, useCallback } from 'react';
import { useUser } from '@clerk/nextjs';

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

interface ContextState {
  currentWorkspace: WorkspaceContext | null;
  currentProject: ProjectContext | null;
  availableWorkspaces: WorkspaceContext[];
  availableProjects: ProjectContext[];
  isLoading: boolean;
  error: string | null;
}

export function useWorkspaceContext() {
  const { user } = useUser();
  const [state, setState] = useState<ContextState>({
    currentWorkspace: null,
    currentProject: null,
    availableWorkspaces: [],
    availableProjects: [],
    isLoading: false,
    error: null,
  });

  // Load available workspaces for the user
  const loadWorkspaces = useCallback(async () => {
    if (!user) return;

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await fetch('/api/workspaces');
      if (!response.ok) throw new Error('Failed to load workspaces');
      
      const workspaces = await response.json();
      setState(prev => ({ 
        ...prev, 
        availableWorkspaces: workspaces,
        isLoading: false 
      }));

      // Set current workspace if not set
      if (!state.currentWorkspace && workspaces.length > 0) {
        setCurrentWorkspace(workspaces[0]);
      }
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Unknown error',
        isLoading: false 
      }));
    }
  }, [user]);

  // Load available projects for current workspace
  const loadProjects = useCallback(async (workspaceId: string) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await fetch(`/api/workspaces/${workspaceId}/projects`);
      if (!response.ok) throw new Error('Failed to load projects');
      
      const projects = await response.json();
      setState(prev => ({ 
        ...prev, 
        availableProjects: projects,
        isLoading: false 
      }));
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Unknown error',
        isLoading: false 
      }));
    }
  }, []);

  // Switch to a different workspace
  const setCurrentWorkspace = useCallback(async (workspace: WorkspaceContext) => {
    setState(prev => ({ 
      ...prev, 
      currentWorkspace: workspace,
      currentProject: null, // Reset project when switching workspace
      availableProjects: []
    }));

    // Load projects for the new workspace
    await loadProjects(workspace.id);

    // Persist the context switch
    try {
      await fetch('/api/user/context', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          workspaceId: workspace.id,
          projectId: null 
        })
      });
    } catch (error) {
      console.warn('Failed to persist workspace context:', error);
    }
  }, [loadProjects]);

  // Switch to a different project
  const setCurrentProject = useCallback(async (project: ProjectContext | null) => {
    setState(prev => ({ ...prev, currentProject: project }));

    // Persist the context switch
    try {
      await fetch('/api/user/context', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          workspaceId: state.currentWorkspace?.id,
          projectId: project?.id || null 
        })
      });
    } catch (error) {
      console.warn('Failed to persist project context:', error);
    }
  }, [state.currentWorkspace?.id]);

  // Load user's last context on mount
  useEffect(() => {
    if (!user) return;

    const loadLastContext = async () => {
      try {
        const response = await fetch('/api/user/context');
        if (response.ok) {
          const context = await response.json();
          if (context.workspace) {
            setState(prev => ({ 
              ...prev, 
              currentWorkspace: context.workspace 
            }));
            
            if (context.workspace.id) {
              await loadProjects(context.workspace.id);
            }
            
            if (context.project) {
              setState(prev => ({ 
                ...prev, 
                currentProject: context.project 
              }));
            }
          }
        }
      } catch (error) {
        console.warn('Failed to load last context:', error);
      }
    };

    loadWorkspaces();
    loadLastContext();
  }, [user, loadWorkspaces, loadProjects]);

  return {
    ...state,
    setCurrentWorkspace,
    setCurrentProject,
    refreshWorkspaces: loadWorkspaces,
    refreshProjects: () => state.currentWorkspace ? loadProjects(state.currentWorkspace.id) : undefined,
  };
} 