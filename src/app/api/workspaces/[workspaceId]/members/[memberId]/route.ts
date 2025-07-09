import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";

export async function DELETE(
  request: NextRequest,
  { params }: { params: { workspaceId: string; memberId: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { workspaceId, memberId } = params;

    // Get the current user from the database
    const dbUser = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if the current user is an admin of the workspace
    const currentUserMembership = await prisma.workspaceMember.findFirst({
      where: {
        workspaceId,
        userId: dbUser.id,
        role: 'ADMIN',
      },
    });

    if (!currentUserMembership) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    // Get the member to remove
    const memberToRemove = await prisma.workspaceMember.findUnique({
      where: { id: memberId },
      include: { user: true },
    });

    if (!memberToRemove) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    // Don't allow removing yourself
    if (memberToRemove.userId === dbUser.id) {
      return NextResponse.json({ 
        error: 'You cannot remove yourself from the workspace' 
      }, { status: 400 });
    }

    // Delete the workspace member
    await prisma.workspaceMember.delete({
      where: { id: memberId },
    });

    // Log the action
    await prisma.activityLog.create({
      data: {
        entityId: workspaceId,
        entityType: 'WORKSPACE',
        action: 'REMOVE_MEMBER',
        description: `Removed ${memberToRemove.user.email} from workspace`,
        userId: dbUser.id,
      },
    });

    return NextResponse.json({ 
      success: true,
      message: `${memberToRemove.user.email} has been removed from the workspace` 
    });
  } catch (error) {
    console.error('Error removing workspace member:', error);
    return NextResponse.json({ 
      error: 'Failed to remove workspace member' 
    }, { status: 500 });
  }
} 