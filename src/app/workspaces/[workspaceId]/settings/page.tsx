import { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import WorkspaceSettings from "@/components/workspaces/WorkspaceSettings";

interface Member {
  id: string;
  userId: string;
  email: string;
  name: string;
  role: string;
  joinedAt: string;
}

export const metadata: Metadata = {
  title: "Workspace Settings | TaskFlow",
  description: "Manage your workspace settings",
};

async function getWorkspace(workspaceId: string) {
  try {
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
    });
    
    if (!workspace) {
      return null;
    }
    
    return {
      ...workspace,
      createdAt: workspace.createdAt,
      updatedAt: workspace.updatedAt,
    };
  } catch (error) {
    console.error("Error fetching workspace:", error);
    return null;
  }
}

export default async function WorkspaceSettingsPage({
  params,
}: {
  params: { workspaceId: string };
}) {
  const workspace = await getWorkspace(params.workspaceId);
  
  if (!workspace) {
    notFound();
  }
  
  return <WorkspaceSettings workspace={workspace} />;
} 