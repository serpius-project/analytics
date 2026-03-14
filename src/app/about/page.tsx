import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";
import { ChevronDown } from "lucide-react";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Collapsible className="border rounded-lg overflow-hidden">
      <CollapsibleTrigger className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium hover:bg-accent/50 transition-colors">
        {title}
        <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="px-4 pb-4 pt-1 text-sm text-muted-foreground leading-relaxed prose prose-sm dark:prose-invert max-w-none">
          {children}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export default function AboutPage() {
  return (
    <>
      
      <main className="flex-1 p-6 max-w-3xl">
        <p className="text-muted-foreground mb-6">
          <strong className="text-foreground">Wedefin Public Dashboard</strong> gives a transparent view of key metrics across Ethereum, Base, and Arbitrum.
        </p>

        <h2 className="text-sm font-semibold mb-3">Data Sources</h2>
        <ul className="text-sm text-muted-foreground space-y-1 mb-6 list-disc list-inside">
          <li><strong className="text-foreground">Wedefin API</strong> — index prices, compositions, and stats.</li>
          <li><strong className="text-foreground">CoinGecko</strong> — ETH/USD pricing for USD valuations.</li>
          <li><strong className="text-foreground">Infura RPC</strong> — Ethereum, Base, and Arbitrum for on-chain balances.</li>
        </ul>

        <h2 className="text-sm font-semibold mb-3">Notes & Caveats</h2>
        <ul className="text-sm text-muted-foreground space-y-1 mb-6 list-disc list-inside">
          <li>Visualizations are <strong className="text-foreground">informational</strong> and not investment advice.</li>
          <li>Time series are aligned to <strong className="text-foreground">one point per day (last value)</strong> for consistent comparisons.</li>
          <li>Upstream data and endpoints may evolve; features can be refined over time.</li>
        </ul>

        <h2 className="text-sm font-semibold mb-3">Updates</h2>
        <ul className="text-sm text-muted-foreground space-y-1 mb-6 list-disc list-inside">
          <li><strong className="text-foreground">2026-03</strong> — Migrated from Streamlit to Next.js React dashboard.</li>
          <li><strong className="text-foreground">2025-11-22</strong> — Fixed renaming in the homepage.</li>
          <li><strong className="text-foreground">2025-10-07</strong> — Fixed bug in the Accounting page.</li>
          <li><strong className="text-foreground">2025-10-06</strong> — Changed Treasury page to Accounting page.</li>
          <li><strong className="text-foreground">2025-10-04</strong> — Treasury is now public. Set default chain to Base.</li>
          <li><strong className="text-foreground">2025-09-22</strong> — Dashboard Deployment.</li>
        </ul>

        <h2 className="text-sm font-semibold mb-3">Contact</h2>
        <ul className="text-sm text-muted-foreground space-y-1 mb-8 list-disc list-inside">
          <li>X: <a href="https://x.com/wedefin" className="text-primary hover:underline">@wedefin</a></li>
          <li>Telegram: <a href="https://t.me/wedefin" className="text-primary hover:underline">t.me/wedefin</a></li>
          <li>LinkedIn: <a href="https://www.linkedin.com/company/wedefin/" className="text-primary hover:underline">Wedefin</a></li>
          <li>Email: <a href="mailto:info@wedefin.com" className="text-primary hover:underline">info@wedefin.com</a></li>
        </ul>

        <Separator className="mb-6" />
        <h2 className="text-base font-semibold mb-4">Documentation & User Guide</h2>

        <h3 className="text-sm font-medium mb-3 text-muted-foreground uppercase tracking-wide">Index Performance</h3>
        <div className="flex flex-col gap-2 mb-6">
          <Section title="What this page shows">
            <ul className="list-disc list-inside space-y-1">
              <li><strong>Goal:</strong> Compare how the Wedefin index moves on each chain over a selected period.</li>
              <li><strong>Main chart:</strong> A line per chain. Hover to see Date, Chain, and the value (raw or rebased).</li>
              <li><strong>Daily points:</strong> Data are shown once per day (last observation) to make chains comparable.</li>
              <li><strong>Metrics section:</strong> Cumulative Return, Max Drawdown, VaR, Expected Shortfall, Annualized Volatility, and Sharpe.</li>
            </ul>
          </Section>
          <Section title="Sidebar controls">
            <ul className="list-disc list-inside space-y-1">
              <li><strong>Select chains:</strong> Pick one or more of ethereum, base, arbitrum.</li>
              <li><strong>Period preset:</strong> Last 7 days, Last 30 days, YTD, All, or Custom range.</li>
              <li><strong>Rebase to 100:</strong> ON = first day in window = 100. OFF = raw index level.</li>
              <li><strong>VaR confidence:</strong> 90–99.9%.</li>
              <li><strong>Risk-free rate:</strong> Annual % for Sharpe ratio computation.</li>
            </ul>
          </Section>
          <Section title="Metrics definitions">
            <ul className="list-disc list-inside space-y-1">
              <li><strong>Cumulative return:</strong> Total % change between first and last day.</li>
              <li><strong>Max drawdown:</strong> Worst peak-to-trough % fall (more negative = deeper drop).</li>
              <li><strong>VaR:</strong> Daily loss threshold not exceeded more than (100−α)% of the time.</li>
              <li><strong>Expected Shortfall:</strong> Average loss on the worst (100−α)% of days.</li>
              <li><strong>Ann. volatility:</strong> Daily std dev × √365.</li>
              <li><strong>Sharpe:</strong> Excess daily return over risk-free rate, annualized.</li>
            </ul>
          </Section>
        </div>

        <h3 className="text-sm font-medium mb-3 text-muted-foreground uppercase tracking-wide">Index Composition</h3>
        <div className="flex flex-col gap-2 mb-6">
          <Section title="What this page shows">
            <ul className="list-disc list-inside space-y-1">
              <li>How the index is <strong>allocated across tokens over time</strong> on a selected chain.</li>
              <li>Views: stacked area (% Allocation or USD Value), weight heatmap, small multiples, snapshot pie, and token drill-down.</li>
              <li><strong>HHI:</strong> Concentration metric. Higher = more concentrated.</li>
              <li><strong>Effective N:</strong> Effective number of equally-weighted tokens. Higher = more diversified.</li>
              <li><strong>Turnover:</strong> How much the weight mix changed day-to-day.</li>
              <li><strong>Event markers:</strong> Days where largest single-token weight change exceeds threshold.</li>
            </ul>
          </Section>
          <Section title="Sidebar controls">
            <ul className="list-disc list-inside space-y-1">
              <li><strong>Chain:</strong> ethereum, base, or arbitrum.</li>
              <li><strong>View mode:</strong> % Allocation or USD Value.</li>
              <li><strong>Top-N tokens:</strong> Group remaining tokens as "Other".</li>
              <li><strong>Price tolerance:</strong> Max hours for nearest price match.</li>
              <li><strong>Index overlay:</strong> Add rebased index performance line.</li>
              <li><strong>Event markers:</strong> Show rebalancing days with dashed vertical lines.</li>
            </ul>
          </Section>
        </div>

        <h3 className="text-sm font-medium mb-3 text-muted-foreground uppercase tracking-wide">Stats Snapshot</h3>
        <div className="flex flex-col gap-2 mb-6">
          <Section title="What this page shows">
            <ul className="list-disc list-inside space-y-1">
              <li>Point-in-time overview of each chain's TVL and user counts.</li>
              <li>KPIs: Chains, Total Users, Total TVL.</li>
              <li>Total TVL by chain bar chart + Index vs Pro stacked bar chart.</li>
              <li><code>total_tvl = total_index_tvl + total_pro_tvl</code></li>
            </ul>
          </Section>
        </div>

        <h3 className="text-sm font-medium mb-3 text-muted-foreground uppercase tracking-wide">Accounting</h3>
        <div className="flex flex-col gap-2 mb-8">
          <Section title="What this page shows">
            <ul className="list-disc list-inside space-y-1">
              <li>Live on-chain ETH balances for Wedefin treasury contracts across Ethereum, Base, and Arbitrum.</li>
              <li>Protocol KPIs (Revenue & Profit) from Wedefin's stats endpoint.</li>
              <li><strong>Treasury Balance:</strong> Per-chain treasury ETH amount and USD value.</li>
              <li><strong>Protocol Balance:</strong> Protocol owner's ETH and WEDT balances per chain.</li>
            </ul>
          </Section>
          <Section title="How data is fetched">
            <ul className="list-disc list-inside space-y-1">
              <li>RPC via Infura (server-side, key never exposed to browser).</li>
              <li>Treasury ETH: <code>eth_getBalance(treasury, "latest")</code></li>
              <li>WEDT: <code>decimals()</code> then <code>balanceOf(owner)</code> on each chain.</li>
              <li>ETH/USD from CoinGecko.</li>
              <li>All three chains fetched in parallel.</li>
            </ul>
          </Section>
        </div>
      </main>
    </>
  );
}
