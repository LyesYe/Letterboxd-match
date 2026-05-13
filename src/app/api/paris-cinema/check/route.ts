import { NextRequest, NextResponse } from "next/server";
import { CinemaMovie } from "@/components/CinemaSessionModal";

const PCI_BASE  = "https://paris-cine.info/get_pcimovies.php?selday=all&seldayid=&seladdr=&seltime=&selformat=&selevent=&selcine=&sellang=";
const PCI_TODAY = "https://paris-cine.info/get_pcimovies.php?selday=today&seldayid=&seladdr=&seltime=&selformat=&selevent=&selcine=&sellang=";
const HEADERS   = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept: "application/json, */*",
  Referer: "https://paris-cine.info/",
};

export async function GET(req: NextRequest) {
  const slug    = req.nextUrl.searchParams.get("slug");
  const selcard = req.nextUrl.searchParams.get("selcard") ?? "all";
  if (!slug) return NextResponse.json({ found: false });

  const [weekRes, todayRes] = await Promise.all([
    fetch(`${PCI_BASE}&selcard=${selcard}`, { headers: HEADERS, next: { revalidate: 3600 } }),
    fetch(`${PCI_TODAY}&selcard=${selcard}`, { headers: HEADERS, next: { revalidate: 1800 } }),
  ]);

  try {
    const weekMovies: { id: number; ti: string; di: string; ye: string; du: string; co: string; lb_u: string }[] =
      JSON.parse((await weekRes.text()).replace(/^[^{\[]*/, "")).data ?? [];
    const todayIds = new Set<number>(
      (JSON.parse((await todayRes.text()).replace(/^[^{\[]*/, "")).data ?? []).map((m: { id: number }) => m.id)
    );

    const match = weekMovies.find((m) => m.lb_u === slug);
    if (!match) return NextResponse.json({ found: false });

    const movie: CinemaMovie & { hasToday: boolean } = {
      hasToday:  todayIds.has(match.id),
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
