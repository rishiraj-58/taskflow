"use client";

import { useState, useEffect } from "react";
import { PlusCircle, Workflow } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import CreateWorkflowModal from "../workflows/CreateWorkflowModal";
import { formatDate } from "@/lib/utils";

interface WorkflowsListProps {
  projectId: string;
  onSelectWorkflow: (workflowId: string) => void;
}

interface WorkflowType {
  id: string;
  name: string;
  description?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export default function WorkflowsList({ projectId, onSelectWorkflow }: WorkflowsListProps) {
  const [workflows, setWorkflows] = useState<WorkflowType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  useEffect(() => {
    fetchWorkflows();
  }, [projectId]);

  const fetchWorkflows = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/projects/${projectId}/workflows`);
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to fetch workflows');
      }
      
      const data = await response.json();
      setWorkflows(data);
    } catch (err) {
      console.error('Error fetching workflows:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateWorkflow = async (workflow: { name: string; description?: string; steps?: any[] }) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/projects/${projectId}/workflows`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(workflow),
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create workflow');
      }
      
      await fetchWorkflows();
      setIsCreateModalOpen(false);
    } catch (err) {
      console.error('Error creating workflow:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (loading && workflows.length === 0) {
    return <div className="flex justify-center items-center h-48">Loading workflows...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Workflows</h2>
        <Button 
          onClick={() => setIsCreateModalOpen(true)}
          className="inline-flex items-center"
        >
          <PlusCircle className="mr-2 h-4 w-4" />
          New Workflow
        </Button>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <span className="block sm:inline">{error}</span>
        </div>
      )}

      {workflows.length === 0 ? (
        <Card className="p-6 text-center">
          <CardContent className="pt-6">
            <div className="flex justify-center mb-4">
              <Workflow className="h-12 w-12 text-gray-400" />
            </div>
            <p className="text-gray-500 mb-4">No workflows have been created for this project yet.</p>
            <Button
              onClick={() => setIsCreateModalOpen(true)}
              className="inline-flex items-center"
            >
              <PlusCircle className="mr-2 h-4 w-4" />
              Create Your First Workflow
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {workflows.map((workflow) => (
            <Card 
              key={workflow.id} 
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => onSelectWorkflow(workflow.id)}
            >
              <CardHeader>
                <CardTitle>{workflow.name}</CardTitle>
                <CardDescription>{workflow.description || 'No description'}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center mt-2">
                  <span 
                    className={`px-2 py-1 text-xs rounded-full ${
                      workflow.status === 'active' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-yellow-100 text-yellow-800'
                    }`}
                  >
                    {workflow.status}
                  </span>
                </div>
              </CardContent>
              <CardFooter className="text-xs text-gray-500">
                Created {formatDate(workflow.createdAt)}
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      <CreateWorkflowModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreate={handleCreateWorkflow}
      />
    </div>
  );
} 