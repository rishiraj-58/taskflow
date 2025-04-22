import { Metadata } from "next";
import WorkspacesList from "@/components/workspaces/WorkspacesList";
import BackButton from "@/components/navigation/BackButton";

export const metadata: Metadata = {
  title: "Workspaces - TaskFlow",
  description: "Manage your workspaces and teams",
};

export default function WorkspacesPage() {
  return (
    <div className="container mx-auto py-8 px-4 sm:px-6 max-w-7xl">
      <BackButton href="/dashboard" label="Back to Dashboard" />
      
      <div className="flex flex-col gap-6 mt-4">
        <div className="border-b pb-5">
          <h1 className="text-3xl font-bold tracking-tight">Workspaces</h1>
          <p className="text-muted-foreground mt-2">
            Create and manage your workspaces and teams
          </p>
        </div>
        
        <WorkspacesList />
      </div>
    </div>
  );
} 