import OpenAI from 'openai';
import { auth } from '@clerk/nextjs/server';
import { db } from './db';
import { getCurrentUserId, getDbUserId } from './auth-utils';

const openai = new OpenAI({
  apiKey: process.env.GITHUB_TOKEN,
  baseURL: process.env.OPENAI_API_BASE_URL,
});

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

// Helper function to add timeout to any promise
function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(`Operation timed out after ${timeoutMs}ms`)), timeoutMs);
    })
  ]);
}

// Direct database operations instead of MCP
async function createTaskDirect(taskData: {
  title: string;
  description?: string;
  projectId: string;
  priority?: "low" | "medium" | "high";
  status?: "todo" | "in_progress" | "done";
  assigneeId?: string;
  dueDate?: string;
  creatorId: string;
}) {
  try {
    const task = await db.task.create({
      data: {
        title: taskData.title,
        description: taskData.description || "",
        priority: taskData.priority || "medium",
        status: taskData.status || "todo",
        dueDate: taskData.dueDate ? new Date(taskData.dueDate) : null,
        projectId: taskData.projectId,
        assigneeId: taskData.assigneeId || null,
        creatorId: taskData.creatorId,
      },
      include: {
        project: true,
        assignee: true,
      }
    });
    return {
      success: true,
      message: `Task "${taskData.title}" created successfully in project "${task.project?.name}"${task.assignee ? ` and assigned to ${task.assignee.firstName} ${task.assignee.lastName}` : ''}`
    };
  } catch (error) {
    console.error('Error creating task:', error);
    return {
      success: false,
      message: `Error creating task: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

async function listTasksDirect(filters?: {
  projectId?: string;
  status?: "todo" | "in_progress" | "done";
  assigneeId?: string;
}) {
  try {
    const where: any = {};
    if (filters?.projectId) where.projectId = filters.projectId;
    if (filters?.status) where.status = filters.status;
    if (filters?.assigneeId) where.assigneeId = filters.assigneeId;

    const tasks = await db.task.findMany({
      where,
      include: {
        project: true,
        assignee: true
      },
      orderBy: { createdAt: 'desc' }
    });

    if (tasks.length === 0) {
      return {
        success: true,
        message: 'No tasks found'
      };
    }

    const taskList = tasks.map(t => 
      `- ${t.title} (${t.status}, ${t.priority}) - ${t.project.name}${t.assignee ? ` - Assigned to ${t.assignee.firstName} ${t.assignee.lastName}` : ''}`
    ).join('\n');

    return {
      success: true,
      message: `Tasks:\n${taskList}`
    };
  } catch (error) {
    console.error('Error listing tasks:', error);
    return {
      success: false,
      message: `Error listing tasks: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

async function listProjectsDirect() {
  try {
    const projects = await db.project.findMany({
      include: {
        workspace: true,
        _count: {
          select: { tasks: true }
        }
      }
    });

    if (projects.length === 0) {
      return {
        success: true,
        message: 'No projects found'
      };
    }

    const projectList = projects.map(p => 
      `- ${p.name} (${p._count.tasks} tasks) - ${p.workspace.name}`
    ).join('\n');

    return {
      success: true,
      message: `Projects:\n${projectList}`
    };
  } catch (error) {
    console.error('Error listing projects:', error);
    return {
      success: false,
      message: `Error listing projects: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

async function findProjectDirect(projectName: string) {
  try {
    const project = await db.project.findFirst({
      where: {
        name: {
          contains: projectName,
          mode: 'insensitive'
        }
      },
      include: {
        workspace: true,
        _count: {
          select: { tasks: true }
        }
      }
    });

    if (project) {
      return {
        success: true,
        project: project,
        message: `Found project: ${project.name} (ID: ${project.id})`
      };
    } else {
      return {
        success: false,
        message: `Project not found: ${projectName}`
      };
    }
  } catch (error) {
    console.error('Error finding project:', error);
    return {
      success: false,
      message: `Error finding project: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

async function findUserDirect(userData: { name: string; email?: string }) {
  try {
    let user = null;
    
    if (userData.email) {
      user = await db.user.findUnique({
        where: { email: userData.email },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true
        }
      });
    } else {
      // Search by name
      const nameParts = userData.name.trim().split(' ');
      const firstName = nameParts[0];
      const lastName = nameParts.slice(1).join(' ');
      
      user = await db.user.findFirst({
        where: {
          OR: [
            { firstName: { contains: firstName, mode: 'insensitive' } },
            { lastName: { contains: lastName || firstName, mode: 'insensitive' } },
            {
              AND: [
                { firstName: { contains: firstName, mode: 'insensitive' } },
                { lastName: { contains: lastName, mode: 'insensitive' } }
              ]
            }
          ]
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true
        }
      });
    }

    if (user) {
      return {
        success: true,
        user: user,
        message: `Found user: ${user.firstName} ${user.lastName} (${user.email})`
      };
    } else {
      return {
        success: false,
        message: `User not found: ${userData.name}`
      };
    }
  } catch (error) {
    console.error('Error finding user:', error);
    return {
      success: false,
      message: `Error finding user: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

async function listTeamMembersDirect() {
  try {
    const users = await db.user.findMany({
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true
      }
    });

    if (users.length === 0) {
      return {
        success: true,
        message: 'No team members found'
      };
    }

    const memberList = users.map(u => 
      `- ${u.firstName} ${u.lastName} (${u.email})`
    ).join('\n');

    return {
      success: true,
      message: `Team Members:\n${memberList}`
    };
  } catch (error) {
    console.error('Error listing team members:', error);
    return {
      success: false,
      message: `Error listing team members: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

export async function handleAIChat(message: string, history: ChatMessage[]) {
  // Wrap the entire function with a timeout
  return withTimeout(handleAIChatInternal(message, history), 30000); // 30 second timeout
}

async function handleAIChatInternal(message: string, history: ChatMessage[]) {
  try {
    console.log('🔍 Starting AI chat handler...');
    
    const authResult = await auth();
    const userId = authResult?.userId;
    if (!userId) {
      throw new Error('User not authenticated');
    }

    const dbUserId = await getDbUserId(userId);
    if (!dbUserId) {
      throw new Error('User not found in database');
    }

    // Get user details
    const user = await db.user.findUnique({
      where: { id: dbUserId },
      select: { id: true, firstName: true, lastName: true, email: true }
    });
    if (!user) {
      throw new Error('User not found in database');
    }

    console.log(`👤 User: ${user.firstName} ${user.lastName}`);

    // Analyze user intent and execute actions
    const messageLower = message.toLowerCase();
    let toolResults: any[] = [];
    let toolsUsed: string[] = [];
    let actionTaken = false;

    console.log(`📝 Processing message: "${message}"`);

    // Check for task creation requests
    if ((messageLower.includes('create') && messageLower.includes('task')) || 
        (messageLower.includes('make') && messageLower.includes('task')) ||
        (messageLower.includes('add') && messageLower.includes('task'))) {
      console.log('🎯 Detected task creation request');
      actionTaken = true;
      try {
        // Use AI to extract parameters
        console.log('🤖 Using AI to extract task parameters...');
        
        const extractionPrompt = `Extract task parameters from this message: "${message}"

Please extract and return ONLY the following information in JSON format:
- projectName: The name of the project (e.g., "logistics", "marketing", "cdb", etc.)
- taskTitle: A clear, descriptive title for the task
- assigneeName: The name of the person to assign the task to (if mentioned)
- priority: "low", "medium", or "high" (default to "medium" if not specified)
- dueDate: The due date in YYYY-MM-DD format. Calculate from TODAY which is ${new Date().toISOString().split('T')[0]}:
  * "next week" = exactly 7 days from today
  * "tomorrow" = exactly 1 day from today
  * "next month" = exactly 30 days from today
  * For specific dates, use the exact format YYYY-MM-DD

Return ONLY valid JSON, no other text.`;

        const extractionMessages: ChatMessage[] = [
          { role: 'system', content: 'You are a parameter extraction assistant. Extract task parameters and return only valid JSON.' },
          { role: 'user', content: extractionPrompt }
        ];

        const extractionResult = await withTimeout(openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: extractionMessages as any,
          temperature: 0.1,
          max_tokens: 200,
        }), 10000);

        let extractedParams;
        try {
          const extractionText = extractionResult.choices[0]?.message?.content || '{}';
          extractedParams = JSON.parse(extractionText);
          console.log('📋 Extracted parameters:', extractedParams);
        } catch (parseError) {
          console.error('❌ Error parsing extracted parameters:', parseError);
          throw new Error('Failed to extract task parameters');
        }

        const { projectName, taskTitle, assigneeName, priority = 'medium', dueDate } = extractedParams;

        if (!projectName) {
          throw new Error('Project name not found in message');
        }

        if (!taskTitle) {
          throw new Error('Task title not found in message');
        }

        // Find project
        console.log(`🔍 Looking for project: ${projectName}`);
        const projectResult = await findProjectDirect(projectName);
        
        if (!projectResult.success) {
          const projectsResult = await listProjectsDirect();
          toolResults.push({ 
            tool: 'listProjects', 
            result: `${projectResult.message}\n\nAvailable projects:\n${projectsResult.message}` 
          });
          toolsUsed.push('listProjects');
        } else {
          const project = projectResult.project!;
          
          // Find assignee if specified
          let assigneeId = null;
          if (assigneeName) {
            console.log(`🔍 Looking for assignee: ${assigneeName}`);
            const userResult = await findUserDirect({ name: assigneeName });
            if (userResult.success) {
              assigneeId = userResult.user!.id;
              console.log(`✅ Found assignee: ${userResult.user!.firstName} ${userResult.user!.lastName}`);
            } else {
              console.log(`❌ User not found: ${assigneeName}`);
            }
          }

          // Create the task
          console.log('🚀 Creating task...');
          const taskResult = await createTaskDirect({
            title: taskTitle,
            description: `Task created via AI chat`,
            projectId: project.id,
            priority: priority as 'low' | 'medium' | 'high',
            status: 'todo',
            assigneeId: assigneeId || undefined,
            dueDate: dueDate || undefined,
            creatorId: user.id
          });

          toolResults.push({ tool: 'createTask', result: taskResult.message });
          toolsUsed.push('createTask');
          console.log('✅ Task creation completed');
        }
      } catch (error) {
        console.error('❌ Error creating task:', error);
        toolResults.push({ tool: 'createTask', result: `Error creating task: ${error instanceof Error ? error.message : 'Unknown error'}` });
        toolsUsed.push('createTask');
      }
    }

    // Check for list requests
    if (!actionTaken) {
      console.log('🔍 Checking for list requests...');
      if (messageLower.includes('list') || messageLower.includes('show') || messageLower.includes('get') || 
          messageLower.includes('what') || messageLower.includes('my') || messageLower.includes('all')) {
        
        if (messageLower.includes('project')) {
          try {
            console.log('📋 Listing projects...');
            const result = await listProjectsDirect();
            toolResults.push({ tool: 'listProjects', result: result.message });
            toolsUsed.push('listProjects');
            actionTaken = true;
          } catch (error) {
            console.error('❌ Error listing projects:', error);
            toolResults.push({ tool: 'listProjects', result: 'Error listing projects' });
            toolsUsed.push('listProjects');
          }
        }
        
        if (messageLower.includes('task')) {
          try {
            console.log('📋 Listing tasks...');
            
            // Check if user is asking for tasks in a specific project
            let projectId = null;
            const projectMatch = message.match(/(?:in|for)\s+(?:the\s+)?(\w+)/i);
            
            if (projectMatch) {
              const projectName = projectMatch[1];
              console.log(`🔍 Looking for project: ${projectName}`);
              const projectResult = await findProjectDirect(projectName);
              if (projectResult.success) {
                projectId = projectResult.project!.id;
                console.log(`✅ Found project ID: ${projectId}`);
              }
            }
            
            const result = await listTasksDirect({ projectId: projectId || undefined });
            toolResults.push({ tool: 'listTasks', result: result.message });
            toolsUsed.push('listTasks');
            actionTaken = true;
          } catch (error) {
            console.error('❌ Error listing tasks:', error);
            toolResults.push({ tool: 'listTasks', result: 'Error listing tasks' });
            toolsUsed.push('listTasks');
          }
        }
        
        if (messageLower.includes('team') || messageLower.includes('member')) {
          try {
            console.log('📋 Listing team members...');
            const result = await listTeamMembersDirect();
            toolResults.push({ tool: 'listTeamMembers', result: result.message });
            toolsUsed.push('listTeamMembers');
            actionTaken = true;
          } catch (error) {
            console.error('❌ Error listing team members:', error);
            toolResults.push({ tool: 'listTeamMembers', result: 'Error listing team members' });
            toolsUsed.push('listTeamMembers');
          }
        }
      }
    }

    // If no specific action was taken, provide general information
    if (!actionTaken) {
      console.log('📋 No specific action taken, listing projects...');
      try {
        const result = await listProjectsDirect();
        toolResults.push({ tool: 'listProjects', result: result.message });
        toolsUsed.push('listProjects');
      } catch (error) {
        console.error('❌ Error listing projects:', error);
        toolResults.push({ tool: 'listProjects', result: 'Error listing projects' });
        toolsUsed.push('listProjects');
      }
    }

    console.log('🤖 Generating AI response...');

    // Create system prompt
    const systemPrompt = `You are an AI assistant for a project management application called TaskFlow. You can help users with:

- Creating tasks, projects, bugs, and sprints
- Listing and viewing project information
- Managing team assignments and priorities
- Setting due dates and status updates
- Checking team members and user information

You have successfully executed the user's request. Provide a helpful and clear response based on the results.

Current user: ${user.firstName} ${user.lastName} (${user.email})
User ID: ${user.id}

Be conversational and helpful in your responses.`;

    // Create enhanced system prompt with tool results
    let enhancedSystemPrompt = systemPrompt;
    if (toolResults.length > 0) {
      enhancedSystemPrompt += '\n\nActions Performed:\n';
      toolResults.forEach(({ tool, result }) => {
        enhancedSystemPrompt += `\n${tool}:\n${result}\n`;
      });
    }

    // Get response from OpenAI
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
    }), 15000); // 15 second timeout for OpenAI

    const assistantResponse = completion.choices[0]?.message?.content || 'I apologize, but I couldn\'t generate a response.';

    console.log('✅ AI response generated successfully');

    return {
      response: assistantResponse,
      toolsUsed
    };

  } catch (error) {
    console.error('❌ Error in AI chat handler:', error);
    
    // Return a helpful error message instead of throwing
    return {
      response: 'I apologize, but I encountered an error while processing your request. Please try again or rephrase your question.',
      toolsUsed: []
    };
  }
} 