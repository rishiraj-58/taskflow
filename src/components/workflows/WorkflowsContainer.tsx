"use client";

import { useState } from "react";
import WorkflowsList from "./WorkflowsList";
import WorkflowDetail from "./WorkflowDetail";

interface WorkflowsContainerProps {
  projectId: string;
}

export default function WorkflowsContainer({ projectId }: WorkflowsContainerProps) {
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string | null>(null);
  
  const handleSelectWorkflow = (workflowId: string) => {
    setSelectedWorkflowId(workflowId);
  };
  
  const handleBackToList = () => {
    setSelectedWorkflowId(null);
  };
  
  return (
    <div>
      {selectedWorkflowId ? (
        <WorkflowDetail 
          projectId={projectId} 
          workflowId={selectedWorkflowId} 
          onBack={handleBackToList} 
        />
      ) : (
        <WorkflowsList 
          projectId={projectId} 
          onSelectWorkflow={handleSelectWorkflow} 
        />
      )}
    </div>
  );
} 