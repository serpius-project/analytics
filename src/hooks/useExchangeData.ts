"use client";
import useSWR from "swr";
import type { ExchangeData, PriceMap, TokenInfo } from "@/types/exchange";
import { SYMBOL_OVERRIDES } from "@/lib/constants";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function buildPriceMap(exc: ExchangeData, chain: string): PriceMap {
  const out: PriceMap = {};
  const chainBlob = exc[chain] ?? {};

  for (const [tokenAddr, obj] of Object.entries(chainBlob)) {
    const token = tokenAddr.toLowerCase();
    let symbol: string | undefined;
    let decimals = 18;

    for (const t of obj.inputTokens ?? []) {
      if (t.id.toLowerCase() === token) {
        symbol = t.symbol;
        decimals = parseInt(t.decimals ?? "18", 10);
        break;
      }
    }
    if (!symbol) symbol = obj.symbol;
    if (!symbol) symbol = SYMBOL_OVERRIDES[token];
    if (!symbol) symbol = token.slice(0, 6) + "…" + token.slice(-4);

    const prices = (obj.prices ?? []).map(([ts, price]) => ({ timestamp: ts, price }));
    prices.sort((a, b) => a.timestamp - b.timestamp);

    out[token] = { symbol, decimals, prices } as TokenInfo;
  }

  // Ensure SYMBOL_OVERRIDES entries exist
  for (const [addr, sym] of Object.entries(SYMBOL_OVERRIDES)) {
    const key = addr.toLowerCase();
    if (!out[key]) {
      out[key] = { symbol: sym, decimals: 18, prices: [] };
    }
  }

  return out;
}

export function useExchangeData() {
  return useSWR<ExchangeData>("/api/exchange", fetcher, {
    refreshInterval: 300_000,
    revalidateOnFocus: false,
  });
}
