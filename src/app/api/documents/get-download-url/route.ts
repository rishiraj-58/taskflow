import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { generateDownloadUrl } from "@/lib/s3";

// GET /api/documents/get-download-url - Generate a download URL for a file key
export async function GET(req: NextRequest) {
  try {
    console.log("GET /api/documents/get-download-url");
    
    const { userId } = await auth();
    if (!userId) {
      console.log("Unauthorized: No userId");
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
    
    // Get the file key from query parameters
    const { searchParams } = new URL(req.url);
    const key = searchParams.get("key");
    
    if (!key) {
      console.log("Missing required parameter: key");
      return NextResponse.json(
        { error: "File key is required" },
        { status: 400 }
      );
    }
    
    console.log("Generating download URL for key:", key);
    
    try {
      const url = await generateDownloadUrl(key);
      console.log("Generated download URL:", url?.substring(0, 100) + "...");
      
      return NextResponse.json({ url });
    } catch (s3Error) {
      console.error("Error generating download URL:", s3Error);
      return NextResponse.json(
        { error: "Failed to generate download URL" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error handling download URL request:", error);
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
} 