"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { PlusIcon, SparklesIcon } from "lucide-react";
import { TaskCreationInput } from "@/components/ai/TaskCreationInput";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TaskForm } from "@/components/tasks/TaskForm";

interface TaskCreationProps {
  projectId: string;
  onTaskCreated?: (task: any) => void;
}

export function TaskCreation({ projectId, onTaskCreated }: TaskCreationProps) {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"ai" | "form">("ai");
  
  const handleTaskCreated = (task: any) => {
    setOpen(false);
    if (onTaskCreated) {
      onTaskCreated(task);
    }
  };
  
  return (
    <div className="flex items-center gap-2">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button>
            <PlusIcon className="h-4 w-4 mr-2" />
            Add Task
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Create New Task</SheetTitle>
          </SheetHeader>
          
          <Tabs 
            defaultValue="ai" 
            value={activeTab} 
            onValueChange={(value) => setActiveTab(value as "ai" | "form")}
            className="mt-4"
          >
            <TabsList className="w-full">
              <TabsTrigger value="ai" className="flex-1">
                <SparklesIcon className="h-4 w-4 mr-2" />
                AI Powered
              </TabsTrigger>
              <TabsTrigger value="form" className="flex-1">
                <PlusIcon className="h-4 w-4 mr-2" />
                Standard Form
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="ai" className="mt-4">
              <div className="text-sm text-muted-foreground mb-4">
                Describe your task in natural language, and our AI will create it for you. Try including details like priority, due date, and assignee.
              </div>
              
              <TaskCreationInput 
                projectId={projectId} 
                onTaskCreated={handleTaskCreated}
              />
            </TabsContent>
            
            <TabsContent value="form" className="mt-4">
              <TaskForm 
                projectId={projectId} 
                onSuccess={handleTaskCreated} 
              />
            </TabsContent>
          </Tabs>
        </SheetContent>
      </Sheet>
      
      {/* Direct AI task creation input for quick access */}
      <TaskCreationInput 
        projectId={projectId} 
        onTaskCreated={onTaskCreated}
        className="flex-1 max-w-2xl"
      />
    </div>
  );
} 