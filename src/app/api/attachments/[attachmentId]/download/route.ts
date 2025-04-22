import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { generateDownloadUrl } from "@/lib/s3";

export async function GET(
  request: Request,
  { params }: { params: { attachmentId: string } }
) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the user from database
    const dbUser = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get the attachment
    const attachment = await prisma.attachment.findUnique({
      where: { id: params.attachmentId },
      include: {
        comment: {
          include: {
            task: {
              include: {
                project: {
                  include: {
                    workspace: {
                      include: {
                        members: {
                          where: { userId: dbUser.id }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!attachment) {
      return NextResponse.json({ error: "Attachment not found" }, { status: 404 });
    }

    // Check if user has access to this attachment via workspace membership
    if (attachment.comment.task.project.workspace.members.length === 0) {
      return NextResponse.json({ error: "Not authorized to download this attachment" }, { status: 403 });
    }

    // Generate download URL
    const downloadUrl = await generateDownloadUrl(attachment.key);

    return NextResponse.json({ downloadUrl });
  } catch (error) {
    console.error("Error generating download URL:", error);
    return NextResponse.json({ error: "Failed to generate download URL" }, { status: 500 });
  }
} 