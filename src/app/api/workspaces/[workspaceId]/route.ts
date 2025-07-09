import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: { workspaceId: string } }
) {
  try {
    const { userId } = await auth();
    const { workspaceId } = params;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const clerkId = userId;
    console.log(`GET /api/workspaces/${workspaceId} - Request received for clerk user:`, clerkId);

    // First get the user from database
    const dbUser = await prisma.user.findUnique({
      where: { clerkId },
    });

    if (!dbUser) {
      console.log(`GET /api/workspaces/${workspaceId} - User not found in database for clerkId:`, clerkId);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    console.log(`GET /api/workspaces/${workspaceId} - Fetching workspace for user:`, dbUser.id);

    // Get the workspace with members
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: {
        members: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!workspace) {
      console.log(`GET /api/workspaces/${workspaceId} - Workspace not found`);
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
    }

    // Check if user is a member of the workspace
    const isMember = workspace.members.some((member: any) => member.userId === dbUser.id);
    if (!isMember) {
      console.log(`GET /api/workspaces/${workspaceId} - Access denied, user is not a member`);
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Format the response
    const formattedMembers = workspace.members.map((member: any) => ({
      id: member.id,
      userId: member.userId,
      email: member.user.email,
      name: `${member.user.firstName} ${member.user.lastName}`.trim(),
      role: member.role,
      joinedAt: member.createdAt,
    }));

    const currentUserRole = workspace.members.find((member: any) => member.userId === dbUser.id)?.role || 'MEMBER';

    return NextResponse.json({
      id: workspace.id,
      name: workspace.name,
      description: workspace.description,
      createdAt: workspace.createdAt,
      members: formattedMembers,
      userRole: currentUserRole,
    });
  } catch (error) {
    console.error('Error fetching workspace:', error);
    return NextResponse.json({ error: 'Failed to fetch workspace' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { workspaceId: string } }
) {
  try {
    const { userId } = await auth();
    const { workspaceId } = params;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const clerkId = userId;

    try {
      const body = await request.json();
      const { name, description } = body;

      // Get the user from database
      const dbUser = await prisma.user.findUnique({
        where: { clerkId },
      });

      if (!dbUser) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      // Check if user is an admin or owner of the workspace
      const member = await prisma.workspaceMember.findFirst({
        where: {
          workspaceId,
          userId: dbUser.id,
          role: 'ADMIN',
        },
      });

      if (!member) {
        return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
      }

      // Update the workspace
      const workspace = await prisma.workspace.update({
        where: { id: workspaceId },
        data: {
          name: name,
          description: description,
        },
      });

      return NextResponse.json({
        id: workspace.id,
        name: workspace.name,
        description: workspace.description,
        updatedAt: workspace.updatedAt,
      });
    } catch (error) {
      console.error('Error updating workspace:', error);
      return NextResponse.json({ error: 'Failed to update workspace' }, { status: 500 });
    }
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { workspaceId: string } }
) {
  try {
    const { userId } = await auth();
    const { workspaceId } = params;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const clerkId = userId;

    try {
      // Get the user from database
      const dbUser = await prisma.user.findUnique({
        where: { clerkId },
      });

      if (!dbUser) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      // Check if the workspace exists
      const workspace = await prisma.workspace.findUnique({
        where: { id: workspaceId },
      });

      if (!workspace) {
        return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
      }

      // Check if user is the owner of the workspace
      if (workspace.createdBy !== dbUser.id) {
        return NextResponse.json({ error: 'Only the workspace owner can delete it' }, { status: 403 });
      }

      // Delete the workspace (this will cascade delete all members)
      await prisma.workspace.delete({
        where: { id: workspaceId },
      });

      return NextResponse.json({ success: true });
    } catch (error) {
      console.error('Error deleting workspace:', error);
      return NextResponse.json({ error: 'Failed to delete workspace' }, { status: 500 });
    }
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
