"use client";
import { useMemo, useState } from "react";
import type { AllocationRow } from "@/lib/composition";

interface WeightHeatmapProps {
  rows: AllocationRow[];
}

function pctToColor(pct: number): string {
  const normalized = Math.min(pct / 60, 1); // 60% = max saturation
  const lightness = 90 - normalized * 65;
  return `hsl(217, 91%, ${lightness.toFixed(0)}%)`;
}

export function WeightHeatmap({ rows }: WeightHeatmapProps) {
  const [hoveredCell, setHoveredCell] = useState<{ token: string; date: string; pct: number } | null>(null);

  const { dates, tokens, grid } = useMemo(() => {
    const dates = [...new Set(rows.map((r) => r.date))].sort();
    const tokenAvg = new Map<string, number>();
    for (const r of rows) {
      tokenAvg.set(r.symbol, (tokenAvg.get(r.symbol) ?? 0) + r.pct);
    }
    const tokens = [...tokenAvg.keys()].sort(
      (a, b) => (tokenAvg.get(b) ?? 0) - (tokenAvg.get(a) ?? 0)
    );

    const lookup = new Map<string, number>();
    for (const r of rows) lookup.set(`${r.date}|${r.symbol}`, r.pct);

    const grid: { date: string; pct: number }[][] = tokens.map((token) =>
      dates.map((date) => ({ date, pct: lookup.get(`${date}|${token}`) ?? 0 }))
    );

    return { dates, tokens, grid };
  }, [rows]);

  if (tokens.length === 0 || dates.length === 0) return null;

  const cellW = Math.max(6, Math.min(20, Math.floor(800 / dates.length)));

  const dateInterval = Math.max(1, Math.ceil(dates.length / 15)); // Show ~15 dates max

  const totalWidth = 64 + dates.length * cellW;

  return (
    <div className="rounded-lg border p-3 bg-card">
      <div className="relative">
        {/* Date header - horizontal */}
        <div className="mb-2">
          <div className="flex gap-px">
            <div style={{ width: 64 }} /> {/* Spacer for token labels */}
            {dates.map((date, di) => (
              <div
                key={date}
                className="text-[10px] text-muted-foreground text-center flex-1 min-w-0"
              >
                {di % dateInterval === 0 ? date.slice(5) : ""}
              </div>
            ))}
          </div>
        </div>

        {/* Heatmap grid */}
        <div>
          <div className="flex gap-px">
            {/* Token labels */}
            <div className="flex flex-col gap-px" style={{ minWidth: 64, flexShrink: 0 }}>
              {tokens.map((t) => (
                <div key={t} className="text-[10px] text-muted-foreground truncate h-5 leading-5" style={{ maxWidth: 64 }}>
                  {t}
                </div>
              ))}
            </div>
            {/* Grid */}
            <div className="flex gap-px flex-1">
              {dates.map((date, di) => (
                <div key={date} className="flex flex-col gap-px relative flex-1">
                  {tokens.map((token, ti) => {
                    const pct = grid[ti][di].pct;
                    const isHovered = hoveredCell?.date === date && hoveredCell?.token === token;
                    return (
                      <div
                        key={token}
                        className="relative transition-opacity flex-1"
                        style={{
                          minHeight: 20,
                          backgroundColor: pctToColor(pct),
                          cursor: "pointer",
                          opacity: isHovered ? 0.8 : 1,
                          zIndex: isHovered ? 40 : 0,
                        }}
                        onMouseEnter={() => setHoveredCell({ token, date, pct })}
                        onMouseLeave={() => setHoveredCell(null)}
                      >
                        {isHovered && (
                          <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1 bg-background/95 border border-border rounded px-2 py-1 text-[10px] text-foreground shadow-lg z-50 pointer-events-none whitespace-nowrap">
                            {pct.toFixed(2)}%
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 mt-3 text-[10px] text-muted-foreground">
        <div className="h-3 w-16 rounded" style={{ background: "linear-gradient(to right, hsl(217,91%,90%), hsl(217,91%,25%))" }} />
        <span>0% → high%</span>
      </div>
    </div>
  );
}
