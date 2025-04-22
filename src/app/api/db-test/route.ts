import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    // Test prisma models
    const modelsList = Object.keys(prisma).filter(key => !key.startsWith('_') && !key.startsWith('$'));
    console.log("Available models:", modelsList);
    
    // Test db connection with a simple query
    const userCount = await prisma.user.count();
    
    // Test comment model existence
    let commentModelExists = false;
    let hasComments = false;
    
    if (prisma.comment) {
      commentModelExists = true;
      const commentCount = await prisma.comment.count();
      hasComments = commentCount > 0;
    }
    
    return NextResponse.json({
      success: true,
      prismaStatus: "Connected",
      models: modelsList,
      userCount,
      commentModelExists,
      hasComments,
    });
  } catch (error) {
    console.error("Database test error:", error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 });
  }
} 