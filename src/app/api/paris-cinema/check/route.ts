import { NextRequest, NextResponse } from "next/server";
import { CinemaMovie } from "@/components/CinemaSessionModal";

const PCI_BASE = "https://paris-cine.info/get_pcimovies.php?selday=all&seldayid=&seladdr=&seltime=&selformat=&selevent=&selcine=&sellang=";
const HEADERS  = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept: "application/json, */*",
  Referer: "https://paris-cine.info/",
};

export async function GET(req: NextRequest) {
  const slug    = req.nextUrl.searchParams.get("slug");
  const selcard = req.nextUrl.searchParams.get("selcard") ?? "all";
  if (!slug) return NextResponse.json({ found: false });

  const url = `${PCI_BASE}&selcard=${selcard}`;
  try {
    const res  = await fetch(url, { headers: HEADERS, next: { revalidate: 3600 } });
    const text = await res.text();
    const json = text.replace(/^[^{\[]*/, "");
    const data = JSON.parse(json);
    const movies: { id: number; ti: string; o_ti: string; di: string; ye: string; du: string; co: string; lb_u: string }[] = data.data ?? [];

    const match = movies.find((m) => m.lb_u === slug);
    if (!match) return NextResponse.json({ found: false });

    const movie: CinemaMovie = {
      pciId:     match.id,
      title:     match.ti,
      year:      match.ye,
      duration:  match.du,
      director:  match.di,
      copies:    Number(match.co),
      lbUrl:     `https://letterboxd.com/film/${match.lb_u}/`,
      pciUrl:    `https://paris-cine.info/#${match.lb_u}`,
      posterUrl: `https://paris-cine.info/get_poster.php?id=${match.id}`,
    };

    return NextResponse.json({ found: true, movie });
  } catch {
    return NextResponse.json({ found: false });
  }
}
