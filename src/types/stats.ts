export interface StatsRow {
  chain: string;
  total_users: number;
  index_users: number;
  pro_users: number;
  total_index_tvl: number;
  total_pro_tvl: number;
  total_tvl: number;
}

export interface RevenueChainData {
  total_revenue: number;
  total_profit: number;
}

export interface RevenueTotals {
  total_revenue: number;
  total_profit: number;
}

export interface RevenueData {
  totals?: RevenueTotals;
  chains?: Record<string, RevenueChainData>;
}
