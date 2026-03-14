"use client";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import type { StatsRow } from "@/types/stats";

// Custom Tooltip Component
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload) return null;

  const sortedPayload = [...payload].sort((a, b) => (b.value ?? 0) - (a.value ?? 0));

  return (
    <div className="bg-background/95 border border-border rounded-lg shadow-lg p-3 backdrop-blur-sm">
      <p className="text-xs font-semibold text-foreground mb-2">{label}</p>
      <div className="space-y-1">
        {sortedPayload.map((entry: any) => (
          <div key={entry.name} className="text-xs flex justify-between gap-3" style={{ color: entry.color }}>
            <span className="font-medium">{entry.name}:</span>
            <span className="font-mono font-semibold">${(entry.value as number).toLocaleString("en-US", { maximumFractionDigits: 0 })}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

interface TvlStackedBarProps {
  data: StatsRow[];
}

export function TvlStackedBar({ data }: TvlStackedBarProps) {
  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart data={data} margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="opacity-10" />
        <XAxis dataKey="chain" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}K`} width={70} />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.1)" }} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="total_index_tvl" name="Index TVL" stackId="a" fill="#60a5fa" />
        <Bar dataKey="total_pro_tvl" name="Pro TVL" stackId="a" fill="#34d399" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
