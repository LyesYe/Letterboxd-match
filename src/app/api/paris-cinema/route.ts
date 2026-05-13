import { NextRequest, NextResponse } from "next/server";
import * as cheerio from "cheerio";
import { WatchlistMovie } from "@/types";

const PCI_BASE = "https://paris-cine.info/get_pcimovies.php?selday=all&seldayid=&seladdr=&seltime=&selformat=&selevent=&selcine=&sellang=";
const pciUrl = (selcard: string) => `${PCI_BASE}&selcard=${selcard}`;
const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept: "application/json, text/javascript, */*",
  Referer: "https://paris-cine.info/",
};
const LB_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
};

export interface CinemaMatch {
  pciId:       number;
  title:       string;
  year:        string;
  duration:    string;
  director:    string;
  copies:      number;
  lbSlug:      string;
  lbUrl:       string;
  pciUrl:      string;
  posterUrl:   string;
  letterboxdUrl: string;
  foundInUsers:  string[];
}

interface PciMovie {
  id:    number;
  ti:    string;
  ye:    string;
  di:    string;
  du:    string;
  co:    number;
  lb_u:  string;
}

async function fetchWatchlist(username: string, origin: string): Promise<WatchlistMovie[]> {
  try {
    const res  = await fetch(`${origin}/api/watchlist?username=${encodeURIComponent(username)}`);
    const data = await res.json();
    if (data.status === "ok" || (!data.error && Array.isArray(data.movies))) return data.movies ?? [];
    return [];
  } catch { return []; }
}

async function fetchParisCinema(selcard: string): Promise<PciMovie[]> {
  const res = await fetch(pciUrl(selcard), { headers: HEADERS, next: { revalidate: 3600 } });
  if (!res.ok) return [];
  const text = await res.text();
  // Strip PHP warnings before the JSON
  const json = text.replace(/^[^{]*/, "");
  try {
    const data = JSON.parse(json);
    return (data.data ?? []).filter((m: PciMovie) => m.lb_u);
  } catch { return []; }
}

function slugFromUrl(url: string): string {
  return url.match(/\/film\/([^/]+)/)?.[1] ?? "";
}

export async function POST(req: NextRequest) {
  const { usernames, selcard = "all" }: { usernames: string[]; selcard?: string } = await req.json();
  if (!usernames?.length) return NextResponse.json({ error: "Username required." }, { status: 400 });

  // Fetch all in parallel
  const [cinemaMovies, ...watchlists] = await Promise.all([
    fetchParisCinema(selcard),
    ...usernames.map((u) => fetchWatchlist(u, req.nextUrl.origin)),
  ]);

  if (!cinemaMovies.length) return NextResponse.json({ error: "Could not fetch Paris cinema schedule." }, { status: 502 });

  // Build slug → users map from all watchlists
  const slugToUsers = new Map<string, { movie: WatchlistMovie; users: string[] }>();
  for (let i = 0; i < usernames.length; i++) {
    for (const movie of watchlists[i]) {
      const slug = slugFromUrl(movie.letterboxdUrl);
      if (!slug) continue;
      const existing = slugToUsers.get(slug);
      if (existing) existing.users.push(usernames[i]);
      else slugToUsers.set(slug, { movie, users: [usernames[i]] });
    }
  }

  // Match cinema movies against watchlist slugs
  const matches: CinemaMatch[] = [];
  for (const cm of cinemaMovies) {
    const entry = slugToUsers.get(cm.lb_u);
    if (!entry) continue;
    matches.push({
      pciId:         cm.id,
      title:         cm.ti,
      year:          cm.ye,
      duration:      cm.du,
      director:      cm.di,
      copies:        Number(cm.co),
      lbSlug:        cm.lb_u,
      lbUrl:         `https://letterboxd.com/film/${cm.lb_u}/`,
      pciUrl:        `https://paris-cine.info/#${cm.lb_u}`,
      posterUrl:     `https://paris-cine.info/get_poster.php?id=${cm.id}`,
      letterboxdUrl: entry.movie.letterboxdUrl,
      foundInUsers:  [...new Set(entry.users)],
    });
  }

  // Sort: most copies (most cinemas) first
  matches.sort((a, b) => b.copies - a.copies);

  // Also expose all cinema movies (for the "show all" view)
  const allMovies = cinemaMovies.map((cm) => ({
    pciId:    cm.id,
    title:    cm.ti,
    year:     cm.ye,
    duration: cm.du,
    director: cm.di,
    copies:   Number(cm.co),
    lbSlug:   cm.lb_u,
    lbUrl:    cm.lb_u ? `https://letterboxd.com/film/${cm.lb_u}/` : "",
    pciUrl:   `https://paris-cine.info/#${cm.lb_u}`,
    posterUrl: `https://paris-cine.info/get_poster.php?id=${cm.id}`,
  }));

  return NextResponse.json({ matches, allMovies, total: cinemaMovies.length });
}
