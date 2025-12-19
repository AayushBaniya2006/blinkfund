"use client";

import { useState, useEffect } from "react";
import { Clock, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface DeadlineCountdownProps {
  deadline: string | Date;
  className?: string;
}

interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  total: number;
}

function calculateTimeRemaining(deadline: Date): TimeRemaining {
  const now = new Date();
  const total = deadline.getTime() - now.getTime();

  if (total <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 };
  }

  return {
    days: Math.floor(total / (1000 * 60 * 60 * 24)),
    hours: Math.floor((total / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((total / (1000 * 60)) % 60),
    seconds: Math.floor((total / 1000) % 60),
    total,
  };
}

export function DeadlineCountdown({
  deadline,
  className,
}: DeadlineCountdownProps) {
  const deadlineDate = new Date(deadline);
  const [timeRemaining, setTimeRemaining] = useState<TimeRemaining>(() =>
    calculateTimeRemaining(deadlineDate),
  );

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeRemaining(calculateTimeRemaining(deadlineDate));
    }, 1000);

    return () => clearInterval(timer);
  }, [deadlineDate]);

  const isExpired = timeRemaining.total <= 0;
  const isUrgent = timeRemaining.days < 3 && !isExpired;

  if (isExpired) {
    return (
      <div className={cn("flex items-center gap-2 text-red-600", className)}>
        <AlertCircle className="h-4 w-4" />
        <span className="font-medium">Campaign ended</span>
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center gap-2 text-muted-foreground">
        <Clock className="h-4 w-4" />
        <span className="text-sm">Time remaining</span>
      </div>
      <div className="flex gap-3">
        <TimeUnit value={timeRemaining.days} label="days" urgent={isUrgent} />
        <TimeUnit value={timeRemaining.hours} label="hrs" urgent={isUrgent} />
        <TimeUnit value={timeRemaining.minutes} label="min" urgent={isUrgent} />
        <TimeUnit value={timeRemaining.seconds} label="sec" urgent={isUrgent} />
      </div>
      {isUrgent && (
        <p className="text-orange-600 text-sm font-medium">Ending soon!</p>
      )}
    </div>
  );
}

function TimeUnit({
  value,
  label,
  urgent,
}: {
  value: number;
  label: string;
  urgent: boolean;
}) {
  return (
    <div className="text-center">
      <div
        className={cn(
          "text-2xl font-bold tabular-nums",
          urgent ? "text-orange-600" : "text-foreground",
        )}
      >
        {value.toString().padStart(2, "0")}
      </div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
