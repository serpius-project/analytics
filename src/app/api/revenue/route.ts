import { NextResponse } from "next/server";

export async function GET() {
  try {
    const res = await fetch("https://app.wedefin.com/stats_revenue_data.json", {
      next: { revalidate: 120 },
      headers: { "User-Agent": "wedefin-public-dashboard/1.0" },
    });
    if (!res.ok) {
      return NextResponse.json({ error: "Upstream error" }, { status: 502 });
    }
    const data = await res.json();
    return NextResponse.json(data, {
      headers: { "Cache-Control": "public, s-maxage=120, stale-while-revalidate=300" },
    });
  } catch {
    return NextResponse.json({ error: "Fetch failed" }, { status: 502 });
  }
}
