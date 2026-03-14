import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ chain: string }> }
) {
  const { chain } = await params;
  const allowed = ["ethereum", "base", "arbitrum"];
  if (!allowed.includes(chain)) {
    return NextResponse.json({ error: "Invalid chain" }, { status: 400 });
  }

  const url = `https://app.wedefin.com/wedx_price_${chain}_v1.json`;
  try {
    const res = await fetch(url, {
      next: { revalidate: 60 },
      headers: { "User-Agent": "wedefin-public-dashboard/1.0" },
    });
    if (!res.ok) {
      return NextResponse.json({ error: "Upstream error" }, { status: 502 });
    }
    const data = await res.json();
    return NextResponse.json(data, {
      headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" },
    });
  } catch {
    return NextResponse.json({ error: "Fetch failed" }, { status: 502 });
  }
}
