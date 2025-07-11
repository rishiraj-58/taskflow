import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";

interface StakeholderDashboardData {
  overview: {
    totalProjects: number;
    activeProjects: number;
    completedProjects: number;
    totalInvestment: number;
  };
  roi: {
    currentROI: number;
    expectedROI: number;
    trendDirection: 'up' | 'down' | 'stable';
    quarterlyGrowth: number;
  };
  budgetTracking: {
    totalBudget: number;
    spentAmount: number;
    utilization: number;
    projectedSpend: number;
    remainingBudget: number;
  };
  riskAssessment: {
    budgetRisk: 'low' | 'medium' | 'high';
    timelineRisk: 'low' | 'medium' | 'high';
    qualityRisk: 'low' | 'medium' | 'high';
    resourceRisk: 'low' | 'medium' | 'high';
    overallRiskScore: number;
  };
  projectTimelines: Array<{
    projectId: string;
    name: string;
    startDate: string;
    expectedEndDate: string;
    currentProgress: number;
    status: 'on_track' | 'at_risk' | 'delayed';
    milestoneCompletion: number;
  }>;
  deliverables: Array<{
    id: string;
    title: string;
    type: string;
    dueDate: string;
    status: 'completed' | 'in_progress' | 'pending';
    project: string;
    impact: 'high' | 'medium' | 'low';
  }>;
  businessImpact: {
    userReach: number;
    satisfactionScore: number;
    featureAdoption: number;
    marketExpansion: number;
  };
}

// Algorithm to calculate ROI metrics
function calculateROIMetrics(projects: any[]): StakeholderDashboardData['roi'] {
  const totalInvestment = projects.reduce((sum, p) => sum + (p.estimated_budget || 50000), 0);
  const actualSpend = projects.reduce((sum, p) => sum + (p.actual_budget || 0), 0);

  // Mocking value for now, as it's a business metric
  const totalValue = actualSpend * 1.5; 
  
  const currentROI = totalInvestment > 0 ? ((totalValue - totalInvestment) / totalInvestment) * 100 : 0;
  
  return {
    currentROI: Math.round(currentROI),
    expectedROI: 25, // Mocked
    trendDirection: 'up', // Mocked
    quarterlyGrowth: 5, // Mocked
  };
}

// Algorithm to identify risks
function calculateRiskAssessment(projects: any[], tasks: any[], bugs: any[]): StakeholderDashboardData['riskAssessment'] {
  let budgetRisk: 'low' | 'medium' | 'high' = 'low';
  const overBudgetProjects = projects.filter(p => p.actual_budget > p.estimated_budget).length;
  if (overBudgetProjects / projects.length > 0.3) budgetRisk = 'high';
  else if (overBudgetProjects / projects.length > 0.1) budgetRisk = 'medium';

  let timelineRisk: 'low' | 'medium' | 'high' = 'low';
  const delayedProjects = projects.filter(p => new Date(p.target_end_date) < new Date() && p.status !== 'completed').length;
  if (delayedProjects / projects.length > 0.3) timelineRisk = 'high';
  else if (delayedProjects / projects.length > 0.1) timelineRisk = 'medium';

  let qualityRisk: 'low' | 'medium' | 'high' = 'low';
  const criticalBugs = bugs.filter(b => b.severity === 'CRITICAL' && b.status !== 'CLOSED').length;
  if (criticalBugs > 5) qualityRisk = 'high';
  else if (criticalBugs > 1) qualityRisk = 'medium';
  
  return {
    budgetRisk,
    timelineRisk,
    qualityRisk,
    resourceRisk: 'low', // Mocked
    overallRiskScore: (overBudgetProjects + delayedProjects + criticalBugs) * 5, // Simplified score
  };
}

// Generate project timelines
function generateProjectTimelines(projects: any[]): StakeholderDashboardData['projectTimelines'] {
  return projects
    .filter(p => p.status === 'active')
    .slice(0, 5)
    .map(project => {
      const startDate = new Date(project.start_date || project.createdAt);
      const endDate = new Date(project.target_end_date);
      
      const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      const daysPassed = Math.ceil((Date.now() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      const progress = Math.min(Math.max(Math.round((daysPassed / totalDays) * 100), 0), 100);
      
      let status: 'on_track' | 'at_risk' | 'delayed' = 'on_track';
      if (progress < 80 && new Date() > endDate) status = 'delayed';
      else if (progress < 50 && daysPassed / totalDays > 0.6) status = 'at_risk';

      return {
        projectId: project.id,
        name: project.name,
        startDate: formatDate(startDate),
        expectedEndDate: formatDate(endDate),
        currentProgress: progress,
        status,
        milestoneCompletion: Math.round(progress * 0.8) // Mocked
      };
    });
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
                projects: {
                  include: { tasks: true, bugs: true }
                }
              }
            }
          }
        }
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    let allProjects: any[] = [], allTasks: any[] = [], allBugs: any[] = [];
    user.workspaceMember.forEach(m => {
      allProjects.push(...m.workspace.projects);
      m.workspace.projects.forEach(p => {
        allTasks.push(...p.tasks);
        allBugs.push(...p.bugs);
      });
    });

    // === Calculations ===
    const totalInvestment = allProjects.reduce((sum, p) => sum + (p.estimated_budget || 50000), 0);
    const totalBudget = allProjects.reduce((sum, p) => sum + (p.estimated_budget || 50000), 0);
    const spentAmount = allProjects.reduce((sum, p) => sum + (p.actual_budget || 35000), 0);

    const deliverables = allTasks
      .filter(t => t.type === 'epic' || t.priority === 'highest')
      .slice(0, 10)
      .map(t => ({
        id: t.id,
        title: t.title,
        type: t.type,
        dueDate: formatDate(t.dueDate || new Date()),
        status: t.status === 'done' ? 'completed' : 'in_progress' as any,
        project: allProjects.find(p => p.id === t.projectId)?.name || 'N/A',
        impact: t.priority === 'highest' ? 'high' : 'medium' as any
      }));

    const dashboardData: StakeholderDashboardData = {
      overview: {
        totalProjects: allProjects.length,
        activeProjects: allProjects.filter(p => p.status === 'active').length,
        completedProjects: allProjects.filter(p => p.status === 'completed').length,
        totalInvestment
      },
      roi: calculateROIMetrics(allProjects),
      budgetTracking: {
        totalBudget,
        spentAmount,
        utilization: totalBudget > 0 ? Math.round((spentAmount / totalBudget) * 100) : 0,
        projectedSpend: spentAmount * 1.1, // Mocked
        remainingBudget: totalBudget - spentAmount
      },
      riskAssessment: calculateRiskAssessment(allProjects, allTasks, allBugs),
      projectTimelines: generateProjectTimelines(allProjects),
      deliverables,
      businessImpact: { // Mocked as no schema support
        userReach: 120000,
        satisfactionScore: 89,
        featureAdoption: 65,
        marketExpansion: 12
      }
    };

    return NextResponse.json(dashboardData);
  } catch (error) {
    console.error('Error fetching stakeholder dashboard metrics:', error);
    return NextResponse.json({ error: 'Failed to fetch dashboard metrics' }, { status: 500 });
  }
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
} 