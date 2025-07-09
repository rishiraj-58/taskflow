import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: { projectId: string } }
) {
  try {
    console.log(`Fetching members for project: ${params.projectId}`);
    
    const { userId } = await auth();
    
    if (!userId) {
      console.log("Unauthorized access attempt to project members");
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
              include: {
                user: true
              }
            }
          }
        }
      }
    });

    // Check if project exists and user is a member of its workspace
    if (!project) {
      console.log(`Project ${params.projectId} not found`);
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Check if user has access to project via workspace membership
    const userHasAccess = project.workspace.members.some(
      (member: any) => member.userId === dbUser.id
    );

    if (!userHasAccess) {
      console.log(`User ${userId} does not have access to project ${params.projectId}`);
      return NextResponse.json({ error: "Unauthorized access to this project" }, { status: 403 });
    }

    // Format project members for response
    const members = project.workspace.members.map((member: any) => ({
      id: member.id,
      userId: member.user.id,
      name: `${member.user.firstName} ${member.user.lastName}`.trim(),
      email: member.user.email,
      role: member.role,
      imageUrl: member.user.imageUrl
    }));

    console.log(`Found ${members.length} members for project ${params.projectId}`);
    
    return NextResponse.json(members);
  } catch (error) {
    console.error("Error fetching project members:", error);
    return NextResponse.json(
      { error: "Failed to fetch project members" },
      { status: 500 }
    );
  }
}

// PATCH - Update a member's role (make admin/member)
export async function PATCH(
  request: Request,
  { params }: { params: { projectId: string } }
) {
  try {
    console.log(`Updating member role for project: ${params.projectId}`);
    
    const { userId } = await auth();
    
    if (!userId) {
      console.log("Unauthorized access attempt to update member role");
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

    const body = await request.json();
    const { memberId, role } = body;

    if (!memberId || !role) {
      return NextResponse.json({ 
        error: 'Member ID and role are required' 
      }, { status: 400 });
    }

    if (role !== 'ADMIN' && role !== 'MEMBER') {
      return NextResponse.json({ 
        error: 'Invalid role. Must be either ADMIN or MEMBER' 
      }, { status: 400 });
    }

    // Find the project
    const project = await prisma.project.findUnique({
      where: { id: params.projectId },
      include: {
        workspace: true
      }
    });

    if (!project) {
      console.log(`Project ${params.projectId} not found`);
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Check if the current user is the project owner or an admin
    if (project.ownerId !== dbUser.id) {
      const userMembership = await prisma.workspaceMember.findFirst({
        where: {
          workspaceId: project.workspaceId,
          userId: dbUser.id,
          role: 'ADMIN'
        }
      });

      if (!userMembership) {
        console.log(`User ${userId} does not have permission to update member roles`);
        return NextResponse.json({ 
          error: "Only project owners or workspace admins can update member roles" 
        }, { status: 403 });
      }
    }

    // Check if the member to update exists in the workspace
    const memberToUpdate = await prisma.workspaceMember.findFirst({
      where: {
        id: memberId,
        workspaceId: project.workspaceId
      },
      include: {
        user: true
      }
    });

    if (!memberToUpdate) {
      console.log(`Member ${memberId} not found in workspace ${project.workspaceId}`);
      return NextResponse.json({ error: "Member not found in this workspace" }, { status: 404 });
    }

    // Update the member's role
    const updatedMember = await prisma.workspaceMember.update({
      where: {
        id: memberId
      },
      data: {
        role
      },
      include: {
        user: true
      }
    });

    // Log the activity
    await prisma.activityLog.create({
      data: {
        entityId: project.id,
        entityType: 'PROJECT',
        action: 'UPDATE_MEMBER',
        description: `Updated ${updatedMember.user.firstName} ${updatedMember.user.lastName}'s role to ${role}`,
        userId: dbUser.id,
      },
    });

    // Format the response
    const formattedMember = {
      id: updatedMember.id,
      userId: updatedMember.userId,
      name: `${updatedMember.user.firstName} ${updatedMember.user.lastName}`.trim(),
      email: updatedMember.user.email,
      role: updatedMember.role,
      imageUrl: updatedMember.user.imageUrl
    };

    return NextResponse.json(formattedMember);
  } catch (error) {
    console.error("Error updating member role:", error);
    return NextResponse.json(
      { error: "Failed to update member role" },
      { status: 500 }
    );
  }
}

// DELETE - Remove a member from the project's workspace
export async function DELETE(
  request: Request,
  { params }: { params: { projectId: string } }
) {
  try {
    console.log(`Removing member from project: ${params.projectId}`);
    
    const { userId } = await auth();
    const url = new URL(request.url);
    const memberId = url.searchParams.get('memberId');
    
    if (!userId) {
      console.log("Unauthorized access attempt to remove member");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!memberId) {
      return NextResponse.json({ 
        error: 'Member ID is required' 
      }, { status: 400 });
    }

    // Get the user from database
    const dbUser = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (!dbUser) {
      console.log('User not found in database for clerkId:', userId);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Find the project
    const project = await prisma.project.findUnique({
      where: { id: params.projectId },
      include: {
        workspace: true
      }
    });

    if (!project) {
      console.log(`Project ${params.projectId} not found`);
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Check if the current user is the project owner or an admin
    if (project.ownerId !== dbUser.id) {
      const userMembership = await prisma.workspaceMember.findFirst({
        where: {
          workspaceId: project.workspaceId,
          userId: dbUser.id,
          role: 'ADMIN'
        }
      });

      if (!userMembership) {
        console.log(`User ${userId} does not have permission to remove members`);
        return NextResponse.json({ 
          error: "Only project owners or workspace admins can remove members" 
        }, { status: 403 });
      }
    }

    // Check if the member to remove exists in the workspace
    const memberToRemove = await prisma.workspaceMember.findFirst({
      where: {
        id: memberId,
        workspaceId: project.workspaceId
      },
      include: {
        user: true
      }
    });

    if (!memberToRemove) {
      console.log(`Member ${memberId} not found in workspace ${project.workspaceId}`);
      return NextResponse.json({ error: "Member not found in this workspace" }, { status: 404 });
    }

    // Prevent removing the project owner
    if (memberToRemove.userId === project.ownerId) {
      return NextResponse.json({ 
        error: "Cannot remove the project owner" 
      }, { status: 400 });
    }

    // Store member info for activity log
    const memberName = `${memberToRemove.user.firstName} ${memberToRemove.user.lastName}`.trim();
    const memberEmail = memberToRemove.user.email;

    // Remove the member
    await prisma.workspaceMember.delete({
      where: {
        id: memberId
      }
    });

    // Unassign any tasks assigned to this member in the project
    await prisma.task.updateMany({
      where: {
        projectId: params.projectId,
        assigneeId: memberToRemove.userId
      },
      data: {
        assigneeId: null
      }
    });

    // Log the activity
    await prisma.activityLog.create({
      data: {
        entityId: project.id,
        entityType: 'PROJECT',
        action: 'REMOVE_MEMBER',
        description: `Removed ${memberName} (${memberEmail}) from the project`,
        userId: dbUser.id,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error removing member:", error);
    return NextResponse.json(
      { error: "Failed to remove member" },
      { status: 500 }
    );
  }
} 