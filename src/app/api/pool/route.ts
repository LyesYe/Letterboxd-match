import { NextRequest, NextResponse } from "next/server";
import { WatchlistMovie, MatchMode, PoolMovie } from "@/types";
import { buildPool, buildTitleToUsers, normalize } from "@/lib/buildPool";
import { fetchWatchedForUsers, slugFromUrl } from "@/lib/fetchWatched";

const TMDB_BASE   = "https://api.themoviedb.org/3";
const TMDB_KEY    = process.env.TMDB_API_KEY;
const MAX_MOVIES  = 150;
const CONCURRENCY = 10;

const GENRE_MAP: Record<number, string> = {
  28: "Action", 12: "Adventure", 16: "Animation", 35: "Comedy", 80: "Crime",
  99: "Documentary", 18: "Drama", 10751: "Family", 14: "Fantasy", 36: "History",
  27: "Horror", 10402: "Music", 9648: "Mystery", 10749: "Romance", 878: "Sci-Fi",
  10770: "TV Movie", 53: "Thriller", 10752: "War", 37: "Western",
};

async function tmdbSearchLight(title: string, year: number | null) {
  if (!TMDB_KEY) return null;
  const params = new URLSearchParams({ api_key: TMDB_KEY, query: title, language: "en-US", page: "1", include_adult: "false" });
  if (year) params.set("year", String(year));
  try {
    const res  = await fetch(`${TMDB_BASE}/search/movie?${params}`, { next: { revalidate: 86400 } });
    if (!res.ok) return null;
    const data = await res.json();
    const r    = data.results?.[0];
    if (!r) return null;
    return {
      id: r.id as number,
      posterPath: r.poster_path as string | null ?? null,
      rating: Math.round((r.vote_average ?? 0) * 10) / 10,
      genres: (r.genre_ids as number[] ?? []).map((id) => GENRE_MAP[id]).filter(Boolean),
      overview: r.overview as string ?? "",
    };
  } catch { return null; }
}

// Enrich pool movies with TMDB data (no watched info yet — added after)
async function enrichBatch(
  movies: WatchlistMovie[],
  titleToUsers: Map<string, string[]>
): Promise<Omit<PoolMovie, "watchedByUsers">[]> {
  const results: Omit<PoolMovie, "watchedByUsers">[] = [];
  for (let i = 0; i < movies.length; i += CONCURRENCY) {
    const batch = movies.slice(i, i + CONCURRENCY);
    const enriched = await Promise.all(
      batch.map(async (m) => {
        const tmdb = await tmdbSearchLight(m.title, m.year);
        return {
          tmdbId:        tmdb?.id ?? null,
          title:         m.title,
          year:          m.year,
          posterPath:    tmdb?.posterPath ?? null,
          tmdbRating:    tmdb?.rating ?? 0,
          genres:        tmdb?.genres ?? [],
          overview:      tmdb?.overview ?? "",
          letterboxdUrl: m.letterboxdUrl,
          foundInUsers:  titleToUsers.get(normalize(m.title)) ?? [],
        };
      })
    );
    results.push(...enriched);
  }
  return results;
}

export async function POST(req: NextRequest) {
  if (!TMDB_KEY) return NextResponse.json({ error: "Server is missing TMDB_API_KEY." }, { status: 500 });

  const { usernames, mode }: { usernames: string[]; mode: MatchMode } = await req.json();
  if (!usernames?.length) return NextResponse.json({ error: "At least one username is required." }, { status: 400 });

  const rawResults = await Promise.allSettled(
    usernames.map((u) =>
      fetch(`${req.nextUrl.origin}/api/watchlist?username=${encodeURIComponent(u)}`).then((r) => r.json())
    )
  );

  const watchlists: WatchlistMovie[][] = [];
  for (const r of rawResults) {
    if (r.status === "fulfilled" && !r.value?.error) watchlists.push(r.value.movies as WatchlistMovie[]);
  }
  if (watchlists.length === 0) return NextResponse.json({ error: "Could not load any watchlists." }, { status: 400 });

  const titleToUsers = buildTitleToUsers(usernames, watchlists);
  const pool         = buildPool(watchlists, mode).slice(0, MAX_MOVIES);
  if (pool.length === 0) return NextResponse.json({ movies: [], total: 0 });

  // TMDB enrichment and watched-films fetch run in parallel
  const [enriched, watchedByUser] = await Promise.all([
    enrichBatch(pool, titleToUsers),
    fetchWatchedForUsers(usernames),
  ]);

  // Merge: stamp each movie with which users have watched it
  const movies: PoolMovie[] = enriched.map((m) => {
    const slug = slugFromUrl(m.letterboxdUrl);
    return {
      ...m,
      watchedByUsers: slug ? usernames.filter((u) => watchedByUser.get(u)?.has(slug)) : [],
    };
  });

  return NextResponse.json({ movies, total: pool.length });
}
