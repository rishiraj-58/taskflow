import { NextRequest, NextResponse } from 'next/server';
import { handleAIChat } from '@/lib/mcp-chat-handler';

export async function POST(request: NextRequest) {
  try {
    const { message, history } = await request.json();

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required and must be a string' },
        { status: 400 }
      );
    }

    const result = await handleAIChat(message, history || []);

    return NextResponse.json({
      response: result.response,
      toolsUsed: result.toolsUsed
    });

  } catch (error) {
    console.error('Error in AI chat API:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('not authenticated')) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        );
      }
      if (error.message.includes('not found')) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 