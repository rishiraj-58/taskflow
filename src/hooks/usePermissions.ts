import { useUser } from '@clerk/nextjs';
import { useUserRole } from './useUserRole';
import { checkPermission, getAllowedActions, type Resource, type Action, type UserRole } from '@/lib/permissions';

export function usePermissions() {
  const { user } = useUser();
  const { role: userRole, loading: roleLoading } = useUserRole();
  
  // Use role from database, fallback to DEVELOPER if not loaded yet
  const effectiveRole = userRole || 'DEVELOPER';
  
  const can = (resource: Resource, action: Action, context?: Record<string, any>) => {
    if (!user) return false;
    return checkPermission(effectiveRole, resource, action, context);
  };
  
  const cannot = (resource: Resource, action: Action, context?: Record<string, any>) => {
    return !can(resource, action, context);
  };
  
  const getAllowed = (resource: Resource, context?: Record<string, any>) => {
    if (!user) return [];
    return getAllowedActions(effectiveRole, resource, context);
  };
  
  const hasRole = (requiredRole: UserRole) => {
    return effectiveRole === requiredRole;
  };
  
  const hasAnyRole = (requiredRoles: UserRole[]) => {
    return requiredRoles.includes(effectiveRole);
  };
  
  const isAdmin = () => {
    return effectiveRole === 'WORKSPACE_CREATOR' || effectiveRole === 'WORKSPACE_ADMIN';
  };
  
  const isManager = () => {
    return effectiveRole === 'PROJECT_MANAGER' || effectiveRole === 'TEAM_LEAD' || isAdmin();
  };
  
  return {
    can,
    cannot,
    getAllowed,
    hasRole,
    hasAnyRole,
    isAdmin,
    isManager,
    role: effectiveRole,
    user,
  };
} 