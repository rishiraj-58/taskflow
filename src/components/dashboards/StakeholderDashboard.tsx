'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import Link from 'next/link';
import {
  DollarSign,
  Calendar,
  Target,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  Activity,
  BarChart3,
  FileText,
  Users,
  Clock
} from 'lucide-react';

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

export function StakeholderDashboard() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const [data, setData] = useState<StakeholderDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStakeholderData() {
      if (!isLoaded || !isSignedIn) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const token = await getToken();
        const response = await fetch('/api/dashboards/stakeholder', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch stakeholder dashboard data');
        }
        
        const dashboardData = await response.json();
        setData(dashboardData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    }

    fetchStakeholderData();
  }, [isLoaded, isSignedIn, getToken]);

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'on_track':
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'at_risk':
        return 'bg-yellow-100 text-yellow-800';
      case 'delayed':
      case 'pending':
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

  const getImpactColor = (impact: string) => {
    switch (impact.toLowerCase()) {
      case 'high':
        return 'bg-purple-100 text-purple-800';
      case 'medium':
        return 'bg-blue-100 text-blue-800';
      case 'low':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
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
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-green-600 to-teal-600 bg-clip-text text-transparent">
            Stakeholder Dashboard
          </h1>
          <p className="text-muted-foreground mt-2">
            Project transparency, ROI tracking, and business impact insights
          </p>
        </div>
        <div className="flex gap-2 mt-4 md:mt-0">
          <Link href="/reports/business">
            <Button>
              <FileText className="mr-2 h-4 w-4" />
              Business Report
            </Button>
          </Link>
          <Link href="/analytics/roi">
            <Button variant="outline">
              <BarChart3 className="mr-2 h-4 w-4" />
              ROI Analytics
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
                <p className="text-sm font-medium text-muted-foreground">Total Investment</p>
                <p className="text-2xl font-bold">{formatCurrency(data.overview.totalInvestment)}</p>
                <p className="text-xs text-muted-foreground">
                  {data.overview.activeProjects} active projects
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Current ROI</p>
                <p className="text-2xl font-bold">{data.roi.currentROI}%</p>
                <div className={`flex items-center text-xs ${
                  data.roi.trendDirection === 'up' ? 'text-green-600' : 
                  data.roi.trendDirection === 'down' ? 'text-red-600' : 'text-gray-600'
                }`}>
                  {data.roi.trendDirection === 'up' && <TrendingUp className="h-3 w-3 mr-1" />}
                  {data.roi.trendDirection === 'down' && <TrendingDown className="h-3 w-3 mr-1" />}
                  {data.roi.quarterlyGrowth > 0 ? '+' : ''}{data.roi.quarterlyGrowth}% quarterly
                </div>
              </div>
              <TrendingUp className={`h-8 w-8 ${
                data.roi.trendDirection === 'up' ? 'text-green-600' : 
                data.roi.trendDirection === 'down' ? 'text-red-600' : 'text-yellow-600'
              }`} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Budget Utilization</p>
                <p className="text-2xl font-bold">{data.budgetTracking.utilization}%</p>
                <Badge className={data.budgetTracking.utilization > 90 ? 'bg-red-100 text-red-800' : 
                                 data.budgetTracking.utilization > 75 ? 'bg-yellow-100 text-yellow-800' : 
                                 'bg-green-100 text-green-800'}>
                  {formatCurrency(data.budgetTracking.remainingBudget)} remaining
                </Badge>
              </div>
              <BarChart3 className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Project Health</p>
                <p className="text-2xl font-bold">{data.riskAssessment.overallRiskScore}/100</p>
                <div className="flex items-center text-xs text-blue-600">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  {data.overview.completedProjects} completed
                </div>
              </div>
              <Target className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Project Timelines */}
        <Card className="col-span-2">
          <CardHeader>
            <CardTitle>Project Timelines</CardTitle>
            <CardDescription>Progress and status of active projects</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.projectTimelines.map((project) => (
                <div key={project.projectId} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">{project.name}</span>
                    <div className="flex items-center gap-2">
                      <Badge className={getStatusColor(project.status)}>
                        {project.status.replace('_', ' ')}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {project.currentProgress}%
                      </span>
                    </div>
                  </div>
                  <Progress value={project.currentProgress} className="h-2" />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Started: {new Date(project.startDate).toLocaleDateString()}</span>
                    <span>Due: {new Date(project.expectedEndDate).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
              
              {data.projectTimelines.length === 0 && (
                <div className="text-center py-6 text-muted-foreground">
                  <Calendar className="h-8 w-8 mx-auto mb-2" />
                  No active projects
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* ROI Analysis */}
        <Card>
          <CardHeader>
            <CardTitle>ROI Analysis</CardTitle>
            <CardDescription>Return on investment tracking</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Current ROI</span>
                  <span>{data.roi.currentROI}%</span>
                </div>
                <Progress value={Math.min(data.roi.currentROI, 100)} className="h-2" />
              </div>
              
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Expected ROI</span>
                  <span>{data.roi.expectedROI}%</span>
                </div>
                <Progress value={Math.min(data.roi.expectedROI, 100)} className="h-2" />
              </div>

              <div className="pt-4 border-t">
                <div className="text-center">
                  <div className="text-lg font-bold">{data.roi.quarterlyGrowth > 0 ? '+' : ''}{data.roi.quarterlyGrowth}%</div>
                  <div className="text-sm text-muted-foreground">Quarterly Growth</div>
                </div>
              </div>

              <div className="pt-4">
                <Link href="/analytics/roi">
                  <Button variant="outline" className="w-full">
                    <TrendingUp className="mr-2 h-4 w-4" />
                    View ROI Details
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Risk Assessment */}
        <Card>
          <CardHeader>
            <CardTitle>Risk Assessment</CardTitle>
            <CardDescription>Multi-dimensional risk analysis</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Budget Risk</span>
                <Badge className={getRiskColor(data.riskAssessment.budgetRisk)}>
                  {data.riskAssessment.budgetRisk}
                </Badge>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Timeline Risk</span>
                <Badge className={getRiskColor(data.riskAssessment.timelineRisk)}>
                  {data.riskAssessment.timelineRisk}
                </Badge>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Quality Risk</span>
                <Badge className={getRiskColor(data.riskAssessment.qualityRisk)}>
                  {data.riskAssessment.qualityRisk}
                </Badge>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Resource Risk</span>
                <Badge className={getRiskColor(data.riskAssessment.resourceRisk)}>
                  {data.riskAssessment.resourceRisk}
                </Badge>
              </div>

              <div className="pt-4 border-t">
                <div className="text-center">
                  <div className="text-lg font-bold">{data.riskAssessment.overallRiskScore}/100</div>
                  <div className="text-sm text-muted-foreground">Overall Risk Score</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Budget Tracking */}
        <Card>
          <CardHeader>
            <CardTitle>Budget Tracking</CardTitle>
            <CardDescription>Financial planning and utilization</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="text-center p-3 bg-blue-50 rounded">
                  <div className="text-blue-600 font-bold">{formatCurrency(data.budgetTracking.totalBudget)}</div>
                  <div className="text-blue-600">Total Budget</div>
                </div>
                <div className="text-center p-3 bg-green-50 rounded">
                  <div className="text-green-600 font-bold">{formatCurrency(data.budgetTracking.spentAmount)}</div>
                  <div className="text-green-600">Spent</div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Utilization</span>
                  <span>{data.budgetTracking.utilization}%</span>
                </div>
                <Progress value={data.budgetTracking.utilization} className="h-2" />
              </div>

              <div className="pt-2 border-t text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Projected Spend:</span>
                  <span className="font-medium">{formatCurrency(data.budgetTracking.projectedSpend)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Remaining:</span>
                  <span className="font-medium">{formatCurrency(data.budgetTracking.remainingBudget)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Key Deliverables */}
        <Card>
          <CardHeader>
            <CardTitle>Key Deliverables</CardTitle>
            <CardDescription>Important milestones and features</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.deliverables.slice(0, 6).map((deliverable) => (
                <div key={deliverable.id} className="flex items-center justify-between p-2 border rounded">
                  <div className="flex-1">
                    <h4 className="font-medium text-sm">{deliverable.title}</h4>
                    <p className="text-xs text-muted-foreground">{deliverable.project}</p>
                  </div>
                  <div className="text-right">
                    <Badge className={getStatusColor(deliverable.status)}>
                      {deliverable.status.replace('_', ' ')}
                    </Badge>
                    <div className="text-xs text-muted-foreground mt-1">
                      <Badge variant="outline" className={getImpactColor(deliverable.impact)}>
                        {deliverable.impact}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
              {data.deliverables.length === 0 && (
                <div className="text-center py-4 text-muted-foreground text-sm">
                  No deliverables tracked
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Business Impact */}
        <Card>
          <CardHeader>
            <CardTitle>Business Impact</CardTitle>
            <CardDescription>Key performance indicators</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="text-center p-2 bg-purple-50 rounded">
                  <div className="text-purple-600 font-bold">{data.businessImpact.userReach.toLocaleString()}</div>
                  <div className="text-purple-600">User Reach</div>
                </div>
                <div className="text-center p-2 bg-blue-50 rounded">
                  <div className="text-blue-600 font-bold">{data.businessImpact.satisfactionScore}%</div>
                  <div className="text-blue-600">Satisfaction</div>
                </div>
                <div className="text-center p-2 bg-green-50 rounded">
                  <div className="text-green-600 font-bold">{data.businessImpact.featureAdoption}%</div>
                  <div className="text-green-600">Adoption</div>
                </div>
                <div className="text-center p-2 bg-orange-50 rounded">
                  <div className="text-orange-600 font-bold">{data.businessImpact.marketExpansion}%</div>
                  <div className="text-orange-600">Expansion</div>
                </div>
              </div>

              <div className="pt-4">
                <Link href="/impact-report">
                  <Button variant="outline" className="w-full">
                    <Activity className="mr-2 h-4 w-4" />
                    View Impact Report
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 