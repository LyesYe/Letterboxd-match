import { NextRequest, NextResponse } from "next/server";
import * as cheerio from "cheerio";

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
};

const TMDB_BASE = "https://api.themoviedb.org/3";
const TMDB_KEY  = process.env.TMDB_API_KEY;

export interface FavoriteFilm {
  slug:       string;
  title:      string;
  posterPath: string | null;
  year:       number | null;
}

async function scrapeFavorites(username: string): Promise<{ slug: string; title: string }[]> {
  const res = await fetch(`https://letterboxd.com/${encodeURIComponent(username)}/`, { headers: HEADERS });
  if (!res.ok) return [];
  const $ = cheerio.load(await res.text());
  const films: { slug: string; title: string }[] = [];
  $("#favourites .favourite-production-poster-container [data-item-slug]").each((_, el) => {
    const slug  = $(el).attr("data-item-slug") ?? "";
    const raw   = $(el).attr("data-item-name") ?? slug;
    const title = raw.replace(/\s*\(\d{4}\)\s*$/, "").trim();
    if (slug && !films.find((f) => f.slug === slug)) films.push({ slug, title });
  });
  return films.slice(0, 4);
}

async function tmdbPoster(title: string, slug: string): Promise<{ posterPath: string | null; year: number | null }> {
  if (!TMDB_KEY) return { posterPath: null, year: null };
  try {
    const yearMatch = slug.match(/-(\d{4})$/);
    const year = yearMatch ? parseInt(yearMatch[1], 10) : null;
    const params = new URLSearchParams({ api_key: TMDB_KEY, query: title, language: "en-US", page: "1", include_adult: "false" });
    if (year) params.set("year", String(year));
    const res  = await fetch(`${TMDB_BASE}/search/movie?${params}`, { next: { revalidate: 86400 } });
    const data = await res.json();
    const r    = data.results?.[0];
    return { posterPath: r?.poster_path ?? null, year: r?.release_date ? parseInt(r.release_date.slice(0, 4), 10) : year };
  } catch { return { posterPath: null, year: null }; }
}

function combinations<T>(arr: T[], k: number): T[][] {
  if (k > arr.length) return [];
  if (k === arr.length) return [[...arr]];
  if (k === 1) return arr.map((x) => [x]);
  const result: T[][] = [];
  for (let i = 0; i <= arr.length - k; i++) {
    for (const rest of combinations(arr.slice(i + 1), k - 1)) result.push([arr[i], ...rest]);
  }
  return result;
}

function buildSearchUrl(slugCombos: string[][]): string {
  const parts = slugCombos.map((c) => `(${c.map((s) => `fan:${s}`).join(" ")})`);
  return `https://letterboxd.com/search/members/${encodeURIComponent(parts.join(" OR "))}/`;
}

export async function POST(req: NextRequest) {
  const { username }: { username: string } = await req.json();
  if (!username?.trim()) return NextResponse.json({ error: "Username required." }, { status: 400 });

  const raw = await scrapeFavorites(username.trim());
  if (!raw.length) return NextResponse.json({
    error: "No favorite films found. Make sure your Letterboxd profile is public and has favorite films set.",
  }, { status: 404 });

  // Enrich with TMDB posters in parallel
  const favorites: FavoriteFilm[] = await Promise.all(
    raw.map(async (f) => {
      const { posterPath, year } = await tmdbPoster(f.title, f.slug);
      return { ...f, posterPath, year };
    })
  );

  // Build search URLs for each min-overlap level
  const searchUrls: Record<number, string> = {};
  for (let n = 1; n <= favorites.length; n++) {
    const combos = combinations(favorites.map((f) => f.slug), n);
    if (combos.length) searchUrls[n] = buildSearchUrl(combos);
  }

  return NextResponse.json({ favorites, searchUrls });
}
