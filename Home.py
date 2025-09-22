import streamlit as st
from datetime import datetime

st.set_page_config(page_title="Wedefin Dashboard", page_icon=":bar_chart:", layout="wide")

st.image("assets/layer.svg", width=50)
st.title("Wedefin — Public Dashboard")
st.caption("Transparent, live metrics across chains.")

st.markdown("""
### What’s inside
- **Index Performance** — financial performance of the indices with relevant risk metrics.
- **Stats Snapshot** — users & TVL per chain.
- **Treasury** — status of treasury balances and protocol revenue.
- **Index Rebalancing** — Index composition and metrics over time.
- **About** — information about the dashboard and its sources.
""")

st.markdown("---")
st.caption(f"Last build: {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}")