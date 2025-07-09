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
      
      <div className="relative rounded-xl overflow-hidden mb-10">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-600/20 via-purple-600/20 to-blue-600/20 animate-gradient"></div>
        <div className="relative bg-white/80 dark:bg-gray-900/90 backdrop-blur-sm p-8 rounded-xl border border-gray-200 dark:border-gray-800">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
            <div>
              <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-indigo-600 to-blue-600 bg-clip-text text-transparent">
                Workspaces
              </h1>
              <p className="text-muted-foreground mt-2 max-w-xl">
                Create and manage your team workspaces. Organize projects and collaborate effectively.
              </p>
            </div>
          </div>
        </div>
      </div>
      
      <WorkspacesList />
    </div>
  );
} 