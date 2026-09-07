import { NextRequest, NextResponse } from "next/server";

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept: "application/json, */*",
  Referer: "https://paris-cine.info/",
};

export interface Showtime {
  cinema:    string;
  date:      string;   // ISO datetime
  type:      string;   // VO / VF / VOSTF
  format:    string;
  bookUrl:   string;
}

export async function GET(req: NextRequest) {
  const movId  = req.nextUrl.searchParams.get("mov_id");
  const selcard = req.nextUrl.searchParams.get("selcard") ?? "all";
  if (!movId) return NextResponse.json({ error: "mov_id required" }, { status: 400 });

  const url = `https://paris-cine.info/get_showtimes.php?mov_id=${movId}&selday=all&selcard=${selcard}&seladdr=&seltime=&selformat=&selevent=&selcine=&sellang=`;
  try {
    const res  = await fetch(url, { headers: HEADERS, next: { revalidate: 1800 } });
    const text = await res.text();
    const json = text.replace(/^[^{\[]*/, "");
    const data = JSON.parse(json);

    const showtimes: Showtime[] = (data.showtimes ?? []).map((s: {
      title: string; start: string; type: string; format: string; book: string;
    }) => ({
      cinema:  s.title,
      date:    s.start,
      type:    s.type ?? "",
      format:  s.format ?? "",
      bookUrl: s.book ?? "",
    }));

    return NextResponse.json({ showtimes, dates: data.dates ?? [] });
  } catch {
    return NextResponse.json({ error: "Failed to fetch showtimes." }, { status: 502 });
  }
}
