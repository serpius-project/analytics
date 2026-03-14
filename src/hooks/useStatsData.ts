"use client";
import useSWR from "swr";
import type { StatsRow } from "@/types/stats";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function normalizeChain(c: string): string {
  const map: Record<string, string> = {
    base: "Base",
    ethereum: "Ethereum",
    eth: "Ethereum",
    arbitrum: "Arbitrum",
    "arbitrum one": "Arbitrum",
  };
  return map[c.toLowerCase().trim()] ?? c;
}

export function useStatsData() {
  const { data: raw, isLoading, error, mutate } = useSWR<Record<string, Omit<StatsRow, "chain">>>(
    "/api/stats",
    fetcher,
    { refreshInterval: 60_000, revalidateOnFocus: false }
  );

  const rows: StatsRow[] = raw
    ? Object.entries(raw).map(([chain, vals]) => ({
        chain: normalizeChain(chain),
        total_users: Number(vals.total_users ?? 0),
        index_users: Number(vals.index_users ?? 0),
        pro_users: Number(vals.pro_users ?? 0),
        total_index_tvl: Number(vals.total_index_tvl ?? 0),
        total_pro_tvl: Number(vals.total_pro_tvl ?? 0),
        total_tvl: Number(vals.total_tvl ?? 0),
      }))
    : [];

  return { rows, isLoading, error, mutate };
}
