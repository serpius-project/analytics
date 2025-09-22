import pandas as pd
import requests
import streamlit as st

st.set_page_config(page_title="Wedefin — Stats Snapshot", page_icon="🌐", layout="wide")
st.title("🌐 Wedefin — Stats Snapshot")

URL = "https://app.wedefin.com/stats_data.json"

@st.cache_data(ttl=300, show_spinner=False)
def fetch_stats() -> pd.DataFrame:
    r = requests.get(URL, timeout=20)
    r.raise_for_status()
    data = r.json()
    df = pd.DataFrame(data).T.reset_index().rename(columns={"index": "chain"})
    numeric = ["total_users","index_users","pro_users","total_index_tvl","total_pro_tvl","total_tvl"]
    for c in numeric:
        if c in df:
            df[c] = pd.to_numeric(df[c], errors="coerce")
    return df.sort_values("chain").reset_index(drop=True)

try:
    df = fetch_stats()
except Exception as e:
    st.error(f"Failed to load snapshot: {e}")
    st.stop()

with st.sidebar:
    st.header("⚙️ Filters")
    chains = st.multiselect("Chains", df["chain"].unique().tolist(), default=df["chain"].unique().tolist())

dfv = df[df["chain"].isin(chains)].copy()
if dfv.empty:
    st.warning("No chains selected.")
    st.stop()

c1, c2, c3 = st.columns(3)
c1.metric("Chains", len(dfv))
c2.metric("Total Users", f"{int(dfv['total_users'].sum()):,}" if 'total_users' in dfv else "—")
c3.metric("Total TVL (All)", f"{float(dfv['total_tvl'].sum()):,.2f}" if 'total_tvl' in dfv else "—")

st.markdown("---")

try:
    import altair as alt
    y_min = float(dfv["total_tvl"].min()) if "total_tvl" in dfv else 0.0
    y_max = float(dfv["total_tvl"].max()) if "total_tvl" in dfv else 1.0
    pad = (y_max - y_min) * 0.08 if y_max > y_min else 1.0
    y_min, y_max = y_min - pad, y_max + pad

    tvl_chart = (
        alt.Chart(dfv)
        .mark_bar()
        .encode(
            x=alt.X("chain:N", title="Chain", sort="-y"),
            y=alt.Y("total_tvl:Q", title="Total TVL", scale=alt.Scale(domain=[y_min, y_max], nice=False)),
            tooltip=[
                alt.Tooltip("chain:N", title="Chain"),
                alt.Tooltip("total_index_tvl:Q", title="Index TVL", format=",.2f"),
                alt.Tooltip("total_pro_tvl:Q", title="Pro TVL", format=",.2f"),
                alt.Tooltip("total_tvl:Q", title="Total TVL", format=",.2f"),
                alt.Tooltip("total_users:Q", title="Total users", format=",.0f")
            ],
            color=alt.Color("chain:N", legend=None),
        )
        .properties(height=360)
    )
    st.altair_chart(tvl_chart, use_container_width=True)
except Exception:
    if "total_tvl" in dfv:
        st.bar_chart(dfv.set_index("chain")["total_tvl"], height=360)

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
            x=alt.X("chain:N", title="Chain"),
            y=alt.Y("tvl:Q", title="TVL"),
            color=alt.Color("segment:N", title="Segment",
                            scale=alt.Scale(domain=["total_index_tvl","total_pro_tvl"],
                                            range=["#60a5fa","#34d399"])),
            tooltip=[
                alt.Tooltip("chain:N"),
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