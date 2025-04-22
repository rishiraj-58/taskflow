import { db } from "@/lib/db";
import { auth } from "@clerk/nextjs/server";
import { getDbUserId } from "./auth-utils";

/**
 * Checks if the authenticated user has access to a project
 * @param clerkUserId Clerk user ID
 * @param projectId Project ID 
 * @returns boolean indicating if user has access
 */
export async function checkProjectAccess(clerkUserId: string, projectId: string): Promise<boolean> {
  console.log("Project access check for:", { clerkUserId, projectId });
  
  if (!clerkUserId || !projectId) {
    console.log("Missing required parameters");
    return false;
  }

  try {
    // First get the database user ID from Clerk ID
    const dbUserId = await getDbUserId(clerkUserId);
    
    if (!dbUserId) {
      console.log("No database user found for clerk ID:", clerkUserId);
      return false;
    }
    
    console.log("Found DB user ID:", dbUserId);
    
    // Check if user is the project owner
    const project = await db.project.findUnique({
      where: { id: projectId },
      select: { ownerId: true, workspaceId: true }
    });

    if (!project) {
      console.log("Project not found:", projectId);
      return false;
    }

    if (project.ownerId === dbUserId) {
      console.log("User is project owner");
      return true;
    }

    const workspaceMember = await db.workspaceMember.findFirst({
      where: {
        workspaceId: project.workspaceId,
        userId: dbUserId,
      },
    });

    const hasAccess = !!workspaceMember;
    console.log("Workspace membership check:", hasAccess);
    
    return hasAccess;
  } catch (error) {
    console.error("Error checking project access:", error);
    return false;
  }
} 