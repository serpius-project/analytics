export function fmtPct(x: number, decimals = 2): string {
  if (isNaN(x) || !isFinite(x)) return "—";
  return `${x >= 0 ? "+" : ""}${x.toFixed(decimals)}%`;
}

export function fmtPctPlain(x: number, decimals = 2): string {
  if (isNaN(x) || !isFinite(x)) return "—";
  return `${x.toFixed(decimals)}%`;
}

export function fmtNum(x: number, decimals = 2): string {
  if (isNaN(x) || !isFinite(x)) return "—";
  return x.toFixed(decimals);
}

export function fmtInt(x: number): string {
  if (isNaN(x) || !isFinite(x)) return "—";
  return Math.round(x).toLocaleString();
}

export function fmtUsd(x: number, decimals = 2): string {
  if (isNaN(x) || !isFinite(x)) return "—";
  return `$${x.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
}

export function fmtEth(x: number): string {
  if (isNaN(x) || !isFinite(x)) return "—";
  return `${x.toFixed(6)} ETH`;
}
