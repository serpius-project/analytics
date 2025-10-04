import pandas as pd
import requests
import streamlit as st
from datetime import date, timedelta

st.set_page_config(page_title="Wedefin — Index Composition", page_icon="🧭", layout="wide")
st.title("🧭 Wedefin — Index Composition and Statistics Over Time")

CHAINS = ["base", "ethereum", "arbitrum"]
WEDX_URL = "https://app.wedefin.com/wedx_price_{chain}_v1.json"
EXC_URL  = "https://app.wedefin.com/exchange_data.json"

# -------------------------------
# Sidebar controls
# -------------------------------
with st.sidebar:
    st.header("⚙️ Controls")
    chain = st.selectbox("Chain", CHAINS, index=0)

    preset = st.selectbox("Period preset",
                          ["Last 30 days", "Last 90 days", "YTD", "All", "Custom range"],
                          index=0)
    custom_start = st.date_input("Start date (custom)", value=date.today() - timedelta(days=30))
    custom_end   = st.date_input("End date (custom)", value=date.today())

    view_mode = st.radio("Stacked chart mode", ["% Allocation", "USD Value"], index=0)

    top_n = st.number_input("Top-N tokens to display (group rest as 'Other')",
                            min_value=2, max_value=20, value=6, step=1)

    nearest_tol_hours = st.slider("Max hours difference for nearest price match",
                                  min_value=1, max_value=48, value=24, step=1)

    st.markdown("### Visuals")
    show_index_overlay = st.checkbox("Overlay Index Performance (rebased to 100)", value=True)
    show_event_markers = st.checkbox("Show rebalancing event markers", value=True)
    event_threshold = st.slider("Event threshold (max abs Δ weight, %)", min_value=0.5, max_value=20.0, value=5.0, step=0.5)
    show_heatmap = st.checkbox("Show weight heatmap", value=True)
    show_small_multiples = st.checkbox("Show small multiples (token weights)", value=False)

# -------------------------------
# Data loaders (cached)
# -------------------------------
@st.cache_data(ttl=600, show_spinner=False)
def fetch_wedx(chain: str) -> pd.DataFrame:
    """Load WEDX composition for a chain and explode to long form (timestamp × token × balance)."""
    r = requests.get(WEDX_URL.format(chain=chain), timeout=30)
    r.raise_for_status()
    data = r.json()
    df = pd.DataFrame(data)
    if df.empty:
        return pd.DataFrame(columns=["timestamp","datetime","asset","balance","value","value_btc"])
    df["datetime"] = pd.to_datetime(df["timestamp"], unit="ms")
    long = df[["timestamp","datetime","assets","balances","value","value_btc"]].explode(["assets","balances"])
    long = long.rename(columns={"assets":"asset","balances":"balance"})
    return long.reset_index(drop=True)

@st.cache_data(ttl=1200, show_spinner=False)
def fetch_exchange_prices() -> dict:
    r = requests.get(EXC_URL, timeout=45)
    r.raise_for_status()
    return r.json()

def build_price_map(exc: dict, chain: str) -> dict:
    """
    Return: { token_address_lower: { 'symbol': str, 'decimals': int, 'prices_df': DataFrame } }
    """
    import pandas as pd
    out = {}
    chain_blob = exc.get(chain, {})

    SYMBOL_OVERRIDES = {
        "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2": "WETH",  # Ethereum
        "0x4200000000000000000000000000000000000006": "WETH",  # Base
        "0x82af49447d8a07e3bd95bd0d56f35241523fbab1": "WETH",  # Arbitrum
    }

    for token_addr, obj in chain_blob.items():
        token = token_addr.lower()
        symbol = None
        decimals = 18
        for t in obj.get("inputTokens", []):
            if t.get("id", "").lower() == token:
                symbol = t.get("symbol")
                decimals = int(t.get("decimals", decimals))
                break
        if not symbol:
            symbol = obj.get("symbol")
        if not symbol and token in SYMBOL_OVERRIDES:
            symbol = SYMBOL_OVERRIDES[token]
        if not symbol:
            symbol = token[:6] + "…" + token[-4:]

        prices = obj.get("prices", [])
        if prices:
            dfp = pd.DataFrame(prices, columns=["timestamp", "price"])
            dfp["datetime"] = pd.to_datetime(dfp["timestamp"], unit="ms")
            dfp = dfp.sort_values("datetime").reset_index(drop=True)
        else:
            dfp = pd.DataFrame(columns=["timestamp", "price", "datetime"])
        out[token] = {"symbol": symbol, "decimals": decimals, "prices_df": dfp}

    for addr, sym in SYMBOL_OVERRIDES.items():
        addr_l = addr.lower()
        if addr_l not in out:
            out[addr_l] = {
                "symbol": sym, "decimals": 18,
                "prices_df": pd.DataFrame(columns=["timestamp","price","datetime"])
            }
    return out

def preset_to_range(global_min: date, global_max: date, preset: str, custom_start: date, custom_end: date) -> tuple[date,date]:
    today = global_max
    if preset == "Last 30 days":
        return (today - timedelta(days=30), today)
    if preset == "Last 90 days":
        return (today - timedelta(days=90), today)
    if preset == "YTD":
        return (date(today.year, 1, 1), today)
    if preset == "All":
        return (global_min, global_max)
    return (custom_start, custom_end)

# -------------------------------
# Load & prep data
# -------------------------------
try:
    df_w = fetch_wedx(chain)
except Exception as e:
    st.error(f"Failed to load WEDX data: {e}")
    st.stop()
if df_w.empty:
    st.warning("No WEDX data available for this chain.")
    st.stop()

df_w["date"] = df_w["datetime"].dt.date
snap_idx = (df_w.sort_values(["date","datetime"]).groupby("date")[["timestamp","value"]].last().reset_index())
idx_last = (df_w.sort_values(["date","datetime"]).groupby(["date"])["datetime"].idxmax())
df_last_per_day = df_w.loc[idx_last, ["date","timestamp","datetime"]]
df_daily = df_w.merge(df_last_per_day, how="inner", on=["date","timestamp","datetime"])

global_min = min(df_daily["date"])
global_max = max(df_daily["date"])
start_date, end_date = preset_to_range(global_min, global_max, preset, custom_start, custom_end)
start_date = max(start_date, global_min)
end_date = min(end_date, global_max)

df_win = df_daily[(df_daily["date"] >= start_date) & (df_daily["date"] <= end_date)].copy()
if df_win.empty:
    st.warning("No data in the selected window.")
    st.stop()

try:
    exc = fetch_exchange_prices()
    price_map = build_price_map(exc, chain)
except Exception as e:
    st.error(f"Failed to load token prices: {e}")
    st.stop()

tol = pd.Timedelta(hours=int(nearest_tol_hours))
def nearest_price(addr: str, when: pd.Timestamp) -> float | None:
    info = price_map.get(addr.lower())
    if not info:
        return None
    dfp = info["prices_df"]
    if dfp.empty:
        return None
    probe = pd.DataFrame({"datetime":[when]}).sort_values("datetime")
    matched = pd.merge_asof(probe, dfp[["datetime","price"]], on="datetime",
                            direction="nearest", tolerance=tol)
    p = matched["price"].iloc[0] if len(matched) else None
    return float(p) if pd.notna(p) else None

prices, symbols = [], []
for addr, ts in zip(df_win["asset"].tolist(), df_win["datetime"].tolist()):
    p = nearest_price(addr, ts)
    prices.append(p)
    info = price_map.get(addr.lower())
    sym = info["symbol"] if info else addr[:6]+"…"+addr[-4:]
    symbols.append(sym)

df_win["price_usd"] = prices
df_win["symbol"] = symbols
df_win["usd_value"] = df_win["balance"] * df_win["price_usd"]

miss_ct = int(df_win["price_usd"].isna().sum())
if miss_ct > 0:
    st.warning(f"Missing prices for {miss_ct} rows (outside tolerance or not found). Excluding them from charts/metrics.")
dfv = df_win.dropna(subset=["usd_value"]).copy()
if dfv.empty:
    st.error("All rows missing matched prices; increase tolerance.")
    st.stop()

alloc = (dfv.groupby(["date","symbol"], as_index=False)["usd_value"].sum())
day_tot = alloc.groupby("date", as_index=False)["usd_value"].sum().rename(columns={"usd_value":"day_total"})
alloc = alloc.merge(day_tot, on="date", how="left")
alloc["pct"] = (alloc["usd_value"] / alloc["day_total"]) * 100.0

# -------------------------------
# Top-N grouping (per day)
# -------------------------------
def group_top_n(df_alloc: pd.DataFrame, N: int) -> pd.DataFrame:
    out = []
    for d, g in df_alloc.groupby("date"):
        g = g.sort_values("usd_value", ascending=False)
        head = g.head(N).copy()
        tail = g.iloc[N:].copy()
        if not tail.empty:
            other_row = pd.DataFrame({
                "date": [d],
                "symbol": ["Other"],
                "usd_value": [tail["usd_value"].sum()],
                "day_total": [g["day_total"].iloc[0]],
                "pct": [(tail["usd_value"].sum() / g["day_total"].iloc[0]) * 100.0],
            })
            g2 = pd.concat([head, other_row], ignore_index=True)
        else:
            g2 = head
        out.append(g2)
    res = pd.concat(out, ignore_index=True).sort_values(["date","symbol"])
    return res

alloc_top = group_top_n(alloc, int(top_n))

# -------------------------------
# Analytics: HHI, Effective N, Turnover
# -------------------------------
hhi = alloc.groupby("date").apply(lambda g: ((g["pct"]/100.0)**2).sum()).rename("HHI").reset_index()
hhi["Effective_N"] = (1.0 / hhi["HHI"]).replace([pd.NA, pd.NaT], pd.NA)

def turnover_series(df_alloc: pd.DataFrame) -> pd.DataFrame:
    piv = df_alloc.pivot(index="date", columns="symbol", values="pct").fillna(0.0).sort_index()
    to = (piv.diff().abs().sum(axis=1) * 0.5).rename("Turnover_pct")
    return to.reset_index()

turnover = turnover_series(alloc)

def rebalance_events(df_alloc: pd.DataFrame, thresh_pct: float) -> pd.DataFrame:
    piv = df_alloc.pivot(index="date", columns="symbol", values="pct").fillna(0.0).sort_index()
    delta = piv.diff().abs()
    max_abs = delta.max(axis=1).rename("MaxAbsDelta_pct")
    events = max_abs[max_abs >= thresh_pct].reset_index()
    return events

events = rebalance_events(alloc, float(event_threshold))

# -------------------------------
# Chart
# -------------------------------
st.markdown("### Allocation Over Time")
try:
    import altair as alt

    chart_df = alloc_top.copy()
    chart_df["usd_value"] = pd.to_numeric(chart_df["usd_value"], errors="coerce")
    chart_df["pct01"] = pd.to_numeric(chart_df["pct"], errors="coerce") / 100.0
    chart_df = chart_df.dropna(subset=["usd_value", "pct01"], how="all")

    x_enc = alt.X("date:T", title="Date")
    color_enc = alt.Color("symbol:N", title="Token")
    order_enc = alt.Order("symbol:N")

    if view_mode == "% Allocation":
        y_enc = alt.Y("pct01:Q", stack="normalize", title="Allocation (%)", axis=alt.Axis(format="%"))
        tooltip = [alt.Tooltip("date:T", title="Date"),
                   alt.Tooltip("symbol:N", title="Token"),
                   alt.Tooltip("pct01:Q", title="Allocation", format=".2%")]
    else:
        y_enc = alt.Y("usd_value:Q", stack="zero", title="USD Value")
        tooltip = [alt.Tooltip("date:T", title="Date"),
                   alt.Tooltip("symbol:N", title="Token"),
                   alt.Tooltip("usd_value:Q", title="USD Value", format=",.2f")]

    area = alt.Chart(chart_df).mark_area(opacity=0.85).encode(
        x=x_enc, y=y_enc, color=color_enc, order=order_enc, tooltip=tooltip
    )

    layers = [area.properties(height=420)]

    if show_index_overlay:
        idx_df = snap_idx[(snap_idx["date"] >= start_date) & (snap_idx["date"] <= end_date)].copy()
        if not idx_df.empty:
            idx_df = idx_df.sort_values("date")
            idx_df["index100"] = (idx_df["value"] / idx_df["value"].iloc[0]) * 100.0
            idx_line = alt.Chart(idx_df).mark_line(strokeWidth=2).encode(
                x=alt.X("date:T"), y=alt.Y("index100:Q", title="Index (100=Start)", axis=alt.Axis(titleColor="#555")),
                color=alt.value("#111")
            )
            layers.append(idx_line)

    if show_event_markers and not events.empty:
        rules = alt.Chart(events).mark_rule(strokeDash=[3,3], color="#666").encode(x="date:T")
        layers.append(rules)

    chart = alt.layer(*layers).resolve_scale(y='independent').interactive()
    st.altair_chart(chart, use_container_width=True)

except Exception as e:
    st.warning(f"Altair failed ({e}); showing table instead.")

# -------------------------------
# KPIs block
# -------------------------------
st.markdown("---")
k1, k2, k3, k4 = st.columns(4)
k1.metric("Chain", chain.capitalize())
k2.metric("Start", start_date.isoformat())
k3.metric("End", end_date.isoformat())

avg_effN = hhi[(hhi["date"] >= start_date) & (hhi["date"] <= end_date)]["Effective_N"].mean()
avg_turn = turnover[(turnover["date"] >= start_date) & (turnover["date"] <= end_date)]["Turnover_pct"].mean()
k4.metric("Avg Effective # Tokens", f"{avg_effN:.2f}" if pd.notna(avg_effN) else "—")
t1, t2 = st.columns(2)
with t1:
    st.metric("Avg Turnover per day", f"{(avg_turn or 0):.2f}%")
with t2:
    last_turn = turnover[turnover["date"] == turnover["date"].max()]["Turnover_pct"]
    st.metric("Latest Turnover", f"{(last_turn.iloc[0] if not last_turn.empty else 0):.2f}%")

# -------------------------------
# Token filter / highlight
# -------------------------------
all_syms = sorted(alloc["symbol"].unique().tolist())
sel_syms = st.multiselect("Highlight / filter tokens", all_syms, default=[])
if sel_syms:
    st.info(f"Filtering to {len(sel_syms)} tokens.")
    alloc_filt = alloc[alloc["symbol"].isin(sel_syms)].copy()
else:
    alloc_filt = alloc.copy()

# -------------------------------
# Heatmap of weights
# -------------------------------
if show_heatmap:
    try:
        import altair as alt

        base = alloc.copy()
        base["date"] = pd.to_datetime(base["date"])
        if sel_syms:
            base = base[base["symbol"].isin(sel_syms)]

        base = (
            base.groupby(["date", "symbol"], as_index=False, sort=False)["pct"]
            .sum()
        )

        visible_dates = pd.date_range(start=start_date, end=end_date, freq="D")
        toks = sorted(base["symbol"].unique().tolist())
        if not toks:
            st.info("No tokens selected for heatmap.")
        else:
            grid = (
                pd.DataFrame({"date": visible_dates})
                .assign(key=1)
                .merge(pd.DataFrame({"symbol": toks}).assign(key=1), on="key")
                .drop(columns="key")
            )

            heat_df = grid.merge(base, on=["date", "symbol"], how="left")
            heat_df["pct"] = heat_df["pct"].fillna(0.0)
            heat_df["pct01"] = heat_df["pct"] / 100.0

            y_order = (
                heat_df.groupby("symbol")["pct01"]
                .mean()
                .sort_values(ascending=False)
                .index.tolist()
            )

            heat = (
                alt.Chart(heat_df)
                .mark_rect()
                .encode(
                    x=alt.X("yearmonthdate(date):T", title="Date"),
                    y=alt.Y(
                        "symbol:N",
                        title="Token",
                        sort=y_order,
                        scale=alt.Scale(domain=y_order),
                    ),
                    color=alt.Color(
                        "pct01:Q",
                        title="Weight",
                        scale=alt.Scale(scheme="blues"),
                        legend=alt.Legend(format="%"),
                    ),
                    tooltip=[
                        alt.Tooltip("yearmonthdate(date):T", title="Date"),
                        alt.Tooltip("symbol:N"),
                        alt.Tooltip("pct01:Q", title="Weight", format=".2%"),
                    ],
                )
                .properties(height=alt.Step(24))
            )

            st.altair_chart(heat, use_container_width=True)

    except Exception as e:
        st.warning(f"Heatmap unavailable ({e}).")

# -------------------------------
# Small multiples (token weights)
# -------------------------------
if show_small_multiples:
    try:
        import altair as alt
        sm_df = alloc_filt.copy()
        sm_df["pct01"] = sm_df["pct"] / 100.0
        sm = (
            alt.Chart(sm_df)
            .mark_line()
            .encode(
                x=alt.X("date:T", title=""),
                y=alt.Y("pct01:Q", title="", axis=alt.Axis(format="%")),
                facet=alt.Facet("symbol:N", columns=3, title=""),
                tooltip=[alt.Tooltip("date:T"), alt.Tooltip("pct01:Q", title="Weight", format=".2%")],
            )
            .properties(height=120)
        )
        st.altair_chart(sm, use_container_width=True)
    except Exception as e:
        st.warning(f"Small multiples unavailable ({e}).")

# -------------------------------
# Snapshot @ date (pie + table + CSV)
# -------------------------------
st.markdown("---")
st.subheader("Snapshot at date")
snap_dates = sorted(alloc["date"].unique().tolist())
snap_sel = st.select_slider("Select date", options=snap_dates, value=snap_dates[-1])

snap_tbl = alloc[alloc["date"] == snap_sel].sort_values("usd_value", ascending=False).copy()
cA, cB = st.columns([1.2, 1.0])
with cA:
    try:
        import altair as alt
        pie_df = snap_tbl.copy()
        pie_df["pct01"] = pie_df["pct"] / 100.0
        pie = alt.Chart(pie_df).mark_arc(outerRadius=120).encode(
            theta=alt.Theta("pct01:Q", stack=True),
            color=alt.Color("symbol:N", legend=None),
            tooltip=[alt.Tooltip("symbol:N"), alt.Tooltip("pct01:Q", title="Weight", format=".2%")]
        ).properties(height=300)
        st.altair_chart(pie, use_container_width=False)
    except Exception:
        pass
with cB:
    st.dataframe(snap_tbl[["symbol","usd_value","pct"]].rename(columns={"usd_value":"USD","pct":"Weight %"}),
                 use_container_width=True)

st.download_button(
    "⬇️ Download snapshot CSV",
    snap_tbl.to_csv(index=False).encode("utf-8"),
    file_name=f"wedefin_{chain}_snapshot_{snap_sel}.csv",
    mime="text/csv",
)

# -------------------------------
# Drill-down: single token
# -------------------------------
st.markdown("---")
st.subheader("Drill-down (token)")
all_syms_all = sorted(alloc["symbol"].unique().tolist())
token_sel = st.selectbox("Token", all_syms_all, index=0)

td = alloc[alloc["symbol"] == token_sel].sort_values("date").copy()
usd_line = dfv[dfv["symbol"] == token_sel].groupby("date", as_index=False)["usd_value"].sum().sort_values("date")

c1, c2 = st.columns(2)
with c1:
    try:
        import altair as alt
        td["pct01"] = td["pct"] / 100.0
        line_w = alt.Chart(td).mark_line().encode(
            x=alt.X("date:T", title="Date"),
            y=alt.Y("pct01:Q", title="Weight", axis=alt.Axis(format="%")),
            tooltip=[alt.Tooltip("date:T"), alt.Tooltip("pct01:Q", format=".2%")]
        ).properties(height=280)
        st.altair_chart(line_w, use_container_width=True)
    except Exception:
        pass
with c2:
    try:
        import altair as alt
        line_u = alt.Chart(usd_line).mark_line().encode(
            x=alt.X("date:T", title="Date"),
            y=alt.Y("usd_value:Q", title="USD Value"),
            tooltip=[alt.Tooltip("date:T"), alt.Tooltip("usd_value:Q", format=",.2f")]
        ).properties(height=280)
        st.altair_chart(line_u, use_container_width=True)
    except Exception:
        pass

# -------------------------------
# Data preview & downloads
# -------------------------------
st.markdown("---")
with st.expander("Preview matched composition (per token per day)"):
    st.dataframe(dfv[["date","symbol","asset","balance","price_usd","usd_value"]]
                 .sort_values(["date","symbol"]), use_container_width=True)

st.download_button(
    "⬇️ Download allocation (tidy)",
    alloc.to_csv(index=False).encode("utf-8"),
    file_name=f"wedefin_{chain}_allocation_{start_date}_{end_date}.csv",
    mime="text/csv",
)

export_df = dfv[["date","symbol","asset","balance","price_usd","usd_value"]].sort_values(["date","symbol"])
st.download_button(
    "⬇️ Download daily composition (with prices)",
    export_df.to_csv(index=False).encode("utf-8"),
    file_name=f"wedefin_{chain}_composition_{start_date}_{end_date}.csv",
    mime="text/csv",
)