"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  AlertTriangle, 
  BugOff, 
  Clock,
  CheckCircle2
} from "lucide-react";
import type { Bug } from "@/lib/types";

interface BugDashboardProps {
  bugs: Bug[];
}

export function BugDashboard({ bugs }: BugDashboardProps) {
  // Calculate metrics
  const totalBugs = bugs.length;
  const openBugs = bugs.filter(bug => bug.status === "OPEN").length;
  const criticalBugs = bugs.filter(bug => 
    bug.priority === "CRITICAL" || bug.severity === "CRITICAL"
  ).length;
  const resolvedBugs = bugs.filter(bug => 
    bug.status === "FIXED" || bug.status === "VERIFIED" || bug.status === "CLOSED"
  ).length;
  
  // Calculate resolution rate
  const resolutionRate = totalBugs > 0 
    ? Math.round((resolvedBugs / totalBugs) * 100) 
    : 0;

  const cardClass = "flex flex-col items-center justify-center p-4 space-y-2";
  const iconClass = "h-10 w-10 mb-2";

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <Card>
        <CardContent className={cardClass}>
          <BugOff className={`${iconClass} text-primary`} />
          <CardTitle className="text-3xl">{totalBugs}</CardTitle>
          <p className="text-sm text-muted-foreground">Total Bugs</p>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className={cardClass}>
          <Clock className={`${iconClass} text-amber-500`} />
          <CardTitle className="text-3xl">{openBugs}</CardTitle>
          <p className="text-sm text-muted-foreground">Open Bugs</p>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className={cardClass}>
          <AlertTriangle className={`${iconClass} text-red-500`} />
          <CardTitle className="text-3xl">{criticalBugs}</CardTitle>
          <p className="text-sm text-muted-foreground">Critical Bugs</p>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className={cardClass}>
          <CheckCircle2 className={`${iconClass} text-green-500`} />
          <CardTitle className="text-3xl">{resolutionRate}%</CardTitle>
          <p className="text-sm text-muted-foreground">Resolution Rate</p>
        </CardContent>
      </Card>
    </div>
  );
}

// Add default export
export default BugDashboard; 