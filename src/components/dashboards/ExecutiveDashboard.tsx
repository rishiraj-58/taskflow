'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import CreateWorkspaceModal from '@/components/workspaces/CreateWorkspaceModal';
import { 
  TrendingUp, 
  DollarSign, 
  Users, 
  Briefcase, 
  Target,
  AlertTriangle,
  ArrowUpRight,
  Activity,
  PieChart,
  BarChart3
} from 'lucide-react';

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

export function ExecutiveDashboard() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<ExecutiveDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateWorkspaceModalOpen, setIsCreateWorkspaceModalOpen] = useState(false);

  useEffect(() => {
    async function fetchExecutiveData() {
      if (!isLoaded || !isSignedIn) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const token = await getToken();
        const response = await fetch('/api/dashboards/executive', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch executive dashboard data');
        }
        
        const dashboardData = await response.json();
        setData(dashboardData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    }

    fetchExecutiveData();
  }, [isLoaded, isSignedIn, getToken]);

  const getHealthColor = (score: number) => {
    if (score >= 90) return 'text-green-600 bg-green-100';
    if (score >= 75) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const handleCreateWorkspace = async (workspace: { name: string; description: string }) => {
    try {
      const token = await getToken();
      const response = await fetch('/api/workspaces', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(workspace),
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create workspace');
      }
      
      const newWorkspace = await response.json();
      setIsCreateWorkspaceModalOpen(false);
      
      // Navigate to the new workspace
      router.push(`/workspaces/${newWorkspace.id}`);
    } catch (err) {
      console.error('Error creating workspace:', err);
      setError(err instanceof Error ? err.message : 'Failed to create workspace');
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
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
            Executive Dashboard
          </h1>
          <p className="text-muted-foreground mt-2">
            Portfolio overview and strategic insights for workspace leadership
          </p>
        </div>
        <div className="flex gap-2 mt-4 md:mt-0">
          <Button onClick={() => setIsCreateWorkspaceModalOpen(true)}>
            <Briefcase className="mr-2 h-4 w-4" />
            New Workspace
          </Button>
          <Link href="/analytics">
            <Button variant="outline">
              <BarChart3 className="mr-2 h-4 w-4" />
              Analytics
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
                <p className="text-sm font-medium text-muted-foreground">Total Projects</p>
                <p className="text-2xl font-bold">{data.overview.totalProjects}</p>
                <p className="text-xs text-muted-foreground">
                  {data.overview.activeProjects} active, {data.overview.completedProjects} completed
                </p>
              </div>
              <Briefcase className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Team Members</p>
                <p className="text-2xl font-bold">{data.overview.totalTeamMembers}</p>
                <div className="flex items-center text-xs text-green-600">
                  <ArrowUpRight className="h-3 w-3 mr-1" />
                  {data.resourceUtilization.teamUtilization}% utilized
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
                <p className="text-sm font-medium text-muted-foreground">Portfolio Health</p>
                <p className="text-2xl font-bold">{data.portfolioHealth.score}%</p>
                <Badge className={getHealthColor(data.portfolioHealth.score)}>
                  {data.portfolioHealth.status}
                </Badge>
              </div>
              <Activity className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">On-Time Delivery</p>
                <p className="text-2xl font-bold">{data.strategicMetrics.onTimeDelivery}%</p>
                <div className="flex items-center text-xs text-green-600">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  {data.strategicMetrics.onTimeDelivery >= 85 ? 'Above target' : 'Below target'}
                </div>
              </div>
              <Target className="h-8 w-8 text-teal-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Strategic Overview */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Portfolio Performance */}
        <Card className="col-span-2">
          <CardHeader>
            <CardTitle>Portfolio Performance</CardTitle>
            <CardDescription>Project health and delivery metrics across all workspaces</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Budget Utilization</span>
                <span className="text-sm text-muted-foreground">{data.resourceUtilization.budgetSpent}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full" 
                  style={{ width: `${data.resourceUtilization.budgetSpent}%` }}
                ></div>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Team Satisfaction</span>
                <span className="text-sm text-muted-foreground">{data.strategicMetrics.teamSatisfaction}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-green-600 h-2 rounded-full" 
                  style={{ width: `${data.strategicMetrics.teamSatisfaction}%` }}
                ></div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Quality Score</span>
                <span className="text-sm text-muted-foreground">{data.strategicMetrics.qualityScore}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-purple-600 h-2 rounded-full" 
                  style={{ width: `${data.strategicMetrics.qualityScore}%` }}
                ></div>
              </div>

              <div className="pt-4">
                <Link href="/portfolio">
                  <Button variant="outline" className="w-full">
                    <PieChart className="mr-2 h-4 w-4" />
                    View Detailed Portfolio Analysis
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Strategic Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Strategic Actions</CardTitle>
            <CardDescription>Recommended actions for portfolio optimization</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center space-x-2 p-3 bg-yellow-50 rounded-lg">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <div className="text-sm">
                <p className="font-medium">Resource Reallocation</p>
                <p className="text-muted-foreground">3 projects need attention</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2 p-3 bg-blue-50 rounded-lg">
              <TrendingUp className="h-4 w-4 text-blue-600" />
              <div className="text-sm">
                <p className="font-medium">Scale Successful Teams</p>
                <p className="text-muted-foreground">2 high-performing teams identified</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2 p-3 bg-green-50 rounded-lg">
              <DollarSign className="h-4 w-4 text-green-600" />
              <div className="text-sm">
                <p className="font-medium">Budget Optimization</p>
                <p className="text-muted-foreground">15% savings opportunity</p>
              </div>
            </div>

            <Button variant="outline" className="w-full mt-4">
              <Target className="mr-2 h-4 w-4" />
              Strategic Planning
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Portfolio Activity</CardTitle>
          <CardDescription>Latest updates across all workspaces and projects</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No recent activity to display</p>
            <p className="text-sm mt-1">Portfolio updates will appear here</p>
          </div>
        </CardContent>
      </Card>

      {/* Create Workspace Modal */}
      <CreateWorkspaceModal
        isOpen={isCreateWorkspaceModalOpen}
        onClose={() => setIsCreateWorkspaceModalOpen(false)}
        onCreate={handleCreateWorkspace}
      />
    </div>
  );
} 