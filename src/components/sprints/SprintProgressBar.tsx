import { cn } from "@/lib/utils";
import { CheckCircleIcon, CircleIcon } from "lucide-react";

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

  const getStatusColor = () => {
    if (progressPercentage === 100) return "from-emerald-500 to-green-500";
    if (progressPercentage >= 75) return "from-teal-500 to-emerald-500";
    if (progressPercentage >= 50) return "from-blue-500 to-teal-500";
    if (progressPercentage >= 25) return "from-indigo-500 to-blue-500";
    return "from-purple-500 to-indigo-500";
  };

  const getStatusIcon = () => {
    if (progressPercentage === 100) {
      return <CheckCircleIcon className="h-4 w-4 text-emerald-500" />;
    }
    return <CircleIcon className="h-4 w-4 text-blue-500" />;
  };

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center font-medium">
          {getStatusIcon()}
          <span className="ml-1.5">
            {progressPercentage}% complete
          </span>
        </div>
        <span className="text-muted-foreground">{completedTasks}/{totalTasks} tasks</span>
      </div>
      <div className="h-2 bg-muted/50 rounded-full overflow-hidden backdrop-blur-sm">
        <div 
          className={`h-full bg-gradient-to-r ${getStatusColor()} rounded-full transition-all duration-500 ease-out`}
          style={{ 
            width: `${progressPercentage}%`,
            boxShadow: progressPercentage > 0 ? '0 0 8px rgba(59, 130, 246, 0.5)' : 'none' 
          }}
        />
      </div>
    </div>
  );
} 