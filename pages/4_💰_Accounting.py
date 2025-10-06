import os
import pandas as pd
import requests
import streamlit as st

st.set_page_config(page_title="Wedefin — Accounting", page_icon="💰", layout="wide")
st.title("💰 Wedefin — Accounting")

# -----------------------------------
# Config
# -----------------------------------
TREASURY_CONTRACTS = {
    "Ethereum": "0x9cd8d94f69ed3ca784231e162905745c436d22bc",
    "Base":     "0x9b2ae23a9693475f0588e09e814d6977821c1492",
    "Arbitrum": "0x5f2d9c9619807182a9c3353ff67fd695b6d1b892",
}

PROTOCOL_OWNER = "0x383Ea62B67fe18CF201E065DB93Cb830D2cD3677"
WEDT_TOKENS = TREASURY_CONTRACTS

# -----------------------------------
# Infura key
# -----------------------------------
infura_key = st.secrets.get("INFURA_KEY", os.getenv("INFURA_KEY", ""))

if not infura_key:
    st.error("❌ Missing Infura key in Streamlit secrets. Please add it to `.streamlit/secrets.toml` or the Cloud 'Edit secrets' UI.")
    st.stop()

# -----------------------------------
# Sidebar
# -----------------------------------
with st.sidebar:
    st.header("⚙️ Fetch")
    st.caption("Balances load automatically. Use refresh to force an update.")
    if st.button("🔄 Refresh balances"):
        get_eth_balance.clear()
        erc20_decimals.clear()
        erc20_balance_of.clear()
        get_eth_price_usd.clear()
        st.rerun()

# -----------------------------------
# RPC helpers
# -----------------------------------
def rpc_map(_key: str) -> dict:
    return {
        "Ethereum": f"https://mainnet.infura.io/v3/{_key}",
        "Base":     f"https://base-mainnet.infura.io/v3/{_key}",
        "Arbitrum": f"https://arbitrum-mainnet.infura.io/v3/{_key}",
    }

@st.cache_data(ttl=120, show_spinner=False)
def get_eth_balance(rpc_url: str, address: str) -> float:
    payload = {"jsonrpc": "2.0", "method": "eth_getBalance", "params": [address, "latest"], "id": 1}
    r = requests.post(rpc_url, json=payload, timeout=20)
    r.raise_for_status()
    j = r.json()
    if "error" in j:
        raise RuntimeError(j["error"])
    wei = int(j.get("result", "0x0"), 16)
    return wei / 1e18

def _eth_call(rpc_url: str, to: str, data: str) -> str:
    payload = {"jsonrpc": "2.0", "method": "eth_call", "params": [{"to": to, "data": data}, "latest"], "id": 1}
    r = requests.post(rpc_url, json=payload, timeout=20)
    r.raise_for_status()
    j = r.json()
    if "error" in j:
        raise RuntimeError(j["error"])
    return j.get("result", "0x")

@st.cache_data(ttl=300, show_spinner=False)
def erc20_decimals(rpc_url: str, token: str, default: int = 18) -> int:
    try:
        res = _eth_call(rpc_url, token, "0x313ce567")
        return int(res, 16) if res and res != "0x" else default
    except Exception:
        return default

@st.cache_data(ttl=300, show_spinner=False)
def erc20_balance_of(rpc_url: str, token: str, owner: str, decimals_hint: int | None = None) -> float:
    selector = "70a08231"  # balanceOf(address)
    addr = owner.lower().replace("0x", "")
    data = "0x" + selector + addr.rjust(64, "0")
    res = _eth_call(rpc_url, token, data)
    raw = int(res, 16) if res and res != "0x" else 0
    dec = decimals_hint if decimals_hint is not None else 18
    return raw / (10 ** dec)

@st.cache_data(ttl=300, show_spinner=False)
def get_eth_price_usd() -> float:
    url = "https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd"
    r = requests.get(url, timeout=20)
    r.raise_for_status()
    return float(r.json()["ethereum"]["usd"])

@st.cache_data(ttl=120, show_spinner=False)
def fetch_wedefin_stats():
    """
    Fetch Wedefin stats from the public endpoint.
    Returns (totals_dict, chains_dict) or (None, None) on failure.
    """
    try:
        url = "https://app.wedefin.com/stats_revenue_data.json"
        r = requests.get(url, timeout=20)
        r.raise_for_status()
        data = r.json()
        return data.get("totals"), data.get("chains")
    except Exception as e:
        st.warning(f"Stats endpoint unavailable: {e}")
        return None, None

# -----------------------------------
# Fetch + assemble
# -----------------------------------
def compute_balances():
    rpcs = rpc_map(infura_key)
    errors: list[str] = []
    treasury_rows, owner_eth_rows, owner_wedt_rows = [], [], []
    owner_eth_total = 0.0

    with st.spinner("Querying chains via Infura…"):
        for chain, addr in TREASURY_CONTRACTS.items():
            try:
                bal = get_eth_balance(rpcs[chain], addr)
                treasury_rows.append({
                    "section": "Treasury", "source": "Treasury ETH",
                    "chain": chain, "address": addr, "amount": bal
                })
            except Exception as e:
                errors.append(f"{chain} (treasury): {e}")

        for chain in ("Ethereum", "Base", "Arbitrum"):
            try:
                bal = get_eth_balance(rpcs[chain], PROTOCOL_OWNER)
                owner_eth_total += float(bal)
                owner_eth_rows.append({
                    "section": "Protocol Revenue", "source": "Owner ETH",
                    "chain": chain, "address": PROTOCOL_OWNER, "amount": bal
                })
            except Exception as e:
                errors.append(f"{chain} (owner ETH): {e}")

        for chain, token_addr in WEDT_TOKENS.items():
            try:
                dec = erc20_decimals(rpcs[chain], token_addr, 18)
                bal = erc20_balance_of(rpcs[chain], token_addr, PROTOCOL_OWNER, decimals_hint=dec)
                owner_wedt_rows.append({
                    "section": "Protocol Revenue", "source": "WEDT",
                    "chain": chain, "address": token_addr, "amount": bal
                })
            except Exception as e:
                errors.append(f"{chain} (WEDT): {e}")

    df_treasury   = pd.DataFrame(treasury_rows)
    df_owner_eth  = pd.DataFrame(owner_eth_rows)
    df_owner_wedt = pd.DataFrame(owner_wedt_rows)

    try:
        eth_usd = get_eth_price_usd()
    except Exception as e:
        eth_usd = float("nan")
        errors.append(f"ETH price: {e}")

    return df_treasury, df_owner_eth, df_owner_wedt, owner_eth_total, eth_usd, errors

df_treasury, df_owner_eth, df_owner_wedt, owner_eth_total, eth_usd, errors = compute_balances()

totals_stats, chains_stats = fetch_wedefin_stats()

fetched_profit_eth  = None
fetched_revenue_eth = None
if totals_stats:
    fetched_revenue_eth = float(totals_stats.get("total_revenue", 0.0))
    fetched_profit_eth  = float(totals_stats.get("total_profit", 0.0))

fetched_profit_usd  = (fetched_profit_eth  * eth_usd) if (fetched_profit_eth  is not None and pd.notna(eth_usd)) else None
fetched_revenue_usd = (fetched_revenue_eth * eth_usd) if (fetched_revenue_eth is not None and pd.notna(eth_usd)) else None

if errors:
    st.warning("\n".join(errors))

if df_treasury.empty and df_owner_eth.empty and df_owner_wedt.empty:
    st.error("Could not fetch any balances.")
    st.stop()

# -----------------------------------
# Value in USD columns
# -----------------------------------
for df in (df_treasury, df_owner_eth, df_owner_wedt):
    if not df.empty:
        df["usd_value"] = df["amount"] * eth_usd

treasury_eth_total = float(df_treasury["amount"].sum()) if not df_treasury.empty else 0.0
treasury_usd_total = float(df_treasury["usd_value"].sum()) if not df_treasury.empty else 0.0

owner_eth_total_usd = owner_eth_total * eth_usd if pd.notna(eth_usd) else float("nan")
wedt_total_units = float(df_owner_wedt["amount"].sum()) if not df_owner_wedt.empty else 0.0
wedt_total_usd   = wedt_total_units * eth_usd if pd.notna(eth_usd) else float("nan")

protocol_revenue_eth = (owner_eth_total if pd.notna(owner_eth_total) else 0.0) + (wedt_total_units if pd.notna(wedt_total_units) else 0.0)
protocol_revenue_usd = protocol_revenue_eth * eth_usd if pd.notna(eth_usd) else float("nan")

# -----------------------------------
# KPIs
# -----------------------------------
r1c1, r1c2 = st.columns(2)

kpi_profit_eth = fetched_profit_eth if fetched_profit_eth is not None else (protocol_revenue_eth if pd.notna(protocol_revenue_eth) else None)
kpi_profit_usd = fetched_profit_usd if fetched_profit_usd is not None else (protocol_revenue_usd if pd.notna(protocol_revenue_usd) else None)

r1c1.metric("Protocol Profit (ETH)", f"{kpi_profit_eth:,.6f}" if kpi_profit_eth is not None else "—")
r1c2.metric("Protocol Profit (USD)", f"{kpi_profit_usd:,.2f}" if kpi_profit_usd is not None else "—")

r2c1, r2c2 = st.columns(2)
kpi_revenue_eth = fetched_revenue_eth if fetched_revenue_eth is not None else (treasury_eth_total if pd.notna(treasury_eth_total) else None)
kpi_revenue_usd = fetched_revenue_usd if fetched_revenue_usd is not None else (treasury_usd_total if pd.notna(treasury_usd_total) else None)

r2c1.metric("Protocol Revenue (ETH)", f"{kpi_revenue_eth:,.6f}" if kpi_revenue_eth is not None else "—")
r2c2.metric("Protocol Revenue (USD)", f"{kpi_revenue_usd:,.2f}" if kpi_revenue_usd is not None else "—")

st.markdown("---")

# -----------------------------------
# Revenue & Profit by chain (chart)
# -----------------------------------
if chains_stats:
    rows = []
    for chain, vals in chains_stats.items():
        rows.append({"chain": chain.capitalize(), "metric": "Revenue", "eth": float(vals.get("total_revenue", 0.0))})
        rows.append({"chain": chain.capitalize(), "metric": "Profit",  "eth": float(vals.get("total_profit", 0.0))})
    df_chain_stats = pd.DataFrame(rows)

    import altair as alt
    chart = (
        alt.Chart(df_chain_stats)
        .mark_bar()
        .encode(
            x=alt.X("chain:N", title="Chain"),
            xOffset="metric:N",
            y=alt.Y("eth:Q", title="ETH"),
            color=alt.Color("metric:N", legend=alt.Legend(title="Metric")),
            tooltip=[alt.Tooltip("chain:N"), alt.Tooltip("metric:N"), alt.Tooltip("eth:Q", format=",.6f", title="ETH")]
        )
        .properties(height=300)
    )
    st.subheader("Revenue & Profit by Chain (ETH)")
    st.altair_chart(chart, use_container_width=True)
else:
    st.info("Chain-level stats unavailable from the endpoint.")

# -----------------------------------
# Detailed tables
# -----------------------------------
st.subheader("Breakdown")

for df in (df_treasury, df_owner_eth, df_owner_wedt):
    for col in ("section", "source"):
        if col in df.columns:
            df.drop(columns=col, inplace=True)

df_revenue = pd.concat([df_owner_eth, df_owner_wedt], ignore_index=True)

df_treasury_disp = df_treasury.drop(columns=["section", "source"], errors="ignore").copy()
df_revenue_disp  = df_revenue.drop(columns=["section", "source"], errors="ignore").copy()

col1, col2 = st.columns(2)

with col1:
    st.markdown("**Treasury Balance**")
    if not df_treasury_disp.empty:
        st.dataframe(df_treasury_disp.sort_values("chain"), use_container_width=True)
    else:
        st.info("No treasury balances found.")

with col2:
    st.markdown("**Protocol Balance**")
    if not df_revenue_disp.empty:
        st.dataframe(df_revenue_disp.sort_values(["chain", "address"]), use_container_width=True)
    else:
        st.info("No protocol balances found.")

# -----------------------------------
# Downloads
# -----------------------------------
df_display = pd.concat(
    [df_treasury_disp, df_revenue_disp] if not df_revenue_disp.empty else [df_treasury_disp],
    ignore_index=True
)

st.download_button(
    "⬇️ Download breakdown CSV",
    df_display.to_csv(index=False).encode("utf-8"),
    file_name="wedefin_breakdown.csv",
    mime="text/csv",
)

summary = pd.DataFrame([
    {"metric": "Protocol Profit (ETH)", "value": protocol_revenue_eth},
    {"metric": "Protocol Profit (USD)", "value": protocol_revenue_usd},
    {"metric": "Protocol Revenue (ETH)", "value": treasury_eth_total},
    {"metric": "Protocol Revenue (USD)", "value": treasury_usd_total},
    {"metric": "ETH Profit", "value": owner_eth_total},
    {"metric": "WEDT Profit", "value": wedt_total_units},
])

st.download_button(
    "⬇️ Download summary CSV",
    summary.to_csv(index=False).encode("utf-8"),
    file_name="wedefin_summary.csv",
    mime="text/csv",
)