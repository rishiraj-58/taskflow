import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import crypto from "crypto";
import { sendInvitationEmail } from "@/lib/email";

export async function POST(
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

    console.log(`POST /api/workspaces/${workspaceId}/invitations/${invitationId}/resend`);

    // Get the user from the database
    const dbUser = await prisma.user.findUnique({
      where: { clerkId },
    });

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if user is authorized to resend invitations
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

    // Get the invitation
    const invitation = await prisma.invitation.findFirst({
      where: {
        id: invitationId,
        workspaceId,
        status: 'PENDING',
      },
      include: {
        workspace: true,
      },
    });

    if (!invitation) {
      return NextResponse.json({ error: 'Invitation not found or already accepted' }, { status: 404 });
    }

    // Generate new token and extend expiry
    const newToken = crypto.randomBytes(32).toString('hex');
    const newExpiresAt = new Date();
    newExpiresAt.setDate(newExpiresAt.getDate() + 7); // 7 days from now

    // Update invitation with new token and expiry
    const updatedInvitation = await prisma.invitation.update({
      where: { id: invitationId },
      data: {
        token: newToken,
        expiresAt: newExpiresAt,
      },
    });

    console.log(`Updated invitation ${invitationId} with new token and expiry`);

    // Send the new invitation email
    try {
      console.log(`Resending invitation email to: ${invitation.email}`);
      
      await sendInvitationEmail({
        email: invitation.email,
        workspaceName: invitation.workspace.name,
        inviterName: `${dbUser.firstName} ${dbUser.lastName}`.trim(),
        invitationLink: `${process.env.NEXT_PUBLIC_APP_URL}/invitations/accept?token=${newToken}`,
      });
      
      console.log(`Invitation email resent successfully to: ${invitation.email}`);
    } catch (emailError) {
      console.error(`Error resending invitation email to ${invitation.email}:`, emailError);
      // Continue even if email fails - invitation was updated
    }

    return NextResponse.json({
      success: true,
      message: 'Invitation resent successfully',
      invitation: {
        id: updatedInvitation.id,
        email: updatedInvitation.email,
        expiresAt: updatedInvitation.expiresAt,
      }
    });
  } catch (error) {
    console.error('Error resending invitation:', error);
    return NextResponse.json({ error: 'Failed to resend invitation' }, { status: 500 });
  }
} 