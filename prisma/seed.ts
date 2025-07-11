import { PrismaClient, UserRole } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Create test users with different roles
  const testUsers = [
    {
      clerkId: 'test_workspace_creator',
      email: 'creator@taskflow.com',
      firstName: 'Sarah',
      lastName: 'Executive',
      primaryRole: UserRole.WORKSPACE_CREATOR,
      aiPreferences: {
        preferredAssistant: 'strategic_advisor',
        contextLevel: 'high'
      },
      dashboardPreferences: {
        theme: 'light',
        layout: 'grid'
      }
    },
    {
      clerkId: 'test_project_manager',
      email: 'pm@taskflow.com',
      firstName: 'Mike',
      lastName: 'Manager',
      primaryRole: UserRole.PROJECT_MANAGER,
      aiPreferences: {
        preferredAssistant: 'project_conductor',
        contextLevel: 'medium'
      },
      dashboardPreferences: {
        theme: 'dark',
        layout: 'list'
      }
    },
    {
      clerkId: 'test_developer',
      email: 'dev@taskflow.com',
      firstName: 'Alex',
      lastName: 'Developer',
      primaryRole: UserRole.DEVELOPER,
      aiPreferences: {
        preferredAssistant: 'code_companion',
        contextLevel: 'detailed'
      },
      dashboardPreferences: {
        theme: 'dark',
        layout: 'focus'
      }
    },
    {
      clerkId: 'test_stakeholder',
      email: 'stakeholder@taskflow.com',
      firstName: 'Emma',
      lastName: 'Stakeholder',
      primaryRole: UserRole.STAKEHOLDER,
      aiPreferences: {
        preferredAssistant: 'business_translator',
        contextLevel: 'summary'
      },
      dashboardPreferences: {
        theme: 'light',
        layout: 'cards'
      }
    },
    {
      clerkId: 'test_team_lead',
      email: 'lead@taskflow.com',
      firstName: 'David',
      lastName: 'Lead',
      primaryRole: UserRole.TEAM_LEAD,
      aiPreferences: {
        preferredAssistant: 'technical_architect',
        contextLevel: 'detailed'
      },
      dashboardPreferences: {
        theme: 'dark',
        layout: 'dashboard'
      }
    }
  ];

  // Create or update test users
  let creatorUser;
  for (const userData of testUsers) {
    const user = await prisma.user.upsert({
      where: { clerkId: userData.clerkId },
      update: userData,
      create: userData,
    });
    if (userData.clerkId === 'test_workspace_creator') {
      creatorUser = user;
    }
    console.log(`✅ Created/updated user: ${userData.firstName} ${userData.lastName} (${userData.primaryRole})`);
  }

  // Create test workspace
  const testWorkspace = await prisma.workspace.upsert({
    where: { id: 'test-workspace-1' },
    update: {},
    create: {
      id: 'test-workspace-1',
      name: 'TaskFlow Demo Workspace',
      description: 'A demonstration workspace with all role types',
      createdBy: creatorUser!.id,
    },
  });
  console.log('✅ Created test workspace');

  // Get all users for workspace memberships
  const allUsers = await prisma.user.findMany({
    where: {
      clerkId: {
        in: ['test_workspace_creator', 'test_project_manager', 'test_developer', 'test_stakeholder', 'test_team_lead']
      }
    }
  });

  // Create workspace memberships for all test users
  const workspaceMemberships = [
    { clerkId: 'test_workspace_creator', role: 'ADMIN' },
    { clerkId: 'test_project_manager', role: 'MEMBER' },
    { clerkId: 'test_developer', role: 'MEMBER' },
    { clerkId: 'test_stakeholder', role: 'MEMBER' },
    { clerkId: 'test_team_lead', role: 'MEMBER' },
  ];

  for (const membership of workspaceMemberships) {
    const user = allUsers.find(u => u.clerkId === membership.clerkId);
    if (user) {
      await prisma.workspaceMember.upsert({
        where: {
          workspaceId_userId: {
            workspaceId: testWorkspace.id,
            userId: user.id,
          },
        },
        update: {},
        create: {
          workspaceId: testWorkspace.id,
          userId: user.id,
          role: membership.role as any,
        },
      });
    }
  }
  console.log('✅ Created workspace memberships');

  // Create test project
  const pmUser = allUsers.find(u => u.clerkId === 'test_project_manager');
  const testProject = await prisma.project.upsert({
    where: { id: 'test-project-1' },
    update: {},
    create: {
      id: 'test-project-1',
      name: 'TaskFlow Mobile App',
      description: 'A mobile application for TaskFlow',
      workspaceId: testWorkspace.id,
      ownerId: pmUser!.id,
    },
  });
  console.log('✅ Created test project');

  console.log('🎉 Database seeding completed!');
  console.log('\n📊 Test Accounts Created:');
  console.log('- creator@taskflow.com (Workspace Creator)');
  console.log('- pm@taskflow.com (Project Manager)');
  console.log('- dev@taskflow.com (Developer)');
  console.log('- stakeholder@taskflow.com (Stakeholder)');
  console.log('- lead@taskflow.com (Team Lead)');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 