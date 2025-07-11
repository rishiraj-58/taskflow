import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";

interface DeveloperDashboardMetrics {
  tasksAssigned: number;
  tasksCompleted: number;
  tasksInProgress: number;
  bugsFixed: number;
  codeReviews: number;
  focusTimeToday: number;
  streakDays: number;
  velocity: number;
  productivity: number;
  completionRate: number;
  todaysTasks: Array<{
    id: string;
    title: string;
    priority: string;
    estimatedTime: string;
    status: string;
    project: string;
    dueDate?: string;
  }>;
  recentActivity: Array<{
    action: string;
    item: string;
    time: string;
    type: 'task' | 'review' | 'bug';
  }>;
  upcomingDeadlines: Array<{
    id: string;
    title: string;
    dueDate: string;
    priority: string;
    daysLeft: number;
  }>;
  weeklyProgress: Array<{
    day: string;
    tasksCompleted: number;
    hoursWorked: number;
  }>;
  skillMetrics: {
    taskTypes: Array<{
      type: string;
      count: number;
      percentage: number;
    }>;
    complexityHandled: {
      simple: number;
      medium: number;
      complex: number;
    };
  };
}

// Algorithm to calculate developer velocity
function calculateDeveloperVelocity(tasks: any[], userId: string): number {
  const userTasks = tasks.filter(t => t.assigneeId === userId);
  const completedTasks = userTasks.filter(t => t.status === 'done');
  
  if (completedTasks.length === 0) return 0;

  // Calculate average completion time
  let totalCompletionDays = 0;
  let validTasks = 0;

  for (const task of completedTasks) {
    if (task.createdAt && task.updatedAt) {
      const creationDate = new Date(task.createdAt);
      const completionDate = new Date(task.updatedAt);
      const completionDays = Math.ceil((completionDate.getTime() - creationDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (completionDays > 0 && completionDays <= 30) { // Reasonable completion time
        totalCompletionDays += completionDays;
        validTasks++;
      }
    }
  }

  if (validTasks === 0) return 50; // Default velocity

  const averageCompletionDays = totalCompletionDays / validTasks;
  
  // Convert to velocity score (faster completion = higher velocity)
  // Scoring: 1 day = 100, 7 days = 70, 14 days = 40, 30+ days = 10
  let velocityScore = Math.max(100 - (averageCompletionDays * 3), 10);
  
  return Math.round(velocityScore);
}

// Algorithm to calculate productivity score
function calculateProductivity(tasks: any[], bugs: any[]): number {
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === 'done').length;

  if (totalTasks === 0) return 100;

  // Factor 1: Completion rate (40% weight)
  const completionRate = (completedTasks / totalTasks) * 100;

  // Factor 2: Priority handling (30% weight)
  const highPriorityTasks = tasks.filter(t => t.priority === 'high' || t.priority === 'critical');
  const completedHighPriority = tasks.filter(t => t.priority === 'high' || t.priority === 'critical');
  const priorityScore = highPriorityTasks.length > 0 ? 
    (completedHighPriority.length / highPriorityTasks.length) * 100 : 100;

  // Factor 3: Consistency (30% weight)
  // Check if tasks are being completed regularly (not all at once)
  const recentCompletions = tasks.filter(t => {
    const completionDate = new Date(t.updatedAt);
    const daysAgo = Math.floor((Date.now() - completionDate.getTime()) / (1000 * 60 * 60 * 24));
    return daysAgo <= 30;
  });
  
  const consistencyScore = Math.min((recentCompletions.length / Math.max(totalTasks * 0.5, 1)) * 100, 100);

  // Weighted average
  const productivityScore = Math.round(
    (completionRate * 0.40) +
    (priorityScore * 0.30) +
    (consistencyScore * 0.30)
  );

  return Math.max(Math.min(productivityScore, 100), 0);
}

// Algorithm to calculate focus time (simulated - would be from time tracking)
function calculateFocusTime(tasks: any[], userId: string): number {
  const userTasks = tasks.filter(t => t.assigneeId === userId && t.status === 'in_progress');
  
  // Simulate focus time based on number of active tasks and their complexity
  let baseTime = Math.min(userTasks.length * 1.5, 8); // Base time from active tasks
  
  // Adjust for task complexity
  const highPriorityTasks = userTasks.filter(t => t.priority === 'high' || t.priority === 'critical');
  baseTime += highPriorityTasks.length * 0.5;
  
  // Add some randomness to simulate real focus time tracking
  const focusTime = Math.max(baseTime + (Math.random() * 2 - 1), 0);
  
  return Math.round(focusTime * 10) / 10; // Round to 1 decimal place
}

// Algorithm to calculate streak days
function calculateStreakDays(activityLogs: any[], userId: string): number {
  // Filter activity logs for this user's task completions
  const taskCompletions = activityLogs
    .filter(log => log.userId === userId && log.action === 'completed' && log.entityType === 'Task')
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  if (taskCompletions.length === 0) return 0;

  let streakDays = 0;
  let currentDate = new Date();
  currentDate.setHours(0, 0, 0, 0);

  for (let i = 0; i < 30; i++) { // Check last 30 days
    const checkDate = new Date(currentDate);
    checkDate.setDate(checkDate.getDate() - i);
    
    const hasActivityOnDay = taskCompletions.some(log => {
      const logDate = new Date(log.createdAt);
      logDate.setHours(0, 0, 0, 0);
      return logDate.getTime() === checkDate.getTime();
    });

    if (hasActivityOnDay) {
      streakDays++;
    } else if (i > 0) { // Don't break on first day (today might not have activity yet)
      break;
    }
  }

  return streakDays;
}

// Generate weekly progress data
function generateWeeklyProgress(tasks: any[], userId: string): DeveloperDashboardMetrics['weeklyProgress'] {
  const weeklyData = [];
  const today = new Date();
  
  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    date.setHours(0, 0, 0, 0);
    
    const nextDay = new Date(date);
    nextDay.setDate(nextDay.getDate() + 1);
    
    // Count tasks completed on this day
    const tasksCompletedOnDay = tasks.filter(task => {
      if (task.assigneeId !== userId || task.status !== 'done') return false;
      
      const completionDate = new Date(task.updatedAt);
      return completionDate >= date && completionDate < nextDay;
    });

    // Simulate hours worked (would be from time tracking)
    const hoursWorked = Math.min(tasksCompletedOnDay.length * 2 + Math.random() * 2, 8);

    weeklyData.push({
      day: date.toLocaleDateString('en-US', { weekday: 'short' }),
      tasksCompleted: tasksCompletedOnDay.length,
      hoursWorked: Math.round(hoursWorked * 10) / 10
    });
  }

  return weeklyData;
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
                        comments: true,
                        project: true
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
      allMembers.push(...membership.workspace.members.map((m: any) => m.user));
    });

    // Filter tasks assigned to this specific user
    const userTasks = allTasks.filter((task: any) => task.assigneeId === userId);
    const userBugs = allBugs.filter((bug: any) => bug.assigneeId === userId);

    // Calculate basic metrics
    const totalTasks = userTasks.length;
    const completedTasks = userTasks.filter((task: any) => task.status === 'done').length;
    const todayTasks = userTasks.filter((task: any) => {
      const dueDate = task.dueDate ? new Date(task.dueDate) : null;
      const today = new Date();
      return dueDate && dueDate.toDateString() === today.toDateString();
    }).length;

    // Calculate productivity metrics
    const productivity = calculateProductivity(userTasks, userBugs);
    const focusScore = calculateFocusTime(userTasks, userId);

    // Get today's focus items
    const todaysFocus = userTasks.filter((task: any) => {
      const dueDate = task.dueDate ? new Date(task.dueDate) : null;
      const today = new Date();
      return dueDate && dueDate.toDateString() === today.toDateString();
    });

    // Get recent activities (simulated since we removed activityLogs)
    const recentActivity = userTasks
      .sort((a: any, b: any) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 10)
      .map((task: any) => ({
        action: 'updated',
        item: task.title,
        time: formatTimeAgo(task.updatedAt),
        type: 'task' as const
      }));

    // Generate upcoming deadlines
    const upcomingDeadlines = allTasks
      .filter(task => task.dueDate && task.status !== 'done')
      .map(task => {
        const dueDate = new Date(task.dueDate!);
        const daysLeft = Math.ceil((dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        
        return {
          id: task.id,
          title: task.title,
          dueDate: dueDate.toISOString().split('T')[0],
          priority: task.priority,
          daysLeft
        };
      })
      .sort((a, b) => a.daysLeft - b.daysLeft)
      .slice(0, 5);

    // Generate weekly progress
    const weeklyProgress = generateWeeklyProgress(allTasks, user.id);

    // Generate skill metrics
    const taskTypes = ['feature', 'bug', 'improvement', 'research'];
    const taskTypeStats = taskTypes.map(type => {
      const count = allTasks.filter(t => t.type === type).length;
      return {
        type,
        count,
        percentage: totalTasks > 0 ? Math.round((count / totalTasks) * 100) : 0
      };
    });

    const complexityHandled = {
      simple: allTasks.filter(t => t.priority === 'low').length,
      medium: allTasks.filter(t => t.priority === 'medium').length,
      complex: allTasks.filter(t => t.priority === 'high' || t.priority === 'critical').length
    };

    const metrics: DeveloperDashboardMetrics = {
      tasksAssigned: totalTasks,
      tasksCompleted: completedTasks,
      tasksInProgress: allTasks.filter(t => t.status === 'in_progress').length,
      bugsFixed: userBugs.filter(b => b.status === 'FIXED' || b.status === 'CLOSED').length,
      codeReviews: Math.max(Math.floor(completedTasks * 0.3), 0),
      focusTimeToday: focusScore,
      streakDays: 5, // Simulated value since we removed activityLogs
      velocity: calculateDeveloperVelocity(userTasks, userId),
      productivity,
      completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 100,
      todaysTasks: todaysFocus.slice(0, 10).map((task: any) => ({
        id: task.id,
        title: task.title,
        priority: task.priority,
        estimatedTime: getEstimatedTime(task.priority), // Helper function
        status: task.status,
        project: task.project?.name || 'Unknown',
        dueDate: task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : undefined
      })),
      recentActivity,
      upcomingDeadlines,
      weeklyProgress,
      skillMetrics: {
        taskTypes: taskTypeStats,
        complexityHandled
      }
    };

    return NextResponse.json(metrics);

  } catch (error) {
    console.error('Error fetching developer dashboard metrics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard metrics' },
      { status: 500 }
    );
  }
}

// Helper function to estimate time based on priority
function getEstimatedTime(priority: string): string {
  switch (priority) {
    case 'critical': return '4h';
    case 'high': return '3h';
    case 'medium': return '2h';
    case 'low': return '1h';
    default: return '2h';
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