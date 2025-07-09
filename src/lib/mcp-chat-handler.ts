import OpenAI from 'openai';
import { auth } from '@clerk/nextjs/server';
import { db } from './db';
import { getCurrentUserId, getDbUserId } from './auth-utils';
import { mcpClient } from './mcp-client';

const openai = new OpenAI({
  apiKey: process.env.GITHUB_TOKEN,
  baseURL: process.env.OPENAI_API_BASE_URL,
});

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

// Conversation state management
interface ConversationState {
  activeIntent: 'task_creation' | 'project_planning' | 'status_inquiry' | 'entity_clarification' | null;
  pendingTask?: {
    title?: string;
    description?: string;
    projectId?: string;
    projectName?: string;
    assigneeId?: string;
    assigneeName?: string;
    priority?: 'low' | 'medium' | 'high';
    dueDate?: string;
    missingFields: string[];
  };
  pendingClarification?: {
    type: 'task_reassignment' | 'task_search' | 'user_search' | 'project_search';
    originalMessage: string;
    extractedParams: any;
    searchResults: any;
    targetAction: string;
  };
  currentContext?: {
    workspaceId?: string;
    projectId?: string;
    projectName?: string;
  };
  lastExtractedParams?: any;
}

// Store conversation states (in production, use Redis or database)
const conversationStates = new Map<string, ConversationState>();

// Helper function to add timeout to any promise
function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(`Operation timed out after ${timeoutMs}ms`)), timeoutMs);
    })
  ]);
}

// Enhanced user name matching function
async function findUserByName(nameInput: string): Promise<{ id: string; firstName: string; lastName: string } | null> {
  const cleanName = nameInput.trim();
  
  // Try exact email match first
  if (cleanName.includes('@')) {
    const user = await db.user.findUnique({
      where: { email: cleanName.toLowerCase() },
      select: { id: true, firstName: true, lastName: true }
    });
    if (user) return user;
  }

  // Split the name and try various combinations
  const nameParts = cleanName.toLowerCase().split(/\s+/);
  const firstName = nameParts[0];
  const lastName = nameParts.slice(1).join(' ');

  // Try different matching strategies
  const searchConditions: any[] = [];

  // Full name match (first + last)
  if (lastName) {
    searchConditions.push({
      AND: [
        { firstName: { contains: firstName, mode: 'insensitive' as any } },
        { lastName: { contains: lastName, mode: 'insensitive' as any } }
      ]
    });
  }

  // First name contains the input
  searchConditions.push({
    firstName: { contains: firstName, mode: 'insensitive' as any }
  });

  // Last name contains the input
  if (lastName) {
    searchConditions.push({
      lastName: { contains: lastName, mode: 'insensitive' as any }
    });
  }

  // Combined name search (for cases like "RishiRaj" -> "Rishi Raj")
  searchConditions.push({
    OR: [
      { firstName: { contains: cleanName, mode: 'insensitive' as any } },
      { lastName: { contains: cleanName, mode: 'insensitive' as any } }
    ]
  });

  try {
    const user = await db.user.findFirst({
      where: { OR: searchConditions },
      select: { id: true, firstName: true, lastName: true },
      orderBy: [
        { firstName: 'asc' },
        { lastName: 'asc' }
      ]
    });

    return user;
  } catch (error) {
    console.error('Error finding user by name:', error);
    return null;
  }
}

// Intelligent tool selection using AI
async function intelligentToolSelection(message: string, userId: string, history: ChatMessage[], state: ConversationState) {
  // Check for continuation of existing intent first
  if (state.activeIntent === 'task_creation' && state.pendingTask) {
    const messageLower = message.toLowerCase();
    
    // User is continuing a task creation flow
    if (messageLower.includes('low') || messageLower.includes('medium') || messageLower.includes('high')) {
      return [{ type: 'continueTaskCreation', priority: 'high' as const }];
    }
    if (messageLower.includes('due') || messageLower.includes('date') || messageLower.includes('week') || messageLower.includes('tomorrow')) {
      return [{ type: 'continueTaskCreation', priority: 'high' as const }];
    }
    if (messageLower.includes('project') && (messageLower.includes('logistics') || messageLower.includes('cdb') || messageLower.includes('marketing'))) {
      return [{ type: 'continueTaskCreation', priority: 'high' as const }];
    }
    if (messageLower.includes('yes') || messageLower.includes('create') || messageLower.includes('confirm')) {
      return [{ type: 'completeTaskCreation', priority: 'high' as const }];
    }
    // More specific cancellation detection to avoid false positives
    if ((messageLower.includes('no') && !messageLower.includes('now')) || 
        messageLower.includes('cancel') || 
        messageLower.includes('abort') || 
        messageLower.includes('stop')) {
      return [{ type: 'cancelTaskCreation', priority: 'high' as const }];
    }
    // Default to continuation if in task creation mode and not explicitly cancelling
    return [{ type: 'continueTaskCreation', priority: 'high' as const }];
  }

  // Check for entity clarification continuation
  if (state.activeIntent === 'entity_clarification' && state.pendingClarification) {
    const messageLower = message.toLowerCase();
    
    // User is responding to a clarification request
    if (messageLower.includes('cancel') || messageLower.includes('abort') || messageLower.includes('stop')) {
      return [{ type: 'cancelClarification', priority: 'high' as const }];
    }
    
    // Continue with clarification handling
    return [{ type: 'handleClarification', priority: 'high' as const }];
  }

  // Check for "my tasks" requests first (higher priority than assignment)
  const messageLower = message.toLowerCase();
  if ((messageLower.includes('my tasks') || messageLower.includes('my assigned') || 
       messageLower.includes('what are my') || messageLower.includes('show my tasks') ||
       messageLower.includes('list my tasks') || messageLower.includes('tasks assigned to me') ||
       messageLower.includes('what tasks') && messageLower.includes('assigned')) && 
      !messageLower.includes('assign to') && !messageLower.includes('assign it')) {
    return [{ type: 'listMyTasks', priority: 'high' as const }];
  }

  // Check for task reassignment patterns
  if ((messageLower.includes('assign') || messageLower.includes('reassign')) && 
      (messageLower.includes('task') || messageLower.includes('it')) &&
      (messageLower.includes(' to ') || messageLower.includes(' it to '))) {
    return [{ type: 'reassignTask', priority: 'high' as const }];
  }

  // Fallback to enhanced pattern matching - removed OpenAI call to fix timeout
  return enhancedPatternFallback(message);
}

// Enhanced pattern matching with better project and sprint detection
function enhancedPatternFallback(message: string) {
  const messageLower = message.toLowerCase();
  const actions: Array<{ type: string; priority: 'high' | 'medium' | 'low' }> = [];

  // Project-specific queries
  if ((messageLower.includes('tell me about') || messageLower.includes('about the') || messageLower.includes('details about')) && 
      (messageLower.includes('project') || messageLower.includes('logistics') || messageLower.includes('marketing') || messageLower.includes('cdb'))) {
    actions.push({ type: 'getProjectDetails', priority: 'high' });
    actions.push({ type: 'getProjectProgress', priority: 'medium' });
    actions.push({ type: 'listTasks', priority: 'low' });
  }
  // Behind schedule / project health
  else if (messageLower.includes('behind schedule') || messageLower.includes('behind') || 
           (messageLower.includes('which projects') && (messageLower.includes('late') || messageLower.includes('delayed')))) {
    actions.push({ type: 'getProjectHealth', priority: 'high' });
    actions.push({ type: 'getOverdueTasks', priority: 'high' });
    actions.push({ type: 'getDeadlineTracking', priority: 'medium' });
  }
  // Sprint creation - enhanced detection
  else if ((messageLower.includes('create') || messageLower.includes('new')) && 
           (messageLower.includes('sprint') || messageLower.includes('2-week') || messageLower.includes('two week'))) {
    actions.push({ type: 'createSprint', priority: 'high' });
  }
  // Team member queries
  else if ((messageLower.includes('show') || messageLower.includes('list')) && 
           (messageLower.includes('team members') || messageLower.includes('members per project'))) {
    actions.push({ type: 'listTeamMembers', priority: 'high' });
    actions.push({ type: 'getTeamPerformance', priority: 'medium' });
  }
  // Availability queries  
  else if (messageLower.includes('available') && messageLower.includes('next week')) {
    actions.push({ type: 'getDeadlineTracking', priority: 'high' });
    actions.push({ type: 'getScheduleOptimization', priority: 'medium' });
  }
  // Task creation
  else if ((messageLower.includes('create') || messageLower.includes('add') || messageLower.includes('make')) && 
           (messageLower.includes('task') || messageLower.includes('todo'))) {
    actions.push({ type: 'createTask', priority: 'high' });
  }
  // My tasks
  else if ((messageLower.includes('my tasks') || messageLower.includes('my assigned') || 
            messageLower.includes('what are my') || messageLower.includes('tasks assigned to me'))) {
    actions.push({ type: 'listMyTasks', priority: 'high' });
  }
  // Task listings
  else if (messageLower.includes('list') && messageLower.includes('task')) {
    actions.push({ type: 'listTasks', priority: 'medium' });
  }
  // Project creation
  else if (messageLower.includes('create') && messageLower.includes('project')) {
    actions.push({ type: 'createProject', priority: 'high' });
  }
  // Project listings
  else if (messageLower.includes('list') && messageLower.includes('project')) {
    actions.push({ type: 'listProjects', priority: 'medium' });
  }
  // Overdue tasks
  else if (messageLower.includes('overdue')) {
    actions.push({ type: 'getOverdueTasks', priority: 'high' });
  }
  // Weekly completion rate
  else if (messageLower.includes('completion rate') && messageLower.includes('week')) {
    actions.push({ type: 'getWeeklyTaskCompletion', priority: 'high' });
  }
  // Monthly completion rate
  else if (messageLower.includes('completion rate') && messageLower.includes('month')) {
    actions.push({ type: 'getMonthlyTaskCompletion', priority: 'high' });
  }
  // Weekly summary
  else if (messageLower.includes('weekly') && messageLower.includes('summary')) {
    actions.push({ type: 'getWeeklySummary', priority: 'high' });
  }
  // Time-filtered tasks
  else if ((messageLower.includes('this week') || messageLower.includes('week')) && messageLower.includes('task')) {
    actions.push({ type: 'getTimeFilteredTasks', priority: 'high' });
  }
  // Sprint analytics
  else if (messageLower.includes('sprint') && (messageLower.includes('progress') || messageLower.includes('summary'))) {
    actions.push({ type: 'getSprintBurndown', priority: 'high' });
    actions.push({ type: 'getSprintRetrospective', priority: 'medium' });
  }
  // Team performance
  else if (messageLower.includes('team') && (messageLower.includes('performance') || messageLower.includes('workload'))) {
    actions.push({ type: 'getTeamPerformance', priority: 'high' });
    actions.push({ type: 'getWorkspaceStatistics', priority: 'medium' });
  }
  // Search queries
  else if (messageLower.includes('search') || messageLower.includes('find')) {
    const query = extractSearchQuery(message);
    if (query) {
      actions.push({ type: 'globalSearch', priority: 'high' });
    }
  }
  // Sprint velocity/burndown
  else if (messageLower.includes('velocity') || messageLower.includes('burndown')) {
    actions.push({ type: 'getSprintVelocity', priority: 'high' });
    actions.push({ type: 'getSprintBurndown', priority: 'medium' });
  }
  // Project health/status
  else if (messageLower.includes('health') || messageLower.includes('status')) {
    actions.push({ type: 'getProjectHealth', priority: 'high' });
    actions.push({ type: 'getKPIMonitoring', priority: 'medium' });
  }
  // Deadlines
  else if (messageLower.includes('deadline') || messageLower.includes('due')) {
    actions.push({ type: 'getDeadlineTracking', priority: 'high' });
    actions.push({ type: 'getOverdueTasks', priority: 'medium' });
  }
  // Bug analytics
  else if (messageLower.includes('bug') && (messageLower.includes('trend') || messageLower.includes('resolution'))) {
    actions.push({ type: 'getBugTrends', priority: 'high' });
    actions.push({ type: 'getBugResolutionTime', priority: 'medium' });
  }
  // Workspace analytics
  else if (messageLower.includes('workspace') && (messageLower.includes('statistics') || messageLower.includes('activity'))) {
    actions.push({ type: 'getWorkspaceStatistics', priority: 'high' });
    actions.push({ type: 'getCrossWorkspaceAnalysis', priority: 'medium' });
  }

  // If no specific patterns matched, try general actions
  if (actions.length === 0) {
    if (messageLower.includes('project')) {
      actions.push({ type: 'listProjects', priority: 'medium' });
    } else if (messageLower.includes('task')) {
      actions.push({ type: 'listTasks', priority: 'medium' });
    } else if (messageLower.includes('team')) {
      actions.push({ type: 'listTeamMembers', priority: 'medium' });
    }
  }

  return actions;
}

// Execute MCP tools based on analyzed intent with conversation state
async function executeMCPActions(actions: Array<{ type: string; priority: 'high' | 'medium' | 'low' }>, message: string, userId: string, state: ConversationState, history: ChatMessage[]) {
  const results: any[] = [];
  
  // Connect to MCP client
  try {
    await mcpClient.connect();
  } catch (error) {
    console.error('Failed to connect to MCP client:', error);
    return [{ tool: 'error', result: 'Unable to connect to MCP server' }];
  }

  for (const action of actions.slice(0, 3)) { // Limit to 3 actions to avoid overwhelming response
    try {
      let result = null;
      
      switch (action.type) {
        case 'continueTaskCreation':
          result = await handleTaskCreationContinuation(message, state);
          break;
        case 'completeTaskCreation':
          result = await handleTaskCreationCompletion(state, userId);
          break;
        case 'cancelTaskCreation':
          result = await handleTaskCreationCancellation(state);
          break;
        case 'createTask':
          result = await handleTaskCreationStart(message, userId, state, history);
          break;
        case 'reassignTask':
          result = await handleTaskReassignment(message, userId, state);
          break;
        case 'handleClarification':
          result = await handleEntityClarification(message, state, userId);
          break;
        case 'cancelClarification':
          result = await handleClarificationCancellation(state);
          break;
        case 'listMyTasks':
          // First try direct lookup with the provided user ID
          console.log(`🔍 Trying direct lookup with ID: ${userId}`);
          try {
            result = await mcpClient.callTool('listTasks', { 
              assigneeId: userId,
              ...extractTaskFilters(message) 
            });
            console.log(`✅ Direct lookup successful!`);
          } catch (directError) {
            console.log(`⚠️ Direct lookup failed, trying DB conversion...`);
            
            // Convert Clerk user ID to database user ID
            const dbUser = await getDbUserId(userId);
            console.log(`📊 DB User ID result: ${dbUser}`);
            
            if (!dbUser) {
              console.log(`❌ No database user found for Clerk ID: ${userId}`);
              result = { content: [{ text: `❌ Unable to find your user account in the database. Your ID is: ${userId}\\n\\nPlease contact support to link your account properly.` }] };
            } else {
              console.log(`✅ Found DB user ID: ${dbUser}, calling listTasks...`);
              result = await mcpClient.callTool('listTasks', { 
                assigneeId: dbUser,
                ...extractTaskFilters(message) 
              });
            }
          }
          break;
        case 'listTasks':
          result = await mcpClient.callTool('listTasks', extractTaskFilters(message));
          break;
        case 'getOverdueTasks':
          result = await mcpClient.callTool('getOverdueTasks', {});
          break;
        case 'getTaskCompletionRate':
          result = await mcpClient.callTool('getTaskCompletionRate', {});
          break;
        case 'getWeeklyTaskCompletion':
          result = await handleWeeklyTaskCompletion(message, userId);
          break;
        case 'getMonthlyTaskCompletion':
          result = await handleMonthlyTaskCompletion(message, userId);
          break;
        case 'getTimeFilteredTasks':
          result = await handleTimeFilteredTasks(message, userId);
          break;
        case 'updateTask':
          result = await mcpClient.callTool('bulkUpdateTaskStatus', {
            status: 'done',
            filters: extractTaskFilters(message)
          });
          break;

        // Project Management
        case 'createProject':
          result = await handleProjectCreation(message, userId);
          break;
        case 'listProjects':
          result = await mcpClient.callTool('listProjects', {});
          break;
        case 'getProjectDetails':
          const detailsProjectId = await extractProjectId(message);
          if (detailsProjectId) {
            result = await mcpClient.callTool('getProjectDetails', { projectId: detailsProjectId });
          } else {
            // If no project ID found, try to search by name from the message
            const projectSearchResult = await mcpClient.callTool('searchProjects', { 
              query: extractProjectNameFromMessage(message) || message.replace(/tell me about|about the|details about/gi, '').trim()
            });
            result = projectSearchResult;
          }
          break;
        case 'getProjectProgress':
          const projectId = await extractProjectId(message);
          if (projectId) {
            result = await mcpClient.callTool('getProjectProgress', { projectId });
          } else {
            // Get progress for all projects if no specific project mentioned
            result = await mcpClient.callTool('getProjectHealth', {});
          }
          break;
        case 'getProjectHealth':
          const healthProjectId = await extractProjectId(message);
          if (healthProjectId) {
            result = await mcpClient.callTool('getProjectHealth', { projectId: healthProjectId });
          }
          break;
        case 'getProjectTimeline':
          const timelineProjectId = await extractProjectId(message);
          if (timelineProjectId) {
            result = await mcpClient.callTool('getProjectTimeline', { projectId: timelineProjectId });
          }
          break;

        // Analytics & Reporting
        case 'getWeeklySummary':
          result = await mcpClient.callTool('getWeeklySummary', {});
          break;
        case 'getKPIMonitoring':
          result = await mcpClient.callTool('getKPIMonitoring', {});
          break;
        case 'getDeliveryPrediction':
          result = await mcpClient.callTool('getDeliveryPrediction', {});
          break;

        // Sprint Management
        case 'createSprint':
          result = await handleSprintCreation(message, userId);
          break;
        case 'listSprints':
          result = await mcpClient.callTool('listSprints', {});
          break;
        case 'getSprintBurndown':
          const sprintId = await extractSprintId(message);
          if (sprintId) {
            result = await mcpClient.callTool('getSprintBurndown', { sprintId });
          }
          break;
        case 'getSprintVelocity':
          result = await mcpClient.callTool('getSprintVelocity', {});
          break;

        // Bug Management
        case 'createBug':
          result = await handleBugCreation(message, userId);
          break;
        case 'listBugs':
          result = await mcpClient.callTool('listBugs', {});
          break;
        case 'getBugTrends':
          result = await mcpClient.callTool('getBugTrends', {});
          break;
        case 'getBugResolutionTime':
          result = await mcpClient.callTool('getBugResolutionTime', {});
          break;

        // Team Management
        case 'listTeamMembers':
          result = await mcpClient.callTool('listTeamMembers', {});
          break;
        case 'getTeamPerformance':
          result = await mcpClient.callTool('getTeamPerformance', {});
          break;
        case 'findUser':
          const userName = extractUserName(message);
          if (userName) {
            result = await mcpClient.callTool('findUser', { query: userName });
          }
          break;

        // Search & Discovery
        case 'globalSearch':
          const searchQuery = extractSearchQuery(message);
          if (searchQuery) {
            result = await mcpClient.callTool('globalSearch', { query: searchQuery });
          }
          break;
        case 'getRelatedItems':
          result = await mcpClient.callTool('getRelatedItems', { type: 'task' });
          break;

        // Calendar & Scheduling
        case 'getDeadlineTracking':
          const daysAhead = extractDaysAhead(message);
          result = await mcpClient.callTool('getDeadlineTracking', { daysAhead });
          break;
        case 'getScheduleOptimization':
          result = await mcpClient.callTool('getScheduleOptimization', {});
          break;

        // Workspace Management
        case 'listWorkspaces':
          result = await mcpClient.callTool('listWorkspaces', {});
          break;
        case 'getWorkspaceStatistics':
          result = await mcpClient.callTool('getWorkspaceStatistics', {});
          break;
        case 'getWorkspaceActivity':
          result = await mcpClient.callTool('getWorkspaceActivity', {});
          break;
        case 'getCrossWorkspaceAnalysis':
          result = await mcpClient.callTool('getCrossWorkspaceAnalysis', {});
          break;

        // Sprint Analytics
        case 'getSprintRetrospective':
          const retroSprintId = await extractSprintId(message);
          if (retroSprintId) {
            result = await mcpClient.callTool('getSprintRetrospective', { sprintId: retroSprintId });
          }
          break;

        default:
          result = { content: [{ text: `Unknown action: ${action.type}` }] };
      }

      if (result) {
        results.push({
          tool: action.type,
          result: (result as any).content && Array.isArray((result as any).content) && 
                 (result as any).content.length > 0 && 
                 typeof (result as any).content[0] === 'object' && 
                 'text' in (result as any).content[0] 
                 ? (result as any).content[0].text 
                 : JSON.stringify(result)
        });
      }
    } catch (error) {
      console.error(`Error executing ${action.type}:`, error);
      results.push({
        tool: action.type,
        result: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  }

  return results;
}

// Weekly task completion handler with proper date filtering
async function handleWeeklyTaskCompletion(message: string, userId: string) {
  try {
    console.log(`📊 Getting weekly task completion for user: ${userId}`);
    
    // Get user ID to use
    let userIdToUse = userId;
    try {
      const directResult = await mcpClient.callTool('listTasks', { assigneeId: userId });
      console.log(`✅ Direct user ID works: ${userId}`);
    } catch (error) {
      console.log(`⚠️ Direct lookup failed, trying DB conversion...`);
      const dbUser = await getDbUserId(userId);
      if (dbUser) {
        userIdToUse = dbUser;
      } else {
        return { content: [{ text: '❌ Unable to find your user account.' }] };
      }
    }

    // Get weekly summary which includes proper time filtering
    const weeklyResult = await mcpClient.callTool('getWeeklySummary', { userId: userIdToUse });
    
    // Also get current user's tasks to calculate accurate completion rate
    const userTasksResult = await mcpClient.callTool('listTasks', { assigneeId: userIdToUse });
    
    return {
      content: [{
        text: `📊 **Weekly Task Completion Analysis**\n\n${(weeklyResult as any).content[0].text}\n\n---\n\n**Your Current Tasks:**\n${(userTasksResult as any).content[0].text}`
      }]
    };
    
  } catch (error) {
    console.error('Error in weekly task completion:', error);
    return { content: [{ text: `❌ Error getting weekly task completion: ${error instanceof Error ? error.message : 'Unknown error'}` }] };
  }
}

// Monthly task completion handler  
async function handleMonthlyTaskCompletion(message: string, userId: string) {
  try {
    console.log(`📊 Getting monthly task completion for user: ${userId}`);
    
    // Get user ID to use
    let userIdToUse = userId;
    try {
      await mcpClient.callTool('listTasks', { assigneeId: userId });
    } catch (error) {
      const dbUser = await getDbUserId(userId);
      if (dbUser) {
        userIdToUse = dbUser;
      } else {
        return { content: [{ text: '❌ Unable to find your user account.' }] };
      }
    }

    // Get KPI monitoring for monthly view
    const monthlyResult = await mcpClient.callTool('getKPIMonitoring', { timeframe: 'month' });
    
    // Get user's tasks
    const userTasksResult = await mcpClient.callTool('listTasks', { assigneeId: userIdToUse });
    
    return {
      content: [{
        text: `📊 **Monthly Task Completion Analysis**\n\n${(monthlyResult as any).content[0].text}\n\n---\n\n**Your Current Tasks:**\n${(userTasksResult as any).content[0].text}`
      }]
    };
    
  } catch (error) {
    console.error('Error in monthly task completion:', error);
    return { content: [{ text: `❌ Error getting monthly task completion: ${error instanceof Error ? error.message : 'Unknown error'}` }] };
  }
}

// Time-filtered tasks handler for detailed breakdown
async function handleTimeFilteredTasks(message: string, userId: string) {
  try {
    console.log(`📊 Getting time-filtered tasks for user: ${userId}`);
    
    // Get user ID to use
    let userIdToUse = userId;
    try {
      await mcpClient.callTool('listTasks', { assigneeId: userId });
    } catch (error) {
      const dbUser = await getDbUserId(userId);
      if (dbUser) {
        userIdToUse = dbUser;
      } else {
        return { content: [{ text: '❌ Unable to find your user account.' }] };
      }
    }

    // Extract timeframe from message
    const timeframe = extractTimeframe(message); // week, month, quarter
    const daysAhead = extractDaysAhead(message); // for due date filtering
    
    // Get multiple data sources for comprehensive view
    const [
      weeklyResult,
      userTasksResult,
      overdueResult,
      deadlineResult
    ] = await Promise.all([
      mcpClient.callTool('getWeeklySummary', {}),
      mcpClient.callTool('listTasks', { assigneeId: userIdToUse }),
      mcpClient.callTool('getOverdueTasks', { assigneeId: userIdToUse }),
      mcpClient.callTool('getDeadlineTracking', { days: daysAhead })
    ]);
    
    return {
      content: [{
        text: `📊 **Time-Filtered Task Analysis (${timeframe})**\n\n**Weekly Summary:**\n${(weeklyResult as any).content[0].text}\n\n**Your Tasks:**\n${(userTasksResult as any).content[0].text}\n\n**Overdue Items:**\n${(overdueResult as any).content[0].text}\n\n**Upcoming Deadlines:**\n${(deadlineResult as any).content[0].text}`
      }]
    };
    
  } catch (error) {
    console.error('Error in time-filtered tasks:', error);
    return { content: [{ text: `❌ Error getting time-filtered tasks: ${error instanceof Error ? error.message : 'Unknown error'}` }] };
  }
}

// Enhanced task creation handlers with conversation state
async function handleTaskCreationStart(message: string, userId: string, state: ConversationState, history: ChatMessage[]) {
  const conversationHistory = history.map(msg => msg.content).join('\n');
  
  const extractionPrompt = `Based on this conversation history and the latest message, extract task parameters:

Conversation:
${conversationHistory}

Latest message: "${message}"

Extract and return ONLY the following information in JSON format:
- title: A clear, descriptive title for the task
- projectName: The name of the project (if mentioned)
- assigneeName: The name of the person to assign the task to (if mentioned)
- priority: "low", "medium", or "high" (if mentioned)
- dueDate: The due date in YYYY-MM-DD format if mentioned. Calculate from TODAY which is ${new Date().toISOString().split('T')[0]}

Return ONLY valid JSON, no other text.`;

  try {
    const extractionResult = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are a parameter extraction assistant. Extract task parameters and return only valid JSON.' },
        { role: 'user', content: extractionPrompt }
      ],
      temperature: 0.1,
      max_tokens: 200,
    });

    const extractedParams = JSON.parse(extractionResult.choices[0]?.message?.content || '{}');
    
    // Initialize pending task in state
    state.activeIntent = 'task_creation';
    state.pendingTask = {
      title: extractedParams.title,
      projectName: extractedParams.projectName,
      assigneeName: extractedParams.assigneeName,
      priority: extractedParams.priority,
      dueDate: extractedParams.dueDate,
      missingFields: []
    };

    // Check what's missing and find available options
    const missingFields = [];
    let projectOptions: any[] = [];
    let assigneeOptions: any[] = [];

    // Check for project
    if (!extractedParams.projectName) {
      missingFields.push('project');
      projectOptions = await db.project.findMany({
        take: 5,
        select: { id: true, name: true }
      });
    } else {
      // Try to find the project
      const project = await db.project.findFirst({
        where: { name: { contains: extractedParams.projectName, mode: 'insensitive' } },
        select: { id: true, name: true }
      });
      if (project) {
        state.pendingTask!.projectId = project.id;
        state.pendingTask!.projectName = project.name;
      } else {
        missingFields.push('project');
        projectOptions = await db.project.findMany({
          take: 5,
          select: { id: true, name: true }
        });
      }
    }

    // Check for assignee with enhanced name matching
    if (extractedParams.assigneeName) {
      const user = await findUserByName(extractedParams.assigneeName);
      if (user) {
        state.pendingTask!.assigneeId = user.id;
        state.pendingTask!.assigneeName = `${user.firstName} ${user.lastName}`;
        console.log(`✅ Found and assigned user: ${user.firstName} ${user.lastName} (ID: ${user.id})`);
      } else {
        console.log(`⚠️ Could not find user: ${extractedParams.assigneeName}`);
      }
    }

    state.pendingTask!.missingFields = missingFields;

    // Build confirmation message
    let confirmationMessage = `I'll create a task for you:\n\n`;
    confirmationMessage += `📝 **Title**: ${state.pendingTask!.title || 'Not specified'}\n`;
    confirmationMessage += `📁 **Project**: ${state.pendingTask!.projectName || 'Not specified'}\n`;
    confirmationMessage += `👤 **Assigned to**: ${state.pendingTask!.assigneeName || 'Unassigned'}\n`;
    confirmationMessage += `⚡ **Priority**: ${state.pendingTask!.priority || 'Not specified'}\n`;
    confirmationMessage += `📅 **Due date**: ${state.pendingTask!.dueDate || 'Not specified'}\n\n`;

    if (missingFields.length > 0) {
      confirmationMessage += `I need a few more details:\n\n`;
      
      if (missingFields.includes('project')) {
        confirmationMessage += `**Which project should this task belong to?**\n`;
        projectOptions.forEach((p, i) => {
          confirmationMessage += `${i + 1}. ${p.name}\n`;
        });
        confirmationMessage += `\n`;
      }
      
      if (!state.pendingTask!.priority) {
        confirmationMessage += `**What priority should this be?** (low/medium/high)\n\n`;
      }
      
      confirmationMessage += `Please provide the missing information, or say "create" to proceed with current details.`;
    } else {
      confirmationMessage += `Does this look correct? Say "create" to confirm or "cancel" to abort.`;
    }

    return { content: [{ text: confirmationMessage }] };

  } catch (error) {
    return { content: [{ text: `Error starting task creation: ${error instanceof Error ? error.message : 'Unknown error'}` }] };
  }
}

async function handleTaskCreationContinuation(message: string, state: ConversationState) {
  if (!state.pendingTask) {
    return { content: [{ text: 'No active task creation found. Please start a new task creation.' }] };
  }

  const messageLower = message.toLowerCase();

  // Handle priority setting
  if (messageLower.includes('low') || messageLower.includes('medium') || messageLower.includes('high')) {
    if (messageLower.includes('low')) state.pendingTask.priority = 'low';
    else if (messageLower.includes('medium')) state.pendingTask.priority = 'medium';
    else if (messageLower.includes('high')) state.pendingTask.priority = 'high';
    
    state.pendingTask.missingFields = state.pendingTask.missingFields.filter(f => f !== 'priority');
  }

  // Handle due date setting
  if (messageLower.includes('due') || messageLower.includes('date') || messageLower.includes('week') || messageLower.includes('tomorrow')) {
    // Extract due date using OpenAI
    try {
      const extractionPrompt = `Extract the due date from this message: "${message}"
      
      Today is ${new Date().toISOString().split('T')[0]}
      
      Return ONLY a date in YYYY-MM-DD format. If the message mentions:
      - "next week" or "next week from now" = add 7 days to today
      - "tomorrow" = add 1 day to today
      - specific dates = convert to YYYY-MM-DD format
      
      Return ONLY the date, no other text.`;

      const extractionResult = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are a date extraction assistant. Return only dates in YYYY-MM-DD format.' },
          { role: 'user', content: extractionPrompt }
        ],
        temperature: 0.1,
        max_tokens: 50,
      });

      const extractedDate = extractionResult.choices[0]?.message?.content?.trim();
      if (extractedDate && extractedDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
        state.pendingTask.dueDate = extractedDate;
      }
    } catch (error) {
      console.error('Error extracting due date:', error);
    }
  }

  // Handle project selection (by name or number)
  if (messageLower.includes('logistics') || messageLower.includes('cdb') || messageLower.includes('marketing')) {
    let projectName = '';
    if (messageLower.includes('logistics')) projectName = 'logistics';
    else if (messageLower.includes('cdb')) projectName = 'cdb';
    else if (messageLower.includes('marketing')) projectName = 'marketing';
    
    const project = await db.project.findFirst({
      where: { name: { contains: projectName, mode: 'insensitive' } },
      select: { id: true, name: true }
    });
    
    if (project) {
      state.pendingTask.projectId = project.id;
      state.pendingTask.projectName = project.name;
      state.pendingTask.missingFields = state.pendingTask.missingFields.filter(f => f !== 'project');
    }
  }

  // Handle project selection by number
  const numberMatch = message.match(/(\d+)/);
  if (numberMatch && state.pendingTask.missingFields.includes('project')) {
    const projectIndex = parseInt(numberMatch[1]) - 1;
    const projects = await db.project.findMany({
      take: 5,
      select: { id: true, name: true }
    });
    
    if (projects[projectIndex]) {
      state.pendingTask.projectId = projects[projectIndex].id;
      state.pendingTask.projectName = projects[projectIndex].name;
      state.pendingTask.missingFields = state.pendingTask.missingFields.filter(f => f !== 'project');
    }
  }

  // Check if we still have missing fields
  if (state.pendingTask.missingFields.length > 0) {
    let response = `Updated! Here's what we have now:\n\n`;
    response += `📝 **Title**: ${state.pendingTask.title || 'Not specified'}\n`;
    response += `📁 **Project**: ${state.pendingTask.projectName || 'Not specified'}\n`;
    response += `👤 **Assigned to**: ${state.pendingTask.assigneeName || 'Unassigned'}\n`;
    response += `⚡ **Priority**: ${state.pendingTask.priority || 'Not specified'}\n`;
    response += `📅 **Due date**: ${state.pendingTask.dueDate || 'Not specified'}\n\n`;
    
    if (state.pendingTask.missingFields.includes('project')) {
      response += `Still need: **Which project?** Please specify the project name or select a number from the list above.\n\n`;
    }
    
    response += `Say "create" when ready or provide the missing information.`;
    return { content: [{ text: response }] };
  } else {
    // All required info is available, show final confirmation
    let response = `Perfect! Ready to create:\n\n`;
    response += `📝 **Title**: ${state.pendingTask.title}\n`;
    response += `📁 **Project**: ${state.pendingTask.projectName}\n`;
    response += `👤 **Assigned to**: ${state.pendingTask.assigneeName || 'Unassigned'}\n`;
    response += `⚡ **Priority**: ${state.pendingTask.priority || 'medium'}\n`;
    response += `📅 **Due date**: ${state.pendingTask.dueDate || 'Not set'}\n\n`;
    response += `Say "create" to confirm or "cancel" to abort.`;
    return { content: [{ text: response }] };
  }
}

async function handleTaskCreationCompletion(state: ConversationState, userId: string) {
  if (!state.pendingTask || !state.pendingTask.projectId) {
    return { content: [{ text: 'Cannot create task: missing required information. Please start over.' }] };
  }

  try {
    // Save task details before clearing state
    const taskTitle = state.pendingTask.title;
    const projectName = state.pendingTask.projectName;
    const assigneeName = state.pendingTask.assigneeName;

    const result = await mcpClient.callTool('createTask', {
      title: state.pendingTask.title,
      projectId: state.pendingTask.projectId,
      priority: state.pendingTask.priority || 'medium',
      assigneeId: state.pendingTask.assigneeId,
      dueDate: state.pendingTask.dueDate,
      creatorId: userId
    });

    // Clear the conversation state
    state.activeIntent = null;
    state.pendingTask = undefined;

    const response = `✅ **Task created successfully!**\n\n` +
                    `📝 **"${taskTitle}"** has been added to **${projectName}**\n\n` +
                    `The task is now available in your project dashboard. ${assigneeName ? `${assigneeName} will be notified.` : ''}`;

    return { content: [{ text: response }] };
  } catch (error) {
    return { content: [{ text: `Error creating task: ${error instanceof Error ? error.message : 'Unknown error'}` }] };
  }
}

async function handleTaskCreationCancellation(state: ConversationState) {
  state.activeIntent = null;
  state.pendingTask = undefined;
  return { content: [{ text: '❌ Task creation cancelled. Is there anything else I can help you with?' }] };
}

async function handleProjectCreation(message: string, userId: string) {
  // Extract project name from message
  const nameMatch = message.match(/create.*project.*?(?:called|named)\s+"?([^"]+)"?/i) ||
                   message.match(/project\s+"?([^"]+)"?/i);
  
  if (nameMatch) {
    // Get first workspace as default
    const workspace = await db.workspace.findFirst();
    if (workspace) {
      return await mcpClient.callTool('createProject', {
        name: nameMatch[1].trim(),
        workspaceId: workspace.id,
        ownerId: userId
      });
    }
  }
  
  return { content: [{ text: 'Please specify a project name and workspace' }] };
}

async function handleBugCreation(message: string, userId: string) {
  // Simple bug extraction
  const titleMatch = message.match(/bug.*?(?:for|in|about)\s+"?([^"]+)"?/i);
  if (titleMatch) {
    const project = await db.project.findFirst();
    if (project) {
      return await mcpClient.callTool('createBug', {
        title: titleMatch[1].trim(),
        projectId: project.id,
        reporterId: userId
      });
    }
  }
  
  return { content: [{ text: 'Please specify bug details and project' }] };
}

async function handleSprintCreation(message: string, userId: string) {
  try {
    console.log(`🏃 Processing sprint creation: "${message}"`);
    
    // Enhanced sprint name extraction - handle various patterns
    let sprintName = null;
    const patterns = [
      /sprint.*?(?:called|named)\s+"?([^"]+)"?/i,
      /(?:create|new).*?sprint\s+"?([^"]+)"?/i,
      /sprint\s+"?([^"]+)"?/i,
      // Pattern for direct name after "Create a new 2-week sprint starting Monday"
      /starting\s+monday\s*(.*)$/i,
      // Pattern for when user just says the sprint name after being asked
      /^([a-zA-Z\s]+)$/
    ];
    
    for (const pattern of patterns) {
      const match = message.match(pattern);
      if (match && match[1] && match[1].trim()) {
        sprintName = match[1].trim();
        break;
      }
    }
    
    // If no clear sprint name found, check if this might be just a sprint name response
    if (!sprintName && message.trim().length > 0 && message.trim().length < 50) {
      // Could be a direct sprint name like "app dev ios"
      const cleanMessage = message.trim().toLowerCase();
      if (!cleanMessage.includes('create') && !cleanMessage.includes('sprint') && 
          cleanMessage.split(' ').length <= 5) {
        sprintName = message.trim();
      }
    }
    
    if (!sprintName) {
      return { content: [{ text: 'Please provide a name for the sprint. For example: "Create sprint called User Authentication" or just "User Authentication"' }] };
    }
    
    // Get available projects to show selection
    const projects = await db.project.findMany({
      select: { id: true, name: true, status: true },
      where: { status: 'active' },
      orderBy: { name: 'asc' },
      take: 10
    });
    
    if (projects.length === 0) {
      return { content: [{ text: 'No active projects found. Please create a project first before creating sprints.' }] };
    }
    
    // If only one project, use it automatically
    if (projects.length === 1) {
      const project = projects[0];
      const startDate = getNextMonday();
      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 14); // 2 week sprint

      const result = await mcpClient.callTool('createSprint', {
        name: sprintName,
        projectId: project.id,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        description: `2-week sprint starting ${startDate.toLocaleDateString()}`
      });
      
      return { 
        content: [{ 
          text: `✅ Successfully created sprint "${sprintName}" in project "${project.name}"!\n\n📅 Duration: 2 weeks\n📅 Start: ${startDate.toLocaleDateString()}\n📅 End: ${endDate.toLocaleDateString()}\n\nYou can now add tasks to this sprint.` 
        }] 
      };
    }
    
    // Multiple projects - show selection
    const projectList = projects.map((p, index) => 
      `${index + 1}. ${p.name}`
    ).join('\n');
    
    // Store the sprint creation context for follow-up
    // Note: In production, this should be stored in a database or Redis
    const sprintCreationContext = {
      sprintName,
      availableProjects: projects,
      step: 'project_selection'
    };
    
    return { 
      content: [{ 
        text: `Great! I'll create a 2-week sprint called "${sprintName}" starting next Monday.\n\nWhich project should this sprint belong to?\n\n${projectList}\n\nPlease respond with the project number (1, 2, etc.) or the project name.` 
      }] 
    };
    
  } catch (error) {
    console.error('Error in sprint creation:', error);
    return { content: [{ text: `❌ Error creating sprint: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.` }] };
  }
}

// Helper function to get next Monday
function getNextMonday(): Date {
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  const daysUntilMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek; // If today is Sunday, next Monday is 1 day away
  
  const nextMonday = new Date(today);
  nextMonday.setDate(today.getDate() + daysUntilMonday);
  nextMonday.setHours(9, 0, 0, 0); // Set to 9 AM
  
  return nextMonday;
}

async function handleTaskReassignment(message: string, userId: string, state: ConversationState) {
  try {
    console.log(`🔄 Processing task reassignment: "${message}"`);
    
    // Simplified parameter extraction using regex patterns
    const extractedParams = {
      taskKeywords: '',
      assigneeName: '',
      projectName: '',
      isReferencingPreviousTask: false
    };
    
    // Extract assignee name patterns
    const assigneePatterns = [
      /assign.*?(?:to|it to)\s+([a-zA-Z\s]+)/i,
      /reassign.*?(?:to)\s+([a-zA-Z\s]+)/i,
      /give.*?(?:to)\s+([a-zA-Z\s]+)/i
    ];
    
    for (const pattern of assigneePatterns) {
      const match = message.match(pattern);
      if (match && match[1]) {
        extractedParams.assigneeName = match[1].trim();
        break;
      }
    }
    
    // Extract task keywords or references
    const taskPatterns = [
      /assign\s+"?([^"]+?)"?\s+to/i,
      /reassign\s+"?([^"]+?)"?\s+to/i,
      /task\s+"?([^"]+?)"?\s+to/i
    ];
    
    for (const pattern of taskPatterns) {
      const match = message.match(pattern);
      if (match && match[1]) {
        extractedParams.taskKeywords = match[1].trim();
        break;
      }
    }
    
    // Check for previous task references
    if (message.toLowerCase().includes('above task') || 
        message.toLowerCase().includes('this task') || 
        message.toLowerCase().includes('that task') || 
        (message.toLowerCase().includes('it') && message.toLowerCase().includes('assign'))) {
      extractedParams.isReferencingPreviousTask = true;
    }
    
    // If no assignee found, return error
    if (!extractedParams.assigneeName) {
      return { content: [{ text: '❌ Please specify who you want to assign the task to. For example: "Assign the login task to John" or "Reassign it to Sarah"' }] };
    }
    
    console.log('📋 Extracted reassignment params:', extractedParams);

    // Find the assignee using enhanced search
    const assigneeResult = await mcpClient.callTool('findUserByName', {
      nameOrEmail: extractedParams.assigneeName,
      showMultiple: true
    });

    const assigneeText = (assigneeResult as any).content?.[0]?.text || '';
    
    // Check if multiple users found - set up clarification state
    if (assigneeText.includes('Found') && assigneeText.includes('users matching')) {
      state.activeIntent = 'entity_clarification';
      state.pendingClarification = {
        type: 'user_search',
        originalMessage: message,
        extractedParams: extractedParams,
        searchResults: assigneeText,
        targetAction: 'task_reassignment'
      };
      
      return { 
        content: [{ 
          text: `I found multiple users matching "${extractedParams.assigneeName}". Please specify which one:\n\n${assigneeText}\n\nYou can respond with a number (1, 2, etc.) or the exact name.` 
        }] 
      };
    }

    // Extract user ID from the result
    const userIdMatch = assigneeText.match(/ID: ([a-zA-Z0-9-]+)/);
    if (!userIdMatch) {
      // Try "Did you mean?" format
      if (assigneeText.includes('Did you mean')) {
        return { 
          content: [{ 
            text: `${assigneeText}\n\nPlease confirm which user you'd like to assign the task to.` 
          }] 
        };
      }
      return { content: [{ text: `❌ Could not find user "${extractedParams.assigneeName}". Please check the spelling or try with a different variation of the name.` }] };
    }

    const assigneeId = userIdMatch[1];
    const assigneeName = assigneeText.match(/User found: ([^(]+)/)?.[1]?.trim() || extractedParams.assigneeName;
    console.log(`✅ Found assignee: ${assigneeName} (ID: ${assigneeId})`);

    // Find the task to reassign using enhanced search
    let searchResult: any;
    
    if (extractedParams.isReferencingPreviousTask) {
      // Look for recent tasks (likely the most recent unassigned task)
      const recentTasks = await db.task.findMany({
        where: {
          OR: [
            { assigneeId: null },
            { assigneeId: userId } // Currently assigned to the requesting user
          ]
        },
        include: {
          project: true,
          assignee: true
        },
        orderBy: { createdAt: 'desc' },
        take: 5
      });
      
      if (recentTasks.length === 0) {
        return { content: [{ text: `❌ No recent unassigned tasks found to reassign.` }] };
      }
      
      const task = recentTasks[0];
      
      // If multiple recent tasks, show them for verification
      if (recentTasks.length > 1) {
        const taskList = recentTasks.slice(0, 3).map(t => 
          `• ${t.title} (${t.project.name}) - Currently: ${t.assignee ? `${t.assignee.firstName} ${t.assignee.lastName}` : 'Unassigned'}`
        ).join('\n');
        
        state.activeIntent = 'entity_clarification';
        state.pendingClarification = {
          type: 'task_reassignment',
          originalMessage: message,
          extractedParams: { ...extractedParams, assigneeId },
          searchResults: recentTasks.map(t => `Task: ${t.title} (ID: ${t.id})\n  Project: ${t.project.name}\n  Status: ${t.status}`).join('\n\n'),
          targetAction: 'task_reassignment'
        };
        
        return { 
          content: [{ 
            text: `I found multiple recent tasks. Which one would you like to reassign to ${assigneeName}?\n\n${taskList}\n\nPlease respond with a number (1, 2, etc.) or the exact task name.` 
          }] 
        };
      }
      
      // Proceed with single task
      searchResult = { 
        tasks: [task],
        single: true
      };
      
    } else if (extractedParams.taskKeywords) {
      // Use enhanced search for task by keywords
      const taskSearchResult = await mcpClient.callTool('searchTasks', {
        query: extractedParams.taskKeywords,
        projectName: extractedParams.projectName,
        fuzzy: true
      });
      
      const searchText = (taskSearchResult as any).content?.[0]?.text || '';
      
      // Check if no tasks found
      if (searchText.includes('No tasks found')) {
        return { content: [{ text: `❌ Could not find any tasks matching "${extractedParams.taskKeywords}". Please be more specific about the task name.` }] };
      }
      
      // Check if "Did you mean?" response
      if (searchText.includes('Did you mean')) {
        return { 
          content: [{ 
            text: `${searchText}\n\nPlease confirm which task you'd like to reassign to ${assigneeName}.` 
          }] 
        };
      }
      
      // Parse the search results to extract task IDs
      const taskIdMatches = searchText.match(/ID: ([a-zA-Z0-9-]+)/g);
      
      if (!taskIdMatches) {
        return { content: [{ text: `❌ Could not parse task search results. Please try again with a more specific task name.` }] };
      }
      
      const taskIds = taskIdMatches.map((match: string) => match.replace('ID: ', ''));
      const tasks = await db.task.findMany({
        where: { id: { in: taskIds } },
        include: {
          project: true,
          assignee: true
        }
      });
      
      if (tasks.length === 0) {
        return { content: [{ text: `❌ Could not find the specified tasks in database.` }] };
      }
      
      searchResult = { 
        tasks,
        single: tasks.length === 1
      };
    } else {
      return { content: [{ text: '❌ Please specify which task you want to reassign. For example: "Assign the login task to John" or "Reassign the above task to Sarah"' }] };
    }

    // Handle the task reassignment
    if (searchResult.single && searchResult.tasks.length === 1) {
      const task = searchResult.tasks[0];
      
      // Perform the actual reassignment
      const reassignResult = await mcpClient.callTool('reassignTask', {
        taskId: task.id,
        assigneeId: assigneeId
      });
      
      const resultText = (reassignResult as any).content?.[0]?.text || '';
      
      if (resultText.includes('SUCCESS') || resultText.includes('successfully')) {
        return { 
          content: [{ 
            text: `✅ Successfully reassigned "${task.title}" to ${assigneeName}!\n\nProject: ${task.project.name}\nStatus: ${task.status}\nPriority: ${task.priority}` 
          }] 
        };
      } else {
        return { content: [{ text: `❌ ${resultText}` }] };
      }
      
    } else {
      // Multiple tasks found - need clarification
      const taskList = searchResult.tasks.slice(0, 5).map((t: any, index: number) => 
        `${index + 1}. ${t.title} (${t.project.name}) - ${t.status}`
      ).join('\n');
      
      state.activeIntent = 'entity_clarification';
      state.pendingClarification = {
        type: 'task_reassignment',
        originalMessage: message,
        extractedParams: { ...extractedParams, assigneeId },
        searchResults: searchResult.tasks.map((t: any) => `Task: ${t.title} (ID: ${t.id})\n  Project: ${t.project.name}\n  Status: ${t.status}`).join('\n\n'),
        targetAction: 'task_reassignment'
      };
      
      return { 
        content: [{ 
          text: `I found multiple tasks matching your criteria. Which one would you like to reassign to ${assigneeName}?\n\n${taskList}\n\nPlease respond with a number (1, 2, etc.) or the exact task name.` 
        }] 
      };
    }

  } catch (error) {
    console.error('Error in task reassignment:', error);
    state.activeIntent = null;
    state.pendingClarification = undefined;
    return { content: [{ text: `❌ Error processing task reassignment: ${error instanceof Error ? error.message : 'Unknown error'}` }] };
  }
}

// Handle entity clarification when multiple matches are found
async function handleEntityClarification(message: string, state: ConversationState, userId: string) {
  if (!state.pendingClarification) {
    return { content: [{ text: 'No pending clarification found. Please start a new request.' }] };
  }

  try {
    const clarification = state.pendingClarification;
    const messageLower = message.toLowerCase();

    // Try to extract selection from user message
    let selection: string | number | null = null;
    
    // Check for numeric selection (1, 2, 3, etc.)
    const numberMatch = message.match(/(\d+)/);
    if (numberMatch) {
      selection = parseInt(numberMatch[1]);
    }
    
    // Check for name/title selection
    if (!selection) {
      // Try to find the mentioned entity in the search results
      const searchText = clarification.searchResults;
      if (typeof searchText === 'string') {
        const lines = searchText.split('\n').filter(line => line.includes('•') || line.includes('Task:') || line.includes('Project:') || line.includes('User:'));
        
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].toLowerCase();
          if (messageLower.includes(line.substring(0, 20).toLowerCase()) || 
              line.includes(messageLower.substring(0, 10))) {
            selection = i + 1;
            break;
          }
        }
      }
    }

    if (selection && typeof selection === 'number') {
      console.log(`👤 User selected option ${selection} for clarification type: ${clarification.type}`);
      
      // Process the selection based on clarification type
      switch (clarification.type) {
        case 'user_search':
          // Handle user selection for task reassignment
          const userSearchResults = clarification.searchResults;
          const userIdMatches = userSearchResults.match(/ID: ([a-zA-Z0-9-]+)/g);
          
          if (userIdMatches && userIdMatches[selection - 1]) {
            const selectedUserId = userIdMatches[selection - 1].replace('ID: ', '');
            console.log(`✅ Selected user ID: ${selectedUserId}`);
            
            // Now find the task using the original parameters
            const taskKeywords = clarification.extractedParams.taskKeywords;
            const projectName = clarification.extractedParams.projectName;
            
            const taskSearchResult = await mcpClient.callTool('searchTasks', {
              query: taskKeywords,
              projectName: projectName,
              fuzzy: true
            });
            
            const taskSearchText = (taskSearchResult as any).content?.[0]?.text || '';
            const taskIdMatches = taskSearchText.match(/ID: ([a-zA-Z0-9-]+)/g);
            
            if (taskIdMatches && taskIdMatches[0]) {
              const taskId = taskIdMatches[0].replace('ID: ', '');
              console.log(`🎯 Found task ID: ${taskId}, assigning to user: ${selectedUserId}`);
              
              // Check task status before assignment
              const beforeTask = await mcpClient.callTool('getTaskDetails', { taskId: taskId });
              console.log(`📋 Task status BEFORE assignment:`, beforeTask);
              
              // Perform the reassignment
              const reassignResult = await mcpClient.callTool('reassignTask', {
                taskId: taskId,
                assigneeId: selectedUserId
              });
              
              console.log(`🔄 Reassignment result:`, reassignResult);
              
              // Check task status after assignment to verify it worked
              const afterTask = await mcpClient.callTool('getTaskDetails', { taskId: taskId });
              console.log(`📋 Task status AFTER assignment:`, afterTask);
              
              // Get user and task details for confirmation
              const task = await db.task.findUnique({
                where: { id: taskId },
                include: { project: true, assignee: true }
              });
              
              const assignedUser = await db.user.findUnique({
                where: { id: selectedUserId },
                select: { firstName: true, lastName: true, email: true }
              });
              
              // Clear clarification state
              state.activeIntent = null;
              state.pendingClarification = undefined;
              
              // Verify the assignment actually worked
              if (task && task.assigneeId === selectedUserId) {
                return { 
                  content: [{ 
                    text: `✅ **Task assigned successfully!**\n\n📝 **"${task.title}"** in **${task.project.name}**\n👤 **Assigned to**: ${task.assignee?.firstName} ${task.assignee?.lastName} (${task.assignee?.email})\n\n**Status verified**: Assignment is confirmed in the database.` 
                  }] 
                };
              } else {
                // Assignment failed - provide detailed error info
                return { 
                  content: [{ 
                    text: `❌ **Assignment failed!**\n\nTask ID: ${taskId}\nTarget User ID: ${selectedUserId}\nCurrent Assignee: ${task?.assignee ? `${task.assignee.firstName} ${task.assignee.lastName}` : 'None'}\n\nPlease try again or contact support.` 
                  }] 
                };
              }
            } else {
              return { content: [{ text: `❌ Could not find the task to assign. Please try the request again.` }] };
            }
          } else {
            return { content: [{ text: `❌ Invalid user selection. Please try again.` }] };
          }
          break;
          
        case 'task_reassignment':
          // Extract task ID from selection and complete reassignment
          const taskSearchResults = clarification.searchResults;
          const taskIdMatches = taskSearchResults.match(/ID: ([a-zA-Z0-9-]+)/g);
          
          if (taskIdMatches && taskIdMatches[selection - 1]) {
            const selectedTaskId = taskIdMatches[selection - 1].replace('ID: ', '');
            const assigneeId = clarification.extractedParams.assigneeId;
            
            if (assigneeId) {
              // Perform the reassignment
              await mcpClient.callTool('reassignTask', {
                taskId: selectedTaskId,
                assigneeId: assigneeId
              });
              
              // Get task details
              const task = await db.task.findUnique({
                where: { id: selectedTaskId },
                include: { project: true, assignee: true }
              });
              
              // Clear clarification state
              state.activeIntent = null;
              state.pendingClarification = undefined;
              
              return { 
                content: [{ 
                  text: `✅ **Task reassigned successfully!**\n\n📝 **"${task?.title}"** in **${task?.project.name}** has been assigned.` 
                }] 
              };
            }
          }
          break;
          
        default:
          // Clear clarification state
          state.activeIntent = null;
          state.pendingClarification = undefined;
          return { content: [{ text: `Selection "${selection}" noted. Please try your request again.` }] };
      }
    }

    // If we couldn't process the selection, ask for clarification
    return { 
      content: [{ 
        text: `I couldn't understand your selection. Please specify:\n- A number (1, 2, 3, etc.)\n- The exact name of the item\n- Or say "cancel" to abort` 
      }] 
    };

  } catch (error) {
    console.error('Error in entity clarification:', error);
    state.activeIntent = null;
    state.pendingClarification = undefined;
    return { content: [{ text: `❌ Error processing clarification: ${error instanceof Error ? error.message : 'Unknown error'}` }] };
  }
}

// Handle clarification cancellation
async function handleClarificationCancellation(state: ConversationState) {
  state.activeIntent = null;
  state.pendingClarification = undefined;
  return { content: [{ text: '❌ Request cancelled. Is there anything else I can help you with?' }] };
}

function extractTaskFilters(message: string) {
  const filters: any = {};
  
  if (message.includes('in progress')) filters.status = 'in_progress';
  if (message.includes('completed') || message.includes('done')) filters.status = 'done';
  if (message.includes('todo') || message.includes('pending')) filters.status = 'todo';
  
  return filters;
}

async function extractProjectId(message: string): Promise<string | null> {
  const projectMatch = message.match(/project\s+"?([^"]+)"?/i) ||
                      message.match(/in\s+(?:the\s+)?([a-zA-Z]+)/i);
  
  if (projectMatch) {
    const project = await db.project.findFirst({
      where: { name: { contains: projectMatch[1], mode: 'insensitive' } }
    });
    return project?.id || null;
  }
  
  return null;
}

function extractProjectNameFromMessage(message: string): string | null {
  // Enhanced project name extraction for "Tell me about [project]" queries
  const patterns = [
    /tell me about (?:the\s+)?([^.?!]+?)(?:\s+project)?$/i,
    /about (?:the\s+)?([^.?!]+?)(?:\s+project)?$/i,
    /details about (?:the\s+)?([^.?!]+?)(?:\s+project)?$/i,
    /(?:the\s+)?([a-zA-Z\s]+)\s+project/i,
    /project\s+([a-zA-Z\s]+)/i
  ];
  
  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match && match[1]) {
      const projectName = match[1].trim();
      // Filter out common words that aren't project names
      if (!['is', 'are', 'was', 'were', 'has', 'have', 'do', 'does', 'will', 'would', 'can', 'could', 'should'].includes(projectName.toLowerCase())) {
        return projectName;
      }
    }
  }
  
  return null;
}

async function extractSprintId(message: string): Promise<string | null> {
  const sprintMatch = message.match(/sprint\s+"?([^"]+)"?/i);
  
  if (sprintMatch) {
    const sprint = await db.sprint.findFirst({
      where: { name: { contains: sprintMatch[1], mode: 'insensitive' } }
    });
    return sprint?.id || null;
  }
  
  return null;
}

function extractUserName(message: string): string | null {
  const userMatch = message.match(/find\s+(?:user\s+)?([a-zA-Z\s]+)/i) ||
                   message.match(/(?:user|person|member)\s+"?([^"]+)"?/i);
  
  return userMatch ? userMatch[1].trim() : null;
}

function extractSearchQuery(message: string): string | null {
  const searchMatch = message.match(/search\s+(?:for\s+)?"?([^"]+)"?/i) ||
                     message.match(/find\s+"?([^"]+)"?/i);
  
  return searchMatch ? searchMatch[1].trim() : null;
}

function extractTimeframe(message: string): 'week' | 'month' | 'quarter' {
  if (message.includes('week')) return 'week';
  if (message.includes('quarter')) return 'quarter';
  return 'month';
}

function extractDaysAhead(message: string): number {
  const daysMatch = message.match(/(\d+)\s+days?/i);
  if (daysMatch) return parseInt(daysMatch[1]);
  
  if (message.includes('next week')) return 7;
  if (message.includes('next month')) return 30;
  
  return 14; // Default to 2 weeks
}

export async function handleAIChat(message: string, history: ChatMessage[]) {
  return withTimeout(handleAIChatInternal(message, history), 45000);
}

async function handleAIChatInternal(message: string, history: ChatMessage[]) {
  try {
    console.log('🔍 Starting comprehensive AI chat handler...');
    
    const authResult = await auth();
    const userId = authResult?.userId;
    if (!userId) {
      throw new Error('User not authenticated');
    }

    const dbUserId = await getDbUserId(userId);
    if (!dbUserId) {
      throw new Error('User not found in database');
    }

    const user = await db.user.findUnique({
      where: { id: dbUserId },
      select: { id: true, firstName: true, lastName: true, email: true }
    });
    if (!user) {
      throw new Error('User not found in database');
    }

    console.log(`👤 User: ${user.firstName} ${user.lastName}`);
    console.log(`📝 Processing message: "${message}"`);

    // Get or create conversation state
    let conversationState = conversationStates.get(userId) || {
      activeIntent: null,
      pendingTask: undefined,
      currentContext: undefined,
      lastExtractedParams: undefined
    };

    // Analyze user intent and determine actions with conversation context
    const actions = await intelligentToolSelection(message, user.id, history, conversationState);
    console.log('🎯 Detected actions:', actions.map(a => a.type));

    // Execute MCP actions with conversation state
    const toolResults = await executeMCPActions(actions, message, user.id, conversationState, history);
    console.log('✅ Tool results:', toolResults.length);

    // Save updated conversation state
    conversationStates.set(userId, conversationState);

    // Generate AI response
    const systemPrompt = `You are an AI assistant for TaskFlow, a comprehensive project management platform. You help users manage tasks, projects, teams, sprints, bugs, analytics, and more.

Current user: ${user.firstName} ${user.lastName} (${user.email})

You have access to comprehensive project management tools and have executed the user's request. Provide a helpful, conversational response based on the results.

${conversationState.activeIntent === 'task_creation' ? 
  'IMPORTANT: The user is currently in a task creation flow. Guide them through the process and be encouraging.' : ''}

Key capabilities you can help with:
- Task management (create, list, update, track progress, deadlines)
- Project management (create, analyze, track timelines, health status)
- Team management (performance, workload, member details)
- Sprint management (create, track velocity, burndown analysis)
- Bug tracking (create, analyze trends, resolution metrics)
- Analytics & reporting (KPIs, weekly summaries, forecasting)
- Search & discovery (global search, related items, impact analysis)
- Calendar & scheduling (deadline tracking, optimization suggestions)

Be conversational, helpful, and provide actionable insights when possible.`;

    let enhancedSystemPrompt = systemPrompt;
    if (toolResults.length > 0) {
      enhancedSystemPrompt += '\n\nTool Execution Results:\n';
      toolResults.forEach(({ tool, result }) => {
        enhancedSystemPrompt += `\n${tool}:\n${result}\n`;
      });
    }

    const messages: ChatMessage[] = [
      { role: 'system', content: enhancedSystemPrompt },
      ...history,
      { role: 'user', content: message }
    ];

    console.log('📤 Sending request to OpenAI...');
    const completion = await withTimeout(openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: messages as any,
      temperature: 0.7,
      max_tokens: 1500,
    }), 25000);

    const assistantResponse = completion.choices[0]?.message?.content || 'I apologize, but I couldn\'t generate a response.';

    console.log('✅ AI response generated successfully');

    return {
      response: assistantResponse,
      toolsUsed: toolResults.map(r => r.tool)
    };

  } catch (error) {
    console.error('❌ Error in comprehensive AI chat handler:', error);
    
    return {
      response: 'I apologize, but I encountered an error while processing your request. Please try again or rephrase your question.',
      toolsUsed: []
    };
  }
} 