import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

// Simple validation schema for theme color
const themeColorSchema = z.string().regex(/^#[0-9A-Fa-f]{6}$/, {
  message: "Theme color must be a valid hex color code (e.g., #7c3aed)",
});

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
      include: {
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

    // Get form data from the request
    const formData = await request.formData();
    const themeColor = formData.get("themeColor") as string;
    const removeLogo = formData.get("removeLogo") === "true";
    const logoFile = formData.get("logo") as File | null;

    // Validate theme color
    try {
      themeColorSchema.parse(themeColor);
    } catch (error) {
      return NextResponse.json(
        { error: "Invalid theme color format" },
        { status: 400 }
      );
    }

    // Handle logo upload
    let logoUrl: string | null = workspace.logoUrl;

    if (logoFile) {
      // This is where you would typically upload the file to a storage service
      // For example, using AWS S3, Cloudinary, Supabase Storage, etc.
      // For now, we'll just simulate the upload with a placeholder URL
      
      // Validate file type
      if (!["image/jpeg", "image/png", "image/svg+xml"].includes(logoFile.type)) {
        return NextResponse.json(
          { error: "Invalid file type. Only JPEG, PNG, and SVG are supported." },
          { status: 400 }
        );
      }
      
      // Validate file size (5MB max)
      if (logoFile.size > 5 * 1024 * 1024) {
        return NextResponse.json(
          { error: "File too large. Maximum size is 5MB." },
          { status: 400 }
        );
      }
      
      // Simulated upload - in a real app, you would upload to a storage service and get a URL
      logoUrl = `https://example.com/logos/${workspaceId}-${Date.now()}.${logoFile.name.split('.').pop()}`;
      
      console.log("Logo file received:", logoFile.name, logoFile.type, logoFile.size);
    } else if (removeLogo) {
      // Remove the logo if requested
      logoUrl = null;
    }

    // Update the workspace with the new customization
    const updatedWorkspace = await prisma.workspace.update({
      where: { id: workspaceId },
      data: {
        themeColor,
        logoUrl,
      },
    });

    return NextResponse.json({
      message: "Workspace customization updated successfully",
      workspace: {
        id: updatedWorkspace.id,
        name: updatedWorkspace.name,
        themeColor: updatedWorkspace.themeColor,
        logoUrl: updatedWorkspace.logoUrl,
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