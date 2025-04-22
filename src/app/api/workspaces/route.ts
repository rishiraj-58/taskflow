import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    console.log('GET /api/workspaces - Request received');
    
    // Use auth() which returns a Promise<Auth>
    const { userId } = await auth();
    
    if (!userId) {
      console.error('GET /api/workspaces - Unauthorized: No user found in clerk session');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const clerkId = userId;
    console.log(`GET /api/workspaces - Processing request for clerk user: ${clerkId}`);

    try {
      // First check if user exists in our database
      const dbUser = await prisma.user.findUnique({
        where: { clerkId },
      });

      // If user doesn't exist in our database, return empty workspaces
      if (!dbUser) {
        console.log(`GET /api/workspaces - User not found in database for clerkId: ${clerkId}`);
        return NextResponse.json([]);
      }

      console.log(`GET /api/workspaces - Fetching workspaces for user: ${dbUser.id}`);

      // Get workspaces where user is a member
      const workspaces = await prisma.workspace.findMany({
        where: {
          OR: [
            { createdBy: dbUser.id },
            {
              members: {
                some: {
                  userId: dbUser.id,
                },
              },
            },
          ],
        },
        include: {
          _count: {
            select: { members: true },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      console.log(`GET /api/workspaces - Found ${workspaces.length} workspaces`);
      
      return NextResponse.json(workspaces.map((workspace: any) => ({
        id: workspace.id,
        name: workspace.name,
        description: workspace.description,
        createdAt: workspace.createdAt,
        memberCount: workspace._count.members,
        isOwner: workspace.createdBy === dbUser.id,
      })));
    } catch (dbError) {
      console.error('GET /api/workspaces - Database error:', dbError);
      
      // If there's a database error, just return an empty array for now 
      // so the UI doesn't show an error
      return NextResponse.json([]);
    }
  } catch (error) {
    console.error('GET /api/workspaces - Unexpected error:', error);
    return NextResponse.json({ error: 'Failed to fetch workspaces' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const { userId } = await auth();
  
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { name, description } = body;

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    // Get the user from the database
    let dbUser = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (!dbUser) {
      // Create user if it doesn't exist
      const clerkUser = await fetch(`https://api.clerk.dev/v1/users/${userId}`, {
        headers: {
          Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}`,
        },
      }).then(res => res.json());

      dbUser = await prisma.user.create({
        data: {
          clerkId: userId,
          email: clerkUser.email_addresses[0]?.email_address || 'unknown@example.com',
          firstName: clerkUser.first_name || '',
          lastName: clerkUser.last_name || '',
          imageUrl: clerkUser.image_url,
        },
      });
    }

    // Create the workspace
    const workspace = await prisma.workspace.create({
      data: {
        name,
        description,
        createdBy: dbUser.id,
        members: {
          create: {
            userId: dbUser.id,
            role: 'ADMIN',
          },
        },
      },
      include: {
        _count: {
          select: { members: true },
        },
      },
    });

    return NextResponse.json({
      id: workspace.id,
      name: workspace.name,
      description: workspace.description,
      createdAt: workspace.createdAt,
      memberCount: workspace._count.members,
      isOwner: true,
    });
  } catch (error) {
    console.error('Error creating workspace:', error);
    return NextResponse.json({ error: 'Failed to create workspace' }, { status: 500 });
  }
} 