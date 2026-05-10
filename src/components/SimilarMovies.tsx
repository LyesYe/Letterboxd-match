"use client";

import { useEffect, useState, useRef } from "react";
import Image from "next/image";
import { SimilarMovie } from "@/app/api/similar/route";

const TMDB_IMG = "https://image.tmdb.org/t/p";

interface Props {
  movieId: number;
  onSelect: (movie: SimilarMovie) => void;
}

export default function SimilarMovies({ movieId, onSelect }: Props) {
  const [movies, setMovies] = useState<SimilarMovie[]>([]);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMovies([]);
    setLoading(true);
    fetch(`/api/similar?id=${movieId}`)
      .then((r) => r.json())
      .then((data) => setMovies(data.movies ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [movieId]);

  if (!loading && movies.length === 0) return null;

  return (
    <div className="mt-6">
      <h3 className="text-xs font-semibold tracking-widest uppercase text-[#99AABB] mb-3 px-1">
        Similar Films
      </h3>

      {/* Scrollable row */}
      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1"
        style={{ scrollbarWidth: "none" }}
      >
        {loading
          ? Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
          : movies.map((m) => (
              <FilmCard key={m.id} movie={m} onSelect={onSelect} />
            ))}
      </div>
    </div>
  );
}

function FilmCard({ movie, onSelect }: { movie: SimilarMovie; onSelect: (m: SimilarMovie) => void }) {
  const posterUrl = `${TMDB_IMG}/w185${movie.posterPath}`;
  const ratingColor =
    movie.tmdbRating >= 7.5 ? "#00E054" : movie.tmdbRating >= 6 ? "#FF8000" : "#99AABB";

  return (
    <button
      onClick={() => onSelect(movie)}
      className="flex-shrink-0 w-24 text-left group focus:outline-none"
      title={movie.title}
    >
      {/* Poster */}
      <div
        className="relative w-24 rounded-lg overflow-hidden border border-[#2c3440]
          group-hover:border-[#99AABB]/50 transition-all duration-200"
        style={{ aspectRatio: "2/3" }}
      >
        <Image
          src={posterUrl}
          alt={movie.title}
          fill
          sizes="96px"
          className="object-cover transition-transform duration-300 group-hover:scale-105"
        />
        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all duration-200
          flex items-center justify-center">
          <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-200
            text-white text-xs font-semibold bg-black/60 px-2 py-0.5 rounded-full">
            Pick this
          </span>
        </div>
      </div>

      {/* Title + meta */}
      <div className="mt-1.5 px-0.5">
        <p className="text-[11px] font-semibold text-[#e8ecf0] leading-tight line-clamp-2 group-hover:text-white transition-colors">
          {movie.title}
        </p>
        <div className="flex items-center gap-1.5 mt-0.5">
          {movie.year && (
            <span className="text-[10px] text-[#99AABB]/60">{movie.year}</span>
          )}
          {movie.tmdbRating > 0 && (
            <span className="text-[10px] font-semibold" style={{ color: ratingColor }}>
              ★ {movie.tmdbRating.toFixed(1)}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

function SkeletonCard() {
  return (
    <div className="flex-shrink-0 w-24">
      <div className="w-24 rounded-lg shimmer" style={{ aspectRatio: "2/3" }} />
      <div className="mt-1.5 space-y-1">
        <div className="h-2.5 rounded shimmer w-full" />
        <div className="h-2 rounded shimmer w-2/3" />
      </div>
    </div>
  );
}
