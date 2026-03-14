"use client";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import type { AllocationRow } from "@/lib/composition";
import { useMemo } from "react";

interface SmallMultiplesProps {
  rows: AllocationRow[];
}

export function SmallMultiples({ rows }: SmallMultiplesProps) {
  const tokens = useMemo(() => [...new Set(rows.map((r) => r.symbol))].sort(), [rows]);

  const byToken = useMemo(() => {
    const m = new Map<string, { date: string; pct: number }[]>();
    for (const r of rows) {
      const arr = m.get(r.symbol) ?? [];
      arr.push({ date: r.date, pct: r.pct });
      m.set(r.symbol, arr);
    }
    for (const [, arr] of m) arr.sort((a, b) => a.date.localeCompare(b.date));
    return m;
  }, [rows]);

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
      {tokens.map((token) => {
        const data = byToken.get(token) ?? [];
        return (
          <div key={token} className="border rounded-lg p-2 bg-card">
            <p className="text-[11px] font-medium mb-1 truncate">{token}</p>
            <ResponsiveContainer width="100%" height={80}>
              <LineChart data={data}>
                <XAxis dataKey="date" hide />
                <YAxis hide domain={["auto", "auto"]} />
                <Tooltip
                  contentStyle={{ fontSize: 10 }}
                  formatter={(v) => [`${Number(v).toFixed(2)}%`, "Weight"]}
                  labelFormatter={(l) => l}
                />
                <Line type="monotone" dataKey="pct" dot={false} strokeWidth={1.5} stroke="#6366f1" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        );
      })}
    </div>
  );
}
