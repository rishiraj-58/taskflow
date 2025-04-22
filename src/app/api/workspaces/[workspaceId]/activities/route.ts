import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: { workspaceId: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { workspaceId } = params;

    // Get the current user from the database
    const dbUser = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if the user is a member of the workspace
    const membership = await prisma.workspaceMember.findFirst({
      where: {
        workspaceId,
        userId: dbUser.id,
      },
    });

    if (!membership) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Get activity logs for this workspace
    const activityLogs = await prisma.activityLog.findMany({
      where: {
        entityId: workspaceId,
        entityType: 'WORKSPACE',
      },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            imageUrl: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 20, // Limit to 20 most recent activities
    });

    return NextResponse.json(activityLogs);
  } catch (error) {
    console.error('Error fetching workspace activities:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch workspace activities' 
    }, { status: 500 });
  }
} 