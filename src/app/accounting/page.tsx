"use client";
import { RevenueProfitChart } from "@/components/accounting/RevenueProfitChart";
import { KpiCard } from "@/components/shared/KpiCard";
import { KpiSkeleton, ChartSkeleton } from "@/components/shared/LoadingOverlay";
import { ErrorBanner } from "@/components/shared/ErrorBanner";
import { CsvExportButton } from "@/components/shared/CsvExportButton";
import { useAccountingData } from "@/hooks/useAccountingData";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { fmtEth, fmtUsd, fmtNum } from "@/lib/formatters";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";

export default function AccountingPage() {
  const { data, isLoading, error, mutate } = useAccountingData();

  const ethUsd = data?.ethUsd ?? NaN;
  const totals = data?.totals;
  const chainStats = data?.chainStats;

  const profitEth = totals?.total_profit ?? NaN;
  const revenueEth = totals?.total_revenue ?? NaN;

  const chartData = chainStats
    ? Object.entries(chainStats).map(([chain, vals]) => ({
        chain: chain.charAt(0).toUpperCase() + chain.slice(1),
        revenue: vals.total_revenue,
        profit: vals.total_profit,
      }))
    : [];

  const breakdownCsv = [
    ...(data?.treasury ?? []).map((r) => ({ section: "Treasury", ...r })),
    ...(data?.ownerEth ?? []).map((r) => ({ section: "Owner ETH", ...r })),
    ...(data?.ownerWedt ?? []).map((r) => ({ section: "WEDT", ...r })),
  ];

  const summaryCsv = [
    { metric: "Protocol Profit (ETH)", value: profitEth },
    { metric: "Protocol Profit (USD)", value: isNaN(profitEth) ? NaN : profitEth * ethUsd },
    { metric: "Protocol Revenue (ETH)", value: revenueEth },
    { metric: "Protocol Revenue (USD)", value: isNaN(revenueEth) ? NaN : revenueEth * ethUsd },
  ];

  return (
    <>
      
      <div className="flex flex-col md:flex-row flex-1 min-h-0">
        <aside className="md:w-56 shrink-0 border-b md:border-b-0 md:border-r p-4 flex flex-col gap-3 bg-sidebar/30">
          <p className="text-xs text-muted-foreground">Balances load automatically. Refresh to force update.</p>
          <Button variant="outline" size="sm" className="w-full gap-1.5" onClick={() => mutate()} disabled={isLoading}>
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
            Refresh balances
          </Button>
          {!isNaN(ethUsd) && (
            <p className="text-xs text-muted-foreground">ETH/USD: ${ethUsd.toLocaleString("en-US", { maximumFractionDigits: 2 })}</p>
          )}
        </aside>

        <main className="flex-1 p-6 overflow-y-auto">
          {error && <ErrorBanner message="Failed to load accounting data." />}
          {data?.errors?.length ? (
            <Alert variant="destructive" className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-xs">{data.errors.join(" • ")}</AlertDescription>
            </Alert>
          ) : null}

          {isLoading ? (
            <KpiSkeleton count={4} />
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <KpiCard label="Protocol Profit (ETH)" value={fmtEth(profitEth)} />
              <KpiCard label="Protocol Profit (USD)" value={isNaN(profitEth * ethUsd) ? "—" : fmtUsd(profitEth * ethUsd)} />
              <KpiCard label="Protocol Revenue (ETH)" value={fmtEth(revenueEth)} />
              <KpiCard label="Protocol Revenue (USD)" value={isNaN(revenueEth * ethUsd) ? "—" : fmtUsd(revenueEth * ethUsd)} />
            </div>
          )}

          {chartData.length > 0 && (
            <>
              <h3 className="text-sm font-semibold mb-3">Revenue & Profit by Chain (ETH)</h3>
              {isLoading ? <ChartSkeleton height={280} /> : <RevenueProfitChart data={chartData} />}
            </>
          )}

          <Separator className="my-6" />
          <h3 className="text-sm font-semibold mb-3">Breakdown</h3>

          <Tabs defaultValue="treasury">
            <TabsList className="mb-4">
              <TabsTrigger value="treasury">Treasury</TabsTrigger>
              <TabsTrigger value="protocol">Protocol</TabsTrigger>
            </TabsList>

            <TabsContent value="treasury">
              {isLoading ? (
                <ChartSkeleton height={160} />
              ) : (
                <div className="overflow-x-auto rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Chain</TableHead>
                        <TableHead>Address</TableHead>
                        <TableHead className="text-right">Amount (ETH)</TableHead>
                        <TableHead className="text-right">USD Value</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(data?.treasury ?? []).map((r, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-medium">{r.chain}</TableCell>
                          <TableCell className="font-mono text-xs text-muted-foreground truncate max-w-[180px]">{r.address}</TableCell>
                          <TableCell className="text-right tabular-nums">{fmtNum(r.amount, 6)}</TableCell>
                          <TableCell className="text-right tabular-nums">{fmtUsd(r.usd_value)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>

            <TabsContent value="protocol">
              {isLoading ? (
                <ChartSkeleton height={200} />
              ) : (
                <div className="overflow-x-auto rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Chain</TableHead>
                        <TableHead>Address</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead className="text-right">USD Value</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {[...(data?.ownerEth ?? []), ...(data?.ownerWedt ?? [])].map((r, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-medium">{r.chain}</TableCell>
                          <TableCell className="font-mono text-xs text-muted-foreground truncate max-w-[180px]">{r.address}</TableCell>
                          <TableCell className="text-right tabular-nums">{fmtNum(r.amount, 6)}</TableCell>
                          <TableCell className="text-right tabular-nums">{fmtUsd(r.usd_value)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>
          </Tabs>

          <div className="flex gap-2 mt-4 flex-wrap">
            <CsvExportButton
              data={breakdownCsv as Record<string, unknown>[]}
              filename="wedefin_breakdown.csv"
              label="Download Breakdown"
            />
            <CsvExportButton
              data={summaryCsv as Record<string, unknown>[]}
              filename="wedefin_summary.csv"
              label="Download Summary"
            />
          </div>
        </main>
      </div>
    </>
  );
}
