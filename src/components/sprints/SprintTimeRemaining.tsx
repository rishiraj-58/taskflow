import { CalendarClock } from "lucide-react";
import { formatDistanceToNow, isPast } from "date-fns";

interface SprintTimeRemainingProps {
  endDate: Date;
  className?: string;
}

export function SprintTimeRemaining({ 
  endDate, 
  className 
}: SprintTimeRemainingProps) {
  const isEnded = isPast(endDate);
  const timeText = isEnded 
    ? "Sprint ended" 
    : `${formatDistanceToNow(endDate)} remaining`;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <CalendarClock className="h-4 w-4 text-muted-foreground" />
      <span className={`text-sm ${isEnded ? "text-destructive" : "text-muted-foreground"}`}>
        {timeText}
      </span>
    </div>
  );
} 