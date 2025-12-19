"use client";

import { cn } from "@/lib/utils";

interface ProgressBarProps {
  raised: number;
  goal: number;
  className?: string;
}

export function ProgressBar({ raised, goal, className }: ProgressBarProps) {
  const percentage = goal > 0 ? Math.min(100, (raised / goal) * 100) : 0;
  const isComplete = percentage >= 100;

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex justify-between text-sm">
        <span className="font-medium">{raised.toFixed(2)} SOL raised</span>
        <span className="text-muted-foreground">
          {percentage.toFixed(0)}% of {goal.toFixed(2)} SOL
        </span>
      </div>
      <div className="h-3 bg-muted rounded-full overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500",
            isComplete ? "bg-green-500" : "bg-primary",
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {isComplete && (
        <p className="text-green-600 text-sm font-medium">Goal reached!</p>
      )}
    </div>
  );
}
