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
      id: member.user.id,
      name: `${member.user.firstName} ${member.user.lastName}`.trim(),
      email: member.user.email,
      role: member.role
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