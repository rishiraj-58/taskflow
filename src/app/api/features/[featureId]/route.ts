import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";

// Get a specific feature
export async function GET(
  req: NextRequest,
  { params }: { params: { featureId: string } }
) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const featureId = params.featureId;

    // Find the database user by Clerk ID
    const dbUser = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get the feature and ensure user has access to it
    const feature = await (prisma as any).feature.findFirst({
      where: {
        id: featureId,
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
      include: {
        milestone: true,
      },
    });

    if (!feature) {
      return NextResponse.json(
        { error: "Feature not found or access denied" },
        { status: 404 }
      );
    }

    return NextResponse.json(feature);
  } catch (error) {
    console.error("Error fetching feature:", error);
    return NextResponse.json(
      { error: "Failed to fetch feature" },
      { status: 500 }
    );
  }
}

// Update a feature
export async function PUT(
  req: NextRequest,
  { params }: { params: { featureId: string } }
) {
  try {
    const { userId } = await auth();
    console.log("PUT/PATCH request for feature update received:", params.featureId);

    if (!userId) {
      console.log("Unauthorized: No userId found");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const featureId = params.featureId;
    const data = await req.json();
    console.log("Update data received:", data);

    // Find the database user by Clerk ID
    const dbUser = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (!dbUser) {
      console.log("User not found in database with clerkId:", userId);
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    console.log("User found:", dbUser.id);

    // Check if feature exists and user has access to update it
    const feature = await (prisma as any).feature.findFirst({
      where: {
        id: featureId,
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
    });

    if (!feature) {
      console.log("Feature not found or access denied:", featureId);
      return NextResponse.json(
        { error: "Feature not found or access denied" },
        { status: 404 }
      );
    }
    console.log("Feature found:", feature.id);

    // Update the feature
    console.log("Attempting to update feature with:", {
      name: data.name !== undefined ? data.name : undefined,
      description: data.description !== undefined ? data.description : undefined,
      status: data.status !== undefined ? data.status : undefined,
      priority: data.priority !== undefined ? data.priority : undefined,
    });
    
    try {
      const updatedFeature = await (prisma as any).feature.update({
        where: {
          id: featureId,
        },
        data: {
          name: data.name !== undefined ? data.name : undefined,
          description: data.description !== undefined ? data.description : undefined,
          status: data.status !== undefined ? data.status : undefined,
          priority: data.priority !== undefined ? data.priority : undefined,
        },
      });
      
      console.log("Feature updated successfully:", updatedFeature);
      return NextResponse.json(updatedFeature);
    } catch (updateError) {
      console.error("Prisma error updating feature:", updateError);
      return NextResponse.json(
        { 
          error: "Failed to update feature", 
          details: updateError instanceof Error ? updateError.message : String(updateError) 
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error in PUT/PATCH handler:", error);
    return NextResponse.json(
      { error: "Failed to update feature" },
      { status: 500 }
    );
  }
}

// Delete a feature
export async function DELETE(
  req: NextRequest,
  { params }: { params: { featureId: string } }
) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const featureId = params.featureId;

    // Find the database user by Clerk ID
    const dbUser = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if feature exists and user has access to delete it
    const feature = await (prisma as any).feature.findFirst({
      where: {
        id: featureId,
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
    });

    if (!feature) {
      return NextResponse.json(
        { error: "Feature not found or access denied" },
        { status: 404 }
      );
    }

    // Delete the feature
    await (prisma as any).feature.delete({
      where: {
        id: featureId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting feature:", error);
    return NextResponse.json(
      { error: "Failed to delete feature" },
      { status: 500 }
    );
  }
}

// Add PATCH method to support partial updates
export async function PATCH(
  req: NextRequest,
  { params }: { params: { featureId: string } }
) {
  try {
    const { userId } = await auth();
    console.log("PATCH request for feature update received:", params.featureId);

    if (!userId) {
      console.log("Unauthorized: No userId found");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const featureId = params.featureId;
    const data = await req.json();
    console.log("PATCH: Update data received:", data);

    // Find the database user by Clerk ID
    const dbUser = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (!dbUser) {
      console.log("User not found in database with clerkId:", userId);
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if feature exists and user has access
    const feature = await (prisma as any).feature.findFirst({
      where: {
        id: featureId,
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
    });

    if (!feature) {
      console.log("Feature not found or access denied:", featureId);
      return NextResponse.json(
        { error: "Feature not found or access denied" },
        { status: 404 }
      );
    }

    // Update the feature
    const updateData: any = {};
    
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.priority !== undefined) updateData.priority = data.priority;
    
    console.log("PATCH: Updating feature with data:", updateData);
    
    const updatedFeature = await (prisma as any).feature.update({
      where: {
        id: featureId,
      },
      data: updateData,
    });
    
    console.log("PATCH: Feature updated successfully:", updatedFeature);
    return NextResponse.json(updatedFeature);
  } catch (error) {
    console.error("Error in PATCH handler:", error);
    return NextResponse.json(
      { 
        error: "Failed to update feature",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
} 