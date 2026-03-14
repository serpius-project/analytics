import { NextResponse } from "next/server";

export async function GET() {
  try {
    const res = await fetch("https://app.wedefin.com/exchange_data.json", {
      next: { revalidate: 300 },
      headers: { "User-Agent": "wedefin-public-dashboard/1.0" },
    });
    if (!res.ok) {
      return NextResponse.json({ error: "Upstream error" }, { status: 502 });
    }
    const data = await res.json();
    return NextResponse.json(data, {
      headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" },
    });
  } catch {
    return NextResponse.json({ error: "Fetch failed" }, { status: 502 });
  }
}
