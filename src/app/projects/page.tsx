import { Metadata } from "next";
import BackButton from "@/components/navigation/BackButton";
import ProjectsList from "@/components/projects/ProjectsList";

export const metadata: Metadata = {
  title: "Projects - TaskFlow",
  description: "Manage your projects and track progress",
};

export default function ProjectsPage() {
  return (
    <div className="container mx-auto py-8 px-4 sm:px-6 max-w-7xl">
      <BackButton href="/dashboard" label="Back to Dashboard" />
      
      <div className="flex flex-col gap-6 mt-4">
        <div className="border-b pb-5">
          <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
          <p className="text-muted-foreground mt-2">
            Create and manage projects across your workspaces
          </p>
        </div>
        
        <ProjectsList />
      </div>
    </div>
  );
} 