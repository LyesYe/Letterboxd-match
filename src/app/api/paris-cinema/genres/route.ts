import { NextRequest, NextResponse } from "next/server";
import { getRedisCredentials } from "@/lib/trackUsernames";

/* ── TMDB ── */
const TMDB_KEY  = process.env.TMDB_API_KEY ?? "";
const TMDB_BASE = "https://api.themoviedb.org/3";

// Hardcoded TMDB genre IDs → French names (stable across API versions)
const GENRE_MAP: Record<number, string> = {
  28:    "Action",
  12:    "Aventure",
  16:    "Animation",
  35:    "Comédie",
  80:    "Crime",
  99:    "Documentaire",
  18:    "Drame",
  10751: "Famille",
  14:    "Fantastique",
  36:    "Histoire",
  27:    "Horreur",
  10402: "Musique",
  9648:  "Mystère",
  10749: "Romance",
  878:   "Science-Fiction",
  10770: "Téléfilm",
  53:    "Thriller",
  10752: "Guerre",
  37:    "Western",
};

interface MovieInput {
  pciId: number;
  title: string;
  year:  string;
}

/* ── Redis helpers (same pattern as trackUsernames.ts) ── */
async function redisPipeline(commands: unknown[][]): Promise<{ result: unknown }[]> {
  const { url, token } = getRedisCredentials();
  if (!url || !token) return commands.map(() => ({ result: null }));
  try {
    const res = await fetch(`${url}/pipeline`, {
      method:  "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body:    JSON.stringify(commands),
    });
    return res.ok ? (await res.json()) : commands.map(() => ({ result: null }));
  } catch { return commands.map(() => ({ result: null })); }
}

async function redisSetex(key: string, ttl: number, value: string): Promise<void> {
  const { url, token } = getRedisCredentials();
  if (!url || !token) return;
  try {
    await fetch(`${url}`, {
      method:  "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body:    JSON.stringify(["SETEX", key, ttl, value]),
    });
  } catch { /* fire-and-forget */ }
}

/* ── TMDB search ── */
async function fetchTmdbGenres(title: string, year: string): Promise<string[]> {
  if (!TMDB_KEY) return [];
  try {
    const params = new URLSearchParams({
      api_key: TMDB_KEY,
      query:   title,
      language: "fr-FR",
      page:    "1",
      include_adult: "false",
    });
    if (year && /^\d{4}$/.test(year)) params.set("primary_release_year", year);

    const res  = await fetch(`${TMDB_BASE}/search/movie?${params}`, {
      next: { revalidate: 86400 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    const hit  = data.results?.[0];
    if (!hit) return [];

    return (hit.genre_ids as number[] ?? [])
      .map((id) => GENRE_MAP[id])
      .filter(Boolean);
  } catch { return []; }
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

/* ── Route handler ── */
export async function POST(req: NextRequest) {
  const { movies }: { movies: MovieInput[] } = await req.json();
  if (!Array.isArray(movies) || movies.length === 0) {
    return NextResponse.json({ genres: {} });
  }

  // 1. Batch-read from Redis (pipeline MGET)
  const cacheKeys   = movies.map((m) => `pickd:cg:${m.pciId}`);
  const pipeResults = await redisPipeline(cacheKeys.map((k) => ["GET", k]));
  const cached      = pipeResults.map((r) => r.result as string | null);

  // 2. Split into hits and misses
  const result: Record<string, string[]> = {};
  const misses: { movie: MovieInput; idx: number }[] = [];

  movies.forEach((m, i) => {
    const raw = cached[i];
    if (raw !== null) {
      try { result[String(m.pciId)] = JSON.parse(raw); } catch { result[String(m.pciId)] = []; }
    } else {
      misses.push({ movie: m, idx: i });
    }
  });

  // 3. Fetch TMDB for cache misses (batch of 15 with 300ms between batches)
  //    Cap at 120 to avoid very long first-load times (~8s worst-case)
  const toFetch = misses.slice(0, 120);

  const BATCH = 15;
  const writeOps: Promise<void>[] = [];

  for (let i = 0; i < toFetch.length; i += BATCH) {
    const batch = toFetch.slice(i, i + BATCH);
    await Promise.all(
      batch.map(async ({ movie }) => {
        const genres = await fetchTmdbGenres(movie.title, movie.year);
        result[String(movie.pciId)] = genres;
        // Cache hit: 72h, cache miss (not found): 6h so we retry sooner
        const ttl = genres.length > 0 ? 259_200 : 21_600;
        writeOps.push(
          redisSetex(`pickd:cg:${movie.pciId}`, ttl, JSON.stringify(genres))
        );
      })
    );
    if (i + BATCH < toFetch.length) await delay(300);
  }

  // Write to Redis in background (don't await, response already ready)
  Promise.all(writeOps).catch(() => {});

  // Movies beyond the cap get empty genres (will be fetched on next request)
  for (const { movie } of misses.slice(120)) {
    result[String(movie.pciId)] = [];
  }

  return NextResponse.json({ genres: result });
}
