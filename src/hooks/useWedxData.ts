"use client";
import useSWR from "swr";
import type { WedxRawRow } from "@/types/wedx";
import { msToDateStr } from "@/lib/dateUtils";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export interface WedxPricePoint {
  timestamp: number;
  date: string;
  value: number;
  chain: string;
}

export interface WedxCompositionPoint {
  timestamp: number;
  date: string;
  asset: string;
  balance: number;
  value: number;
  chain: string;
}

function parseWedx(raw: WedxRawRow[], chain: string): { prices: WedxPricePoint[]; composition: WedxCompositionPoint[] } {
  const prices: WedxPricePoint[] = [];
  const composition: WedxCompositionPoint[] = [];

  for (const row of raw) {
    const date = msToDateStr(row.timestamp);
    prices.push({ timestamp: row.timestamp, date, value: row.value, chain });
    if (row.assets && row.balances) {
      for (let i = 0; i < row.assets.length; i++) {
        composition.push({
          timestamp: row.timestamp,
          date,
          asset: row.assets[i],
          balance: row.balances[i],
          value: row.value,
          chain,
        });
      }
    }
  }
  return { prices, composition };
}

/** Collapse to last value per (chain, date) */
export function collapseToDaily(prices: WedxPricePoint[]): WedxPricePoint[] {
  const map = new Map<string, WedxPricePoint>();
  for (const p of prices) {
    const key = `${p.chain}|${p.date}`;
    const existing = map.get(key);
    if (!existing || p.timestamp > existing.timestamp) {
      map.set(key, p);
    }
  }
  return [...map.values()].sort((a, b) =>
    a.chain.localeCompare(b.chain) || a.date.localeCompare(b.date)
  );
}

export function collapseCompositionToDaily(comp: WedxCompositionPoint[]): WedxCompositionPoint[] {
  const map = new Map<string, WedxCompositionPoint>();
  for (const p of comp) {
    const key = `${p.date}|${p.asset}`;
    const existing = map.get(key);
    if (!existing || p.timestamp > existing.timestamp) {
      map.set(key, p);
    }
  }
  return [...map.values()].sort((a, b) => a.date.localeCompare(b.date));
}

export function useWedxData(chains: string[]) {
  // Call SWR for each chain separately (not in loop) to avoid Hook rules violation
  const ethData = useSWR<WedxRawRow[]>(`/api/wedx/ethereum`, fetcher, {
    refreshInterval: 120_000,
    revalidateOnFocus: false,
  });
  const baseData = useSWR<WedxRawRow[]>(`/api/wedx/base`, fetcher, {
    refreshInterval: 120_000,
    revalidateOnFocus: false,
  });
  const arbData = useSWR<WedxRawRow[]>(`/api/wedx/arbitrum`, fetcher, {
    refreshInterval: 120_000,
    revalidateOnFocus: false,
  });

  // Map chain names to their SWR results
  const chainDataMap: Record<string, typeof ethData> = {
    ethereum: ethData,
    base: baseData,
    arbitrum: arbData,
  };

  // Filter to only requested chains
  const results = chains.map((chain) => chainDataMap[chain]).filter(Boolean);

  const isLoading = results.some((r) => r.isLoading);
  const error = results.find((r) => r.error)?.error ?? null;

  const prices: WedxPricePoint[] = [];
  const composition: WedxCompositionPoint[] = [];

  results.forEach((r, i) => {
    if (r.data && Array.isArray(r.data)) {
      const parsed = parseWedx(r.data, chains[i]);
      prices.push(...parsed.prices);
      composition.push(...parsed.composition);
    }
  });

  return { prices, composition, isLoading, error };
}
