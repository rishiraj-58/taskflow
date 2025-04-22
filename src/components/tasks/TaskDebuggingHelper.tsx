"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Skeleton } from "@/components/ui/skeleton";

type TaskDebugResponse = {
  task: any;
  project: any;
  currentUser: any;
  hasAccess: boolean;
};

export default function TaskDebuggingHelper({ taskId, projectId }: { taskId: string; projectId?: string }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [debugData, setDebugData] = useState<TaskDebugResponse | null>(null);
  const [refreshCounter, setRefreshCounter] = useState(0);

  useEffect(() => {
    const fetchDebugData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        console.log(`Fetching debug data for task: ${taskId}`);
        const response = await fetch(`/api/debug/task/${taskId}`);
        
        console.log(`Response status: ${response.status}`);
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || `Error ${response.status}: Could not fetch task debug data`);
        }
        
        const data = await response.json();
        console.log("Debug data received:", data);
        setDebugData(data);
      } catch (err) {
        console.error("Error fetching task debug data:", err);
        setError(err instanceof Error ? err.message : "Unknown error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchDebugData();
  }, [taskId, refreshCounter]);

  const handleRefresh = () => {
    setRefreshCounter(prev => prev + 1);
  };

  if (loading) {
    return <LoadingState />;
  }

  if (error) {
    return <ErrorState error={error} onRetry={handleRefresh} />;
  }

  if (!debugData) {
    return (
      <div className="p-8 text-center border rounded-lg">
        <h3 className="font-medium text-lg mb-2">No debug data available</h3>
        <p className="text-muted-foreground mb-4">Could not load task information.</p>
        <Button onClick={handleRefresh}>Try Again</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button onClick={handleRefresh} variant="outline" size="sm">
          Refresh Data
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Access Status</CardTitle>
            <Badge variant={debugData.hasAccess ? "default" : "destructive"}>
              {debugData.hasAccess ? "Access Granted" : "Access Denied"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {debugData.hasAccess 
              ? "User has permission to access this task." 
              : "User does not have permission to access this task. Debug mode allows viewing."}
          </p>
        </CardContent>
      </Card>

      <Tabs defaultValue="task">
        <TabsList className="grid grid-cols-3 mb-4">
          <TabsTrigger value="task">Task Data</TabsTrigger>
          <TabsTrigger value="project">Project Data</TabsTrigger>
          <TabsTrigger value="user">User Data</TabsTrigger>
        </TabsList>
        
        <TabsContent value="task">
          <DataSection title="Task Details" data={debugData.task} />
        </TabsContent>
        
        <TabsContent value="project">
          <DataSection title="Project Details" data={debugData.project} />
        </TabsContent>
        
        <TabsContent value="user">
          <DataSection title="Current User" data={debugData.currentUser} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function DataSection({ title, data }: { title: string; data: any }) {
  if (!data) {
    return <div className="text-sm p-4 bg-muted rounded-md">No data available</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <Accordion type="single" collapsible className="w-full">
          {Object.entries(data).map(([key, value]) => (
            <AccordionItem key={key} value={key}>
              <AccordionTrigger>
                <span className="font-mono text-sm">{key}</span>
              </AccordionTrigger>
              <AccordionContent>
                <pre className="bg-muted p-2 rounded-md overflow-auto text-xs">
                  {JSON.stringify(value, null, 2)}
                </pre>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </CardContent>
    </Card>
  );
}

function LoadingState() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-10 w-full mb-6" />
      
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-40" />
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function ErrorState({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <div className="p-8 border border-destructive/20 bg-destructive/5 rounded-lg">
      <h3 className="font-medium text-lg mb-2 text-destructive">Error Loading Debug Data</h3>
      <p className="text-muted-foreground mb-4">{error}</p>
      <Button onClick={onRetry} variant="secondary">Retry</Button>
    </div>
  );
} 