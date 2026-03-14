export interface WedxRawRow {
  timestamp: number;
  value: number;
  value_btc?: number;
  assets?: string[];
  balances?: number[];
}

export interface WedxPriceRow {
  timestamp: number;
  datetime: string; // ISO date string "YYYY-MM-DD"
  value: number;
  chain: string;
}

export interface WedxCompositionRow {
  timestamp: number;
  datetime: string;
  date: string; // "YYYY-MM-DD"
  asset: string;
  balance: number;
  value: number;
  chain: string;
}
