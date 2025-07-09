import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { db } from "./lib/db.js";
import { getCurrentUserId, getDbUserId } from "./lib/auth-utils.js";

// Create an MCP server
const server = new McpServer({
  name: "taskflow-server",
  version: "1.0.0"
});

// Add a task creation tool
server.registerTool("createTask",
  {
    title: "Create Task",
    description: "Create a new task in a project",
    inputSchema: {
      title: z.string().describe("Task title"),
      description: z.string().optional().describe("Task description"),
      projectId: z.string().describe("Project ID"),
      priority: z.enum(["low", "medium", "high"]).optional().describe("Task priority"),
      status: z.enum(["todo", "in_progress", "done"]).optional().describe("Task status"),
      assigneeId: z.string().optional().describe("Assignee user ID"),
      dueDate: z.string().optional().describe("Due date in ISO format"),
      creatorId: z.string().describe("Creator user ID")
    }
  },
  async ({ title, description, projectId, priority, status, assigneeId, dueDate, creatorId }) => {
    try {
      const task = await db.task.create({
        data: {
          title,
          description: description || "",
          priority: priority || "medium",
          status: status || "todo",
          dueDate: dueDate ? new Date(dueDate) : null,
          projectId,
          assigneeId: assigneeId || undefined,
          creatorId,
        },
        include: {
          project: true,
        }
      });
      return {
        content: [{ 
          type: "text", 
          text: `Task "${title}" created successfully in project "${task.project?.name || task.projectId}"` 
        }]
      };
    } catch (error) {
      return {
        content: [{ 
          type: "text", 
          text: `Error creating task: ${error instanceof Error ? error.message : 'Unknown error'}` 
        }]
      };
    }
  }
);

// Add a project creation tool
server.registerTool("createProject",
  {
    title: "Create Project",
    description: "Create a new project in a workspace",
    inputSchema: {
      name: z.string().describe("Project name"),
      description: z.string().optional().describe("Project description"),
      workspaceId: z.string().describe("Workspace ID"),
      status: z.enum(["active", "archived", "completed"]).optional().describe("Project status"),
      ownerId: z.string().describe("Owner user ID")
    }
  },
  async ({ name, description, workspaceId, status, ownerId }) => {
    try {
      const project = await db.project.create({
        data: {
          name,
          description: description || "",
          status: status || "active",
          workspaceId,
          ownerId,
        },
        include: {
          workspace: true,
        }
      });
      return {
        content: [{ 
          type: "text", 
          text: `Project "${name}" created successfully in workspace "${project.workspace?.name || project.workspaceId}"` 
        }]
      };
    } catch (error) {
      return {
        content: [{ 
          type: "text", 
          text: `Error creating project: ${error instanceof Error ? error.message : 'Unknown error'}` 
        }]
      };
    }
  }
);

// Add a bug creation tool
server.registerTool("createBug",
  {
    title: "Create Bug",
    description: "Create a new bug in a project",
    inputSchema: {
      title: z.string().describe("Bug title"),
      description: z.string().optional().describe("Bug description"),
      projectId: z.string().describe("Project ID"),
      severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional().describe("Bug severity"),
      status: z.enum(["OPEN", "IN_PROGRESS", "FIXED", "VERIFIED", "CLOSED", "REOPENED"]).optional().describe("Bug status"),
      assigneeId: z.string().optional().describe("Assignee user ID"),
      priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional().describe("Bug priority"),
      reporterId: z.string().describe("Reporter user ID")
    }
  },
  async ({ title, description, projectId, severity, status, assigneeId, priority, reporterId }) => {
    try {
      const bug = await db.bug.create({
        data: {
          title,
          description: description || "",
          severity: severity || "MEDIUM",
          status: status || "OPEN",
          priority: priority || "MEDIUM",
          projectId,
          assigneeId: assigneeId || null,
          reporterId,
        },
        include: {
          project: true,
        }
      });
      return {
        content: [{ 
          type: "text", 
          text: `Bug "${title}" created successfully in project "${bug.project?.name || bug.projectId}"` 
        }]
      };
    } catch (error) {
      return {
        content: [{ 
          type: "text", 
          text: `Error creating bug: ${error instanceof Error ? error.message : 'Unknown error'}` 
        }]
      };
    }
  }
);

// Add a sprint creation tool
server.registerTool("createSprint",
  {
    title: "Create Sprint",
    description: "Create a new sprint in a project",
    inputSchema: {
      name: z.string().describe("Sprint name"),
      description: z.string().optional().describe("Sprint description"),
      projectId: z.string().describe("Project ID"),
      startDate: z.string().describe("Start date in ISO format"),
      endDate: z.string().describe("End date in ISO format")
    }
  },
  async ({ name, description, projectId, startDate, endDate }) => {
    try {
      const sprint = await db.sprint.create({
        data: {
          name,
          description: description || "",
          startDate: new Date(startDate),
          endDate: new Date(endDate),
          projectId,
          status: "planned",
        },
        include: {
          project: true,
        }
      });
      return {
        content: [{ 
          type: "text", 
          text: `Sprint "${name}" created successfully in project "${sprint.project?.name || sprint.projectId}"` 
        }]
      };
    } catch (error) {
      return {
        content: [{ 
          type: "text", 
          text: `Error creating sprint: ${error instanceof Error ? error.message : 'Unknown error'}` 
        }]
      };
    }
  }
);

// Add a list bugs tool
server.registerTool("listBugs",
  {
    title: "List Bugs",
    description: "List bugs in a project",
    inputSchema: {
      projectId: z.string().optional().describe("Project ID (optional)"),
      status: z.enum(["OPEN", "IN_PROGRESS", "FIXED", "VERIFIED", "CLOSED", "REOPENED"]).optional().describe("Filter by status"),
      severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional().describe("Filter by severity")
    }
  },
  async ({ projectId, status, severity }) => {
    try {
      const where: any = {};
      if (projectId) where.projectId = projectId;
      if (status) where.status = status;
      if (severity) where.severity = severity;

      const bugs = await db.bug.findMany({
        where,
        include: {
          project: true,
          assignee: true
        },
        orderBy: { createdAt: 'desc' }
      });

      const bugList = bugs.map(b => 
        `- ${b.title} (${b.status}, ${b.severity}) - ${b.project.name}${b.assignee ? ` - Assigned to ${b.assignee.firstName}` : ''}`
      ).join('\n');

      return {
        content: [{ 
          type: "text", 
          text: `Bugs:\n${bugList || 'No bugs found'}` 
        }]
      };
    } catch (error) {
      return {
        content: [{ 
          type: "text", 
          text: `Error listing bugs: ${error instanceof Error ? error.message : 'Unknown error'}` 
        }]
      };
    }
  }
);

// Add a list sprints tool
server.registerTool("listSprints",
  {
    title: "List Sprints",
    description: "List sprints in a project",
    inputSchema: {
      projectId: z.string().optional().describe("Project ID (optional)"),
      status: z.enum(["planned", "active", "completed"]).optional().describe("Filter by status")
    }
  },
  async ({ projectId, status }) => {
    try {
      const where: any = {};
      if (projectId) where.projectId = projectId;
      if (status) where.status = status;

      const sprints = await db.sprint.findMany({
        where,
        include: {
          project: true,
          _count: {
            select: { tasks: true }
          }
        },
        orderBy: { startDate: 'desc' }
      });

      const sprintList = sprints.map(s => 
        `- ${s.name} (${s.status}) - ${s.project.name} - ${s._count.tasks} tasks - ${s.startDate.toLocaleDateString()} to ${s.endDate.toLocaleDateString()}`
      ).join('\n');

      return {
        content: [{ 
          type: "text", 
          text: `Sprints:\n${sprintList || 'No sprints found'}` 
        }]
      };
    } catch (error) {
      return {
        content: [{ 
          type: "text", 
          text: `Error listing sprints: ${error instanceof Error ? error.message : 'Unknown error'}` 
        }]
      };
    }
  }
);

// Add a list projects tool
server.registerTool("listProjects",
  {
    title: "List Projects",
    description: "List all projects in the current workspace",
    inputSchema: {
      workspaceId: z.string().optional().describe("Workspace ID (optional)")
    }
  },
  async ({ workspaceId }) => {
    try {
      const projects = await db.project.findMany({
        where: workspaceId ? { workspaceId } : {},
        include: {
          workspace: true,
          _count: {
            select: { tasks: true }
          }
        }
      });

      const projectList = projects.map(p => 
        `- ${p.name} (${p._count.tasks} tasks) - ${p.workspace.name}`
      ).join('\n');

      return {
        content: [{ 
          type: "text", 
          text: `Projects:\n${projectList || 'No projects found'}` 
        }]
      };
    } catch (error) {
      return {
        content: [{ 
          type: "text", 
          text: `Error listing projects: ${error instanceof Error ? error.message : 'Unknown error'}` 
        }]
      };
    }
  }
);

// Add a list tasks tool
server.registerTool("listTasks",
  {
    title: "List Tasks",
    description: "List tasks in a project or workspace",
    inputSchema: {
      projectId: z.string().optional().describe("Project ID (optional)"),
      status: z.enum(["todo", "in_progress", "done"]).optional().describe("Filter by status"),
      assigneeId: z.string().optional().describe("Filter by assignee")
    }
  },
  async ({ projectId, status, assigneeId }) => {
    try {
      const where: any = {};
      if (projectId) where.projectId = projectId;
      if (status) where.status = status;
      if (assigneeId) where.assigneeId = assigneeId;

      const tasks = await db.task.findMany({
        where,
        include: {
          project: true,
          assignee: true
        },
        orderBy: { createdAt: 'desc' }
      });

      const taskList = tasks.map(t => 
        `- ${t.title} (${t.status}) - ${t.project.name}${t.assignee ? ` - Assigned to ${t.assignee.firstName}` : ''}`
      ).join('\n');

      return {
        content: [{ 
          type: "text", 
          text: `Tasks:\n${taskList || 'No tasks found'}` 
        }]
      };
    } catch (error) {
      return {
        content: [{ 
          type: "text", 
          text: `Error listing tasks: ${error instanceof Error ? error.message : 'Unknown error'}` 
        }]
      };
    }
  }
);

// Add a list team members tool
server.registerTool("listTeamMembers",
  {
    title: "List Team Members",
    description: "List all team members in a workspace or project",
    inputSchema: {
      workspaceId: z.string().optional().describe("Workspace ID (optional)"),
      projectId: z.string().optional().describe("Project ID (optional)")
    }
  },
  async ({ workspaceId, projectId }) => {
    try {
      let members: any[] = [];
      
      if (workspaceId) {
        // Get workspace members
        const workspace = await db.workspace.findUnique({
          where: { id: workspaceId },
          include: {
            members: {
              include: { user: true }
            }
          }
        });
        if (workspace) {
          members = workspace.members.map(m => ({
            id: m.user.id,
            firstName: m.user.firstName,
            lastName: m.user.lastName,
            email: m.user.email,
            role: m.role
          }));
        }
      } else if (projectId) {
        // Get project workspace members
        const project = await db.project.findUnique({
          where: { id: projectId },
          include: {
            workspace: {
              include: {
                members: {
                  include: { user: true }
                }
              }
            }
          }
        });
        if (project) {
          members = project.workspace.members.map(m => ({
            id: m.user.id,
            firstName: m.user.firstName,
            lastName: m.user.lastName,
            email: m.user.email,
            role: m.role
          }));
        }
      } else {
        // Get all users (simplified for now)
        const users = await db.user.findMany({
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        });
        members = users.map(u => ({
          id: u.id,
          firstName: u.firstName,
          lastName: u.lastName,
          email: u.email,
          role: 'MEMBER'
        }));
      }

      const memberList = members.map(m => 
        `- ${m.firstName} ${m.lastName} (${m.email}) - ${m.role}`
      ).join('\n');

      return {
        content: [{ 
          type: "text", 
          text: `Team Members:\n${memberList || 'No members found'}` 
        }]
      };
    } catch (error) {
      return {
        content: [{ 
          type: "text", 
          text: `Error listing team members: ${error instanceof Error ? error.message : 'Unknown error'}` 
        }]
      };
    }
  }
);

// Add a find user tool
server.registerTool("findUser",
  {
    title: "Find User",
    description: "Find a user by name or email",
    inputSchema: {
      name: z.string().describe("User name (first name, last name, or full name)"),
      email: z.string().optional().describe("User email (optional)")
    }
  },
  async ({ name, email }) => {
    try {
      let user = null;
      
      if (email) {
        user = await db.user.findUnique({
          where: { email },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        });
      } else {
        // Search by name
        const nameParts = name.trim().split(' ');
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
          content: [{ 
            type: "text", 
            text: `User found: ${user.firstName} ${user.lastName} (${user.email}) - ID: ${user.id}` 
          }]
        };
      } else {
        return {
          content: [{ 
            type: "text", 
            text: `User not found: ${name}` 
          }]
        };
      }
    } catch (error) {
      return {
        content: [{ 
          type: "text", 
          text: `Error finding user: ${error instanceof Error ? error.message : 'Unknown error'}` 
        }]
      };
    }
  }
);

// Add a get project details tool
server.registerTool("getProjectDetails",
  {
    title: "Get Project Details",
    description: "Get detailed information about a project by name",
    inputSchema: {
      projectName: z.string().describe("Project name")
    }
  },
  async ({ projectName }) => {
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
          content: [{ 
            type: "text", 
            text: `Project: ${project.name}
ID: ${project.id}
Workspace: ${project.workspace.name}
Description: ${project.description || 'No description'}
Status: ${project.status}
Total Tasks: ${project._count.tasks}` 
          }]
        };
      } else {
        return {
          content: [{ 
            type: "text", 
            text: `Project not found: ${projectName}` 
          }]
        };
      }
    } catch (error) {
      return {
        content: [{ 
          type: "text", 
          text: `Error getting project details: ${error instanceof Error ? error.message : 'Unknown error'}` 
        }]
      };
    }
  }
);

// === TASK UPDATE TOOLS ===

// Update task status
server.registerTool("updateTaskStatus",
  {
    title: "Update Task Status",
    description: "Update the status of a task",
    inputSchema: {
      taskId: z.string().describe("Task ID"),
      status: z.enum(["todo", "in_progress", "done"]).describe("New task status")
    }
  },
  async ({ taskId, status }) => {
    try {
      const task = await db.task.update({
        where: { id: taskId },
        data: { status },
        include: { project: true, assignee: true }
      });
      return {
        content: [{ 
          type: "text", 
          text: `Task "${task.title}" status updated to "${status}"` 
        }]
      };
    } catch (error) {
      return {
        content: [{ 
          type: "text", 
          text: `Error updating task status: ${error instanceof Error ? error.message : 'Unknown error'}` 
        }]
      };
    }
  }
);

// Reassign task
server.registerTool("reassignTask",
  {
    title: "Reassign Task",
    description: "Reassign a task to a different user",
    inputSchema: {
      taskId: z.string().describe("Task ID"),
      assigneeId: z.string().describe("New assignee user ID")
    }
  },
  async ({ taskId, assigneeId }) => {
    try {
      console.log(`🔄 Reassigning task ${taskId} to user ${assigneeId}`);
      
      // First check if the task exists
      const existingTask = await db.task.findUnique({
        where: { id: taskId },
        include: { project: true, assignee: true }
      });
      
      if (!existingTask) {
        console.log(`❌ Task not found: ${taskId}`);
        return {
          content: [{ 
            type: "text", 
            text: `Error: Task not found with ID ${taskId}` 
          }]
        };
      }
      
      console.log(`📝 Found task: "${existingTask.title}" in project "${existingTask.project.name}"`);
      console.log(`👤 Current assignee: ${existingTask.assignee ? `${existingTask.assignee.firstName} ${existingTask.assignee.lastName}` : 'None'}`);
      
      // Check if the user exists
      const targetUser = await db.user.findUnique({
        where: { id: assigneeId },
        select: { id: true, firstName: true, lastName: true, email: true }
      });
      
      if (!targetUser) {
        console.log(`❌ Target user not found: ${assigneeId}`);
        return {
          content: [{ 
            type: "text", 
            text: `Error: User not found with ID ${assigneeId}` 
          }]
        };
      }
      
      console.log(`👥 Target user found: ${targetUser.firstName} ${targetUser.lastName} (${targetUser.email})`);
      
      // Perform the update
      const task = await db.task.update({
        where: { id: taskId },
        data: { assigneeId },
        include: { project: true, assignee: true }
      });
      
      console.log(`✅ Task successfully reassigned!`);
      console.log(`📝 Task: "${task.title}"`);
      console.log(`👤 New assignee: ${task.assignee?.firstName} ${task.assignee?.lastName}`);
      
      return {
        content: [{ 
          type: "text", 
          text: `✅ SUCCESS: Task "${task.title}" reassigned to ${task.assignee?.firstName} ${task.assignee?.lastName}` 
        }]
      };
    } catch (error) {
      console.error(`❌ Error in reassignTask:`, error);
      return {
        content: [{ 
          type: "text", 
          text: `Error reassigning task: ${error instanceof Error ? error.message : 'Unknown error'}` 
        }]
      };
    }
  }
);

// Update task priority
server.registerTool("updateTaskPriority",
  {
    title: "Update Task Priority",
    description: "Update the priority of a task",
    inputSchema: {
      taskId: z.string().describe("Task ID"),
      priority: z.enum(["low", "medium", "high"]).describe("New task priority")
    }
  },
  async ({ taskId, priority }) => {
    try {
      const task = await db.task.update({
        where: { id: taskId },
        data: { priority },
        include: { project: true }
      });
      return {
        content: [{ 
          type: "text", 
          text: `Task "${task.title}" priority updated to "${priority}"` 
        }]
      };
    } catch (error) {
      return {
        content: [{ 
          type: "text", 
          text: `Error updating task priority: ${error instanceof Error ? error.message : 'Unknown error'}` 
        }]
      };
    }
  }
);

// Update task due date
server.registerTool("updateTaskDueDate",
  {
    title: "Update Task Due Date",
    description: "Update the due date of a task",
    inputSchema: {
      taskId: z.string().describe("Task ID"),
      dueDate: z.string().describe("New due date in ISO format")
    }
  },
  async ({ taskId, dueDate }) => {
    try {
      const task = await db.task.update({
        where: { id: taskId },
        data: { dueDate: new Date(dueDate) },
        include: { project: true }
      });
      return {
        content: [{ 
          type: "text", 
          text: `Task "${task.title}" due date updated to ${new Date(dueDate).toLocaleDateString()}` 
        }]
      };
    } catch (error) {
      return {
        content: [{ 
          type: "text", 
          text: `Error updating task due date: ${error instanceof Error ? error.message : 'Unknown error'}` 
        }]
      };
    }
  }
);

// === TASK ANALYTICS TOOLS ===

// Get task completion rate
server.registerTool("getTaskCompletionRate",
  {
    title: "Get Task Completion Rate",
    description: "Get task completion rate for a time period",
    inputSchema: {
      projectId: z.string().optional().describe("Project ID (optional)"),
      startDate: z.string().optional().describe("Start date in ISO format"),
      endDate: z.string().optional().describe("End date in ISO format")
    }
  },
  async ({ projectId, startDate, endDate }) => {
    try {
      const where: any = {};
      if (projectId) where.projectId = projectId;
      if (startDate && endDate) {
        where.createdAt = {
          gte: new Date(startDate),
          lte: new Date(endDate)
        };
      }

      const totalTasks = await db.task.count({ where });
      const completedTasks = await db.task.count({ 
        where: { ...where, status: 'done' } 
      });

      const rate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

      return {
        content: [{ 
          type: "text", 
          text: `Task Completion Rate: ${rate}% (${completedTasks}/${totalTasks} tasks completed)` 
        }]
      };
    } catch (error) {
      return {
        content: [{ 
          type: "text", 
          text: `Error getting completion rate: ${error instanceof Error ? error.message : 'Unknown error'}` 
        }]
      };
    }
  }
);

// Get overdue tasks
server.registerTool("getOverdueTasks",
  {
    title: "Get Overdue Tasks",
    description: "Get all overdue tasks",
    inputSchema: {
      projectId: z.string().optional().describe("Project ID (optional)"),
      assigneeId: z.string().optional().describe("Assignee ID (optional)")
    }
  },
  async ({ projectId, assigneeId }) => {
    try {
      const where: any = {
        dueDate: { lt: new Date() },
        status: { not: 'done' }
      };
      if (projectId) where.projectId = projectId;
      if (assigneeId) where.assigneeId = assigneeId;

      const overdueTasks = await db.task.findMany({
        where,
        include: {
          project: true,
          assignee: true
        },
        orderBy: { dueDate: 'asc' }
      });

      if (overdueTasks.length === 0) {
        return {
          content: [{ 
            type: "text", 
            text: "No overdue tasks found" 
          }]
        };
      }

      const taskList = overdueTasks.map(t => {
        const daysOverdue = Math.ceil((Date.now() - t.dueDate!.getTime()) / (1000 * 60 * 60 * 24));
        return `- ${t.title} (${daysOverdue} days overdue) - ${t.project.name}${t.assignee ? ` - ${t.assignee.firstName} ${t.assignee.lastName}` : ''}`;
      }).join('\n');

      return {
        content: [{ 
          type: "text", 
          text: `Overdue Tasks (${overdueTasks.length}):\n${taskList}` 
        }]
      };
    } catch (error) {
      return {
        content: [{ 
          type: "text", 
          text: `Error getting overdue tasks: ${error instanceof Error ? error.message : 'Unknown error'}` 
        }]
      };
    }
  }
);

// Get team performance
server.registerTool("getTeamPerformance",
  {
    title: "Get Team Performance",
    description: "Get team performance metrics",
    inputSchema: {
      projectId: z.string().optional().describe("Project ID (optional)"),
      startDate: z.string().optional().describe("Start date in ISO format"),
      endDate: z.string().optional().describe("End date in ISO format")
    }
  },
  async ({ projectId, startDate, endDate }) => {
    try {
      const where: any = {};
      if (projectId) where.projectId = projectId;
      if (startDate && endDate) {
        where.updatedAt = {
          gte: new Date(startDate),
          lte: new Date(endDate)
        };
      }

      const tasks = await db.task.findMany({
        where,
        include: { assignee: true },
        orderBy: { updatedAt: 'desc' }
      });

      const performance = tasks.reduce((acc: any, task) => {
        if (!task.assignee) return acc;
        
        const key = `${task.assignee.firstName} ${task.assignee.lastName}`;
        if (!acc[key]) {
          acc[key] = { total: 0, completed: 0, inProgress: 0 };
        }
        
        acc[key].total++;
        if (task.status === 'done') acc[key].completed++;
        if (task.status === 'in_progress') acc[key].inProgress++;
        
        return acc;
      }, {});

      const report = Object.entries(performance).map(([name, stats]: [string, any]) => {
        const rate = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;
        return `- ${name}: ${stats.completed}/${stats.total} completed (${rate}%), ${stats.inProgress} in progress`;
      }).join('\n');

      return {
        content: [{ 
          type: "text", 
          text: `Team Performance:\n${report || 'No team performance data found'}` 
        }]
      };
    } catch (error) {
      return {
        content: [{ 
          type: "text", 
          text: `Error getting team performance: ${error instanceof Error ? error.message : 'Unknown error'}` 
        }]
      };
    }
  }
);

// === ADVANCED TASK MANAGEMENT TOOLS ===

// Bulk update task status
server.registerTool("bulkUpdateTaskStatus",
  {
    title: "Bulk Update Task Status",
    description: "Update the status of multiple tasks at once",
    inputSchema: {
      taskIds: z.array(z.string()).describe("Array of task IDs"),
      status: z.enum(["todo", "in_progress", "done"]).describe("New status for all tasks")
    }
  },
  async ({ taskIds, status }) => {
    try {
      const result = await db.task.updateMany({
        where: { id: { in: taskIds } },
        data: { status }
      });
      return {
        content: [{ 
          type: "text", 
          text: `Successfully updated ${result.count} tasks to "${status}" status` 
        }]
      };
    } catch (error) {
      return {
        content: [{ 
          type: "text", 
          text: `Error bulk updating tasks: ${error instanceof Error ? error.message : 'Unknown error'}` 
        }]
      };
    }
  }
);

// Get task dependencies
server.registerTool("getTaskDependencies",
  {
    title: "Get Task Dependencies",
    description: "Get tasks that depend on a specific task",
    inputSchema: {
      taskId: z.string().describe("Task ID to check dependencies for")
    }
  },
  async ({ taskId }) => {
    try {
      // Find tasks that might reference this task in their description or are in the same project
      const task = await db.task.findUnique({
        where: { id: taskId },
        include: { project: true }
      });
      
      if (!task) {
        return {
          content: [{ 
            type: "text", 
            text: "Task not found" 
          }]
        };
      }

      // Get other tasks in the same project that might be related
      const relatedTasks = await db.task.findMany({
        where: {
          projectId: task.projectId,
          id: { not: taskId },
          OR: [
            { description: { contains: task.title, mode: 'insensitive' } },
            { title: { contains: task.title.split(' ')[0], mode: 'insensitive' } }
          ]
        },
        include: { assignee: true }
      });

      if (relatedTasks.length === 0) {
        return {
          content: [{ 
            type: "text", 
            text: `No related tasks found for "${task.title}"` 
          }]
        };
      }

      const taskList = relatedTasks.map(t => 
        `- ${t.title} (${t.status})${t.assignee ? ` - ${t.assignee.firstName} ${t.assignee.lastName}` : ''}`
      ).join('\n');

      return {
        content: [{ 
          type: "text", 
          text: `Related tasks for "${task.title}":\n${taskList}` 
        }]
      };
    } catch (error) {
      return {
        content: [{ 
          type: "text", 
          text: `Error getting task dependencies: ${error instanceof Error ? error.message : 'Unknown error'}` 
        }]
      };
    }
  }
);

// Add task comment
server.registerTool("addTaskComment",
  {
    title: "Add Task Comment",
    description: "Add a comment to a task",
    inputSchema: {
      taskId: z.string().describe("Task ID"),
      content: z.string().describe("Comment content"),
      authorId: z.string().describe("Author user ID")
    }
  },
  async ({ taskId, content, authorId }) => {
    try {
      const comment = await db.comment.create({
        data: {
          content,
          taskId,
          authorId
        },
        include: {
          author: true,
          task: true
        }
      });
      return {
        content: [{ 
          type: "text", 
          text: `Comment added to task "${comment.task.title}" by ${comment.author.firstName} ${comment.author.lastName}` 
        }]
      };
    } catch (error) {
      return {
        content: [{ 
          type: "text", 
          text: `Error adding comment: ${error instanceof Error ? error.message : 'Unknown error'}` 
        }]
      };
    }
  }
);

// Search tasks by title or description with intelligent fuzzy matching
server.registerTool("searchTasks",
  {
    title: "Search Tasks",
    description: "Search for tasks by title or description with fuzzy matching",
    inputSchema: {
      query: z.string().describe("Search query"),
      projectId: z.string().optional().describe("Filter by project ID"),
      projectName: z.string().optional().describe("Filter by project name"),
      status: z.enum(["todo", "in_progress", "done"]).optional().describe("Filter by status"),
      assigneeId: z.string().optional().describe("Filter by assignee"),
      fuzzy: z.boolean().optional().describe("Enable fuzzy search (default: true)")
    }
  },
  async ({ query, projectId, projectName, status, assigneeId, fuzzy = true }) => {
    try {
      // Build base search conditions
      const searchConditions: any[] = [];
      
      if (fuzzy) {
        // Split query into words for better matching
        const queryWords = query.toLowerCase().split(/\s+/).filter(word => word.length > 2);
        
        // Exact title match (highest priority)
        searchConditions.push({
          title: { equals: query, mode: 'insensitive' as any }
        });
        
        // Title contains full query
        searchConditions.push({
          title: { contains: query, mode: 'insensitive' as any }
        });
        
        // Description contains full query
        searchConditions.push({
          description: { contains: query, mode: 'insensitive' as any }
        });
        
        // Title contains any of the words
        if (queryWords.length > 1) {
          queryWords.forEach(word => {
            searchConditions.push({
              title: { contains: word, mode: 'insensitive' as any }
            });
          });
        }
        
        // Description contains any of the words
        if (queryWords.length > 1) {
          queryWords.forEach(word => {
            searchConditions.push({
              description: { contains: word, mode: 'insensitive' as any }
            });
          });
        }
      } else {
        // Standard search
        searchConditions.push({
          OR: [
            { title: { contains: query, mode: 'insensitive' as any } },
            { description: { contains: query, mode: 'insensitive' as any } }
          ]
        });
      }

      let where: any = {
        OR: searchConditions
      };
      
      // Add filters
      const filters: any = {};
      if (projectId) filters.projectId = projectId;
      if (status) filters.status = status;
      if (assigneeId) filters.assigneeId = assigneeId;
      
      // Handle project name filter
      if (projectName && !projectId) {
        const project = await db.project.findFirst({
          where: { name: { contains: projectName, mode: 'insensitive' as any } },
          select: { id: true, name: true }
        });
        if (project) {
          filters.projectId = project.id;
        }
      }
      
      if (Object.keys(filters).length > 0) {
        where = {
          AND: [
            { OR: searchConditions },
            filters
          ]
        };
      }

      const tasks = await db.task.findMany({
        where,
        include: {
          project: true,
          assignee: true
        },
        orderBy: [
          { updatedAt: 'desc' },
          { createdAt: 'desc' }
        ],
        take: 15
      });

      if (tasks.length === 0) {
        // If no results with fuzzy search, try broader search
        if (fuzzy) {
          const broaderTasks = await db.task.findMany({
            where: projectName ? {
              project: {
                name: { contains: projectName, mode: 'insensitive' as any }
              }
            } : {},
            include: {
              project: true,
              assignee: true
            },
            orderBy: { updatedAt: 'desc' },
            take: 5
          });
          
          if (broaderTasks.length > 0) {
            const taskList = broaderTasks.map(t => 
              `Task: ${t.title} (ID: ${t.id})\n  Project: ${t.project.name}\n  Status: ${t.status}\n  Assignee: ${t.assignee ? `${t.assignee.firstName} ${t.assignee.lastName}` : 'Unassigned'}\n  Priority: ${t.priority}`
            ).join('\n\n');

            return {
              content: [{ 
                type: "text", 
                text: `No exact matches found for "${query}". Did you mean one of these tasks?\n\n${taskList}` 
              }]
            };
          }
        }
        
        return {
          content: [{ 
            type: "text", 
            text: `No tasks found matching "${query}"${projectName ? ` in project "${projectName}"` : ''}` 
          }]
        };
      }

      // Sort results by relevance (exact matches first)
      const sortedTasks = tasks.sort((a, b) => {
        const aExact = a.title.toLowerCase() === query.toLowerCase() ? 2 : 
                      a.title.toLowerCase().includes(query.toLowerCase()) ? 1 : 0;
        const bExact = b.title.toLowerCase() === query.toLowerCase() ? 2 : 
                      b.title.toLowerCase().includes(query.toLowerCase()) ? 1 : 0;
        return bExact - aExact;
      });

      const taskList = sortedTasks.map(t => 
        `Task: ${t.title} (ID: ${t.id})\n  Project: ${t.project.name}\n  Status: ${t.status}\n  Assignee: ${t.assignee ? `${t.assignee.firstName} ${t.assignee.lastName}` : 'Unassigned'}\n  Priority: ${t.priority}`
      ).join('\n\n');

      return {
        content: [{ 
          type: "text", 
          text: `Found ${tasks.length} task(s) matching "${query}":\n\n${taskList}` 
        }]
      };
    } catch (error) {
      return {
        content: [{ 
          type: "text", 
          text: `Error searching tasks: ${error instanceof Error ? error.message : 'Unknown error'}` 
        }]
      };
    }
  }
);

// Find user by name or email (enhanced version)
server.registerTool("findUserByName",
  {
    title: "Find User by Name",
    description: "Find a user by partial name, full name, or email with smart matching",
    inputSchema: {
      nameOrEmail: z.string().describe("User name (partial or full) or email address"),
      showMultiple: z.boolean().optional().describe("Show multiple matches for user verification (default: true)")
    }
  },
  async ({ nameOrEmail, showMultiple = true }) => {
    try {
      const cleanInput = nameOrEmail.trim();
      
      // Try exact email match first
      if (cleanInput.includes('@')) {
        const user = await db.user.findUnique({
          where: { email: cleanInput.toLowerCase() },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        });
        if (user) {
          return {
            content: [{ 
              type: "text", 
              text: `User found: ${user.firstName} ${user.lastName} (${user.email}) - ID: ${user.id}` 
            }]
          };
        }
      }

      // Split the name and try various combinations
      const nameParts = cleanInput.toLowerCase().split(/\s+/);
      const firstName = nameParts[0];
      const lastName = nameParts.slice(1).join(' ');

      // Build search conditions with priority
      const searchConditions: any[] = [];

      // Exact full name match (highest priority)
      if (lastName) {
        searchConditions.push({
          AND: [
            { firstName: { equals: firstName, mode: 'insensitive' as any } },
            { lastName: { equals: lastName, mode: 'insensitive' as any } }
          ]
        });
      }

      // Full name contains match
      if (lastName) {
        searchConditions.push({
          AND: [
            { firstName: { contains: firstName, mode: 'insensitive' as any } },
            { lastName: { contains: lastName, mode: 'insensitive' as any } }
          ]
        });
      }

      // First name exact match
      searchConditions.push({
        firstName: { equals: firstName, mode: 'insensitive' as any }
      });

      // First name or last name contains the input
      searchConditions.push({
        OR: [
          { firstName: { contains: firstName, mode: 'insensitive' as any } },
          { lastName: { contains: firstName, mode: 'insensitive' as any } }
        ]
      });

      if (lastName) {
        searchConditions.push({
          lastName: { contains: lastName, mode: 'insensitive' as any }
        });
      }

      // Find users
      const users = await db.user.findMany({
        where: { OR: searchConditions },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true
        },
        orderBy: [
          { firstName: 'asc' },
          { lastName: 'asc' }
        ],
        take: 8 // Increased limit for better matches
      });

      if (users.length === 0) {
        // Try broader search if no results
        const broaderUsers = await db.user.findMany({
          where: {
            OR: [
              { firstName: { contains: cleanInput.substring(0, 3), mode: 'insensitive' as any } },
              { lastName: { contains: cleanInput.substring(0, 3), mode: 'insensitive' as any } }
            ]
          },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          },
          take: 5
        });

        if (broaderUsers.length > 0) {
          const userList = broaderUsers.map(u => 
            `${u.firstName} ${u.lastName} (${u.email}) - ID: ${u.id}`
          ).join('\n');

          return {
            content: [{ 
              type: "text", 
              text: `No exact matches found for "${nameOrEmail}". Did you mean one of these users?\n\n${userList}` 
            }]
          };
        }

        return {
          content: [{ 
            type: "text", 
            text: `No users found matching "${nameOrEmail}"` 
          }]
        };
      }

      // Sort by relevance (exact matches first)
      const sortedUsers = users.sort((a, b) => {
        const aFullName = `${a.firstName} ${a.lastName}`.toLowerCase();
        const bFullName = `${b.firstName} ${b.lastName}`.toLowerCase();
        const queryLower = cleanInput.toLowerCase();
        
        const aExact = aFullName === queryLower ? 3 : 
                      a.firstName.toLowerCase() === queryLower ? 2 :
                      aFullName.includes(queryLower) ? 1 : 0;
        const bExact = bFullName === queryLower ? 3 : 
                      b.firstName.toLowerCase() === queryLower ? 2 :
                      bFullName.includes(queryLower) ? 1 : 0;
        return bExact - aExact;
      });

      if (sortedUsers.length === 1 || !showMultiple) {
        const user = sortedUsers[0];
        return {
          content: [{ 
            type: "text", 
            text: `User found: ${user.firstName} ${user.lastName} (${user.email}) - ID: ${user.id}` 
          }]
        };
      }

      const userList = sortedUsers.map(u => 
        `${u.firstName} ${u.lastName} (${u.email}) - ID: ${u.id}`
      ).join('\n');

      return {
        content: [{ 
          type: "text", 
          text: `Found ${users.length} users matching "${nameOrEmail}":\n${userList}` 
        }]
      };
    } catch (error) {
      return {
        content: [{ 
          type: "text", 
          text: `Error finding user: ${error instanceof Error ? error.message : 'Unknown error'}` 
        }]
      };
    }
  }
);

// Smart project search
server.registerTool("searchProjects",
  {
    title: "Search Projects",
    description: "Search for projects by name or description with intelligent matching",
    inputSchema: {
      query: z.string().describe("Search query"),
      workspaceId: z.string().optional().describe("Filter by workspace ID"),
      status: z.enum(["active", "archived", "completed"]).optional().describe("Filter by status"),
      fuzzy: z.boolean().optional().describe("Enable fuzzy search (default: true)")
    }
  },
  async ({ query, workspaceId, status, fuzzy = true }) => {
    try {
      const searchConditions: any[] = [];
      
      if (fuzzy) {
        const queryWords = query.toLowerCase().split(/\s+/).filter(word => word.length > 2);
        
        // Exact name match (highest priority)
        searchConditions.push({
          name: { equals: query, mode: 'insensitive' as any }
        });
        
        // Name contains full query
        searchConditions.push({
          name: { contains: query, mode: 'insensitive' as any }
        });
        
        // Description contains full query
        searchConditions.push({
          description: { contains: query, mode: 'insensitive' as any }
        });
        
        // Name contains any words
        if (queryWords.length > 1) {
          queryWords.forEach(word => {
            searchConditions.push({
              name: { contains: word, mode: 'insensitive' as any }
            });
          });
        }
      } else {
        searchConditions.push({
          OR: [
            { name: { contains: query, mode: 'insensitive' as any } },
            { description: { contains: query, mode: 'insensitive' as any } }
          ]
        });
      }

      let where: any = { OR: searchConditions };
      
      const filters: any = {};
      if (workspaceId) filters.workspaceId = workspaceId;
      if (status) filters.status = status;
      
      if (Object.keys(filters).length > 0) {
        where = {
          AND: [
            { OR: searchConditions },
            filters
          ]
        };
      }

      const projects = await db.project.findMany({
        where,
        include: {
          workspace: true,
          _count: {
            select: { tasks: true }
          }
        },
        orderBy: { updatedAt: 'desc' },
        take: 10
      });

      if (projects.length === 0) {
        return {
          content: [{ 
            type: "text", 
            text: `No projects found matching "${query}"` 
          }]
        };
      }

      // Sort by relevance
      const sortedProjects = projects.sort((a, b) => {
        const aExact = a.name.toLowerCase() === query.toLowerCase() ? 2 : 
                      a.name.toLowerCase().includes(query.toLowerCase()) ? 1 : 0;
        const bExact = b.name.toLowerCase() === query.toLowerCase() ? 2 : 
                      b.name.toLowerCase().includes(query.toLowerCase()) ? 1 : 0;
        return bExact - aExact;
      });

      const projectList = sortedProjects.map(p => 
        `Project: ${p.name} (ID: ${p.id})\n  Workspace: ${p.workspace.name}\n  Status: ${p.status}\n  Tasks: ${p._count.tasks}`
      ).join('\n\n');

      return {
        content: [{ 
          type: "text", 
          text: `Found ${projects.length} project(s) matching "${query}":\n\n${projectList}` 
        }]
      };
    } catch (error) {
      return {
        content: [{ 
          type: "text", 
          text: `Error searching projects: ${error instanceof Error ? error.message : 'Unknown error'}` 
        }]
      };
    }
  }
);

// Get task details by ID
server.registerTool("getTaskDetails",
  {
    title: "Get Task Details",
    description: "Get detailed information about a specific task by ID",
    inputSchema: {
      taskId: z.string().describe("Task ID")
    }
  },
  async ({ taskId }) => {
    try {
      const task = await db.task.findUnique({
        where: { id: taskId },
        include: {
          project: true,
          assignee: true,
          creator: true
        }
      });

      if (!task) {
        return {
          content: [{ 
            type: "text", 
            text: `Task not found with ID: ${taskId}` 
          }]
        };
      }

      const details = `Task Details:
Title: ${task.title}
Description: ${task.description || 'No description'}
Project: ${task.project.name}
Status: ${task.status}
Priority: ${task.priority}
Assignee: ${task.assignee ? `${task.assignee.firstName} ${task.assignee.lastName} (${task.assignee.email})` : 'Unassigned'}
Creator: ${task.creator ? `${task.creator.firstName} ${task.creator.lastName}` : 'Unknown'}
Created: ${task.createdAt.toLocaleDateString()}
Updated: ${task.updatedAt.toLocaleDateString()}
Due Date: ${task.dueDate ? task.dueDate.toLocaleDateString() : 'Not set'}`;

      return {
        content: [{ 
          type: "text", 
          text: details 
        }]
      };
    } catch (error) {
      return {
        content: [{ 
          type: "text", 
          text: `Error getting task details: ${error instanceof Error ? error.message : 'Unknown error'}` 
        }]
      };
    }
  }
);

// Get task comments
server.registerTool("getTaskComments",
  {
    title: "Get Task Comments",
    description: "Get all comments for a task",
    inputSchema: {
      taskId: z.string().describe("Task ID")
    }
  },
  async ({ taskId }) => {
    try {
      const comments = await db.comment.findMany({
        where: { taskId },
        include: { author: true },
        orderBy: { createdAt: 'desc' }
      });

      if (comments.length === 0) {
        return {
          content: [{ 
            type: "text", 
            text: "No comments found for this task" 
          }]
        };
      }

      const commentList = comments.map(c => 
        `- ${c.author.firstName} ${c.author.lastName} (${c.createdAt.toLocaleDateString()}): ${c.content}`
      ).join('\n');

      return {
        content: [{ 
          type: "text", 
          text: `Task Comments:\n${commentList}` 
        }]
      };
    } catch (error) {
      return {
        content: [{ 
          type: "text", 
          text: `Error getting comments: ${error instanceof Error ? error.message : 'Unknown error'}` 
        }]
      };
    }
  }
);

// Get tasks by due date
server.registerTool("getTasksByDueDate",
  {
    title: "Get Tasks by Due Date",
    description: "Get tasks due within a specific time frame",
    inputSchema: {
      days: z.number().describe("Number of days from today (positive for future, negative for past)"),
      projectId: z.string().optional().describe("Filter by project ID")
    }
  },
  async ({ days, projectId }) => {
    try {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + days);
      
      const where: any = {
        dueDate: days >= 0 ? { lte: targetDate } : { gte: targetDate }
      };
      if (projectId) where.projectId = projectId;

      const tasks = await db.task.findMany({
        where,
        include: {
          project: true,
          assignee: true
        },
        orderBy: { dueDate: 'asc' }
      });

      if (tasks.length === 0) {
        return {
          content: [{ 
            type: "text", 
            text: `No tasks found due ${days >= 0 ? 'within' : 'in the past'} ${Math.abs(days)} days` 
          }]
        };
      }

      const taskList = tasks.map(t => 
        `- ${t.title} (${t.status}) - Due: ${t.dueDate?.toLocaleDateString()} - ${t.project.name}${t.assignee ? ` - ${t.assignee.firstName} ${t.assignee.lastName}` : ''}`
      ).join('\n');

      return {
        content: [{ 
          type: "text", 
          text: `Tasks due ${days >= 0 ? 'within' : 'in the past'} ${Math.abs(days)} days:\n${taskList}` 
        }]
      };
    } catch (error) {
      return {
        content: [{ 
          type: "text", 
          text: `Error getting tasks by due date: ${error instanceof Error ? error.message : 'Unknown error'}` 
        }]
      };
    }
  }
);

// === WORKSPACE MANAGEMENT TOOLS ===

// Create workspace
server.registerTool("createWorkspace",
  {
    title: "Create Workspace",
    description: "Create a new workspace",
    inputSchema: {
      name: z.string().describe("Workspace name"),
      description: z.string().optional().describe("Workspace description"),
      createdBy: z.string().describe("Creator user ID")
    }
  },
  async ({ name, description, createdBy }) => {
    try {
      const workspace = await db.workspace.create({
        data: {
          name,
          description: description || "",
          createdBy
        }
      });
      return {
        content: [{ 
          type: "text", 
          text: `Workspace "${name}" created successfully` 
        }]
      };
    } catch (error) {
      return {
        content: [{ 
          type: "text", 
          text: `Error creating workspace: ${error instanceof Error ? error.message : 'Unknown error'}` 
        }]
      };
    }
  }
);

// List workspaces
server.registerTool("listWorkspaces",
  {
    title: "List Workspaces",
    description: "List all workspaces",
    inputSchema: {}
  },
  async () => {
    try {
      const workspaces = await db.workspace.findMany({
        include: {
          _count: {
            select: { projects: true, members: true }
          }
        }
      });

      const workspaceList = workspaces.map(w => 
        `- ${w.name} (${w._count.projects} projects, ${w._count.members} members)`
      ).join('\n');

      return {
        content: [{ 
          type: "text", 
          text: `Workspaces:\n${workspaceList || 'No workspaces found'}` 
        }]
      };
    } catch (error) {
      return {
        content: [{ 
          type: "text", 
          text: `Error listing workspaces: ${error instanceof Error ? error.message : 'Unknown error'}` 
        }]
      };
    }
  }
);

// Get workspace activity
server.registerTool("getWorkspaceActivity",
  {
    title: "Get Workspace Activity",
    description: "Get recent activity in a workspace",
    inputSchema: {
      workspaceId: z.string().describe("Workspace ID"),
      days: z.number().optional().describe("Number of days to look back (default 7)")
    }
  },
  async ({ workspaceId, days = 7 }) => {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      const activities = await db.task.findMany({
        where: {
          project: { workspaceId },
          updatedAt: { gte: cutoffDate }
        },
        include: {
          project: true,
          assignee: true
        },
        orderBy: { updatedAt: 'desc' },
        take: 20
      });

      if (activities.length === 0) {
        return {
          content: [{ 
            type: "text", 
            text: `No recent activity in workspace (last ${days} days)` 
          }]
        };
      }

      const activityList = activities.map(t => 
        `- ${t.title} (${t.status}) - ${t.project.name} - Updated ${t.updatedAt.toLocaleDateString()}`
      ).join('\n');

      return {
        content: [{ 
          type: "text", 
          text: `Recent Activity (last ${days} days):\n${activityList}` 
        }]
      };
    } catch (error) {
      return {
        content: [{ 
          type: "text", 
          text: `Error getting workspace activity: ${error instanceof Error ? error.message : 'Unknown error'}` 
        }]
      };
    }
  }
);

// Get workspace statistics
server.registerTool("getWorkspaceStatistics",
  {
    title: "Get Workspace Statistics",
    description: "Get detailed statistics for a workspace",
    inputSchema: {
      workspaceId: z.string().describe("Workspace ID")
    }
  },
  async ({ workspaceId }) => {
    try {
      const workspace = await db.workspace.findUnique({
        where: { id: workspaceId },
        include: {
          projects: {
            include: {
              tasks: true,
              _count: { select: { tasks: true } }
            }
          },
          members: {
            include: { user: true }
          }
        }
      });

      if (!workspace) {
        return {
          content: [{ 
            type: "text", 
            text: "Workspace not found" 
          }]
        };
      }

      const totalProjects = workspace.projects.length;
      const activeProjects = workspace.projects.filter(p => p.status === 'active').length;
      const totalTasks = workspace.projects.reduce((sum, p) => sum + p.tasks.length, 0);
      const completedTasks = workspace.projects.reduce((sum, p) => sum + p.tasks.filter(t => t.status === 'done').length, 0);
      const totalMembers = workspace.members.length;
      
      const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

      const stats = `Workspace Statistics: ${workspace.name}\n\n` +
                   `📊 Overview:\n` +
                   `  Projects: ${totalProjects} (${activeProjects} active)\n` +
                   `  Tasks: ${totalTasks} (${completionRate}% complete)\n` +
                   `  Members: ${totalMembers}\n\n` +
                   `📈 Project Breakdown:\n` +
                   workspace.projects.map(p => 
                     `  ${p.name}: ${p.tasks.length} tasks (${Math.round((p.tasks.filter(t => t.status === 'done').length / Math.max(p.tasks.length, 1)) * 100)}% complete)`
                   ).join('\n');

      return {
        content: [{ 
          type: "text", 
          text: stats 
        }]
      };
    } catch (error) {
      return {
        content: [{ 
          type: "text", 
          text: `Error getting workspace statistics: ${error instanceof Error ? error.message : 'Unknown error'}` 
        }]
      };
    }
  }
);

// Get cross-workspace analysis
server.registerTool("getCrossWorkspaceAnalysis",
  {
    title: "Get Cross-Workspace Analysis",
    description: "Get analysis across multiple workspaces",
    inputSchema: {}
  },
  async () => {
    try {
      const workspaces = await db.workspace.findMany({
        include: {
          projects: {
            include: {
              tasks: true
            }
          },
          members: true
        }
      });

      if (workspaces.length === 0) {
        return {
          content: [{ 
            type: "text", 
            text: "No workspaces found" 
          }]
        };
      }

      const analysis = workspaces.map(ws => {
        const totalTasks = ws.projects.reduce((sum, p) => sum + p.tasks.length, 0);
        const completedTasks = ws.projects.reduce((sum, p) => sum + p.tasks.filter(t => t.status === 'done').length, 0);
        const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
        
        return `${ws.name}: ${ws.projects.length} projects, ${totalTasks} tasks (${completionRate}% complete), ${ws.members.length} members`;
      });

      return {
        content: [{ 
          type: "text", 
          text: `Cross-Workspace Analysis:\n${analysis.join('\n')}` 
        }]
      };
    } catch (error) {
      return {
        content: [{ 
          type: "text", 
          text: `Error getting cross-workspace analysis: ${error instanceof Error ? error.message : 'Unknown error'}` 
        }]
      };
    }
  }
);

// === PROJECT ANALYTICS TOOLS ===

// Get project timeline analysis
server.registerTool("getProjectTimeline",
  {
    title: "Get Project Timeline",
    description: "Get timeline analysis for a project including milestones and deadlines",
    inputSchema: {
      projectId: z.string().describe("Project ID")
    }
  },
  async ({ projectId }) => {
    try {
      const project = await db.project.findUnique({
        where: { id: projectId },
        include: {
          tasks: {
            include: { assignee: true },
            orderBy: { dueDate: 'asc' }
          },
          sprints: {
            orderBy: { startDate: 'asc' }
          }
        }
      });

      if (!project) {
        return {
          content: [{ 
            type: "text", 
            text: "Project not found" 
          }]
        };
      }

      const upcomingTasks = project.tasks.filter(t => t.dueDate && t.dueDate > new Date()).slice(0, 10);
      const overdueTasks = project.tasks.filter(t => t.dueDate && t.dueDate < new Date() && t.status !== 'done');
      const activeSprints = project.sprints.filter(s => s.status === 'active');

      let timeline = `Project Timeline: ${project.name}\n\n`;
      
      if (overdueTasks.length > 0) {
        timeline += `⚠️ Overdue Tasks (${overdueTasks.length}):\n`;
        timeline += overdueTasks.map(t => 
          `- ${t.title} (Due: ${t.dueDate?.toLocaleDateString()})${t.assignee ? ` - ${t.assignee.firstName}` : ''}`
        ).join('\n') + '\n\n';
      }

      if (activeSprints.length > 0) {
        timeline += `🏃 Active Sprints:\n`;
        timeline += activeSprints.map(s => 
          `- ${s.name} (${s.startDate.toLocaleDateString()} - ${s.endDate.toLocaleDateString()})`
        ).join('\n') + '\n\n';
      }

      if (upcomingTasks.length > 0) {
        timeline += `📅 Upcoming Tasks:\n`;
        timeline += upcomingTasks.map(t => 
          `- ${t.title} (Due: ${t.dueDate?.toLocaleDateString()})${t.assignee ? ` - ${t.assignee.firstName}` : ''}`
        ).join('\n');
      }

      return {
        content: [{ 
          type: "text", 
          text: timeline || 'No timeline data available for this project' 
        }]
      };
    } catch (error) {
      return {
        content: [{ 
          type: "text", 
          text: `Error getting project timeline: ${error instanceof Error ? error.message : 'Unknown error'}` 
        }]
      };
    }
  }
);

// Get project resource allocation
server.registerTool("getProjectResourceAllocation",
  {
    title: "Get Project Resource Allocation",
    description: "Get resource allocation analysis for a project",
    inputSchema: {
      projectId: z.string().describe("Project ID")
    }
  },
  async ({ projectId }) => {
    try {
      const project = await db.project.findUnique({
        where: { id: projectId },
        include: {
          tasks: {
            include: { assignee: true }
          }
        }
      });

      if (!project) {
        return {
          content: [{ 
            type: "text", 
            text: "Project not found" 
          }]
        };
      }

      const allocation = project.tasks.reduce((acc: any, task) => {
        if (!task.assignee) return acc;
        
        const key = `${task.assignee.firstName} ${task.assignee.lastName}`;
        if (!acc[key]) {
          acc[key] = { total: 0, todo: 0, inProgress: 0, done: 0, high: 0, medium: 0, low: 0 };
        }
        
        acc[key].total++;
        acc[key][task.status as keyof typeof acc[typeof key]]++;
        acc[key][task.priority as keyof typeof acc[typeof key]]++;
        
        return acc;
      }, {});

      const unassignedTasks = project.tasks.filter(t => !t.assignee).length;

      let report = `Resource Allocation: ${project.name}\n\n`;
      
      if (unassignedTasks > 0) {
        report += `🔄 Unassigned Tasks: ${unassignedTasks}\n\n`;
      }

      const allocationReport = Object.entries(allocation).map(([name, stats]: [string, any]) => {
        return `👤 ${name}: ${stats.total} tasks (${stats.done} done, ${stats.inProgress} in progress, ${stats.todo} todo)\n   Priority: ${stats.high} high, ${stats.medium} medium, ${stats.low} low`;
      }).join('\n');

      report += allocationReport;

      return {
        content: [{ 
          type: "text", 
          text: report || 'No resource allocation data available' 
        }]
      };
    } catch (error) {
      return {
        content: [{ 
          type: "text", 
          text: `Error getting resource allocation: ${error instanceof Error ? error.message : 'Unknown error'}` 
        }]
      };
    }
  }
);

// Get project progress tracking
server.registerTool("getProjectProgress",
  {
    title: "Get Project Progress",
    description: "Get detailed progress tracking for a project",
    inputSchema: {
      projectId: z.string().describe("Project ID")
    }
  },
  async ({ projectId }) => {
    try {
      const project = await db.project.findUnique({
        where: { id: projectId },
        include: {
          tasks: true,
          sprints: {
            include: {
              tasks: true
            }
          },
          _count: {
            select: { tasks: true }
          }
        }
      });

      if (!project) {
        return {
          content: [{ 
            type: "text", 
            text: "Project not found" 
          }]
        };
      }

      const totalTasks = project.tasks.length;
      const completedTasks = project.tasks.filter(t => t.status === 'done').length;
      const inProgressTasks = project.tasks.filter(t => t.status === 'in_progress').length;
      const todoTasks = project.tasks.filter(t => t.status === 'todo').length;
      
      const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
      
      const highPriorityTasks = project.tasks.filter(t => t.priority === 'high');
      const highPriorityCompleted = highPriorityTasks.filter(t => t.status === 'done').length;
      const highPriorityRate = highPriorityTasks.length > 0 ? Math.round((highPriorityCompleted / highPriorityTasks.length) * 100) : 0;

      const activeSprints = project.sprints.filter(s => s.status === 'active').length;
      const completedSprints = project.sprints.filter(s => s.status === 'completed').length;

      let progress = `Project Progress: ${project.name}\n\n`;
      progress += `📊 Overall Progress: ${completionRate}% (${completedTasks}/${totalTasks} tasks)\n`;
      progress += `📈 Task Breakdown:\n`;
      progress += `  ✅ Completed: ${completedTasks}\n`;
      progress += `  🔄 In Progress: ${inProgressTasks}\n`;
      progress += `  📋 Todo: ${todoTasks}\n\n`;
      progress += `🔥 High Priority: ${highPriorityRate}% complete (${highPriorityCompleted}/${highPriorityTasks.length})\n`;
      progress += `🏃 Sprints: ${activeSprints} active, ${completedSprints} completed\n`;
      progress += `📅 Status: ${project.status}`;

      return {
        content: [{ 
          type: "text", 
          text: progress 
        }]
      };
    } catch (error) {
      return {
        content: [{ 
          type: "text", 
          text: `Error getting project progress: ${error instanceof Error ? error.message : 'Unknown error'}` 
        }]
      };
    }
  }
);

// Get project health status
server.registerTool("getProjectHealth",
  {
    title: "Get Project Health",
    description: "Get health assessment for all projects or a specific project",
    inputSchema: {
      projectId: z.string().optional().describe("Project ID (optional)")
    }
  },
  async ({ projectId }) => {
    try {
      const where = projectId ? { id: projectId } : {};
      
      const projects = await db.project.findMany({
        where,
        include: {
          tasks: true,
          _count: {
            select: { tasks: true }
          }
        }
      });

      if (projects.length === 0) {
        return {
          content: [{ 
            type: "text", 
            text: "No projects found" 
          }]
        };
      }

      const healthReport = projects.map(project => {
        const totalTasks = project.tasks.length;
        const completedTasks = project.tasks.filter(t => t.status === 'done').length;
        const overdueTasks = project.tasks.filter(t => t.dueDate && t.dueDate < new Date() && t.status !== 'done').length;
        
        const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
        
        let health = '🟢 Healthy';
        if (overdueTasks > 0 || completionRate < 30) health = '🔴 At Risk';
        else if (completionRate < 60) health = '🟡 Needs Attention';
        
        return `${health} ${project.name}: ${completionRate}% complete${overdueTasks > 0 ? `, ${overdueTasks} overdue` : ''}`;
      });

      return {
        content: [{ 
          type: "text", 
          text: `Project Health Status:\n${healthReport.join('\n')}` 
        }]
      };
    } catch (error) {
      return {
        content: [{ 
          type: "text", 
          text: `Error getting project health: ${error instanceof Error ? error.message : 'Unknown error'}` 
        }]
      };
    }
  }
);

// === SPRINT ANALYTICS TOOLS ===

// Get sprint burndown data
server.registerTool("getSprintBurndown",
  {
    title: "Get Sprint Burndown",
    description: "Get burndown chart data for a sprint",
    inputSchema: {
      sprintId: z.string().describe("Sprint ID")
    }
  },
  async ({ sprintId }) => {
    try {
      const sprint = await db.sprint.findUnique({
        where: { id: sprintId },
        include: {
          tasks: {
            orderBy: { updatedAt: 'asc' }
          },
          project: true
        }
      });

      if (!sprint) {
        return {
          content: [{ 
            type: "text", 
            text: "Sprint not found" 
          }]
        };
      }

      const totalTasks = sprint.tasks.length;
      const completedTasks = sprint.tasks.filter(t => t.status === 'done').length;
      const inProgressTasks = sprint.tasks.filter(t => t.status === 'in_progress').length;
      const todoTasks = sprint.tasks.filter(t => t.status === 'todo').length;

      const sprintDuration = Math.ceil((sprint.endDate.getTime() - sprint.startDate.getTime()) / (1000 * 60 * 60 * 24));
      const daysElapsed = Math.ceil((Date.now() - sprint.startDate.getTime()) / (1000 * 60 * 60 * 24));
      const daysRemaining = Math.max(0, sprintDuration - daysElapsed);

      const idealCompletionRate = Math.min(100, Math.round((daysElapsed / sprintDuration) * 100));
      const actualCompletionRate = Math.round((completedTasks / Math.max(totalTasks, 1)) * 100);

      let burndown = `Sprint Burndown: ${sprint.name}\n\n`;
      burndown += `📅 Duration: ${sprintDuration} days (${daysElapsed} elapsed, ${daysRemaining} remaining)\n`;
      burndown += `📊 Progress: ${actualCompletionRate}% actual vs ${idealCompletionRate}% ideal\n`;
      burndown += `📈 Tasks: ${completedTasks}/${totalTasks} completed\n`;
      burndown += `📋 Breakdown:\n`;
      burndown += `  ✅ Done: ${completedTasks}\n`;
      burndown += `  🔄 In Progress: ${inProgressTasks}\n`;
      burndown += `  📋 Todo: ${todoTasks}\n`;

      if (actualCompletionRate < idealCompletionRate) {
        burndown += `\n⚠️ Sprint is behind schedule by ${idealCompletionRate - actualCompletionRate}%`;
      } else if (actualCompletionRate > idealCompletionRate) {
        burndown += `\n🎉 Sprint is ahead of schedule by ${actualCompletionRate - idealCompletionRate}%`;
      } else {
        burndown += `\n✅ Sprint is on track`;
      }

      return {
        content: [{ 
          type: "text", 
          text: burndown 
        }]
      };
    } catch (error) {
      return {
        content: [{ 
          type: "text", 
          text: `Error getting sprint burndown: ${error instanceof Error ? error.message : 'Unknown error'}` 
        }]
      };
    }
  }
);

// Get sprint velocity
server.registerTool("getSprintVelocity",
  {
    title: "Get Sprint Velocity",
    description: "Get velocity metrics for sprints in a project",
    inputSchema: {
      projectId: z.string().describe("Project ID"),
      sprintCount: z.number().optional().describe("Number of recent sprints to analyze (default 5)")
    }
  },
  async ({ projectId, sprintCount = 5 }) => {
    try {
      const sprints = await db.sprint.findMany({
        where: { projectId },
        include: {
          tasks: true
        },
        orderBy: { endDate: 'desc' },
        take: sprintCount
      });

      if (sprints.length === 0) {
        return {
          content: [{ 
            type: "text", 
            text: "No sprints found for this project" 
          }]
        };
      }

      const velocityData = sprints.map(sprint => {
        const totalTasks = sprint.tasks.length;
        const completedTasks = sprint.tasks.filter(t => t.status === 'done').length;
        const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
        
        return {
          name: sprint.name,
          totalTasks,
          completedTasks,
          completionRate,
          velocity: completedTasks // Using completed tasks as velocity metric
        };
      });

      const averageVelocity = Math.round(velocityData.reduce((sum, s) => sum + s.velocity, 0) / velocityData.length);
      const averageCompletion = Math.round(velocityData.reduce((sum, s) => sum + s.completionRate, 0) / velocityData.length);

      let velocity = `Sprint Velocity Analysis\n\n`;
      velocity += `📊 Average Velocity: ${averageVelocity} tasks/sprint\n`;
      velocity += `📈 Average Completion: ${averageCompletion}%\n\n`;
      velocity += `📋 Recent Sprints:\n`;
      velocity += velocityData.map(s => 
        `  ${s.name}: ${s.velocity} tasks completed (${s.completionRate}%)`
      ).join('\n');

      return {
        content: [{ 
          type: "text", 
          text: velocity 
        }]
      };
    } catch (error) {
      return {
        content: [{ 
          type: "text", 
          text: `Error getting sprint velocity: ${error instanceof Error ? error.message : 'Unknown error'}` 
        }]
      };
    }
  }
);

// Get sprint retrospective data
server.registerTool("getSprintRetrospective",
  {
    title: "Get Sprint Retrospective",
    description: "Get retrospective analysis for a completed sprint",
    inputSchema: {
      sprintId: z.string().describe("Sprint ID")
    }
  },
  async ({ sprintId }) => {
    try {
      const sprint = await db.sprint.findUnique({
        where: { id: sprintId },
        include: {
          tasks: {
            include: { assignee: true }
          },
          project: true
        }
      });

      if (!sprint) {
        return {
          content: [{ 
            type: "text", 
            text: "Sprint not found" 
          }]
        };
      }

      const totalTasks = sprint.tasks.length;
      const completedTasks = sprint.tasks.filter(t => t.status === 'done').length;
      const inProgressTasks = sprint.tasks.filter(t => t.status === 'in_progress').length;
      const incompleteTasks = sprint.tasks.filter(t => t.status === 'todo').length;

      const teamPerformance = sprint.tasks.reduce((acc: any, task) => {
        if (!task.assignee) return acc;
        
        const key = `${task.assignee.firstName} ${task.assignee.lastName}`;
        if (!acc[key]) {
          acc[key] = { total: 0, completed: 0 };
        }
        
        acc[key].total++;
        if (task.status === 'done') acc[key].completed++;
        
        return acc;
      }, {});

      let retrospective = `Sprint Retrospective: ${sprint.name}\n`;
      retrospective += `Project: ${sprint.project.name}\n`;
      retrospective += `Duration: ${sprint.startDate.toLocaleDateString()} - ${sprint.endDate.toLocaleDateString()}\n\n`;
      
      retrospective += `📊 Sprint Summary:\n`;
      retrospective += `  Total Tasks: ${totalTasks}\n`;
      retrospective += `  ✅ Completed: ${completedTasks} (${Math.round((completedTasks/Math.max(totalTasks,1))*100)}%)\n`;
      retrospective += `  🔄 In Progress: ${inProgressTasks}\n`;
      retrospective += `  📋 Incomplete: ${incompleteTasks}\n\n`;

      if (Object.keys(teamPerformance).length > 0) {
        retrospective += `👥 Team Performance:\n`;
        retrospective += Object.entries(teamPerformance).map(([name, stats]: [string, any]) => 
          `  ${name}: ${stats.completed}/${stats.total} tasks (${Math.round((stats.completed/Math.max(stats.total,1))*100)}%)`
        ).join('\n') + '\n\n';
      }

      if (completedTasks / Math.max(totalTasks, 1) >= 0.8) {
        retrospective += `🎉 Sprint Goal: ACHIEVED - Great work team!`;
      } else if (completedTasks / Math.max(totalTasks, 1) >= 0.6) {
        retrospective += `📈 Sprint Goal: PARTIALLY ACHIEVED - Good progress made`;
      } else {
        retrospective += `⚠️ Sprint Goal: NOT ACHIEVED - Consider reviewing sprint planning`;
      }

      return {
        content: [{ 
          type: "text", 
          text: retrospective 
        }]
      };
    } catch (error) {
      return {
        content: [{ 
          type: "text", 
          text: `Error getting sprint retrospective: ${error instanceof Error ? error.message : 'Unknown error'}` 
        }]
      };
    }
  }
);

// === BUG ANALYTICS TOOLS ===

// Get bug trends
server.registerTool("getBugTrends",
  {
    title: "Get Bug Trends",
    description: "Get bug reporting and resolution trends over time",
    inputSchema: {
      projectId: z.string().optional().describe("Project ID (optional)"),
      days: z.number().optional().describe("Number of days to analyze (default 30)")
    }
  },
  async ({ projectId, days = 30 }) => {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      const where: any = {
        createdAt: { gte: cutoffDate }
      };
      if (projectId) where.projectId = projectId;

      const bugs = await db.bug.findMany({
        where,
        include: {
          project: true,
          assignee: true,
          reporter: true
        },
        orderBy: { createdAt: 'desc' }
      });

      const totalBugs = bugs.length;
      const openBugs = bugs.filter(b => ['OPEN', 'IN_PROGRESS', 'REOPENED'].includes(b.status)).length;
      const closedBugs = bugs.filter(b => ['FIXED', 'VERIFIED', 'CLOSED'].includes(b.status)).length;

      const severityBreakdown = bugs.reduce((acc, bug) => {
        acc[bug.severity] = (acc[bug.severity] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const priorityBreakdown = bugs.reduce((acc, bug) => {
        acc[bug.priority] = (acc[bug.priority] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      let trends = `Bug Trends (Last ${days} days)\n\n`;
      trends += `📊 Overview:\n`;
      trends += `  Total Bugs: ${totalBugs}\n`;
      trends += `  🔴 Open: ${openBugs}\n`;
      trends += `  ✅ Closed: ${closedBugs}\n`;
      trends += `  📈 Resolution Rate: ${totalBugs > 0 ? Math.round((closedBugs / totalBugs) * 100) : 0}%\n\n`;

      trends += `🔥 Severity Breakdown:\n`;
      Object.entries(severityBreakdown).forEach(([severity, count]) => {
        trends += `  ${severity}: ${count}\n`;
      });

      trends += `\n⚡ Priority Breakdown:\n`;
      Object.entries(priorityBreakdown).forEach(([priority, count]) => {
        trends += `  ${priority}: ${count}\n`;
      });

      return {
        content: [{ 
          type: "text", 
          text: trends 
        }]
      };
    } catch (error) {
      return {
        content: [{ 
          type: "text", 
          text: `Error getting bug trends: ${error instanceof Error ? error.message : 'Unknown error'}` 
        }]
      };
    }
  }
);

// Get bug resolution time
server.registerTool("getBugResolutionTime",
  {
    title: "Get Bug Resolution Time",
    description: "Get average resolution time for bugs",
    inputSchema: {
      projectId: z.string().optional().describe("Project ID (optional)"),
      status: z.enum(["FIXED", "VERIFIED", "CLOSED"]).optional().describe("Resolution status filter")
    }
  },
  async ({ projectId, status }) => {
    try {
      const where: any = {
        status: status || { in: ["FIXED", "VERIFIED", "CLOSED"] }
      };
      if (projectId) where.projectId = projectId;

      const resolvedBugs = await db.bug.findMany({
        where,
        include: {
          project: true,
          assignee: true
        },
        orderBy: { updatedAt: 'desc' }
      });

      if (resolvedBugs.length === 0) {
        return {
          content: [{ 
            type: "text", 
            text: "No resolved bugs found" 
          }]
        };
      }

      const resolutionTimes = resolvedBugs.map(bug => {
        const resolutionTimeMs = bug.updatedAt.getTime() - bug.createdAt.getTime();
        const resolutionDays = Math.round(resolutionTimeMs / (1000 * 60 * 60 * 24));
        return {
          title: bug.title,
          days: resolutionDays,
          severity: bug.severity,
          priority: bug.priority
        };
      });

      const averageResolutionTime = Math.round(
        resolutionTimes.reduce((sum, bug) => sum + bug.days, 0) / resolutionTimes.length
      );

      const severityAverages = resolutionTimes.reduce((acc, bug) => {
        if (!acc[bug.severity]) acc[bug.severity] = { total: 0, count: 0 };
        acc[bug.severity].total += bug.days;
        acc[bug.severity].count++;
        return acc;
      }, {} as Record<string, { total: number; count: number }>);

      let resolution = `Bug Resolution Time Analysis\n\n`;
      resolution += `📊 Overall Average: ${averageResolutionTime} days\n`;
      resolution += `📈 Total Resolved: ${resolvedBugs.length} bugs\n\n`;

      resolution += `🔥 Average by Severity:\n`;
      Object.entries(severityAverages).forEach(([severity, data]) => {
        const avg = Math.round(data.total / data.count);
        resolution += `  ${severity}: ${avg} days (${data.count} bugs)\n`;
      });

      const slowestBugs = resolutionTimes
        .sort((a, b) => b.days - a.days)
        .slice(0, 5);

      if (slowestBugs.length > 0) {
        resolution += `\n⏰ Slowest Resolutions:\n`;
        resolution += slowestBugs.map(bug => 
          `  ${bug.title}: ${bug.days} days (${bug.severity})`
        ).join('\n');
      }

      return {
        content: [{ 
          type: "text", 
          text: resolution 
        }]
      };
    } catch (error) {
      return {
        content: [{ 
          type: "text", 
          text: `Error getting bug resolution time: ${error instanceof Error ? error.message : 'Unknown error'}` 
        }]
      };
    }
  }
);

// Get bug quality metrics
server.registerTool("getBugQualityMetrics",
  {
    title: "Get Bug Quality Metrics",
    description: "Get quality metrics including bug-to-feature ratio and defect density",
    inputSchema: {
      projectId: z.string().describe("Project ID")
    }
  },
  async ({ projectId }) => {
    try {
      const project = await db.project.findUnique({
        where: { id: projectId },
        include: {
          bugs: true,
          tasks: {
            where: { type: 'feature' }
          }
        }
      });

      if (!project) {
        return {
          content: [{ 
            type: "text", 
            text: "Project not found" 
          }]
        };
      }

      const totalBugs = project.bugs.length;
      const totalFeatures = project.tasks.filter(t => t.type === 'feature').length;
      const openBugs = project.bugs.filter(b => ['OPEN', 'IN_PROGRESS', 'REOPENED'].includes(b.status)).length;
      const criticalBugs = project.bugs.filter(b => b.severity === 'CRITICAL').length;
      const highPriorityBugs = project.bugs.filter(b => b.priority === 'HIGH' || b.priority === 'CRITICAL').length;

      const bugToFeatureRatio = totalFeatures > 0 ? (totalBugs / totalFeatures).toFixed(2) : 'N/A';
      const criticalBugRate = totalBugs > 0 ? Math.round((criticalBugs / totalBugs) * 100) : 0;
      const highPriorityRate = totalBugs > 0 ? Math.round((highPriorityBugs / totalBugs) * 100) : 0;

      // Calculate recent bug trend (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const recentBugs = project.bugs.filter(b => b.createdAt >= thirtyDaysAgo).length;

      let quality = `Bug Quality Metrics: ${project.name}\n\n`;
      quality += `📊 Overall Metrics:\n`;
      quality += `  Total Bugs: ${totalBugs}\n`;
      quality += `  🔴 Open Bugs: ${openBugs}\n`;
      quality += `  🔥 Critical Bugs: ${criticalBugs} (${criticalBugRate}%)\n`;
      quality += `  ⚡ High Priority: ${highPriorityBugs} (${highPriorityRate}%)\n\n`;

      quality += `📈 Quality Ratios:\n`;
      quality += `  Bug-to-Feature Ratio: ${bugToFeatureRatio}\n`;
      quality += `  Recent Bug Rate: ${recentBugs} bugs in last 30 days\n\n`;

      // Quality assessment
      let assessment = '🟢 Good';
      if (openBugs > 10 || criticalBugRate > 10 || parseFloat(bugToFeatureRatio || '0') > 0.5) {
        assessment = '🔴 Needs Attention';
      } else if (openBugs > 5 || criticalBugRate > 5 || parseFloat(bugToFeatureRatio || '0') > 0.3) {
        assessment = '🟡 Monitor Closely';
      }

      quality += `🎯 Quality Assessment: ${assessment}`;

      return {
        content: [{ 
          type: "text", 
          text: quality 
        }]
      };
    } catch (error) {
      return {
        content: [{ 
          type: "text", 
          text: `Error getting bug quality metrics: ${error instanceof Error ? error.message : 'Unknown error'}` 
        }]
      };
    }
  }
);

// === REPORTING & ANALYTICS TOOLS ===

// Generate weekly summary report
server.registerTool("getWeeklySummary",
  {
    title: "Get Weekly Summary",
    description: "Generate a comprehensive weekly summary report",
    inputSchema: {
      projectId: z.string().optional().describe("Project ID (optional)")
    }
  },
  async ({ projectId }) => {
    try {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      const where = projectId ? { projectId } : {};
      const projectWhere = projectId ? { id: projectId } : {};

      const [tasks, bugs, projects] = await Promise.all([
        db.task.findMany({
          where: {
            ...where,
            updatedAt: { gte: oneWeekAgo }
          },
          include: { project: true, assignee: true }
        }),
        db.bug.findMany({
          where: {
            ...where,
            updatedAt: { gte: oneWeekAgo }
          },
          include: { project: true }
        }),
        db.project.findMany({
          where: projectWhere,
          include: {
            _count: {
              select: { tasks: true }
            }
          }
        })
      ]);

      const completedTasks = tasks.filter(t => t.status === 'done' && t.updatedAt >= oneWeekAgo);
      const newTasks = tasks.filter(t => t.createdAt >= oneWeekAgo);
      const resolvedBugs = bugs.filter(b => ['FIXED', 'VERIFIED', 'CLOSED'].includes(b.status));
      const newBugs = bugs.filter(b => b.createdAt >= oneWeekAgo);

      let summary = `📊 Weekly Summary Report\n`;
      summary += `Period: ${oneWeekAgo.toLocaleDateString()} - ${new Date().toLocaleDateString()}\n\n`;

      summary += `✅ Task Completion:\n`;
      summary += `  Completed: ${completedTasks.length} tasks\n`;
      summary += `  New Tasks: ${newTasks.length}\n`;
      summary += `  Active Projects: ${projects.length}\n\n`;

      summary += `🐛 Bug Management:\n`;
      summary += `  Resolved: ${resolvedBugs.length} bugs\n`;
      summary += `  New Bugs: ${newBugs.length}\n`;
      summary += `  Net Bug Change: ${newBugs.length - resolvedBugs.length}\n\n`;

      if (completedTasks.length > 0) {
        const topPerformers = completedTasks.reduce((acc: any, task) => {
          if (!task.assignee) return acc;
          const name = `${task.assignee.firstName} ${task.assignee.lastName}`;
          acc[name] = (acc[name] || 0) + 1;
          return acc;
        }, {});

        const sortedPerformers = Object.entries(topPerformers)
          .sort(([,a], [,b]) => (b as number) - (a as number))
          .slice(0, 5);

        summary += `🏆 Top Performers:\n`;
        summary += sortedPerformers.map(([name, count]) => 
          `  ${name}: ${count} tasks completed`
        ).join('\n') + '\n\n';
      }

      summary += `📈 Overall Health:\n`;
      const bugToTaskRatio = newTasks.length > 0 ? (newBugs.length / newTasks.length).toFixed(2) : '0';
      summary += `  Bug-to-Task Ratio: ${bugToTaskRatio}\n`;
      summary += `  Task Completion Rate: ${tasks.length > 0 ? Math.round((completedTasks.length / tasks.length) * 100) : 0}%`;

      return {
        content: [{ 
          type: "text", 
          text: summary 
        }]
      };
    } catch (error) {
      return {
        content: [{ 
          type: "text", 
          text: `Error generating weekly summary: ${error instanceof Error ? error.message : 'Unknown error'}` 
        }]
      };
    }
  }
);

// Get delivery prediction
server.registerTool("getDeliveryPrediction",
  {
    title: "Get Delivery Prediction",
    description: "Predict project delivery timeline based on current progress",
    inputSchema: {
      projectId: z.string().describe("Project ID")
    }
  },
  async ({ projectId }) => {
    try {
      const project = await db.project.findUnique({
        where: { id: projectId },
        include: {
          tasks: {
            include: { assignee: true }
          },
          sprints: {
            include: { tasks: true },
            orderBy: { endDate: 'desc' }
          }
        }
      });

      if (!project) {
        return {
          content: [{ 
            type: "text", 
            text: "Project not found" 
          }]
        };
      }

      const totalTasks = project.tasks.length;
      const completedTasks = project.tasks.filter(t => t.status === 'done').length;
      const remainingTasks = totalTasks - completedTasks;

      // Calculate velocity from recent sprints
      const recentSprints = project.sprints.slice(0, 3); // Last 3 sprints
      const velocityData = recentSprints.map(sprint => {
        const completedInSprint = sprint.tasks.filter(t => t.status === 'done').length;
        const sprintDuration = Math.ceil((sprint.endDate.getTime() - sprint.startDate.getTime()) / (1000 * 60 * 60 * 24));
        return completedInSprint / Math.max(sprintDuration, 1); // tasks per day
      });

      const averageVelocity = velocityData.length > 0 
        ? velocityData.reduce((sum, v) => sum + v, 0) / velocityData.length
        : 0.5; // Default fallback

      // Calculate completion rate over last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const recentlyCompleted = project.tasks.filter(t => 
        t.status === 'done' && t.updatedAt >= thirtyDaysAgo
      ).length;

      const dailyCompletionRate = recentlyCompleted / 30;
      const predictedVelocity = Math.max(averageVelocity, dailyCompletionRate);

      const estimatedDaysToCompletion = remainingTasks / Math.max(predictedVelocity, 0.1);
      const estimatedCompletionDate = new Date();
      estimatedCompletionDate.setDate(estimatedCompletionDate.getDate() + estimatedDaysToCompletion);

      let prediction = `🔮 Delivery Prediction: ${project.name}\n\n`;
      prediction += `📊 Current Status:\n`;
      prediction += `  Progress: ${Math.round((completedTasks / Math.max(totalTasks, 1)) * 100)}% (${completedTasks}/${totalTasks})\n`;
      prediction += `  Remaining: ${remainingTasks} tasks\n\n`;

      prediction += `📈 Velocity Analysis:\n`;
      prediction += `  Recent Completion Rate: ${dailyCompletionRate.toFixed(2)} tasks/day\n`;
      prediction += `  Sprint Velocity: ${averageVelocity.toFixed(2)} tasks/day\n`;
      prediction += `  Predicted Velocity: ${predictedVelocity.toFixed(2)} tasks/day\n\n`;

      prediction += `🎯 Delivery Estimate:\n`;
      prediction += `  Estimated Completion: ${estimatedCompletionDate.toLocaleDateString()}\n`;
      prediction += `  Days Remaining: ${Math.ceil(estimatedDaysToCompletion)} days\n\n`;

      // Risk assessment
      const riskFactors = [];
      if (dailyCompletionRate < 0.5) riskFactors.push('Low completion velocity');
      if (remainingTasks > completedTasks) riskFactors.push('More work remaining than completed');
      if (project.tasks.filter(t => t.priority === 'high').filter(t => t.status !== 'done').length > 5) {
        riskFactors.push('Multiple high-priority tasks pending');
      }

      if (riskFactors.length > 0) {
        prediction += `⚠️ Risk Factors:\n`;
        prediction += riskFactors.map(risk => `  • ${risk}`).join('\n');
      } else {
        prediction += `✅ Project appears to be on track`;
      }

      return {
        content: [{ 
          type: "text", 
          text: prediction 
        }]
      };
    } catch (error) {
      return {
        content: [{ 
          type: "text", 
          text: `Error getting delivery prediction: ${error instanceof Error ? error.message : 'Unknown error'}` 
        }]
      };
    }
  }
);

// Get KPI monitoring
server.registerTool("getKPIMonitoring",
  {
    title: "Get KPI Monitoring",
    description: "Get key performance indicators across projects and teams",
    inputSchema: {
      timeframe: z.enum(["week", "month", "quarter"]).optional().describe("Time frame for analysis (default month)")
    }
  },
  async ({ timeframe = "month" }) => {
    try {
      const days = timeframe === "week" ? 7 : timeframe === "month" ? 30 : 90;
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      const [tasks, bugs, projects, users] = await Promise.all([
        db.task.findMany({
          where: { updatedAt: { gte: cutoffDate } },
          include: { project: true, assignee: true }
        }),
        db.bug.findMany({
          where: { updatedAt: { gte: cutoffDate } },
          include: { project: true }
        }),
        db.project.findMany({
          include: {
            tasks: true,
            _count: { select: { tasks: true } }
          }
        }),
        db.user.findMany({
          include: {
            assignedTasks: {
              where: { updatedAt: { gte: cutoffDate } }
            }
          }
        })
      ]);

      const completedTasks = tasks.filter(t => t.status === 'done' && t.updatedAt >= cutoffDate);
      const newTasks = tasks.filter(t => t.createdAt >= cutoffDate);
      const resolvedBugs = bugs.filter(b => ['FIXED', 'VERIFIED', 'CLOSED'].includes(b.status));
      const newBugs = bugs.filter(b => b.createdAt >= cutoffDate);

      const activeUsers = users.filter(u => u.assignedTasks.length > 0).length;
      const averageTasksPerUser = activeUsers > 0 ? (completedTasks.length / activeUsers).toFixed(1) : '0';

      let kpis = `📊 KPI Monitoring Dashboard\n`;
      kpis += `Time Frame: Last ${days} days (${timeframe})\n\n`;

      kpis += `🎯 Core Metrics:\n`;
      kpis += `  Task Completion Rate: ${tasks.length > 0 ? Math.round((completedTasks.length / tasks.length) * 100) : 0}%\n`;
      kpis += `  Bug Resolution Rate: ${bugs.length > 0 ? Math.round((resolvedBugs.length / bugs.length) * 100) : 0}%\n`;
      kpis += `  Team Productivity: ${averageTasksPerUser} tasks/person\n`;
      kpis += `  Active Projects: ${projects.filter(p => p.status === 'active').length}\n\n`;

      kpis += `📈 Throughput:\n`;
      kpis += `  Tasks Completed: ${completedTasks.length}\n`;
      kpis += `  Tasks Created: ${newTasks.length}\n`;
      kpis += `  Bugs Resolved: ${resolvedBugs.length}\n`;
      kpis += `  Bugs Reported: ${newBugs.length}\n\n`;

      kpis += `🔄 Quality Metrics:\n`;
      const bugToTaskRatio = newTasks.length > 0 ? (newBugs.length / newTasks.length).toFixed(2) : '0';
      kpis += `  Bug-to-Task Ratio: ${bugToTaskRatio}\n`;
      kpis += `  Defect Resolution Time: ${resolvedBugs.length > 0 ? 'Calculated' : 'No data'}\n`;
      kpis += `  Team Velocity: ${activeUsers > 0 ? (completedTasks.length / Math.max(days, 1)).toFixed(1) : '0'} tasks/day\n\n`;

      // Performance trends
      const performanceTrend = completedTasks.length >= newTasks.length ? '📈 Improving' : '📉 Declining';
      const qualityTrend = resolvedBugs.length >= newBugs.length ? '📈 Improving' : '📉 Declining';

      kpis += `📊 Trends:\n`;
      kpis += `  Performance: ${performanceTrend}\n`;
      kpis += `  Quality: ${qualityTrend}`;

      return {
        content: [{ 
          type: "text", 
          text: kpis 
        }]
      };
    } catch (error) {
      return {
        content: [{ 
          type: "text", 
          text: `Error getting KPI monitoring: ${error instanceof Error ? error.message : 'Unknown error'}` 
        }]
      };
    }
  }
);

// === SEARCH & DISCOVERY TOOLS ===

// Global search across all entities
server.registerTool("globalSearch",
  {
    title: "Global Search",
    description: "Search across tasks, projects, bugs, and other entities",
    inputSchema: {
      query: z.string().describe("Search query"),
      entityTypes: z.array(z.enum(["tasks", "projects", "bugs", "users"])).optional().describe("Entity types to search (default: all)")
    }
  },
  async ({ query, entityTypes = ["tasks", "projects", "bugs", "users"] }) => {
    try {
      const searchTerm = query.toLowerCase();
      const results: any[] = [];

      if (entityTypes.includes("tasks")) {
        const tasks = await db.task.findMany({
          where: {
            OR: [
              { title: { contains: searchTerm, mode: 'insensitive' } },
              { description: { contains: searchTerm, mode: 'insensitive' } }
            ]
          },
          include: { project: true, assignee: true },
          take: 10
        });

        tasks.forEach(task => {
          results.push({
            type: 'Task',
            title: task.title,
            description: `${task.project.name} - ${task.status} - ${task.priority}`,
            assignee: task.assignee ? `${task.assignee.firstName} ${task.assignee.lastName}` : 'Unassigned',
            id: task.id
          });
        });
      }

      if (entityTypes.includes("projects")) {
        const projects = await db.project.findMany({
          where: {
            OR: [
              { name: { contains: searchTerm, mode: 'insensitive' } },
              { description: { contains: searchTerm, mode: 'insensitive' } }
            ]
          },
          include: { workspace: true, _count: { select: { tasks: true } } },
          take: 10
        });

        projects.forEach(project => {
          results.push({
            type: 'Project',
            title: project.name,
            description: `${project.workspace.name} - ${project._count.tasks} tasks`,
            assignee: project.status,
            id: project.id
          });
        });
      }

      if (entityTypes.includes("bugs")) {
        const bugs = await db.bug.findMany({
          where: {
            OR: [
              { title: { contains: searchTerm, mode: 'insensitive' } },
              { description: { contains: searchTerm, mode: 'insensitive' } }
            ]
          },
          include: { project: true, assignee: true },
          take: 10
        });

        bugs.forEach(bug => {
          results.push({
            type: 'Bug',
            title: bug.title,
            description: `${bug.project.name} - ${bug.status} - ${bug.severity}`,
            assignee: bug.assignee ? `${bug.assignee.firstName} ${bug.assignee.lastName}` : 'Unassigned',
            id: bug.id
          });
        });
      }

      if (entityTypes.includes("users")) {
        const users = await db.user.findMany({
          where: {
            OR: [
              { firstName: { contains: searchTerm, mode: 'insensitive' } },
              { lastName: { contains: searchTerm, mode: 'insensitive' } },
              { email: { contains: searchTerm, mode: 'insensitive' } }
            ]
          },
          take: 10
        });

        users.forEach(user => {
          results.push({
            type: 'User',
            title: `${user.firstName} ${user.lastName}`,
            description: user.email,
            assignee: 'Team Member',
            id: user.id
          });
        });
      }

      if (results.length === 0) {
        return {
          content: [{ 
            type: "text", 
            text: `No results found for "${query}"` 
          }]
        };
      }

      const searchResults = results.map(result => 
        `${result.type}: ${result.title}\n  ${result.description}\n  ${result.assignee}`
      ).join('\n\n');

      return {
        content: [{ 
          type: "text", 
          text: `Search Results for "${query}" (${results.length} found):\n\n${searchResults}` 
        }]
      };
    } catch (error) {
      return {
        content: [{ 
          type: "text", 
          text: `Error performing search: ${error instanceof Error ? error.message : 'Unknown error'}` 
        }]
      };
    }
  }
);

// Get related items
server.registerTool("getRelatedItems",
  {
    title: "Get Related Items",
    description: "Find items related to a specific task, project, or bug",
    inputSchema: {
      entityType: z.enum(["task", "project", "bug"]).describe("Type of entity"),
      entityId: z.string().describe("Entity ID"),
      relationType: z.enum(["same_project", "same_assignee", "same_keywords"]).optional().describe("Type of relationship to find")
    }
  },
  async ({ entityType, entityId, relationType = "same_project" }) => {
    try {
      let baseEntity: any = null;
      let relatedItems: any[] = [];

      if (entityType === "task") {
        baseEntity = await db.task.findUnique({
          where: { id: entityId },
          include: { project: true, assignee: true }
        });

        if (!baseEntity) {
          return {
            content: [{ 
              type: "text", 
              text: "Task not found" 
            }]
          };
        }

        if (relationType === "same_project") {
          const tasks = await db.task.findMany({
            where: { 
              projectId: baseEntity.projectId,
              id: { not: entityId }
            },
            include: { assignee: true },
            take: 10
          });
          relatedItems = tasks.map(t => ({
            type: 'Task',
            title: t.title,
            description: `${t.status} - ${t.priority}${t.assignee ? ` - ${t.assignee.firstName}` : ''}`,
            id: t.id
          }));
        } else if (relationType === "same_assignee" && baseEntity.assigneeId) {
          const tasks = await db.task.findMany({
            where: { 
              assigneeId: baseEntity.assigneeId,
              id: { not: entityId }
            },
            include: { project: true },
            take: 10
          });
          relatedItems = tasks.map(t => ({
            type: 'Task',
            title: t.title,
            description: `${t.project.name} - ${t.status}`,
            id: t.id
          }));
        } else if (relationType === "same_keywords") {
          const keywords = baseEntity.title.toLowerCase().split(' ').filter((w: string) => w.length > 3);
          if (keywords.length > 0) {
            const tasks = await db.task.findMany({
              where: { 
                AND: [
                  { id: { not: entityId } },
                  {
                                         OR: keywords.map((keyword: string) => ({
                       title: { contains: keyword, mode: 'insensitive' }
                     }))
                  }
                ]
              },
              include: { project: true, assignee: true },
              take: 10
            });
            relatedItems = tasks.map(t => ({
              type: 'Task',
              title: t.title,
              description: `${t.project.name} - ${t.status}${t.assignee ? ` - ${t.assignee.firstName}` : ''}`,
              id: t.id
            }));
          }
        }
      } else if (entityType === "project") {
        baseEntity = await db.project.findUnique({
          where: { id: entityId },
          include: { workspace: true }
        });

        if (!baseEntity) {
          return {
            content: [{ 
              type: "text", 
              text: "Project not found" 
            }]
          };
        }

        // Find projects in same workspace
        const projects = await db.project.findMany({
          where: { 
            workspaceId: baseEntity.workspaceId,
            id: { not: entityId }
          },
          include: { _count: { select: { tasks: true } } },
          take: 10
        });
        relatedItems = projects.map(p => ({
          type: 'Project',
          title: p.name,
          description: `${p.status} - ${p._count.tasks} tasks`,
          id: p.id
        }));
      }

      if (relatedItems.length === 0) {
        return {
          content: [{ 
            type: "text", 
            text: `No related items found for this ${entityType}` 
          }]
        };
      }

      const relatedList = relatedItems.map(item => 
        `${item.type}: ${item.title}\n  ${item.description}`
      ).join('\n\n');

      return {
        content: [{ 
          type: "text", 
          text: `Related Items for ${entityType} "${baseEntity.title || baseEntity.name}" (${relationType}):\n\n${relatedList}` 
        }]
      };
    } catch (error) {
      return {
        content: [{ 
          type: "text", 
          text: `Error finding related items: ${error instanceof Error ? error.message : 'Unknown error'}` 
        }]
      };
    }
  }
);

// Get impact analysis
server.registerTool("getImpactAnalysis",
  {
    title: "Get Impact Analysis",
    description: "Analyze the potential impact of changes to a task or project",
    inputSchema: {
      entityType: z.enum(["task", "project"]).describe("Type of entity"),
      entityId: z.string().describe("Entity ID"),
      changeType: z.enum(["delay", "cancel", "priority_change"]).describe("Type of change to analyze")
    }
  },
  async ({ entityType, entityId, changeType }) => {
    try {
      let analysis = '';

      if (entityType === "task") {
        const task = await db.task.findUnique({
          where: { id: entityId },
          include: { 
            project: {
              include: {
                tasks: {
                  include: { assignee: true }
                }
              }
            },
            assignee: true 
          }
        });

        if (!task) {
          return {
            content: [{ 
              type: "text", 
              text: "Task not found" 
            }]
          };
        }

        analysis = `Impact Analysis: ${task.title}\n\n`;

        if (changeType === "delay") {
          // Find tasks that might be affected by this delay
          const samePriorityTasks = task.project.tasks.filter(t => 
            t.priority === task.priority && t.id !== task.id && t.status !== 'done'
          );
          const sameAssigneeTasks = task.project.tasks.filter(t => 
            t.assigneeId === task.assigneeId && t.id !== task.id && t.status !== 'done'
          );

          analysis += `🕐 Delay Impact:\n`;
          analysis += `  Same Priority Tasks: ${samePriorityTasks.length} may be affected\n`;
          analysis += `  Same Assignee Tasks: ${sameAssigneeTasks.length} may be delayed\n`;
          
          if (task.priority === 'high') {
            analysis += `  ⚠️ High priority task delay may impact project timeline\n`;
          }
          
          if (task.dueDate && task.dueDate < new Date()) {
            analysis += `  🔴 Task is already overdue - immediate attention needed\n`;
          }

        } else if (changeType === "cancel") {
          const projectTasks = task.project.tasks;
          const totalTasks = projectTasks.length;
          const completedTasks = projectTasks.filter(t => t.status === 'done').length;
          const impactPercent = Math.round((1 / Math.max(totalTasks, 1)) * 100);

          analysis += `❌ Cancellation Impact:\n`;
          analysis += `  Project Progress: -${impactPercent}% (${completedTasks}/${totalTasks-1} completed)\n`;
          analysis += `  Assignee Workload: Reduced by 1 task\n`;
          
          if (task.priority === 'high') {
            analysis += `  ⚠️ Cancelling high priority task may require scope adjustment\n`;
          }

        } else if (changeType === "priority_change") {
          const highPriorityTasks = task.project.tasks.filter(t => t.priority === 'high').length;
          
          analysis += `⚡ Priority Change Impact:\n`;
          analysis += `  Current High Priority Tasks: ${highPriorityTasks}\n`;
          analysis += `  Assignee Focus: May need to reprioritize other tasks\n`;
          
          if (task.assignee) {
            const assigneeTasks = task.project.tasks.filter(t => 
              t.assigneeId === task.assigneeId && t.status !== 'done'
            );
            analysis += `  ${task.assignee.firstName}'s Workload: ${assigneeTasks.length} active tasks\n`;
          }
        }

      } else if (entityType === "project") {
        const project = await db.project.findUnique({
          where: { id: entityId },
          include: { 
            tasks: {
              include: { assignee: true }
            },
            workspace: {
              include: {
                projects: {
                  include: {
                    _count: { select: { tasks: true } }
                  }
                }
              }
            }
          }
        });

        if (!project) {
          return {
            content: [{ 
              type: "text", 
              text: "Project not found" 
            }]
          };
        }

        analysis = `Impact Analysis: ${project.name}\n\n`;

        const totalTasks = project.tasks.length;
        const activeTasks = project.tasks.filter(t => t.status !== 'done').length;
        const teamMembers = new Set(project.tasks.map(t => t.assigneeId).filter(Boolean)).size;

        if (changeType === "delay") {
          analysis += `🕐 Project Delay Impact:\n`;
          analysis += `  Active Tasks: ${activeTasks} tasks affected\n`;
          analysis += `  Team Members: ${teamMembers} people impacted\n`;
          analysis += `  Workspace Impact: 1 of ${project.workspace.projects.length} projects delayed\n`;

        } else if (changeType === "cancel") {
          const workspaceTasks = project.workspace.projects.reduce((sum, p) => sum + p._count.tasks, 0);
          const impactPercent = Math.round((totalTasks / Math.max(workspaceTasks, 1)) * 100);

          analysis += `❌ Project Cancellation Impact:\n`;
          analysis += `  Tasks Lost: ${totalTasks} tasks\n`;
          analysis += `  Team Members: ${teamMembers} people need reassignment\n`;
          analysis += `  Workspace Impact: -${impactPercent}% of total tasks\n`;
        }
      }

      return {
        content: [{ 
          type: "text", 
          text: analysis 
        }]
      };
    } catch (error) {
      return {
        content: [{ 
          type: "text", 
          text: `Error performing impact analysis: ${error instanceof Error ? error.message : 'Unknown error'}` 
        }]
      };
    }
  }
);

// === CALENDAR & SCHEDULING TOOLS ===

// Get deadline tracking
server.registerTool("getDeadlineTracking",
  {
    title: "Get Deadline Tracking",
    description: "Track upcoming deadlines and overdue items",
    inputSchema: {
      days: z.number().optional().describe("Number of days to look ahead (default 14)"),
      projectId: z.string().optional().describe("Filter by project ID")
    }
  },
  async ({ days = 14, projectId }) => {
    try {
      const now = new Date();
      const futureDate = new Date();
      futureDate.setDate(now.getDate() + days);

      const where: any = {
        dueDate: { not: null }
      };
      if (projectId) where.projectId = projectId;

      const tasks = await db.task.findMany({
        where,
        include: {
          project: true,
          assignee: true
        },
        orderBy: { dueDate: 'asc' }
      });

      const upcomingDeadlines = tasks.filter(t => 
        t.dueDate && t.dueDate >= now && t.dueDate <= futureDate && t.status !== 'done'
      );
      
      const overdueItems = tasks.filter(t => 
        t.dueDate && t.dueDate < now && t.status !== 'done'
      );

      const dueSoon = tasks.filter(t => {
        if (!t.dueDate || t.status === 'done') return false;
        const daysUntilDue = Math.ceil((t.dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return daysUntilDue <= 3 && daysUntilDue >= 0;
      });

      let tracking = `📅 Deadline Tracking (Next ${days} days)\n\n`;

      if (overdueItems.length > 0) {
        tracking += `🔴 Overdue Items (${overdueItems.length}):\n`;
        tracking += overdueItems.slice(0, 10).map(t => {
          const daysOverdue = Math.ceil((now.getTime() - t.dueDate!.getTime()) / (1000 * 60 * 60 * 24));
          return `  ${t.title} - ${daysOverdue} days overdue - ${t.project.name}${t.assignee ? ` - ${t.assignee.firstName}` : ''}`;
        }).join('\n') + '\n\n';
      }

      if (dueSoon.length > 0) {
        tracking += `⚠️ Due Soon (${dueSoon.length}):\n`;
        tracking += dueSoon.map(t => {
          const daysUntilDue = Math.ceil((t.dueDate!.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          return `  ${t.title} - Due in ${daysUntilDue} day${daysUntilDue !== 1 ? 's' : ''} - ${t.project.name}${t.assignee ? ` - ${t.assignee.firstName}` : ''}`;
        }).join('\n') + '\n\n';
      }

      if (upcomingDeadlines.length > 0) {
        tracking += `📋 Upcoming Deadlines (${upcomingDeadlines.length}):\n`;
        tracking += upcomingDeadlines.slice(0, 15).map(t => {
          const daysUntilDue = Math.ceil((t.dueDate!.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          return `  ${t.title} - ${t.dueDate!.toLocaleDateString()} (${daysUntilDue} days) - ${t.project.name}${t.assignee ? ` - ${t.assignee.firstName}` : ''}`;
        }).join('\n');
      }

      if (overdueItems.length === 0 && dueSoon.length === 0 && upcomingDeadlines.length === 0) {
        tracking += `✅ No upcoming deadlines in the next ${days} days`;
      }

      return {
        content: [{ 
          type: "text", 
          text: tracking 
        }]
      };
    } catch (error) {
      return {
        content: [{ 
          type: "text", 
          text: `Error tracking deadlines: ${error instanceof Error ? error.message : 'Unknown error'}` 
        }]
      };
    }
  }
);

// Get timeline visualization
server.registerTool("getTimelineVisualization",
  {
    title: "Get Timeline Visualization",
    description: "Get a timeline view of tasks and milestones",
    inputSchema: {
      projectId: z.string().optional().describe("Project ID (optional)"),
      startDate: z.string().optional().describe("Start date for timeline (ISO format)"),
      endDate: z.string().optional().describe("End date for timeline (ISO format)")
    }
  },
  async ({ projectId, startDate, endDate }) => {
    try {
      const start = startDate ? new Date(startDate) : new Date();
      const end = endDate ? new Date(endDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days from now

      const where: any = {
        OR: [
          {
            dueDate: {
              gte: start,
              lte: end
            }
          },
          {
            createdAt: {
              gte: start,
              lte: end
            }
          }
        ]
      };
      if (projectId) where.projectId = projectId;

      const [tasks, sprints] = await Promise.all([
        db.task.findMany({
          where,
          include: {
            project: true,
            assignee: true
          },
          orderBy: { dueDate: 'asc' }
        }),
        projectId ? db.sprint.findMany({
          where: { 
            projectId,
            OR: [
              { startDate: { gte: start, lte: end } },
              { endDate: { gte: start, lte: end } }
            ]
          },
          orderBy: { startDate: 'asc' }
        }) : []
      ]);

      // Group items by date
      const timeline: Record<string, any[]> = {};

      tasks.forEach(task => {
        if (task.dueDate) {
          const dateKey = task.dueDate.toLocaleDateString();
          if (!timeline[dateKey]) timeline[dateKey] = [];
          timeline[dateKey].push({
            type: 'Task Due',
            title: task.title,
            project: task.project.name,
            assignee: task.assignee ? `${task.assignee.firstName} ${task.assignee.lastName}` : 'Unassigned',
            status: task.status,
            priority: task.priority
          });
        }
      });

      sprints.forEach(sprint => {
        const startKey = sprint.startDate.toLocaleDateString();
        const endKey = sprint.endDate.toLocaleDateString();
        
        if (!timeline[startKey]) timeline[startKey] = [];
        timeline[startKey].push({
          type: 'Sprint Start',
          title: sprint.name,
          project: '',
          assignee: '',
          status: sprint.status,
          priority: ''
        });

        if (!timeline[endKey]) timeline[endKey] = [];
        timeline[endKey].push({
          type: 'Sprint End',
          title: sprint.name,
          project: '',
          assignee: '',
          status: sprint.status,
          priority: ''
        });
      });

      const sortedDates = Object.keys(timeline).sort((a, b) => 
        new Date(a).getTime() - new Date(b).getTime()
      );

      let visualization = `📅 Timeline Visualization\n`;
      visualization += `Period: ${start.toLocaleDateString()} - ${end.toLocaleDateString()}\n\n`;

      if (sortedDates.length === 0) {
        visualization += `No scheduled items found in this period`;
      } else {
        sortedDates.forEach(date => {
          visualization += `📅 ${date}:\n`;
          timeline[date].forEach(item => {
            let icon = '📋';
            if (item.type.includes('Sprint')) icon = '🏃';
            if (item.priority === 'high') icon = '🔥';
            if (item.status === 'done') icon = '✅';
            
            visualization += `  ${icon} ${item.type}: ${item.title}`;
            if (item.project) visualization += ` (${item.project})`;
            if (item.assignee) visualization += ` - ${item.assignee}`;
            visualization += '\n';
          });
          visualization += '\n';
        });
      }

      return {
        content: [{ 
          type: "text", 
          text: visualization 
        }]
      };
    } catch (error) {
      return {
        content: [{ 
          type: "text", 
          text: `Error generating timeline: ${error instanceof Error ? error.message : 'Unknown error'}` 
        }]
      };
    }
  }
);

// Get schedule optimization suggestions
server.registerTool("getScheduleOptimization",
  {
    title: "Get Schedule Optimization",
    description: "Get suggestions for optimizing schedules and workload",
    inputSchema: {
      projectId: z.string().optional().describe("Project ID (optional)"),
      userId: z.string().optional().describe("User ID for personal optimization")
    }
  },
  async ({ projectId, userId }) => {
    try {
      const where: any = { status: { not: 'done' } };
      if (projectId) where.projectId = projectId;
      if (userId) where.assigneeId = userId;

      const tasks = await db.task.findMany({
        where,
        include: {
          project: true,
          assignee: true
        },
        orderBy: { dueDate: 'asc' }
      });

      const now = new Date();
      let suggestions: string[] = [];

      // Analyze overdue tasks
      const overdueTasks = tasks.filter(t => t.dueDate && t.dueDate < now);
      if (overdueTasks.length > 0) {
        suggestions.push(`🔴 ${overdueTasks.length} overdue tasks need immediate attention`);
      }

      // Analyze workload distribution
      const tasksByAssignee = tasks.reduce((acc: any, task) => {
        if (!task.assignee) return acc;
        const key = `${task.assignee.firstName} ${task.assignee.lastName}`;
        if (!acc[key]) acc[key] = [];
        acc[key].push(task);
        return acc;
      }, {});

      const workloadStats = Object.entries(tasksByAssignee).map(([name, userTasks]: [string, any]) => ({
        name,
        total: userTasks.length,
        high: userTasks.filter((t: any) => t.priority === 'high').length,
        overdue: userTasks.filter((t: any) => t.dueDate && t.dueDate < now).length
      }));

      // Find workload imbalances
      const avgWorkload = workloadStats.reduce((sum, stat) => sum + stat.total, 0) / Math.max(workloadStats.length, 1);
      const overloaded = workloadStats.filter(stat => stat.total > avgWorkload * 1.5);
      const underloaded = workloadStats.filter(stat => stat.total < avgWorkload * 0.5);

      if (overloaded.length > 0) {
        suggestions.push(`⚖️ ${overloaded.map(s => s.name).join(', ')} appear overloaded (>150% avg workload)`);
      }

      if (underloaded.length > 0 && overloaded.length > 0) {
        suggestions.push(`💡 Consider redistributing tasks from overloaded to underloaded team members`);
      }

      // Analyze upcoming deadlines
      const nextWeek = new Date();
      nextWeek.setDate(now.getDate() + 7);
      const urgentTasks = tasks.filter(t => 
        t.dueDate && t.dueDate <= nextWeek && t.dueDate >= now && t.priority === 'high'
      );

      if (urgentTasks.length > 3) {
        suggestions.push(`⚠️ ${urgentTasks.length} high-priority tasks due within a week - consider sprint planning`);
      }

      // Analyze priority distribution
      const highPriorityTasks = tasks.filter(t => t.priority === 'high').length;
      const totalTasks = tasks.length;
      
      if (highPriorityTasks > totalTasks * 0.3) {
        suggestions.push(`🔥 ${Math.round((highPriorityTasks/totalTasks)*100)}% of tasks are high priority - consider reprioritizing`);
      }

      // Generate optimization recommendations
      let optimization = `⚡ Schedule Optimization Suggestions\n\n`;

      if (suggestions.length === 0) {
        optimization += `✅ Current schedule appears well-balanced\n\n`;
      } else {
        optimization += `🎯 Recommendations:\n`;
        optimization += suggestions.map(s => `  • ${s}`).join('\n') + '\n\n';
      }

      optimization += `📊 Current Status:\n`;
      optimization += `  Total Active Tasks: ${tasks.length}\n`;
      optimization += `  Overdue: ${overdueTasks.length}\n`;
      optimization += `  High Priority: ${highPriorityTasks}\n`;
      optimization += `  Team Members: ${workloadStats.length}\n\n`;

      if (workloadStats.length > 0) {
        optimization += `👥 Workload Distribution:\n`;
        optimization += workloadStats.map(stat => 
          `  ${stat.name}: ${stat.total} tasks (${stat.high} high priority, ${stat.overdue} overdue)`
        ).join('\n');
      }

      return {
        content: [{ 
          type: "text", 
          text: optimization 
        }]
      };
    } catch (error) {
      return {
        content: [{ 
          type: "text", 
          text: `Error generating schedule optimization: ${error instanceof Error ? error.message : 'Unknown error'}` 
        }]
      };
    }
  }
);

// Add a dynamic project resource
server.registerResource(
  "project",
  new ResourceTemplate("project://{projectId}", { list: undefined }),
  { 
    title: "Project Resource",      
    description: "Get detailed information about a specific project"
  },
  async (uri, variables) => {
    const projectId = Array.isArray(variables.projectId) ? variables.projectId[0] : variables.projectId;
    try {
      const project = await db.project.findUnique({
        where: { id: projectId },
        include: {
          workspace: true,
          tasks: {
            include: { assignee: true },
            orderBy: { createdAt: 'desc' }
          },
          _count: {
            select: { tasks: true, sprints: true }
          }
        }
      });
      if (!project) {
        return {
          contents: [{
            uri: uri.href,
            text: `Project not found: ${projectId}`
          }]
        };
      }
      const taskSummary = (project.tasks as any[]).slice(0, 5).map((t: any) => 
        `- ${t.title} (${t.status})${t.assignee ? ` - ${t.assignee.firstName}` : ''}`
      ).join('\n');
      const projectInfo = `
Project: ${project.name}
Workspace: ${project.workspace?.name || project.workspaceId}
Description: ${project.description || 'No description'}
Total Tasks: ${project._count.tasks}
Total Sprints: ${project._count.sprints}

Recent Tasks:
${taskSummary}
${(project.tasks as any[]).length > 5 ? `... and ${(project.tasks as any[]).length - 5} more tasks` : ''}
      `.trim();
      return {
        contents: [{
          uri: uri.href,
          text: projectInfo
        }]
      };
    } catch (error) {
      return {
        contents: [{
          uri: uri.href,
          text: `Error loading project: ${error instanceof Error ? error.message : 'Unknown error'}`
        }]
      };
    }
  }
);

// Add a workspace resource
server.registerResource(
  "workspace",
  new ResourceTemplate("workspace://{workspaceId}", { list: undefined }),
  { 
    title: "Workspace Resource",      
    description: "Get detailed information about a specific workspace"
  },
  async (uri, variables) => {
    const workspaceId = Array.isArray(variables.workspaceId) ? variables.workspaceId[0] : variables.workspaceId;
    try {
      const workspace = await db.workspace.findUnique({
        where: { id: workspaceId },
        include: {
          projects: {
            include: {
              _count: { select: { tasks: true } }
            }
          },
          members: {
            include: { user: true }
          },
          _count: {
            select: { projects: true, members: true }
          }
        }
      });
      if (!workspace) {
        return {
          contents: [{
            uri: uri.href,
            text: `Workspace not found: ${workspaceId}`
          }]
        };
      }
      const projectList = (workspace.projects as any[]).map((p: any) => 
        `- ${p.name} (${p._count.tasks} tasks)`
      ).join('\n');
      const memberList = (workspace.members as any[]).map((m: any) => 
        `- ${m.user.firstName} ${m.user.lastName} (${m.role})`
      ).join('\n');
      const workspaceInfo = `
Workspace: ${workspace.name}
Description: ${workspace.description || 'No description'}
Total Projects: ${workspace._count.projects}
Total Members: ${workspace._count.members}

Projects:
${projectList || 'No projects'}

Members:
${memberList || 'No members'}
      `.trim();
      return {
        contents: [{
          uri: uri.href,
          text: workspaceInfo
        }]
      };
    } catch (error) {
      return {
        contents: [{
          uri: uri.href,
          text: `Error loading workspace: ${error instanceof Error ? error.message : 'Unknown error'}`
        }]
      };
    }
  }
);

// Start receiving messages on stdin and sending messages on stdout
(async () => {
  const transport = new StdioServerTransport();
  await server.connect(transport);
})(); 