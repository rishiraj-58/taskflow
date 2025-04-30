import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";

// Get all milestones for a roadmap
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

    // Check if roadmap exists and user has access
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
        project: true,
      },
    });

    if (!roadmap) {
      return NextResponse.json(
        { error: "Roadmap not found or access denied" },
        { status: 404 }
      );
    }

    // Get all milestones for this roadmap
    const milestones = await (prisma as any).milestone.findMany({
      where: {
        roadmapId: roadmapId,
      },
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
    });

    return NextResponse.json(milestones);
  } catch (error) {
    console.error("Error fetching milestones:", error);
    return NextResponse.json(
      { error: "Failed to fetch milestones" },
      { status: 500 }
    );
  }
}

// Create a new milestone
export async function POST(
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

    // Check if roadmap exists and user has access
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
    });

    if (!roadmap) {
      return NextResponse.json(
        { error: "Roadmap not found or access denied" },
        { status: 404 }
      );
    }

    // Create the milestone
    const milestone = await (prisma as any).milestone.create({
      data: {
        name: data.name,
        description: data.description,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        status: data.status || "PLANNED",
        roadmapId: roadmapId,
      },
    });

    // Create dependencies if provided
    if (data.dependencies && data.dependencies.length > 0) {
      const dependencyPromises = data.dependencies.map((depId: string) =>
        (prisma as any).dependencyLink.create({
          data: {
            sourceMilestoneId: milestone.id,
            targetMilestoneId: depId,
            type: data.dependencyType || "BLOCKS",
          },
        })
      );

      await Promise.all(dependencyPromises);
    }

    return NextResponse.json(milestone);
  } catch (error) {
    console.error("Error creating milestone:", error);
    return NextResponse.json(
      { error: "Failed to create milestone" },
      { status: 500 }
    );
  }
} 