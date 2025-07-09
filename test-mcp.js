import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testMCPServer() {
  console.log('Testing MCP Server...');
  
  const serverPath = path.join(__dirname, 'src', 'mcp-server.ts');
  const process = spawn('node', ['--loader', 'ts-node/esm', '--experimental-specifier-resolution=node', serverPath], {
    stdio: ['pipe', 'pipe', 'pipe'],
    cwd: __dirname
  });

  // Simple test message
  const testMessage = {
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: {
        name: "test-client",
        version: "1.0.0"
      }
    }
  };

  process.stdin.write(JSON.stringify(testMessage) + '\n');

  process.stdout.on('data', (data) => {
    console.log('Server response:', data.toString());
  });

  process.stderr.on('data', (data) => {
    console.error('Server error:', data.toString());
  });

  process.on('close', (code) => {
    console.log(`Server process exited with code ${code}`);
  });

  // Kill the process after 5 seconds
  setTimeout(() => {
    process.kill();
  }, 5000);
}

testMCPServer().catch(console.error); 