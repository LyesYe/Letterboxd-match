"use client";

import { useState, useEffect } from "react";
import { CinemaMatch } from "@/app/api/paris-cinema/route";
import { Showtime } from "@/app/api/paris-cinema/showtimes/route";
import { useUsernameHistory } from "@/hooks/useUsernameHistory";

interface AllMovie {
  hasToday: boolean;
  pciId: number; title: string; year: string; duration: string; director: string;
  copies: number; lbSlug: string; lbUrl: string; pciUrl: string; posterUrl: string;
}

interface Props {
  defaultUsername?: string;
  onDataLoaded?: (data: { matches: CinemaMatch[]; selcard: string } | null) => void;
}

export default function ParisCinema({ defaultUsername = "", onDataLoaded }: Props) {
  const [username, setUsername]   = useState(defaultUsername);
  const [loading, setLoading]     = useState(false);
  const [matches, setMatches]     = useState<CinemaMatch[]>([]);
  const [allMovies, setAllMovies] = useState<AllMovie[]>([]);
  const [total, setTotal]         = useState(0);
  const [error, setError]         = useState("");
  const [done, setDone]           = useState(false);
  const [showAll, setShowAll]     = useState(false);
  const [showDrop, setShowDrop]   = useState(false);
  const [ugcOnly, setUgcOnly]     = useState(false);

  const { history, remove } = useUsernameHistory();
  const sugs = history.filter(
    (h) => h !== username && (username === "" || h.toLowerCase().includes(username.toLowerCase()))
  );

  const handleCheck = async () => {
    if (!username.trim()) return;
    setLoading(true); setError(""); setDone(false); setMatches([]); setAllMovies([]);
    try {
      const res  = await fetch("/api/paris-cinema", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usernames: [username.trim()], selcard: ugcOnly ? "ugc" : "all" }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Error."); onDataLoaded?.(null); return; }
      const m = data.matches ?? [];
      setMatches(m);
      setAllMovies(data.allMovies ?? []);
      setTotal(data.total ?? 0);
      setDone(true);
      onDataLoaded?.({ matches: m, selcard: ugcOnly ? "ugc" : "all" });
    } catch { setError("Network error."); }
    finally { setLoading(false); }
  };

  return (
    <div className="space-y-4">
      {/* Username input */}
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#99AABB]/50 text-sm pointer-events-none z-10">@</span>
        <input value={username}
          onChange={(e) => { setUsername(e.target.value); setShowDrop(true); }}
          onFocus={() => setShowDrop(true)}
          onBlur={() => setTimeout(() => setShowDrop(false), 150)}
          onKeyDown={(e) => e.key === "Enter" && handleCheck()}
          placeholder="your_letterboxd_username"
          autoComplete="off" autoCapitalize="none" spellCheck={false}
          className="w-full bg-[#14181C] border border-[#2c3440] rounded-xl pl-7 pr-3 py-3
            text-sm text-[#e8ecf0] placeholder-[#99AABB]/40
            focus:outline-none focus:border-[#40BCF4]/50 transition-colors" />
        {showDrop && sugs.length > 0 && (
          <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-[#1c2228] border border-[#2c3440] rounded-xl overflow-hidden shadow-xl">
            {sugs.slice(0, 5).map((s) => (
              <div key={s} className="flex items-center group">
                <button onMouseDown={() => { setUsername(s); setShowDrop(false); }}
                  className="flex-1 flex items-center gap-2 px-3 py-2 text-sm text-[#e8ecf0] hover:bg-[#2c3440]">
                  <ClockIcon /> @{s}
                </button>
                <button onMouseDown={() => remove(s)}
                  className="px-3 py-2 text-[#99AABB]/30 hover:text-red-400 opacity-0 group-hover:opacity-100">
                  <XSmIcon />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* UGC Illimité toggle */}
      <button onClick={() => setUgcOnly((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl border transition-all duration-150"
        style={{
          background:  ugcOnly ? "#40BCF418" : "#14181C",
          borderColor: ugcOnly ? "#40BCF460" : "#2c3440",
        }}>
        <div className="flex items-center gap-2.5">
          <span className="text-base">🎟</span>
          <div className="text-left">
            <p className="text-sm font-semibold" style={{ color: ugcOnly ? "#40BCF4" : "#99AABB" }}>
              Carte UGC Illimité
            </p>
            <p className="text-[10px]" style={{ color: ugcOnly ? "#40BCF4aa" : "#99AABB55" }}>
              Afficher uniquement les cinémas UGC
            </p>
          </div>
        </div>
        {/* Toggle pill */}
        <div className="flex-shrink-0 w-10 h-6 rounded-full border transition-all duration-200 relative"
          style={{ background: ugcOnly ? "#40BCF4" : "#2c3440", borderColor: ugcOnly ? "#40BCF4" : "#2c3440" }}>
          <span className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all duration-200"
            style={{ left: ugcOnly ? "calc(100% - 22px)" : "2px" }} />
        </div>
      </button>

      <button onClick={handleCheck} disabled={loading || !username.trim()}
        className="w-full py-3 rounded-xl font-semibold text-sm transition-all duration-200
          bg-[#40BCF4] text-[#14181C] hover:bg-[#2da8de] active:scale-[0.98]
          disabled:opacity-40 disabled:cursor-not-allowed">
        {loading
          ? <span className="flex items-center justify-center gap-2"><Spinner /> Checking cinemas…</span>
          : "Check Paris Cinemas"
        }
      </button>

      {error && <p className="text-red-400 text-sm text-center">{error}</p>}

      {done && (
        <>
          {/* ── Watchlist matches ── */}
          <div className="space-y-3">
            <p className="text-xs font-semibold tracking-widest uppercase text-[#99AABB]/50">
              {matches.length === 0
                ? "Nothing from your watchlist this week"
                : `${matches.length} from your watchlist`}
            </p>
            {matches.length === 0 ? (
              <div className="rounded-xl border border-[#2c3440] bg-[#14181C]/50 p-5 text-center space-y-2">
                <p className="text-2xl">🎭</p>
                <p className="text-sm text-[#99AABB]/70">None of your watchlist films are playing.</p>
                <a href="https://paris-cine.info" target="_blank" rel="noopener noreferrer"
                  className="inline-block text-xs text-[#40BCF4] hover:underline mt-1">
                  Browse all Paris screenings ↗
                </a>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {matches.map((m) => (
                  <MovieCard key={m.pciId} movie={m} selcard={ugcOnly ? "ugc" : "all"} />
                ))}
              </div>
            )}
          </div>

          {/* ── All cinema movies ── */}
          <div className="pt-2 space-y-2">
            <button onClick={() => setShowAll((v) => !v)}
              className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-[#2c3440]
                text-sm text-[#99AABB]/70 hover:text-[#e8ecf0] hover:border-[#40BCF4]/30 transition-all">
              <span>All {total} films playing in Paris this week</span>
              <ChevronIcon open={showAll} />
            </button>

            {showAll && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {allMovies.map((m) => (
                  <MovieCard key={m.pciId} movie={m} selcard={ugcOnly ? "ugc" : "all"} />
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

type CardMovie = { hasToday?: boolean; pciId: number; title: string; year: string; duration: string; director: string; copies: number; lbUrl: string; pciUrl: string; posterUrl: string };

/* ── Poster card — opens a full-screen modal on click ── */
function MovieCard({ movie, selcard = "all" }: { movie: CardMovie; selcard?: string }) {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <button onClick={() => setModalOpen(true)}
        className="rounded-xl border border-[#2c3440] overflow-hidden bg-[#1c2228]
          hover:border-[#40BCF4]/40 transition-colors group text-left w-full">
        {/* Poster */}
        <div className="relative w-full bg-[#14181C]" style={{ aspectRatio: "2/3" }}>
          <img src={movie.posterUrl} alt={movie.title} loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
          <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-[#40BCF4] text-[#0d1014]">
            {movie.copies} {movie.copies === 1 ? "cinéma" : "cinémas"}
          </div>
          {movie.hasToday && (
            <div className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-red-500 text-white"
              style={{ boxShadow: "0 0 8px rgba(239,68,68,0.6)" }}>
              Aujourd&apos;hui
            </div>
          )}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center">
            <span className="opacity-0 group-hover:opacity-100 transition-opacity text-white text-xs font-semibold bg-black/70 px-2.5 py-1 rounded-full">
              Séances →
            </span>
          </div>
        </div>
        {/* Title */}
        <div className="px-2.5 py-2">
          <p className="text-[11px] font-semibold text-[#e8ecf0] leading-tight line-clamp-2">{movie.title}</p>
          <div className="flex gap-1.5 mt-0.5">
            {movie.year && <span className="text-[10px] text-[#99AABB]/60">{movie.year}</span>}
            {movie.duration && <span className="text-[10px] text-[#99AABB]/40">{movie.duration}</span>}
          </div>
        </div>
      </button>

      {modalOpen && <SessionModal movie={movie} selcard={selcard} onClose={() => setModalOpen(false)} />}
    </>
  );
}

/* ── Full-screen blurred modal with all session details ── */
function SessionModal({ movie, selcard = "all", onClose }: { movie: CardMovie; selcard?: string; onClose: () => void }) {
  const [showtimes, setShowtimes] = useState<Showtime[]>([]);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    fetch(`/api/paris-cinema/showtimes?mov_id=${movie.pciId}&selcard=${selcard}`)
      .then((r) => r.json())
      .then((d) => setShowtimes(d.showtimes ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [movie.pciId, selcard]);

  // Group by date, then sort sessions by time within each day
  const byDate: Record<string, Showtime[]> = {};
  for (const s of showtimes) {
    const date = s.date.slice(0, 10);
    (byDate[date] = byDate[date] || []).push(s);
  }
  for (const d of Object.keys(byDate)) {
    byDate[d].sort((a, b) => a.date.localeCompare(b.date));
  }

  const fmtDay  = (iso: string) =>
    new Date(iso + "T00:00:00").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
  const fmtTime = (iso: string) =>
    new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

  const typeColor = (t: string) =>
    t === "VO" || t === "VOSTF" ? "#40BCF4" : t === "VF" ? "#FF8000" : "#99AABB";

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", background: "rgba(10,13,16,0.75)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="relative w-full sm:max-w-lg max-h-[92vh] sm:max-h-[85vh] flex flex-col
          bg-[#1c2228] border border-[#2c3440] sm:rounded-2xl rounded-t-2xl overflow-hidden"
        style={{ boxShadow: "0 32px 80px rgba(0,0,0,0.7)" }}
      >
        {/* Header */}
        <div className="flex gap-4 p-4 border-b border-[#2c3440] flex-shrink-0">
          {/* Mini poster */}
          <div className="flex-shrink-0 w-14 rounded-lg overflow-hidden border border-[#2c3440] bg-[#14181C]" style={{ aspectRatio: "2/3" }}>
            <img src={movie.posterUrl} alt={movie.title} className="w-full h-full object-cover"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
          </div>
          {/* Info */}
          <div className="flex-1 min-w-0">
            <h2 className="font-bold text-[#e8ecf0] leading-tight">{movie.title}</h2>
            <div className="flex flex-wrap gap-x-2 gap-y-0.5 mt-1">
              {movie.year && <span className="text-xs text-[#99AABB]/70">{movie.year}</span>}
              {movie.duration && <span className="text-xs text-[#99AABB]/50">{movie.duration}</span>}
              {movie.director && <span className="text-xs text-[#99AABB]/50">Dir. {movie.director}</span>}
            </div>
            <div className="flex gap-2 mt-2">
              {movie.lbUrl && (
                <a href={movie.lbUrl} target="_blank" rel="noopener noreferrer"
                  className="text-[10px] px-2 py-0.5 rounded-full border border-[#00E054]/25 text-[#00E054]/80 hover:text-[#00E054] transition-colors">
                  Letterboxd ↗
                </a>
              )}
              <a href={movie.pciUrl} target="_blank" rel="noopener noreferrer"
                className="text-[10px] px-2 py-0.5 rounded-full border border-[#40BCF4]/25 text-[#40BCF4]/80 hover:text-[#40BCF4] transition-colors">
                paris-cine.info ↗
              </a>
            </div>
          </div>
          {/* Close */}
          <button onClick={onClose}
            className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full
              text-[#99AABB]/50 hover:text-[#e8ecf0] hover:bg-[#2c3440] transition-colors self-start">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Sessions */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {loading ? (
            <div className="flex flex-col items-center gap-3 py-12">
              <div className="w-8 h-8 border-2 border-[#2c3440] border-t-[#40BCF4] rounded-full animate-spin" />
              <span className="text-sm text-[#99AABB]/60">Chargement des séances…</span>
            </div>
          ) : Object.keys(byDate).length === 0 ? (
            <p className="text-center text-sm text-[#99AABB]/50 py-8">Aucune séance disponible</p>
          ) : (
            Object.entries(byDate).map(([date, sessions]) => (
              <div key={date}>
                {/* Day header */}
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-xs font-bold tracking-widest uppercase text-[#40BCF4] capitalize">
                    {fmtDay(date)}
                  </span>
                  <div className="flex-1 h-px bg-[#2c3440]" />
                  <span className="text-[10px] text-[#99AABB]/40">{sessions.length} séance{sessions.length > 1 ? "s" : ""}</span>
                </div>

                {/* Sessions sorted by time, showing cinema */}
                <div className="space-y-2">
                  {sessions.map((s, i) => {
                    const tc = typeColor(s.type);
                    return (
                      <div key={i}
                        className="flex items-center gap-3 p-3 rounded-xl border border-[#2c3440] bg-[#14181C]/60
                          hover:border-[#40BCF4]/20 transition-colors">
                        {/* Time */}
                        <div className="flex-shrink-0 text-center min-w-[44px]">
                          <p className="text-base font-bold text-[#e8ecf0] leading-none">{fmtTime(s.date)}</p>
                        </div>

                        <div className="w-px h-8 bg-[#2c3440] flex-shrink-0" />

                        {/* Cinema + format */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-[#e8ecf0] leading-tight line-clamp-1">{s.cinema}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {s.type && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                                style={{ background: `${tc}18`, color: tc }}>
                                {s.type}
                              </span>
                            )}
                            {s.format && s.format !== "Numérique" && (
                              <span className="text-[10px] text-[#99AABB]/50">{s.format}</span>
                            )}
                          </div>
                        </div>

                        {/* Book button */}
                        {s.bookUrl && (
                          <a href={s.bookUrl} target="_blank" rel="noopener noreferrer"
                            className="flex-shrink-0 text-[11px] px-3 py-1.5 rounded-lg font-semibold
                              bg-[#40BCF4] text-[#0d1014] hover:bg-[#2da8de] transition-colors whitespace-nowrap">
                            Réserver
                          </a>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Calendar section ── */
interface CalSession {
  date: string;        // YYYY-MM-DD
  time: string;        // ISO datetime
  movieTitle: string;
  cinema: string;
  type: string;
  bookUrl: string;
  pciId: number;
}

export function CalendarSection({ matches, selcard }: { matches: CinemaMatch[]; selcard: string }) {
  const [sessions, setSessions] = useState<CalSession[]>([]);
  const [loading, setLoading]   = useState(true);

  const COLORS = ["#00E054","#40BCF4","#FF8000","#E879F9","#FB7185","#FACC15","#34D399","#F97316"];
  const movieColors: Record<string, string> = {};
  matches.forEach((m, i) => { movieColors[m.title] = COLORS[i % COLORS.length]; });

  useEffect(() => {
    setLoading(true);
    Promise.all(
      matches.map(async (m) => {
        try {
          const res  = await fetch(`/api/paris-cinema/showtimes?mov_id=${m.pciId}&selcard=${selcard}`);
          const data = await res.json();
          return (data.showtimes ?? []).map((s: { date: string; cinema: string; type: string; bookUrl: string }) => ({
            date: s.date.slice(0, 10), time: s.date,
            movieTitle: m.title, cinema: s.cinema,
            type: s.type ?? "", bookUrl: s.bookUrl ?? "",
          }));
        } catch { return []; }
      })
    ).then((results) => {
      const all = results.flat().sort((a, b) => a.time.localeCompare(b.time));
      setSessions(all);
      setLoading(false);
    });
  }, [matches, selcard]);

  // Group by date
  const byDate: Record<string, CalSession[]> = {};
  for (const s of sessions) (byDate[s.date] = byDate[s.date] || []).push(s);
  const dates = Object.keys(byDate).sort();

  const fmtWeekday = (iso: string) =>
    new Date(iso + "T00:00:00").toLocaleDateString("fr-FR", { weekday: "short" })
      .replace(".", "").charAt(0).toUpperCase() +
    new Date(iso + "T00:00:00").toLocaleDateString("fr-FR", { weekday: "short" }).slice(1, 3);
  const fmtDayNum = (iso: string) =>
    new Date(iso + "T00:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
  const fmtTime = (iso: string) =>
    new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  const typeColor = (t: string) =>
    t === "VO" || t === "VOSTF" ? "#40BCF4" : t === "VF" ? "#FF8000" : "#99AABB";

  const cols = Math.max(dates.length, 1);
  const gridCols = cols <= 3 ? `grid-cols-${cols}` :
                   cols === 4 ? "grid-cols-4" :
                   cols === 5 ? "grid-cols-5" :
                   cols === 6 ? "grid-cols-6" : "grid-cols-7";

  return (
    <div className="w-full rounded-2xl border border-[#2c3440] bg-[#1c2228] overflow-hidden mt-6">
      {/* Header */}
      <div className="px-5 py-4 border-b border-[#2c3440] flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <CalendarIcon />
          <span className="font-semibold text-[#e8ecf0]">Séances de la semaine</span>
        </div>
        {/* Legend */}
        <div className="flex flex-wrap gap-x-4 gap-y-1 justify-end">
          {matches.map((m) => (
            <span key={m.pciId} className="flex items-center gap-1.5 text-[10px] text-[#99AABB]">
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: movieColors[m.title] }} />
              {m.title}
            </span>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-3 py-12">
          <div className="w-6 h-6 border-2 border-[#2c3440] border-t-[#40BCF4] rounded-full animate-spin" />
          <span className="text-sm text-[#99AABB]/60">Chargement des séances…</span>
        </div>
      ) : dates.length === 0 ? (
        <p className="text-center text-sm text-[#99AABB]/50 py-10">Aucune séance trouvée</p>
      ) : (
        <div className={`grid ${gridCols} divide-x divide-[#2c3440]`}>
          {dates.map((date) => {
            const daySessions = byDate[date];
            const isToday = date === new Date().toISOString().slice(0, 10);
            return (
              <div key={date} className="flex flex-col min-w-0">
                {/* Day header */}
                <div className={`px-3 py-3 border-b border-[#2c3440] text-center ${isToday ? "bg-[#40BCF4]/8" : "bg-[#14181C]/30"}`}>
                  <p className="text-xs font-bold uppercase tracking-widest" style={{ color: isToday ? "#40BCF4" : "#99AABB" }}>
                    {fmtWeekday(date)}
                  </p>
                  <p className="text-[11px] text-[#99AABB]/70 mt-0.5">{fmtDayNum(date)}</p>
                  {isToday && <span className="text-[8px] font-bold text-[#40BCF4]/70 uppercase tracking-wider">Aujourd&apos;hui</span>}
                  <p className="text-[9px] text-[#99AABB]/40 mt-1">{daySessions.length} séance{daySessions.length > 1 ? "s" : ""}</p>
                </div>

                {/* Sessions */}
                <div className="p-2 space-y-1.5 flex-1">
                  {daySessions.map((s, i) => {
                    const color = movieColors[s.movieTitle] ?? "#99AABB";
                    const tc    = typeColor(s.type);
                    const inner = (
                      <div className="rounded-lg p-2 transition-opacity hover:opacity-90"
                        style={{ background: `${color}0e`, borderLeft: `2.5px solid ${color}` }}>
                        {/* Time */}
                        <p className="text-[11px] font-bold tabular-nums" style={{ color }}>{fmtTime(s.time)}</p>
                        {/* Movie */}
                        <p className="text-[10px] font-semibold text-[#e8ecf0] leading-tight mt-0.5 line-clamp-1">{s.movieTitle}</p>
                        {/* Cinema */}
                        <p className="text-[9px] text-[#99AABB]/60 leading-tight mt-0.5 line-clamp-1">{s.cinema}</p>
                        {/* Footer */}
                        <div className="flex items-center gap-1 mt-1.5">
                          {s.type && (
                            <span className="text-[8px] font-bold px-1 py-0.5 rounded-sm leading-none"
                              style={{ background: `${tc}20`, color: tc }}>
                              {s.type}
                            </span>
                          )}
                          {s.bookUrl && (
                            <span className="text-[8px] text-[#40BCF4]/60 ml-auto">Réserver →</span>
                          )}
                        </div>
                      </div>
                    );
                    return s.bookUrl
                      ? <a key={i} href={s.bookUrl} target="_blank" rel="noopener noreferrer" className="block">{inner}</a>
                      : <div key={i}>{inner}</div>;
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function CalendarIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>;
}

/* ── Icons ── */
function ChevronIcon({ open }: { open: boolean }) {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}><polyline points="6 9 12 15 18 9"/></svg>;
}

function ClockIcon() {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#99AABB]/40 flex-shrink-0"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;
}
function XSmIcon() {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
}
function Spinner() {
  return <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z"/></svg>;
}
