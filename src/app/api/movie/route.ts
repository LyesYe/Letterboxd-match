import { NextRequest, NextResponse } from "next/server";
import { MovieDetails } from "@/types";

const TMDB_BASE = "https://api.themoviedb.org/3";
const TMDB_KEY = process.env.TMDB_API_KEY;

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id || isNaN(Number(id))) {
    return NextResponse.json({ error: "Valid movie id is required." }, { status: 400 });
  }
  if (!TMDB_KEY) {
    return NextResponse.json({ error: "Server is missing TMDB_API_KEY." }, { status: 500 });
  }

  const res = await fetch(
    `${TMDB_BASE}/movie/${id}?api_key=${TMDB_KEY}&language=en-US`,
    { next: { revalidate: 86400 } }
  );
  if (!res.ok) {
    return NextResponse.json({ error: "Movie not found." }, { status: 404 });
  }

  const d = await res.json();
  const movie: MovieDetails = {
    id: d.id,
    title: d.title,
    year: d.release_date ? parseInt(d.release_date.slice(0, 4), 10) : null,
    overview: d.overview ?? "",
    posterPath: d.poster_path ?? null,
    backdropPath: d.backdrop_path ?? null,
    tmdbRating: Math.round((d.vote_average ?? 0) * 10) / 10,
    tmdbVoteCount: d.vote_count ?? 0,
    letterboxdUrl: "",
    genres: (d.genres ?? []).map((g: { name: string }) => g.name),
    runtime: d.runtime ?? null,
    watchedByUsers: [],
  };

  return NextResponse.json({ movie });
}
