import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { handleEnhancedAIChat, getConversationContext, clearConversation } from '@/lib/enhanced-chat-handler';

interface ChatRequestBody {
  message: string;
  history?: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
  context?: {
    workspaceId?: string;
    projectId?: string;
    taskId?: string;
  };
  action?: 'chat' | 'clear' | 'status';
}

export async function POST(request: NextRequest) {
  try {
    // Authentication check
    const authResult = await auth();
    if (!authResult?.userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body: ChatRequestBody = await request.json();
    const { message, history = [], context, action = 'chat' } = body;

    console.log('📡 AI Chat API called:', {
      action,
      userId: authResult.userId,
      context,
      messageLength: message?.length,
      historyLength: history.length
    });

    // Handle different action types
    switch (action) {
      case 'clear':
        const cleared = await clearConversation(authResult.userId);
        return NextResponse.json({
          success: cleared,
          message: cleared ? 'Conversation cleared' : 'Failed to clear conversation'
        });

      case 'status':
        const conversationContext = await getConversationContext(authResult.userId);
        return NextResponse.json({
          status: 'active',
          context: conversationContext
        });

      case 'chat':
      default:
        // Validate required fields for chat
        if (!message || typeof message !== 'string') {
          return NextResponse.json(
            { error: 'Message is required and must be a string' },
            { status: 400 }
          );
        }

        if (message.length > 2000) {
          return NextResponse.json(
            { error: 'Message too long. Please keep it under 2000 characters.' },
            { status: 400 }
          );
        }

        // Process the chat message
        const chatResponse = await handleEnhancedAIChat(message, history, context);

        // Return enhanced response
        return NextResponse.json({
          success: true,
          response: chatResponse.response,
          toolsUsed: chatResponse.toolsUsed,
          intent: chatResponse.intent,
          conversationId: chatResponse.conversationId,
          metadata: {
            timestamp: new Date().toISOString(),
            context: context,
            messageCount: history.length + 1
          }
        });
    }

  } catch (error) {
    console.error('❌ Error in AI chat API:', error);
    
    // Return different error messages based on error type
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
      
      if (error.message.includes('context')) {
        return NextResponse.json(
          { error: 'Failed to build context. Please try again.' },
          { status: 500 }
        );
      }
    }

    // Generic error response
    return NextResponse.json(
      { 
        error: 'Internal server error. Please try again later.',
        details: process.env.NODE_ENV === 'development' ? error : undefined
      },
      { status: 500 }
    );
  }
}

// GET endpoint for conversation status and debugging
export async function GET(request: NextRequest) {
  try {
    const authResult = await auth();
    if (!authResult?.userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const conversationContext = await getConversationContext(authResult.userId);
    
    return NextResponse.json({
      userId: authResult.userId,
      hasActiveConversation: !!conversationContext,
      context: conversationContext,
      apiVersion: '2.0',
      features: ['role-awareness', 'conversation-state', 'intent-detection', 'context-building']
    });

  } catch (error) {
    console.error('❌ Error in AI chat GET:', error);
    return NextResponse.json(
      { error: 'Failed to get conversation status' },
      { status: 500 }
    );
  }
} 