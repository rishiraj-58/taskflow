"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { PlusCircle, Globe, Briefcase, LayoutGrid, Users, CalendarDays, ArrowRight } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import CreateWorkspaceModal from "./CreateWorkspaceModal";

// Define workspace type
interface Workspace {
  id: string;
  name: string;
  description: string;
  memberCount: number;
  createdAt: Date;
  isOwner?: boolean;
}

export default function WorkspacesList() {
  const router = useRouter();
  const { user } = useUser();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchWorkspaces = async () => {
      try {
        setLoading(true);
        setError(null); // Reset any previous errors
        console.log('Fetching workspaces...');
        
        const response = await fetch('/api/workspaces');
        console.log('Response status:', response.status);
        
        if (!response.ok) {
          let errorMessage = 'Failed to fetch workspaces';
          
          try {
            const errorData = await response.json();
            console.error('API error response:', errorData);
            errorMessage = errorData.error || errorMessage;
          } catch (parseError) {
            console.error('Error parsing error response:', parseError);
            // If we can't parse the error as JSON, try to get the status text
            errorMessage = `${errorMessage} (Status: ${response.status} ${response.statusText})`;
          }
          
          throw new Error(errorMessage);
        }
        
        let data;
        try {
          data = await response.json();
          console.log('Workspaces data received:', data);
          
          if (!Array.isArray(data)) {
            console.error('Unexpected data format - expected array but got:', typeof data);
            throw new Error('Unexpected data format received from server');
          }
        } catch (parseError) {
          console.error('Error parsing response data:', parseError);
          throw new Error('Failed to parse workspaces data');
        }
        
        // Convert dates from strings to Date objects
        const formattedWorkspaces = data.map((workspace: any) => ({
          ...workspace,
          createdAt: new Date(workspace.createdAt),
        }));
        
        setWorkspaces(formattedWorkspaces);
      } catch (err) {
        console.error('Error fetching workspaces:', err);
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchWorkspaces();
  }, []);

  const handleCreateWorkspace = async (workspace: { name: string; description: string }) => {
    try {
      setLoading(true);
      const response = await fetch('/api/workspaces', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(workspace),
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create workspace');
      }
      
      const newWorkspace = await response.json();
      
      // Convert date from string to Date object
      newWorkspace.createdAt = new Date(newWorkspace.createdAt);
      
      setWorkspaces([...workspaces, newWorkspace]);
      setIsCreateModalOpen(false);
      
      // Navigate to the new workspace
      router.push(`/workspaces/${newWorkspace.id}`);
    } catch (err) {
      console.error('Error creating workspace:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  const getRandomWorkspaceIcon = (index: number) => {
    const icons = [
      <Globe className="h-5 w-5 text-blue-600 dark:text-blue-400" key="globe" />,
      <Briefcase className="h-5 w-5 text-indigo-600 dark:text-indigo-400" key="briefcase" />,
      <LayoutGrid className="h-5 w-5 text-purple-600 dark:text-purple-400" key="grid" />,
      <Users className="h-5 w-5 text-teal-600 dark:text-teal-400" key="users" />
    ];
    return icons[index % icons.length];
  };

  if (loading && workspaces.length === 0) {
    return <div className="flex justify-center items-center h-64">Loading workspaces...</div>;
  }

  if (error && workspaces.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-red-500 font-bold mb-4">Error: {error}</div>
        <div className="bg-gray-100 p-4 rounded text-left overflow-auto max-h-96 text-sm">
          <p className="mb-2">Something went wrong while fetching your workspaces.</p>
          <p className="mb-2">This could be due to:</p>
          <ul className="list-disc pl-5 mb-4">
            <li>Authentication issues - you may need to sign out and back in</li>
            <li>Database connection problems</li>
            <li>Server-side issues</li>
          </ul>
          <p>Check the console for technical details or try refreshing the page.</p>
        </div>
        <button 
          onClick={() => window.location.reload()}
          className="mt-4 inline-flex items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
        >
          Refresh Page
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Your Workspaces</h2>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="inline-flex items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
        >
          <PlusCircle className="mr-2 h-4 w-4" />
          New Workspace
        </button>
      </div>

      {workspaces.length === 0 ? (
        <Card className="p-6 text-center">
          <p className="text-gray-500 mb-4">You don't have any workspaces yet.</p>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            <PlusCircle className="mr-2 h-4 w-4" />
            Create Your First Workspace
          </button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {workspaces.map((workspace, index) => (
            <Link key={workspace.id} href={`/workspaces/${workspace.id}`}>
              <Card className="overflow-hidden border-0 bg-white dark:bg-gray-900 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 h-full group relative">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-indigo-500/10 dark:from-blue-600/10 dark:to-indigo-600/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                
                <CardHeader className="pb-0">
                  <div className="flex items-start justify-between mb-3">
                    <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/40 dark:to-indigo-900/40 flex items-center justify-center animate-pulse-soft">
                      {getRandomWorkspaceIcon(index)}
                    </div>
                    {workspace.isOwner && (
                      <span className="px-2.5 py-1 text-xs font-medium bg-gradient-to-r from-blue-500/10 to-indigo-500/10 dark:from-blue-500/20 dark:to-indigo-500/20 text-blue-700 dark:text-blue-300 rounded-full border border-blue-200 dark:border-blue-800/50">
                        Owner
                      </span>
                    )}
                  </div>
                  <CardTitle className="text-xl font-semibold text-gray-800 dark:text-gray-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {workspace.name}
                  </CardTitle>
                  <CardDescription className="line-clamp-2 mt-1.5 text-gray-600 dark:text-gray-400">
                    {workspace.description || "No description provided"}
                  </CardDescription>
                </CardHeader>
                
                <CardContent className="pt-4">
                  <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-1.5 rounded-md mr-2">
                      <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <span>{workspace.memberCount} {workspace.memberCount === 1 ? 'member' : 'members'}</span>
                  </div>
                </CardContent>
                
                <CardFooter className="border-t border-gray-100 dark:border-gray-800 pt-4 flex items-center justify-between">
                  <div className="flex items-center text-xs text-gray-500 dark:text-gray-500">
                    <CalendarDays className="h-3.5 w-3.5 mr-1.5" />
                    {workspace.createdAt.toLocaleDateString('en-US', { 
                      year: 'numeric', 
                      month: 'short', 
                      day: 'numeric' 
                    })}
                  </div>
                  <div className="w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center group-hover:bg-blue-500 dark:group-hover:bg-blue-600 transition-colors">
                    <ArrowRight className="h-3.5 w-3.5 text-gray-500 dark:text-gray-400 group-hover:text-white transition-colors" />
                  </div>
                </CardFooter>
              </Card>
            </Link>
          ))}
        </div>
      )}
      
      <CreateWorkspaceModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreate={handleCreateWorkspace}
      />
    </div>
  );
} 