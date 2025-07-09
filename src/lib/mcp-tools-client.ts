import { db } from './db';
import { getCurrentUserId, getDbUserId } from './auth-utils';

// Helper function to get current user
async function getCurrentUser() {
  const clerkId = await getCurrentUserId();
  if (!clerkId) throw new Error("User not authenticated");
  
  const dbUserId = await getDbUserId(clerkId);
  if (!dbUserId) throw new Error("User not found in database");
  
  return dbUserId;
}

// MCP Tools Implementation
export const mcpTools = {
  async listTasks(params: { projectId?: string; status?: string; assigneeId?: string }) {
    try {
      const userId = await getCurrentUser();
      
      const where: any = {};
      
      if (params.projectId) {
        where.projectId = params.projectId;
      }
      
      if (params.status) {
        where.status = params.status;
      }
      
      if (params.assigneeId) {
        where.assigneeId = params.assigneeId;
      }
      
      // Get user's workspaces to filter tasks
      const userWorkspaces = await db.workspaceMember.findMany({
        where: { userId },
        select: { workspaceId: true }
      });
      
      const workspaceIds = userWorkspaces.map(w => w.workspaceId);
      
      const tasks = await db.task.findMany({
        where: {
          ...where,
          project: {
            workspaceId: { in: workspaceIds }
          }
        },
        include: {
          assignee: {
            select: { firstName: true, lastName: true, email: true }
          },
          project: {
            select: { name: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      });
      
      return tasks;
    } catch (error) {
      throw new Error(`Error listing tasks: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  async getTaskDetails(params: { taskId: string }) {
    try {
      const userId = await getCurrentUser();
      
      const task = await db.task.findFirst({
        where: {
          id: params.taskId,
          project: {
            workspace: {
              members: {
                some: { userId }
              }
            }
          }
        },
        include: {
          assignee: {
            select: { firstName: true, lastName: true, email: true }
          },
          project: {
            select: { name: true }
          },
          comments: {
            include: {
              author: {
                select: { firstName: true, lastName: true }
              }
            },
            orderBy: { createdAt: 'desc' }
          }
        }
      });
      
      if (!task) {
        throw new Error("Task not found or you don't have access to it");
      }
      
      return task;
    } catch (error) {
      throw new Error(`Error getting task details: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  async listProjects() {
    try {
      const userId = await getCurrentUser();
      
      const projects = await db.project.findMany({
        where: {
          OR: [
            { ownerId: userId },
            {
              workspace: {
                members: {
                  some: { userId }
                }
              }
            }
          ]
        },
        include: {
          owner: {
            select: { firstName: true, lastName: true }
          },
          workspace: {
            select: { name: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      });
      
      return projects;
    } catch (error) {
      throw new Error(`Error listing projects: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  async listWorkspaces() {
    try {
      const userId = await getCurrentUser();
      
      const workspaces = await db.workspace.findMany({
        where: {
          members: {
            some: { userId }
          }
        },
        include: {
          members: {
            include: {
              user: {
                select: { firstName: true, lastName: true, email: true }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });
      
      return workspaces;
    } catch (error) {
      throw new Error(`Error listing workspaces: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  async listTeamMembers(params: { workspaceId: string }) {
    try {
      const userId = await getCurrentUser();
      
      // Check if user has access to this workspace
      const hasAccess = await db.workspaceMember.findFirst({
        where: {
          workspaceId: params.workspaceId,
          userId
        }
      });
      
      if (!hasAccess) {
        throw new Error("You don't have access to this workspace");
      }
      
      const members = await db.workspaceMember.findMany({
        where: { workspaceId: params.workspaceId },
        include: {
          user: {
            select: { firstName: true, lastName: true, email: true }
          }
        },
        orderBy: { createdAt: 'asc' }
      });
      
      return members;
    } catch (error) {
      throw new Error(`Error listing team members: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  async listNotifications() {
    try {
      const userId = await getCurrentUser();
      
      // Since there's no notification model, we'll return mentions instead
      const mentions = await db.mention.findMany({
        where: { userId },
        include: {
          comment: {
            include: {
              task: {
                select: { title: true }
              },
              author: {
                select: { firstName: true, lastName: true }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 20
      });
      
      return mentions;
    } catch (error) {
      throw new Error(`Error listing notifications: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  async listSprints(params: { projectId: string }) {
    try {
      const userId = await getCurrentUser();
      
      // Check if user has access to this project
      const project = await db.project.findFirst({
        where: {
          id: params.projectId,
          OR: [
            { ownerId: userId },
            {
              workspace: {
                members: {
                  some: { userId }
                }
              }
            }
          ]
        }
      });
      
      if (!project) {
        throw new Error("Project not found or you don't have access to it");
      }
      
      const sprints = await db.sprint.findMany({
        where: { projectId: params.projectId },
        orderBy: { startDate: 'desc' }
      });
      
      return sprints;
    } catch (error) {
      throw new Error(`Error listing sprints: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  async listBugs(params: { projectId: string }) {
    try {
      const userId = await getCurrentUser();
      
      // Check if user has access to this project
      const project = await db.project.findFirst({
        where: {
          id: params.projectId,
          OR: [
            { ownerId: userId },
            {
              workspace: {
                members: {
                  some: { userId }
                }
              }
            }
          ]
        }
      });
      
      if (!project) {
        throw new Error("Project not found or you don't have access to it");
      }
      
      const bugs = await db.bug.findMany({
        where: { projectId: params.projectId },
        include: {
          assignee: {
            select: { firstName: true, lastName: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      });
      
      return bugs;
    } catch (error) {
      throw new Error(`Error listing bugs: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  async listFeatures(params: { projectId: string }) {
    try {
      const userId = await getCurrentUser();
      
      // Check if user has access to this project
      const project = await db.project.findFirst({
        where: {
          id: params.projectId,
          OR: [
            { ownerId: userId },
            {
              workspace: {
                members: {
                  some: { userId }
                }
              }
            }
          ]
        }
      });
      
      if (!project) {
        throw new Error("Project not found or you don't have access to it");
      }
      
      // Get features through milestones and roadmaps
      const features = await db.feature.findMany({
        where: {
          milestone: {
            roadmap: {
              projectId: params.projectId
            }
          }
        },
        include: {
          milestone: {
            select: { name: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      });
      
      return features;
    } catch (error) {
      throw new Error(`Error listing features: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  async listTaskComments(params: { taskId: string }) {
    try {
      const userId = await getCurrentUser();
      
      const task = await db.task.findFirst({
        where: {
          id: params.taskId,
          project: {
            workspace: {
              members: {
                some: { userId }
              }
            }
          }
        }
      });
      
      if (!task) {
        throw new Error("Task not found or you don't have access to it");
      }
      
      const comments = await db.comment.findMany({
        where: { taskId: params.taskId },
        include: {
          author: {
            select: { firstName: true, lastName: true }
          }
        },
        orderBy: { createdAt: 'asc' }
      });
      
      return comments;
    } catch (error) {
      throw new Error(`Error listing task comments: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  async listActivityLog(params: { workspaceId: string }) {
    try {
      const userId = await getCurrentUser();
      
      // Check if user has access to this workspace
      const hasAccess = await db.workspaceMember.findFirst({
        where: {
          workspaceId: params.workspaceId,
          userId
        }
      });
      
      if (!hasAccess) {
        throw new Error("You don't have access to this workspace");
      }
      
      // Get activities for projects in this workspace
      const activities = await db.activityLog.findMany({
        where: {
          entityType: 'project',
          entityId: {
            in: await db.project.findMany({
              where: { workspaceId: params.workspaceId },
              select: { id: true }
            }).then(projects => projects.map(p => p.id))
          }
        },
        include: {
          user: {
            select: { firstName: true, lastName: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 50
      });
      
      return activities;
    } catch (error) {
      throw new Error(`Error listing activity log: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}; 