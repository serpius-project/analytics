export const CHAINS = ["ethereum", "base", "arbitrum"] as const;
export type Chain = (typeof CHAINS)[number];

export const CHAIN_LABELS: Record<Chain, string> = {
  ethereum: "Ethereum",
  base: "Base",
  arbitrum: "Arbitrum",
};

export const CHAIN_COLORS: Record<Chain, string> = {
  ethereum: "#6366f1",
  base: "#3b82f6",
  arbitrum: "#10b981",
};

export const TREASURY_CONTRACTS: Record<string, string> = {
  Ethereum: "0x9cd8d94f69ed3ca784231e162905745c436d22bc",
  Base: "0x9b2ae23a9693475f0588e09e814d6977821c1492",
  Arbitrum: "0x5f2d9c9619807182a9c3353ff67fd695b6d1b892",
};

export const PROTOCOL_OWNER = "0x383Ea62B67fe18CF201E065DB93Cb830D2cD3677";
export const WEDT_TOKENS = TREASURY_CONTRACTS;

export const WEDEFIN_BASE_URL = "https://app.wedefin.com";

export const SYMBOL_OVERRIDES: Record<string, string> = {
  "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2": "WETH",
  "0x4200000000000000000000000000000000000006": "WETH",
  "0x82af49447d8a07e3bd95bd0d56f35241523fbab1": "WETH",
};
