"use client";
import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ChevronDown } from "lucide-react";

interface MultiSelectProps {
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
  labelMap?: Record<string, string>;
}

export function MultiSelect({ options, selected, onChange, placeholder = "Select…", labelMap }: MultiSelectProps) {
  const [open, setOpen] = useState(false);

  function toggle(opt: string) {
    if (selected.includes(opt)) {
      onChange(selected.filter((s) => s !== opt));
    } else {
      onChange([...selected, opt]);
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger render={<Button variant="outline" size="sm" className="h-8 text-xs justify-between min-w-28" />}>
        <span className="truncate">
          {selected.length === 0
            ? placeholder
            : selected.length === options.length
            ? "All"
            : selected.map((s) => labelMap?.[s] ?? s).join(", ")}
        </span>
        <ChevronDown className="h-3.5 w-3.5 ml-1 shrink-0 opacity-50" />
      </PopoverTrigger>
      <PopoverContent className="w-48 p-2" align="start">
        <div className="flex flex-col gap-1 max-h-64 overflow-y-auto">
          {options.map((opt) => (
            <label key={opt} className="flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer hover:bg-accent text-sm flex-shrink-0">
              <Checkbox
                checked={selected.includes(opt)}
                onCheckedChange={() => toggle(opt)}
              />
              <span>{labelMap?.[opt] ?? opt}</span>
            </label>
          ))}
        </div>
        <div className="flex gap-1 mt-2 border-t pt-2 flex-shrink-0">
          <Button variant="ghost" size="sm" className="h-6 text-xs flex-1" onClick={() => onChange(options)}>
            All
          </Button>
          <Button variant="ghost" size="sm" className="h-6 text-xs flex-1" onClick={() => onChange([])}>
            None
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export { Badge };
