export type PeriodPreset = "Last 7 days" | "Last 30 days" | "Last 90 days" | "YTD" | "All" | "Custom range";

export function presetToRange(
  preset: PeriodPreset,
  globalMin: string,
  globalMax: string,
  customStart: string,
  customEnd: string
): { start: string; end: string } {
  const today = globalMax;
  const todayDate = new Date(today);

  if (preset === "Last 7 days") {
    const s = new Date(todayDate);
    s.setDate(s.getDate() - 7);
    return { start: dateToStr(s), end: today };
  }
  if (preset === "Last 30 days") {
    const s = new Date(todayDate);
    s.setDate(s.getDate() - 30);
    return { start: dateToStr(s), end: today };
  }
  if (preset === "Last 90 days") {
    const s = new Date(todayDate);
    s.setDate(s.getDate() - 90);
    return { start: dateToStr(s), end: today };
  }
  if (preset === "YTD") {
    const year = todayDate.getFullYear();
    return { start: `${year}-01-01`, end: today };
  }
  if (preset === "All") {
    return { start: globalMin, end: globalMax };
  }
  // Custom range
  return { start: customStart, end: customEnd };
}

export function dateToStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function today(): string {
  return dateToStr(new Date());
}

/** Clamp a date string to [min, max] */
export function clamp(d: string, min: string, max: string): string {
  if (d < min) return min;
  if (d > max) return max;
  return d;
}

/** Convert unix milliseconds to "YYYY-MM-DD" */
export function msToDateStr(ms: number): string {
  return dateToStr(new Date(ms));
}
