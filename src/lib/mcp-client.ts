import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import * as path from "path";

export class TaskFlowMCPClient {
  private client: Client | null = null;
  private transport: StdioClientTransport | null = null;
  private connectionPromise: Promise<Client> | null = null;

  async connect() {
    if (this.client) {
      return this.client;
    }

    // If there's already a connection attempt in progress, wait for it
    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    this.connectionPromise = this._connect();
    return this.connectionPromise;
  }

  private async _connect(): Promise<Client> {
    try {
      console.log('🔌 Connecting to MCP server...');
      
      // Create transport - let it handle the process spawning
      const serverPath = path.join(process.cwd(), 'src', 'mcp-server.ts');
      this.transport = new StdioClientTransport({
        command: 'node',
        args: ['--loader', 'ts-node/esm', '--experimental-specifier-resolution=node', serverPath],
        cwd: process.cwd()
      });

      // Create client with required clientInfo
      this.client = new Client({
        name: "taskflow-client",
        version: "1.0.0"
      });

      // Add timeout to connection
      const connectionPromise = this.client.connect(this.transport);
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('MCP connection timeout')), 10000); // 10 second timeout
      });

      await Promise.race([connectionPromise, timeoutPromise]);

      console.log('✅ MCP Client connected successfully');
      return this.client;
    } catch (error) {
      console.error('❌ Failed to connect to MCP server:', error);
      this.client = null;
      this.transport = null;
      this.connectionPromise = null;
      throw error;
    }
  }

  async disconnect() {
    if (this.client) {
      try {
        await this.client.close();
      } catch (error) {
        console.error('Error closing MCP client:', error);
      }
      this.client = null;
    }
    if (this.transport) {
      this.transport = null;
    }
    this.connectionPromise = null;
  }

  async listTools() {
    const client = await this.connect();
    try {
      return await client.listTools();
    } catch (error) {
      console.error('Error listing tools:', error);
      throw error;
    }
  }

  async callTool(name: string, arguments_: any) {
    const client = await this.connect();
    try {
      return await client.callTool({ name, arguments: arguments_ });
    } catch (error) {
      console.error(`Error calling tool ${name}:`, error);
      throw error;
    }
  }

  async readResource(uri: string) {
    const client = await this.connect();
    try {
      return await client.readResource({ uri });
    } catch (error) {
      console.error('Error reading resource:', error);
      throw error;
    }
  }

  async listResources() {
    const client = await this.connect();
    try {
      return await client.listResources();
    } catch (error) {
      console.error('Error listing resources:', error);
      throw error;
    }
  }
}

// Create a singleton instance
export const mcpClient = new TaskFlowMCPClient();

// Helper functions for common operations
export async function createTask(taskData: {
  title: string;
  description?: string;
  projectId: string;
  priority?: "low" | "medium" | "high";
  status?: "todo" | "in_progress" | "done";
  assigneeId?: string;
  dueDate?: string;
}) {
  try {
    const result = await mcpClient.callTool("createTask", taskData);
    return result;
  } catch (error) {
    console.error('Error in createTask:', error);
    throw error;
  }
}

export async function createProject(projectData: {
  name: string;
  description?: string;
  workspaceId: string;
  status?: "active" | "archived" | "completed";
}) {
  try {
    const result = await mcpClient.callTool("createProject", projectData);
    return result;
  } catch (error) {
    console.error('Error in createProject:', error);
    throw error;
  }
}

export async function createBug(bugData: {
  title: string;
  description?: string;
  projectId: string;
  severity?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  status?: "OPEN" | "IN_PROGRESS" | "FIXED" | "VERIFIED" | "CLOSED" | "REOPENED";
  assigneeId?: string;
  priority?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
}) {
  try {
    const result = await mcpClient.callTool("createBug", bugData);
    return result;
  } catch (error) {
    console.error('Error in createBug:', error);
    throw error;
  }
}

export async function createSprint(sprintData: {
  name: string;
  description?: string;
  projectId: string;
  startDate: string;
  endDate: string;
}) {
  try {
    const result = await mcpClient.callTool("createSprint", sprintData);
    return result;
  } catch (error) {
    console.error('Error in createSprint:', error);
    throw error;
  }
}

export async function listProjects(workspaceId?: string) {
  try {
    const result = await mcpClient.callTool("listProjects", { workspaceId });
    return result;
  } catch (error) {
    console.error('Error in listProjects:', error);
    throw error;
  }
}

export async function listTasks(filters?: {
  projectId?: string;
  status?: "todo" | "in_progress" | "done";
  assigneeId?: string;
}) {
  try {
    const result = await mcpClient.callTool("listTasks", filters || {});
    return result;
  } catch (error) {
    console.error('Error in listTasks:', error);
    throw error;
  }
}

export async function listBugs(filters?: {
  projectId?: string;
  status?: "OPEN" | "IN_PROGRESS" | "FIXED" | "VERIFIED" | "CLOSED" | "REOPENED";
  severity?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
}) {
  try {
    const result = await mcpClient.callTool("listBugs", filters || {});
    return result;
  } catch (error) {
    console.error('Error in listBugs:', error);
    throw error;
  }
}

export async function listSprints(filters?: {
  projectId?: string;
  status?: "planned" | "active" | "completed";
}) {
  try {
    const result = await mcpClient.callTool("listSprints", filters || {});
    return result;
  } catch (error) {
    console.error('Error in listSprints:', error);
    throw error;
  }
}

export async function getProjectInfo(projectId: string) {
  try {
    const result = await mcpClient.readResource(`project://${projectId}`);
    return result;
  } catch (error) {
    console.error('Error in getProjectInfo:', error);
    throw error;
  }
}

export async function getWorkspaceInfo(workspaceId: string) {
  try {
    const result = await mcpClient.readResource(`workspace://${workspaceId}`);
    return result;
  } catch (error) {
    console.error('Error in getWorkspaceInfo:', error);
    throw error;
  }
}

export async function listTeamMembers(filters?: {
  workspaceId?: string;
  projectId?: string;
}) {
  try {
    const result = await mcpClient.callTool("listTeamMembers", filters || {});
    return result;
  } catch (error) {
    console.error('Error in listTeamMembers:', error);
    throw error;
  }
}

export async function findUser(userData: {
  name: string;
  email?: string;
}) {
  try {
    const result = await mcpClient.callTool("findUser", userData);
    return result;
  } catch (error) {
    console.error('Error in findUser:', error);
    throw error;
  }
}

export async function getProjectDetails(projectName: string) {
  try {
    const result = await mcpClient.callTool("getProjectDetails", { projectName });
    return result;
  } catch (error) {
    console.error('Error in getProjectDetails:', error);
    throw error;
  }
} 