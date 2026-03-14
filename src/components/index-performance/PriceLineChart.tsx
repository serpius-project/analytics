"use client";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { CHAIN_COLORS } from "@/lib/constants";

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
            <span className="font-mono font-semibold">{(entry.value as number).toFixed(2)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

interface PriceLineChartProps {
  data: Record<string, string | number>[];
  chains: string[];
  rebased: boolean;
  yLabel?: string;
  startAtZero?: boolean;
}

export function PriceLineChart({ data, chains, rebased, yLabel = "Index", startAtZero = false }: PriceLineChartProps) {
  return (
    <ResponsiveContainer width="100%" height={420}>
      <LineChart data={data} margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="opacity-10" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 11 }}
          tickFormatter={(v: string) => v.slice(5)} // show MM-DD
          minTickGap={40}
        />
        <YAxis
          tick={{ fontSize: 11 }}
          width={70}
          tickFormatter={(v: number) => v.toLocaleString("en-US", { maximumFractionDigits: 2 })}
          label={rebased ? undefined : { value: yLabel, angle: -90, position: "insideLeft", fontSize: 11 }}
          domain={startAtZero ? [0, "auto"] : ["auto", "auto"]}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.1)" }} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        {rebased && <ReferenceLine y={100} stroke="#888" strokeDasharray="4 4" />}
        {chains.map((chain) => (
          <Line
            key={chain}
            type="monotone"
            dataKey={chain}
            dot={false}
            strokeWidth={2}
            stroke={CHAIN_COLORS[chain as keyof typeof CHAIN_COLORS] ?? "#888"}
            activeDot={{ r: 4 }}
            connectNulls={false}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
