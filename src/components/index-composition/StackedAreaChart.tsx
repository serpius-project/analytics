"use client";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  Line,
  ComposedChart,
} from "recharts";
import { useMemo } from "react";

// Custom Tooltip Component with improved styling
function CustomTooltip({ active, payload, label, mode }: any) {
  if (!active || !payload) return null;

  const sortedPayload = [...payload].sort((a, b) => {
    // "Other" always comes last
    const aIsOther = a.name === "Other";
    const bIsOther = b.name === "Other";
    if (aIsOther && !bIsOther) return 1;
    if (!aIsOther && bIsOther) return -1;
    // Otherwise sort by value descending
    return (b.value ?? 0) - (a.value ?? 0);
  });

  return (
    <div className="bg-background/95 border border-border rounded-lg shadow-lg p-3 backdrop-blur-sm">
      <p className="text-xs font-semibold text-foreground mb-2">{label}</p>
      <div className="space-y-1">
        {sortedPayload.map((entry: any) => {
          if (entry.name === "_index100") {
            return (
              <div key={entry.name} className="text-xs text-muted-foreground flex justify-between gap-3">
                <span>Index (rebased):</span>
                <span className="font-mono font-semibold text-foreground">{(entry.value as number).toFixed(2)}</span>
              </div>
            );
          }
          return (
            <div key={entry.name} className="text-xs flex justify-between gap-3" style={{ color: entry.color }}>
              <span className="font-medium">{entry.name}:</span>
              <span className="font-mono font-semibold">
                {mode === "pct" ? `${((entry.value as number) * 100).toFixed(1)}%` : `$${(entry.value as number).toFixed(0)}`}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const TOKEN_COLORS = [
  "#6366f1", "#3b82f6", "#10b981", "#f59e0b", "#ef4444",
  "#8b5cf6", "#ec4899", "#14b8a6", "#f97316", "#84cc16",
  "#06b6d4", "#a855f7", "#d946ef", "#22c55e", "#eab308",
  "#64748b", "#94a3b8", "#cbd5e1",
];

interface StackedAreaChartProps {
  data: Record<string, number | string>[];
  tokens: string[];
  mode: "pct" | "usd";
  showOverlay?: boolean;
  overlayData?: { date: string; index100: number }[];
  eventDates: string[];
}

export function StackedAreaChart({
  data,
  tokens,
  mode,
  showOverlay = false,
  overlayData = [],
  eventDates,
}: StackedAreaChartProps) {
  const overlayMap = useMemo(() => {
    const m = new Map<string, number>();
    for (const d of overlayData) m.set(d.date, d.index100);
    return m;
  }, [overlayData]);

  const mergedData = useMemo(() => {
    return data.map((row) => ({
      ...row,
      _index100: overlayMap.get(row.date as string) ?? null,
    }));
  }, [data, overlayMap]);

  const yTickFmt = mode === "pct"
    ? (v: number) => `${(v * 100).toFixed(0)}%`
    : (v: number) => v >= 1_000_000 ? `$${(v / 1_000_000).toFixed(1)}M` : `$${v.toLocaleString()}`;

  return (
    <ResponsiveContainer width="100%" height={420}>
      <ComposedChart data={mergedData} margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="opacity-10" />
        <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(v: string) => v.slice(5)} minTickGap={40} />
        <YAxis
          yAxisId="left"
          tick={{ fontSize: 11 }}
          width={65}
          tickFormatter={yTickFmt}
          domain={mode === "pct" ? [0, 1] : ["auto", "auto"]}
        />
        {showOverlay && (
          <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} width={50} tickFormatter={(v) => v.toFixed(0)} />
        )}
        <Tooltip content={<CustomTooltip mode={mode} />} cursor={{ fill: "rgba(255,255,255,0.1)" }} />
        <Legend wrapperStyle={{ fontSize: 11 }} formatter={(name) => name === "_index100" ? "Index" : name} />

        {tokens.map((token, i) => (
          <Area
            key={token}
            yAxisId="left"
            type="monotone"
            dataKey={token}
            stackId={mode === "pct" ? "a" : undefined}
            stroke={TOKEN_COLORS[i % TOKEN_COLORS.length]}
            fill={TOKEN_COLORS[i % TOKEN_COLORS.length]}
            fillOpacity={0.8}
            dot={false}
          />
        ))}

        {showOverlay && (
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="_index100"
            stroke="#111"
            strokeWidth={2}
            dot={false}
            name="_index100"
          />
        )}

        {eventDates.map((d) => (
          <ReferenceLine key={d} x={d} yAxisId="left" stroke="#888" strokeDasharray="3 3" />
        ))}
      </ComposedChart>
    </ResponsiveContainer>
  );
}
