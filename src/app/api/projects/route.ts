import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('GET /api/projects - Authenticated user:', userId);

    // Get the user from database
    const dbUser = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (!dbUser) {
      console.log('User not found in database for clerkId:', userId);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get all workspaces where user is a member
    const workspaceMemberships = await prisma.workspaceMember.findMany({
      where: { userId: dbUser.id },
      select: { workspaceId: true },
    });

    const workspaceIds = workspaceMemberships.map((m: { workspaceId: string }) => m.workspaceId);

    // Get projects from these workspaces
    const projects = await prisma.project.findMany({
      where: {
        workspaceId: { in: workspaceIds }
      },
      include: {
        workspace: {
          select: {
            name: true,
            members: {
              select: {
                id: true,
              }
            }
          }
        },
        tasks: {
          select: {
            id: true,
          }
        }
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    // Format the projects for the frontend
    const formattedProjects = projects.map((project: any) => ({
      id: project.id,
      name: project.name,
      description: project.description,
      status: project.status,
      workspaceId: project.workspaceId,
      workspaceName: project.workspace.name,
      memberCount: project.workspace.members.length,
      taskCount: project.tasks.length,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    }));

    return NextResponse.json(formattedProjects);
  } catch (error) {
    console.error('Error fetching projects:', error);
    return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get request body
    const body = await request.json();
    const { name, description, workspaceId } = body;

    if (!name || !workspaceId) {
      return NextResponse.json({ 
        error: 'Name and workspace are required' 
      }, { status: 400 });
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
      return NextResponse.json({ 
        error: 'You do not have permission to create projects in this workspace' 
      }, { status: 403 });
    }

    // Create the project
    const project = await prisma.project.create({
      data: {
        name,
        description,
        workspaceId,
        ownerId: dbUser.id,
      },
      include: {
        workspace: {
          select: {
            name: true,
            members: {
              select: {
                id: true,
              }
            }
          }
        },
      },
    });

    // Log the activity
    await prisma.activityLog.create({
      data: {
        entityId: project.id,
        entityType: 'PROJECT',
        action: 'CREATE',
        description: `Created project "${name}"`,
        userId: dbUser.id,
      },
    });

    // Format the response
    const formattedProject = {
      id: project.id,
      name: project.name,
      description: project.description,
      status: project.status,
      workspaceId: project.workspaceId,
      workspaceName: project.workspace.name,
      memberCount: project.workspace.members.length,
      taskCount: 0,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    };

    return NextResponse.json(formattedProject);
  } catch (error) {
    console.error('Error creating project:', error);
    return NextResponse.json({ error: 'Failed to create project' }, { status: 500 });
  }
} 