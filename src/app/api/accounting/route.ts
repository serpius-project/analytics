import { NextResponse } from "next/server";
import type { AccountingPayload, BalanceRow } from "@/types/accounting";
import { TREASURY_CONTRACTS, PROTOCOL_OWNER, WEDT_TOKENS } from "@/lib/constants";

export const dynamic = "force-dynamic";

function rpcUrl(chain: string): string {
  const key = process.env.INFURA_KEY ?? "";
  switch (chain) {
    case "Ethereum": return `https://mainnet.infura.io/v3/${key}`;
    case "Base":     return `https://base-mainnet.infura.io/v3/${key}`;
    case "Arbitrum": return `https://arbitrum-mainnet.infura.io/v3/${key}`;
    default:         return "";
  }
}

async function ethCall(url: string, to: string, data: string): Promise<string> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", method: "eth_call", params: [{ to, data }, "latest"], id: 1 }),
  });
  const j = await res.json();
  if (j.error) throw new Error(JSON.stringify(j.error));
  return j.result ?? "0x";
}

async function getEthBalance(url: string, address: string): Promise<number> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", method: "eth_getBalance", params: [address, "latest"], id: 1 }),
  });
  const j = await res.json();
  if (j.error) throw new Error(JSON.stringify(j.error));
  return parseInt(j.result ?? "0x0", 16) / 1e18;
}

async function erc20Decimals(url: string, token: string): Promise<number> {
  try {
    const res = await ethCall(url, token, "0x313ce567");
    return res && res !== "0x" ? parseInt(res, 16) : 18;
  } catch {
    return 18;
  }
}

async function erc20BalanceOf(url: string, token: string, owner: string, decimals: number): Promise<number> {
  const addr = owner.toLowerCase().replace("0x", "").padStart(64, "0");
  const data = "0x70a08231" + addr;
  const res = await ethCall(url, token, data);
  const raw = res && res !== "0x" ? BigInt(res) : 0n;
  return Number(raw) / Math.pow(10, decimals);
}

async function getEthPriceUsd(): Promise<number> {
  const res = await fetch(
    "https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd",
    { next: { revalidate: 120 } }
  );
  const j = await res.json();
  return Number(j?.ethereum?.usd ?? NaN);
}

export async function GET() {
  const errors: string[] = [];
  const chains = ["Ethereum", "Base", "Arbitrum"] as const;

  // Parallel: fetch ETH price + all balances
  const [ethUsdResult, ...chainResults] = await Promise.allSettled([
    getEthPriceUsd(),
    ...chains.map(async (chain) => {
      const url = rpcUrl(chain);
      const treasuryAddr = TREASURY_CONTRACTS[chain];
      const [treasuryBal, ownerEthBal, wedtDec, wedtBal] = await Promise.all([
        getEthBalance(url, treasuryAddr).catch((e) => { errors.push(`${chain} treasury: ${e}`); return 0; }),
        getEthBalance(url, PROTOCOL_OWNER).catch((e) => { errors.push(`${chain} owner ETH: ${e}`); return 0; }),
        erc20Decimals(url, WEDT_TOKENS[chain]).catch(() => 18),
        Promise.resolve(0), // placeholder, computed after decimals
      ]);
      const wedtBalance = await erc20BalanceOf(url, WEDT_TOKENS[chain], PROTOCOL_OWNER, wedtDec)
        .catch((e) => { errors.push(`${chain} WEDT: ${e}`); return 0; });
      return { chain, treasuryBal, ownerEthBal, wedtBalance };
    }),
  ]);

  const ethUsd = ethUsdResult.status === "fulfilled" ? ethUsdResult.value : NaN;

  const treasury: BalanceRow[] = [];
  const ownerEth: BalanceRow[] = [];
  const ownerWedt: BalanceRow[] = [];

  for (const result of chainResults) {
    if (result.status !== "fulfilled") continue;
    const { chain, treasuryBal, ownerEthBal, wedtBalance } = result.value;
    treasury.push({ chain, address: TREASURY_CONTRACTS[chain], amount: treasuryBal, usd_value: treasuryBal * ethUsd });
    ownerEth.push({ chain, address: PROTOCOL_OWNER, amount: ownerEthBal, usd_value: ownerEthBal * ethUsd });
    ownerWedt.push({ chain, address: WEDT_TOKENS[chain], amount: wedtBalance, usd_value: wedtBalance * ethUsd });
  }

  // Fetch revenue stats
  let chainStats: AccountingPayload["chainStats"] = null;
  let totals: AccountingPayload["totals"] = null;
  try {
    const rev = await fetch("https://app.wedefin.com/stats_revenue_data.json", {
      next: { revalidate: 120 },
    });
    if (rev.ok) {
      const data = await rev.json();
      chainStats = data.chains ?? null;
      totals = data.totals ?? null;
    }
  } catch {
    // non-fatal
  }

  const payload: AccountingPayload = { treasury, ownerEth, ownerWedt, ethUsd, chainStats, totals, errors };
  return NextResponse.json(payload);
}
