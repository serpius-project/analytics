export interface AllocationRow {
  date: string; // "YYYY-MM-DD"
  symbol: string;
  usdValue: number;
  dayTotal: number;
  pct: number; // 0–100
}

/** Group bottom tokens into "Other" per day, keeping top N by USD value */
export function groupTopN(rows: AllocationRow[], N: number): AllocationRow[] {
  const byDate = new Map<string, AllocationRow[]>();
  for (const r of rows) {
    const arr = byDate.get(r.date) ?? [];
    arr.push(r);
    byDate.set(r.date, arr);
  }

  const out: AllocationRow[] = [];
  for (const [date, group] of byDate) {
    const sorted = [...group].sort((a, b) => b.usdValue - a.usdValue);
    const head = sorted.slice(0, N);
    const tail = sorted.slice(N);
    out.push(...head);
    if (tail.length > 0) {
      const otherUsd = tail.reduce((s, r) => s + r.usdValue, 0);
      const dayTotal = group[0].dayTotal;
      out.push({
        date,
        symbol: "Other",
        usdValue: otherUsd,
        dayTotal,
        pct: (otherUsd / dayTotal) * 100,
      });
    }
  }
  return out.sort((a, b) => {
    const dateCompare = a.date.localeCompare(b.date);
    if (dateCompare !== 0) return dateCompare;
    // Within same date, "Other" always comes last
    const aIsOther = a.symbol === "Other";
    const bIsOther = b.symbol === "Other";
    if (aIsOther && !bIsOther) return 1;
    if (!aIsOther && bIsOther) return -1;
    return a.symbol.localeCompare(b.symbol);
  });
}

/** HHI per day from AllocationRows */
export function hhiSeries(rows: AllocationRow[]): { date: string; hhi: number; effectiveN: number }[] {
  const byDate = new Map<string, number[]>();
  for (const r of rows) {
    const arr = byDate.get(r.date) ?? [];
    arr.push(r.pct / 100);
    byDate.set(r.date, arr);
  }
  const result: { date: string; hhi: number; effectiveN: number }[] = [];
  for (const [date, weights] of byDate) {
    const h = weights.reduce((s, w) => s + w * w, 0);
    result.push({ date, hhi: h, effectiveN: h > 0 ? 1 / h : NaN });
  }
  return result.sort((a, b) => a.date.localeCompare(b.date));
}

/** Turnover series: 0.5 * sum(|Δweight|) per day */
export function turnoverSeries(rows: AllocationRow[]): { date: string; turnoverPct: number }[] {
  const dates = [...new Set(rows.map((r) => r.date))].sort();
  const symbols = [...new Set(rows.map((r) => r.symbol))];

  const pivot = new Map<string, Map<string, number>>();
  for (const r of rows) {
    const m = pivot.get(r.date) ?? new Map<string, number>();
    m.set(r.symbol, r.pct);
    pivot.set(r.date, m);
  }

  const result: { date: string; turnoverPct: number }[] = [];
  for (let i = 1; i < dates.length; i++) {
    const prev = pivot.get(dates[i - 1])!;
    const curr = pivot.get(dates[i])!;
    let sum = 0;
    for (const sym of symbols) {
      sum += Math.abs((curr.get(sym) ?? 0) - (prev.get(sym) ?? 0));
    }
    result.push({ date: dates[i], turnoverPct: sum * 0.5 });
  }
  return result;
}

/** Find rebalancing events: days where max |Δweight| >= thresholdPct */
export function rebalanceEvents(
  rows: AllocationRow[],
  thresholdPct: number
): { date: string; maxAbsDeltaPct: number }[] {
  const dates = [...new Set(rows.map((r) => r.date))].sort();
  const symbols = [...new Set(rows.map((r) => r.symbol))];

  const pivot = new Map<string, Map<string, number>>();
  for (const r of rows) {
    const m = pivot.get(r.date) ?? new Map<string, number>();
    m.set(r.symbol, r.pct);
    pivot.set(r.date, m);
  }

  const result: { date: string; maxAbsDeltaPct: number }[] = [];
  for (let i = 1; i < dates.length; i++) {
    const prev = pivot.get(dates[i - 1])!;
    const curr = pivot.get(dates[i])!;
    let maxDelta = 0;
    for (const sym of symbols) {
      const delta = Math.abs((curr.get(sym) ?? 0) - (prev.get(sym) ?? 0));
      if (delta > maxDelta) maxDelta = delta;
    }
    if (maxDelta >= thresholdPct) {
      result.push({ date: dates[i], maxAbsDeltaPct: maxDelta });
    }
  }
  return result;
}

/**
 * Find nearest price entry within toleranceMs milliseconds.
 * prices must be sorted by timestamp ascending.
 */
export function nearestPrice(
  prices: { timestamp: number; price: number }[],
  targetMs: number,
  toleranceMs: number
): number | null {
  if (prices.length === 0) return null;
  let best: { timestamp: number; price: number } | null = null;
  let bestDiff = Infinity;
  for (const p of prices) {
    const diff = Math.abs(p.timestamp - targetMs);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = p;
    }
  }
  if (best === null || bestDiff > toleranceMs) return null;
  return best.price;
}
