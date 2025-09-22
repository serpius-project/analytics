import os
import pandas as pd
import requests
import streamlit as st

st.set_page_config(page_title="Wedefin — Treasury", page_icon="💰", layout="wide")
st.title("💰 Wedefin — Treasury & Revenue")

# -----------------------------------
# Config (you can edit these safely)
# -----------------------------------
TREASURY_CONTRACTS = {
    "Ethereum": "0x9cd8d94f69ed3ca784231e162905745c436d22bc",
    "Base":     "0x9b2ae23a9693475f0588e09e814d6977821c1492",
    "Arbitrum": "0x5f2d9c9619807182a9c3353ff67fd695b6d1b892",
}

PROTOCOL_OWNER = "0x3bF51792B901A5F81B6BD3321bf9c3862D23abb8"

WEDT_TOKEN = "0x9cd8d94f69ed3ca784231e162905745c436d22bc"

# -----------------------------------
# Sidebar controls
# -----------------------------------
with st.sidebar:
    st.header("⚙️ Settings")
    default_key = st.secrets.get("INFURA_KEY", os.getenv("INFURA_KEY", ""))
    infura_key = st.text_input(
        "Infura Project ID",
        value=default_key,
        type="password",
        help="Paste your own Infura key (Project ID). Optionally store as INFURA_KEY in secrets.",
    )

    wedt_addr = st.text_input(
        "WEDT token address (ERC-20, Ethereum)",
        value=WEDT_TOKEN,
        help="Change if the WEDT token contract differs.",
    )

    fetch_now = st.button("Fetch balances", type="primary", disabled=not bool(infura_key))

if not infura_key:
    st.info("Enter your Infura Project ID in the sidebar to fetch balances.")
    st.stop()

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
    selector = "70a08231"
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

# -----------------------------------
# Fetch on demand
# -----------------------------------
if fetch_now:
    st.session_state["_treasury_fetch"] = True

if not st.session_state.get("_treasury_fetch"):
    st.stop()

rpcs = rpc_map(infura_key)
errors = []
rows = []

with st.spinner("Querying chains via Infura…"):
    for chain, addr in TREASURY_CONTRACTS.items():
        try:
            bal = get_eth_balance(rpcs[chain], addr)
            rows.append({"chain": chain, "address": addr, "eth_balance": bal})
        except Exception as e:
            errors.append(f"{chain}: {e}")

    try:
        dec = erc20_decimals(rpcs["Ethereum"], wedt_addr, 18)
        wedt_units = erc20_balance_of(rpcs["Ethereum"], wedt_addr, PROTOCOL_OWNER, decimals_hint=dec)
    except Exception as e:
        wedt_units = float("nan")
        errors.append(f"WEDT balance (via protocol owner): {e}")

if errors:
    st.warning("\n".join(errors))

df_bal = pd.DataFrame(rows)
if df_bal.empty:
    st.error("Could not fetch any treasury balances.")
    st.stop()

try:
    eth_usd = get_eth_price_usd()
except Exception as e:
    eth_usd = float("nan")
    st.warning(f"Failed to fetch ETH price: {e}")

df_bal["usd_value"] = df_bal["eth_balance"] * eth_usd

treasury_eth_total = float(df_bal["eth_balance"].sum())
treasury_usd_total = float(df_bal["usd_value"].sum())

wedt_eth = float(wedt_units) if pd.notna(wedt_units) else float("nan")
wedt_usd = float(wedt_eth * eth_usd) if pd.notna(wedt_eth) and pd.notna(eth_usd) else float("nan")

# -----------------------------------
# KPIs
# -----------------------------------
r1c1, r1c2 = st.columns(2)
r1c1.metric("Protocol Revenue (ETH)", f"{wedt_eth:,.6f}" if pd.notna(wedt_eth) else "—")
r1c2.metric("Protocol Revenue (USD)", f"{wedt_usd:,.2f}" if pd.notna(wedt_usd) else "—")

r2c1, r2c2 = st.columns(2)
r2c1.metric("Treasury Total (ETH)", f"{treasury_eth_total:,.6f}")
r2c2.metric("Treasury Total (USD)", f"{treasury_usd_total:,.2f}")

st.markdown("---")

df_display = df_bal.copy().sort_values("chain")
wedt_row = pd.DataFrame([{
    "chain": "— WEDT (revenue)",
    "address": WEDT_TOKEN,      
    "eth_balance": wedt_eth,    
    "usd_value": wedt_usd
}])
df_display = pd.concat([df_display, wedt_row], ignore_index=True)

with st.expander("Detailed balances"):
    st.dataframe(df_display, use_container_width=True)

try:
    import altair as alt
    df_chart = df_bal.copy()
    y_min = float(df_chart["usd_value"].min())
    y_max = float(df_chart["usd_value"].max())
    pad = (y_max - y_min) * 0.08 if y_max > y_min else 1.0
    y_min, y_max = y_min - pad, y_max + pad

    chart = (
        alt.Chart(df_chart)
        .mark_bar()
        .encode(
            x=alt.X("chain:N", title="Chain"),
            y=alt.Y("usd_value:Q", title="Treasury Value (USD)", scale=alt.Scale(domain=[y_min, y_max], nice=False)),
            tooltip=[
                alt.Tooltip("chain:N", title="Chain"),
                alt.Tooltip("eth_balance:Q", title="ETH", format=",.6f"),
                alt.Tooltip("usd_value:Q", title="USD", format=",.2f"),
            ],
            color=alt.Color("chain:N", legend=None),
        )
        .properties(height=320)
    )
    st.altair_chart(chart, use_container_width=True)
except Exception:
    st.bar_chart(df_bal.set_index("chain")["usd_value"], height=320)

st.download_button(
    "⬇️ Download treasury balances CSV",
    df_bal.to_csv(index=False).encode("utf-8"),
    file_name="wedefin_treasury_balances.csv",
    mime="text/csv",
)

summary = pd.DataFrame([
    {"metric": "Protocol Revenue (ETH)", "value": wedt_eth},
    {"metric": "Protocol Revenue (USD)", "value": wedt_usd},
    {"metric": "Treasury Total (ETH)", "value": treasury_eth_total},
    {"metric": "Treasury Total (USD)", "value": treasury_usd_total},
])
st.download_button(
    "⬇️ Download summary CSV",
    summary.to_csv(index=False).encode("utf-8"),
    file_name="wedefin_treasury_summary.csv",
    mime="text/csv",
)

with st.expander("How to store your Infura key securely"):
    st.markdown(
        """
        Add your key to `.streamlit/secrets.toml` locally (or Streamlit Cloud → App → Settings → Secrets):
        ```toml
        INFURA_KEY = "your_infura_project_id"
        ```
        The page will auto-fill the sidebar field from secrets if present.
        """
    )