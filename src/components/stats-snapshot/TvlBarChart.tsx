"use client";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import type { StatsRow } from "@/types/stats";

const COLORS = ["#3b82f6", "#6366f1", "#10b981", "#f59e0b", "#ef4444"];

// Custom Tooltip Component
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload) return null;

  return (
    <div className="bg-background/95 border border-border rounded-lg shadow-lg p-3 backdrop-blur-sm">
      <p className="text-xs font-semibold text-foreground mb-2">{label}</p>
      <div className="space-y-1">
        {payload.map((entry: any) => (
          <div key={entry.name} className="text-xs flex justify-between gap-3" style={{ color: entry.color }}>
            <span className="font-medium">{entry.name}:</span>
            <span className="font-mono font-semibold">${(entry.value as number).toLocaleString("en-US", { maximumFractionDigits: 0 })}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

interface TvlBarChartProps {
  data: StatsRow[];
}

export function TvlBarChart({ data }: TvlBarChartProps) {
  const sorted = [...data].sort((a, b) => b.total_tvl - a.total_tvl);
  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart data={sorted} margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="opacity-10" />
        <XAxis dataKey="chain" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}K`} width={70} />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.1)" }} />
        <Bar dataKey="total_tvl" name="Total TVL" radius={[4, 4, 0, 0]}>
          {sorted.map((entry, i) => (
            <Cell key={entry.chain} fill={COLORS[i % COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
