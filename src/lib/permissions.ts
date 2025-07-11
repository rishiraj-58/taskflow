export type Resource = 'workspace' | 'project' | 'task' | 'sprint' | 'bug' | 'team' | 'document' | 'roadmap';
export type Action = 'create' | 'read' | 'update' | 'delete' | 'assign' | 'manage' | 'view';

export type UserRole = 
  | 'WORKSPACE_CREATOR'
  | 'WORKSPACE_ADMIN' 
  | 'PROJECT_MANAGER'
  | 'DEVELOPER'
  | 'STAKEHOLDER'
  | 'TEAM_LEAD';

export interface Permission {
  resource: Resource;
  action: Action;
  conditions?: Record<string, any>;
}

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  WORKSPACE_CREATOR: [
    { resource: 'workspace', action: 'manage' },
    { resource: 'project', action: 'manage' },
    { resource: 'task', action: 'manage' },
    { resource: 'sprint', action: 'manage' },
    { resource: 'bug', action: 'manage' },
    { resource: 'team', action: 'manage' },
    { resource: 'document', action: 'manage' },
    { resource: 'roadmap', action: 'manage' },
  ],
  
  WORKSPACE_ADMIN: [
    { resource: 'workspace', action: 'manage' },
    { resource: 'project', action: 'manage' },
    { resource: 'task', action: 'manage' },
    { resource: 'sprint', action: 'manage' },
    { resource: 'bug', action: 'manage' },
    { resource: 'team', action: 'manage' },
    { resource: 'document', action: 'manage' },
    { resource: 'roadmap', action: 'manage' },
  ],
  
  PROJECT_MANAGER: [
    { resource: 'workspace', action: 'view' },
    { resource: 'project', action: 'manage', conditions: { assigned: true } },
    { resource: 'task', action: 'manage', conditions: { projectAccess: true } },
    { resource: 'sprint', action: 'manage', conditions: { projectAccess: true } },
    { resource: 'bug', action: 'manage', conditions: { projectAccess: true } },
    { resource: 'team', action: 'assign', conditions: { projectAccess: true } },
    { resource: 'document', action: 'manage', conditions: { projectAccess: true } },
    { resource: 'roadmap', action: 'manage', conditions: { projectAccess: true } },
  ],
  
  DEVELOPER: [
    { resource: 'workspace', action: 'view' },
    { resource: 'project', action: 'view', conditions: { member: true } },
    { resource: 'task', action: 'read' },
    { resource: 'task', action: 'update', conditions: { assigned: true } },
    { resource: 'task', action: 'create', conditions: { projectAccess: true } },
    { resource: 'sprint', action: 'view', conditions: { projectAccess: true } },
    { resource: 'bug', action: 'create' },
    { resource: 'bug', action: 'update', conditions: { assigned: true } },
    { resource: 'bug', action: 'view', conditions: { projectAccess: true } },
    { resource: 'document', action: 'read', conditions: { projectAccess: true } },
    { resource: 'document', action: 'create', conditions: { projectAccess: true } },
  ],
  
  STAKEHOLDER: [
    { resource: 'workspace', action: 'view', conditions: { member: true } },
    { resource: 'project', action: 'view', conditions: { member: true } },
    { resource: 'task', action: 'view', conditions: { projectAccess: true } },
    { resource: 'sprint', action: 'view', conditions: { projectAccess: true } },
    { resource: 'bug', action: 'view', conditions: { projectAccess: true } },
    { resource: 'document', action: 'read', conditions: { projectAccess: true } },
    { resource: 'roadmap', action: 'view', conditions: { projectAccess: true } },
  ],
  
  TEAM_LEAD: [
    { resource: 'workspace', action: 'view' },
    { resource: 'project', action: 'view', conditions: { member: true } },
    { resource: 'project', action: 'manage', conditions: { assigned: true } },
    { resource: 'task', action: 'manage', conditions: { projectAccess: true } },
    { resource: 'sprint', action: 'manage', conditions: { projectAccess: true } },
    { resource: 'bug', action: 'manage', conditions: { projectAccess: true } },
    { resource: 'team', action: 'assign', conditions: { projectAccess: true } },
    { resource: 'document', action: 'manage', conditions: { projectAccess: true } },
    { resource: 'roadmap', action: 'view', conditions: { projectAccess: true } },
  ],
};

export function checkPermission(
  userRole: UserRole,
  resource: Resource,
  action: Action,
  context?: Record<string, any>
): boolean {
  const rolePermissions = ROLE_PERMISSIONS[userRole] || [];
  
  return rolePermissions.some(permission => {
    // Check if resource and action match
    if (permission.resource !== resource) {
      return false;
    }
    
    // Check if action matches or if permission has 'manage' (which includes all actions)
    if (permission.action !== action && permission.action !== 'manage') {
      return false;
    }
    
    // Check conditions if any
    if (permission.conditions && context) {
      return Object.entries(permission.conditions).every(([key, value]) => {
        return context[key] === value;
      });
    }
    
    // If no conditions or context not provided, allow if permission exists
    return !permission.conditions;
  });
}

export function getAllowedActions(
  userRole: UserRole,
  resource: Resource,
  context?: Record<string, any>
): Action[] {
  const rolePermissions = ROLE_PERMISSIONS[userRole] || [];
  const allowedActions: Action[] = [];
  
  const actions: Action[] = ['create', 'read', 'update', 'delete', 'assign', 'manage', 'view'];
  
  actions.forEach(action => {
    if (checkPermission(userRole, resource, action, context)) {
      allowedActions.push(action);
    }
  });
  
  return allowedActions;
}

export function canAccessWorkspace(userRole: UserRole, isOwner: boolean, isMember: boolean): boolean {
  if (userRole === 'WORKSPACE_CREATOR' && isOwner) return true;
  if (userRole === 'WORKSPACE_ADMIN' && (isOwner || isMember)) return true;
  return isMember;
}

export function canAccessProject(userRole: UserRole, isProjectManager: boolean, isMember: boolean): boolean {
  if (userRole === 'WORKSPACE_CREATOR') return true;
  if (userRole === 'WORKSPACE_ADMIN') return true;
  if (userRole === 'PROJECT_MANAGER' && isProjectManager) return true;
  return isMember;
} 