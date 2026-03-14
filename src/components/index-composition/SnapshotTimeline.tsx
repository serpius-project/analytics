"use client";
import { useMemo } from "react";

interface SnapshotTimelineProps {
  dates: string[];
  selectedDate: string;
  onDateChange: (date: string) => void;
}

export function SnapshotTimeline({ dates, selectedDate, onDateChange }: SnapshotTimelineProps) {
  const selectedIndex = dates.indexOf(selectedDate);

  // Mark visible dates for labels (show ~15 dates max)
  const dateInterval = useMemo(() => Math.max(1, Math.ceil(dates.length / 15)), [dates.length]);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    onDateChange(dates[value]);
  };

  const progressPercent = dates.length > 1 ? (selectedIndex / (dates.length - 1)) * 100 : 0;

  return (
    <div className="w-full space-y-1">
      <div className="flex items-center justify-between">
        <div className="text-xs font-medium text-foreground">Date:</div>
        <div className="text-sm font-semibold text-primary">{selectedDate}</div>
      </div>

      {/* Track background and progress fill */}
      <div className="relative h-1.5 bg-border rounded-full overflow-hidden">
        <div
          className="h-full bg-primary transition-all"
          style={{
            width: `${progressPercent}%`,
          }}
        />
        {/* Slider input overlaid */}
        <input
          type="range"
          min="0"
          max={dates.length - 1}
          value={selectedIndex}
          onChange={handleSliderChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
      </div>
    </div>
  );
}
