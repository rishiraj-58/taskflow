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
      dueDate: z.string().optional().describe("Due date in ISO format")
    }
  },
  async ({ title, description, projectId, priority, status, assigneeId, dueDate }) => {
    try {
      // For now, use a system user ID - in a real implementation, this would come from the authenticated user
      const creatorId = "system-user-id"; // This should be replaced with actual user ID from auth context
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
      status: z.enum(["active", "archived", "completed"]).optional().describe("Project status")
    }
  },
  async ({ name, description, workspaceId, status }) => {
    try {
      const project = await db.project.create({
        data: {
          name,
          description: description || "",
          status: status || "active",
          workspaceId,
          ownerId: "system", // Placeholder owner
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
      priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional().describe("Bug priority")
    }
  },
  async ({ title, description, projectId, severity, status, assigneeId, priority }) => {
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
          reporterId: "system", // Placeholder reporter
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