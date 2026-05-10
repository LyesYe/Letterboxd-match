import { NextRequest, NextResponse } from "next/server";
import { WatchlistMovie, MovieDetails, MatchMode } from "@/types";
import { buildPool, buildTitleToUsers, normalize } from "@/lib/buildPool";
import { fetchWatchedForUsers, slugFromUrl } from "@/lib/fetchWatched";

const TMDB_BASE = "https://api.themoviedb.org/3";
const TMDB_KEY  = process.env.TMDB_API_KEY;

async function tmdbSearch(title: string, year: number | null): Promise<MovieDetails | null> {
  if (!TMDB_KEY) throw new Error("TMDB_API_KEY is not configured.");
  const params = new URLSearchParams({ api_key: TMDB_KEY, query: title, language: "en-US", page: "1", include_adult: "false" });
  if (year) params.set("year", String(year));

  const searchRes = await fetch(`${TMDB_BASE}/search/movie?${params}`);
  if (!searchRes.ok) return null;
  const searchData = await searchRes.json();
  const result = searchData.results?.[0];
  if (!result) return null;

  const detailRes = await fetch(`${TMDB_BASE}/movie/${result.id}?api_key=${TMDB_KEY}&language=en-US`);
  const detail    = detailRes.ok ? await detailRes.json() : result;

  return {
    id: result.id,
    title: detail.title ?? result.title,
    year: detail.release_date ? parseInt(detail.release_date.slice(0, 4), 10) : year,
    overview: detail.overview ?? "",
    posterPath: detail.poster_path ?? null,
    backdropPath: detail.backdrop_path ?? null,
    tmdbRating: Math.round((detail.vote_average ?? 0) * 10) / 10,
    tmdbVoteCount: detail.vote_count ?? 0,
    letterboxdUrl: "",
    genres: (detail.genres ?? []).map((g: { name: string }) => g.name),
    runtime: detail.runtime ?? null,
    watchedByUsers: [],
  };
}

async function fetchWatchlists(usernames: string[], origin: string) {
  const results = await Promise.allSettled(
    usernames.map((u) =>
      fetch(`${origin}/api/watchlist?username=${encodeURIComponent(u)}`).then((r) => r.json())
    )
  );
  const watchlists: WatchlistMovie[][] = [];
  const errors: string[] = [];
  for (const r of results) {
    if (r.status === "rejected" || r.value?.error) {
      errors.push(r.status === "rejected" ? r.reason?.message : r.value.error);
    } else {
      watchlists.push(r.value.movies as WatchlistMovie[]);
    }
  }
  return { watchlists, errors };
}

export async function POST(req: NextRequest) {
  if (!TMDB_KEY) return NextResponse.json({ error: "Server is missing TMDB_API_KEY." }, { status: 500 });

  const { usernames, mode, seenIds }: { usernames: string[]; mode: MatchMode; seenIds: number[] } = await req.json();
  if (!usernames?.length) return NextResponse.json({ error: "At least one username is required." }, { status: 400 });

  // Fetch watchlists and watched films in parallel
  const [{ watchlists, errors }, watchedByUser] = await Promise.all([
    fetchWatchlists(usernames, req.nextUrl.origin),
    fetchWatchedForUsers(usernames),
  ]);

  if (watchlists.length === 0) return NextResponse.json({ error: errors[0] ?? "Could not load any watchlists." }, { status: 400 });

  const titleToUsers = buildTitleToUsers(usernames, watchlists);
  const pool         = buildPool(watchlists, mode);

  if (pool.length === 0) {
    const msg = mode === "intersection" ? "No movies on all lists. Try 'Any 2' or Union mode!"
      : mode === "partial" ? "No movies appear in 2+ lists. Try Union mode!"
      : "No movies found in any watchlist.";
    return NextResponse.json({ error: msg, emptyIntersection: true }, { status: 404 });
  }

  const seenSet  = new Set(seenIds ?? []);
  const shuffled = [...pool].sort(() => Math.random() - 0.5);

  for (const candidate of shuffled) {
    const details = await tmdbSearch(candidate.title, candidate.year);
    if (!details) continue;
    if (seenSet.has(details.id)) continue;

    details.letterboxdUrl = candidate.letterboxdUrl;

    const slug = slugFromUrl(candidate.letterboxdUrl);
    details.watchedByUsers = slug ? usernames.filter((u) => watchedByUser.get(u)?.has(slug)) : [];

    return NextResponse.json({
      movie: details,
      foundInUsers:   titleToUsers.get(normalize(candidate.title)) ?? [],
      poolSize:       pool.length,
      mode,
      userCount:      watchlists.length,
      errors:         errors.length ? errors : undefined,
    });
  }

  return NextResponse.json({ error: "You've seen all movies in the pool! Refresh to start over.", exhausted: true }, { status: 404 });
}
