import streamlit as st
from datetime import datetime

st.set_page_config(page_title="Wedefin Dashboard", page_icon=":bar_chart:", layout="wide")

st.image("assets/layer.svg", width=50)
st.title("Wedefin — Public Dashboard")
st.caption("Transparent, live metrics across chains.")

st.markdown("""
### What’s inside
- **Index Performance** — Financial performance of the indices with relevant risk metrics.
- **Index Composition** — Index asset allocation and metrics over time.
- **Stats Snapshot** — Users & TVL per chain.
- **Accounting** — Status of treasury balances and protocol revenue.
- **About** — Information about the dashboard and its sources.
""")

st.markdown("---")
st.caption(f"Last build: {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}")