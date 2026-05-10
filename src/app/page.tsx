"use client";

import { useState, useCallback, useEffect } from "react";
import UserInputPanel from "@/components/UserInputPanel";
import MovieCard from "@/components/MovieCard";
import ModeToggle from "@/components/ModeToggle";
import SimilarMovies from "@/components/SimilarMovies";
import MovieListSection from "@/components/MovieListSection";
import { MovieDetails, MatchMode } from "@/types";
import { SimilarMovie } from "@/app/api/similar/route";
import { useUsernameHistory } from "@/hooks/useUsernameHistory";
import Link from "next/link";

export default function Home() {
  const [usernames, setUsernames] = useState<string[]>(["", ""]);
  const [mode, setMode] = useState<MatchMode>("intersection");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [movie, setMovie] = useState<MovieDetails | null>(null);
  const [foundInUsers, setFoundInUsers] = useState<string[]>([]);
  const [poolSize, setPoolSize] = useState<number>(0);
  const [seenIds, setSeenIds] = useState<number[]>([]);
  const [exhausted, setExhausted] = useState(false);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [hasMounted, setHasMounted] = useState(false);
  useEffect(() => setHasMounted(true), []);
  const { history, addUsernames, remove: removeFromHistory } = useUsernameHistory();

  const filledUsernames = usernames.filter((u) => u.trim().length > 0);
  // Downgrade partial → intersection when fewer than 3 users are filled in
  const effectiveMode: MatchMode =
    filledUsernames.length <= 1
      ? "union"
      : mode === "partial" && filledUsernames.length < 3
      ? "intersection"
      : mode;

  const fetchRecommendation = useCallback(
    async (currentSeenIds: number[]) => {
      if (filledUsernames.length === 0) {
        setError("Enter at least one Letterboxd username.");
        return;
      }

      setLoading(true);
      setError(null);
      setExhausted(false);
      setWarnings([]);

      try {
        const res = await fetch("/api/recommend", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            usernames: filledUsernames,
            mode: effectiveMode,
            seenIds: currentSeenIds,
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          if (data.exhausted) setExhausted(true);
          setError(data.error ?? "Something went wrong.");
          return;
        }

        setMovie(data.movie);
        setFoundInUsers(data.foundInUsers ?? []);
        setPoolSize(data.poolSize);
        setSeenIds((prev) => [...prev, data.movie.id]);
        if (data.errors?.length) setWarnings(data.errors);
      } catch {
        setError("Network error. Please try again.");
      } finally {
        setLoading(false);
      }
    },
    [filledUsernames, effectiveMode]
  );

  const handleFind = () => {
    addUsernames(filledUsernames);
    setMovie(null);
    setSeenIds([]);
    fetchRecommendation([]);
  };

  const handleReroll = () => {
    fetchRecommendation(seenIds);
  };

  const handleSelectSimilar = useCallback(async (similar: SimilarMovie) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/movie?id=${similar.id}`);
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Could not load movie."); return; }
      setMovie(data.movie);
      setFoundInUsers([]);
      setSeenIds((prev) => [...prev, similar.id]);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleReset = () => {
    setMovie(null);
    setFoundInUsers([]);
    setSeenIds([]);
    setError(null);
    setExhausted(false);
    setWarnings([]);
    setPoolSize(0);
  };

  return (
    <main className="min-h-screen flex flex-col items-center px-4 py-8 md:py-16">
      {/* Header */}
      <header className="text-center mb-10 md:mb-14">
        <div className="flex items-center justify-center gap-2 mb-3">
          <span className="text-3xl">🎬</span>
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-[#e8ecf0]">
            Movie <span className="text-[#00E054]">Matcher</span>
          </h1>
        </div>
        <p className="text-[#99AABB] text-sm md:text-base max-w-md mx-auto">
          Find the perfect film to watch tonight — from your Letterboxd watchlists.
        </p>
        <Link href="/swipe"
          className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-full border border-[#2c3440]
            text-sm text-[#99AABB] hover:text-[#e8ecf0] hover:border-[#99AABB]/40 hover:bg-[#1c2228]
            transition-all duration-150">
          🃏 <span>Swipe Mode</span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
        </Link>
      </header>

      {/* Input Panel */}
      <div
        className="w-full max-w-xl rounded-2xl border border-[#2c3440] bg-[#1c2228] p-6 md:p-8 shadow-2xl"
        style={{ boxShadow: "0 0 40px rgba(0,224,84,0.05)" }}
      >
        <UserInputPanel
          usernames={usernames}
          onChange={setUsernames}
          history={history}
          onRemoveHistory={removeFromHistory}
        />

        {filledUsernames.length > 1 && (
          <div className="mt-5">
            <ModeToggle
              mode={mode}
              onChange={(m) => {
                // "partial" only makes sense with 3+ users; guard just in case
                if (m === "partial" && filledUsernames.length < 3) return;
                setMode(m);
              }}
              userCount={filledUsernames.length}
            />
          </div>
        )}

        <button
          onClick={handleFind}
          disabled={hasMounted && (loading || filledUsernames.length === 0)}
          className="mt-6 w-full py-3 rounded-xl font-semibold text-base tracking-wide transition-all duration-200
            bg-[#00E054] text-[#14181C] hover:bg-[#00c949] active:scale-[0.98]
            disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <SpinnerIcon /> Finding a movie…
            </span>
          ) : (
            "Find a Movie"
          )}
        </button>
      </div>

      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="mt-4 w-full max-w-xl rounded-lg border border-[#FF8000]/30 bg-[#FF8000]/10 px-4 py-3 text-sm text-[#FF8000]">
          {warnings.map((w, i) => (
            <p key={i}>⚠ {w}</p>
          ))}
        </div>
      )}

      {/* Error */}
      {error && !movie && (
        <div className="mt-6 w-full max-w-xl rounded-xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-center">
          <p className="text-red-400 text-sm font-medium">{error}</p>
          {exhausted && (
            <button
              onClick={handleReset}
              className="mt-3 text-xs text-[#40BCF4] underline hover:text-white"
            >
              Start over
            </button>
          )}
        </div>
      )}

      {/* Movie Result */}
      {movie && !loading && (
        <div className="mt-8 w-full max-w-2xl fade-in-up">
          <MovieCard movie={movie} poolSize={poolSize} mode={effectiveMode} foundInUsers={foundInUsers} allUsernames={filledUsernames} />

          <div className="flex gap-3 mt-5 justify-center">
            <button
              onClick={handleReroll}
              disabled={loading || exhausted}
              className="px-6 py-2.5 rounded-xl font-semibold text-sm border border-[#40BCF4] text-[#40BCF4]
                hover:bg-[#40BCF4]/10 active:scale-[0.97] transition-all duration-150
                disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center gap-2"><SpinnerIcon /> Rerolling…</span>
              ) : (
                "🎲 Reroll"
              )}
            </button>
            <button
              onClick={handleReset}
              className="px-6 py-2.5 rounded-xl font-semibold text-sm border border-[#2c3440] text-[#99AABB]
                hover:bg-[#2c3440] active:scale-[0.97] transition-all duration-150"
            >
              Start over
            </button>
          </div>

          {seenIds.length > 1 && (
            <p className="text-center text-xs text-[#99AABB]/60 mt-3">
              {seenIds.length} movie{seenIds.length !== 1 ? "s" : ""} suggested this session
            </p>
          )}

          <SimilarMovies movieId={movie.id} onSelect={handleSelectSimilar} />
        </div>
      )}

      {/* Full list — shown once usernames are entered */}
      {filledUsernames.length > 0 && hasMounted && (
        <div className="w-full max-w-2xl">
          <MovieListSection
            usernames={filledUsernames}
            userCount={filledUsernames.length}
            onPick={(m) => {
              setMovie(m);
              setFoundInUsers([]);
              setSeenIds((prev) => [...prev, m.id]);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          />
        </div>
      )}

      <footer className="mt-16 text-center text-xs text-[#99AABB]/40">
        Powered by{" "}
        <a
          href="https://letterboxd.com"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-[#00E054] transition-colors"
        >
          Letterboxd
        </a>{" "}
        &amp;{" "}
        <a
          href="https://www.themoviedb.org"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-[#40BCF4] transition-colors"
        >
          TMDB
        </a>
      </footer>
    </main>
  );
}

function SpinnerIcon() {
  return (
    <svg
      className="animate-spin h-4 w-4"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
    </svg>
  );
}
