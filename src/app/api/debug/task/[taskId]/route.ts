import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: { taskId: string } }
) {
  try {
    const taskId = params.taskId;

    const task = await db.task.findUnique({
      where: { id: taskId },
      include: {
        project: {
          include: {
            workspace: true
          }
        },
        assignee: true,
        creator: true,
        comments: {
          include: {
            author: true
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    return NextResponse.json(task);
  } catch (error) {
    console.error('Debug task error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 