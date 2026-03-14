/** Daily simple returns from a price series */
export function dailyReturns(prices: number[]): number[] {
  const out: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    out.push(prices[i] / prices[i - 1] - 1);
  }
  return out;
}

/** Cumulative return: last/first - 1 */
export function cumulativeReturn(prices: number[]): number {
  if (prices.length < 2) return NaN;
  return prices[prices.length - 1] / prices[0] - 1;
}

/** Maximum drawdown (negative number, e.g. -0.25 = -25%) */
export function maxDrawdown(prices: number[]): number {
  if (prices.length < 2) return NaN;
  let peak = prices[0];
  let mdd = 0;
  for (const p of prices) {
    if (p > peak) peak = p;
    const dd = p / peak - 1;
    if (dd < mdd) mdd = dd;
  }
  return mdd;
}

/** Rolling drawdown series: dd[i] = prices[i]/runningMax - 1 */
export function rollingDrawdown(prices: number[]): number[] {
  let peak = prices[0];
  return prices.map((p) => {
    if (p > peak) peak = p;
    return p / peak - 1;
  });
}

/**
 * Historical VaR at alpha tail probability (e.g. 0.01 for 99% VaR).
 * Uses linear interpolation matching pandas .quantile(alpha).
 * Returns a negative number.
 */
export function historicalVaR(returns: number[], alpha: number): number {
  if (returns.length === 0) return NaN;
  const sorted = [...returns].sort((a, b) => a - b);
  const pos = alpha * (sorted.length - 1);
  const lower = Math.floor(pos);
  const upper = Math.ceil(pos);
  if (lower === upper) return sorted[lower];
  return sorted[lower] + (pos - lower) * (sorted[upper] - sorted[lower]);
}

/** Expected Shortfall (CVaR): mean of returns ≤ VaR threshold */
export function expectedShortfall(returns: number[], alpha: number): number {
  const varValue = historicalVaR(returns, alpha);
  const tail = returns.filter((r) => r <= varValue);
  if (tail.length === 0) return NaN;
  return tail.reduce((s, v) => s + v, 0) / tail.length;
}

/** Annualized volatility. periodsPerYear=365 for daily crypto. */
export function annualizedVolatility(returns: number[], periodsPerYear = 365): number {
  if (returns.length < 2) return NaN;
  const mean = returns.reduce((s, v) => s + v, 0) / returns.length;
  const variance = returns.reduce((s, v) => s + (v - mean) ** 2, 0) / (returns.length - 1);
  return Math.sqrt(variance) * Math.sqrt(periodsPerYear);
}

/** Annualized Sharpe ratio. rfAnnual as decimal (e.g. 0.04 for 4%). */
export function sharpeRatio(returns: number[], rfAnnual: number, periodsPerYear = 365): number {
  if (returns.length < 2) return NaN;
  const rfDaily = (1 + rfAnnual) ** (1 / periodsPerYear) - 1;
  const excess = returns.map((r) => r - rfDaily);
  const mean = excess.reduce((s, v) => s + v, 0) / excess.length;
  const std = Math.sqrt(
    excess.reduce((s, v) => s + (v - mean) ** 2, 0) / (excess.length - 1)
  );
  if (std === 0) return NaN;
  return (mean / std) * Math.sqrt(periodsPerYear);
}

/** Rebase price series to 100 at index 0 */
export function rebaseTo100(prices: number[]): number[] {
  if (prices.length === 0) return [];
  const base = prices[0];
  if (base === 0) return prices.map(() => 100);
  return prices.map((p) => (p / base) * 100);
}

export interface ChainMetrics {
  obs: number;
  cumReturnPct: number;
  maxDrawdownPct: number;
  varPct: number;
  esPct: number;
  annVolPct: number;
  sharpe: number;
}

export function computeChainMetrics(
  prices: number[],
  alpha: number,
  rfAnnual: number
): ChainMetrics {
  if (prices.length < 2) {
    return {
      obs: prices.length,
      cumReturnPct: NaN,
      maxDrawdownPct: NaN,
      varPct: NaN,
      esPct: NaN,
      annVolPct: NaN,
      sharpe: NaN,
    };
  }
  const r = dailyReturns(prices);
  return {
    obs: prices.length,
    cumReturnPct: cumulativeReturn(prices) * 100,
    maxDrawdownPct: maxDrawdown(prices) * 100,
    varPct: historicalVaR(r, alpha) * 100,
    esPct: expectedShortfall(r, alpha) * 100,
    annVolPct: annualizedVolatility(r) * 100,
    sharpe: sharpeRatio(r, rfAnnual),
  };
}
