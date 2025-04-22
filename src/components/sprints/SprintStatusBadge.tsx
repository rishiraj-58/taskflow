import { Badge, BadgeProps } from "@/components/ui/badge";
import { Clock, CheckCircle2, Play, PauseCircle } from "lucide-react";

type SprintStatus = "planned" | "active" | "completed" | "cancelled";

interface SprintStatusBadgeProps {
  status: SprintStatus;
  className?: string;
}

export function SprintStatusBadge({ status, className }: SprintStatusBadgeProps) {
  const statusConfig: Record<
    SprintStatus, 
    { label: string; variant: BadgeProps["variant"]; icon: React.ReactNode }
  > = {
    planned: {
      label: "Planned",
      variant: "outline",
      icon: <Clock size={14} className="mr-1" />
    },
    active: {
      label: "Active",
      variant: "default",
      icon: <Play size={14} className="mr-1" />
    },
    completed: {
      label: "Completed",
      variant: "default",
      icon: <CheckCircle2 size={14} className="mr-1" />
    },
    cancelled: {
      label: "Cancelled",
      variant: "destructive",
      icon: <PauseCircle size={14} className="mr-1" />
    }
  };

  const config = statusConfig[status] || statusConfig.planned;

  return (
    <Badge variant={config.variant} className={`flex items-center ${className}`}>
      {config.icon}
      {config.label}
    </Badge>
  );
} 