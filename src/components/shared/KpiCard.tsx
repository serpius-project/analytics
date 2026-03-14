import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  label: string;
  value: string;
  sub?: string;
  className?: string;
  valueClassName?: string;
}

export function KpiCard({ label, value, sub, className, valueClassName }: KpiCardProps) {
  return (
    <Card className={cn("", className)}>
      <CardContent className="pt-5 pb-4">
        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{label}</p>
        <p className={cn("mt-1 text-2xl font-bold tabular-nums", valueClassName)}>{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </CardContent>
    </Card>
  );
}
