"use client";

import { useState, useCallback, useEffect } from "react";
import UserInputPanel from "@/components/UserInputPanel";
import MovieCard from "@/components/MovieCard";
import ModeToggle from "@/components/ModeToggle";
import SimilarMovies from "@/components/SimilarMovies";
import MovieListSection from "@/components/MovieListSection";
import FindBestie from "@/components/FindBestie";
import ParisCinema, { CalendarSection } from "@/components/ParisCinema";
import ParisAllMovies from "@/components/ParisAllMovies";
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
  const [appMode, setAppMode] = useState<null | "match" | "bestie" | "cinema" | "paris-all">(null);
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
          <button onClick={() => { setAppMode(null); handleReset(); }} className="focus:outline-none">
            <PickdLogo markSize={26} textSize="lg" />
          </button>
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

        {/* ══════════════════════════════════
            LANDING — no mode selected
        ══════════════════════════════════ */}
        {!appMode && (
          <>
            {/* Hero */}
            <section className="w-full max-w-3xl text-center pt-16 pb-12 md:pt-24 md:pb-16">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#00E054]/20 bg-[#00E054]/8 text-[#00E054] text-xs font-semibold tracking-wide mb-6">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00E054] animate-pulse" />
                Letterboxd-powered
              </div>
              <h1 className="text-4xl md:text-6xl font-bold tracking-tight leading-[1.1] text-[#e8ecf0] mb-5">
                Pick a film,<br />
                <span style={{ background: "linear-gradient(90deg,#00E054,#40BCF4)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                  not a fight.
                </span>
              </h1>
              <p className="text-[#99AABB] text-base md:text-lg leading-relaxed max-w-lg mx-auto">
                Four ways to use Pickd — choose what you need tonight.
              </p>
            </section>

            {/* Mode cards */}
            <div className="w-full max-w-3xl grid grid-cols-1 sm:grid-cols-2 gap-5 pb-16">

              {/* Movie Match card */}
              <button onClick={() => setAppMode("match")}
                className="group relative flex flex-col text-left p-7 rounded-3xl border border-[#2c3440] bg-[#1c2228]
                  hover:border-[#00E054]/40 hover:bg-[#00E054]/5 active:scale-[0.98]
                  transition-all duration-200 overflow-hidden"
                style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.3)" }}>
                {/* Glow */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none rounded-3xl"
                  style={{ boxShadow: "inset 0 0 40px rgba(0,224,84,0.06)" }} />

                <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5"
                  style={{ background: "rgba(0,224,84,0.12)", border: "1px solid rgba(0,224,84,0.25)" }}>
                  <FilmIcon color="#00E054" />
                </div>

                <h2 className="text-xl font-bold text-[#e8ecf0] mb-2">Movie Match</h2>
                <p className="text-sm text-[#99AABB]/80 leading-relaxed mb-6 flex-1">
                  Add your Letterboxd usernames with friends, match your watchlists and get a movie recommendation in seconds.
                </p>

                <div className="flex flex-wrap gap-1.5 mb-6">
                  {["Watchlist match", "Swipe mode", "Browse & filter"].map((t) => (
                    <span key={t} className="text-[10px] px-2.5 py-1 rounded-full bg-[#00E054]/8 text-[#00E054]/80 border border-[#00E054]/15">{t}</span>
                  ))}
                </div>

                <div className="flex items-center gap-2 text-sm font-semibold text-[#00E054] group-hover:gap-3 transition-all">
                  Start matching
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                </div>
              </button>

              {/* Paris Cinema card */}
              <button onClick={() => setAppMode("cinema")}
                className="group relative flex flex-col text-left p-7 rounded-3xl border border-[#2c3440] bg-[#1c2228]
                  hover:border-[#40BCF4]/40 hover:bg-[#40BCF4]/5 active:scale-[0.98]
                  transition-all duration-200 overflow-hidden"
                style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.3)" }}>
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none rounded-3xl"
                  style={{ boxShadow: "inset 0 0 40px rgba(64,188,244,0.06)" }} />

                <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5"
                  style={{ background: "rgba(64,188,244,0.12)", border: "1px solid rgba(64,188,244,0.25)" }}>
                  <CinemaIconLg color="#40BCF4" />
                </div>

                <h2 className="text-xl font-bold text-[#e8ecf0] mb-2">Paris Cinemas</h2>
                <p className="text-sm text-[#99AABB]/80 leading-relaxed mb-6 flex-1">
                  Check which films from your Letterboxd watchlist are playing in Paris cinemas this week.
                </p>

                <div className="flex flex-wrap gap-1.5 mb-6">
                  {["This week's schedule", "Watchlist cross-check", "Session links"].map((t) => (
                    <span key={t} className="text-[10px] px-2.5 py-1 rounded-full bg-[#40BCF4]/8 text-[#40BCF4]/80 border border-[#40BCF4]/15">{t}</span>
                  ))}
                </div>

                <div className="flex items-center gap-2 text-sm font-semibold text-[#40BCF4] group-hover:gap-3 transition-all">
                  Check cinemas
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                </div>
              </button>

              {/* Find Bestie card */}
              <button onClick={() => setAppMode("bestie")}
                className="group relative flex flex-col text-left p-7 rounded-3xl border border-[#2c3440] bg-[#1c2228]
                  hover:border-[#E879F9]/40 hover:bg-[#E879F9]/5 active:scale-[0.98]
                  transition-all duration-200 overflow-hidden"
                style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.3)" }}>
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none rounded-3xl"
                  style={{ boxShadow: "inset 0 0 40px rgba(232,121,249,0.06)" }} />

                <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5"
                  style={{ background: "rgba(232,121,249,0.12)", border: "1px solid rgba(232,121,249,0.25)" }}>
                  <BestieIconLg color="#E879F9" />
                </div>

                <h2 className="text-xl font-bold text-[#e8ecf0] mb-2">Find Your Bestie</h2>
                <p className="text-sm text-[#99AABB]/80 leading-relaxed mb-6 flex-1">
                  Discover Letterboxd users who share your favourite films. Search by how many films you have in common.
                </p>

                <div className="flex flex-wrap gap-1.5 mb-6">
                  {["Based on your top 4", "Film poster cards", "Opens on Letterboxd"].map((t) => (
                    <span key={t} className="text-[10px] px-2.5 py-1 rounded-full bg-[#E879F9]/8 text-[#E879F9]/80 border border-[#E879F9]/15">{t}</span>
                  ))}
                </div>

                <div className="flex items-center gap-2 text-sm font-semibold text-[#E879F9] group-hover:gap-3 transition-all">
                  Find my bestie
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                </div>
              </button>

              {/* Paris This Week card */}
              <button onClick={() => setAppMode("paris-all")}
                className="group relative flex flex-col text-left p-7 rounded-3xl border border-[#2c3440] bg-[#1c2228]
                  hover:border-[#F59E0B]/40 hover:bg-[#F59E0B]/5 active:scale-[0.98]
                  transition-all duration-200 overflow-hidden"
                style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.3)" }}>
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none rounded-3xl"
                  style={{ boxShadow: "inset 0 0 40px rgba(245,158,11,0.06)" }} />

                <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5"
                  style={{ background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.25)" }}>
                  <DiscoverIconLg color="#F59E0B" />
                </div>

                <h2 className="text-xl font-bold text-[#e8ecf0] mb-2">Paris This Week</h2>
                <p className="text-sm text-[#99AABB]/80 leading-relaxed mb-6 flex-1">
                  Browse every film playing in Paris cinemas this week — no account needed. Filter by UGC Illimité.
                </p>

                <div className="flex flex-wrap gap-1.5 mb-6">
                  {["All films at a glance", "Today highlighted", "UGC filter"].map((t) => (
                    <span key={t} className="text-[10px] px-2.5 py-1 rounded-full bg-[#F59E0B]/8 text-[#F59E0B]/80 border border-[#F59E0B]/15">{t}</span>
                  ))}
                </div>

                <div className="flex items-center gap-2 text-sm font-semibold text-[#F59E0B] group-hover:gap-3 transition-all">
                  What&apos;s on
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                </div>
              </button>
            </div>

            {/* Footer */}
            <footer className="mt-auto mb-8 pt-8 border-t border-[#2c3440]/50 w-full max-w-3xl flex flex-col sm:flex-row items-center justify-between gap-3">
              <PickdLogo markSize={22} textSize="sm" />
              <p className="text-xs text-[#99AABB]/30">
                Powered by{" "}
                <a href="https://letterboxd.com" target="_blank" rel="noopener noreferrer" className="hover:text-[#00E054] transition-colors">Letterboxd</a>
                {" "}&amp;{" "}
                <a href="https://www.themoviedb.org" target="_blank" rel="noopener noreferrer" className="hover:text-[#40BCF4] transition-colors">TMDB</a>
              </p>
            </footer>
          </>
        )}

        {/* ══════════════════════════════════
            MOVIE MATCH mode
        ══════════════════════════════════ */}
        {appMode === "match" && (
          <>
            <div className="w-full max-w-xl pt-8 pb-2">
              <button onClick={() => { setAppMode(null); handleReset(); }}
                className="flex items-center gap-1.5 text-sm text-[#99AABB]/60 hover:text-[#e8ecf0] transition-colors mb-6">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
                Back
              </button>
            </div>

            {hasResult && <div className="h-2" />}

            {/* Form */}
            <div className="w-full max-w-xl">
              <div className="rounded-3xl border border-[#2c3440] bg-[#1c2228] p-6 md:p-8"
                style={{ boxShadow: "0 0 0 1px rgba(0,224,84,0.07), 0 24px 60px rgba(0,0,0,0.45)" }}>
                <UserInputPanel usernames={usernames} onChange={setUsernames} history={history} onRemoveHistory={removeFromHistory} />
                {filledUsernames.length > 1 && (
                  <div className="mt-5">
                    <ModeToggle mode={mode} onChange={(m) => { if (m === "partial" && filledUsernames.length < 3) return; setMode(m); }} userCount={filledUsernames.length} />
                  </div>
                )}
                <button onClick={handleFind} disabled={hasMounted && (loading || filledUsernames.length === 0)}
                  className="mt-6 w-full py-3.5 rounded-xl font-semibold text-base tracking-wide transition-all duration-200
                    bg-[#00E054] text-[#14181C] hover:bg-[#00c949] active:scale-[0.98]
                    disabled:opacity-40 disabled:cursor-not-allowed">
                  {loading ? <span className="flex items-center justify-center gap-2"><SpinnerIcon /> Finding a movie…</span> : "Find a Movie"}
                </button>
              </div>
              {warnings.length > 0 && (
                <div className="mt-4 rounded-xl border border-[#FF8000]/30 bg-[#FF8000]/8 px-4 py-3 text-sm text-[#FF8000]">
                  {warnings.map((w, i) => <p key={i}>⚠ {w}</p>)}
                </div>
              )}
              {error && !movie && (
                <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/8 px-5 py-4 text-center">
                  <p className="text-red-400 text-sm font-medium">{error}</p>
                  {exhausted && <button onClick={handleReset} className="mt-2 text-xs text-[#40BCF4] underline hover:text-white">Start over</button>}
                </div>
              )}
            </div>

            {/* Result */}
            {hasResult && (
              <div className="mt-8 w-full max-w-2xl fade-in-up">
                <MovieCard movie={movie} poolSize={poolSize} mode={effectiveMode} foundInUsers={foundInUsers} allUsernames={filledUsernames} />
                <div className="flex gap-3 mt-5 justify-center">
                  <button onClick={handleReroll} disabled={loading || exhausted}
                    className="px-6 py-2.5 rounded-xl font-semibold text-sm border border-[#40BCF4] text-[#40BCF4]
                      hover:bg-[#40BCF4]/10 active:scale-[0.97] transition-all duration-150
                      disabled:opacity-40 disabled:cursor-not-allowed">
                    {loading ? <span className="flex items-center gap-2"><SpinnerIcon /> Rerolling…</span> : "🎲 Reroll"}
                  </button>
                  <button onClick={handleReset} className="px-6 py-2.5 rounded-xl font-semibold text-sm border border-[#2c3440] text-[#99AABB] hover:bg-[#2c3440] active:scale-[0.97] transition-all duration-150">
                    Start over
                  </button>
                </div>
                {seenIds.length > 1 && <p className="text-center text-xs text-[#99AABB]/50 mt-3">{seenIds.length} movies suggested this session</p>}
                <SimilarMovies movieId={movie.id} onSelect={handleSelectSimilar} />
              </div>
            )}

            {filledUsernames.length > 0 && hasMounted && (
              <div className="w-full max-w-2xl">
                <MovieListSection usernames={filledUsernames} userCount={filledUsernames.length}
                  onPick={(m) => { setMovie(m); setFoundInUsers([]); setSeenIds((prev) => [...prev, m.id]); window.scrollTo({ top: 0, behavior: "smooth" }); }} />
              </div>
            )}

            <div className="h-16" />
          </>
        )}

        {/* ══════════════════════════════════
            FIND BESTIE mode
        ══════════════════════════════════ */}
        {appMode === "bestie" && (
          <>
            <div className="w-full max-w-xl pt-8">
              <button onClick={() => setAppMode(null)}
                className="flex items-center gap-1.5 text-sm text-[#99AABB]/60 hover:text-[#e8ecf0] transition-colors mb-6">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
                Back
              </button>
              <FindBestie defaultOpen />
            </div>
            <div className="h-16" />
          </>
        )}

        {/* ══════════════════════════════════
            PARIS CINEMA mode
        ══════════════════════════════════ */}
        {appMode === "cinema" && (
          <CinemaModeSection onBack={() => setAppMode(null)} />
        )}

        {/* ══════════════════════════════════
            PARIS ALL mode
        ══════════════════════════════════ */}
        {appMode === "paris-all" && (
          <ParisAllSection onBack={() => setAppMode(null)} />
        )}

      </main>
    </div>
  );
}

/* ── Cinema mode: form card (narrow) + calendar (full width) ── */
function CinemaModeSection({ onBack }: { onBack: () => void }) {
  const [calData, setCalData] = useState<{ matches: import("@/app/api/paris-cinema/route").CinemaMatch[]; selcard: string } | null>(null);

  return (
    <>
      {/* Back + form card */}
      <div className="w-full max-w-xl pt-8 pb-2">
        <button onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-[#99AABB]/60 hover:text-[#e8ecf0] transition-colors mb-6">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          Back
        </button>
        <div className="rounded-3xl border border-[#2c3440] bg-[#1c2228] p-6 md:p-8"
          style={{ boxShadow: "0 0 0 1px rgba(64,188,244,0.07), 0 24px 60px rgba(0,0,0,0.45)" }}>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: "rgba(64,188,244,0.12)", border: "1px solid rgba(64,188,244,0.25)" }}>
              <CinemaIconLg color="#40BCF4" />
            </div>
            <div>
              <h2 className="font-bold text-[#e8ecf0]">Paris Cinemas This Week</h2>
              <p className="text-xs text-[#99AABB]/60 mt-0.5">Enter your username to check your watchlist</p>
            </div>
          </div>
          <ParisCinema onDataLoaded={setCalData} />
        </div>
      </div>

      {/* Calendar — full width, below the card */}
      {calData && calData.matches.length > 0 && (
        <div className="w-full max-w-5xl pb-8">
          <CalendarSection matches={calData.matches} selcard={calData.selcard} />
        </div>
      )}

      <div className="h-8" />
    </>
  );
}

/* ── Paris All mode: full-width movie grid, auto-fetches on mount ── */
function ParisAllSection({ onBack }: { onBack: () => void }) {
  return (
    <>
      <div className="w-full max-w-5xl pt-8 pb-2 px-2">
        <button onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-[#99AABB]/60 hover:text-[#e8ecf0] transition-colors mb-6">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          Back
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.25)" }}>
            <DiscoverIconLg color="#F59E0B" />
          </div>
          <div>
            <h2 className="font-bold text-[#e8ecf0]">Paris This Week</h2>
            <p className="text-xs text-[#99AABB]/60 mt-0.5">All films at the cinema in Paris — updated daily</p>
          </div>
        </div>

        <ParisAllMovies />
      </div>
      <div className="h-16" />
    </>
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

function FilmIcon({ color }: { color: string }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="2.18"/>
      <line x1="7" y1="2" x2="7" y2="22"/><line x1="17" y1="2" x2="17" y2="22"/>
      <line x1="2" y1="12" x2="22" y2="12"/><line x1="2" y1="7" x2="7" y2="7"/>
      <line x1="2" y1="17" x2="7" y2="17"/><line x1="17" y1="17" x2="22" y2="17"/>
      <line x1="17" y1="7" x2="22" y2="7"/>
    </svg>
  );
}

function CinemaIconLg({ color }: { color: string }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 4h20v16H2z"/><path d="M8 4v16"/><path d="M16 4v16"/><path d="M2 12h20"/>
      <path d="M2 8h4"/><path d="M18 8h4"/><path d="M2 16h4"/><path d="M18 16h4"/>
    </svg>
  );
}

function BestieIconLg({ color }: { color: string }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  );
}

function DiscoverIconLg({ color }: { color: string }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/>
    </svg>
  );
}
