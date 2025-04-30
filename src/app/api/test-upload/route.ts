import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  console.log("Test upload API called");
  
  try {
    // Log request information
    console.log("Request headers:", Object.fromEntries(req.headers.entries()));
    console.log("Content-Type:", req.headers.get("content-type"));
    
    // Parse FormData
    const formData = await req.formData();
    console.log("FormData keys:", Array.from(formData.keys()));
    
    // Get file from FormData
    const file = formData.get("file") as File | null;
    const title = formData.get("title") as string;
    const projectId = formData.get("projectId") as string;
    
    // Log file information
    if (file instanceof File) {
      console.log("File received:", {
        name: file.name,
        type: file.type,
        size: file.size,
      });
    } else {
      console.log("No file or invalid file found in request");
    }
    
    // Log other form fields
    console.log("Form fields:", {
      title,
      projectId,
    });
    
    // Return a success response
    return NextResponse.json({
      success: true,
      message: "File received successfully in test upload",
      fileInfo: file ? {
        name: file.name,
        type: file.type,
        size: file.size,
      } : null,
      formFields: {
        title,
        projectId,
      }
    });
  } catch (error) {
    console.error("Error in test upload:", error);
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
} 