import Link from "next/link";
import { TopBar } from "@/components/layout/TopBar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart2, Layers, Globe, DollarSign, Info } from "lucide-react";

const pages = [
  {
    href: "/index-performance",
    icon: BarChart2,
    title: "Index Performance",
    description: "Financial performance of the indices with risk metrics: drawdown, VaR, Sharpe, and more.",
    color: "text-indigo-500",
  },
  {
    href: "/index-composition",
    icon: Layers,
    title: "Index Composition",
    description: "Index asset allocation, rebalancing events, token weights, and composition analytics over time.",
    color: "text-blue-500",
  },
  {
    href: "/stats-snapshot",
    icon: Globe,
    title: "Stats Snapshot",
    description: "Point-in-time overview of users and TVL per chain and product.",
    color: "text-emerald-500",
  },
  {
    href: "/accounting",
    icon: DollarSign,
    title: "Accounting",
    description: "Live on-chain treasury balances, protocol revenue, and profit across chains.",
    color: "text-amber-500",
  },
  {
    href: "/about",
    icon: Info,
    title: "About",
    description: "Data sources, update log, user guides, and contact information.",
    color: "text-slate-400",
  },
];

export default function HomePage() {
  return (
    <>
      <TopBar title="Wedefin Dashboard" />
      <main className="flex-1 p-6 max-w-4xl">
        <div className="flex items-center gap-3 mb-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/layer.svg" alt="Wedefin" className="w-8 h-8" />
          <h2 className="text-2xl font-bold">Wedefin — Public Dashboard</h2>
        </div>
        <p className="text-muted-foreground mb-8">Transparent, live metrics across chains.</p>

        <div className="grid gap-4 sm:grid-cols-2">
          {pages.map(({ href, icon: Icon, title, description, color }) => (
            <Link key={href} href={href} className="group">
              <Card className="h-full transition-colors hover:border-primary/50">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <Icon className={`h-5 w-5 ${color}`} />
                    <CardTitle className="text-base">{title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-sm leading-relaxed">{description}</CardDescription>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        <p className="text-xs text-muted-foreground mt-10">
          Last build: {new Date().toISOString().slice(0, 16).replace("T", " ")} UTC
        </p>
      </main>
    </>
  );
}
