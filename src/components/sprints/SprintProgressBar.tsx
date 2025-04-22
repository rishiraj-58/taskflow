import { cn } from "@/lib/utils";

interface SprintProgressBarProps {
  completedTasks: number;
  totalTasks: number;
  className?: string;
}

export default function SprintProgressBar({
  completedTasks,
  totalTasks,
  className,
}: SprintProgressBarProps) {
  const progressPercentage = totalTasks === 0 
    ? 0 
    : Math.round((completedTasks / totalTasks) * 100);

  return (
    <div className={cn("space-y-1", className)}>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{progressPercentage}% complete</span>
        <span>{completedTasks}/{totalTasks} tasks</span>
      </div>
      <div className="h-2 bg-secondary rounded-full overflow-hidden">
        <div 
          className="h-full bg-primary rounded-full"
          style={{ width: `${progressPercentage}%` }}
        />
      </div>
    </div>
  );
} 