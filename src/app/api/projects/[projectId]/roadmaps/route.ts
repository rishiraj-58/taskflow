import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";

// Get all roadmaps for a project
export async function GET(
  req: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const projectId = params.projectId;
    console.log("Getting roadmaps for project:", projectId);
    console.log("Authenticated user ID:", userId);

    // Find the database user by Clerk ID
    const dbUser = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (!dbUser) {
      console.log(`User with Clerk ID ${userId} not found in database`);
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    console.log("Database user ID:", dbUser.id);

    // Check if project exists and user has access
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        OR: [
          // Check if user is the owner of the project
          { ownerId: dbUser.id },
          // Check if user is a member of the workspace
          {
            workspace: {
              members: {
                some: {
                  userId: dbUser.id,
                },
              },
            },
          },
        ],
      },
    });

    if (!project) {
      console.log(`Project ${projectId} not found or access denied`);
      return NextResponse.json(
        { error: "Project not found or access denied" },
        { status: 404 }
      );
    }

    console.log("Project found, fetching roadmaps...");

    // Get all roadmaps for this project with milestones
    try {
      const roadmaps = await (prisma as any).roadmap.findMany({
        where: {
          projectId: projectId,
        },
        include: {
          milestones: {
            include: {
              features: true,
              dependencies: {
                include: {
                  targetMilestone: true,
                },
              },
              dependents: {
                include: {
                  sourceMilestone: true,
                },
              },
            },
          },
        },
        orderBy: {
          startDate: "asc",
        },
      });

      console.log(`Found ${roadmaps.length} roadmaps for project ${projectId}`);
      return NextResponse.json(roadmaps);
    } catch (roadmapError) {
      console.error("Error querying roadmaps:", roadmapError);
      return NextResponse.json({ 
        error: "Failed to fetch roadmaps",
        details: roadmapError instanceof Error ? roadmapError.message : String(roadmapError)
      }, { status: 500 });
    }
  } catch (error) {
    console.error("Error in roadmaps GET handler:", error);
    return NextResponse.json(
      { 
        error: "Failed to fetch roadmaps",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

// Create a new roadmap
export async function POST(
  req: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const projectId = params.projectId;
    const data = await req.json();
    console.log("Creating roadmap for project:", projectId);
    console.log("Authenticated user ID:", userId);

    // Find the database user by Clerk ID
    const dbUser = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (!dbUser) {
      console.log(`User with Clerk ID ${userId} not found in database`);
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    console.log("Database user ID:", dbUser.id);

    // Check if project exists and user has access
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        OR: [
          // Check if user is the owner of the project
          { ownerId: dbUser.id },
          // Check if user is a member of the workspace with ADMIN role
          {
            workspace: {
              members: {
                some: {
                  userId: dbUser.id,
                  role: {
                    in: ["ADMIN"],
                  },
                },
              },
            },
          },
        ],
      },
    });

    if (!project) {
      return NextResponse.json(
        { error: "Project not found or access denied" },
        { status: 404 }
      );
    }

    // Create the roadmap
    const roadmap = await (prisma as any).roadmap.create({
      data: {
        name: data.name,
        description: data.description,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        projectId: projectId,
      },
    });

    return NextResponse.json(roadmap);
  } catch (error) {
    console.error("Error creating roadmap:", error);
    return NextResponse.json(
      { error: "Failed to create roadmap" },
      { status: 500 }
    );
  }
} 