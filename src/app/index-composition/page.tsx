"use client";
import { useState, useMemo } from "react";
import { StackedAreaChart } from "@/components/index-composition/StackedAreaChart";
import { WeightHeatmap } from "@/components/index-composition/WeightHeatmap";
import { SmallMultiples } from "@/components/index-composition/SmallMultiples";
import { PieSnapshot } from "@/components/index-composition/PieSnapshot";
import { TokenDrilldown } from "@/components/index-composition/TokenDrilldown";
import { SnapshotTimeline } from "@/components/index-composition/SnapshotTimeline";
import { KpiCard } from "@/components/shared/KpiCard";
import { ChartSkeleton, KpiSkeleton } from "@/components/shared/LoadingOverlay";
import { ErrorBanner } from "@/components/shared/ErrorBanner";
import { CsvExportButton } from "@/components/shared/CsvExportButton";
import { PeriodPresetSelect } from "@/components/shared/PeriodPresetSelect";
import { MultiSelect } from "@/components/shared/MultiSelect";
import { useWedxData, collapseCompositionToDaily } from "@/hooks/useWedxData";
import { useExchangeData, buildPriceMap } from "@/hooks/useExchangeData";
import { groupTopN, hhiSeries, turnoverSeries, rebalanceEvents, nearestPrice } from "@/lib/composition";
import type { AllocationRow } from "@/lib/composition";
import { presetToRange, clamp, today } from "@/lib/dateUtils";
import { rebaseTo100 } from "@/lib/finance";
import type { PeriodPreset } from "@/lib/dateUtils";
import { CHAINS, CHAIN_LABELS } from "@/lib/constants";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fmtPctPlain, fmtUsd, fmtNum } from "@/lib/formatters";

export default function IndexCompositionPage() {
  const [chain, setChain] = useState<string>("base");
  const [preset, setPreset] = useState<PeriodPreset>("Last 30 days");
  const [customStart, setCustomStart] = useState(
    (() => { const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString().slice(0, 10); })()
  );
  const [customEnd, setCustomEnd] = useState(today());
  const [viewMode, setViewMode] = useState<"pct" | "usd">("pct");
  const [topN, setTopN] = useState(6);
  const [toleranceHours, setToleranceHours] = useState(24);
  const [showEvents, setShowEvents] = useState(true);
  const [eventThreshold, setEventThreshold] = useState(5.0);
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [showSmallMultiples, setShowSmallMultiples] = useState(false);
  const [snapDate, setSnapDate] = useState<string | null>(null);
  const [tokenSel, setTokenSel] = useState<string | null>(null);
  const [filterTokens, setFilterTokens] = useState<string[]>([]);
  const [expandSnapshot, setExpandSnapshot] = useState(false);

  const { composition: allComp, prices: allPrices, isLoading: wedxLoading, error: wedxError } = useWedxData([chain]);
  const { data: excData, isLoading: excLoading } = useExchangeData();

  const isLoading = wedxLoading || excLoading;

  // Get daily composition for selected chain
  const dailyComp = useMemo(
    () => collapseCompositionToDaily(allComp.filter((c) => c.chain === chain)),
    [allComp, chain]
  );

  const globalMin = dailyComp.length ? dailyComp[0].date : today();
  const globalMax = dailyComp.length ? dailyComp[dailyComp.length - 1].date : today();

  const { start: rawStart, end: rawEnd } = presetToRange(preset, globalMin, globalMax, customStart, customEnd);
  const startDate = clamp(rawStart, globalMin, globalMax);
  const endDate = clamp(rawEnd, globalMin, globalMax);

  // Price map
  const priceMap = useMemo(
    () => (excData ? buildPriceMap(excData, chain) : {}),
    [excData, chain]
  );

  // Build allocation rows:
  // - Forward-fill daily balances from the last known WEDX snapshot
  // - Use end-of-day exchange prices for each calendar day in the window
  // - Denominator = sum of all priced USD values (always sums to 100%, no NAV dependency)
  const allocRows: AllocationRow[] = useMemo(() => {
    if (!dailyComp.length || Object.keys(priceMap).length === 0) return [];
    const tolMs = toleranceHours * 3600_000;

    // Build per-asset balance history sorted by date (full history, not just window,
    // so we can forward-fill assets whose last snapshot predates the window start)
    const assetHistory = new Map<string, { date: string; balance: number }[]>();
    for (const c of dailyComp) {
      const arr = assetHistory.get(c.asset) ?? [];
      arr.push({ date: c.date, balance: c.balance });
      assetHistory.set(c.asset, arr);
    }
    for (const arr of assetHistory.values()) {
      arr.sort((a, b) => a.date.localeCompare(b.date));
    }

    // Generate every calendar day in the selected window
    const allDates: string[] = [];
    const cur = new Date(startDate + "T00:00:00Z");
    const endMs = new Date(endDate + "T00:00:00Z").getTime();
    while (cur.getTime() <= endMs) {
      allDates.push(cur.toISOString().slice(0, 10));
      cur.setUTCDate(cur.getUTCDate() + 1);
    }

    // For each (asset, date): forward-fill balance + look up EOD price
    const withPrices: { date: string; symbol: string; usdValue: number }[] = [];
    for (const [asset, history] of assetHistory) {
      const info = priceMap[asset.toLowerCase()];
      if (!info || info.prices.length === 0) continue;

      for (const date of allDates) {
        // Forward-fill: carry forward the last known balance on or before this date
        let balance = 0;
        for (const b of history) {
          if (b.date <= date) balance = b.balance;
          else break;
        }
        if (balance <= 0) continue; // asset not yet in portfolio

        // Use end-of-day timestamp as canonical price reference for each day
        const eodMs = new Date(date + "T23:59:59Z").getTime();
        const price = nearestPrice(info.prices, eodMs, tolMs);
        if (price === null) continue;

        withPrices.push({ date, symbol: info.symbol, usdValue: balance * price });
      }
    }

    // Aggregate by date+symbol (sum USD values when same symbol appears multiple times)
    const agg = new Map<string, { date: string; symbol: string; usdValue: number }>();
    for (const r of withPrices) {
      const key = `${r.date}|${r.symbol}`;
      const ex = agg.get(key);
      if (ex) ex.usdValue += r.usdValue;
      else agg.set(key, { date: r.date, symbol: r.symbol, usdValue: r.usdValue });
    }

    // Day totals = sum of all priced USD values — weights always sum to 100%
    const dayTotals = new Map<string, number>();
    for (const r of agg.values()) {
      dayTotals.set(r.date, (dayTotals.get(r.date) ?? 0) + r.usdValue);
    }

    return [...agg.values()].map((r) => {
      const dt = dayTotals.get(r.date)!;
      return { date: r.date, symbol: r.symbol, usdValue: r.usdValue, dayTotal: dt, pct: (r.usdValue / dt) * 100 };
    }).sort((a, b) => a.date.localeCompare(b.date));
  }, [dailyComp, priceMap, toleranceHours, startDate, endDate]);

  const filteredAlloc = useMemo(() => {
    if (filterTokens.length === 0) return allocRows;
    return allocRows.filter((r) => filterTokens.includes(r.symbol));
  }, [allocRows, filterTokens]);

  const allocTopN = useMemo(() => groupTopN(filteredAlloc.length ? filteredAlloc : allocRows, topN), [allocRows, filteredAlloc, topN]);

  // Analytics
  const hhi = useMemo(() => hhiSeries(allocRows), [allocRows]);
  const turnover = useMemo(() => turnoverSeries(allocRows), [allocRows]);
  const events = useMemo(() => rebalanceEvents(allocRows, eventThreshold), [allocRows, eventThreshold]);

  const avgEffN = hhi.length ? hhi.reduce((s, r) => s + r.effectiveN, 0) / hhi.length : NaN;
  const avgTurnover = turnover.length ? turnover.reduce((s, r) => s + r.turnoverPct, 0) / turnover.length : NaN;
  const latestTurnover = turnover.length ? turnover[turnover.length - 1].turnoverPct : NaN;

  // Chart data pivot (date → { token: value })
  const chartData = useMemo(() => {
    const dates = [...new Set(allocTopN.map((r) => r.date))].sort();
    const tokens = [...new Set(allocTopN.map((r) => r.symbol))];
    return dates.map((date) => {
      const row: Record<string, string | number> = { date };
      for (const t of tokens) {
        const found = allocTopN.find((r) => r.date === date && r.symbol === t);
        if (viewMode === "pct") {
          row[t] = found ? found.pct / 100 : 0;
        } else {
          row[t] = found ? found.usdValue : 0;
        }
      }
      return row;
    });
  }, [allocTopN, viewMode]);

  const chartTokens = useMemo(() => {
    const tokens = [...new Set(allocTopN.map((r) => r.symbol))];
    // Ensure "Other" is always at the beginning (appears at bottom of stacked chart)
    const otherIdx = tokens.indexOf("Other");
    if (otherIdx !== -1 && otherIdx !== 0) {
      tokens.splice(otherIdx, 1);
      tokens.unshift("Other");
    }
    return tokens;
  }, [allocTopN]);

  // Snapshot
  const snapDates = useMemo(() => [...new Set(allocRows.map((r) => r.date))].sort(), [allocRows]);
  const effectiveSnapDate = snapDate && snapDates.includes(snapDate) ? snapDate : snapDates[snapDates.length - 1];
  const snapRows = useMemo(
    () => allocRows.filter((r) => r.date === effectiveSnapDate).sort((a, b) => {
      // "Other" always comes last
      const aIsOther = a.symbol === "Other";
      const bIsOther = b.symbol === "Other";
      if (aIsOther && !bIsOther) return 1;
      if (!aIsOther && bIsOther) return -1;
      // Otherwise sort by usdValue descending
      return b.usdValue - a.usdValue;
    }),
    [allocRows, effectiveSnapDate]
  );

  const allSymbols = useMemo(() => [...new Set(allocRows.map((r) => r.symbol))].sort(), [allocRows]);

  return (
    <div className="flex flex-col md:flex-row flex-1 min-h-0">
      {/* Left Sidebar Controls */}
      <aside className="md:w-60 shrink-0 border-b md:border-b-0 md:border-r p-4 flex flex-col gap-3 bg-sidebar/30 overflow-y-auto">
        <div>
          <Label className="text-xs font-medium mb-1 block">Chain</Label>
          <Select value={chain} onValueChange={(v) => v && setChain(v)}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {CHAINS.map((c) => <SelectItem key={c} value={c} className="text-xs">{CHAIN_LABELS[c]}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs font-medium mb-1 block">Period</Label>
          <PeriodPresetSelect value={preset} onChange={setPreset} options={["Last 30 days", "Last 90 days", "YTD", "All", "Custom range"]} />
        </div>
        {preset === "Custom range" && (
          <div className="flex flex-col gap-2">
            <div>
              <Label className="text-xs mb-1 block">Start</Label>
              <Input type="date" className="h-8 text-xs" value={customStart} onChange={(e) => setCustomStart(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs mb-1 block">End</Label>
              <Input type="date" className="h-8 text-xs" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} />
            </div>
          </div>
        )}
        <div>
          <Label className="text-xs font-medium mb-1 block">View Mode</Label>
          <Select value={viewMode} onValueChange={(v) => setViewMode(v as "pct" | "usd")}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="pct" className="text-xs">% Allocation</SelectItem>
              <SelectItem value="usd" className="text-xs">USD Value</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs font-medium mb-1 block">Top-N Tokens: {topN}</Label>
          <Slider min={2} max={20} step={1} value={[topN]} onValueChange={(v) => setTopN(Array.isArray(v) ? v[0] : v)} />
        </div>
        <div>
          <Label className="text-xs font-medium mb-1 block">Price Tolerance: {toleranceHours}h</Label>
          <Slider min={1} max={48} step={1} value={[toleranceHours]} onValueChange={(v) => setToleranceHours(Array.isArray(v) ? v[0] : v)} />
        </div>
        <Separator />
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Visuals</p>
        <div className="flex items-center gap-2">
          <Switch id="events" checked={showEvents} onCheckedChange={setShowEvents} />
          <Label htmlFor="events" className="text-xs cursor-pointer">Rebalancing markers</Label>
        </div>
        {showEvents && (
          <div>
            <Label className="text-xs mb-1 block">Event threshold: {eventThreshold.toFixed(1)}%</Label>
            <Slider min={0.5} max={20} step={0.5} value={[eventThreshold]} onValueChange={(v) => setEventThreshold(Array.isArray(v) ? v[0] : v)} />
          </div>
        )}
        <div className="flex items-center gap-2">
          <Switch id="heatmap" checked={showHeatmap} onCheckedChange={setShowHeatmap} />
          <Label htmlFor="heatmap" className="text-xs cursor-pointer">Weight heatmap</Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch id="sm" checked={showSmallMultiples} onCheckedChange={setShowSmallMultiples} />
          <Label htmlFor="sm" className="text-xs cursor-pointer">Small multiples</Label>
        </div>
        <Separator />
        <div>
          <Label className="text-xs font-medium mb-1 block">Highlight tokens</Label>
          <MultiSelect options={allSymbols} selected={filterTokens} onChange={setFilterTokens} placeholder="All tokens" />
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 overflow-y-auto">
          {wedxError && <ErrorBanner message="Failed to load WEDX data." />}

          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <KpiCard label="Chain" value={chain.charAt(0).toUpperCase() + chain.slice(1)} />
            <KpiCard label="Avg Effective # Tokens" value={isNaN(avgEffN) ? "—" : avgEffN.toFixed(2)} />
            <KpiCard label="Avg Turnover / day" value={isNaN(avgTurnover) ? "—" : `${avgTurnover.toFixed(2)}%`} />
            <KpiCard label="Latest Turnover" value={isNaN(latestTurnover) ? "—" : `${latestTurnover.toFixed(2)}%`} />
          </div>

          <h3 className="text-sm font-semibold mb-3">Allocation Over Time</h3>
          {isLoading ? (
            <ChartSkeleton />
          ) : allocRows.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No matched prices in this window. Try increasing the tolerance.</p>
          ) : (
            <StackedAreaChart
              data={chartData}
              tokens={chartTokens}
              mode={viewMode}
              eventDates={showEvents ? events.map((e) => e.date) : []}
            />
          )}

          {showHeatmap && allocRows.length > 0 && (
            <>
              <Separator className="my-6" />
              <h3 className="text-sm font-semibold mb-3">Weight Heatmap</h3>
              <WeightHeatmap rows={filteredAlloc.length ? filteredAlloc : allocRows} />
            </>
          )}

          {showSmallMultiples && allocRows.length > 0 && (
            <>
              <Separator className="my-6" />
              <h3 className="text-sm font-semibold mb-3">Small Multiples</h3>
              <SmallMultiples rows={filteredAlloc.length ? filteredAlloc : allocRows} />
            </>
          )}

          <Separator className="my-6" />
          <h3 className="text-sm font-semibold mb-3">Snapshot at Date</h3>
          {snapDates.length > 0 && (
            <div className="mb-6">
              <SnapshotTimeline
                dates={snapDates}
                selectedDate={effectiveSnapDate}
                onDateChange={setSnapDate}
              />
            </div>
          )}
          {snapRows.length > 0 && (
            <div className="grid md:grid-cols-2 gap-6">
              <PieSnapshot rows={snapRows} />
              <div>
                <div className="overflow-x-auto rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Token</TableHead>
                        <TableHead className="text-right">USD Value</TableHead>
                        <TableHead className="text-right">Weight %</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(expandSnapshot ? snapRows : snapRows.slice(0, 5)).map((r) => (
                        <TableRow key={r.symbol}>
                          <TableCell className="font-medium">{r.symbol}</TableCell>
                          <TableCell className="text-right tabular-nums">{fmtUsd(r.usdValue)}</TableCell>
                          <TableCell className="text-right tabular-nums">{fmtPctPlain(r.pct)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {snapRows.length > 5 && (
                  <button
                    onClick={() => setExpandSnapshot(!expandSnapshot)}
                    className="mt-3 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/10 rounded-md transition-colors"
                  >
                    {expandSnapshot ? "Show less" : `See all (${snapRows.length} tokens)`}
                  </button>
                )}
                <div className="mt-3">
                  <CsvExportButton
                    data={snapRows as unknown as Record<string, unknown>[]}
                    filename={`wedefin_${chain}_snapshot_${effectiveSnapDate}.csv`}
                    label="Download Snapshot"
                  />
                </div>
              </div>
            </div>
          )}

          <Separator className="my-6" />
          <h3 className="text-sm font-semibold mb-3">Token Drill-Down</h3>
          {allSymbols.length > 0 && (
            <>
              <div className="mb-4 max-w-xs">
                <Label className="text-xs mb-1 block">Token</Label>
                <Select value={tokenSel ?? allSymbols[0]} onValueChange={setTokenSel}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {allSymbols.map((s) => <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <TokenDrilldown rows={allocRows} token={tokenSel ?? allSymbols[0]} />
            </>
          )}

          <Separator className="my-6" />
          <div className="flex gap-2 flex-wrap">
            <CsvExportButton
              data={allocRows as unknown as Record<string, unknown>[]}
              filename={`wedefin_${chain}_allocation_${startDate}_${endDate}.csv`}
              label="Download Allocation"
            />
          </div>
        </main>
      </div>
  );
}
