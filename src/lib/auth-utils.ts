import { db } from "@/lib/db";
import { auth } from "@clerk/nextjs/server";

/**
 * Utility function to get current authenticated user ID from Clerk
 * @returns The authenticated user ID or null
 */
export async function getCurrentUserId(): Promise<string | null> {
  try {
    const authResult = await auth();
    // Use optional chaining to safely access userId
    return authResult?.userId ?? null;
  } catch (error) {
    console.error("Error getting authenticated user ID:", error);
    return null;
  }
}

/**
 * Get the database user ID from Clerk ID
 */
export async function getDbUserId(clerkId: string): Promise<string | null> {
  if (!clerkId) return null;
  
  try {
    const user = await db.user.findUnique({
      where: { clerkId },
      select: { id: true }
    });
    
    return user?.id ?? null;
  } catch (error) {
    console.error("Error getting DB user ID:", error);
    return null;
  }
}

/**
 * Checks if a user has access to a project
 * @param clerkUserId The Clerk ID of the user
 * @param projectId The ID of the project
 * @returns A boolean indicating if the user has access to the project
 */
export async function hasProjectAccess(clerkUserId: string | null | undefined, projectId: string): Promise<boolean> {
  console.log("Checking access with:", { clerkUserId, projectId });
  
  if (!clerkUserId || !projectId) {
    console.log("Missing required parameters for access check. clerkUserId:", clerkUserId);
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
    
    // Direct owner check
    if (project.ownerId === dbUserId) {
      console.log("User is project owner");
      return true;
    }
    
    // Check workspace membership
    const workspaceMember = await db.workspaceMember.findFirst({
      where: {
        workspaceId: project.workspaceId,
        userId: dbUserId
      }
    });
    
    const hasAccess = !!workspaceMember;
    console.log("Workspace membership check:", hasAccess);
    
    return hasAccess;
  } catch (error) {
    console.error("Error checking project access:", error);
    return false;
  }
} 