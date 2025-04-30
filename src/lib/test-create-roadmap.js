// Test script to create a roadmap
const { PrismaClient } = require('@prisma/client');

// Create a new PrismaClient instance
const prisma = new PrismaClient({ log: ['query', 'info', 'warn', 'error'] });

// Replace with an actual projectId from your database
const PROJECT_ID = "d920eafd-6b69-4871-9c3a-441bdc6f67df"; // Use the project ID from the error message

async function createTestRoadmap() {
  try {
    // First, check if the project exists
    console.log(`Checking if project ${PROJECT_ID} exists...`);
    const project = await prisma.project.findUnique({
      where: { id: PROJECT_ID }
    });

    if (!project) {
      console.error(`Project with ID ${PROJECT_ID} not found!`);
      return;
    }

    console.log(`Project found: ${project.name}`);

    // Create a test roadmap
    console.log('Creating test roadmap...');
    const roadmap = await prisma.roadmap.create({
      data: {
        name: 'Test Roadmap',
        description: 'This is a test roadmap created via script',
        startDate: new Date(),
        endDate: new Date(new Date().setMonth(new Date().getMonth() + 3)),
        projectId: PROJECT_ID
      }
    });

    console.log('Roadmap created successfully!');
    console.log(roadmap);

    // Verify we can fetch the roadmap
    console.log('\nFetching roadmaps for the project...');
    const roadmaps = await prisma.roadmap.findMany({
      where: { projectId: PROJECT_ID }
    });

    console.log(`Found ${roadmaps.length} roadmaps for project ${PROJECT_ID}`);
    roadmaps.forEach(r => console.log(`- ${r.name} (${r.id})`));
  } catch (error) {
    console.error('Error:', error);
  }
}

// Run the test
createTestRoadmap()
  .finally(async () => {
    // Disconnect Prisma client
    await prisma.$disconnect();
    console.log('\nTest completed.');
  }); 