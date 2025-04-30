import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";

// Add a feature to a milestone
export async function POST(
  req: NextRequest,
  { params }: { params: { milestoneId: string } }
) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await req.json();
    const milestoneId = params.milestoneId;

    // Find the database user by Clerk ID
    const dbUser = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Verify milestone exists and user has access to add features
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
    });

    if (!milestone) {
      return NextResponse.json(
        { error: "Milestone not found or access denied" },
        { status: 404 }
      );
    }

    // Create the feature
    const feature = await (prisma as any).feature.create({
      data: {
        name: data.name,
        description: data.description,
        status: data.status || "PLANNED",
        priority: data.priority || "MEDIUM",
        milestone: {
          connect: {
            id: milestoneId,
          },
        },
      },
    });

    return NextResponse.json(feature);
  } catch (error) {
    console.error("Error adding feature:", error);
    return NextResponse.json(
      { error: "Failed to add feature" },
      { status: 500 }
    );
  }
}

// Get all features for a milestone
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

    // Get features and verify user has access to the milestone
    const features = await (prisma as any).feature.findMany({
      where: {
        milestoneId,
        milestone: {
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
      },
      orderBy: [
        { priority: "desc" },
        { createdAt: "asc" },
      ],
    });

    return NextResponse.json(features);
  } catch (error) {
    console.error("Error fetching features:", error);
    return NextResponse.json(
      { error: "Failed to fetch features" },
      { status: 500 }
    );
  }
} 