"use client";

import { useParams } from "next/navigation";
import TaskDebuggingHelper from "@/components/tasks/TaskDebuggingHelper";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function TaskDebugPage() {
  const params = useParams();
  const taskId = params.taskId as string;

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold">Task Debug - ID: {taskId}</h1>
        <Link href="/dashboard">
          <Button variant="outline">Back to Dashboard</Button>
        </Link>
      </div>
      
      <div className="bg-muted/50 p-4 rounded-lg mb-6">
        <h2 className="text-lg font-medium mb-2">Debug Information</h2>
        <p className="text-sm text-muted-foreground">
          This page provides detailed technical information about the task and related entities.
          It's intended for troubleshooting and development purposes.
        </p>
      </div>
      
      <TaskDebuggingHelper taskId={taskId} />
    </div>
  );
} 