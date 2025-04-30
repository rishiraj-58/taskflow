import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";

// GET a single milestone with its features
export async function GET(
  req: NextRequest,
  { params }: { params: { milestoneId: string } }
) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const milestoneId = params.milestoneId;

    // Find the database user by Clerk ID
    const dbUser = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get the milestone with features and verify user has access
    const milestone = await (prisma as any).milestone.findFirst({
      where: {
        id: milestoneId,
        roadmap: {
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
      },
      include: {
        features: {
          orderBy: [
            { priority: "desc" },
            { createdAt: "asc" },
          ],
        },
      },
    });

    if (!milestone) {
      return NextResponse.json(
        { error: "Milestone not found or access denied" },
        { status: 404 }
      );
    }

    return NextResponse.json(milestone);
  } catch (error) {
    console.error("Error fetching milestone:", error);
    return NextResponse.json(
      { error: "Failed to fetch milestone" },
      { status: 500 }
    );
  }
}

// Update a milestone
export async function PUT(
  req: NextRequest,
  { params }: { params: { milestoneId: string } }
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

    const milestoneId = params.milestoneId;
    const data = await req.json();

    // Check if milestone exists and user has edit access
    const milestone = await (prisma as any).milestone.findFirst({
      where: {
        id: milestoneId,
        roadmap: {
          project: {
            OR: [
              { ownerId: dbUser.id },
              {
                workspace: {
                  members: {
                    some: {
                      userId: dbUser.id,
                      role: {
                        in: ["ADMIN", "OWNER"],
                      },
                    },
                  },
                },
              },
            ],
          },
        },
      },
    });

    if (!milestone) {
      return NextResponse.json(
        { error: "Milestone not found or access denied" },
        { status: 404 }
      );
    }

    // Update the milestone
    const updatedMilestone = await (prisma as any).milestone.update({
      where: {
        id: milestoneId,
      },
      data: {
        name: data.name,
        description: data.description,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        status: data.status,
      },
    });

    return NextResponse.json(updatedMilestone);
  } catch (error) {
    console.error("Error updating milestone:", error);
    return NextResponse.json(
      { error: "Failed to update milestone" },
      { status: 500 }
    );
  }
}

// Delete a milestone
export async function DELETE(
  req: NextRequest,
  { params }: { params: { milestoneId: string } }
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

    const milestoneId = params.milestoneId;

    // Check if milestone exists and user has delete access
    const milestone = await (prisma as any).milestone.findFirst({
      where: {
        id: milestoneId,
        roadmap: {
          project: {
            OR: [
              { ownerId: dbUser.id },
              {
                workspace: {
                  members: {
                    some: {
                      userId: dbUser.id,
                      role: {
                        in: ["ADMIN", "OWNER"],
                      },
                    },
                  },
                },
              },
            ],
          },
        },
      },
      include: {
        roadmap: true,
      },
    });

    if (!milestone) {
      return NextResponse.json(
        { error: "Milestone not found or access denied" },
        { status: 404 }
      );
    }

    // First delete associated features
    await (prisma as any).feature.deleteMany({
      where: {
        milestoneId: milestoneId,
      },
    });

    // Delete the milestone
    await (prisma as any).milestone.delete({
      where: {
        id: milestoneId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting milestone:", error);
    return NextResponse.json(
      { error: "Failed to delete milestone" },
      { status: 500 }
    );
  }
} 