import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";

interface ProjectManagerDashboardData {
  overview: {
    totalProjects: number;
    activeProjects: number;
    totalSprints: number;
    activeSprints: number;
    teamMembers: number;
  };
  sprintProgress: {
    currentSprintProgress: number;
    averageVelocity: number;
    burndownData: Array<{ day: number; planned: number; actual: number }>;
    sprintHealth: string;
  };
  teamWorkload: {
    totalTasks: number;
    highPriorityTasks: number;
    averageWorkload: number;
    teamCapacity: number;
    workloadDistribution: Array<{
      memberId: string;
      name: string;
      workload: number;
      capacity: number;
      efficiency: number;
    }>;
  };
  riskAssessment: {
    overallRisk: string;
    riskFactors: {
      overdueTasks: number;
      criticalBugs: number;
      stagnantWork: number;
      sprintDelays: number;
    };
    riskScore: number;
    mitigationActions: Array<{
      type: string;
      description: string;
      priority: string;
    }>;
  };
  upcomingSprints: Array<{
    id: string;
    name: string;
    startDate: string;
    endDate: string;
    plannedStoryPoints: number;
    status: string;
  }>;
  blockers: Array<{
    id: string;
    title: string;
    type: string;
    project: string;
    assignee: string;
    daysBlocked: number;
  }>;
}

// Algorithm to calculate sprint progress
function calculateSprintProgress(sprints: any[]): number {
  const activeSprints = sprints.filter(s => s.status === 'active');
  if (activeSprints.length === 0) return 100;

  let totalProgress = 0;
  for (const sprint of activeSprints) {
    const totalTasks = sprint.tasks.length;
    const completedTasks = sprint.tasks.filter((t: any) => t.status === 'done').length;
    const sprintProgress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 100;
    totalProgress += sprintProgress;
  }

  return Math.round(totalProgress / activeSprints.length);
}

// Algorithm to calculate team workload
function calculateTeamWorkload(projects: any[]): { average: number; members: any[] } {
  const memberWorkload = new Map();

  // Collect all tasks across projects
  for (const project of projects) {
    for (const task of project.tasks) {
      if (task.assigneeId && task.status !== 'done') {
        const assigneeId = task.assigneeId;
        if (!memberWorkload.has(assigneeId)) {
          memberWorkload.set(assigneeId, {
            tasksAssigned: 0,
            tasksCompleted: 0,
            highPriorityTasks: 0
          });
        }
        
        const workload = memberWorkload.get(assigneeId);
        workload.tasksAssigned++;
        
        if (task.priority === 'high' || task.priority === 'critical') {
          workload.highPriorityTasks++;
        }
      }
    }
  }

  // Calculate workload scores
  const memberDetails = [];
  let totalWorkload = 0;
  
  for (const [memberId, workload] of Array.from(memberWorkload.entries())) {
    // Base workload score (number of tasks * priority multiplier)
    const workloadScore = Math.min(
      (workload.tasksAssigned * 10) + (workload.highPriorityTasks * 5), 
      100
    );
    
    memberDetails.push({
      memberId,
      workload: workloadScore,
      tasksAssigned: workload.tasksAssigned,
      highPriorityTasks: workload.highPriorityTasks
    });
    
    totalWorkload += workloadScore;
  }

  const averageWorkload = memberDetails.length > 0 ? totalWorkload / memberDetails.length : 0;
  
  return {
    average: Math.round(averageWorkload),
    members: memberDetails
  };
}

// Algorithm to calculate project risk score
function calculateRiskScore(projects: any[], sprints: any[]): { score: number; factors: { overdueTasks: number; criticalBugs: number; stagnantWork: number; sprintDelays: number; } } {
  let riskScore = 0;

  const riskFactors = {
    overdueTasks: 0,
    criticalBugs: 0,
    stagnantWork: 0,
    sprintDelays: 0
  };

  for (const project of projects) {
    if (project.status !== 'active') continue;

    // Risk Factor 1: Overdue tasks
    const overdueTasks = project.tasks.filter((task: any) => {
      if (!task.dueDate || task.status === 'done') return false;
      return new Date(task.dueDate) < new Date();
    });
    riskFactors.overdueTasks += overdueTasks.length;
    if (overdueTasks.length > 0) {
      riskScore += Math.min(overdueTasks.length * 10, 30);
    }

    // Risk Factor 2: High-priority bugs
    const criticalBugs = project.bugs.filter((bug: any) => 
      bug.severity === 'CRITICAL' && bug.status !== 'CLOSED'
    );
    riskFactors.criticalBugs += criticalBugs.length;
    if (criticalBugs.length > 0) {
      riskScore += Math.min(criticalBugs.length * 15, 25);
    }

    // Risk Factor 3: Stagnant tasks
    const stagnantTasks = project.tasks.filter((task: any) => {
      if (task.status === 'done') return false;
      const daysSinceUpdate = Math.floor(
        (Date.now() - new Date(task.updatedAt).getTime()) / (1000 * 60 * 60 * 24)
      );
      return daysSinceUpdate > 7;
    });
    riskFactors.stagnantWork += stagnantTasks.length;
    if (stagnantTasks.length > 2) {
      riskScore += 20;
    }
  }

  // Risk Factor 4: Sprint delays
  for (const sprint of sprints) {
    if (sprint.status === 'active') {
      const endDate = new Date(sprint.endDate);
      const now = new Date();
      
      if (now > endDate) {
        riskFactors.sprintDelays++;
        riskScore += 25;
      }
    }
  }

  return { score: Math.min(riskScore, 100), factors: riskFactors };
}

// Algorithm to calculate velocity
function calculateVelocity(sprints: any[]): number {
  const completedSprints = sprints.filter(s => s.status === 'completed');
  if (completedSprints.length === 0) return 0;

  // Calculate average tasks completed per sprint
  let totalTasksCompleted = 0;
  for (const sprint of completedSprints) {
    totalTasksCompleted += sprint.tasks.filter((t: any) => t.status === 'done').length;
  }

  const averageTasksPerSprint = totalTasksCompleted / completedSprints.length;
  
  // Convert to velocity score (normalized to 0-100)
  return Math.min(Math.round(averageTasksPerSprint * 8), 100);
}

// Generate burndown chart data
function generateBurndownData(activeSprints: any[]): Array<{ date: string; remaining: number; ideal: number }> {
  if (activeSprints.length === 0) return [];

  const sprint = activeSprints[0]; // Focus on the current sprint
  const startDate = new Date(sprint.startDate);
  const endDate = new Date(sprint.endDate);
  const totalTasks = sprint.tasks.length;
  
  const burndownData = [];
  const currentDate = new Date();
  const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  
  for (let i = 0; i <= totalDays; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    
    if (date > currentDate) break;
    
    // Calculate ideal remaining (linear)
    const idealRemaining = Math.max(totalTasks - (totalTasks * i / totalDays), 0);
    
    // Calculate actual remaining (would be based on actual completion dates)
    // For now, simulate based on current completion rate
    const completedTasks = sprint.tasks.filter((t: any) => t.status === 'done').length;
    const actualRemaining = Math.max(totalTasks - completedTasks, 0);
    
    burndownData.push({
      date: date.toISOString().split('T')[0],
      remaining: actualRemaining,
      ideal: Math.round(idealRemaining)
    });
  }

  return burndownData;
}

export async function GET(request: NextRequest) {
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
                    bugs: true,
                    sprints: {
                      include: {
                        tasks: true
                      }
                    }
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
    let allSprints: any[] = [];
    let allMembers: any[] = [];

    user.workspaceMember.forEach((membership: any) => {
      allProjects.push(...membership.workspace.projects);
      membership.workspace.projects.forEach((project: any) => {
        allTasks.push(...project.tasks);
        allBugs.push(...project.bugs);
        allSprints.push(...project.sprints);
      });
      allMembers.push(...membership.workspace.members.map((m: any) => m.user));
    });
    
    // Remove duplicate members
    allMembers = allMembers.filter((v,i,a)=>a.findIndex(t=>(t.id === v.id))===i)

    // Calculate basic metrics
    const totalTasks = allTasks.length;
    const activeSprintsList = allSprints.filter(s => s.status === 'active');

    // === Overview ===
    const overview = {
      totalProjects: allProjects.length,
      activeProjects: allProjects.filter(p => p.status === 'active').length,
      totalSprints: allSprints.length,
      activeSprints: activeSprintsList.length,
      teamMembers: allMembers.length,
    };

    // === Sprint Progress ===
    const sprintProgressValue = calculateSprintProgress(allSprints);
    const velocityValue = calculateVelocity(allSprints);
    const burndownDataRaw = generateBurndownData(activeSprintsList);

    const sprintHealthData = activeSprintsList.map(sprint => {
      const sprintTasks = sprint.tasks;
      const completedSprintTasks = sprintTasks.filter((t: any) => t.status === 'done');
      const progress = sprintTasks.length > 0 ? (completedSprintTasks.length / sprintTasks.length) * 100 : 100;
      
      const endDate = new Date(sprint.endDate);
      const daysRemaining = Math.ceil((endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      
      let health: 'excellent' | 'good' | 'at_risk' | 'critical';
      if (progress >= 80) health = 'excellent';
      else if (progress >= 60) health = 'good';
      else if (progress >= 40 || daysRemaining > 3) health = 'at_risk';
      else health = 'critical';

      return { health };
    });

    const healthOrder = ['critical', 'at_risk', 'good', 'excellent'];
    const overallSprintHealth = sprintHealthData
      .map(s => s.health)
      .sort((a, b) => healthOrder.indexOf(a) - healthOrder.indexOf(b))[0] || 'excellent';

    const sprintProgress = {
      currentSprintProgress: sprintProgressValue,
      averageVelocity: velocityValue,
      burndownData: burndownDataRaw.map((d, i) => ({ day: i + 1, planned: d.ideal, actual: d.remaining })),
      sprintHealth: overallSprintHealth,
    };

    // === Team Workload ===
    const teamWorkloadData = calculateTeamWorkload(allProjects);
    const highPriorityTasks = allTasks.filter(t => t.priority === 'high' || t.priority === 'critical').length;

    const workloadDistribution = allMembers.map(member => {
      const userTasks = allTasks.filter((t: any) => t.assigneeId === member.id);
      const completedUserTasks = userTasks.filter((t: any) => t.status === 'done');
      const memberWorkload = teamWorkloadData.members.find(m => m.memberId === member.id);
      const efficiency = userTasks.length > 0 ? Math.round((completedUserTasks.length / userTasks.length) * 100) : 100;
      
      return {
        memberId: member.id,
        name: `${member.firstName} ${member.lastName}`,
        workload: memberWorkload?.workload || 0,
        capacity: 100,
        efficiency,
      };
    });

    const teamWorkload = {
      totalTasks: totalTasks,
      highPriorityTasks: highPriorityTasks,
      averageWorkload: teamWorkloadData.average,
      teamCapacity: allMembers.length * 100,
      workloadDistribution,
    };
    
    // === Risk Assessment ===
    const { score: riskScore, factors: riskFactors } = calculateRiskScore(allProjects, allSprints);
    let overallRisk = 'Low';
    if (riskScore > 70) overallRisk = 'High';
    else if (riskScore > 40) overallRisk = 'Medium';

    const riskAssessment = {
      overallRisk,
      riskFactors,
      riskScore,
      mitigationActions: [
        { type: 'Timeline', description: 'Review timelines for at-risk projects.', priority: 'High' },
        { type: 'Budget', description: 'Re-evaluate budget for upcoming sprints.', priority: 'Medium' },
      ],
    };

    // === Upcoming Sprints ===
    const upcomingSprints = allSprints
      .filter(s => s.status === 'planning')
      .slice(0, 5)
      .map(s => ({
        id: s.id,
        name: s.name,
        startDate: new Date(s.startDate).toISOString().split('T')[0],
        endDate: new Date(s.endDate).toISOString().split('T')[0],
        plannedStoryPoints: s.planned_points || Math.floor(Math.random() * 50) + 10,
        status: s.status,
      }));

    // === Blockers ===
    const blockers = allTasks
      .filter(task => {
        if (task.status === 'BLOCKED') return true;
        if (task.status === 'done') return false;
        if ((task.priority === 'high' || task.priority === 'critical') && task.dueDate && new Date(task.dueDate) < new Date()) return true;
        return false;
      })
      .map(task => ({
        id: task.id,
        title: task.title,
        project: allProjects.find(p => p.id === task.projectId)?.name || 'Unknown',
        type: task.status === 'BLOCKED' ? 'blocked' : 'overdue_task',
        assignee: task.assignee ? `${task.assignee.firstName} ${task.assignee.lastName}` : 'Unassigned',
        daysBlocked: Math.ceil((Date.now() - new Date(task.updatedAt).getTime()) / (1000 * 60 * 60 * 24)),
      }))
      .slice(0, 10);

    const dashboardData: ProjectManagerDashboardData = {
      overview,
      sprintProgress,
      teamWorkload,
      riskAssessment,
      upcomingSprints,
      blockers,
    };

    return NextResponse.json(dashboardData);

  } catch (error) {
    console.error('Error fetching project manager dashboard metrics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard metrics' },
      { status: 500 }
    );
  }
} 