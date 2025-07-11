import OpenAI from 'openai';
import { auth } from '@clerk/nextjs/server';
import { db } from './db';

// AI Service Configuration
export interface AIServiceConfig {
  model: string;
  maxTokens: number;
  temperature: number;
  contextWindowSize: number;
}

// Role-based AI Personalities
export const AI_PERSONALITIES = {
  workspace_creator: {
    role: 'Strategic Advisor',
    description: 'Provides executive-level insights, portfolio analysis, and strategic decision support',
    systemPrompt: `You are a Strategic Advisor AI assistant for workspace creators and executives. 
    Focus on high-level insights, portfolio management, resource allocation, and strategic planning.
    Provide business-oriented responses with ROI considerations and long-term impact analysis.`
  },
  project_manager: {
    role: 'Project Conductor', 
    description: 'Assists with sprint planning, team coordination, and project timeline management',
    systemPrompt: `You are a Project Conductor AI assistant for project managers.
    Focus on sprint planning, team coordination, timeline management, and risk assessment.
    Provide actionable project management insights and help optimize team workflows.`
  },
  developer: {
    role: 'Code Companion',
    description: 'Provides development assistance, best practices, and technical guidance',
    systemPrompt: `You are a Code Companion AI assistant for developers.
    Focus on task execution, technical implementation, code quality, and development best practices.
    Provide practical coding assistance and help with technical problem-solving.`
  },
  stakeholder: {
    role: 'Business Translator',
    description: 'Translates technical progress into business value and ROI insights',
    systemPrompt: `You are a Business Translator AI assistant for stakeholders.
    Focus on translating technical progress to business value, ROI tracking, and impact assessment.
    Provide clear business-oriented insights and project status in accessible language.`
  },
  team_lead: {
    role: 'Technical Architect',
    description: 'Offers architecture guidance, code quality insights, and technical leadership support',
    systemPrompt: `You are a Technical Architect AI assistant for team leads.
    Focus on code quality, architecture decisions, technical debt management, and team technical guidance.
    Provide technical leadership insights and help with architectural decision-making.`
  }
} as const;

// AI Configuration
const AI_CONFIG: AIServiceConfig = {
  model: 'gpt-4o', // Updated to GPT-4 Turbo as requested
  maxTokens: 2000,
  temperature: 0.7,
  contextWindowSize: 8000
};

// Initialize OpenAI with GitHub token support
export const initializeOpenAI = () => {
  const githubToken = process.env.GITHUB_TOKEN;
  const openaiApiKey = process.env.OPENAI_API_KEY;
  
  if (!githubToken && !openaiApiKey) {
    throw new Error('Either GITHUB_TOKEN or OPENAI_API_KEY must be configured');
  }
  
  // Prefer OpenAI API key, fallback to GitHub token
  const apiKey = openaiApiKey || githubToken;
  const baseURL = openaiApiKey ? undefined : 'https://models.inference.ai.azure.com';
  
  return new OpenAI({
    apiKey,
    baseURL
  });
};

// Role-aware Context Builder
export class RoleAwareContextBuilder {
  private openai: OpenAI;
  
  constructor() {
    this.openai = initializeOpenAI();
  }
  
  async buildUserContext(userId: string) {
    try {
      const user = await db.user.findUnique({
        where: { id: userId },
        include: {
          workspaceMember: {
            include: {
              workspace: true
            }
          },
          ownedProjects: {
            include: {
              workspace: true
            }
          },
          assignedTasks: {
            where: {
              status: { notIn: ['done', 'cancelled'] }
            },
            take: 10,
            orderBy: { createdAt: 'desc' },
            include: {
              project: true
            }
          }
        }
      });
      
      if (!user) return null;
      
      // Handle primaryRole safely - it might not exist in current DB
      const userRole = (user as any).primaryRole || 'DEVELOPER';
      
      return {
        user: {
          id: user.id,
          name: `${user.firstName} ${user.lastName}`.trim(),
          email: user.email,
          primaryRole: userRole
        },
        workspaces: user.workspaceMember.map(wm => ({
          id: wm.workspace.id,
          name: wm.workspace.name,
          role: wm.role
        })),
        projects: user.ownedProjects.map(project => ({
          id: project.id,
          name: project.name,
          workspace: project.workspace.name,
          role: 'OWNER'
        })),
        activeTasks: user.assignedTasks.map(task => ({
          id: task.id,
          title: task.title,
          status: task.status,
          priority: task.priority,
          projectName: task.project.name
        }))
      };
    } catch (error) {
      console.error('Error building user context:', error);
      return null;
    }
  }
  
  async buildProjectContext(projectId: string) {
    try {
      const project = await db.project.findUnique({
        where: { id: projectId },
        include: {
          workspace: true,
          tasks: {
            where: {
              status: { notIn: ['done', 'cancelled'] }
            },
            take: 20,
            orderBy: { createdAt: 'desc' },
            include: {
              assignee: true
            }
          },
          sprints: {
            where: {
              status: { in: ['planned', 'active'] }
            },
            take: 3,
            orderBy: { createdAt: 'desc' }
          },
          owner: true
        }
      });
      
      if (!project) return null;
      
      return {
        project: {
          id: project.id,
          name: project.name,
          description: project.description,
          status: project.status,
          archived: project.archived
        },
        workspace: {
          id: project.workspace.id,
          name: project.workspace.name
        },
        activeTasks: project.tasks.map(task => ({
          id: task.id,
          title: task.title,
          status: task.status,
          priority: task.priority,
          assigneeId: task.assigneeId,
          assigneeName: task.assignee ? `${task.assignee.firstName} ${task.assignee.lastName}`.trim() : null
        })),
        activeSprints: project.sprints.map(sprint => ({
          id: sprint.id,
          name: sprint.name,
          status: sprint.status,
          startDate: sprint.startDate,
          endDate: sprint.endDate
        })),
        owner: {
          id: project.owner.id,
          name: `${project.owner.firstName} ${project.owner.lastName}`.trim()
        }
      };
    } catch (error) {
      console.error('Error building project context:', error);
      return null;
    }
  }
  
  getRolePersonality(userRole: string) {
    const normalizedRole = userRole.toLowerCase().replace('_', '_');
    return AI_PERSONALITIES[normalizedRole as keyof typeof AI_PERSONALITIES] || AI_PERSONALITIES.developer;
  }
  
  async generateSystemPrompt(userContext: any, projectContext?: any) {
    const personality = this.getRolePersonality(userContext.user.primaryRole);
    
    let systemPrompt = personality.systemPrompt;
    
    // Add user context
    systemPrompt += `\n\nCurrent User Context:`;
    systemPrompt += `\n- Name: ${userContext.user.name}`;
    systemPrompt += `\n- Role: ${userContext.user.primaryRole}`;
    systemPrompt += `\n- Active Workspaces: ${userContext.workspaces.map((w: any) => w.name).join(', ')}`;
    
    if (userContext.activeTasks.length > 0) {
      systemPrompt += `\n- Current Tasks: ${userContext.activeTasks.map((t: any) => `${t.title} (${t.status}) in ${t.projectName}`).join(', ')}`;
    }
    
    // Add project context if available
    if (projectContext) {
      systemPrompt += `\n\nCurrent Project Context:`;
      systemPrompt += `\n- Project: ${projectContext.project.name}`;
      systemPrompt += `\n- Workspace: ${projectContext.workspace.name}`;
      systemPrompt += `\n- Status: ${projectContext.project.status}`;
      systemPrompt += `\n- Owner: ${projectContext.owner.name}`;
      
      if (projectContext.activeSprints.length > 0) {
        systemPrompt += `\n- Active Sprints: ${projectContext.activeSprints.map((s: any) => s.name).join(', ')}`;
      }
      
      if (projectContext.activeTasks.length > 0) {
        systemPrompt += `\n- Recent Tasks: ${projectContext.activeTasks.slice(0, 5).map((t: any) => `${t.title} (${t.status})`).join(', ')}`;
      }
    }
    
    systemPrompt += `\n\nProvide helpful, role-appropriate responses based on this context.`;
    
    return systemPrompt;
  }
}

// Export singleton instance
export const contextBuilder = new RoleAwareContextBuilder();
export const openai = initializeOpenAI();
export { AI_CONFIG }; 