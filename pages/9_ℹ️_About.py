import streamlit as st

st.set_page_config(page_title="About — Wedefin Dashboard", page_icon="ℹ️", layout="wide")
st.title("ℹ️ About this Dashboard")

st.markdown("""
**Wedefin Public Dashboard** gives a transparent view of key metrics across Ethereum, Base, and Arbitrum.

### Data sources
- **Wedefin API** — index prices, compositions, and stats.
- **CoinGecko** — ETH/USD pricing for USD valuations.
- **Infura RPC** — Ethereum, Base, and Arbitrum RPC endpoints for on-chain balances.

### Update cadence
Endpoints are fetched on demand with light caching. If something looks stale, refresh the page.

### Notes & caveats
- Visualizations are **informational** and not investment advice.
- Upstream on-chain data and endpoints may evolve; features can be refined over time.
- Time series are aligned to **one point per day (last value of the day)** for consistent comparisons.

### Updates
- **2025-09-22** — Dashboard Deployment.

### Contact
Questions, bugs, or feature requests? Open an issue or reach out to the Wedefin team:

- X: [@wedefin](https://x.com/wedefin)
- Telegram: [t.me/wedefin](https://t.me/wedefin)
- LinkedIn: [Wedefin](https://www.linkedin.com/company/wedefin/)
- Email: [info@wedefin.com](mailto:info@wedefin.com)
""")

st.markdown("---")
st.header("📘 Documentation & User Guide")


# ===============================
# Index Performance — User Guide
# ===============================
st.subheader("📊 Index Performance")

with st.expander("What this page shows"):
    st.markdown("""
- **Goal:** Compare how the Wedefin index moves on each chain over a selected period.
- **Main chart:** A line per chain. Hover to see **Date**, **Chain**, and the value (either raw *Index Value* or **Rebased Index** if enabled).
- **Daily points:** Data are shown **once per day** (the last observation of that day) to make chains comparable.
- **Metrics section:** Below the chart you’ll find **Cumulative Return**, **Max Drawdown**, **VaR**, **Expected Shortfall**, **Annualized Volatility**, and **Sharpe** computed for the selected window.
""")

with st.expander("Left-sidebar controls"):
    st.markdown("""
- **Select chains:** Pick one or more of `ethereum`, `base`, `arbitrum`. The chart and metrics update instantly.
- **Period preset:** Quick filters:
  - *Last 7 days*, *Last 30 days*, *YTD*, *All*, or **Custom range**.
- **Custom dates:** If *Custom range* is chosen, use **Start date** and **End date** to define the window.
- **Rebase to 100 at start:** 
  - **On:** Each chain is normalized so the **first day in the window = 100**.
  - **Off:** Shows the **raw index level**.
""")

with st.expander("How to read the chart"):
    st.markdown("""
- **Rebased on (100):** If enabled, focus on relative performance. A move from 100→110 is **+10%** over the window.
- **Hover tooltips:** Move the cursor along a line to see exact values for that date/chain.
- **Multi-chain view:** Colors distinguish chains. If lines overlap, hover to disambiguate.
- **Zoom/pan:** Click-drag or use the chart interactions to focus on a subset; reset by clicking outside.
""")

with st.expander("Metrics below the chart"):
    st.markdown("""
- **Cumulative return:** Total % change between the first and last day in the window.
- **Max drawdown:** Worst peak-to-trough % fall within the window (more negative = deeper drop).
- **VaR (α% confidence):** A daily **loss threshold** you shouldn't exceed more than *(100−α)%* of the time, based on simple returns.
- **Expected shortfall (ES):** The **average loss** on the worst *(100−α)%* of days (i.e., the tail beyond VaR).
- **Ann. volatility:** Daily return std. dev. scaled by √365.
- **Sharpe (annualized):** Excess daily return over a daily risk-free rate, scaled to annual; enter **Risk-free (annual %)** in the sidebar.
  
**Important:** Metrics are computed from the **raw index values**, not the rebased series (rebasing affects only the chart).
""")

with st.expander("Downloads & Data preview"):
    st.markdown("""
- **Preview data:** Expand the table to inspect the series used for the chart (and the *index* column if rebased).
- **⬇️ Download CSV (chart data):** Exports the per-day values shown in the chart for the selected chains and window.
- **⬇️ Download metrics CSV:** Exports the summary metrics table for your current selection.
""")

with st.expander("Tips"):
    st.markdown("""
- If nothing shows, widen the **date range** or select at least one chain.
- **Comparing trends?** Turn **Rebase to 100** ON to normalize levels across chains.
- **Outliers near the edges** can stretch the y-axis; you can zoom into the interesting region with click-drag.
""")

st.markdown("---")

# ==============================================
# Index Composition & Statistics — User Guide
# ==============================================
st.subheader("🧭 Index Composition & Statistics")

with st.expander("What this page shows"):
    st.markdown("""
- **Goal:** See **how the index is allocated across tokens over time** on a selected chain, with optional index overlay and rebalancing markers.
- **Main views:**
  - **Stacked area over time** (switch between **% Allocation** and **USD Value**).
  - **Heatmap of weights** (token by day).
  - **Small multiples** (per-token weight lines; optional).
  - **Snapshot at date** (pie + table) and **per-token drill-down**.
- **Key analytics:**
  - **HHI (concentration):** A single number that increases as the index becomes more concentrated in fewer tokens.
  - **Effective N:** An intuitive “effective number of tokens.” Higher means more diversification.
  - **Turnover:** How much the weight mix changed from one day to the next; think of it as the % of the portfolio that would have to rotate to reach today’s mix.
  - **Event markers:** Flags days where the largest single-token weight change crosses your chosen threshold.
""")


with st.expander("Left-sidebar controls"):
    st.markdown("""
- **Chain:** Choose `ethereum`, `base`, or `arbitrum`.
- **Period preset / Custom range:** Filter the visible window (aggregation is **one snapshot per day**: the **last** observation each day).
- **Stacked chart mode:** 
  - **% Allocation** → normalizes each day to 100% to show composition.
  - **USD Value** → stacks raw USD contributions per token.
- **Top-N tokens:** Keep the top *N* tokens **per day**; the rest are grouped as **“Other”** (dynamic by day).
- **Max hours difference for nearest price match:** Controls how far we look to match token prices around each daily snapshot (used for USD valuation).
- **Visuals toggles:**
  - **Overlay Index Performance (rebased to 100)** → adds a line for the index level (100 at window start).
  - **Show rebalancing event markers** + **Event threshold** (percentage-point move of the largest token weight).
  - **Show weight heatmap** / **Show small multiples**.
""")

with st.expander("Reading the stacked chart"):
    st.markdown("""
- **% Allocation:** Focus on **mix changes**. Rising band = token gaining share that day.
- **USD Value:** Focus on **absolute exposure**. Higher band = more dollars in that token.
- **Index overlay:** Helps relate allocation shifts to overall index performance (rebased to **100** at window start).
- **Event markers:** Vertical dashed lines show days where **max |Δ weight| ≥ threshold** (useful to spot rebalances or large flows).
""")

with st.expander("Rebalancing & concentration analytics"):
    st.markdown("""
- **Turnover (daily):** Measures **how much the allocation mix changed** from yesterday to today.  
  Higher values mean more rotation (e.g., due to rebalances or flows); near zero means the mix was stable.
- **HHI (Herfindahl-Hirschman Index):** A standard **concentration** metric.  
  Higher HHI = more concentrated; lower HHI = more diversified.
- **Effective N:** A simple translation of HHI into an **“effective number of equally weighted tokens.”**  
  For example, an Effective N around 5 indicates a fairly concentrated basket; 10–20 is moderate; 20+ suggests broad diversification.
""")


with st.expander("Heatmap of weights"):
    st.markdown("""
- **Axes:** **Date** (x) × **Token** (y). Color = daily **weight %**.
- **Token order:** Sorted by **average weight** in the visible window (top to bottom).
- **Filtering:** Use **Highlight / filter tokens** to focus on a subset—the heatmap re-scales and keeps row height consistent.
- **Tip:** % shows **share of the index** that day; use this to spot **persistent core holdings** vs **rotating satellites**.
""")

with st.expander("Small multiples (per-token)"):
    st.markdown("""
- **What:** One mini-chart per token showing **weight % over time**.
- **When to use:** To compare **volatility of weights** across tokens without the visual stacking interactions.
""")

with st.expander("Snapshot at date (pie + table)"):
    st.markdown("""
- **Select date:** Use the slider to pick a day.
- **Pie chart:** Visualizes the **weight breakdown** (includes **“Other”** if grouping is active).
- **Table:** Shows both **USD** and **Weight %**; export as CSV for the selected date.
""")

with st.expander("Drill-down (single token)"):
    st.markdown("""
- **Select token:** See its **weight % line** (left) and **USD value line** (right) over the window.
- **Use case:** Assess whether a token’s **relative share** rose because others fell (weight view) or because **its dollar exposure** actually increased (USD view).
""")

with st.expander("Pricing tolerance & data quality tips"):
    st.markdown("""
- **Nearest price match:** If the token’s nearest price is **outside** your tolerance window, that row is **dropped**.  
  - Increase tolerance to include more points, but avoid backfilling across long gaps.
- **Missing prices warning:** The banner shows how many rows were excluded—if high, revisit tolerance or confirm token coverage in `exchange_data.json`.
- **Symbol overrides:** Canonical **WETH** addresses are normalized across chains; unknown tokens fall back to a short address label.
- **One snapshot per day:** By design, we keep the **last** reading each day to align with daily price matching.
""")

with st.expander("Downloads & reproducibility"):
    st.markdown("""
- **Preview matched composition:** Inspect the per-token/day rows after pricing (`asset`, `balance`, `price_usd`, `usd_value`).
- **⬇️ Download allocation (tidy):** `date, symbol, usd_value, day_total, pct` across the selected window.
- **⬇️ Download daily composition (with prices):** Per-token/day with balances and matched prices.
- **Repro note:** Changing **Top-N**, **tolerance**, or **filters** changes the charts and CSVs; include these settings when sharing results.
""")

# =========================================
# Stats Snapshot — User Guide
# =========================================
st.subheader("🌐 Stats Snapshot")

with st.expander("What this page shows"):
    st.markdown("""
- **Goal:** A quick **point-in-time** overview of each chain’s **TVL** and **user counts**.
- **KPIs (top):** 
  - **Chains:** Number of chains currently displayed.
  - **Total Users:** Sum of `total_users` across selected chains.
  - **Total TVL (All):** Sum of `total_tvl` across selected chains.
- **Charts:** 
  - **Total TVL by chain:** Bars ranked by TVL for a fast comparison.
  - **Stacked TVL:** Splits TVL into **Index TVL** vs **Pro TVL** per chain.
- **Data table + download:** View the exact values and export to CSV.
  
**Field definitions** (columns from `stats_data.json`):
- `total_users` — all users on the chain.
- `index_users` — users of the Index product.
- `pro_users` — users of the Pro product.
- `total_index_tvl` — Index product TVL (USD).
- `total_pro_tvl` — Pro product TVL (USD).
- `total_tvl` — total TVL (USD) = `total_index_tvl + total_pro_tvl`.
""")

with st.expander("Left-sidebar controls"):
    st.markdown("""
- **Chains:** Multiselect one or more chains to include in the snapshot.  
  The KPIs, charts, and table immediately reflect your selection.
""")

with st.expander("How to read the charts"):
    st.markdown("""
**1) Total TVL by chain (bar chart)**
- **What it shows:** Overall TVL per chain. Bars are **sorted by TVL** (highest first).
- **Hover tooltip:** See **Chain**, **Index TVL**, **Pro TVL**, **Total TVL**, and **Total users**.

**2) Stacked TVL (Index vs Pro)**
- **What it shows:** Composition of TVL per chain: **Index** vs **Pro** segments.
- **Color legend:** Index = blue, Pro = green (as shown in the legend).
""")

with st.expander("Download and data preview"):
    st.markdown("""
- **Preview data:** The table reflects the active chain filter and shows all numeric fields.
- **⬇️ Download CSV:** Export the filtered snapshot for offline analysis or reporting.
- **Note:** Values are pulled at page load (with light caching).  
  Refresh the page to fetch a fresher snapshot.
""")

with st.expander("Tips"):
    st.markdown("""
- **Empty view?** Make sure at least one chain is selected in the sidebar.
- **Units:** TVL values are in **USD** (formatted with thousands separators).
- **Comparability:** This page is **not a time series**; it’s a **current snapshot**.  
- **Segment sanity check:** `total_tvl` should equal `total_index_tvl + total_pro_tvl`.  
  If not, the upstream data may be updating—refresh and try again.
""")

st.markdown("---")
# =========================================
# Treasury & Revenue — User Guide
# =========================================
st.subheader("💰 Treasury & Revenue")

with st.expander("What this page shows"):
    st.markdown("""
- **Goal:** Display on-chain ETH balances held by Wedefin treasury contracts across supported chains, plus **protocol revenue** measured as the WEDT token balance held by the protocol owner (on Ethereum).
- **KPIs (top):**
  - **Protocol Revenue (ETH / USD):** WEDT units (on Ethereum) priced in ETH (see notes below).
  - **Treasury Total (ETH / USD):** Sum of ETH balances across treasury contracts and chains.
- **Chart:** Bars of **Treasury Value (USD)** per chain.
- **Details table:** Per-chain contract address, ETH balance, and USD value, plus a row for **WEDT (revenue)**.
  """)

with st.expander("Left-sidebar controls"):
    st.markdown("""
- **Infura Project ID:** Paste your **Infura Project ID** (API key) to enable RPC calls. The **Fetch balances** button becomes active once a key is present.
- **WEDT token address:** ERC-20 contract on **Ethereum** used to read the protocol-owner’s WEDT balance (revenue).
- **Fetch balances:** Click to query chains via Infura and compute USD values.
""")

with st.expander("How balances & revenue are fetched (under the hood)"):
    st.markdown("""
- **RPC endpoints (via Infura):**
  - Ethereum → `https://mainnet.infura.io/v3/{PROJECT_ID}`
  - Base → `https://base-mainnet.infura.io/v3/{PROJECT_ID}`
  - Arbitrum → `https://arbitrum-mainnet.infura.io/v3/{PROJECT_ID}`
- **Treasury ETH:** For each chain’s treasury contract, the app calls
  - `eth_getBalance(contract_address, "latest")` → **ETH balance (wei)** → converted to **ETH**.
- **WEDT revenue (Ethereum only):**
  - `decimals()` via `0x313ce567` to get token decimals (fallback = 18 on failure).
  - `balanceOf(PROTOCOL_OWNER)` via `0x70a08231` to read **WEDT units**.
- **Pricing:**
  - **ETH/USD** fetched from CoinGecko *simple price* endpoint.
  - **USD values** = `ETH_balance × ETH/USD`, and `WEDT_units × ETH/USD` (see pricing note above).
- **Caching:** RPC calls and prices use short TTL caches to reduce latency and rate-limit pressure.
""")

with st.expander("Getting an Infura key (Project ID)"):
    st.markdown("""
1. **Create/login** at **Infura** (free tier available).
2. **Create a new project** and open it to see credentials.
3. **Copy the _Project ID_** (a hex string). This is the API key used in the URLs above.
4. **Paste** it in the sidebar field **or** store it securely as a secret (recommended).
5. **Free-tier limits:** If you see 429 (rate limit) or intermittent failures, wait or upgrade your plan.
""")



