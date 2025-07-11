'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import Link from 'next/link';
import {
  Calendar,
  Users,
  Target,
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  Activity,
  Plus,
  BarChart3,
  Zap,
  Flag
} from 'lucide-react';

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

export function ProjectManagerDashboard() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const [data, setData] = useState<ProjectManagerDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchProjectManagerData() {
      if (!isLoaded || !isSignedIn) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const token = await getToken();
        const response = await fetch('/api/dashboards/project-manager', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch project manager dashboard data');
        }
        
        const dashboardData = await response.json();
        setData(dashboardData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    }

    fetchProjectManagerData();
  }, [isLoaded, isSignedIn, getToken]);

  const getHealthColor = (health: string) => {
    switch (health.toLowerCase()) {
      case 'excellent':
        return 'bg-green-100 text-green-800';
      case 'good':
        return 'bg-blue-100 text-blue-800';
      case 'at_risk':
        return 'bg-yellow-100 text-yellow-800';
      case 'critical':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk.toLowerCase()) {
      case 'low':
        return 'bg-green-100 text-green-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'high':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'critical':
        return 'bg-red-100 text-red-800';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-200 rounded animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Dashboard</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
            Project Manager Dashboard
          </h1>
          <p className="text-muted-foreground mt-2">
            Sprint planning, team coordination, and project delivery management
          </p>
        </div>
        <div className="flex gap-2 mt-4 md:mt-0">
          <Link href="/sprints/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Sprint
            </Button>
          </Link>
          <Link href="/reports">
            <Button variant="outline">
              <BarChart3 className="mr-2 h-4 w-4" />
              Reports
            </Button>
          </Link>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Projects</p>
                <p className="text-2xl font-bold">{data.overview.activeProjects}</p>
                <p className="text-xs text-muted-foreground">
                  {data.overview.totalProjects} total
                </p>
              </div>
              <Target className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Sprints</p>
                <p className="text-2xl font-bold">{data.overview.activeSprints}</p>
                <p className="text-xs text-muted-foreground">
                  {data.overview.totalSprints} total
                </p>
              </div>
              <Zap className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Team Members</p>
                <p className="text-2xl font-bold">{data.overview.teamMembers}</p>
                <div className="flex items-center text-xs text-purple-600">
                  <Activity className="h-3 w-3 mr-1" />
                  {data.teamWorkload.averageWorkload}% avg load
                </div>
              </div>
              <Users className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Sprint Health</p>
                <p className="text-lg font-bold">{data.sprintProgress.sprintHealth}</p>
                <Badge className={getHealthColor(data.sprintProgress.sprintHealth)}>
                  {data.sprintProgress.currentSprintProgress}% complete
                </Badge>
              </div>
              <CheckCircle className="h-8 w-8 text-emerald-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Risk Level</p>
                <p className="text-lg font-bold">{data.riskAssessment.overallRisk}</p>
                <Badge className={getRiskColor(data.riskAssessment.overallRisk)}>
                  Score: {data.riskAssessment.riskScore}
                </Badge>
              </div>
              <Flag className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Team Workload */}
        <Card className="col-span-2">
          <CardHeader>
            <CardTitle>Team Workload Distribution</CardTitle>
            <CardDescription>Current workload and capacity across team members</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.teamWorkload.workloadDistribution.slice(0, 6).map((member) => (
                <div key={member.memberId} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">{member.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">
                        {member.workload}/{member.capacity}
                      </span>
                      <Badge variant={member.efficiency >= 90 ? 'default' : member.efficiency >= 75 ? 'secondary' : 'destructive'}>
                        {member.efficiency}%
                      </Badge>
                    </div>
                  </div>
                  <Progress 
                    value={(member.workload / member.capacity) * 100} 
                    className="h-2"
                  />
                </div>
              ))}
              
              <div className="pt-4 border-t">
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div className="text-center">
                    <div className="text-lg font-bold">{data.teamWorkload.totalTasks}</div>
                    <div className="text-muted-foreground">Total Tasks</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold">{data.teamWorkload.highPriorityTasks}</div>
                    <div className="text-muted-foreground">High Priority</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold">{data.teamWorkload.teamCapacity}</div>
                    <div className="text-muted-foreground">Team Capacity</div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sprint Progress */}
        <Card>
          <CardHeader>
            <CardTitle>Sprint Progress</CardTitle>
            <CardDescription>Current sprint performance metrics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Progress</span>
                  <span>{data.sprintProgress.currentSprintProgress}%</span>
                </div>
                <Progress value={data.sprintProgress.currentSprintProgress} className="h-3" />
              </div>
              
              <div className="flex justify-between">
                <span className="text-sm font-medium">Average Velocity</span>
                <span className="text-sm font-bold">{data.sprintProgress.averageVelocity}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-sm font-medium">Sprint Health</span>
                <Badge className={getHealthColor(data.sprintProgress.sprintHealth)}>
                  {data.sprintProgress.sprintHealth}
                </Badge>
              </div>

              <div className="pt-4 border-t">
                <p className="text-sm font-medium mb-2">Burndown Status</p>
                <div className="text-xs text-muted-foreground">
                  {data.sprintProgress.burndownData.length > 0 ? 
                    `Day ${data.sprintProgress.burndownData[data.sprintProgress.burndownData.length - 1]?.day || 1} of sprint` :
                    'No burndown data available'
                  }
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Risk Assessment */}
        <Card>
          <CardHeader>
            <CardTitle>Risk Assessment</CardTitle>
            <CardDescription>Current project risks and mitigation</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="p-2 bg-red-50 rounded">
                  <div className="text-red-600 font-bold">{data.riskAssessment.riskFactors.overdueTasks}</div>
                  <div className="text-red-600">Overdue Tasks</div>
                </div>
                <div className="p-2 bg-orange-50 rounded">
                  <div className="text-orange-600 font-bold">{data.riskAssessment.riskFactors.criticalBugs}</div>
                  <div className="text-orange-600">Critical Bugs</div>
                </div>
                <div className="p-2 bg-yellow-50 rounded">
                  <div className="text-yellow-600 font-bold">{data.riskAssessment.riskFactors.stagnantWork}</div>
                  <div className="text-yellow-600">Stagnant Work</div>
                </div>
                <div className="p-2 bg-blue-50 rounded">
                  <div className="text-blue-600 font-bold">{data.riskAssessment.riskFactors.sprintDelays}</div>
                  <div className="text-blue-600">Sprint Delays</div>
                </div>
              </div>

              <div className="pt-4 border-t">
                <p className="text-sm font-medium mb-2">Mitigation Actions</p>
                <div className="space-y-2">
                  {data.riskAssessment.mitigationActions.slice(0, 3).map((action, index) => (
                    <div key={index} className="text-xs p-2 bg-gray-50 rounded">
                      <Badge className={getPriorityColor(action.priority)}>
                        {action.priority}
                      </Badge>
                      <p className="mt-1">{action.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Sprints */}
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Sprints</CardTitle>
            <CardDescription>Planned sprint schedule</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.upcomingSprints.map((sprint) => (
                <div key={sprint.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <h4 className="font-medium text-sm">{sprint.name}</h4>
                    <p className="text-xs text-muted-foreground">
                      {new Date(sprint.startDate).toLocaleDateString()} - {new Date(sprint.endDate).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold">{sprint.plannedStoryPoints} SP</div>
                    <Badge variant="outline" className="text-xs">
                      {sprint.status}
                    </Badge>
                  </div>
                </div>
              ))}
              {data.upcomingSprints.length === 0 && (
                <div className="text-center py-4 text-muted-foreground text-sm">
                  No upcoming sprints scheduled
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Current Blockers */}
        <Card>
          <CardHeader>
            <CardTitle>Current Blockers</CardTitle>
            <CardDescription>Issues requiring immediate attention</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.blockers.map((blocker) => (
                <div key={blocker.id} className="flex items-start justify-between p-2 border rounded">
                  <div className="flex-1">
                    <h4 className="font-medium text-sm">{blocker.title}</h4>
                    <p className="text-xs text-muted-foreground">{blocker.project}</p>
                    <p className="text-xs text-muted-foreground">Assignee: {blocker.assignee}</p>
                  </div>
                  <div className="text-right">
                    <Badge variant={blocker.daysBlocked > 3 ? 'destructive' : 'secondary'}>
                      {blocker.daysBlocked}d
                    </Badge>
                    <div className="text-xs text-muted-foreground mt-1">
                      {blocker.type}
                    </div>
                  </div>
                </div>
              ))}
              {data.blockers.length === 0 && (
                <div className="text-center py-4 text-muted-foreground">
                  <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
                  No current blockers
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 