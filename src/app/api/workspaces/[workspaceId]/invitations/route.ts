import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import crypto from "crypto";
import { sendInvitationEmail } from "@/lib/email";

export async function POST(
  request: NextRequest,
  { params }: { params: { workspaceId: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const clerkId = userId;
    const { workspaceId } = params;
    const { email, role } = await request.json();

    // Validate the email
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
    }

    console.log(`POST /api/workspaces/${workspaceId}/invitations - Processing invitation for email: ${email}`);

    // Get the user from the database
    const dbUser = await prisma.user.findUnique({
      where: { clerkId },
    });

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if user is authorized to send invitations
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

    // Check if user is already a member
    const existingUser = await prisma.user.findFirst({
      where: {
        email,
        workspaceMember: {
          some: {
            workspaceId,
          },
        },
      },
    });

    if (existingUser) {
      return NextResponse.json({ error: 'User is already a member of this workspace' }, { status: 400 });
    }

    // Check if there's already a pending invitation
    const existingInvitation = await prisma.invitation.findFirst({
      where: {
        email,
        workspaceId,
        status: 'PENDING',
      },
    });

    if (existingInvitation) {
      return NextResponse.json({ error: 'An invitation has already been sent to this email' }, { status: 400 });
    }

    // Generate a secure token
    const token = crypto.randomBytes(32).toString('hex');
    
    // Create an invitation that expires in 7 days
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
    });

    if (!workspace) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
    }

    const invitation = await prisma.invitation.create({
      data: {
        email,
        workspaceId,
        role: role || 'MEMBER',
        token,
        expiresAt,
        createdBy: dbUser.id,
        status: 'PENDING',
      },
    });

    console.log(`Created invitation: ${invitation.id} for email: ${email}`);

    // Send the invitation email
    let emailPreviewUrl = null;
    try {
      console.log(`Attempting to send invitation email to: ${email}`);
      console.log(`Invitation link: ${process.env.NEXT_PUBLIC_APP_URL}/invitations/accept?token=${token}`);
      
      const emailResult = await sendInvitationEmail({
        email,
        workspaceName: workspace.name,
        inviterName: `${dbUser.firstName} ${dbUser.lastName}`.trim(),
        invitationLink: `${process.env.NEXT_PUBLIC_APP_URL}/invitations/accept?token=${token}`,
      });
      
      // Save the preview URL if using Ethereal
      if (emailResult.testAccount) {
        emailPreviewUrl = emailResult.previewUrl;
        console.log(`Email preview URL: ${emailPreviewUrl}`);
      }
      
      console.log(`Email sent successfully to: ${email} with message ID: ${emailResult.messageId}`);
    } catch (emailError) {
      console.error('Error sending invitation email:', emailError);
      console.error(emailError instanceof Error ? emailError.stack : 'No stack trace available');
      // Continue even if email fails - we've created the invitation
    }

    return NextResponse.json({
      id: invitation.id,
      email: invitation.email,
      status: invitation.status,
      createdAt: invitation.createdAt,
      emailPreviewUrl // Include the preview URL if available
    });
  } catch (error) {
    console.error('Error sending invitation:', error);
    return NextResponse.json({ error: 'Failed to send invitation' }, { status: 500 });
  }
}

// Get all invitations for a workspace
export async function GET(
  request: NextRequest,
  { params }: { params: { workspaceId: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const clerkId = userId;
    const { workspaceId } = params;

    // Get the user from the database
    const dbUser = await prisma.user.findUnique({
      where: { clerkId },
    });

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if user is a member of the workspace
    const membership = await prisma.workspaceMember.findFirst({
      where: {
        workspaceId,
        userId: dbUser.id,
      },
    });

    if (!membership) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const invitations = await prisma.invitation.findMany({
      where: {
        workspaceId,
        status: 'PENDING',
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
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(
      invitations.map((inv: any) => ({
        id: inv.id,
        email: inv.email,
        role: inv.role,
        status: inv.status,
        expiresAt: inv.expiresAt,
        createdAt: inv.createdAt,
        inviter: {
          name: `${inv.inviter.firstName} ${inv.inviter.lastName}`.trim(),
          email: inv.inviter.email,
        },
      }))
    );
  } catch (error) {
    console.error('Error fetching invitations:', error);
    return NextResponse.json({ error: 'Failed to fetch invitations' }, { status: 500 });
  }
} 