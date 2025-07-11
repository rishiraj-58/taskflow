import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { contextBuilder, openai, AI_CONFIG } from '@/lib/ai-service';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    // Authentication check
    const authResult = await auth();
    if (!authResult?.userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get database user
    const dbUser = await db.user.findUnique({
      where: { clerkId: authResult.userId },
      select: { id: true, firstName: true, lastName: true, email: true }
    });
    
    if (!dbUser) {
      return NextResponse.json(
        { error: 'User not found in database' },
        { status: 404 }
      );
    }

    // Test context building
    const userContext = await contextBuilder.buildUserContext(dbUser.id);
    if (!userContext) {
      return NextResponse.json(
        { error: 'Failed to build user context' },
        { status: 500 }
      );
    }

    // Test OpenAI connection with a simple request
    const testCompletion = await openai.chat.completions.create({
      model: AI_CONFIG.model,
      messages: [
        {
          role: 'system',
          content: 'You are a helpful AI assistant for TaskFlow. Respond briefly that the connection is working.'
        },
        {
          role: 'user',
          content: 'Test connection'
        }
      ],
      temperature: 0.7,
      max_tokens: 50
    });

    const aiResponse = testCompletion.choices[0]?.message?.content || 'No response';

    return NextResponse.json({
      success: true,
      message: 'AI integration test completed successfully',
      data: {
        user: {
          id: dbUser.id,
          name: `${dbUser.firstName} ${dbUser.lastName}`,
          email: dbUser.email
        },
        userContext: {
          primaryRole: userContext.user.primaryRole || 'developer',
          workspaceCount: userContext.workspaces.length,
          projectCount: userContext.projects.length,
          activeTaskCount: userContext.activeTasks.length
        },
        aiTest: {
          model: AI_CONFIG.model,
          response: aiResponse,
          configValid: true
        },
        features: [
          'role-aware-context-building',
          'conversation-state-management', 
          'intent-detection',
          'enhanced-chat-interface',
          'openai-integration'
        ]
      }
    });

  } catch (error) {
    console.error('❌ AI integration test failed:', error);
    
    let errorMessage = 'Unknown error occurred';
    let errorType = 'unknown';
    
    if (error instanceof Error) {
      errorMessage = error.message;
      
      if (errorMessage.includes('OpenAI')) {
        errorType = 'openai_api_error';
      } else if (errorMessage.includes('context')) {
        errorType = 'context_building_error';
      } else if (errorMessage.includes('database')) {
        errorType = 'database_error';
      }
    }

    return NextResponse.json({
      success: false,
      error: errorMessage,
      errorType,
      troubleshooting: {
        checkEnvironmentVariables: 'Ensure OPENAI_API_KEY is set',
        checkDatabaseConnection: 'Verify database is accessible',
        checkUserData: 'Ensure user exists in database'
      }
    }, { status: 500 });
  }
} 