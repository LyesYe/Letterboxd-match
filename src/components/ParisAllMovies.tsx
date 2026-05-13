"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import CinemaSessionModal, { CinemaMovie } from "@/components/CinemaSessionModal";

/* ─────────────────── types ─────────────────── */
interface AllMovie {
  hasToday:  boolean;
  pciId:     number;
  title:     string;
  year:      string;
  duration:  string;
  director:  string;
  copies:    number;
  lbSlug:    string;
  lbUrl:     string;
  pciUrl:    string;
  posterUrl: string;
}

type SortKey =
  | "default"
  | "copies"
  | "alpha"
  | "alpha-desc"
  | "year-new"
  | "year-old"
  | "dur-short"
  | "dur-long";

type DurFilter = "all" | "court" | "standard" | "long" | "epique";
type ViewMode  = "grid" | "list";

/* ─────────────────── helpers ─────────────────── */
function parseDuration(dur: string): number {
  if (!dur) return 0;
  const hm = dur.match(/(\d+)h(?:(\d+))?/);
  if (hm) return parseInt(hm[1]) * 60 + (parseInt(hm[2] ?? "0") || 0);
  const m = dur.match(/(\d+)\s*min/i);
  if (m) return parseInt(m[1]);
  return 0;
}

function parseYear(y: string): number {
  const n = parseInt(y);
  return isNaN(n) ? 0 : n;
}

function matchesDur(dur: string, filter: DurFilter): boolean {
  if (filter === "all") return true;
  const mins = parseDuration(dur);
  if (mins === 0) return false; // unknown duration → hide when a duration filter is active
  if (filter === "court")    return mins < 90;
  if (filter === "standard") return mins >= 90  && mins < 120;
  if (filter === "long")     return mins >= 120 && mins < 150;
  if (filter === "epique")   return mins >= 150;
  return true;
}

const SORT_OPTIONS: { key: SortKey; label: string; icon: string }[] = [
  { key: "default",    label: "Par défaut",     icon: "⭐" },
  { key: "copies",     label: "Plus de cinémas", icon: "🏛" },
  { key: "alpha",      label: "A → Z",           icon: "🔤" },
  { key: "alpha-desc", label: "Z → A",           icon: "🔤" },
  { key: "year-new",   label: "Plus récent",     icon: "📅" },
  { key: "year-old",   label: "Plus ancien",     icon: "📅" },
  { key: "dur-short",  label: "Plus court",      icon: "⏱" },
  { key: "dur-long",   label: "Plus long",       icon: "⏱" },
];

const DUR_LABELS: Record<DurFilter, string> = {
  all:      "Toutes durées",
  court:    "Court  < 1h30",
  standard: "Standard  1h30–2h",
  long:     "Long  2h–2h30",
  epique:   "Épique  > 2h30",
};

const PAGE_SIZE = 60;

/* ─────────────────── main component ─────────────────── */
export default function ParisAllMovies() {
  /* ── data ── */
  const [allMovies, setAllMovies] = useState<AllMovie[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState("");

  /* ── filters ── */
  const [ugcOnly,    setUgcOnly]    = useState(false);
  const [todayOnly,  setTodayOnly]  = useState(false);
  const [search,     setSearch]     = useState("");
  const [sortKey,    setSortKey]    = useState<SortKey>("default");
  const [durFilter,  setDurFilter]  = useState<DurFilter>("all");
  const [viewMode,   setViewMode]   = useState<ViewMode>("grid");
  const [showSort,   setShowSort]   = useState(false);
  const [visible,    setVisible]    = useState(PAGE_SIZE);

  /* ── modal ── */
  const [modalMovie, setModalMovie] = useState<AllMovie | null>(null);

  const sortRef = useRef<HTMLDivElement>(null);

  /* close sort dropdown on outside click */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) setShowSort(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  /* ── fetch ── */
  const load = useCallback(async (ugc: boolean) => {
    setLoading(true); setError(""); setVisible(PAGE_SIZE);
    try {
      const res  = await fetch("/api/paris-cinema", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usernames: [], selcard: ugc ? "ugc" : "all" }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Erreur réseau."); return; }
      setAllMovies(data.allMovies ?? []);
    } catch { setError("Network error."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(false); }, [load]);

  /* ── derived stats ── */
  const todayCount = useMemo(() => allMovies.filter((m) => m.hasToday).length, [allMovies]);

  /* ── filter + sort (client-side) ── */
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = allMovies.filter((m) => {
      if (todayOnly && !m.hasToday) return false;
      if (!matchesDur(m.duration, durFilter)) return false;
      if (q && !m.title.toLowerCase().includes(q) && !m.director.toLowerCase().includes(q)) return false;
      return true;
    });

    list = [...list].sort((a, b) => {
      switch (sortKey) {
        case "copies":     return b.copies - a.copies;
        case "alpha":      return a.title.localeCompare(b.title, "fr");
        case "alpha-desc": return b.title.localeCompare(a.title, "fr");
        case "year-new":   return parseYear(b.year) - parseYear(a.year);
        case "year-old":   return parseYear(a.year) - parseYear(b.year);
        case "dur-short":  return parseDuration(a.duration) - parseDuration(b.duration);
        case "dur-long":   return parseDuration(b.duration) - parseDuration(a.duration);
        default: {
          const todayScore = (m: AllMovie) => (m.hasToday ? 1_000_000 : 0) + m.copies;
          return todayScore(b) - todayScore(a);
        }
      }
    });

    return list;
  }, [allMovies, search, sortKey, durFilter, todayOnly]);

  const displayed = filtered.slice(0, visible);

  /* ── active filter count ── */
  const activeFilters =
    (ugcOnly ? 1 : 0) +
    (todayOnly ? 1 : 0) +
    (durFilter !== "all" ? 1 : 0) +
    (search.trim() ? 1 : 0) +
    (sortKey !== "default" ? 1 : 0);

  const clearAll = () => {
    setSearch(""); setSortKey("default"); setDurFilter("all"); setTodayOnly(false);
  };

  /* ── random film ── */
  const pickRandom = () => {
    if (!filtered.length) return;
    setModalMovie(filtered[Math.floor(Math.random() * filtered.length)]);
  };

  /* ────────────────── render ────────────────── */
  return (
    <div className="w-full space-y-0">

      {/* ── Sticky toolbar ── */}
      <div className="sticky top-14 z-40 bg-[#0d1117]/90 backdrop-blur-md border-b border-[#2c3440]/60 pb-3 pt-3 mb-4">

        {/* Row 1 — search + sort + view toggle */}
        <div className="flex gap-2 items-center mb-2.5">
          {/* Search */}
          <div className="relative flex-1">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-[#99AABB]/40 pointer-events-none" />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setVisible(PAGE_SIZE); }}
              placeholder="Rechercher un film ou réalisateur…"
              autoCapitalize="none" autoComplete="off" spellCheck={false}
              className="w-full bg-[#1c2228] border border-[#2c3440] rounded-xl pl-9 pr-3 py-2.5
                text-sm text-[#e8ecf0] placeholder-[#99AABB]/35
                focus:outline-none focus:border-[#F59E0B]/50 transition-colors"
            />
            {search && (
              <button onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#99AABB]/40 hover:text-[#99AABB]">
                <XSmIcon />
              </button>
            )}
          </div>

          {/* Sort dropdown */}
          <div className="relative flex-shrink-0" ref={sortRef}>
            <button onClick={() => setShowSort((v) => !v)}
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all"
              style={{
                background:   sortKey !== "default" ? "#F59E0B18" : "#1c2228",
                borderColor:  sortKey !== "default" ? "#F59E0B60" : "#2c3440",
                color:        sortKey !== "default" ? "#F59E0B"   : "#99AABB",
              }}>
              <SortIcon />
              <span className="hidden sm:inline">
                {sortKey === "default" ? "Trier" : SORT_OPTIONS.find((o) => o.key === sortKey)?.label}
              </span>
              <ChevronDownIcon open={showSort} />
            </button>
            {showSort && (
              <div className="absolute right-0 top-full mt-1.5 z-50 w-56 bg-[#1c2228] border border-[#2c3440] rounded-xl overflow-hidden shadow-2xl">
                {SORT_OPTIONS.map((o) => (
                  <button key={o.key}
                    onClick={() => { setSortKey(o.key); setShowSort(false); setVisible(PAGE_SIZE); }}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-left transition-colors hover:bg-[#2c3440]"
                    style={{ color: sortKey === o.key ? "#F59E0B" : "#99AABB" }}>
                    <span>{o.icon}</span>
                    {o.label}
                    {sortKey === o.key && <CheckIcon className="ml-auto" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* View toggle */}
          <div className="flex-shrink-0 flex border border-[#2c3440] rounded-xl overflow-hidden">
            <button onClick={() => setViewMode("grid")}
              className="px-3 py-2.5 transition-all"
              style={{ background: viewMode === "grid" ? "#F59E0B22" : "#1c2228", color: viewMode === "grid" ? "#F59E0B" : "#99AABB" }}>
              <GridIcon />
            </button>
            <button onClick={() => setViewMode("list")}
              className="px-3 py-2.5 border-l border-[#2c3440] transition-all"
              style={{ background: viewMode === "list" ? "#F59E0B22" : "#1c2228", color: viewMode === "list" ? "#F59E0B" : "#99AABB" }}>
              <ListIcon />
            </button>
          </div>
        </div>

        {/* Row 2 — filter pills */}
        <div className="flex flex-wrap gap-2 items-center">
          {/* Today only */}
          <FilterPill
            active={todayOnly}
            color="#EF4444"
            onClick={() => { setTodayOnly((v) => !v); setVisible(PAGE_SIZE); }}>
            <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
            Aujourd&apos;hui
          </FilterPill>

          {/* Duration pills */}
          {(["court","standard","long","epique"] as DurFilter[]).map((d) => (
            <FilterPill key={d}
              active={durFilter === d}
              color="#F59E0B"
              onClick={() => { setDurFilter(durFilter === d ? "all" : d); setVisible(PAGE_SIZE); }}>
              {d === "court"    && "⏱ Court < 1h30"}
              {d === "standard" && "⏱ Standard 1h30–2h"}
              {d === "long"     && "⏱ Long 2h–2h30"}
              {d === "epique"   && "⏱ Épique > 2h30"}
            </FilterPill>
          ))}

          {/* UGC */}
          <FilterPill
            active={ugcOnly}
            color="#40BCF4"
            onClick={() => {
              const next = !ugcOnly;
              setUgcOnly(next);
              load(next);
            }}>
            🎟 UGC Illimité
          </FilterPill>

          {/* Clear all */}
          {activeFilters > 0 && (
            <button onClick={clearAll}
              className="flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-semibold
                text-red-400/70 hover:text-red-400 border border-red-500/20 hover:border-red-500/40
                transition-all">
              <XSmIcon /> Réinitialiser ({activeFilters})
            </button>
          )}
        </div>
      </div>

      {/* ── Stats bar ── */}
      {!loading && !error && (
        <div className="flex items-center justify-between mb-4 px-0.5">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm text-[#99AABB]/70">
              <span className="font-bold text-[#e8ecf0]">{filtered.length}</span>
              {filtered.length !== allMovies.length && (
                <span className="text-[#99AABB]/50"> / {allMovies.length}</span>
              )}{" "}
              film{filtered.length !== 1 ? "s" : ""}
            </span>
            {todayCount > 0 && !todayOnly && (
              <span className="flex items-center gap-1 text-xs text-red-400/80">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                {todayCount} aujourd&apos;hui
              </span>
            )}
            {durFilter !== "all" && (
              <span className="text-xs text-[#F59E0B]/70">{DUR_LABELS[durFilter]}</span>
            )}
          </div>
          <button onClick={pickRandom}
            disabled={!filtered.length}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold
              border border-[#2c3440] text-[#99AABB] hover:text-[#F59E0B] hover:border-[#F59E0B]/40
              transition-all disabled:opacity-30 disabled:cursor-not-allowed">
            🎲 Au hasard
          </button>
        </div>
      )}

      {/* ── Error ── */}
      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/8 px-5 py-4 text-center">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* ── Loading ── */}
      {loading && (
        <div className="flex flex-col items-center gap-3 py-24">
          <div className="w-9 h-9 border-2 border-[#2c3440] border-t-[#F59E0B] rounded-full animate-spin" />
          <span className="text-sm text-[#99AABB]/60">Chargement des films à l&apos;affiche…</span>
        </div>
      )}

      {/* ── No results ── */}
      {!loading && !error && filtered.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-20 text-center">
          <span className="text-5xl">🔍</span>
          <p className="text-[#e8ecf0] font-semibold">Aucun résultat</p>
          <p className="text-sm text-[#99AABB]/60">Essaie d&apos;autres filtres ou modifie ta recherche.</p>
          <button onClick={clearAll} className="mt-2 text-xs text-[#F59E0B] underline">Réinitialiser les filtres</button>
        </div>
      )}

      {/* ── Grid view ── */}
      {!loading && !error && filtered.length > 0 && viewMode === "grid" && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {displayed.map((m) => (
            <PosterCard key={m.pciId} movie={m} onClick={() => setModalMovie(m)} />
          ))}
        </div>
      )}

      {/* ── List view ── */}
      {!loading && !error && filtered.length > 0 && viewMode === "list" && (
        <div className="space-y-1.5">
          {/* List header */}
          <div className="hidden sm:grid grid-cols-[40px_1fr_120px_80px_80px_80px] gap-3 px-3 pb-1
            text-[10px] font-semibold uppercase tracking-widest text-[#99AABB]/40">
            <span />
            <span>Film</span>
            <span>Réalisateur</span>
            <span>Durée</span>
            <span>Cinémas</span>
            <span />
          </div>
          {displayed.map((m) => (
            <ListRow key={m.pciId} movie={m} onClick={() => setModalMovie(m)} />
          ))}
        </div>
      )}

      {/* ── Load more ── */}
      {!loading && visible < filtered.length && (
        <div className="flex flex-col items-center gap-2 mt-8">
          <p className="text-xs text-[#99AABB]/40">{displayed.length} sur {filtered.length} films affichés</p>
          <button onClick={() => setVisible((v) => v + PAGE_SIZE)}
            className="px-6 py-2.5 rounded-xl border border-[#2c3440] text-sm font-semibold
              text-[#99AABB] hover:text-[#F59E0B] hover:border-[#F59E0B]/40 transition-all">
            Voir plus ({Math.min(PAGE_SIZE, filtered.length - visible)} films)
          </button>
        </div>
      )}

      {/* ── Modal ── */}
      {modalMovie && (
        <CinemaSessionModal
          movie={toModalMovie(modalMovie)}
          selcard={ugcOnly ? "ugc" : "all"}
          onClose={() => setModalMovie(null)}
        />
      )}
    </div>
  );
}

/* ── convert AllMovie to CinemaMovie for the modal ── */
function toModalMovie(m: AllMovie): CinemaMovie {
  return {
    hasToday:  m.hasToday,
    pciId:     m.pciId,
    title:     m.title,
    year:      m.year,
    duration:  m.duration,
    director:  m.director,
    copies:    m.copies,
    lbUrl:     m.lbUrl,
    pciUrl:    m.pciUrl,
    posterUrl: m.posterUrl,
  };
}

/* ─────────────────── Poster card (grid view) ─────────────────── */
function PosterCard({ movie, onClick }: { movie: AllMovie; onClick: () => void }) {
  const [imgError, setImgError] = useState(false);

  return (
    <button onClick={onClick}
      className="rounded-xl border border-[#2c3440] overflow-hidden bg-[#1c2228]
        hover:border-[#F59E0B]/40 transition-colors group text-left w-full">
      {/* Poster */}
      <div className="relative w-full bg-[#14181C]" style={{ aspectRatio: "2/3" }}>
        {!imgError ? (
          <img src={movie.posterUrl} alt={movie.title} loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={() => setImgError(true)} />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-3xl">🎬</span>
          </div>
        )}

        {/* Copies badge */}
        <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-[#F59E0B] text-[#0d1014]">
          {movie.copies} {movie.copies === 1 ? "cinéma" : "cinémas"}
        </div>

        {/* Today badge */}
        {movie.hasToday && (
          <div className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-red-500 text-white"
            style={{ boxShadow: "0 0 8px rgba(239,68,68,0.6)" }}>
            Auj.
          </div>
        )}

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-all flex items-center justify-center">
          <span className="opacity-0 group-hover:opacity-100 transition-opacity text-white text-xs font-semibold
            bg-black/70 px-2.5 py-1 rounded-full">
            Séances →
          </span>
        </div>
      </div>

      {/* Info */}
      <div className="px-2.5 py-2">
        <p className="text-[11px] font-semibold text-[#e8ecf0] leading-tight line-clamp-2">{movie.title}</p>
        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
          {movie.year     && <span className="text-[10px] text-[#99AABB]/60">{movie.year}</span>}
          {movie.duration && <span className="text-[10px] text-[#99AABB]/40">{movie.duration}</span>}
        </div>
        {movie.director && (
          <p className="text-[10px] text-[#99AABB]/40 leading-tight line-clamp-1 mt-0.5">{movie.director}</p>
        )}
      </div>
    </button>
  );
}

/* ─────────────────── List row ─────────────────── */
function ListRow({ movie, onClick }: { movie: AllMovie; onClick: () => void }) {
  const [imgError, setImgError] = useState(false);
  const mins = parseDuration(movie.duration);
  const durColor = mins === 0 ? "#99AABB" : mins < 90 ? "#34D399" : mins < 120 ? "#F59E0B" : mins < 150 ? "#FB923C" : "#F87171";

  return (
    <button onClick={onClick}
      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border border-[#2c3440]
        bg-[#1c2228] hover:border-[#F59E0B]/35 hover:bg-[#F59E0B]/4 transition-all text-left group">

      {/* Mini poster */}
      <div className="flex-shrink-0 w-10 rounded-lg overflow-hidden border border-[#2c3440] bg-[#14181C]"
        style={{ aspectRatio: "2/3" }}>
        {!imgError ? (
          <img src={movie.posterUrl} alt={movie.title} loading="lazy"
            className="w-full h-full object-cover"
            onError={() => setImgError(true)} />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-sm">🎬</span>
          </div>
        )}
      </div>

      {/* Title + meta */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold text-[#e8ecf0] leading-tight line-clamp-1 group-hover:text-[#F59E0B] transition-colors">
            {movie.title}
          </span>
          {movie.hasToday && (
            <span className="flex-shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-red-500/15 text-red-400">
              Aujourd&apos;hui
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          {movie.year     && <span className="text-[11px] text-[#99AABB]/60">{movie.year}</span>}
          {movie.director && <span className="text-[11px] text-[#99AABB]/40 line-clamp-1">{movie.director}</span>}
        </div>
      </div>

      {/* Duration */}
      {movie.duration && (
        <span className="hidden sm:block flex-shrink-0 text-xs font-mono font-semibold tabular-nums"
          style={{ color: durColor }}>
          {movie.duration}
        </span>
      )}

      {/* Copies */}
      <div className="flex-shrink-0 flex items-center gap-1 px-2 py-1 rounded-lg bg-[#F59E0B]/10 border border-[#F59E0B]/20">
        <CinemaIcon />
        <span className="text-[11px] font-bold text-[#F59E0B]">{movie.copies}</span>
      </div>

      {/* Letterboxd link */}
      {movie.lbUrl && (
        <a href={movie.lbUrl} target="_blank" rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="flex-shrink-0 hidden sm:flex items-center justify-center w-7 h-7 rounded-full
            border border-[#00E054]/20 text-[#00E054]/50 hover:text-[#00E054] hover:border-[#00E054]/50
            transition-colors text-[10px] font-bold">
          L
        </a>
      )}

      {/* Chevron */}
      <span className="flex-shrink-0 text-[#99AABB]/25 group-hover:text-[#F59E0B]/60 transition-colors">
        <ChevronRightIcon />
      </span>
    </button>
  );
}

/* ─────────────────── Filter pill ─────────────────── */
function FilterPill({ active, color, onClick, children }: {
  active: boolean;
  color: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button onClick={onClick}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold
        border transition-all whitespace-nowrap"
      style={{
        background:   active ? `${color}18` : "#1c2228",
        borderColor:  active ? `${color}60` : "#2c3440",
        color:        active ? color         : "#99AABB",
      }}>
      {children}
    </button>
  );
}

/* ─────────────────── Icons ─────────────────── */
function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  );
}
function SortIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="21" y1="10" x2="7" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/>
      <line x1="21" y1="14" x2="3" y2="14"/><line x1="21" y1="18" x2="7" y2="18"/>
    </svg>
  );
}
function GridIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
      <rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
    </svg>
  );
}
function ListIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/>
      <line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/>
      <line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
    </svg>
  );
}
function XSmIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  );
}
function ChevronDownIcon({ open }: { open: boolean }) {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
      style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 0.15s" }}>
      <polyline points="6 9 12 15 18 9"/>
    </svg>
  );
}
function ChevronRightIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6"/>
    </svg>
  );
}
function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  );
}
function CinemaIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#F59E0B]">
      <path d="M2 4h20v16H2z"/><path d="M8 4v16"/><path d="M16 4v16"/>
    </svg>
  );
}
