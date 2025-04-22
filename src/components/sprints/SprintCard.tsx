import Link from "next/link";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import SprintProgressBar from "./SprintProgressBar";
import { SprintTimeRemaining } from "./SprintTimeRemaining";
import { Badge } from "@/components/ui/badge";

interface Sprint {
  id: string;
  name: string;
  description: string;
  projectId: string;
  startDate: Date;
  endDate: Date;
  status: "active" | "completed" | "planned";
  totalTasks: number;
  completedTasks: number;
}

interface SprintCardProps {
  sprint: Sprint;
  className?: string;
}

export function SprintCard({ sprint, className }: SprintCardProps) {
  const statusColorMap = {
    active: "bg-green-500/10 text-green-500 border-green-500/20",
    completed: "bg-gray-500/10 text-gray-500 border-gray-500/20",
    planned: "bg-blue-500/10 text-blue-500 border-blue-500/20"
  };

  return (
    <Card className={`overflow-hidden ${className}`}>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg font-semibold">
              <Link href={`/projects/${sprint.projectId}/sprints/${sprint.id}`} className="hover:underline">
                {sprint.name}
              </Link>
            </CardTitle>
            <CardDescription className="line-clamp-1">
              {sprint.description}
            </CardDescription>
          </div>
          <Badge className={statusColorMap[sprint.status]} variant="outline">
            {sprint.status.charAt(0).toUpperCase() + sprint.status.slice(1)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pb-2">
        <SprintProgressBar 
          completedTasks={sprint.completedTasks} 
          totalTasks={sprint.totalTasks} 
        />
      </CardContent>
      <CardFooter className="pt-2 flex justify-between items-center text-sm text-muted-foreground border-t">
        <div>
          {new Date(sprint.startDate).toLocaleDateString()} - {new Date(sprint.endDate).toLocaleDateString()}
        </div>
        <SprintTimeRemaining endDate={new Date(sprint.endDate)} />
      </CardFooter>
    </Card>
  );
} 