import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";

// Create a new feature
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await req.json();

    // Find the database user by Clerk ID
    const dbUser = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if milestone exists (if provided) and user has access
    if (data.milestoneId) {
      const milestone = await (prisma as any).milestone.findFirst({
        where: {
          id: data.milestoneId,
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
    } else if (data.projectId) {
      // Check if project exists and user has access
      const project = await prisma.project.findFirst({
        where: {
          id: data.projectId,
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
      });

      if (!project) {
        return NextResponse.json(
          { error: "Project not found or access denied" },
          { status: 404 }
        );
      }
    } else {
      return NextResponse.json(
        { error: "Either milestoneId or projectId is required" },
        { status: 400 }
      );
    }

    // Create the feature
    const feature = await (prisma as any).feature.create({
      data: {
        name: data.name,
        description: data.description,
        status: data.status || "PLANNED",
        priority: data.priority || "MEDIUM",
        ...(data.milestoneId && {
          milestone: {
            connect: {
              id: data.milestoneId,
            },
          },
        }),
        ...(data.projectId && !data.milestoneId && {
          project: {
            connect: {
              id: data.projectId,
            },
          },
        }),
      },
    });

    return NextResponse.json(feature);
  } catch (error) {
    console.error("Error creating feature:", error);
    return NextResponse.json(
      { 
        error: "Failed to create feature",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
} 