export interface PriceEntry {
  timestamp: number;
  price: number;
}

export interface TokenInfo {
  symbol: string;
  decimals: number;
  prices: PriceEntry[];
}

// keyed by token address (lowercased)
export type PriceMap = Record<string, TokenInfo>;

// raw exchange_data.json shape: { chain: { tokenAddr: { inputTokens, prices, symbol, ... } } }
export type ExchangeData = Record<string, Record<string, ExchangeTokenRaw>>;

export interface ExchangeTokenRaw {
  symbol?: string;
  inputTokens?: { id: string; symbol: string; decimals: string }[];
  prices?: [number, number][];
}
