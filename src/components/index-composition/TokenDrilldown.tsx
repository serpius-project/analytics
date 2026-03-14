"use client";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import type { AllocationRow } from "@/lib/composition";
import { useMemo } from "react";

// Custom Tooltip Component for Weight %
function WeightTooltip({ active, payload, label }: any) {
  if (!active || !payload || !payload.length) return null;

  return (
    <div className="bg-background/95 border border-border rounded-lg shadow-lg p-3 backdrop-blur-sm">
      <p className="text-xs font-semibold text-foreground mb-2">{label}</p>
      <div className="text-xs flex justify-between gap-3" style={{ color: payload[0].color }}>
        <span className="font-medium">Weight:</span>
        <span className="font-mono font-semibold">{(payload[0].value as number).toFixed(2)}%</span>
      </div>
    </div>
  );
}

// Custom Tooltip Component for USD Value
function UsdTooltip({ active, payload, label }: any) {
  if (!active || !payload || !payload.length) return null;

  return (
    <div className="bg-background/95 border border-border rounded-lg shadow-lg p-3 backdrop-blur-sm">
      <p className="text-xs font-semibold text-foreground mb-2">{label}</p>
      <div className="text-xs flex justify-between gap-3" style={{ color: payload[0].color }}>
        <span className="font-medium">USD:</span>
        <span className="font-mono font-semibold">${(payload[0].value as number).toFixed(2)}</span>
      </div>
    </div>
  );
}

interface TokenDrilldownProps {
  rows: AllocationRow[];
  token: string;
}

export function TokenDrilldown({ rows, token }: TokenDrilldownProps) {
  const data = useMemo(
    () =>
      rows
        .filter((r) => r.symbol === token)
        .sort((a, b) => a.date.localeCompare(b.date))
        .map((r) => ({ date: r.date, pct: r.pct, usd: r.usdValue })),
    [rows, token]
  );

  return (
    <div className="grid md:grid-cols-2 gap-4">
      <div className="border rounded-lg p-3 bg-card">
        <p className="text-xs font-medium mb-2">Weight % — {token}</p>
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="opacity-10" />
            <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v: string) => v.slice(5)} minTickGap={40} />
            <YAxis tick={{ fontSize: 10 }} tickFormatter={(v: number) => `${v.toFixed(1)}%`} width={50} />
            <Tooltip content={<WeightTooltip />} cursor={{ fill: "rgba(255,255,255,0.1)" }} />
            <Line type="monotone" dataKey="pct" dot={false} strokeWidth={2} stroke="#6366f1" />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="border rounded-lg p-3 bg-card">
        <p className="text-xs font-medium mb-2">USD Value — {token}</p>
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="opacity-10" />
            <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v: string) => v.slice(5)} minTickGap={40} />
            <YAxis tick={{ fontSize: 10 }} tickFormatter={(v: number) => `$${v.toLocaleString()}`} width={70} />
            <Tooltip content={<UsdTooltip />} cursor={{ fill: "rgba(255,255,255,0.1)" }} />
            <Line type="monotone" dataKey="usd" dot={false} strokeWidth={2} stroke="#10b981" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
