'use client';

import { ReactNode, useState } from 'react';
import { useWorkspaceContext } from '@/hooks/useWorkspaceContext';
import { usePermissions } from '@/hooks/usePermissions';
import { NavigationHeader } from './NavigationHeader';
import { Sidebar } from './Sidebar';
import { WorkspaceProvider } from '@/components/context/WorkspaceProvider';

interface AppLayoutProps {
  children: ReactNode;
  showSidebar?: boolean;
}

function AppLayoutInner({ children, showSidebar = true }: AppLayoutProps) {
  const { currentWorkspace, currentProject } = useWorkspaceContext();
  const { role: userRole } = usePermissions();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleMobileMenuToggle = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const handleMobileMenuClose = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <NavigationHeader onMobileMenuToggle={handleMobileMenuToggle} />
      
      <div className="flex">
        {showSidebar && (
          <Sidebar 
            workspace={currentWorkspace}
            project={currentProject}
            userRole={userRole}
            isMobileOpen={isMobileMenuOpen}
            onMobileClose={handleMobileMenuClose}
          />
        )}
        
        <main className={`flex-1 ${showSidebar ? 'lg:ml-64' : ''}`}>
          <div className="px-4 py-6 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

export function AppLayout({ children, showSidebar = true }: AppLayoutProps) {
  return (
    <WorkspaceProvider>
      <AppLayoutInner showSidebar={showSidebar}>
        {children}
      </AppLayoutInner>
    </WorkspaceProvider>
  );
} 