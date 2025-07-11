import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { UserRole } from '@prisma/client';

export async function PUT(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { primaryRole, secondaryRoles } = await request.json();

    // Validate primary role
    if (!Object.values(UserRole).includes(primaryRole)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    // Validate secondary roles if provided
    if (secondaryRoles && !Array.isArray(secondaryRoles)) {
      return NextResponse.json({ error: 'Secondary roles must be an array' }, { status: 400 });
    }

    if (secondaryRoles) {
      for (const role of secondaryRoles) {
        if (!Object.values(UserRole).includes(role)) {
          return NextResponse.json({ error: `Invalid secondary role: ${role}` }, { status: 400 });
        }
      }
    }

    // Update user role
    const updatedUser = await prisma.user.update({
      where: { clerkId: userId },
      data: {
        primaryRole,
        secondaryRoles: secondaryRoles || [],
        updatedAt: new Date()
      }
    });

    return NextResponse.json({ 
      success: true, 
      user: {
        id: updatedUser.id,
        primaryRole: updatedUser.primaryRole,
        secondaryRoles: updatedUser.secondaryRoles
      }
    });

  } catch (error) {
    console.error('Error updating user role:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: {
        id: true,
        primaryRole: true,
        secondaryRoles: true,
        email: true,
        firstName: true,
        lastName: true
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ user });

  } catch (error) {
    console.error('Error fetching user role:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 