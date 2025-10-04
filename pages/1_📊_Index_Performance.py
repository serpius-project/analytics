import pandas as pd
import requests
import streamlit as st
from datetime import datetime, timedelta, date

st.set_page_config(page_title="Wedefin — Index Performance", page_icon="📊", layout="wide")
st.title("📊 Wedefin — Index Performance and Metrics")

CHAINS = ["ethereum", "base", "arbitrum"]
BASE_URL = "https://app.wedefin.com/wedx_price_{chain}_v1.json"

# -------------------------------
# Sidebar
# -------------------------------
with st.sidebar:
    st.header("⚙️ Controls")
    selected_chains = st.multiselect("Select chains", CHAINS, default=["base"])

    preset = st.selectbox(
        "Period preset",
        ["Last 7 days", "Last 30 days", "YTD", "All", "Custom range"],
        index=1,
    )

    custom_start = st.date_input("Start date (custom)", value=date.today() - timedelta(days=30))
    custom_end = st.date_input("End date (custom)", value=date.today())

    rebase = st.checkbox(
        "Rebase to 100 at start",
        value=True,
        help="Normalize each chain so the first value in the selected period = 100",
    )

@st.cache_data(ttl=600, show_spinner=False)
def fetch_chain_data(chain: str) -> pd.DataFrame:
    url = BASE_URL.format(chain=chain)
    r = requests.get(url, timeout=20)
    r.raise_for_status()
    raw = r.json()
    df = pd.DataFrame(raw)
    if df.empty:
        return pd.DataFrame(columns=["datetime", "value", "chain"])
    df["datetime"] = pd.to_datetime(df["timestamp"], unit="ms")
    df["chain"] = chain
    return df[["datetime", "value", "chain"]].sort_values(["chain", "datetime"]).reset_index(drop=True)

# -------------------------------
# Fetch
# -------------------------------
frames = []
for c in selected_chains:
    try:
        frames.append(fetch_chain_data(c))
    except Exception as e:
        st.warning(f"Failed to load {c}: {e}")

if not frames:
    st.stop()

df_all = pd.concat(frames, ignore_index=True).sort_values(["chain", "datetime"])

# -------------------------------
# Collapse to one row per chain per day (use LAST value of the day)
# -------------------------------
df_all["date"] = df_all["datetime"].dt.date

idx = (
    df_all.sort_values(["chain", "date", "datetime"])
          .groupby(["chain", "date"])["datetime"]
          .idxmax()
)
df_daily = df_all.loc[idx, ["date", "chain", "value"]].sort_values(["chain", "date"]).reset_index(drop=True)

df_daily["datetime"] = pd.to_datetime(df_daily["date"])

# -------------------------------
# Period bounds (daily)
# -------------------------------
global_min = df_daily["date"].min()
global_max = df_daily["date"].max()

def preset_to_range(p: str) -> tuple[date, date]:
    today = global_max
    if p == "Last 7 days":
        return (today - timedelta(days=7), today)
    if p == "Last 30 days":
        return (today - timedelta(days=30), today)
    if p == "YTD":
        return (date(today.year, 1, 1), today)
    if p == "All":
        return (global_min, global_max)
    return (custom_start, custom_end)

start_date, end_date = preset_to_range(preset)
start_date = max(start_date, global_min)
end_date = min(end_date, global_max)

# -------------------------------
# Filter to selected window (daily)
# -------------------------------
mask = (df_daily["date"] >= start_date) & (df_daily["date"] <= end_date)
df_win = df_daily.loc[mask].copy()

if df_win.empty:
    st.warning("No data in the selected window. Try widening the date range or picking different chains.")
    st.stop()

# -------------------------------
# Filter
# -------------------------------
mask = (df_all["datetime"].dt.date >= start_date) & (df_all["datetime"].dt.date <= end_date)
df_win = df_all.loc[mask].copy()

if df_win.empty:
    st.warning("No data in the selected window. Try widening the date range or picking different chains.")
    st.stop()

# -------------------------------
# Rebase to 100 at period start (per chain)
# -------------------------------
if rebase:
    first_vals = df_win.sort_values("date").groupby("chain")["value"].first()
    df_win = df_win.merge(first_vals.rename("first_value"), on="chain", how="left")
    df_win["index"] = (df_win["value"] / df_win["first_value"]) * 100
    y_field = "index"
    y_title = "Index"
else:
    y_field = "value"
    y_title = "Index Value"

# -------------------------------
# Chart
# -------------------------------
try:
    import altair as alt

    y_min = float(df_win[y_field].min())
    y_max = float(df_win[y_field].max())
    pad = 10.0
    if not (y_max > y_min):
        y_min, y_max = y_min - 1.0, y_max + 1.0
    else:
        y_min, y_max = y_min - pad, y_max + pad

    hover = alt.selection_point(
        fields=["date", "chain"],
        nearest=True,
        on="mousemove",
        empty=False,
        clear="mouseout",
    )

    base = alt.Chart(df_win).encode(
        x=alt.X("date:T", title="Date"),
        y=alt.Y(f"{y_field}:Q", title=y_title, scale=alt.Scale(domain=[y_min, y_max], nice=False)),
        color=alt.Color("chain:N", title="Chain"),
    )

    lines = base.mark_line()

    points = (
        alt.Chart(df_win)
        .mark_circle(size=64)
        .encode(
            x="date:T",
            y=f"{y_field}:Q",
            color="chain:N",
            opacity=alt.condition(hover, alt.value(1), alt.value(0)),
            tooltip=[
                alt.Tooltip("date:T", title="Date"),
                alt.Tooltip("chain:N", title="Chain"),
                alt.Tooltip(f"{y_field}:Q", title=y_title, format=",.2f"),
            ],
        )
        .add_params(hover)
    )

    chart = alt.layer(lines, points).properties(height=420).interactive()
    st.altair_chart(chart, use_container_width=True)

except Exception:
    pivot = df_win.pivot(index="date", columns="chain", values=y_field)
    st.line_chart(pivot, height=420)

# -------------------------------
# KPIs
# -------------------------------
st.markdown("---")
c1, c2, c3 = st.columns(3)
c1.metric("Start", start_date.isoformat())
c2.metric("End", end_date.isoformat())
c3.metric("Chains", len(selected_chains))

# -------------------------------
# Table + download
# -------------------------------
with st.expander("Preview data"):
    cols = ["date", "chain", "value"] + (["index"] if rebase else [])
    st.dataframe(df_win[cols].sort_values(["chain", "date"]), use_container_width=True)

st.download_button(
    "⬇️ Download CSV",
    df_win.to_csv(index=False).encode("utf-8"),
    file_name=f"wedefin_index_{start_date}_{end_date}.csv",
    mime="text/csv",
)

# ===============================
# 📉 Risk & Performance (period)
# ===============================
st.markdown("## 📉 Risk & Performance (period)")

cvar_conf = st.slider(
    "Confidence level for VaR / Expected Shortfall",
    min_value=90.0, max_value=99.9, value=99.5, step=0.1,
    help="VaR α is computed as (100 - confidence)% on simple returns."
)
rf_annual = st.number_input(
    "Risk-free rate (annual, for Sharpe)",
    min_value=0.0, max_value=20.0, value=4.0, step=0.1,
    help="Annual risk-free % used to compute daily excess returns."
)
alpha = (100.0 - cvar_conf) / 100.0

def compute_chain_metrics(df_chain: pd.DataFrame) -> dict:
    s = df_chain.sort_values("date")["value"].astype(float)
    if s.size < 2:
        return {
            "obs": int(s.size),
            "cum_return_pct": float("nan"),
            "max_drawdown_pct": float("nan"),
            "var_pct": float("nan"),
            "es_pct": float("nan"),
            "ann_vol_pct": float("nan"),
            "sharpe": float("nan"),
        }

    r = s.pct_change().dropna()
    cum_ret = s.iloc[-1] / s.iloc[0] - 1.0

    roll_max = s.cummax()
    drawdown = s / roll_max - 1.0
    max_dd = drawdown.min() if not drawdown.empty else float("nan")

    if len(r) > 0:
        var = r.quantile(alpha)
        tail = r[r <= var]
        es = tail.mean() if not tail.empty else float("nan")
        ann_vol = (r.std() * (365 ** 0.5)) if len(r) > 1 else float("nan")
    else:
        var = es = ann_vol = float("nan")

    rf_daily = (1.0 + rf_annual / 100.0) ** (1/365) - 1.0
    if len(r) > 1 and r.std() > 0:
        sharpe = ((r.mean() - rf_daily) / r.std()) * (365 ** 0.5)
    else:
        sharpe = float("nan")

    return {
        "obs": int(s.size),
        "cum_return_pct": cum_ret * 100.0,
        "max_drawdown_pct": max_dd * 100.0,
        "var_pct": var * 100.0,
        "es_pct": es * 100.0,
        "ann_vol_pct": ann_vol * 100.0,
        "sharpe": sharpe,
    }

rows = []
for ch, dfc in df_win.groupby("chain"):
    rows.append({"chain": ch, **compute_chain_metrics(dfc)})

metrics_df = pd.DataFrame(rows).sort_values("chain")

def fmt_pct(x, prec=2): return "—" if pd.isna(x) else f"{x:.{prec}f}%"
def fmt_int(x): return "—" if pd.isna(x) else f"{int(x)}"
def fmt_num(x, prec=2): return "—" if pd.isna(x) else f"{x:.{prec}f}"

if metrics_df.empty:
    st.info("Not enough data to compute metrics for the selected window.")
else:
    styled = metrics_df.copy()
    styled["observations"] = styled["obs"].map(fmt_int)
    styled["Cumulative return"] = styled["cum_return_pct"].map(lambda v: fmt_pct(v, 2))
    styled["Max drawdown"] = styled["max_drawdown_pct"].map(lambda v: fmt_pct(v, 2))
    styled[f"VaR ({cvar_conf:.1f}%)"] = styled["var_pct"].map(lambda v: fmt_pct(v, 2))
    styled[f"Expected shortfall ({cvar_conf:.1f}%)"] = styled["es_pct"].map(lambda v: fmt_pct(v, 2))
    styled["Ann. volatility"] = styled["ann_vol_pct"].map(lambda v: fmt_pct(v, 2))
    styled[f"Sharpe (ann., rf={rf_annual:.1f}%)"] = styled["sharpe"].map(lambda v: fmt_num(v, 2))

    display_cols = [
        "chain", "observations",
        "Cumulative return", "Max drawdown",
        f"VaR ({cvar_conf:.1f}%)", f"Expected shortfall ({cvar_conf:.1f}%)",
        "Ann. volatility",
        f"Sharpe (ann., rf={rf_annual:.1f}%)",
    ]
    st.dataframe(styled[display_cols], use_container_width=True)

    with st.expander("Show rolling drawdown chart"):
        dd_frames = []
        for ch, dfc in df_win.groupby("chain"):
            s = dfc.sort_values("date")["value"].astype(float)
            if s.size >= 2:
                dd = (s / s.cummax() - 1.0) * 100.0
                dd_frames.append(pd.DataFrame({
                    "date": dfc.sort_values("date")["date"],
                    "drawdown_pct": dd, "chain": ch
                }))
        if dd_frames:
            dd_all = pd.concat(dd_frames, ignore_index=True)
            try:
                import altair as alt
                dd_chart = (
                    alt.Chart(dd_all)
                    .mark_line()
                    .encode(
                        x=alt.X("date:T", title="Date"),
                        y=alt.Y("drawdown_pct:Q", title="Drawdown (%)"),
                        color=alt.Color("chain:N", title="Chain"),
                        tooltip=[
                            alt.Tooltip("date:T", title="Date"),
                            alt.Tooltip("chain:N", title="Chain"),
                            alt.Tooltip("drawdown_pct:Q", title="Drawdown (%)", format=",.2f"),
                        ],
                    )
                    .properties(height=320)
                    .interactive()
                )
                st.altair_chart(dd_chart, use_container_width=True)
            except Exception:
                piv = dd_all.pivot(index="date", columns="chain", values="drawdown_pct")
                st.line_chart(piv, height=320)

    st.download_button(
        "⬇️ Download metrics CSV",
        metrics_df.to_csv(index=False).encode("utf-8"),
        file_name=f"wedefin_index_metrics_{start_date}_{end_date}.csv",
        mime="text/csv",
    )