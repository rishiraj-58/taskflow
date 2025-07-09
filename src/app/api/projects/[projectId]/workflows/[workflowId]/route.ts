import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

// GET - Get a specific workflow
export async function GET(
  request: NextRequest,
  { params }: { params: { projectId: string; workflowId: string } }
) {
  const { userId } = await auth();
  const { projectId, workflowId } = params;

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

    // Check if the project exists and user has access
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        workspace: {
          members: {
            some: {
              userId: user.id,
            },
          },
        },
      },
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found or access denied' }, { status: 404 });
    }

    // Get the workflow
    const workflow = await prisma.workflow.findUnique({
      where: {
        id: workflowId,
        projectId,
      },
    });

    if (!workflow) {
      return NextResponse.json({ error: 'Workflow not found' }, { status: 404 });
    }

    return NextResponse.json(workflow);
  } catch (error) {
    console.error('Error fetching workflow:', error);
    return NextResponse.json({ error: 'Failed to fetch workflow' }, { status: 500 });
  }
}

// PUT - Update a workflow
export async function PUT(
  request: NextRequest,
  { params }: { params: { projectId: string; workflowId: string } }
) {
  const { userId } = await auth();
  const { projectId, workflowId } = params;

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { name, description, steps, status } = body;

    // Get the user from database
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if the project exists and user has access
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        workspace: {
          members: {
            some: {
              userId: user.id,
              role: { in: ['ADMIN'] },
            },
          },
        },
      },
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found or access denied' }, { status: 404 });
    }

    // Update the workflow
    const workflow = await prisma.workflow.update({
      where: {
        id: workflowId,
        projectId,
      },
      data: {
        name: name,
        description: description,
        steps: steps,
        status: status,
      },
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        entityId: workflow.id,
        entityType: 'Workflow',
        action: 'updated',
        description: `Updated workflow: ${name}`,
        userId: user.id,
      },
    });

    return NextResponse.json(workflow);
  } catch (error) {
    console.error('Error updating workflow:', error);
    return NextResponse.json({ error: 'Failed to update workflow' }, { status: 500 });
  }
}

// DELETE - Delete a workflow
export async function DELETE(
  request: NextRequest,
  { params }: { params: { projectId: string; workflowId: string } }
) {
  const { userId } = await auth();
  const { projectId, workflowId } = params;

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

    // Check if the project exists and user has access as admin or owner
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        workspace: {
          members: {
            some: {
              userId: user.id,
              role: { in: ['ADMIN'] },
            },
          },
        },
      },
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found or access denied' }, { status: 404 });
    }

    // Get workflow before deletion for activity log
    const workflow = await prisma.workflow.findUnique({
      where: {
        id: workflowId,
        projectId,
      },
    });

    if (!workflow) {
      return NextResponse.json({ error: 'Workflow not found' }, { status: 404 });
    }

    // Delete the workflow
    await prisma.workflow.delete({
      where: {
        id: workflowId,
        projectId,
      },
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        entityId: workflowId,
        entityType: 'Workflow',
        action: 'deleted',
        description: `Deleted workflow: ${workflow.name}`,
        userId: user.id,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting workflow:', error);
    return NextResponse.json({ error: 'Failed to delete workflow' }, { status: 500 });
  }
} 