// Script to delete the test roadmap
const { PrismaClient } = require('@prisma/client');

// Create a new PrismaClient instance
const prisma = new PrismaClient({ log: ['info', 'error'] });

// ID of the roadmap to delete
const ROADMAP_ID = '18e21aa9-63ca-4d1b-8d8f-5cc9fe90e43f'; // Replace with your test roadmap ID

async function deleteTestRoadmap() {
  try {
    console.log(`Deleting roadmap with ID: ${ROADMAP_ID}`);
    
    // Delete the roadmap
    const deletedRoadmap = await prisma.roadmap.delete({
      where: { id: ROADMAP_ID }
    });
    
    console.log('Roadmap deleted successfully:', deletedRoadmap.name);
  } catch (error) {
    console.error('Error deleting roadmap:', error);
  }
}

// Run the deletion
deleteTestRoadmap()
  .finally(async () => {
    await prisma.$disconnect();
    console.log('Cleanup completed.');
  }); 