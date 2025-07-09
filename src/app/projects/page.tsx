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
      
      <div className="relative rounded-xl overflow-hidden mb-6 mt-4">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 via-purple-600/20 to-indigo-600/20 animate-gradient"></div>
        <div className="relative bg-white/80 dark:bg-gray-900/90 backdrop-blur-sm p-8 rounded-xl border border-gray-200 dark:border-gray-800">
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Projects
          </h1>
          <p className="text-muted-foreground mt-2 max-w-xl">
            Create and manage projects across your workspaces
          </p>
        </div>
      </div>
      
      <ProjectsList />
    </div>
  );
} 