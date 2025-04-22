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
      
      <div className="mt-4">
        <WorkspaceDetail workspaceId={params.workspaceId} />
      </div>
    </div>
  );
} 