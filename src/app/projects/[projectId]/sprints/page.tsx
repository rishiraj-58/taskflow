import { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";

import SprintList from "@/components/sprints/SprintList";
import { checkProjectAccess } from "@/lib/project-access";
import { db } from "@/lib/db";

interface SprintsPageProps {
  params: {
    projectId: string;
  };
}

export const metadata: Metadata = {
  title: "Sprints",
  description: "Manage your project sprints",
};

export default async function SprintsPage({ params }: SprintsPageProps) {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  // Check if user has access to this project
  const hasAccess = await checkProjectAccess(userId, params.projectId);
  
  if (!hasAccess) {
    redirect("/dashboard");
  }

  // Get project details
  const project = await db.project.findUnique({
    where: {
      id: params.projectId,
    },
    select: {
      id: true,
      name: true,
    },
  });

  if (!project) {
    redirect("/dashboard");
  }

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">{project.name} - Sprints</h1>
        <p className="text-muted-foreground">Manage project sprints and track progress</p>
      </div>
      <div className="grid gap-8">
        <SprintList projectId={params.projectId} />
      </div>
    </div>
  );
} 