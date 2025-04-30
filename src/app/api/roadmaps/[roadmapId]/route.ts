import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";

// GET a single roadmap with its milestones
export async function GET(
  req: NextRequest,
  { params }: { params: { roadmapId: string } }
) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Find the database user by Clerk ID
    const dbUser = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const roadmapId = params.roadmapId;

    // Get the roadmap with milestones and verify user has access
    const roadmap = await (prisma as any).roadmap.findFirst({
      where: {
        id: roadmapId,
        project: {
          OR: [
            { ownerId: dbUser.id },
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
          orderBy: {
            startDate: "asc",
          },
        },
      },
    });

    if (!roadmap) {
      return NextResponse.json(
        { error: "Roadmap not found or access denied" },
        { status: 404 }
      );
    }

    return NextResponse.json(roadmap);
  } catch (error) {
    console.error("Error fetching roadmap:", error);
    return NextResponse.json(
      { error: "Failed to fetch roadmap" },
      { status: 500 }
    );
  }
}

// Update a roadmap
export async function PUT(
  req: NextRequest,
  { params }: { params: { roadmapId: string } }
) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Find the database user by Clerk ID
    const dbUser = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const roadmapId = params.roadmapId;
    const data = await req.json();

    // Check if roadmap exists and user has edit access
    const roadmap = await (prisma as any).roadmap.findFirst({
      where: {
        id: roadmapId,
        project: {
          OR: [
            { ownerId: dbUser.id },
            {
              workspace: {
                members: {
                  some: {
                    userId: dbUser.id,
                    role: "ADMIN",
                  },
                },
              },
            },
          ],
        },
      },
      include: {
        project: true,
      },
    });

    if (!roadmap) {
      return NextResponse.json(
        { error: "Roadmap not found or access denied" },
        { status: 404 }
      );
    }

    // Update the roadmap
    const updatedRoadmap = await (prisma as any).roadmap.update({
      where: {
        id: roadmapId,
      },
      data: {
        name: data.name,
        description: data.description,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
      },
    });

    return NextResponse.json(updatedRoadmap);
  } catch (error) {
    console.error("Error updating roadmap:", error);
    return NextResponse.json(
      { error: "Failed to update roadmap" },
      { status: 500 }
    );
  }
}

// Delete a roadmap
export async function DELETE(
  req: NextRequest,
  { params }: { params: { roadmapId: string } }
) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Find the database user by Clerk ID
    const dbUser = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const roadmapId = params.roadmapId;

    // Check if roadmap exists and user has delete access
    const roadmap = await (prisma as any).roadmap.findFirst({
      where: {
        id: roadmapId,
        project: {
          OR: [
            { ownerId: dbUser.id },
            {
              workspace: {
                members: {
                  some: {
                    userId: dbUser.id,
                    role: "ADMIN",
                  },
                },
              },
            },
          ],
        },
      },
      include: {
        project: true,
      },
    });

    if (!roadmap) {
      return NextResponse.json(
        { error: "Roadmap not found or access denied" },
        { status: 404 }
      );
    }

    // Delete the roadmap (will cascade delete milestones, features, etc.)
    await (prisma as any).roadmap.delete({
      where: {
        id: roadmapId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting roadmap:", error);
    return NextResponse.json(
      { error: "Failed to delete roadmap" },
      { status: 500 }
    );
  }
} 