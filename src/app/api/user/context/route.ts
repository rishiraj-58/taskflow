import { NextRequest, NextResponse } from 'next/server';
import { getAuth, clerkClient } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';

// GET /api/user/context - Get user's current context
export async function GET(req: NextRequest) {
  try {
    const { userId } = getAuth(req);
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: {
        id: true,
        email: true,
      }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // For now, return user's workspaces and let frontend handle context
    const workspaces = await prisma.workspace.findMany({
      where: {
        members: {
          some: {
            userId: user.id,
          }
        }
      },
      select: {
        id: true,
        name: true,
        description: true,
      },
      take: 1 // Get first workspace for now
    });

    const workspace = workspaces[0] || null;
    let projects: any[] = [];

    if (workspace) {
      projects = await prisma.project.findMany({
        where: {
          workspaceId: workspace.id,
        },
        select: {
          id: true,
          name: true,
          description: true,
          workspaceId: true,
        },
        take: 1 // Get first project for now
      });
    }

    return NextResponse.json({
      workspace: workspace,
      project: projects[0] || null,
    });
  } catch (error) {
    console.error('Error fetching user context:', error);
    return NextResponse.json(
      { error: 'Failed to fetch context' },
      { status: 500 }
    );
  }
}

// PUT /api/user/context - Update user's current context
export async function PUT(req: NextRequest) {
  try {
    const { userId } = getAuth(req);
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { workspaceId, projectId } = body;

    // Get user
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { id: true }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Validate workspace access if provided
    if (workspaceId) {
      const workspaceMembership = await prisma.workspaceMember.findUnique({
        where: {
          workspaceId_userId: {
            workspaceId: workspaceId,
            userId: user.id,
          }
        }
      });

      if (!workspaceMembership) {
        return NextResponse.json(
          { error: 'Workspace access denied' },
          { status: 403 }
        );
      }
    }

    // For now, just return success
    // TODO: Store context preferences once schema is enhanced
    
    return NextResponse.json({
      success: true,
      workspaceId,
      projectId,
    });
  } catch (error) {
    console.error('Error updating user context:', error);
    return NextResponse.json(
      { error: 'Failed to update context' },
      { status: 500 }
    );
  }
} 

// POST /api/user/context - Update user profile during onboarding
export async function POST(req: NextRequest) {
  const { userId } = getAuth(req);

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { firstName, lastName, role } = await req.json();

    if (!firstName || !lastName || !role) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Valid UserRole values
    const validRoles = ['WORKSPACE_CREATOR', 'WORKSPACE_ADMIN', 'PROJECT_MANAGER', 'DEVELOPER', 'STAKEHOLDER', 'TEAM_LEAD'];
    
    if (!validRoles.includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    // Get user from Clerk to get their email
    const client = await clerkClient();
    const clerkUser = await client.users.getUser(userId);
    const email = clerkUser.emailAddresses[0]?.emailAddress;

    if (!email) {
      return NextResponse.json({ error: 'User email not found' }, { status: 400 });
    }

    // Check if user exists in our database
    let user = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user) {
      // User doesn't exist, create them
      try {
        user = await prisma.user.create({
          data: {
            clerkId: userId,
            email: email,
            firstName: firstName,
            lastName: lastName,
            primaryRole: role,
          } as any,
        });
      } catch (insertError) {
        console.error('Error creating user:', insertError);
        return NextResponse.json({ error: 'Failed to create user profile' }, { status: 500 });
      }
    } else {
      // User exists, update them
      try {
        user = await prisma.user.update({
          where: { clerkId: userId },
          data: {
            firstName: firstName,
            lastName: lastName,
            primaryRole: role,
          } as any,
        });
      } catch (updateError) {
        console.error('Error updating user:', updateError);
        return NextResponse.json({ error: 'Failed to update user profile' }, { status: 500 });
      }
    }

    // Get the updated/created user
    const updatedUser = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (!updatedUser) {
      return NextResponse.json({ error: 'User not found after update' }, { status: 404 });
    }

    // Update Clerk metadata
    try {
      await client.users.updateUserMetadata(userId, {
        publicMetadata: {
          role: role,
          dbId: updatedUser.id,
          onboardingComplete: true,
        },
      });
    } catch (clerkError) {
      console.error('Error updating Clerk metadata:', clerkError);
      // Don't fail the request if Clerk update fails
    }

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error('Error in user context endpoint:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
} 