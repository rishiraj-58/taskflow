import { Metadata } from "next";
import WorkspaceDetail from "../../../components/workspaces/WorkspaceDetail";
import BackButton from "@/components/navigation/BackButton";

export const metadata: Metadata = {
  title: "Workspace Details - TaskFlow",
  description: "View and manage your workspace details and team members",
};

interface WorkspacePageProps {
  params: { workspaceId: string };
}

export default function WorkspacePage({ params }: WorkspacePageProps) {
  return (
    <div className="container mx-auto py-8 px-4 sm:px-6 max-w-7xl">
      <BackButton href="/workspaces" label="Back to Workspaces" />
      
      <div className="relative rounded-xl overflow-hidden mb-6">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-600/20 via-purple-600/20 to-blue-600/20 animate-gradient"></div>
        <div className="relative bg-white/80 dark:bg-gray-900/90 backdrop-blur-sm p-8 rounded-xl border border-gray-200 dark:border-gray-800">
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-indigo-600 to-blue-600 bg-clip-text text-transparent">
            Workspace Detail
          </h1>
          <p className="text-muted-foreground mt-2 max-w-xl">
            Manage your workspace settings, team members, and projects.
          </p>
        </div>
      </div>
      
      <WorkspaceDetail workspaceId={params.workspaceId} />
    </div>
  );
} 