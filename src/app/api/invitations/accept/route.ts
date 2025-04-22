import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const clerkId = userId;
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 400 });
    }

    console.log(`POST /api/invitations/accept - Processing token: ${token.substring(0, 8)}...`);

    // Get the invitation
    const invitation = await prisma.invitation.findUnique({
      where: { token },
      include: { workspace: true },
    });

    if (!invitation) {
      return NextResponse.json({ error: 'Invitation not found' }, { status: 404 });
    }

    // Check if invitation has expired
    if (invitation.status !== 'PENDING' || new Date() > invitation.expiresAt) {
      return NextResponse.json({ error: 'Invitation has expired' }, { status: 400 });
    }

    // Get user from our database
    let dbUser = await prisma.user.findUnique({
      where: { clerkId },
    });

    if (!dbUser) {
      // We need to get the user's email and other info from Clerk API
      const clerkUserResponse = await fetch(`https://api.clerk.dev/v1/users/${clerkId}`, {
        headers: {
          Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}`,
        },
      });
      
      if (!clerkUserResponse.ok) {
        return NextResponse.json({ error: 'Failed to fetch user data from Clerk' }, { status: 500 });
      }
      
      const clerkUser = await clerkUserResponse.json();
      const userEmail = clerkUser.email_addresses[0]?.email_address;
      
      if (!userEmail) {
        return NextResponse.json({ error: 'User email not found' }, { status: 400 });
      }
      
      // Check if user already exists with this email
      const existingUserWithEmail = await prisma.user.findUnique({
        where: { email: userEmail },
      });
      
      if (existingUserWithEmail) {
        // Update the existing user with the clerk ID
        dbUser = await prisma.user.update({
          where: { id: existingUserWithEmail.id },
          data: { 
            clerkId,
            firstName: clerkUser.first_name || existingUserWithEmail.firstName,
            lastName: clerkUser.last_name || existingUserWithEmail.lastName,
            imageUrl: clerkUser.image_url || existingUserWithEmail.imageUrl || '',
          },
        });
        console.log(`Updated existing user (${existingUserWithEmail.id}) with new clerkId: ${clerkId}`);
      } else {
        // Create a new user
        dbUser = await prisma.user.create({
          data: {
            clerkId,
            email: userEmail,
            firstName: clerkUser.first_name || '',
            lastName: clerkUser.last_name || '',
            imageUrl: clerkUser.image_url || '',
          },
        });
        console.log(`Created new user: ${dbUser.id} for clerk user: ${clerkId}`);
      }
    }

    // Compare the invitation email with the user's email from database
    // We're not doing an exact match to allow for case differences
    const invitationEmailLower = invitation.email.toLowerCase();
    const userEmailLower = dbUser.email.toLowerCase();
    
    if (userEmailLower !== invitationEmailLower) {
      return NextResponse.json({ 
        error: 'This invitation was sent to a different email address than the one you are signed in with' 
      }, { status: 403 });
    }

    // Check if user is already a member of the workspace
    const existingMembership = await prisma.workspaceMember.findFirst({
      where: {
        workspaceId: invitation.workspaceId,
        userId: dbUser.id,
      },
    });

    if (existingMembership) {
      // Update invitation status to ACCEPTED
      await prisma.invitation.update({
        where: { id: invitation.id },
        data: { status: 'ACCEPTED' },
      });
      
      return NextResponse.json({ 
        success: true, 
        message: 'You are already a member of this workspace',
        workspace: {
          id: invitation.workspace.id,
          name: invitation.workspace.name,
        }
      });
    }

    // Add the user as a member of the workspace
    await prisma.workspaceMember.create({
      data: {
        workspaceId: invitation.workspaceId,
        userId: dbUser.id,
        role: invitation.role,
      },
    });

    // Update invitation status to ACCEPTED
    await prisma.invitation.update({
      where: { id: invitation.id },
      data: { status: 'ACCEPTED' },
    });

    console.log(`User ${dbUser.id} accepted invitation to workspace ${invitation.workspaceId}`);

    return NextResponse.json({ 
      success: true,
      workspace: {
        id: invitation.workspace.id,
        name: invitation.workspace.name,
      }
    });
  } catch (error: any) {
    console.error('Error accepting invitation:', error);
    
    // Provide more specific error messages
    if (error.code === 'P2002' && error.meta?.target?.includes('email')) {
      return NextResponse.json({ 
        error: 'Email address already in use. Please sign in with the account associated with that email.' 
      }, { status: 400 });
    }
    
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Failed to accept invitation' 
    }, { status: 500 });
  }
} 