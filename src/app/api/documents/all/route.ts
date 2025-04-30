import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

// GET /api/documents/all - Get all documents for debugging
export async function GET(req: NextRequest) {
  try {
    console.log("GET /api/documents/all - Debug endpoint");
    
    const { userId } = await auth();
    
    if (!userId) {
      console.log("Unauthorized: No userId");
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
    
    // Get all documents from the database
    const documents = await prisma.document.findMany({
      orderBy: {
        updatedAt: "desc",
      },
    });
    
    console.log(`Debug endpoint found ${documents.length} documents`);
    
    // Create debug-friendly response
    const documentDetails = documents.map(doc => ({
      id: doc.id,
      title: doc.title,
      fileUrl: doc.fileUrl,
      fileUrlEmpty: doc.fileUrl === "",
      fileUrlNull: doc.fileUrl === null,
      fileUrlLength: doc.fileUrl ? doc.fileUrl.length : 0,
      hasContent: doc.content !== null && doc.content !== "",
      projectId: doc.projectId,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt
    }));
    
    // Add cache control headers to prevent caching
    const headers = new Headers();
    headers.append('Cache-Control', 'no-store, no-cache, must-revalidate');
    headers.append('Pragma', 'no-cache');
    
    return NextResponse.json(
      { 
        timestamp: new Date().toISOString(),
        userId,
        documents: documentDetails
      }, 
      { 
        headers 
      }
    );
  } catch (error) {
    console.error("Error in debug endpoint:", error);
    return NextResponse.json(
      { error: "Failed to fetch documents for debugging" },
      { status: 500 }
    );
  }
} 