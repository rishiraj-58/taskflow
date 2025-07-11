import { ReactNode } from 'react';
import { usePermissions } from '@/hooks/usePermissions';
import { Resource, Action } from '@/lib/permissions';

interface PermissionGateProps {
  resource: Resource;
  action: Action;
  context?: Record<string, any>;
  children: ReactNode;
  fallback?: ReactNode;
  className?: string;
}

export function PermissionGate({
  resource,
  action,
  context,
  children,
  fallback = null,
  className
}: PermissionGateProps) {
  const { can } = usePermissions();
  
  if (can(resource, action, context)) {
    return (
      <div className={className}>
        {children}
      </div>
    );
  }
  
  return <>{fallback}</>;
}

// Convenience components for common permission patterns
export function AdminOnly({ children, fallback = null }: { children: ReactNode; fallback?: ReactNode }) {
  const { isAdmin } = usePermissions();
  
  if (isAdmin()) {
    return <>{children}</>;
  }
  
  return <>{fallback}</>;
}

export function ManagerOnly({ children, fallback = null }: { children: ReactNode; fallback?: ReactNode }) {
  const { isManager } = usePermissions();
  
  if (isManager()) {
    return <>{children}</>;
  }
  
  return <>{fallback}</>;
}

export function RoleGate({ 
  allowedRoles, 
  children, 
  fallback = null 
}: { 
  allowedRoles: string[]; 
  children: ReactNode; 
  fallback?: ReactNode;
}) {
  const { hasAnyRole } = usePermissions();
  
  if (hasAnyRole(allowedRoles as any)) {
    return <>{children}</>;
  }
  
  return <>{fallback}</>;
} 