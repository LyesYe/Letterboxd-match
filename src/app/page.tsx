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
import PickdLogo from "@/components/PickdLogo";

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

  const hasResult = movie && !loading;

  return (
    <div className="min-h-screen flex flex-col">

      {/* ── Sticky nav ── */}
      <nav className="sticky top-0 z-50 w-full border-b border-[#2c3440]/60 bg-[#14181C]/80 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-5 h-14 flex items-center justify-between">
          <PickdLogo markSize={26} textSize="lg" />
          <Link href="/swipe"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium
              border border-[#2c3440] text-[#99AABB]
              hover:text-[#e8ecf0] hover:border-[#00E054]/40 hover:bg-[#00E054]/5
              transition-all duration-200">
            <SwipeIcon /> Swipe Mode
          </Link>
        </div>
      </nav>

      <main className="flex-1 flex flex-col items-center px-4">

        {/* ── Hero ── */}
        {!hasResult && (
          <section className="w-full max-w-5xl pt-16 pb-10 md:pt-24 md:pb-16 flex flex-col md:flex-row md:items-center md:gap-16">

            {/* Left: headline */}
            <div className="flex-1 text-center md:text-left mb-12 md:mb-0">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#00E054]/20 bg-[#00E054]/8 text-[#00E054] text-xs font-semibold tracking-wide mb-6">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00E054] animate-pulse" />
                Letterboxd-powered
              </div>

              <h1 className="text-4xl md:text-6xl font-bold tracking-tight leading-[1.1] text-[#e8ecf0]">
                Pick a film,<br />
                <span style={{ background: "linear-gradient(90deg,#00E054,#40BCF4)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                  not a fight.
                </span>
              </h1>

              <p className="mt-5 text-[#99AABB] text-base md:text-lg leading-relaxed max-w-md mx-auto md:mx-0">
                Match your Letterboxd watchlists with friends and find a film you&apos;ll both actually want to watch tonight.
              </p>

              {/* Feature pills */}
              <div className="flex flex-wrap gap-2 mt-8 justify-center md:justify-start">
                {[
                  { icon: "🎯", label: "Watchlist match" },
                  { icon: "🃏", label: "Swipe mode" },
                  { icon: "🔍", label: "Browse & filter" },
                  { icon: "✓", label: "Watched tracking" },
                ].map((f) => (
                  <span key={f.label}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium
                      bg-[#1c2228] border border-[#2c3440] text-[#99AABB]">
                    <span>{f.icon}</span> {f.label}
                  </span>
                ))}
              </div>
            </div>

            {/* Right: decorative card stack */}
            <div className="hidden md:flex flex-shrink-0 w-56 h-72 relative" aria-hidden>
              {[
                { rotate: "-12deg", x: "-24px", bg: "linear-gradient(135deg,#1e2a3a,#0f1922)", z: 0 },
                { rotate: "6deg",  x: "16px",  bg: "linear-gradient(135deg,#1a2832,#0d1f2d)", z: 1 },
                { rotate: "-2deg", x: "0px",   bg: "linear-gradient(160deg,#1c2228,#141c24)", z: 2 },
              ].map((card, i) => (
                <div key={i} className="absolute inset-0 rounded-2xl border border-[#2c3440]"
                  style={{ background: card.bg, transform: `rotate(${card.rotate}) translateX(${card.x})`, zIndex: card.z, boxShadow: "0 20px 40px rgba(0,0,0,0.5)" }}>
                  {/* Fake poster placeholder */}
                  <div className="absolute inset-0 rounded-2xl overflow-hidden">
                    <div className="absolute bottom-0 left-0 right-0 p-4"
                      style={{ background: "linear-gradient(to top, rgba(0,0,0,0.8), transparent)" }}>
                      <div className="h-2.5 rounded-full bg-[#e8ecf0]/20 w-3/4 mb-2" />
                      <div className="h-2 rounded-full bg-[#e8ecf0]/10 w-1/2" />
                    </div>
                  </div>
                </div>
              ))}
              {/* Glowing dot */}
              <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-24 h-4 rounded-full"
                style={{ background: "rgba(0,224,84,0.2)", filter: "blur(12px)" }} />
            </div>
          </section>
        )}

        {/* ── Divider when result shown ── */}
        {hasResult && <div className="h-8" />}

        {/* ── App form ── */}
        <div className="w-full max-w-xl">
          <div
            className="rounded-3xl border border-[#2c3440] bg-[#1c2228] p-6 md:p-8"
            style={{ boxShadow: "0 0 0 1px rgba(0,224,84,0.07), 0 24px 60px rgba(0,0,0,0.45)" }}
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
              className="mt-6 w-full py-3.5 rounded-xl font-semibold text-base tracking-wide transition-all duration-200
                bg-[#00E054] text-[#14181C] hover:bg-[#00c949] active:scale-[0.98]
                disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading
                ? <span className="flex items-center justify-center gap-2"><SpinnerIcon /> Finding a movie…</span>
                : "Find a Movie"
              }
            </button>
          </div>

          {/* Warnings */}
          {warnings.length > 0 && (
            <div className="mt-4 rounded-xl border border-[#FF8000]/30 bg-[#FF8000]/8 px-4 py-3 text-sm text-[#FF8000]">
              {warnings.map((w, i) => <p key={i}>⚠ {w}</p>)}
            </div>
          )}

          {/* Error */}
          {error && !movie && (
            <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/8 px-5 py-4 text-center">
              <p className="text-red-400 text-sm font-medium">{error}</p>
              {exhausted && (
                <button onClick={handleReset} className="mt-2 text-xs text-[#40BCF4] underline hover:text-white">
                  Start over
                </button>
              )}
            </div>
          )}
        </div>

        {/* ── Movie result ── */}
        {hasResult && (
          <div className="mt-8 w-full max-w-2xl fade-in-up">
            <MovieCard movie={movie} poolSize={poolSize} mode={effectiveMode} foundInUsers={foundInUsers} allUsernames={filledUsernames} />

            <div className="flex gap-3 mt-5 justify-center">
              <button onClick={handleReroll} disabled={loading || exhausted}
                className="px-6 py-2.5 rounded-xl font-semibold text-sm border border-[#40BCF4] text-[#40BCF4]
                  hover:bg-[#40BCF4]/10 active:scale-[0.97] transition-all duration-150
                  disabled:opacity-40 disabled:cursor-not-allowed">
                {loading
                  ? <span className="flex items-center gap-2"><SpinnerIcon /> Rerolling…</span>
                  : "🎲 Reroll"
                }
              </button>
              <button onClick={handleReset}
                className="px-6 py-2.5 rounded-xl font-semibold text-sm border border-[#2c3440] text-[#99AABB]
                  hover:bg-[#2c3440] active:scale-[0.97] transition-all duration-150">
                Start over
              </button>
            </div>

            {seenIds.length > 1 && (
              <p className="text-center text-xs text-[#99AABB]/50 mt-3">
                {seenIds.length} movies suggested this session
              </p>
            )}

            <SimilarMovies movieId={movie.id} onSelect={handleSelectSimilar} />
          </div>
        )}

        {/* ── Full list ── */}
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

        {/* ── Feature section (only shown before first search) ── */}
        {!hasResult && filledUsernames.length === 0 && hasMounted && (
          <section className="w-full max-w-5xl mt-20 mb-8">
            <p className="text-center text-xs font-semibold tracking-widest uppercase text-[#99AABB]/40 mb-8">
              How it works
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                {
                  step: "01",
                  title: "Add usernames",
                  desc: "Enter your Letterboxd username and your friends'. Watchlists are fetched automatically.",
                  color: "#00E054",
                },
                {
                  step: "02",
                  title: "Choose a mode",
                  desc: "Pick from everyone's lists, movies you have in common, or anything in at least two lists.",
                  color: "#40BCF4",
                },
                {
                  step: "03",
                  title: "Get your film",
                  desc: "Roll a random pick, swipe through the pool, or browse with filters. Decide in seconds.",
                  color: "#FF8000",
                },
              ].map((f) => (
                <div key={f.step}
                  className="rounded-2xl border border-[#2c3440] bg-[#1c2228] p-6 flex flex-col gap-3 hover:border-[#2c3440]/80 transition-colors">
                  <span className="text-xs font-bold tracking-widest" style={{ color: f.color }}>{f.step}</span>
                  <h3 className="font-semibold text-[#e8ecf0]">{f.title}</h3>
                  <p className="text-sm text-[#99AABB]/80 leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Footer ── */}
        <footer className="mt-16 mb-8 pt-8 border-t border-[#2c3440]/50 w-full max-w-5xl flex flex-col sm:flex-row items-center justify-between gap-3">
          <PickdLogo markSize={22} textSize="sm" />
          <p className="text-xs text-[#99AABB]/30">
            Powered by{" "}
            <a href="https://letterboxd.com" target="_blank" rel="noopener noreferrer"
              className="hover:text-[#00E054] transition-colors">Letterboxd</a>
            {" "}&amp;{" "}
            <a href="https://www.themoviedb.org" target="_blank" rel="noopener noreferrer"
              className="hover:text-[#40BCF4] transition-colors">TMDB</a>
          </p>
        </footer>

      </main>
    </div>
  );
}

function SpinnerIcon() {
  return (
    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
    </svg>
  );
}

function SwipeIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="5" width="10" height="14" rx="2"/>
      <rect x="12" y="7" width="10" height="14" rx="2"/>
    </svg>
  );
}
