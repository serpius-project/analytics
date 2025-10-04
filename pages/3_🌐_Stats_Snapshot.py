import pandas as pd
import requests
import streamlit as st

st.set_page_config(page_title="Wedefin — Stats Snapshot", page_icon="🌐", layout="wide")
st.title("🌐 Wedefin — Stats Snapshot")

URL = "https://app.wedefin.com/stats_data.json"
CHAIN_ORDER = ["Base", "Ethereum", "Arbitrum"]

def normalize_chain_names(series: pd.Series) -> pd.Series:
    s = series.astype(str).str.strip().str.lower()
    mapping = {
        "base": "Base",
        "ethereum": "Ethereum",
        "eth": "Ethereum",
        "arbitrum": "Arbitrum",
        "arbitrum one": "Arbitrum",
    }
    return s.map(mapping).fillna(series.astype(str).str.strip())

def ordered_chain_list(chains: list[str]) -> list[str]:
    known = [c for c in CHAIN_ORDER if c in chains]
    unknown = sorted([c for c in chains if c not in CHAIN_ORDER])
    return known + unknown

@st.cache_data(ttl=300, show_spinner=False)
def fetch_stats() -> pd.DataFrame:
    r = requests.get(URL, timeout=20)
    r.raise_for_status()
    data = r.json()
    df = pd.DataFrame(data).T.reset_index().rename(columns={"index": "chain"})
    df["chain"] = normalize_chain_names(df["chain"])

    numeric = ["total_users","index_users","pro_users","total_index_tvl","total_pro_tvl","total_tvl"]
    for c in numeric:
        if c in df:
            df[c] = pd.to_numeric(df[c], errors="coerce")

    return df.reset_index(drop=True)

try:
    df = fetch_stats()
except Exception as e:
    st.error(f"Failed to load snapshot: {e}")
    st.stop()

all_chains = ordered_chain_list(sorted(df["chain"].unique().tolist()))
if not all_chains:
    st.error("No chains found in data. Check the JSON payload.")
    st.stop()

with st.sidebar:
    st.header("⚙️ Filters")
    chains = st.multiselect("Chains", options=all_chains, default=all_chains)

dfv = df[df["chain"].isin(chains)].copy()
if dfv.empty:
    st.warning("No chains selected.")
    st.stop()

sel_order = ordered_chain_list(chains)
dfv["chain"] = pd.Categorical(dfv["chain"], categories=sel_order, ordered=True)
dfv = dfv.sort_values("chain")

# KPIs
c1, c2, c3 = st.columns(3)
c1.metric("Chains", len(dfv))
c2.metric("Total Users", f"{int(dfv['total_users'].sum()):,}" if 'total_users' in dfv else "—")
c3.metric("Total TVL (All)", f"{float(dfv['total_tvl'].sum()):,.2f}" if 'total_tvl' in dfv else "—")

st.markdown("---")

# Chart 1: Total TVL by chain
try:
    import altair as alt
    tvl_chart = (
        alt.Chart(dfv)
        .mark_bar(size=70)
        .encode(
            x=alt.X("chain:N", title="Chain", sort=sel_order,
                    axis=alt.Axis(labelAngle=0, labelLimit=1000, labelPadding=10)),
            y=alt.Y("total_tvl:Q", title="Total TVL"),
            color=alt.Color("chain:N", legend=None,
                            scale=alt.Scale(domain=sel_order)),
            tooltip=[
                alt.Tooltip("chain:N", title="Chain"),
                alt.Tooltip("total_index_tvl:Q", title="Index TVL", format=",.2f"),
                alt.Tooltip("total_pro_tvl:Q", title="Pro TVL", format=",.2f"),
                alt.Tooltip("total_tvl:Q", title="Total TVL", format=",.2f"),
                alt.Tooltip("total_users:Q", title="Total users", format=",.0f"),
            ],
        )
        .properties(height=360)
    )
    st.altair_chart(tvl_chart, use_container_width=True)
except Exception:
    if "total_tvl" in dfv:
        st.bar_chart(dfv.set_index("chain")["total_tvl"], height=360)

# Chart 2: Stacked Index vs Pro TVL
try:
    import altair as alt
    df_stack = dfv.melt(
        id_vars=["chain"],
        value_vars=["total_index_tvl", "total_pro_tvl"],
        var_name="segment",
        value_name="tvl",
    )
    stack_chart = (
        alt.Chart(df_stack)
        .mark_bar()
        .encode(
            x=alt.X("chain:N", title="Chain", sort=sel_order,
                    axis=alt.Axis(labelAngle=0, labelLimit=1000, labelPadding=10)),
            y=alt.Y("tvl:Q", title="TVL"),
            color=alt.Color("segment:N", title="Segment",
                            scale=alt.Scale(domain=["total_index_tvl","total_pro_tvl"],
                                            range=["#60a5fa","#34d399"])),
            tooltip=[
                alt.Tooltip("chain:N", title="Chain"),
                alt.Tooltip("segment:N", title="Segment"),
                alt.Tooltip("tvl:Q", title="TVL", format=",.2f"),
            ],
        )
        .properties(height=360)
    )
    st.altair_chart(stack_chart, use_container_width=True)
except Exception:
    st.write("Stacked chart unavailable; showing table below.")

with st.expander("Preview data"):
    st.dataframe(dfv, use_container_width=True)

st.download_button(
    "⬇️ Download CSV",
    dfv.to_csv(index=False).encode("utf-8"),
    file_name="wedefin_stats_snapshot.csv",
    mime="text/csv",
)