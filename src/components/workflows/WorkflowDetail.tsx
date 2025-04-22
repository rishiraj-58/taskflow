"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Edit, Trash2 } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";

interface WorkflowDetailProps {
  projectId: string;
  workflowId: string;
  onBack: () => void;
}

interface WorkflowType {
  id: string;
  name: string;
  description?: string;
  steps: any[];
  status: string;
  createdAt: string;
  updatedAt: string;
}

export default function WorkflowDetail({ projectId, workflowId, onBack }: WorkflowDetailProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [workflow, setWorkflow] = useState<WorkflowType | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchWorkflow();
  }, [workflowId, projectId]);

  const fetchWorkflow = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/projects/${projectId}/workflows/${workflowId}`);
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to fetch workflow');
      }
      
      const data = await response.json();
      setWorkflow(data);
    } catch (err) {
      console.error('Error fetching workflow:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteWorkflow = async () => {
    if (!confirm('Are you sure you want to delete this workflow? This action cannot be undone.')) {
      return;
    }
    
    try {
      setDeleting(true);
      const response = await fetch(`/api/projects/${projectId}/workflows/${workflowId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete workflow');
      }
      
      toast({
        title: "Workflow deleted",
        description: "The workflow has been successfully deleted.",
      });
      
      onBack(); // Go back to workflow list
    } catch (err) {
      console.error('Error deleting workflow:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete workflow');
      
      toast({
        title: "Error",
        description: "Failed to delete the workflow. Please try again.",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading workflow details...</div>;
  }

  if (error && !workflow) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={onBack} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Workflows
        </Button>
        <div className="text-center py-12 text-red-500">Error: {error}</div>
      </div>
    );
  }

  if (!workflow) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={onBack} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Workflows
        </Button>
        <div className="text-center py-12">Workflow not found</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Workflows
        </Button>
        <div className="flex space-x-2">
          <Button variant="outline" className="flex items-center">
            <Edit className="mr-2 h-4 w-4" /> Edit Workflow
          </Button>
          <Button 
            variant="destructive" 
            className="flex items-center"
            onClick={handleDeleteWorkflow}
            disabled={deleting}
          >
            <Trash2 className="mr-2 h-4 w-4" /> 
            {deleting ? "Deleting..." : "Delete Workflow"}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-2xl">{workflow.name}</CardTitle>
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
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {workflow.description && (
            <div>
              <h3 className="text-sm font-medium text-gray-500">Description</h3>
              <p className="mt-1">{workflow.description}</p>
            </div>
          )}
          
          <div>
            <h3 className="text-sm font-medium text-gray-500">Workflow Steps</h3>
            {workflow.steps && workflow.steps.length > 0 ? (
              <div className="mt-2 space-y-2">
                {workflow.steps.map((step, index) => (
                  <div key={index} className="p-3 border rounded-md">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{step.name || `Step ${index + 1}`}</span>
                      {step.status && (
                        <span className="text-xs">{step.status}</span>
                      )}
                    </div>
                    {step.description && (
                      <p className="text-sm text-gray-600 mt-1">{step.description}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-gray-500">No steps defined for this workflow yet.</p>
            )}
          </div>
          
          <div className="grid grid-cols-2 gap-4 pt-4 border-t">
            <div>
              <h3 className="text-xs font-medium text-gray-500">Created</h3>
              <p className="mt-1 text-sm">{formatDate(workflow.createdAt)}</p>
            </div>
            <div>
              <h3 className="text-xs font-medium text-gray-500">Last Updated</h3>
              <p className="mt-1 text-sm">{formatDate(workflow.updatedAt)}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 