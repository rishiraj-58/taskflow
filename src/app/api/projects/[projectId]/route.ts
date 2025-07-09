import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    console.log(`Fetching project: ${params.projectId}`);
    
    const { userId } = await auth();
    
    if (!userId) {
      console.log("Unauthorized access attempt to project details");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the user from database
    const dbUser = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (!dbUser) {
      console.log('User not found in database for clerkId:', userId);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Find the project and check if user has access via workspace membership
    const project = await prisma.project.findUnique({
      where: { id: params.projectId },
      include: {
        workspace: {
          include: {
            members: {
              where: { userId: dbUser.id }
            }
          }
        },
        owner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            imageUrl: true
          }
        }
      }
    });

    // Check if project exists and user is a member of its workspace
    if (!project) {
      console.log(`Project ${params.projectId} not found`);
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    if (project.workspace.members.length === 0) {
      console.log(`User ${userId} does not have access to project ${params.projectId}`);
      return NextResponse.json({ error: "Unauthorized access to this project" }, { status: 403 });
    }

    // Format project for response
    const formattedProject = {
      id: project.id,
      name: project.name,
      description: project.description,
      status: project.status,
      workspaceId: project.workspaceId,
      workspaceName: project.workspace.name,
      owner: {
        id: project.owner.id,
        name: `${project.owner.firstName} ${project.owner.lastName}`.trim(),
        email: project.owner.email,
        imageUrl: project.owner.imageUrl
      },
      createdAt: project.createdAt,
      updatedAt: project.updatedAt
    };

    return NextResponse.json(formattedProject);
  } catch (error) {
    console.error("Error fetching project:", error);
    return NextResponse.json(
      { error: "Failed to fetch project" },
      { status: 500 }
    );
  }
}

// PATCH - Update a project (used for archiving and general updates)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    console.log(`Updating project: ${params.projectId}`);
    
    const { userId } = await auth();
    
    if (!userId) {
      console.log("Unauthorized access attempt to update project");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the user from database
    const dbUser = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (!dbUser) {
      console.log('User not found in database for clerkId:', userId);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get request body
    const body = await request.json();
    
    // First check if user is the project owner
    const project = await prisma.project.findUnique({
      where: { id: params.projectId },
      include: {
        workspace: {
          select: { name: true }
        }
      }
    });

    // Check if project exists
    if (!project) {
      console.log(`Project ${params.projectId} not found`);
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Check if user is the project owner
    const isProjectOwner = project.ownerId === dbUser.id;
    
    // If not owner, check if user is an admin in the workspace
    let hasAdminAccess = isProjectOwner;
    
    if (!isProjectOwner) {
      const memberRecord = await prisma.workspaceMember.findFirst({
        where: {
          workspaceId: project.workspaceId,
          userId: dbUser.id,
          role: 'ADMIN'
        }
      });
      
      hasAdminAccess = !!memberRecord;
    }
    
    // Only allow owners or admins to update the project
    if (!hasAdminAccess) {
      console.log(`User ${userId} doesn't have permission to update project ${params.projectId}`);
      return NextResponse.json({ error: "You don't have permission to update this project" }, { status: 403 });
    }

    // Update the project
    const updatedProject = await prisma.project.update({
      where: { id: params.projectId },
      data: {
        name: body.name !== undefined ? body.name : undefined,
        description: body.description !== undefined ? body.description : undefined,
        status: body.status !== undefined ? body.status : undefined,
        archived: body.archived !== undefined ? body.archived : undefined,
      },
      include: {
        workspace: {
          select: {
            name: true
          }
        },
        owner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            imageUrl: true
          }
        }
      }
    });

    // Log the activity
    await prisma.activityLog.create({
      data: {
        entityId: project.id,
        entityType: 'PROJECT',
        action: body.archived ? 'ARCHIVE' : 'UPDATE',
        description: body.archived 
          ? `Archived project "${project.name}"`
          : `Updated project "${project.name}"`,
        userId: dbUser.id,
      },
    });

    // Format project for response
    const formattedProject = {
      id: updatedProject.id,
      name: updatedProject.name,
      description: updatedProject.description,
      status: updatedProject.status,
      archived: updatedProject.archived,
      workspaceId: updatedProject.workspaceId,
      workspaceName: updatedProject.workspace.name,
      owner: {
        id: updatedProject.owner.id,
        name: `${updatedProject.owner.firstName} ${updatedProject.owner.lastName}`.trim(),
        email: updatedProject.owner.email,
        imageUrl: updatedProject.owner.imageUrl
      },
      createdAt: updatedProject.createdAt,
      updatedAt: updatedProject.updatedAt
    };

    return NextResponse.json(formattedProject);
  } catch (error) {
    console.error("Error updating project:", error);
    return NextResponse.json(
      { error: "Failed to update project" },
      { status: 500 }
    );
  }
}

// DELETE - Delete a project
export async function DELETE(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    console.log(`Deleting project: ${params.projectId}`);
    
    const { userId } = await auth();
    
    if (!userId) {
      console.log("Unauthorized access attempt to delete project");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the user from database
    const dbUser = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (!dbUser) {
      console.log('User not found in database for clerkId:', userId);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get project directly without the problematic role check
    const project = await prisma.project.findUnique({
      where: { id: params.projectId },
      include: {
        workspace: {
          select: { name: true }
        }
      }
    });

    // Check if project exists
    if (!project) {
      console.log(`Project ${params.projectId} not found`);
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Only project owners can delete projects - direct check
    if (project.ownerId !== dbUser.id) {
      console.log(`User ${userId} doesn't have permission to delete project ${params.projectId}`);
      return NextResponse.json({ error: "Only project owners can delete projects" }, { status: 403 });
    }

    // Store project name for activity log
    const projectName = project.name;

    // Delete all related data first
    // This is a simplified version - in a real app you might want to handle this more carefully
    // or use cascading deletes in your database schema
    
    // Delete tasks
    await prisma.task.deleteMany({
      where: { projectId: params.projectId }
    });
    
    // Delete sprints
    await prisma.sprint.deleteMany({
      where: { projectId: params.projectId }
    });
    
    // Delete bugs
    await prisma.bug.deleteMany({
      where: { projectId: params.projectId }
    });
    
    // Delete documents
    await prisma.document.deleteMany({
      where: { projectId: params.projectId }
    });
    
    // Delete workflows
    await prisma.workflow.deleteMany({
      where: { projectId: params.projectId }
    });
    
    // Delete activity logs for this project
    await prisma.activityLog.deleteMany({
      where: { 
        entityId: params.projectId,
        entityType: 'PROJECT'
      }
    });
    
    // Finally delete the project itself
    await prisma.project.delete({
      where: { id: params.projectId }
    });

    // Create a final activity log in the workspace context
    await prisma.activityLog.create({
      data: {
        entityId: project.workspaceId,
        entityType: 'WORKSPACE',
        action: 'DELETE',
        description: `Deleted project "${projectName}"`,
        userId: dbUser.id,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting project:", error);
    return NextResponse.json(
      { error: "Failed to delete project" },
      { status: 500 }
    );
  }
} 