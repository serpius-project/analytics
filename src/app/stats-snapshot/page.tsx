"use client";
import { useState, useMemo } from "react";
import { TvlBarChart } from "@/components/stats-snapshot/TvlBarChart";
import { TvlStackedBar } from "@/components/stats-snapshot/TvlStackedBar";
import { KpiCard } from "@/components/shared/KpiCard";
import { ChartSkeleton, KpiSkeleton } from "@/components/shared/LoadingOverlay";
import { ErrorBanner } from "@/components/shared/ErrorBanner";
import { CsvExportButton } from "@/components/shared/CsvExportButton";
import { MultiSelect } from "@/components/shared/MultiSelect";
import { useStatsData } from "@/hooks/useStatsData";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fmtInt, fmtUsd } from "@/lib/formatters";

const CHAIN_ORDER = ["Base", "Ethereum", "Arbitrum"];

export default function StatsSnapshotPage() {
  const { rows, isLoading, error } = useStatsData();
  const allChains = useMemo(() => {
    const known = CHAIN_ORDER.filter((c) => rows.some((r) => r.chain === c));
    const unknown = rows.map((r) => r.chain).filter((c) => !CHAIN_ORDER.includes(c)).sort();
    return [...known, ...unknown];
  }, [rows]);

  const [selectedChains, setSelectedChains] = useState<string[]>([]);

  const effectiveChains = selectedChains.length > 0 ? selectedChains : allChains;
  const filtered = useMemo(
    () => rows.filter((r) => effectiveChains.includes(r.chain)),
    [rows, effectiveChains]
  );

  const totalUsers = filtered.reduce((s, r) => s + r.total_users, 0);
  const totalTvl = filtered.reduce((s, r) => s + r.total_tvl, 0);

  return (
    <>
      
      <div className="flex flex-col md:flex-row flex-1 min-h-0">
        <aside className="md:w-56 shrink-0 border-b md:border-b-0 md:border-r p-4 flex flex-col gap-3 bg-sidebar/30">
          <div>
            <Label className="text-xs font-medium mb-1 block">Chains</Label>
            <MultiSelect
              options={allChains}
              selected={selectedChains.length ? selectedChains : allChains}
              onChange={setSelectedChains}
              placeholder="All chains"
            />
          </div>
        </aside>

        <main className="flex-1 p-6 overflow-y-auto">
          {error && <ErrorBanner message="Failed to load stats data." />}

          {isLoading ? (
            <KpiSkeleton count={3} />
          ) : (
            <div className="grid grid-cols-3 gap-4 mb-6">
              <KpiCard label="Chains" value={String(filtered.length)} />
              <KpiCard label="Total Users" value={fmtInt(totalUsers)} />
              <KpiCard label="Total TVL" value={fmtUsd(totalTvl)} />
            </div>
          )}

          <Separator className="mb-6" />

          <h3 className="text-sm font-semibold mb-3">Total TVL by Chain</h3>
          {isLoading ? <ChartSkeleton height={320} /> : <TvlBarChart data={filtered} />}

          <h3 className="text-sm font-semibold mt-6 mb-3">Index vs Pro TVL</h3>
          {isLoading ? <ChartSkeleton height={320} /> : <TvlStackedBar data={filtered} />}

          <Separator className="my-6" />
          <div className="overflow-x-auto rounded-lg border mb-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Chain</TableHead>
                  <TableHead className="text-right">Total Users</TableHead>
                  <TableHead className="text-right">Index Users</TableHead>
                  <TableHead className="text-right">Pro Users</TableHead>
                  <TableHead className="text-right">Index TVL</TableHead>
                  <TableHead className="text-right">Pro TVL</TableHead>
                  <TableHead className="text-right">Total TVL</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => (
                  <TableRow key={r.chain}>
                    <TableCell className="font-medium">{r.chain}</TableCell>
                    <TableCell className="text-right tabular-nums">{fmtInt(r.total_users)}</TableCell>
                    <TableCell className="text-right tabular-nums">{fmtInt(r.index_users)}</TableCell>
                    <TableCell className="text-right tabular-nums">{fmtInt(r.pro_users)}</TableCell>
                    <TableCell className="text-right tabular-nums">{fmtUsd(r.total_index_tvl)}</TableCell>
                    <TableCell className="text-right tabular-nums">{fmtUsd(r.total_pro_tvl)}</TableCell>
                    <TableCell className="text-right tabular-nums">{fmtUsd(r.total_tvl)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <CsvExportButton
            data={filtered as unknown as Record<string, unknown>[]}
            filename="wedefin_stats_snapshot.csv"
          />
        </main>
      </div>
    </>
  );
}
