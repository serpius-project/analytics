export interface BalanceRow {
  chain: string;
  address: string;
  amount: number;
  usd_value: number;
}

export interface AccountingPayload {
  treasury: BalanceRow[];
  ownerEth: BalanceRow[];
  ownerWedt: BalanceRow[];
  ethUsd: number;
  chainStats: Record<string, { total_revenue: number; total_profit: number }> | null;
  totals: { total_revenue: number; total_profit: number } | null;
  errors: string[];
}
