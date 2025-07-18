import { Metadata } from "next";
import BackButton from "@/components/navigation/BackButton";
import ProjectDetail from "@/components/projects/ProjectDetail";

export const metadata: Metadata = {
  title: "Project Details - TaskFlow",
  description: "View and manage your project details and tasks",
};

interface ProjectPageProps {
  params: { projectId: string };
}

export default function ProjectPage({ params }: ProjectPageProps) {
  return (
    <div className="container mx-auto py-8 px-4 sm:px-6 max-w-7xl">
      <BackButton href="/projects" label="Back to Projects" />
      
      <div className="relative rounded-xl overflow-hidden mb-6 mt-4">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 via-purple-600/20 to-indigo-600/20 animate-gradient"></div>
        <div className="relative bg-white/80 dark:bg-gray-900/90 backdrop-blur-sm p-8 rounded-xl border border-gray-200 dark:border-gray-800">
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Project Detail
          </h1>
          <p className="text-muted-foreground mt-2 max-w-xl">
            Manage your project settings, tasks, and team members.
          </p>
        </div>
      </div>
      
      <ProjectDetail projectId={params.projectId} />
    </div>
  );
} 