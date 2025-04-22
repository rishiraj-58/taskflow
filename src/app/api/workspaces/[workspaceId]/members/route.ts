import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";

export async function POST(
  request: NextRequest,
  { params }: { params: { workspaceId: string } }
) {
  const { userId } = await auth();
  const { workspaceId } = params;

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { email, role } = body;

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    if (!['ADMIN', 'MEMBER'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    // Get the user from database
    const cUser = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (!cUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if user is an admin of the workspace
    const membership = await prisma.workspaceMember.findFirst({
      where: {
        workspaceId,
        userId: cUser.id,
        role: 'ADMIN',
      },
    });

    if (!membership) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    // Check if the workspace exists
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
    });

    if (!workspace) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
    }

    // Check if user already exists with this email
    let invitedUser = await prisma.user.findUnique({
      where: { email },
    });

    if (!invitedUser) {
      // In a real app, you would send an invitation email here
      // For now, create a placeholder user
      invitedUser = await prisma.user.create({
        data: {
          clerkId: `pending-${Date.now()}`, // This would be replaced with a real clerkId when they sign up
          email,
          firstName: email.split('@')[0],
          lastName: '',
        },
      });
    }

    // Check if user is already a member
    const existingMember = await prisma.workspaceMember.findFirst({
      where: {
        workspaceId,
        userId: invitedUser.id,
      },
    });

    if (existingMember) {
      return NextResponse.json({ error: 'User is already a member of this workspace' }, { status: 400 });
    }

    // Create the workspace member with invited status
    const member = await prisma.workspaceMember.create({
      data: {
        workspaceId,
        userId: invitedUser.id,
        role: role as 'ADMIN' | 'MEMBER',
        status: 'INVITED',
      },
      include: {
        user: true,
      },
    });

    return NextResponse.json({
      id: member.id,
      userId: member.userId,
      email: member.user.email,
      name: `${member.user.firstName} ${member.user.lastName}`.trim(),
      role: member.role,
      status: member.status,
      joinedAt: member.createdAt,
    });
  } catch (error) {
    console.error('Error inviting workspace member:', error);
    return NextResponse.json({ error: 'Failed to invite workspace member' }, { status: 500 });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { workspaceId: string } }
) {
  const { userId } = await auth();
  const { workspaceId } = params;

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get the user from database
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if user is a member of the workspace
    const membership = await prisma.workspaceMember.findFirst({
      where: {
        workspaceId,
        userId: user.id,
      },
    });

    if (!membership) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Get all members of the workspace
    const members = await prisma.workspaceMember.findMany({
      where: {
        workspaceId,
      },
      include: {
        user: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    return NextResponse.json(members.map((member: any) => ({
      id: member.id,
      userId: member.userId,
      email: member.user.email,
      name: `${member.user.firstName} ${member.user.lastName}`.trim(),
      role: member.role,
      status: member.status,
      joinedAt: member.createdAt,
    })));
  } catch (error) {
    console.error('Error fetching workspace members:', error);
    return NextResponse.json({ error: 'Failed to fetch workspace members' }, { status: 500 });
  }
} 