"use client";

import { useState, useEffect } from "react";
import { Showtime } from "@/app/api/paris-cinema/showtimes/route";

export interface CinemaMovie {
  hasToday?: boolean;
  pciId:     number;
  title:     string;
  year:      string;
  duration:  string;
  director:  string;
  copies:    number;
  lbUrl:     string;
  pciUrl:    string;
  posterUrl: string;
}

interface Props {
  movie:    CinemaMovie;
  selcard?: string;
  onClose:  () => void;
}

export default function CinemaSessionModal({ movie, selcard = "all", onClose }: Props) {
  const [showtimes, setShowtimes] = useState<Showtime[]>([]);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    // pciId = -1 means the film is not playing — skip the fetch immediately
    if (movie.pciId === -1) { setLoading(false); return; }
    fetch(`/api/paris-cinema/showtimes?mov_id=${movie.pciId}&selcard=${selcard}`)
      .then((r) => r.json())
      .then((d) => setShowtimes(d.showtimes ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [movie.pciId, selcard]);

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
      className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", background: "rgba(10,13,16,0.8)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="relative w-full sm:max-w-lg max-h-[92vh] sm:max-h-[85vh] flex flex-col
          bg-[#1c2228] border border-[#2c3440] sm:rounded-2xl rounded-t-2xl overflow-hidden"
        style={{ boxShadow: "0 32px 80px rgba(0,0,0,0.7)" }}
      >
        {/* Header */}
        <div className="flex gap-4 p-4 border-b border-[#2c3440] flex-shrink-0">
          <div className="flex-shrink-0 w-14 rounded-lg overflow-hidden border border-[#2c3440] bg-[#14181C] flex items-center justify-center" style={{ aspectRatio: "2/3" }}>
            {movie.posterUrl
              ? <img src={movie.posterUrl} alt={movie.title} className="w-full h-full object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
              : <span className="text-xl">🎬</span>
            }
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              {movie.pciId === -1 ? (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#2c3440] text-[#99AABB]">
                  Pas en salle cette semaine
                </span>
              ) : (
                <>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#40BCF4]/15 text-[#40BCF4]">
                    🎬 En salle à Paris
                  </span>
                  <span className="text-[10px] text-[#99AABB]/50">{movie.copies} cinéma{movie.copies > 1 ? "s" : ""}</span>
                  {movie.hasToday && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/15 text-red-400">
                      Aujourd&apos;hui
                    </span>
                  )}
                </>
              )}
            </div>
            <h2 className="font-bold text-[#e8ecf0] leading-tight">{movie.title}</h2>
            <div className="flex flex-wrap gap-x-2 mt-0.5">
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
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <span className="text-4xl">🎭</span>
              <p className="text-[#e8ecf0] font-semibold">Pas de séance cette semaine</p>
              <p className="text-sm text-[#99AABB]/60">Ce film n&apos;est pas à l&apos;affiche en ce moment.</p>
              {movie.lbUrl && (
                <a href={movie.lbUrl} target="_blank" rel="noopener noreferrer"
                  className="text-xs text-[#00E054]/70 hover:text-[#00E054] underline transition-colors mt-1">
                  Voir sur Letterboxd ↗
                </a>
              )}
            </div>
          ) : (
            Object.entries(byDate).map(([date, sessions]) => (
              <div key={date}>
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-xs font-bold tracking-widest uppercase text-[#40BCF4] capitalize">
                    {fmtDay(date)}
                  </span>
                  <div className="flex-1 h-px bg-[#2c3440]" />
                  <span className="text-[10px] text-[#99AABB]/40">{sessions.length} séance{sessions.length > 1 ? "s" : ""}</span>
                </div>
                <div className="space-y-2">
                  {sessions.map((s, i) => {
                    const tc = typeColor(s.type);
                    return (
                      <div key={i}
                        className="flex items-center gap-3 p-3 rounded-xl border border-[#2c3440] bg-[#14181C]/60
                          hover:border-[#40BCF4]/20 transition-colors">
                        <div className="flex-shrink-0 text-center min-w-[44px]">
                          <p className="text-base font-bold text-[#e8ecf0] leading-none">{fmtTime(s.date)}</p>
                        </div>
                        <div className="w-px h-8 bg-[#2c3440] flex-shrink-0" />
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
