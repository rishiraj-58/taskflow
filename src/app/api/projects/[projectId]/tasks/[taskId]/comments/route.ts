import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { generateUploadUrl } from "@/lib/s3";
import { z } from "zod";

const CommentSchema = z.object({
  content: z.string().min(1, "Comment cannot be empty"),
  parentId: z.string().optional(),
  mentions: z.array(z.string()).optional(),
  attachments: z.array(z.object({
    filename: z.string(),
    contentType: z.string(),
    size: z.number()
  })).optional()
});

// Get all comments for a task
export async function GET(
  request: Request,
  { params }: { params: { projectId: string; taskId: string } }
) {
  try {
    const { userId } = await auth();
    console.log("Auth userId:", userId);
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the user from database
    console.log("Finding user with clerkId:", userId);
    const dbUser = await prisma.user.findUnique({
      where: { clerkId: userId },
    });
    console.log("Found dbUser:", dbUser ? `User ID: ${dbUser.id}` : "User not found");

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Verify the user has access to the task
    console.log("Finding task with ID:", params.taskId);
    const task = await prisma.task.findUnique({
      where: { id: params.taskId },
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
    });
    console.log("Found task:", task ? `Task title: ${task.title}, Project ID: ${task.project?.id}` : "Task not found");
    console.log("Requested project ID:", params.projectId);

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    if (task.project.id !== params.projectId) {
      console.log("Project ID mismatch - Task project ID:", task.project.id, "Params project ID:", params.projectId);
      return NextResponse.json({ error: "Task does not belong to this project" }, { status: 400 });
    }

    // Check if user has access to the task's project
    console.log("Workspace members length:", task.project.workspace.members.length);
    if (task.project.workspace.members.length === 0) {
      return NextResponse.json({ error: "Not authorized to access this task" }, { status: 403 });
    }

    // Get all comments for the task, including their attachments and mentions
    console.log("Fetching comments for task:", params.taskId);
    try {
      // Try a simpler query structure
      const comments = await prisma.comment.findMany({
        where: {
          taskId: params.taskId,
          parentId: null // Only get top-level comments
        },
        include: {
          author: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              imageUrl: true
            }
          },
          attachments: true,
          mentions: {
            include: {
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true
                }
              }
            }
          },
          replies: {
            include: {
              author: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                  imageUrl: true
                }
              },
              attachments: true,
              mentions: {
                include: {
                  user: {
                    select: {
                      id: true,
                      firstName: true,
                      lastName: true,
                      email: true
                    }
                  }
                }
              }
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });
      
      console.log("Comments query successful, found:", comments.length);
      return NextResponse.json(comments);
    } catch (commentError) {
      console.error("Error specifically in comments query:", commentError);
      return NextResponse.json({ error: "Failed to query comments" }, { status: 500 });
    }
  } catch (error) {
    console.error("Error fetching comments:", error);
    if (error instanceof Error) {
      console.error("Error details:", error.message, error.stack);
    }
    return NextResponse.json({ error: "Failed to fetch comments" }, { status: 500 });
  }
}

// Create a new comment
export async function POST(
  request: Request,
  { params }: { params: { projectId: string; taskId: string } }
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

    // Verify the user has access to the task
    const task = await prisma.task.findUnique({
      where: { id: params.taskId },
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
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    if (task.project.id !== params.projectId) {
      return NextResponse.json({ error: "Task does not belong to this project" }, { status: 400 });
    }

    // Check if user has access to the task's project
    if (task.project.workspace.members.length === 0) {
      return NextResponse.json({ error: "Not authorized to access this task" }, { status: 403 });
    }

    // Parse and validate the request body
    const body = await request.json();
    const validation = CommentSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json({ error: validation.error.errors }, { status: 400 });
    }

    const { content, parentId, mentions = [], attachments = [] } = validation.data;

    // Create the comment
    const comment = await prisma.comment.create({
      data: {
        content,
        taskId: params.taskId,
        authorId: dbUser.id,
        parentId
      }
    });

    // Process mentioned users
    if (mentions.length > 0) {
      await prisma.mention.createMany({
        data: mentions.map(userId => ({
          userId,
          commentId: comment.id
        }))
      });
    }

    // Generate upload URLs for attachments
    const uploadUrls = [];
    
    for (const attachment of attachments) {
      const fileKey = `attachments/${task.projectId}/${params.taskId}/${comment.id}/${attachment.filename}`;
      
      // Create attachment record in database
      const attachmentRecord = await prisma.attachment.create({
        data: {
          filename: attachment.filename,
          contentType: attachment.contentType,
          key: fileKey,
          size: attachment.size,
          commentId: comment.id
        }
      });
      
      // Generate upload URL
      const uploadUrl = await generateUploadUrl(fileKey, attachment.contentType);
      
      uploadUrls.push({
        attachmentId: attachmentRecord.id,
        uploadUrl,
        key: fileKey
      });
    }

    // Get the created comment with all relations
    const createdComment = await prisma.comment.findUnique({
      where: { id: comment.id },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            imageUrl: true
          }
        },
        attachments: true,
        mentions: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true
              }
            }
          }
        }
      }
    });

    return NextResponse.json({
      comment: createdComment,
      uploadUrls
    });
  } catch (error) {
    console.error("Error creating comment:", error);
    return NextResponse.json({ error: "Failed to create comment" }, { status: 500 });
  }
} 