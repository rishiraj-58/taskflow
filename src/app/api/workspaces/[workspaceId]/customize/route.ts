import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function PUT(
  request: NextRequest,
  { params }: { params: { workspaceId: string } }
) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const workspaceId = params.workspaceId;
    
    // Verify workspace exists and user has permission
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: {
        id: true,
        name: true,
        imageUrl: true,
        members: {
          where: {
            user: {
              clerkId: userId,
            },
          },
        },
      },
    });

    if (!workspace) {
      return NextResponse.json(
        { error: "Workspace not found" },
        { status: 404 }
      );
    }

    if (workspace.members.length === 0) {
      return NextResponse.json(
        { error: "You don't have permission to customize this workspace" },
        { status: 403 }
      );
    }

    // Extract form data
    const formData = await request.formData();
    const removeLogo = formData.get("removeLogo") === "true";
    const file = formData.get("file") as File | null;
    
    // Process the uploaded file or removal request
    let imageUrl: string | null = workspace.imageUrl;
    
    if (removeLogo) {
      imageUrl = null;
    } else if (file) {
      // Validate file type
      const validTypes = ["image/jpeg", "image/png", "image/svg+xml"];
      if (!validTypes.includes(file.type)) {
        return NextResponse.json(
          { error: "Invalid file type. Only JPEG, PNG, and SVG are allowed." },
          { status: 400 }
        );
      }
      
      // Validate file size (max 5MB)
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (file.size > maxSize) {
        return NextResponse.json(
          { error: "File size exceeds 5MB limit." },
          { status: 400 }
        );
      }
      
      // In a real implementation, you would upload the file to a storage service
      // and get back a URL. For this example, we'll simulate this.
      imageUrl = `https://example.com/logos/${workspaceId}-${file.name}`;
    }

    // Update the workspace with the new customization
    const updatedWorkspace = await prisma.workspace.update({
      where: { id: workspaceId },
      data: {
        imageUrl,
      },
    });

    return NextResponse.json({
      message: "Workspace customization updated successfully",
      workspace: {
        id: updatedWorkspace.id,
        name: updatedWorkspace.name,
        logoUrl: updatedWorkspace.imageUrl,
      },
    });
  } catch (error) {
    console.error("Error updating workspace customization:", error);
    return NextResponse.json(
      { error: "Failed to update workspace customization" },
      { status: 500 }
    );
  }
} 