import altair as alt
import pandas as pd
import streamlit as st

def line_multi(df: pd.DataFrame, y: str, y_title: str):
    chart = (
        alt.Chart(df)
        .mark_line(point=True)
        .encode(
            x=alt.X("datetime:T", title="Date"),
            y=alt.Y(f"{y}:Q", title=y_title),
            color=alt.Color("chain:N", title="Chain"),
            tooltip=["datetime:T", "chain:N", alt.Tooltip(f"{y}:Q", title=y_title, format=",.2f")],
        ).properties(height=420).interactive()
    )
    st.altair_chart(chart, use_container_width=True)