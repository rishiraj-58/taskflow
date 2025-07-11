import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

interface CodeQualityMetrics {
  score: number;
  coverage: number;
  bugs: number;
  technicalDebt: number;
  codeReviews: {
    pending: number;
    completed: number;
    averageTime: number;
  };
}

interface TeamProductivity {
  velocity: number;
  commitFrequency: number;
  codeQuality: number;
  collaboration: number;
  blockers: number;
}

interface ArchitectureInsight {
  id: string;
  type: 'technical_debt' | 'performance' | 'security' | 'maintainability';
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  affectedProjects: string[];
  estimatedEffort: string;
}

interface TeamLeadDashboardData {
  overview: {
    totalProjects: number;
    activeProjects: number;
    teamMembers: number;
    avgCodeQuality: number;
  };
  codeQuality: CodeQualityMetrics;
  teamProductivity: TeamProductivity;
  architectureInsights: ArchitectureInsight[];
  technicalDebt: {
    total: number;
    byCategory: {
      security: number;
      performance: number;
      maintainability: number;
      documentation: number;
    };
    trend: Array<{ date: string; value: number }>;
  };
  codeReviewMetrics: {
    pendingReviews: number;
    avgReviewTime: number;
    reviewThroughput: number;
    qualityGate: {
      passed: number;
      failed: number;
      pending: number;
    };
  };
  teamPerformance: Array<{
    memberId: string;
    name: string;
    role: string;
    productivity: number;
    codeQuality: number;
    velocity: number;
    lastActive: string;
  }>;
  upcomingMilestones: Array<{
    id: string;
    title: string;
    dueDate: string;
    project: string;
    progress: number;
    risk: 'low' | 'medium' | 'high';
  }>;
}

function calculateCodeQualityScore(bugs: any[], tasks: any[], codeReviews: any[]): CodeQualityMetrics {
  const criticalBugs = bugs.filter(bug => bug.severity === 'CRITICAL').length;
  const totalBugs = bugs.length;
  
  // Code quality score algorithm (0-100)
  let qualityScore = 100;
  
  // Deduct for bugs (critical bugs hurt more)
  qualityScore -= criticalBugs * 15;
  qualityScore -= (totalBugs - criticalBugs) * 5;
  
  // Deduct for overdue code reviews
  const overdueReviews = codeReviews.filter(review => 
    new Date(review.dueDate) < new Date()
  ).length;
  qualityScore -= overdueReviews * 8;
  
  // Simulate coverage (would integrate with actual tools)
  const simulatedCoverage = Math.max(65, Math.min(95, 85 + Math.random() * 20 - 10));
  
  // Technical debt calculation (higher task complexity = more debt)
  const complexTasks = tasks.filter(task => task.complexity && task.complexity > 7).length;
  const technicalDebt = complexTasks * 2.5 + criticalBugs * 5;
  
  return {
    score: Math.max(0, Math.min(100, qualityScore)),
    coverage: Math.round(simulatedCoverage),
    bugs: totalBugs,
    technicalDebt: Math.round(technicalDebt),
    codeReviews: {
      pending: codeReviews.filter(review => review.status === 'PENDING').length,
      completed: codeReviews.filter(review => review.status === 'COMPLETED').length,
      averageTime: codeReviews.length > 0 ? 
        Math.round(codeReviews.reduce((sum, review) => sum + (review.reviewTime || 24), 0) / codeReviews.length) : 0
    }
  };
}

function calculateTeamProductivity(members: any[], tasks: any[], activities: any[]): TeamProductivity {
  if (members.length === 0) {
    return {
      velocity: 0,
      commitFrequency: 0,
      codeQuality: 0,
      collaboration: 0,
      blockers: 0
    };
  }

  // Velocity based on completed tasks
  const completedTasks = tasks.filter(task => task.status === 'COMPLETED');
  const daysInPeriod = 30;
  const velocity = completedTasks.length / daysInPeriod * 7; // Tasks per week

  // Simulate commit frequency (would integrate with Git)
  const commitFrequency = Math.round(2 + Math.random() * 8); // 2-10 commits per day

  // Code quality from bug ratio
  const bugTasks = tasks.filter(task => task.type === 'BUG').length;
  const codeQuality = Math.max(0, 100 - (bugTasks / tasks.length * 100));

  // Collaboration from comment activity
  const collaborationScore = Math.min(100, activities.length * 2);

  // Blockers from blocked tasks
  const blockers = tasks.filter(task => task.status === 'BLOCKED').length;

  return {
    velocity: Math.round(velocity * 10) / 10,
    commitFrequency,
    codeQuality: Math.round(codeQuality),
    collaboration: Math.round(collaborationScore),
    blockers
  };
}

function generateArchitectureInsights(projects: any[], bugs: any[], tasks: any[]): ArchitectureInsight[] {
  const insights: ArchitectureInsight[] = [];

  // Performance insights
  const performanceBugs = bugs.filter(bug => 
    bug.title.toLowerCase().includes('performance') || 
    bug.title.toLowerCase().includes('slow')
  );
  
  if (performanceBugs.length > 0) {
    insights.push({
      id: 'perf-1',
      type: 'performance',
      title: 'Performance Optimization Needed',
      description: `${performanceBugs.length} performance-related issues detected across projects`,
      priority: performanceBugs.length > 5 ? 'critical' : 'high',
      affectedProjects: Array.from(new Set(performanceBugs.map(bug => bug.projectId))),
      estimatedEffort: '2-3 weeks'
    });
  }

  // Security insights
  const securityBugs = bugs.filter(bug => 
    bug.severity === 'CRITICAL' && 
    (bug.title.toLowerCase().includes('security') || bug.title.toLowerCase().includes('auth'))
  );
  
  if (securityBugs.length > 0) {
    insights.push({
      id: 'sec-1',
      type: 'security',
      title: 'Critical Security Vulnerabilities',
      description: `${securityBugs.length} critical security issues require immediate attention`,
      priority: 'critical',
      affectedProjects: Array.from(new Set(securityBugs.map(bug => bug.projectId))),
      estimatedEffort: '1-2 weeks'
    });
  }

  // Technical debt from complex tasks
  const complexTasks = tasks.filter(task => task.complexity && task.complexity > 8);
  if (complexTasks.length > 10) {
    insights.push({
      id: 'debt-1',
      type: 'technical_debt',
      title: 'High Complexity Tasks Accumulating',
      description: `${complexTasks.length} highly complex tasks indicate growing technical debt`,
      priority: 'medium',
      affectedProjects: Array.from(new Set(complexTasks.map(task => task.projectId))),
      estimatedEffort: '3-4 weeks'
    });
  }

  // Maintainability insights
  const staleTasks = tasks.filter(task => {
    const daysSinceUpdate = Math.floor((new Date().getTime() - new Date(task.updatedAt).getTime()) / (1000 * 3600 * 24));
    return daysSinceUpdate > 14 && task.status !== 'COMPLETED';
  });

  if (staleTasks.length > 5) {
    insights.push({
      id: 'maint-1',
      type: 'maintainability',
      title: 'Stagnant Work Items',
      description: `${staleTasks.length} tasks haven't been updated in over 2 weeks`,
      priority: 'medium',
      affectedProjects: Array.from(new Set(staleTasks.map(task => task.projectId))),
      estimatedEffort: '1-2 weeks'
    });
  }

  return insights;
}

export async function GET() {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user and their workspaces
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      include: {
        workspaceMember: {
          include: {
            workspace: {
              include: {
                projects: {
                  include: {
                    tasks: {
                      include: {
                        assignee: true,
                        comments: true
                      }
                    },
                    bugs: true
                  }
                },
                members: {
                  include: {
                    user: true
                  }
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

    // Aggregate data across all workspaces
    let allProjects: any[] = [];
    let allTasks: any[] = [];
    let allBugs: any[] = [];
    let allActivities: any[] = [];
    let allMembers: any[] = [];

    user.workspaceMember.forEach((membership: any) => {
      allProjects.push(...membership.workspace.projects);
      membership.workspace.projects.forEach((project: any) => {
        allTasks.push(...project.tasks);
        allBugs.push(...project.bugs);
      });
      // Get workspace members instead of project members
      allMembers.push(...membership.workspace.members.map((m: any) => m.user));
    });

    // Remove duplicates
    allMembers = allMembers.filter((member, index, self) => 
      index === self.findIndex(m => m.id === member.id)
    );

    // Calculate metrics
    const activeProjects = allProjects.filter(p => p.status === 'ACTIVE').length;
    const codeQuality = calculateCodeQualityScore(allBugs, allTasks, []); // Code reviews would be separate model
    const teamProductivity = calculateTeamProductivity(allMembers, allTasks, allActivities);
    const architectureInsights = generateArchitectureInsights(allProjects, allBugs, allTasks);

    // Technical debt calculation
    const technicalDebtData = {
      total: codeQuality.technicalDebt,
      byCategory: {
        security: Math.round(codeQuality.technicalDebt * 0.3),
        performance: Math.round(codeQuality.technicalDebt * 0.4),
        maintainability: Math.round(codeQuality.technicalDebt * 0.2),
        documentation: Math.round(codeQuality.technicalDebt * 0.1)
      },
      trend: Array.from({ length: 30 }, (_, i) => ({
        date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        value: Math.round(codeQuality.technicalDebt * (0.8 + Math.random() * 0.4))
      }))
    };

    // Team performance metrics
    const teamPerformance = allMembers.slice(0, 10).map(member => {
      const memberTasks = allTasks.filter(task => task.assigneeId === member.id);
      const completedTasks = memberTasks.filter(task => task.status === 'COMPLETED').length;
      const totalTasks = memberTasks.length;
      
      return {
        memberId: member.id,
        name: `${member.firstName} ${member.lastName}`,
        role: member.primaryRole || 'DEVELOPER',
        productivity: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
        codeQuality: Math.round(75 + Math.random() * 25), // Simulated
        velocity: Math.round(completedTasks / 7 * 10) / 10, // Tasks per week
        lastActive: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString()
      };
    });

    // Upcoming milestones - simulated since milestones don't exist in current schema
    const upcomingMilestones = allProjects
      .slice(0, 8)
      .map((project, index) => {
        const progress = Math.round(Math.random() * 100);
        const risk: 'low' | 'medium' | 'high' = progress < 30 ? 'high' : progress < 70 ? 'medium' : 'low';
        
        return {
          id: `milestone-${index}`,
          title: `${project.name} Milestone`,
          dueDate: new Date(Date.now() + Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
          project: project.name || 'Unknown',
          progress,
          risk
        };
      });

    const dashboardData: TeamLeadDashboardData = {
      overview: {
        totalProjects: allProjects.length,
        activeProjects,
        teamMembers: allMembers.length,
        avgCodeQuality: codeQuality.score
      },
      codeQuality,
      teamProductivity,
      architectureInsights,
      technicalDebt: technicalDebtData,
      codeReviewMetrics: {
        pendingReviews: Math.round(allMembers.length * 0.3),
        avgReviewTime: 18, // hours
        reviewThroughput: Math.round(allMembers.length * 1.2), // reviews per week
        qualityGate: {
          passed: Math.round(allTasks.length * 0.85),
          failed: Math.round(allTasks.length * 0.10),
          pending: Math.round(allTasks.length * 0.05)
        }
      },
      teamPerformance,
      upcomingMilestones
    };

    return NextResponse.json(dashboardData);

  } catch (error) {
    console.error('Error fetching team lead dashboard data:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 