// Simple test to check Prisma client configuration
const { PrismaClient } = require('@prisma/client');

// Create a new PrismaClient instance
const prisma = new PrismaClient({ log: ['query', 'info', 'warn', 'error'] });

// List all available models
console.log('Available models in Prisma client:');
console.log(Object.keys(prisma).filter(key => 
  !key.startsWith('_') && !key.startsWith('$')
));

// Try to fetch roadmaps with lowercase
async function testFetchRoadmaps() {
  try {
    console.log('\nTrying to fetch roadmaps with lowercase:');
    const roadmapsLower = await prisma.roadmap.findMany();
    console.log(`Success! Found ${roadmapsLower.length} roadmaps with lowercase.`);
  } catch (error) {
    console.error('Error fetching with lowercase:', error.message);
    
    // Try with uppercase
    try {
      console.log('\nTrying to fetch roadmaps with uppercase:');
      const roadmapsUpper = await prisma.Roadmap.findMany();
      console.log(`Success! Found ${roadmapsUpper.length} roadmaps with uppercase.`);
    } catch (error) {
      console.error('Error fetching with uppercase:', error.message);
    }
  }
}

// Run the test
testFetchRoadmaps()
  .finally(async () => {
    // Disconnect Prisma client
    await prisma.$disconnect();
    console.log('\nTest completed.');
  }); 