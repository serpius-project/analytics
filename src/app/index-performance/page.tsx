"use client";
import { useState, useMemo } from "react";
import { PriceLineChart } from "@/components/index-performance/PriceLineChart";
import { DrawdownChart } from "@/components/index-performance/DrawdownChart";
import { RiskMetricsTable } from "@/components/index-performance/RiskMetricsTable";
import { ChartSkeleton, KpiSkeleton } from "@/components/shared/LoadingOverlay";
import { ErrorBanner } from "@/components/shared/ErrorBanner";
import { CsvExportButton } from "@/components/shared/CsvExportButton";
import { PeriodPresetSelect } from "@/components/shared/PeriodPresetSelect";
import { MultiSelect } from "@/components/shared/MultiSelect";
import { useWedxData, collapseToDaily } from "@/hooks/useWedxData";
import { rebaseTo100, rollingDrawdown, computeChainMetrics } from "@/lib/finance";
import { presetToRange, clamp, today } from "@/lib/dateUtils";
import type { PeriodPreset } from "@/lib/dateUtils";
import { CHAINS, CHAIN_LABELS } from "@/lib/constants";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { ChevronDown } from "lucide-react";
import { Separator } from "@/components/ui/separator";

export default function IndexPerformancePage() {
  const [selectedChains, setSelectedChains] = useState<string[]>(["base"]);
  const [preset, setPreset] = useState<PeriodPreset>("Last 30 days");
  const [customStart, setCustomStart] = useState<string>(
    (() => { const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString().slice(0, 10); })()
  );
  const [customEnd, setCustomEnd] = useState<string>(today());
  const [rebase, setRebase] = useState(true);
  const [confidence, setConfidence] = useState(99.5);
  const [rfAnnual, setRfAnnual] = useState(4.0);
  const [ddOpen, setDdOpen] = useState(false);
  const [startAtZero, setStartAtZero] = useState(false);

  const { prices: allPrices, isLoading, error } = useWedxData(
    selectedChains.length > 0 ? selectedChains : ["base"]
  );

  const daily = useMemo(() => collapseToDaily(allPrices), [allPrices]);

  // Compute global range
  const globalMin = daily.length ? daily.reduce((a, b) => a.date < b.date ? a : b).date : today();
  const globalMax = daily.length ? daily.reduce((a, b) => a.date > b.date ? a : b).date : today();

  const { start: rawStart, end: rawEnd } = presetToRange(preset, globalMin, globalMax, customStart, customEnd);
  const startDate = clamp(rawStart, globalMin, globalMax);
  const endDate = clamp(rawEnd, globalMin, globalMax);

  // Filter
  const filtered = useMemo(
    () => daily.filter((p) => p.date >= startDate && p.date <= endDate && selectedChains.includes(p.chain)),
    [daily, startDate, endDate, selectedChains]
  );

  // Pivot for chart: array of { date, chain1: value, chain2: value, ... }
  const chartData = useMemo(() => {
    const byDate = new Map<string, Record<string, string | number>>();
    const dates = [...new Set(filtered.map((p) => p.date))].sort();
    for (const d of dates) byDate.set(d, { date: d });

    const chainFirstVal = new Map<string, number>();
    for (const chain of selectedChains) {
      const chainPts = filtered.filter((p) => p.chain === chain).sort((a, b) => a.date.localeCompare(b.date));
      if (chainPts.length === 0) continue;
      const values = chainPts.map((p) => p.value);
      const rebased = rebase ? rebaseTo100(values) : values;
      chainPts.forEach((p, i) => {
        const row = byDate.get(p.date);
        if (row) row[chain] = rebased[i];
      });
    }

    return [...byDate.values()];
  }, [filtered, selectedChains, rebase]);

  // Risk metrics
  const metricsRows = useMemo(() => {
    const alpha = (100 - confidence) / 100;
    const rf = rfAnnual / 100;
    return selectedChains.map((chain) => {
      const pts = filtered.filter((p) => p.chain === chain).sort((a, b) => a.date.localeCompare(b.date));
      const prices = pts.map((p) => p.value);
      return { chain, metrics: computeChainMetrics(prices, alpha, rf) };
    });
  }, [filtered, selectedChains, confidence, rfAnnual]);

  // Drawdown chart data
  const ddData = useMemo(() => {
    const byDate = new Map<string, Record<string, string | number>>();
    const dates = [...new Set(filtered.map((p) => p.date))].sort();
    for (const d of dates) byDate.set(d, { date: d });

    for (const chain of selectedChains) {
      const pts = filtered.filter((p) => p.chain === chain).sort((a, b) => a.date.localeCompare(b.date));
      if (pts.length < 2) continue;
      const prices = pts.map((p) => p.value);
      const dd = rollingDrawdown(prices).map((d) => d * 100);
      pts.forEach((p, i) => {
        const row = byDate.get(p.date);
        if (row) row[chain] = dd[i];
      });
    }
    return [...byDate.values()];
  }, [filtered, selectedChains]);

  // CSV data
  const csvData = useMemo(
    () =>
      filtered.map((p) => ({
        date: p.date,
        chain: p.chain,
        value: p.value,
      })),
    [filtered]
  );

  const metricsCsv = useMemo(
    () =>
      metricsRows.map(({ chain, metrics: m }) => ({
        chain,
        observations: m.obs,
        cum_return_pct: m.cumReturnPct,
        max_drawdown_pct: m.maxDrawdownPct,
        var_pct: m.varPct,
        es_pct: m.esPct,
        ann_vol_pct: m.annVolPct,
        sharpe: m.sharpe,
      })),
    [metricsRows]
  );

  return (
    <>
      
      <div className="flex flex-col md:flex-row flex-1 min-h-0">
        {/* Sidebar controls */}
        <aside className="md:w-56 shrink-0 border-b md:border-b-0 md:border-r p-4 flex flex-col gap-4 bg-sidebar/30">
          <div>
            <Label className="text-xs font-medium mb-1 block">Chains</Label>
            <MultiSelect
              options={[...CHAINS]}
              selected={selectedChains}
              onChange={setSelectedChains}
              placeholder="Select chains"
              labelMap={CHAIN_LABELS}
            />
          </div>
          <div>
            <Label className="text-xs font-medium mb-1 block">Period</Label>
            <PeriodPresetSelect
              value={preset}
              onChange={setPreset}
              options={["Last 7 days", "Last 30 days", "Last 90 days", "YTD", "All", "Custom range"]}
            />
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
          <div className="flex items-center gap-2">
            <Switch id="rebase" checked={rebase} onCheckedChange={setRebase} />
            <Label htmlFor="rebase" className="text-xs cursor-pointer">Rebase to 100</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch id="startAtZero" checked={startAtZero} onCheckedChange={setStartAtZero} />
            <Label htmlFor="startAtZero" className="text-xs cursor-pointer">Start Y-axis at 0</Label>
          </div>
          <Separator />
          <div>
            <Label className="text-xs font-medium mb-1 block">VaR Confidence: {confidence.toFixed(1)}%</Label>
            <Slider
              min={90} max={99.9} step={0.1}
              value={[confidence]}
              onValueChange={(v) => setConfidence(Array.isArray(v) ? v[0] : v)}
              className="mt-1"
            />
          </div>
          <div>
            <Label className="text-xs font-medium mb-1 block">Risk-free rate (annual %)</Label>
            <Input
              type="number" min={0} max={20} step={0.1}
              className="h-8 text-xs"
              value={rfAnnual}
              onChange={(e) => setRfAnnual(Number(e.target.value))}
            />
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 p-6 overflow-y-auto">
          {error && <ErrorBanner message="Failed to load index data." />}

          {isLoading ? (
            <ChartSkeleton />
          ) : (
            <PriceLineChart
              data={chartData}
              chains={selectedChains}
              rebased={rebase}
              yLabel={rebase ? "Index (100 = start)" : "Index Value"}
              startAtZero={startAtZero}
            />
          )}

          <div className="flex gap-2 mt-3">
            <CsvExportButton
              data={csvData as Record<string, unknown>[]}
              filename={`wedefin_index_${startDate}_${endDate}.csv`}
            />
          </div>

          <Separator className="my-6" />

          <h2 className="text-base font-semibold mb-4">Risk & Performance</h2>

          {isLoading ? (
            <KpiSkeleton count={selectedChains.length * 7} />
          ) : (
            <RiskMetricsTable
              rows={metricsRows}
              confidence={confidence}
              rfAnnual={rfAnnual}
            />
          )}

          <div className="flex gap-2 mt-3">
            <CsvExportButton
              data={metricsCsv as Record<string, unknown>[]}
              filename={`wedefin_metrics_${startDate}_${endDate}.csv`}
              label="Download Metrics CSV"
            />
          </div>

          <Collapsible open={ddOpen} onOpenChange={setDdOpen} className="mt-6">
            <CollapsibleTrigger className="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-accent hover:text-accent-foreground">
              Rolling Drawdown
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${ddOpen ? "rotate-180" : ""}`} />
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-4">
              <DrawdownChart data={ddData} chains={selectedChains} startAtZero={startAtZero} />
            </CollapsibleContent>
          </Collapsible>
        </main>
      </div>
    </>
  );
}
