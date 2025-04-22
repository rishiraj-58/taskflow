"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import WorkflowsContainer from "./WorkflowsContainer";

export default function WorkflowsPage() {
  const params = useParams();
  const projectId = Array.isArray(params.projectId) ? params.projectId[0] : params.projectId;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId) {
      setError("Project ID is required");
      setLoading(false);
      return;
    }
    setLoading(false);
  }, [projectId]);

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading...</div>;
  }

  if (error) {
    return <div className="text-red-500 p-4">{error}</div>;
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Project Workflows</h1>
      <WorkflowsContainer projectId={projectId as string} />
    </div>
  );
} 