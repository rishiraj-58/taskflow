const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Testing database connection...');
    const userCount = await prisma.user.count();
    console.log('Connection successful! User count:', userCount);
    
    // Test querying workspaces
    const workspaceCount = await prisma.workspace.count();
    console.log('Workspace count:', workspaceCount);
    
    return { success: true };
  } catch (error) {
    console.error('Database connection failed:', error);
    return { success: false, error };
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .then(result => {
    console.log('Test completed:', result.success ? 'SUCCESS' : 'FAILED');
    process.exit(result.success ? 0 : 1);
  })
  .catch(e => {
    console.error('Unexpected error:', e);
    process.exit(1);
  }); 