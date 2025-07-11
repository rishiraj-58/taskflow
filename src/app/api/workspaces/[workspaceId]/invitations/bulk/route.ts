import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import crypto from "crypto";
import { sendInvitationEmail } from "@/lib/email";

interface InvitationResult {
  email: string;
  success: boolean;
  error?: string;
}

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
    const { emails, role } = await request.json();

    // Validate input
    if (!Array.isArray(emails) || emails.length === 0) {
      return NextResponse.json({ error: 'Emails array is required' }, { status: 400 });
    }

    if (emails.length > 50) {
      return NextResponse.json({ error: 'Maximum 50 invitations per batch' }, { status: 400 });
    }

    console.log(`POST /api/workspaces/${workspaceId}/invitations/bulk - Processing ${emails.length} invitations`);

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

    // Get workspace info
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
    });

    if (!workspace) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
    }

    const results: InvitationResult[] = [];
    
    // Process each email
    for (const email of emails) {
      try {
        // Validate the email
        if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
          results.push({
            email,
            success: false,
            error: 'Invalid email format'
          });
          continue;
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
          results.push({
            email,
            success: false,
            error: 'Already a member'
          });
          continue;
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
          results.push({
            email,
            success: false,
            error: 'Invitation already sent'
          });
          continue;
        }

        // Generate a secure token
        const token = crypto.randomBytes(32).toString('hex');
        
        // Create an invitation that expires in 7 days
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);

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
        try {
          console.log(`Attempting to send invitation email to: ${email}`);
          
          await sendInvitationEmail({
            email,
            workspaceName: workspace.name,
            inviterName: `${dbUser.firstName} ${dbUser.lastName}`.trim(),
            invitationLink: `${process.env.NEXT_PUBLIC_APP_URL}/invitations/accept?token=${token}`,
          });
          
          console.log(`Email sent successfully to: ${email}`);
          
          results.push({
            email,
            success: true
          });
        } catch (emailError) {
          console.error(`Error sending invitation email to ${email}:`, emailError);
          // Mark as successful since invitation was created, even if email failed
          results.push({
            email,
            success: true,
            error: 'Email delivery may have failed'
          });
        }
      } catch (error) {
        console.error(`Error processing invitation for ${email}:`, error);
        results.push({
          email,
          success: false,
          error: 'Processing failed'
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;

    console.log(`Bulk invitation complete: ${successCount} successful, ${failureCount} failed`);

    return NextResponse.json({
      results,
      summary: {
        total: emails.length,
        successful: successCount,
        failed: failureCount
      }
    });
  } catch (error) {
    console.error('Error processing bulk invitations:', error);
    return NextResponse.json({ error: 'Failed to process bulk invitations' }, { status: 500 });
  }
} 