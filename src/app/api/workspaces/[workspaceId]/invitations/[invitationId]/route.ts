import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";

export async function DELETE(
  request: NextRequest,
  { params }: { params: { workspaceId: string; invitationId: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const clerkId = userId;
    const { workspaceId, invitationId } = params;

    console.log(`DELETE /api/workspaces/${workspaceId}/invitations/${invitationId}`);

    // Get the user from the database
    const dbUser = await prisma.user.findUnique({
      where: { clerkId },
    });

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if user is authorized to cancel invitations
    const membership = await prisma.workspaceMember.findFirst({
      where: {
        workspaceId,
        userId: dbUser.id,
        role: 'ADMIN',
      },
    });

    if (!membership) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    // Check if invitation exists and belongs to this workspace
    const invitation = await prisma.invitation.findFirst({
      where: {
        id: invitationId,
        workspaceId,
        status: 'PENDING',
      },
    });

    if (!invitation) {
      return NextResponse.json({ error: 'Invitation not found or already processed' }, { status: 404 });
    }

    // Update invitation status to CANCELLED instead of deleting
    // This preserves audit trail
    const cancelledInvitation = await prisma.invitation.update({
      where: { id: invitationId },
      data: {
        status: 'CANCELLED',
      },
    });

    console.log(`Cancelled invitation ${invitationId} for email: ${invitation.email}`);

    return NextResponse.json({
      success: true,
      message: 'Invitation cancelled successfully',
      invitation: {
        id: cancelledInvitation.id,
        email: cancelledInvitation.email,
        status: cancelledInvitation.status,
      }
    });
  } catch (error) {
    console.error('Error cancelling invitation:', error);
    return NextResponse.json({ error: 'Failed to cancel invitation' }, { status: 500 });
  }
}

// GET endpoint to fetch specific invitation details
export async function GET(
  request: NextRequest,
  { params }: { params: { workspaceId: string; invitationId: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const clerkId = userId;
    const { workspaceId, invitationId } = params;

    // Get the user from the database
    const dbUser = await prisma.user.findUnique({
      where: { clerkId },
    });

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if user is a member of the workspace (any role can view invitations)
    const membership = await prisma.workspaceMember.findFirst({
      where: {
        workspaceId,
        userId: dbUser.id,
      },
    });

    if (!membership) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Get invitation details
    const invitation = await prisma.invitation.findFirst({
      where: {
        id: invitationId,
        workspaceId,
      },
      include: {
        inviter: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    if (!invitation) {
      return NextResponse.json({ error: 'Invitation not found' }, { status: 404 });
    }

    return NextResponse.json({
      id: invitation.id,
      email: invitation.email,
      role: invitation.role,
      status: invitation.status,
      expiresAt: invitation.expiresAt,
      createdAt: invitation.createdAt,
      inviter: {
        name: `${invitation.inviter.firstName} ${invitation.inviter.lastName}`.trim(),
        email: invitation.inviter.email,
      },
    });
  } catch (error) {
    console.error('Error fetching invitation:', error);
    return NextResponse.json({ error: 'Failed to fetch invitation' }, { status: 500 });
  }
} 