import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";

interface ExecutiveDashboardData {
  overview: {
    totalProjects: number;
    activeProjects: number;
    completedProjects: number;
    totalTeamMembers: number;
  };
  portfolioHealth: {
    score: number;
    status: string;
    factors: {
      completion: number;
      bugSeverity: number;
      velocity: number;
      stagnation: number;
      workload: number;
    };
  };
  resourceUtilization: {
    teamUtilization: number;
    budgetSpent: number;
    timeAllocation: Array<{ category: string; percentage: number }>;
  };
  strategicMetrics: {
    onTimeDelivery: number;
    qualityScore: number;
    teamSatisfaction: number;
    innovation: number;
  };
  strategicActions: Array<{
    id: string;
    type: string;
    title: string;
    description: string;
    priority: string;
    impact: string;
  }>;
  activitySummary: Array<{
    id: string;
    type: string;
    title: string;
    timestamp: string;
    workspace: string;
  }>;
}

// Algorithm to calculate portfolio health score (0-100)
function calculatePortfolioHealth(projects: any[], bugs: any[], tasks: any[]): ExecutiveDashboardData['portfolioHealth'] {
  if (projects.length === 0) {
    return {
      score: 100,
      status: 'Excellent',
      factors: { completion: 100, bugSeverity: 100, velocity: 100, stagnation: 100, workload: 100 }
    };
  }

  // Factor 1: Project completion rate
  const completedProjects = projects.filter(p => p.status === 'completed').length;
  const activeProjects = projects.filter(p => p.status === 'active').length;
  const completionRate = activeProjects > 0 ? (completedProjects / (completedProjects + activeProjects)) * 100 : 100;
  const completionScore = Math.min(completionRate * 1.2, 100);
  
  // Factor 2: Bug severity impact
  const criticalBugs = bugs.filter(b => b.severity === 'CRITICAL' && b.status !== 'CLOSED').length;
  const highBugs = bugs.filter(b => b.severity === 'HIGH' && b.status !== 'CLOSED').length;
  const totalOpenBugs = bugs.filter(b => b.status !== 'CLOSED').length;
  
  let bugScore = 100;
  if (totalOpenBugs > 0) {
    const bugImpact = (criticalBugs * 10 + highBugs * 5 + (totalOpenBugs - criticalBugs - highBugs) * 1);
    bugScore = Math.max(100 - (bugImpact * 2), 0);
  }
  
  // Factor 3: Task velocity
  const completedTasks = tasks.filter(t => t.status === 'done').length;
  const totalTasks = tasks.length;
  const velocityScore = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 100;
  
  // Factor 4: Project age and stagnation
  const now = new Date();
  let stagnationScore = 100;
  projects.forEach(project => {
    if (project.status === 'active') {
      const daysSinceUpdate = Math.floor((now.getTime() - new Date(project.updatedAt).getTime()) / (1000 * 60 * 60 * 24));
      if (daysSinceUpdate > 14) stagnationScore -= 10;
    }
  });
  
  // Factor 5: Team workload balance (Placeholder)
  const workloadScore = 85;
  
  // Weighted average
  const healthScore = Math.round(
    (completionScore * 0.30) +
    (bugScore * 0.25) +
    (velocityScore * 0.20) +
    (stagnationScore * 0.15) +
    (workloadScore * 0.10)
  );
  
  const score = Math.max(Math.min(healthScore, 100), 0);
  let status = 'Excellent';
  if (score < 70) status = 'At Risk';
  if (score < 50) status = 'Critical';

  return {
    score,
    status,
    factors: {
      completion: Math.round(completionScore),
      bugSeverity: Math.round(bugScore),
      velocity: Math.round(velocityScore),
      stagnation: Math.round(stagnationScore),
      workload: Math.round(workloadScore)
    }
  };
}

// Algorithm to calculate on-time delivery rate
function calculateOnTimeDelivery(projects: any[], tasks: any[]): number {
  const completedItems = [...projects, ...tasks].filter(item => 
    (item.status === 'completed' || item.status === 'done') && item.dueDate
  );
  if (completedItems.length === 0) return 100;
  const onTimeCount = completedItems.filter(item => new Date(item.updatedAt) <= new Date(item.dueDate)).length;
  return Math.round((onTimeCount / completedItems.length) * 100);
}

// Algorithm to identify strategic actions
function identifyStrategicActions(projects: any[], bugs: any[]): ExecutiveDashboardData['strategicActions'] {
  const actions: ExecutiveDashboardData['strategicActions'] = [];
  
  const stagnantProjects = projects.filter(p => p.status === 'active' && (Date.now() - new Date(p.updatedAt).getTime()) > 14 * 24 * 60 * 60 * 1000);
  if (stagnantProjects.length > 0) {
    actions.push({
      id: 'strat-1', type: 'risk', title: 'Address Stagnant Projects',
      description: `${stagnantProjects.length} projects need attention due to inactivity.`,
      priority: 'high', impact: 'Delayed delivery'
    });
  }

  const criticalBugs = bugs.filter(b => b.severity === 'CRITICAL' && b.status !== 'CLOSED');
  if (criticalBugs.length > 0) {
    actions.push({
      id: 'strat-2', type: 'risk', title: 'Resolve Critical Bugs',
      description: `${criticalBugs.length} critical bugs are impacting platform stability.`,
      priority: 'critical', impact: 'User trust and stability'
    });
  }
  
  const highHealthProjects = projects.filter(p => p.health_score > 90).length;
  if (highHealthProjects > 0) {
    actions.push({
      id: 'strat-3', type: 'opportunity', title: 'Leverage Successful Projects',
      description: `Analyze patterns from ${highHealthProjects} high-performing projects to replicate success.`,
      priority: 'medium', impact: 'Increased ROI'
    });
  }

  return actions.slice(0, 4);
}

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      include: {
        workspaceMember: {
          include: {
            workspace: {
              include: {
                members: { include: { user: true } },
                projects: { include: { tasks: true, bugs: true } }
              }
            }
          }
        }
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    let allProjects: any[] = [], allTasks: any[] = [], allBugs: any[] = [], allMembers: any[] = [];
    user.workspaceMember.forEach(membership => {
      const { workspace } = membership;
      allProjects.push(...workspace.projects);
      workspace.projects.forEach(p => {
        allTasks.push(...p.tasks);
        allBugs.push(...p.bugs);
      });
      allMembers.push(...workspace.members);
    });
    
    allMembers = allMembers.filter((v,i,a)=>a.findIndex(t=>(t.userId === v.userId))===i);

    // === Calculations ===
    const portfolioHealth = calculatePortfolioHealth(allProjects, allBugs, allTasks);
    const totalBudget = allProjects.reduce((sum, p) => sum + (p.estimated_budget || 50000), 0);
    const budgetSpent = allProjects.reduce((sum, p) => sum + (p.actual_budget || 35000), 0);
    const onTimeDelivery = calculateOnTimeDelivery(allProjects, allTasks);
    const qualityScore = portfolioHealth.factors.bugSeverity;
    const teamUtilization = allMembers.length > 0 ? Math.round(allTasks.filter(t => t.assigneeId).length / (allMembers.length * 10) * 100) : 75;

    // === Construct Response ===
    const dashboardData: ExecutiveDashboardData = {
      overview: {
        totalProjects: allProjects.length,
        activeProjects: allProjects.filter(p => p.status === 'active').length,
        completedProjects: allProjects.filter(p => p.status === 'completed').length,
        totalTeamMembers: allMembers.length,
      },
      portfolioHealth,
      resourceUtilization: {
        teamUtilization,
        budgetSpent,
        timeAllocation: [ // Mocked as schema doesn't support this yet
          { category: 'Development', percentage: 60 },
          { category: 'Planning', percentage: 15 },
          { category: 'Testing', percentage: 25 },
        ],
      },
      strategicMetrics: {
        onTimeDelivery,
        qualityScore,
        teamSatisfaction: 88, // Mocked
        innovation: 15, // Mocked
      },
      strategicActions: identifyStrategicActions(allProjects, allBugs),
      activitySummary: [], // Mocked
    };

    return NextResponse.json(dashboardData);

  } catch (error) {
    console.error('Error fetching executive dashboard metrics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard metrics' },
      { status: 500 }
    );
  }
}

// Helper function to format time ago
function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
  const diffInDays = Math.floor(diffInHours / 24);

  if (diffInHours < 1) return 'Just now';
  if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
  if (diffInDays < 7) return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
  return date.toLocaleDateString();
} 