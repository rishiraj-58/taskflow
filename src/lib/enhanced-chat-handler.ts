import { contextBuilder, openai, AI_CONFIG } from './ai-service';
import { 
  conversationStateManager, 
  ConversationState, 
  ConversationIntent,
  createInitialUserPreferences 
} from './conversation-state';
import { auth } from '@clerk/nextjs/server';
import { db } from './db';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface ChatResponse {
  response: string;
  toolsUsed: string[];
  intent?: ConversationIntent;
  actions?: any[];
  conversationId?: string;
}

// Enhanced chat handler with conversation state and role awareness
export async function handleEnhancedAIChat(
  message: string, 
  history: ChatMessage[] = [],
  context?: {
    workspaceId?: string;
    projectId?: string;
    taskId?: string;
  }
): Promise<ChatResponse> {
  try {
    console.log('🚀 Starting enhanced AI chat handler...');
    
    // Authentication check
    const authResult = await auth();
    const userId = authResult?.userId;
    if (!userId) {
      throw new Error('User not authenticated');
    }

    // Get database user ID
    const dbUser = await db.user.findUnique({
      where: { clerkId: userId },
      select: { id: true, firstName: true, lastName: true, email: true }
    });
    
    if (!dbUser) {
      throw new Error('User not found in database');
    }

    console.log(`👤 User: ${dbUser.firstName} ${dbUser.lastName} (${dbUser.email})`);

    // Get or create conversation state
    let conversationState = conversationStateManager.getState(dbUser.id);
    if (!conversationState) {
      console.log('📝 Creating new conversation state...');
      conversationState = conversationStateManager.createState(dbUser.id, context);
    } else {
      // Update context if provided
      if (context) {
        conversationStateManager.updateContext(dbUser.id, context);
      }
    }

    // Build comprehensive user context
    console.log('🔍 Building user context...');
    const userContext = await contextBuilder.buildUserContext(dbUser.id);
    if (!userContext) {
      throw new Error('Failed to build user context');
    }

    // Build project context if available
    let projectContext = null;
    const currentProjectId = context?.projectId || conversationState.currentContext.projectId;
    if (currentProjectId) {
      console.log('📁 Building project context...');
      projectContext = await contextBuilder.buildProjectContext(currentProjectId);
    }

    // Detect conversation intent
    const intent = await detectConversationIntent(message, history);
    console.log('🎯 Detected intent:', intent);
    
    // Update conversation state with new intent
    conversationStateManager.setActiveIntent(dbUser.id, intent);

    // Generate role-aware system prompt
    const systemPrompt = await contextBuilder.generateSystemPrompt(userContext, projectContext);
    console.log('📋 Generated system prompt for role:', userContext.user.primaryRole);

    // Prepare conversation for OpenAI
    const conversationMessages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...history.slice(-10), // Keep last 10 messages for context
      { role: 'user', content: message }
    ];

    // Add conversation context if we have ongoing conversation
    if (conversationState.conversationHistory.length > 0) {
      const recentContext = conversationState.conversationHistory
        .slice(-3)
        .map(turn => `Previous: User said "${turn.userMessage}" -> AI responded "${turn.aiResponse.slice(0, 100)}..."`)
        .join('\n');
      
      conversationMessages[0].content += `\n\nRecent conversation context:\n${recentContext}`;
    }

    // Call OpenAI with enhanced context
    console.log('🤖 Calling OpenAI API...');
    const completion = await openai.chat.completions.create({
      model: AI_CONFIG.model,
      messages: conversationMessages as any,
      temperature: AI_CONFIG.temperature,
      max_tokens: AI_CONFIG.maxTokens,
      stream: false
    });

    const aiResponse = completion.choices[0]?.message?.content || 
      'I apologize, but I encountered an issue generating a response.';

    console.log('✅ Received AI response:', aiResponse.slice(0, 100) + '...');

    // Simulate tool usage detection (this would be enhanced with actual MCP integration)
    const toolsUsed = detectToolsUsed(aiResponse, intent);

    // Store conversation turn
    conversationStateManager.addConversationTurn(dbUser.id, {
      userMessage: message,
      aiResponse,
      intent,
      actionsExecuted: toolsUsed,
      context: {
        workspaceId: context?.workspaceId,
        projectId: context?.projectId,
        userRole: userContext.user.primaryRole
      }
    });

    console.log('💾 Stored conversation turn');

    return {
      response: aiResponse,
      toolsUsed,
      intent,
      conversationId: conversationState.sessionId
    };

  } catch (error) {
    console.error('❌ Error in enhanced AI chat handler:', error);
    
    return {
      response: 'I apologize, but I encountered an error while processing your request. Please try again or rephrase your question.',
      toolsUsed: [],
      intent: 'general_help'
    };
  }
}

// Intent detection based on message content and context
async function detectConversationIntent(
  message: string, 
  history: ChatMessage[]
): Promise<ConversationIntent> {
  const messageLower = message.toLowerCase();
  
  // Task-related intents
  if (messageLower.includes('create') && (messageLower.includes('task') || messageLower.includes('todo'))) {
    return 'task_creation';
  }
  
  if (messageLower.includes('update') && messageLower.includes('task')) {
    return 'task_update';
  }
  
  // Project-related intents
  if (messageLower.includes('project') && (messageLower.includes('plan') || messageLower.includes('create'))) {
    return 'project_planning';
  }
  
  // Sprint-related intents
  if (messageLower.includes('sprint') || messageLower.includes('iteration')) {
    return 'sprint_management';
  }
  
  // Bug-related intents
  if (messageLower.includes('bug') || messageLower.includes('issue') || messageLower.includes('error')) {
    return 'bug_reporting';
  }
  
  // Status and analytics intents
  if (messageLower.includes('status') || messageLower.includes('progress') || messageLower.includes('report')) {
    return 'status_inquiry';
  }
  
  if (messageLower.includes('analytics') || messageLower.includes('metrics') || messageLower.includes('performance')) {
    return 'analytics_request';
  }
  
  // Team-related intents
  if (messageLower.includes('team') || messageLower.includes('assign') || messageLower.includes('member')) {
    return 'team_coordination';
  }
  
  // Default to general help
  return 'general_help';
}

// Detect which tools were likely used based on response content
function detectToolsUsed(response: string, intent: ConversationIntent): string[] {
  const tools: string[] = [];
  const responseLower = response.toLowerCase();
  
  // Based on intent, assume certain tools were used
  switch (intent) {
    case 'task_creation':
      if (responseLower.includes('created') || responseLower.includes('task')) {
        tools.push('createTask', 'getProject');
      }
      break;
      
    case 'task_update':
      if (responseLower.includes('updated') || responseLower.includes('changed')) {
        tools.push('updateTask', 'getTask');
      }
      break;
      
    case 'project_planning':
      tools.push('getProject', 'listTasks', 'getTeamMembers');
      break;
      
    case 'status_inquiry':
      tools.push('getProjectStatus', 'listTasks', 'getSprintProgress');
      break;
      
    case 'analytics_request':
      tools.push('getAnalytics', 'generateReport', 'getMetrics');
      break;
      
    case 'team_coordination':
      tools.push('getTeamMembers', 'getWorkload', 'assignTask');
      break;
      
    default:
      if (responseLower.includes('project')) tools.push('getProject');
      if (responseLower.includes('task')) tools.push('listTasks');
      if (responseLower.includes('team')) tools.push('getTeamMembers');
  }
  
  return tools;
}

// Helper function to get conversation context for API
export async function getConversationContext(userId: string) {
  const dbUser = await db.user.findUnique({
    where: { clerkId: userId },
    select: { id: true }
  });
  
  if (!dbUser) return null;
  
  const state = conversationStateManager.getState(dbUser.id);
  if (!state) return null;
  
  return {
    sessionId: state.sessionId,
    currentContext: state.currentContext,
    activeIntent: state.activeIntent,
    messageCount: state.conversationHistory.length,
    lastInteraction: state.lastInteraction
  };
}

// Helper function to clear conversation for a user
export async function clearConversation(userId: string): Promise<boolean> {
  const dbUser = await db.user.findUnique({
    where: { clerkId: userId },
    select: { id: true }
  });
  
  if (!dbUser) return false;
  
  return conversationStateManager.clearState(dbUser.id);
}

// Debug helper to get conversation stats
export function getConversationStats() {
  return {
    activeConversations: conversationStateManager.getStateCount(),
    userIds: conversationStateManager.getAllUserIds()
  };
} 