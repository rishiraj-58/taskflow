import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
    
    // Find all workspaces the user belongs to
    const userWorkspaces = await prisma.workspaceMember.findMany({
      where: {
        userId: userId,
      },
      select: {
        workspaceId: true,
      },
    });
    
    const workspaceIds = userWorkspaces.map(workspace => workspace.workspaceId);
    
    if (workspaceIds.length === 0) {
      return NextResponse.json([]);
    }
    
    // Get all team members from those workspaces
    const teamMembers = await prisma.workspaceMember.findMany({
      where: {
        workspaceId: {
          in: workspaceIds,
        },
      },
      select: {
        id: true,
        userId: true,
        role: true,
        status: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            imageUrl: true,
          },
        },
        workspace: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    
    // Format the response
    const formattedMembers = teamMembers.map(member => ({
      id: member.id,
      userId: member.userId,
      email: member.user.email,
      name: member.user.firstName + ' ' + member.user.lastName || 'Unnamed User',
      role: member.role,
      status: member.status || 'ACTIVE',
      joinedAt: member.createdAt,
      imageUrl: member.user.imageUrl,
      workspace: {
        id: member.workspace.id,
        name: member.workspace.name,
      }
    }));
    
    // Remove duplicates based on userId (same user might be in multiple workspaces)
    const uniqueMembers = Array.from(
      new Map(formattedMembers.map(member => [member.userId, member])).values()
    );
    
    return NextResponse.json(uniqueMembers);
  } catch (error) {
    console.error("Error fetching team members:", error);
    return NextResponse.json(
      { error: "Failed to fetch team members" },
      { status: 500 }
    );
  }
} 