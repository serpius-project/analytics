"use client";
import useSWR from "swr";
import type { AccountingPayload } from "@/types/accounting";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useAccountingData() {
  return useSWR<AccountingPayload>("/api/accounting", fetcher, {
    refreshInterval: 120_000,
    revalidateOnFocus: false,
  });
}
