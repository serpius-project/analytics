"use client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { PeriodPreset } from "@/lib/dateUtils";

interface PeriodPresetSelectProps {
  value: PeriodPreset;
  onChange: (v: PeriodPreset) => void;
  options?: PeriodPreset[];
}

const DEFAULT_OPTIONS: PeriodPreset[] = [
  "Last 7 days",
  "Last 30 days",
  "Last 90 days",
  "YTD",
  "All",
  "Custom range",
];

export function PeriodPresetSelect({ value, onChange, options = DEFAULT_OPTIONS }: PeriodPresetSelectProps) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as PeriodPreset)}>
      <SelectTrigger className="h-8 text-xs">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o} value={o} className="text-xs">
            {o}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
