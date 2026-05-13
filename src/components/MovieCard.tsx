"use client";

import Image from "next/image";
import { MovieDetails, MatchMode } from "@/types";
import UserBadges from "@/components/UserBadges";
import CinemaButton, { slugFromLetterboxdUrl } from "@/components/CinemaButton";

const TMDB_IMG = "https://image.tmdb.org/t/p";

interface Props {
  movie: MovieDetails;
  poolSize: number;
  mode: MatchMode;
  foundInUsers: string[];
  allUsernames: string[];
}

export default function MovieCard({ movie, poolSize, mode, foundInUsers, allUsernames }: Props) {
  const posterUrl = movie.posterPath
    ? `${TMDB_IMG}/w500${movie.posterPath}`
    : null;
  const backdropUrl = movie.backdropPath
    ? `${TMDB_IMG}/w1280${movie.backdropPath}`
    : null;

  const ratingColor =
    movie.tmdbRating >= 7.5
      ? "#00E054"
      : movie.tmdbRating >= 6
      ? "#FF8000"
      : "#99AABB";

  const modeLabel =
    mode === "intersection" ? "In common" : mode === "partial" ? "Shared" : "From pool";
  const modeColor =
    mode === "intersection" ? "#00E054" : mode === "partial" ? "#40BCF4" : "#FF8000";

  return (
    <div
      className="rounded-2xl border border-[#2c3440] bg-[#1c2228] overflow-hidden shadow-2xl"
      style={{ boxShadow: "0 0 60px rgba(0,0,0,0.5)" }}
    >
      {/* Backdrop */}
      {backdropUrl && (
        <div className="relative w-full h-36 md:h-48 overflow-hidden">
          <Image
            src={backdropUrl}
            alt=""
            fill
            className="object-cover"
            style={{ opacity: 0.4 }}
            sizes="(max-width: 768px) 100vw, 672px"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#1c2228] to-transparent" />
        </div>
      )}

      <div className={`flex gap-4 md:gap-6 p-5 md:p-6 ${backdropUrl ? "-mt-16 relative z-10" : ""}`}>
        {/* Poster */}
        <div className="flex-shrink-0">
          {posterUrl ? (
            <div className="relative w-24 md:w-32 rounded-lg overflow-hidden shadow-xl border border-[#2c3440]"
              style={{ aspectRatio: "2/3" }}>
              <Image
                src={posterUrl}
                alt={`${movie.title} poster`}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 96px, 128px"
                priority
              />
            </div>
          ) : (
            <div className="w-24 md:w-32 rounded-lg border border-[#2c3440] bg-[#14181C] flex items-center justify-center"
              style={{ aspectRatio: "2/3" }}>
              <span className="text-3xl">🎬</span>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h2 className="text-xl md:text-2xl font-bold text-[#e8ecf0] leading-tight">
            {movie.title}
          </h2>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5">
            {movie.year && (
              <span className="text-[#99AABB] text-sm">{movie.year}</span>
            )}
            {movie.runtime && (
              <span className="text-[#99AABB]/60 text-sm">{movie.runtime}m</span>
            )}
            {movie.genres.slice(0, 2).map((g) => (
              <span
                key={g}
                className="text-xs px-2 py-0.5 rounded-full border border-[#2c3440] text-[#99AABB]"
              >
                {g}
              </span>
            ))}
          </div>

          {/* Rating */}
          {movie.tmdbRating > 0 && (
            <div className="flex items-center gap-2 mt-2.5">
              <StarIcon color={ratingColor} />
              <span className="font-bold text-sm" style={{ color: ratingColor }}>
                {movie.tmdbRating.toFixed(1)}
              </span>
              <span className="text-xs text-[#99AABB]/60">
                TMDB · {movie.tmdbVoteCount.toLocaleString()} votes
              </span>
            </div>
          )}

          {/* Overview */}
          {movie.overview && (
            <p className="mt-3 text-sm text-[#99AABB] leading-relaxed line-clamp-4">
              {movie.overview}
            </p>
          )}

          {/* Links + pool info */}
          <div className="flex flex-wrap items-center gap-3 mt-4">
            {movie.letterboxdUrl && (
              <a
                href={movie.letterboxdUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs px-3 py-1 rounded-full border border-[#00E054]/30 text-[#00E054]
                  hover:bg-[#00E054]/10 transition-colors duration-150"
              >
                View on Letterboxd →
              </a>
            )}
            <a
              href={`https://www.themoviedb.org/movie/${movie.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs px-3 py-1 rounded-full border border-[#40BCF4]/30 text-[#40BCF4]
                hover:bg-[#40BCF4]/10 transition-colors duration-150"
            >
              TMDB →
            </a>
            {movie.letterboxdUrl && (
              <CinemaButton lbSlug={slugFromLetterboxdUrl(movie.letterboxdUrl)} />
            )}
          </div>
        </div>
      </div>

      {/* Footer: who has this movie + pool stats */}
      <div className="px-5 md:px-6 pb-4 space-y-2">
        {(foundInUsers.length > 0 || movie.watchedByUsers.length > 0) && allUsernames.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <UserBadges
              usernames={allUsernames}
              foundInUsers={foundInUsers}
              watchedByUsers={movie.watchedByUsers}
              size="md"
            />
            <span className="text-xs text-[#99AABB]/50">
              {movie.watchedByUsers.length > 0 && "✓ = watched · "}
              hollow = watchlist
            </span>
          </div>
        )}
        <div className="flex items-center gap-2">
          <span
            className="text-xs px-2 py-0.5 rounded-full font-medium"
            style={{ background: `${modeColor}18`, color: modeColor }}
          >
            {modeLabel}
          </span>
          <span className="text-xs text-[#99AABB]/50">
            {poolSize} movie{poolSize !== 1 ? "s" : ""} in pool
          </span>
        </div>
      </div>
    </div>
  );
}

function StarIcon({ color }: { color: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill={color} xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  );
}
