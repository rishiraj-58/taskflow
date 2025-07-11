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

    // Get the user from database
    const dbUser = await prisma.user.findUnique({
      where: { clerkId: userId },
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

    // Get workspace stats
    const [
      totalMembers,
      activeMembers,
      pendingMembers,
      recentMembers,
      pendingInvitations,
      recentInvitations
    ] = await Promise.all([
      // Total members
      prisma.workspaceMember.count({
        where: { workspaceId },
      }),
      
      // Active members
      prisma.workspaceMember.count({
        where: {
          workspaceId,
          status: 'ACTIVE',
        },
      }),
      
      // Pending members
      prisma.workspaceMember.count({
        where: {
          workspaceId,
          status: 'PENDING',
        },
      }),
      
      // Recent members (joined in last 7 days)
      prisma.workspaceMember.count({
        where: {
          workspaceId,
          joinedAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
      }),
      
      // Pending invitations
      prisma.workspaceInvitation.count({
        where: {
          workspaceId,
          status: 'PENDING',
        },
      }),
      
      // Recent invitations (sent in last 7 days)
      prisma.workspaceInvitation.count({
        where: {
          workspaceId,
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
      }),
    ]);

    // Get role distribution
    const roleDistribution = await prisma.workspaceMember.groupBy({
      by: ['role'],
      where: { workspaceId },
      _count: {
        role: true,
      },
    });

    // Get recent activity
    const recentActivity = await prisma.workspaceMember.findMany({
      where: {
        workspaceId,
        joinedAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        },
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            imageUrl: true,
          },
        },
      },
      orderBy: {
        joinedAt: 'desc',
      },
      take: 5,
    });

    // Format role distribution
    const roles = roleDistribution.reduce((acc, role) => {
      acc[role.role] = role._count.role;
      return acc;
    }, {} as Record<string, number>);

    const stats = {
      members: {
        total: totalMembers,
        active: activeMembers,
        pending: pendingMembers,
        recent: recentMembers,
      },
      invitations: {
        pending: pendingInvitations,
        recent: recentInvitations,
      },
      roles: {
        admins: roles.ADMIN || 0,
        members: roles.MEMBER || 0,
        viewers: roles.VIEWER || 0,
      },
      activity: {
        recentJoins: recentActivity.map(member => ({
          id: member.id,
          userId: member.userId,
          name: `${member.user.firstName} ${member.user.lastName}`.trim(),
          email: member.user.email,
          imageUrl: member.user.imageUrl,
          role: member.role,
          joinedAt: member.joinedAt,
        })),
      },
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error fetching workspace stats:', error);
    return NextResponse.json({ error: 'Failed to fetch workspace stats' }, { status: 500 });
  }
} 