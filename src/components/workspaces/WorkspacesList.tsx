"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { PlusCircle } from "lucide-react";
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
          {workspaces.map((workspace) => (
            <Link key={workspace.id} href={`/workspaces/${workspace.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                <CardHeader>
                  <CardTitle>{workspace.name}</CardTitle>
                  <CardDescription>{workspace.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-500">{workspace.memberCount} {workspace.memberCount === 1 ? 'member' : 'members'}</p>
                </CardContent>
                <CardFooter className="flex justify-between">
                  <p className="text-xs text-gray-400">
                    Created {workspace.createdAt.toLocaleDateString()}
                  </p>
                  {workspace.isOwner && (
                    <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                      Owner
                    </span>
                  )}
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