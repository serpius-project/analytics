import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ChainMetrics } from "@/lib/finance";
import { fmtPct, fmtPctPlain, fmtNum, fmtInt } from "@/lib/formatters";

interface RiskMetricsTableProps {
  rows: { chain: string; metrics: ChainMetrics }[];
  confidence: number;
  rfAnnual: number;
}

export function RiskMetricsTable({ rows, confidence, rfAnnual }: RiskMetricsTableProps) {
  if (rows.length === 0) return null;
  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Chain</TableHead>
            <TableHead className="text-right">Obs</TableHead>
            <TableHead className="text-right">Cum. Return</TableHead>
            <TableHead className="text-right">Max Drawdown</TableHead>
            <TableHead className="text-right">VaR ({confidence.toFixed(1)}%)</TableHead>
            <TableHead className="text-right">ES ({confidence.toFixed(1)}%)</TableHead>
            <TableHead className="text-right">Ann. Vol</TableHead>
            <TableHead className="text-right">Sharpe (rf={rfAnnual.toFixed(1)}%)</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map(({ chain, metrics: m }) => (
            <TableRow key={chain}>
              <TableCell className="font-medium capitalize">{chain}</TableCell>
              <TableCell className="text-right tabular-nums">{fmtInt(m.obs)}</TableCell>
              <TableCell className={`text-right tabular-nums ${m.cumReturnPct >= 0 ? "text-emerald-500" : "text-destructive"}`}>
                {fmtPct(m.cumReturnPct)}
              </TableCell>
              <TableCell className="text-right tabular-nums text-destructive">{fmtPctPlain(m.maxDrawdownPct)}</TableCell>
              <TableCell className="text-right tabular-nums">{fmtPctPlain(m.varPct)}</TableCell>
              <TableCell className="text-right tabular-nums">{fmtPctPlain(m.esPct)}</TableCell>
              <TableCell className="text-right tabular-nums">{fmtPctPlain(m.annVolPct)}</TableCell>
              <TableCell className="text-right tabular-nums">{fmtNum(m.sharpe)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
