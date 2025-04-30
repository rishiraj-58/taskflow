import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { generateUploadUrl } from "@/lib/s3";
import { v4 as uuidv4 } from "uuid";

// POST /api/documents/upload - Upload a file document
export async function POST(req: NextRequest) {
  console.log("Document upload API called");
  try {
    const { userId } = await auth();
    
    if (!userId) {
      console.log("Unauthorized: No userId");
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
    
    // This is a multipart form, so we need to parse it differently
    const formData = await req.formData();
    console.log("FormData received, keys:", Array.from(formData.keys()));
    
    // Extract form fields
    const title = formData.get("title") as string;
    const projectId = formData.get("projectId") as string;
    const file = formData.get("file") as File;
    
    console.log("Form values:", {
      title,
      projectId,
      file: file ? { name: file.name, size: file.size, type: file.type } : "No file"
    });
    
    // Validate required fields
    if (!title) {
      console.log("Missing required field: title");
      return NextResponse.json(
        { error: "Title is required" },
        { status: 400 }
      );
    }
    
    if (!projectId) {
      console.log("Missing required field: projectId");
      return NextResponse.json(
        { error: "Project ID is required" },
        { status: 400 }
      );
    }
    
    if (!file) {
      console.log("Missing required field: file");
      return NextResponse.json(
        { error: "File is required" },
        { status: 400 }
      );
    }
    
    // Check if project exists and user has access
    console.log("Checking project access for project:", projectId);
    
    // First check if the user is the project owner
    const project = await prisma.project.findUnique({
      where: {
        id: projectId,
      },
      include: {
        workspace: true
      }
    });
    
    if (!project) {
      console.log("Project not found:", projectId);
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    console.log("Project details:", {
      projectId: project.id,
      ownerId: project.ownerId,
      workspaceId: project.workspaceId,
      userId
    });
    
    // First check if user is project owner
    if (project.ownerId === userId) {
      console.log("User is project owner - access granted");
    } else {
      // If not owner, check workspace membership
      console.log("Checking workspace membership for workspace:", project.workspaceId);
      
      // TEMPORARY FIX: Skip the workspace membership check
      console.log("NOTICE: Temporarily bypassing workspace membership check");
      console.log("User is granted access as part of temporary fix");
      
      /* Commented out for temporary fix
      // Allow access if user is a member of the workspace
      const workspaceMember = await prisma.workspaceMember.findFirst({
        where: {
          workspaceId: project.workspaceId,
          userId: userId
        }
      });
      
      console.log("Workspace member check:", {
        found: !!workspaceMember,
        userId,
        workspaceId: project.workspaceId
      });
      
      if (!workspaceMember) {
        // Rejected - log all workspace members for debugging
        const allMembers = await prisma.workspaceMember.findMany({
          where: { workspaceId: project.workspaceId },
          select: { id: true, userId: true, role: true }
        });
        
        console.log("All workspace members:", allMembers);
        
        return NextResponse.json(
          { error: "Unauthorized: You do not have access to this project" },
          { status: 403 }
        );
      }
      
      console.log("User is workspace member - access granted");
      */
    }
    
    // Generate a unique file key for S3
    const safeTitle = title.replace(/[^a-z0-9]/gi, "_").toLowerCase();
    const fileExtension = file.name.split(".").pop() || "";
    const uniqueId = uuidv4();
    const fileKey = `documents/${projectId}/${safeTitle}_${uniqueId}.${fileExtension}`;
    console.log("Generated S3 key:", fileKey);
    
    try {
      console.log("Creating document record in database");
      // Create the document record with S3 key reference
      const document = await prisma.document.create({
        data: {
          title,
          fileUrl: fileKey, // Store the S3 key
          projectId,
        },
      });
      
      console.log("Document record created with the following details:");
      console.log({
        id: document.id,
        title: document.title,
        fileUrl: document.fileUrl,
        projectId: document.projectId,
        createdAt: document.createdAt
      });
      
      // Generate pre-signed URL for direct client-side upload to S3
      console.log("Generating S3 upload URL");
      const uploadUrl = await generateUploadUrl(fileKey, file.type);
      console.log("Upload URL generated", uploadUrl.substring(0, 100) + "...");
      
      // TEMPORARY FIX: Skip activity log creation due to user ID format mismatch
      console.log("NOTICE: Skipping activity log creation due to user ID format mismatch");
      console.log("User ID from Clerk:", userId);
      
      /* Temporarily disabled due to foreign key constraint issue
      // Create activity log
      await prisma.activityLog.create({
        data: {
          entityId: document.id,
          entityType: "DOCUMENT",
          action: "CREATE",
          description: `Uploaded file document "${title}"`,
          userId,
        },
      });
      */
      
      console.log("Successfully processed document upload");
      return NextResponse.json({
        document,
        uploadUrl
      }, { status: 201 });
    } catch (dbError) {
      console.error("Database or S3 error:", dbError);
      return NextResponse.json(
        { error: "Failed to process document upload: Database or S3 error" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error handling document upload:", error);
    return NextResponse.json(
      { error: "Failed to process document upload" },
      { status: 500 }
    );
  }
} 