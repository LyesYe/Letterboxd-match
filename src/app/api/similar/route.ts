import { NextRequest, NextResponse } from "next/server";

const TMDB_BASE = "https://api.themoviedb.org/3";
const TMDB_KEY = process.env.TMDB_API_KEY;

export interface SimilarMovie {
  id: number;
  title: string;
  year: number | null;
  posterPath: string | null;
  tmdbRating: number;
  overview: string;
}

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id || isNaN(Number(id))) {
    return NextResponse.json({ error: "Valid movie id is required." }, { status: 400 });
  }
  if (!TMDB_KEY) {
    return NextResponse.json({ error: "Server is missing TMDB_API_KEY." }, { status: 500 });
  }

  const res = await fetch(
    `${TMDB_BASE}/movie/${id}/similar?api_key=${TMDB_KEY}&language=en-US&page=1`,
    { next: { revalidate: 86400 } }
  );
  if (!res.ok) {
    return NextResponse.json({ error: "Failed to fetch similar movies." }, { status: 502 });
  }

  const data = await res.json();
  const movies: SimilarMovie[] = (data.results ?? [])
    .filter((m: { poster_path: string | null }) => m.poster_path)
    .slice(0, 12)
    .map((m: {
      id: number;
      title: string;
      release_date?: string;
      poster_path: string | null;
      vote_average: number;
      overview: string;
    }) => ({
      id: m.id,
      title: m.title,
      year: m.release_date ? parseInt(m.release_date.slice(0, 4), 10) : null,
      posterPath: m.poster_path,
      tmdbRating: Math.round((m.vote_average ?? 0) * 10) / 10,
      overview: m.overview ?? "",
    }));

  return NextResponse.json({ movies });
}
