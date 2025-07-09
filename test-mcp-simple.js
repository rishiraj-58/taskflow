import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import * as path from "path";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testMCPServer() {
  console.log('Testing MCP Server with new transport...');
  
  try {
    // Create transport
    const serverPath = path.join(__dirname, 'src', 'mcp-server.ts');
    const transport = new StdioClientTransport({
      command: 'node',
      args: ['--loader', 'ts-node/esm', '--experimental-specifier-resolution=node', serverPath],
      cwd: __dirname
    });

    // Create client
    const client = new Client({
      name: "test-client",
      version: "1.0.0"
    });

    console.log('Connecting to MCP server...');
    await client.connect(transport);
    console.log('Connected successfully!');

    // Test listing tools
    console.log('Listing tools...');
    const tools = await client.listTools();
    console.log('Available tools:', tools);

    // Test calling a tool
    console.log('Testing listProjects tool...');
    const result = await client.callTool({ 
      name: "listProjects", 
      arguments: {} 
    });
    console.log('Tool result:', result);

    await client.close();
    console.log('Test completed successfully!');
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testMCPServer(); 