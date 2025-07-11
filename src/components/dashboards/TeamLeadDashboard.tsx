'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import Link from 'next/link';
import {
  Code,
  Users,
  Target,
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  Activity,
  BarChart3,
  GitBranch,
  Shield,
  Wrench
} from 'lucide-react';

interface TeamLeadDashboardData {
  overview: {
    totalProjects: number;
    activeProjects: number;
    teamMembers: number;
    avgCodeQuality: number;
  };
  codeQuality: {
    score: number;
    coverage: number;
    bugs: number;
    technicalDebt: number;
    codeReviews: {
      pending: number;
      completed: number;
      averageTime: number;
    };
  };
  teamProductivity: {
    velocity: number;
    commitFrequency: number;
    codeQuality: number;
    collaboration: number;
    blockers: number;
  };
  architectureInsights: Array<{
    id: string;
    type: 'technical_debt' | 'performance' | 'security' | 'maintainability';
    title: string;
    description: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
    affectedProjects: string[];
    estimatedEffort: string;
  }>;
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

export function TeamLeadDashboard() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const [data, setData] = useState<TeamLeadDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchTeamLeadData() {
      if (!isLoaded || !isSignedIn) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const token = await getToken();
        const response = await fetch('/api/dashboards/team-lead', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch team lead dashboard data');
        }
        
        const dashboardData = await response.json();
        setData(dashboardData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    }

    fetchTeamLeadData();
  }, [isLoaded, isSignedIn, getToken]);

  const getQualityColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 75) return 'text-yellow-600';
    return 'text-red-600';
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

  const getRiskColor = (risk: string) => {
    switch (risk.toLowerCase()) {
      case 'high':
        return 'bg-red-100 text-red-800';
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
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            Team Lead Dashboard
          </h1>
          <p className="text-muted-foreground mt-2">
            Technical guidance, code quality metrics, and architecture insights
          </p>
        </div>
        <div className="flex gap-2 mt-4 md:mt-0">
          <Link href="/code-review">
            <Button>
              <GitBranch className="mr-2 h-4 w-4" />
              Code Reviews
            </Button>
          </Link>
          <Link href="/architecture">
            <Button variant="outline">
              <BarChart3 className="mr-2 h-4 w-4" />
              Architecture
            </Button>
          </Link>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Projects</p>
                <p className="text-2xl font-bold">{data.overview.activeProjects}</p>
                <p className="text-xs text-muted-foreground">
                  {data.overview.totalProjects} total projects
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
                <p className="text-sm font-medium text-muted-foreground">Team Members</p>
                <p className="text-2xl font-bold">{data.overview.teamMembers}</p>
                <div className="flex items-center text-xs text-green-600">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  {data.teamProductivity.velocity} velocity
                </div>
              </div>
              <Users className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Code Quality</p>
                <p className="text-2xl font-bold">{data.codeQuality.score}%</p>
                <Badge className={`${getQualityColor(data.codeQuality.score)} bg-opacity-10`}>
                  {data.codeQuality.score >= 90 ? 'Excellent' : 
                   data.codeQuality.score >= 75 ? 'Good' : 'Needs Work'}
                </Badge>
              </div>
              <Code className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Technical Debt</p>
                <p className="text-2xl font-bold">{data.technicalDebt.total}</p>
                <div className="flex items-center text-xs text-orange-600">
                  <Wrench className="h-3 w-3 mr-1" />
                  {data.codeQuality.bugs} bugs
                </div>
              </div>
              <AlertTriangle className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Architecture Insights */}
        <Card className="col-span-2">
          <CardHeader>
            <CardTitle>Architecture Insights</CardTitle>
            <CardDescription>Critical technical issues requiring attention</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.architectureInsights.slice(0, 4).map((insight) => (
                <div key={insight.id} className="flex items-start justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {insight.type === 'security' && <Shield className="h-4 w-4 text-red-500" />}
                      {insight.type === 'performance' && <TrendingUp className="h-4 w-4 text-yellow-500" />}
                      {insight.type === 'technical_debt' && <Wrench className="h-4 w-4 text-orange-500" />}
                      {insight.type === 'maintainability' && <Code className="h-4 w-4 text-blue-500" />}
                      <h4 className="font-medium text-sm">{insight.title}</h4>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">{insight.description}</p>
                    <div className="flex items-center gap-2">
                      <Badge className={getPriorityColor(insight.priority)}>
                        {insight.priority}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {insight.estimatedEffort}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
              {data.architectureInsights.length === 0 && (
                <div className="text-center py-4 text-muted-foreground">
                  <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
                  No critical architecture issues detected
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Code Review Metrics */}
        <Card>
          <CardHeader>
            <CardTitle>Code Reviews</CardTitle>
            <CardDescription>Review workflow and quality gates</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-sm font-medium">Pending Reviews</span>
                <span className="text-sm font-bold">{data.codeReviewMetrics.pendingReviews}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-sm font-medium">Avg Review Time</span>
                <span className="text-sm font-bold">{data.codeReviewMetrics.avgReviewTime}h</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-sm font-medium">Weekly Throughput</span>
                <span className="text-sm font-bold">{data.codeReviewMetrics.reviewThroughput}</span>
              </div>

              <div className="pt-2 border-t">
                <p className="text-sm font-medium mb-2">Quality Gate Status</p>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="text-center p-2 bg-green-50 rounded">
                    <div className="text-green-600 font-bold">{data.codeReviewMetrics.qualityGate.passed}</div>
                    <div className="text-green-600">Passed</div>
                  </div>
                  <div className="text-center p-2 bg-red-50 rounded">
                    <div className="text-red-600 font-bold">{data.codeReviewMetrics.qualityGate.failed}</div>
                    <div className="text-red-600">Failed</div>
                  </div>
                  <div className="text-center p-2 bg-yellow-50 rounded">
                    <div className="text-yellow-600 font-bold">{data.codeReviewMetrics.qualityGate.pending}</div>
                    <div className="text-yellow-600">Pending</div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Technical Debt Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Technical Debt</CardTitle>
            <CardDescription>Debt categorization and trends</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Security</span>
                  <span>{data.technicalDebt.byCategory.security}</span>
                </div>
                <Progress value={(data.technicalDebt.byCategory.security / data.technicalDebt.total) * 100} className="h-2" />
              </div>
              
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Performance</span>
                  <span>{data.technicalDebt.byCategory.performance}</span>
                </div>
                <Progress value={(data.technicalDebt.byCategory.performance / data.technicalDebt.total) * 100} className="h-2" />
              </div>
              
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Maintainability</span>
                  <span>{data.technicalDebt.byCategory.maintainability}</span>
                </div>
                <Progress value={(data.technicalDebt.byCategory.maintainability / data.technicalDebt.total) * 100} className="h-2" />
              </div>
              
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Documentation</span>
                  <span>{data.technicalDebt.byCategory.documentation}</span>
                </div>
                <Progress value={(data.technicalDebt.byCategory.documentation / data.technicalDebt.total) * 100} className="h-2" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Team Performance */}
        <Card>
          <CardHeader>
            <CardTitle>Team Performance</CardTitle>
            <CardDescription>Individual team member metrics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.teamPerformance.slice(0, 6).map((member) => (
                <div key={member.memberId} className="flex items-center justify-between p-2 border rounded">
                  <div className="flex-1">
                    <h4 className="font-medium text-sm">{member.name}</h4>
                    <p className="text-xs text-muted-foreground">{member.role}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold">{member.productivity}%</div>
                    <div className="text-xs text-muted-foreground">{member.velocity} t/w</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Milestones */}
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Milestones</CardTitle>
            <CardDescription>Project milestones and risk assessment</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.upcomingMilestones.slice(0, 5).map((milestone) => (
                <div key={milestone.id} className="flex items-center justify-between p-2 border rounded">
                  <div className="flex-1">
                    <h4 className="font-medium text-sm">{milestone.title}</h4>
                    <p className="text-xs text-muted-foreground">{milestone.project}</p>
                  </div>
                  <div className="text-right">
                    <Badge className={getRiskColor(milestone.risk)}>
                      {milestone.risk}
                    </Badge>
                    <div className="text-xs text-muted-foreground mt-1">
                      {milestone.progress}%
                    </div>
                  </div>
                </div>
              ))}
              {data.upcomingMilestones.length === 0 && (
                <div className="text-center py-4 text-muted-foreground text-sm">
                  No upcoming milestones
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 