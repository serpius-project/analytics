"use client";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import type { AllocationRow } from "@/lib/composition";

const COLORS = [
  "#6366f1", "#3b82f6", "#10b981", "#f59e0b", "#ef4444",
  "#8b5cf6", "#ec4899", "#14b8a6", "#f97316", "#84cc16",
  "#06b6d4", "#a855f7", "#d946ef", "#22c55e", "#eab308",
];

interface PieSnapshotProps {
  rows: AllocationRow[]; // rows for a single date
}

export function PieSnapshot({ rows }: PieSnapshotProps) {
  const sorted = [...rows].sort((a, b) => b.usdValue - a.usdValue);
  const topN = 5;

  // Keep top 5, group rest as "Other"
  const top5 = sorted.slice(0, topN);
  const rest = sorted.slice(topN);
  const otherTotal = rest.reduce((sum, r) => sum + r.pct, 0);

  const data = otherTotal > 0
    ? [...top5, { symbol: "Other", pct: otherTotal, usdValue: rest.reduce((sum, r) => sum + r.usdValue, 0), dayTotal: rows[0].dayTotal }]
    : top5;

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={data}
          dataKey="pct"
          nameKey="symbol"
          cx="50%"
          cy="50%"
          outerRadius={110}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          label={(props: any) => {
            if (props.pct < 2) return "";
            const pct = props.pct as number;
            const symbol = props.symbol as string;
            // Show full label only for larger slices to prevent text cutoff
            // For smaller slices, show only percentage to fit in the slice
            if (pct < 12) return `${pct.toFixed(1)}%`;
            return `${symbol} ${pct.toFixed(1)}%`;
          }}
          labelLine={false}
        >
          {data.map((entry, i) => (
            <Cell key={entry.symbol} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          formatter={(v) => [`${Number(v).toFixed(1)}%`]}
          contentStyle={{ backgroundColor: "rgba(0, 0, 0, 0.9)", border: "1px solid rgba(255, 255, 255, 0.1)", borderRadius: "0.5rem", padding: "0.5rem 0.75rem" }}
          labelStyle={{ color: "#fff", fontSize: "0.875rem", fontWeight: "500" }}
        />
        <Legend wrapperStyle={{ fontSize: 12, paddingTop: "1rem" }} />
      </PieChart>
    </ResponsiveContainer>
  );
}
