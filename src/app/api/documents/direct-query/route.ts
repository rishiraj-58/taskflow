import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

// GET /api/documents/direct-query - Directly query database for documents
export async function GET(req: NextRequest) {
  try {
    console.log("GET /api/documents/direct-query - Direct database query endpoint");
    
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
    
    // Get optional query parameters
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");
    const id = searchParams.get("id");
    const withFileUrlOnly = searchParams.get("withFileUrlOnly") === "true";
    
    let whereClause: any = {};
    
    if (projectId) {
      console.log("Filtering by project ID:", projectId);
      whereClause.projectId = projectId;
    }
    
    if (id) {
      console.log("Filtering by document ID:", id);
      whereClause.id = id;
    }
    
    if (withFileUrlOnly) {
      console.log("Filtering to only include documents with fileUrl");
      whereClause.fileUrl = { not: null };
    }
    
    // Query the database
    console.log("Executing database query with where clause:", whereClause);
    const documents = await prisma.document.findMany({
      where: whereClause,
      orderBy: { updatedAt: "desc" }
    });
    
    console.log(`Found ${documents.length} documents matching criteria`);
    
    // Create detailed diagnostic response
    const enhancedDocuments = documents.map(doc => ({
      ...doc,
      _diagnostic: {
        fileUrlType: typeof doc.fileUrl,
        fileUrlEmpty: doc.fileUrl === "",
        fileUrlNull: doc.fileUrl === null,
        fileUrlLength: doc.fileUrl ? doc.fileUrl.length : 0,
        hasFileUrl: Boolean(doc.fileUrl),
        hasContent: Boolean(doc.content),
        createdAt_iso: doc.createdAt.toISOString(),
        updatedAt_iso: doc.updatedAt.toISOString()
      }
    }));
    
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      count: documents.length,
      query: {
        projectId: projectId || null,
        id: id || null,
        withFileUrlOnly
      },
      documents: enhancedDocuments
    });
  } catch (error) {
    console.error("Error in direct query endpoint:", error);
    return NextResponse.json(
      { error: "Database query failed", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
} 