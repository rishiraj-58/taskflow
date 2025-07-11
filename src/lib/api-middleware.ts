import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@clerk/nextjs/server';
import { checkPermission, type Resource, type Action, type UserRole } from './permissions';
import { prisma } from './prisma';

export interface AuthenticatedRequest extends NextRequest {
  userId: string;
  userRole: UserRole;
  workspaceId?: string;
  projectId?: string;
}

export interface PermissionContext {
  workspaceId?: string;
  projectId?: string;
  resourceId?: string;
  [key: string]: any;
}

/**
 * Middleware to require authentication for API routes
 */
export async function requireAuth(req: NextRequest): Promise<AuthenticatedRequest | NextResponse> {
  try {
    const { userId } = getAuth(req);
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get user from database to access role information
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: {
        id: true,
        primaryRole: true,
        lastWorkspaceId: true,
        lastProjectId: true,
      }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Extend the request with user information
    const authReq = req as AuthenticatedRequest;
    authReq.userId = user.id;
    authReq.userRole = user.primaryRole as UserRole;
    authReq.workspaceId = user.lastWorkspaceId || undefined;
    authReq.projectId = user.lastProjectId || undefined;

    return authReq;
  } catch (error) {
    console.error('Authentication error:', error);
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 }
    );
  }
}

/**
 * Middleware to require specific permissions for API routes
 */
export function requirePermission(
  resource: Resource,
  action: Action,
  contextBuilder?: (req: AuthenticatedRequest) => Promise<PermissionContext> | PermissionContext
) {
  return async function(req: AuthenticatedRequest): Promise<NextResponse | void> {
    try {
      // Build permission context
      let context: PermissionContext = {};
      if (contextBuilder) {
        context = await contextBuilder(req);
      }

      // Check if user has permission
      const hasPermission = checkPermission(req.userRole, resource, action, context);
      
      if (!hasPermission) {
        return NextResponse.json(
          { 
            error: 'Insufficient permissions',
            required: { resource, action },
            userRole: req.userRole
          },
          { status: 403 }
        );
      }

      // Permission granted, continue
      return;
    } catch (error) {
      console.error('Permission check error:', error);
      return NextResponse.json(
        { error: 'Permission check failed' },
        { status: 500 }
      );
    }
  };
}

/**
 * Middleware to validate workspace membership
 */
export async function requireWorkspaceAccess(
  req: AuthenticatedRequest,
  workspaceId: string
): Promise<NextResponse | void> {
  try {
    const membership = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: workspaceId,
          userId: req.userId,
        }
      }
    });

    if (!membership) {
      return NextResponse.json(
        { error: 'Workspace access denied' },
        { status: 403 }
      );
    }

    return;
  } catch (error) {
    console.error('Workspace access check error:', error);
    return NextResponse.json(
      { error: 'Workspace access check failed' },
      { status: 500 }
    );
  }
}

/**
 * Middleware to validate project membership
 */
export async function requireProjectAccess(
  req: AuthenticatedRequest,
  projectId: string
): Promise<NextResponse | void> {
  try {
    // Check if user has project access through project membership
    const projectMembership = await prisma.project.findFirst({
      where: {
        id: projectId,
        OR: [
          // Direct project access through workspace membership
          {
            workspace: {
              members: {
                some: {
                  userId: req.userId,
                  status: 'ACTIVE'
                }
              }
            }
          },
          // Direct project ownership
          {
            ownerId: req.userId
          }
        ]
      }
    });

    if (!projectMembership) {
      return NextResponse.json(
        { error: 'Project access denied' },
        { status: 403 }
      );
    }

    return;
  } catch (error) {
    console.error('Project access check error:', error);
    return NextResponse.json(
      { error: 'Project access check failed' },
      { status: 500 }
    );
  }
}

/**
 * Helper to extract IDs from request URL
 */
export function extractIds(req: NextRequest) {
  const url = new URL(req.url);
  const pathSegments = url.pathname.split('/').filter(Boolean);
  
  const ids: Record<string, string> = {};
  
  // Extract common ID patterns
  const workspaceIndex = pathSegments.indexOf('workspaces');
  if (workspaceIndex !== -1 && pathSegments[workspaceIndex + 1]) {
    ids.workspaceId = pathSegments[workspaceIndex + 1];
  }
  
  const projectIndex = pathSegments.indexOf('projects');
  if (projectIndex !== -1 && pathSegments[projectIndex + 1]) {
    ids.projectId = pathSegments[projectIndex + 1];
  }
  
  const taskIndex = pathSegments.indexOf('tasks');
  if (taskIndex !== -1 && pathSegments[taskIndex + 1]) {
    ids.taskId = pathSegments[taskIndex + 1];
  }
  
  const sprintIndex = pathSegments.indexOf('sprints');
  if (sprintIndex !== -1 && pathSegments[sprintIndex + 1]) {
    ids.sprintId = pathSegments[sprintIndex + 1];
  }
  
  return ids;
}

/**
 * Composite middleware that handles auth + permissions + access checks
 */
export function createProtectedRoute(
  resource: Resource,
  action: Action,
  options?: {
    requireWorkspace?: boolean;
    requireProject?: boolean;
    contextBuilder?: (req: AuthenticatedRequest) => Promise<PermissionContext> | PermissionContext;
  }
) {
  return async function(req: NextRequest): Promise<AuthenticatedRequest | NextResponse> {
    // Step 1: Require authentication
    const authResult = await requireAuth(req);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    
    const authReq = authResult as AuthenticatedRequest;
    const ids = extractIds(req);
    
    // Step 2: Check workspace access if required
    if (options?.requireWorkspace && ids.workspaceId) {
      const workspaceCheck = await requireWorkspaceAccess(authReq, ids.workspaceId);
      if (workspaceCheck) return workspaceCheck;
    }
    
    // Step 3: Check project access if required
    if (options?.requireProject && ids.projectId) {
      const projectCheck = await requireProjectAccess(authReq, ids.projectId);
      if (projectCheck) return projectCheck;
    }
    
    // Step 4: Check permissions
    const permissionCheck = await requirePermission(
      resource,
      action,
      options?.contextBuilder
    )(authReq);
    
    if (permissionCheck) return permissionCheck;
    
    // All checks passed
    return authReq;
  };
}

/**
 * Common context builders for different resource types
 */
export const contextBuilders = {
  workspace: (req: AuthenticatedRequest): PermissionContext => ({
    workspaceId: extractIds(req).workspaceId
  }),
  
  project: (req: AuthenticatedRequest): PermissionContext => ({
    workspaceId: extractIds(req).workspaceId,
    projectId: extractIds(req).projectId
  }),
  
  task: async (req: AuthenticatedRequest): Promise<PermissionContext> => {
    const ids = extractIds(req);
    
    // If we have a task ID, get project context from task
    if (ids.taskId) {
      const task = await prisma.task.findUnique({
        where: { id: ids.taskId },
        select: {
          projectId: true,
          project: {
            select: { workspaceId: true }
          }
        }
      });
      
      return {
        taskId: ids.taskId,
        projectId: task?.projectId,
        workspaceId: task?.project.workspaceId,
        isAssignee: false // TODO: Add assignee check
      };
    }
    
    return {
      workspaceId: ids.workspaceId,
      projectId: ids.projectId
    };
  }
};

// Export pre-configured middleware for common use cases
export const authMiddleware = {
  // Workspace routes
  workspace: {
    read: createProtectedRoute('workspace', 'read', { requireWorkspace: true }),
    manage: createProtectedRoute('workspace', 'manage', { requireWorkspace: true }),
  },
  
  // Project routes
  project: {
    read: createProtectedRoute('project', 'read', { 
      requireWorkspace: true, 
      requireProject: true,
      contextBuilder: contextBuilders.project
    }),
    create: createProtectedRoute('project', 'create', { 
      requireWorkspace: true,
      contextBuilder: contextBuilders.workspace
    }),
    manage: createProtectedRoute('project', 'manage', { 
      requireWorkspace: true, 
      requireProject: true,
      contextBuilder: contextBuilders.project
    }),
  },
  
  // Task routes
  task: {
    read: createProtectedRoute('task', 'read', { 
      requireProject: true,
      contextBuilder: contextBuilders.task
    }),
    create: createProtectedRoute('task', 'create', { 
      requireProject: true,
      contextBuilder: contextBuilders.project
    }),
    update: createProtectedRoute('task', 'update', { 
      requireProject: true,
      contextBuilder: contextBuilders.task
    }),
    delete: createProtectedRoute('task', 'delete', { 
      requireProject: true,
      contextBuilder: contextBuilders.task
    }),
  },
  
  // Sprint routes
  sprint: {
    read: createProtectedRoute('sprint', 'read', { 
      requireProject: true,
      contextBuilder: contextBuilders.project
    }),
    manage: createProtectedRoute('sprint', 'manage', { 
      requireProject: true,
      contextBuilder: contextBuilders.project
    }),
  },
  
  // Bug routes
  bug: {
    read: createProtectedRoute('bug', 'read', { 
      requireProject: true,
      contextBuilder: contextBuilders.project
    }),
    create: createProtectedRoute('bug', 'create', { 
      requireProject: true,
      contextBuilder: contextBuilders.project
    }),
    manage: createProtectedRoute('bug', 'manage', { 
      requireProject: true,
      contextBuilder: contextBuilders.project
    }),
  }
}; 