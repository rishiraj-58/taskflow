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
      
      <div className="mt-4">
        <ProjectDetail projectId={params.projectId} />
      </div>
    </div>
  );
} 