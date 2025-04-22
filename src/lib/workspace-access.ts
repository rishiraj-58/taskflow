import { db } from "./db";

/**
 * Checks if a user has access to a workspace
 * @param userId The ID of the user to check access for
 * @param workspaceId The ID of the workspace to check access to
 * @returns A boolean indicating whether the user has access
 */
export async function checkWorkspaceAccess(userId: string, workspaceId: string): Promise<boolean> {
  if (!userId || !workspaceId) {
    return false;
  }

  try {
    // Check if user is a member of the workspace
    const workspaceMember = await db.workspaceMember.findFirst({
      where: {
        userId: userId,
        workspaceId: workspaceId
      }
    });

    return !!workspaceMember;
  } catch (error) {
    console.error("Error checking workspace access:", error);
    return false;
  }
} 