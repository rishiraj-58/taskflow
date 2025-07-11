'use client';

import { useUserRole } from '@/hooks/useUserRole';
import { Spinner } from '@/components/ui/spinner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

// Role-specific dashboard components (we'll create these)
import { ExecutiveDashboard } from './ExecutiveDashboard';
import { ProjectManagerDashboard } from './ProjectManagerDashboard';
import { DeveloperDashboard } from './DeveloperDashboard';
import { StakeholderDashboard } from './StakeholderDashboard';
import { TeamLeadDashboard } from './TeamLeadDashboard';

export function RoleBasedDashboard() {
  const { role, loading, error, isLoaded } = useUserRole();

  if (loading || !isLoaded) {
    return (
      <div className="flex h-64 w-full items-center justify-center">
        <div className="text-center space-y-4">
          <Spinner size="lg" />
          <p className="text-gray-600 dark:text-gray-400">Loading your personalized dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className="max-w-md mx-auto mt-8">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Failed to load dashboard. Please try refreshing the page.
        </AlertDescription>
      </Alert>
    );
  }

  // Route to appropriate dashboard based on database role
  switch (role) {
    case 'WORKSPACE_CREATOR':
      return <ExecutiveDashboard />;
    case 'PROJECT_MANAGER':
      return <ProjectManagerDashboard />;
    case 'DEVELOPER':
      return <DeveloperDashboard />;
    case 'STAKEHOLDER':
      return <StakeholderDashboard />;
    case 'TEAM_LEAD':
      return <TeamLeadDashboard />;
    default:
      return (
        <Alert className="max-w-md mx-auto mt-8">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Role not recognized. Please contact support if this issue persists.
          </AlertDescription>
        </Alert>
      );
  }
} 