"use client";

import { useState, useMemo, useCallback } from "react";
import Image from "next/image";
import { PoolMovie, MatchMode, MovieDetails } from "@/types";
import UserBadges, { userColor } from "@/components/UserBadges";

const TMDB_IMG = "https://image.tmdb.org/t/p";

interface Props {
  usernames: string[];
  userCount: number;
  onPick: (movie: MovieDetails) => void;
}

type SortKey = "title" | "year-new" | "year-old" | "rating-high" | "rating-low";
type ViewMode = "grid" | "list";

const ALL_GENRES = [
  "Action","Adventure","Animation","Comedy","Crime","Documentary","Drama",
  "Family","Fantasy","History","Horror","Music","Mystery","Romance",
  "Sci-Fi","Thriller","War","Western",
];

export default function MovieListSection({ usernames, userCount, onPick }: Props) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<MatchMode>("union");
  const [movies, setMovies] = useState<PoolMovie[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadedMode, setLoadedMode] = useState<MatchMode | null>(null);

  // Filter/sort state
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortKey>("rating-high");
  const [view, setView] = useState<ViewMode>("grid");
  const [minRating, setMinRating] = useState(0);
  const [genreFilter, setGenreFilter] = useState<string[]>([]);
  const [yearFrom, setYearFrom] = useState("");
  const [yearTo, setYearTo] = useState("");

  // Picking state
  const [pickingId, setPickingId] = useState<number | null>(null);

  const fetchPool = useCallback(async (m: MatchMode) => {
    setLoading(true);
    setMovies([]);
    try {
      const res = await fetch("/api/pool", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usernames, mode: m }),
      });
      const data = await res.json();
      setMovies(data.movies ?? []);
      setLoadedMode(m);
    } catch {
      setMovies([]);
    } finally {
      setLoading(false);
    }
  }, [usernames]);

  const handleOpen = () => {
    setOpen(true);
    if (loadedMode !== mode) fetchPool(mode);
  };

  const handleModeChange = (m: MatchMode) => {
    setMode(m);
    if (open && loadedMode !== m) fetchPool(m);
  };

  const toggleGenre = (g: string) =>
    setGenreFilter((prev) => prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]);

  const filtered = useMemo(() => {
    let list = [...movies];
    if (search) list = list.filter((m) => m.title.toLowerCase().includes(search.toLowerCase()));
    if (minRating > 0) list = list.filter((m) => m.tmdbRating >= minRating);
    if (genreFilter.length) list = list.filter((m) => genreFilter.every((g) => m.genres.includes(g)));
    if (yearFrom) list = list.filter((m) => m.year != null && m.year >= parseInt(yearFrom));
    if (yearTo) list = list.filter((m) => m.year != null && m.year <= parseInt(yearTo));
    list.sort((a, b) => {
      if (sort === "title") return a.title.localeCompare(b.title);
      if (sort === "year-new") return (b.year ?? 0) - (a.year ?? 0);
      if (sort === "year-old") return (a.year ?? 0) - (b.year ?? 0);
      if (sort === "rating-high") return b.tmdbRating - a.tmdbRating;
      if (sort === "rating-low") return a.tmdbRating - b.tmdbRating;
      return 0;
    });
    return list;
  }, [movies, search, sort, minRating, genreFilter, yearFrom, yearTo]);

  const handlePick = async (m: PoolMovie) => {
    if (!m.tmdbId) return;
    setPickingId(m.tmdbId);
    try {
      const res = await fetch(`/api/movie?id=${m.tmdbId}`);
      const data = await res.json();
      if (data.movie) {
        data.movie.letterboxdUrl = m.letterboxdUrl;
        onPick(data.movie);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    } finally {
      setPickingId(null);
    }
  };

  const modes: { key: MatchMode; label: string; color: string }[] = [
    { key: "union", label: "Union", color: "#FF8000" },
    { key: "intersection", label: "Intersection", color: "#00E054" },
    ...(userCount >= 3 ? [{ key: "partial" as MatchMode, label: "Any 2", color: "#40BCF4" }] : []),
  ];

  return (
    <div className="mt-8 w-full">
      {/* Toggle button */}
      {!open ? (
        <button
          onClick={handleOpen}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl
            border border-[#2c3440] text-[#99AABB] text-sm font-medium
            hover:border-[#99AABB]/40 hover:text-[#e8ecf0] hover:bg-[#1c2228]
            transition-all duration-150"
        >
          <ListIcon />
          Browse full list
          <ChevronDownIcon />
        </button>
      ) : (
        <div className="rounded-2xl border border-[#2c3440] bg-[#1c2228] overflow-hidden">
          {/* Section header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#2c3440]">
            <div className="flex items-center gap-3">
              <ListIcon />
              <span className="font-semibold text-[#e8ecf0]">Full List</span>
              {!loading && movies.length > 0 && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-[#2c3440] text-[#99AABB]">
                  {filtered.length}{filtered.length !== movies.length ? `/${movies.length}` : ""} films
                </span>
              )}
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-[#99AABB]/50 hover:text-[#e8ecf0] transition-colors"
            >
              <ChevronUpIcon />
            </button>
          </div>

          {/* User legend */}
          {usernames.length > 1 && (
            <div className="px-5 py-2.5 border-b border-[#2c3440] flex flex-wrap gap-x-4 gap-y-1">
              {usernames.map((u, i) => (
                <span key={u} className="flex items-center gap-1.5 text-xs text-[#99AABB]">
                  <span
                    className="inline-flex items-center justify-center w-4 h-4 rounded-full text-[9px] font-bold flex-shrink-0"
                    style={{ background: `${userColor(i)}25`, color: userColor(i), border: `1px solid ${userColor(i)}60` }}
                  >
                    {i + 1}
                  </span>
                  @{u}
                </span>
              ))}
            </div>
          )}

          {/* Mode + view controls */}
          <div className="px-5 py-3 border-b border-[#2c3440] flex flex-wrap items-center gap-2">
            <div className="flex rounded-lg border border-[#2c3440] overflow-hidden text-xs font-semibold">
              {modes.map((m) => (
                <button
                  key={m.key}
                  onClick={() => handleModeChange(m.key)}
                  className="px-3 py-1.5 transition-all duration-150"
                  style={{
                    background: mode === m.key ? `${m.color}18` : "transparent",
                    color: mode === m.key ? m.color : "#99AABB",
                    borderRight: "1px solid #2c3440",
                  }}
                >
                  {m.label}
                </button>
              ))}
            </div>

            <div className="ml-auto flex items-center gap-1.5">
              <button
                onClick={() => setView("grid")}
                className={`p-1.5 rounded-lg transition-colors ${view === "grid" ? "text-[#e8ecf0] bg-[#2c3440]" : "text-[#99AABB]/50 hover:text-[#99AABB]"}`}
              ><GridIcon /></button>
              <button
                onClick={() => setView("list")}
                className={`p-1.5 rounded-lg transition-colors ${view === "list" ? "text-[#e8ecf0] bg-[#2c3440]" : "text-[#99AABB]/50 hover:text-[#99AABB]"}`}
              ><RowsIcon /></button>
            </div>
          </div>

          {/* Filters bar */}
          <div className="px-5 py-3 border-b border-[#2c3440] space-y-2.5">
            {/* Search + Sort row */}
            <div className="flex gap-2 flex-wrap">
              <div className="relative flex-1 min-w-40">
                <SearchIcon />
                <input
                  type="text"
                  placeholder="Search titles…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-[#14181C] border border-[#2c3440] rounded-lg pl-8 pr-3 py-2
                    text-sm text-[#e8ecf0] placeholder-[#99AABB]/40
                    focus:outline-none focus:border-[#00E054]/40 transition-colors"
                />
              </div>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortKey)}
                className="bg-[#14181C] border border-[#2c3440] rounded-lg px-3 py-2 text-sm
                  text-[#e8ecf0] focus:outline-none focus:border-[#00E054]/40 cursor-pointer"
              >
                <option value="rating-high">Rating ↓</option>
                <option value="rating-low">Rating ↑</option>
                <option value="year-new">Year (newest)</option>
                <option value="year-old">Year (oldest)</option>
                <option value="title">Title A→Z</option>
              </select>
            </div>

            {/* Year + Rating row */}
            <div className="flex gap-2 flex-wrap items-center">
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-[#99AABB]/60">Year</span>
                <input
                  type="number"
                  placeholder="From"
                  value={yearFrom}
                  onChange={(e) => setYearFrom(e.target.value)}
                  className="w-20 bg-[#14181C] border border-[#2c3440] rounded-lg px-2 py-1.5 text-sm
                    text-[#e8ecf0] placeholder-[#99AABB]/40 focus:outline-none focus:border-[#00E054]/40"
                />
                <span className="text-xs text-[#99AABB]/40">–</span>
                <input
                  type="number"
                  placeholder="To"
                  value={yearTo}
                  onChange={(e) => setYearTo(e.target.value)}
                  className="w-20 bg-[#14181C] border border-[#2c3440] rounded-lg px-2 py-1.5 text-sm
                    text-[#e8ecf0] placeholder-[#99AABB]/40 focus:outline-none focus:border-[#00E054]/40"
                />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-[#99AABB]/60">Min ★</span>
                <select
                  value={minRating}
                  onChange={(e) => setMinRating(Number(e.target.value))}
                  className="bg-[#14181C] border border-[#2c3440] rounded-lg px-2 py-1.5 text-sm
                    text-[#e8ecf0] focus:outline-none focus:border-[#00E054]/40 cursor-pointer"
                >
                  {[0,5,6,6.5,7,7.5,8,8.5,9].map((v) => (
                    <option key={v} value={v}>{v === 0 ? "Any" : `${v}+`}</option>
                  ))}
                </select>
              </div>
              {(search || minRating > 0 || genreFilter.length || yearFrom || yearTo) && (
                <button
                  onClick={() => { setSearch(""); setMinRating(0); setGenreFilter([]); setYearFrom(""); setYearTo(""); }}
                  className="text-xs text-[#99AABB]/50 hover:text-red-400 transition-colors underline"
                >
                  Clear filters
                </button>
              )}
            </div>

            {/* Genre chips */}
            <div className="flex flex-wrap gap-1.5">
              {ALL_GENRES.map((g) => (
                <button
                  key={g}
                  onClick={() => toggleGenre(g)}
                  className="text-xs px-2.5 py-1 rounded-full border transition-all duration-100"
                  style={{
                    background: genreFilter.includes(g) ? "#40BCF418" : "transparent",
                    borderColor: genreFilter.includes(g) ? "#40BCF460" : "#2c3440",
                    color: genreFilter.includes(g) ? "#40BCF4" : "#99AABB",
                  }}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="p-5">
            {loading ? (
              <LoadingState />
            ) : filtered.length === 0 ? (
              <p className="text-center text-[#99AABB]/50 py-8 text-sm">
                {movies.length === 0 ? "No movies found." : "No movies match your filters."}
              </p>
            ) : view === "grid" ? (
              <GridView movies={filtered} usernames={usernames} pickingId={pickingId} onPick={handlePick} />
            ) : (
              <ListView movies={filtered} usernames={usernames} pickingId={pickingId} onPick={handlePick} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Grid view ── */
function GridView({ movies, usernames, pickingId, onPick }: {
  movies: PoolMovie[];
  usernames: string[];
  pickingId: number | null;
  onPick: (m: PoolMovie) => void;
}) {
  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
      {movies.map((m) => {
        const posterUrl = m.posterPath ? `${TMDB_IMG}/w185${m.posterPath}` : null;
        const ratingColor = m.tmdbRating >= 7.5 ? "#00E054" : m.tmdbRating >= 6 ? "#FF8000" : "#99AABB";
        const isPicking = pickingId === m.tmdbId;
        return (
          <button
            key={m.tmdbId ?? m.title}
            onClick={() => onPick(m)}
            disabled={!m.tmdbId || isPicking}
            className="group text-left focus:outline-none disabled:opacity-50"
            title={m.title}
          >
            <div
              className="relative rounded-lg overflow-hidden border border-[#2c3440]
                group-hover:border-[#99AABB]/40 transition-all duration-200"
              style={{ aspectRatio: "2/3" }}
            >
              {posterUrl ? (
                <Image src={posterUrl} alt={m.title} fill sizes="120px" className="object-cover
                  transition-transform duration-300 group-hover:scale-105" />
              ) : (
                <div className="w-full h-full bg-[#14181C] flex items-center justify-center text-2xl">🎬</div>
              )}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-200
                flex items-center justify-center">
                {isPicking ? (
                  <span className="opacity-100 text-white text-xs font-semibold bg-black/70 px-2 py-1 rounded-full">
                    Loading…
                  </span>
                ) : (
                  <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-200
                    text-white text-xs font-semibold bg-black/70 px-2 py-1 rounded-full">
                    Pick this
                  </span>
                )}
              </div>
            </div>
            <div className="mt-1.5 px-0.5">
              <p className="text-[11px] font-semibold text-[#e8ecf0] line-clamp-2 leading-tight group-hover:text-white transition-colors">
                {m.title}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                {m.year && <span className="text-[10px] text-[#99AABB]/60">{m.year}</span>}
                {m.tmdbRating > 0 && (
                  <span className="text-[10px] font-semibold" style={{ color: ratingColor }}>★ {m.tmdbRating.toFixed(1)}</span>
                )}
                <UserBadges usernames={usernames} foundInUsers={m.foundInUsers} watchedByUsers={m.watchedByUsers} />
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

/* ── List view ── */
function ListView({ movies, usernames, pickingId, onPick }: {
  movies: PoolMovie[];
  usernames: string[];
  pickingId: number | null;
  onPick: (m: PoolMovie) => void;
}) {
  return (
    <div className="flex flex-col divide-y divide-[#2c3440]">
      {movies.map((m) => {
        const posterUrl = m.posterPath ? `${TMDB_IMG}/w92${m.posterPath}` : null;
        const ratingColor = m.tmdbRating >= 7.5 ? "#00E054" : m.tmdbRating >= 6 ? "#FF8000" : "#99AABB";
        const isPicking = pickingId === m.tmdbId;
        return (
          <div key={m.tmdbId ?? m.title} className="flex items-center gap-3 py-2.5 group">
            {/* Poster thumbnail */}
            <div className="flex-shrink-0 w-10 rounded overflow-hidden border border-[#2c3440]" style={{ aspectRatio: "2/3" }}>
              {posterUrl ? (
                <Image src={posterUrl} alt={m.title} width={40} height={60} className="object-cover w-full h-full" />
              ) : (
                <div className="w-full h-full bg-[#14181C] flex items-center justify-center text-sm">🎬</div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[#e8ecf0] leading-tight line-clamp-1">{m.title}</p>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                {m.year && <span className="text-xs text-[#99AABB]/60">{m.year}</span>}
                {m.tmdbRating > 0 && (
                  <span className="text-xs font-semibold" style={{ color: ratingColor }}>★ {m.tmdbRating.toFixed(1)}</span>
                )}
                {m.genres.slice(0, 3).map((g) => (
                  <span key={g} className="text-[10px] px-1.5 py-0.5 rounded-full border border-[#2c3440] text-[#99AABB]/70">{g}</span>
                ))}
                <UserBadges usernames={usernames} foundInUsers={m.foundInUsers} watchedByUsers={m.watchedByUsers} />
              </div>
              {m.overview && (
                <p className="text-xs text-[#99AABB]/50 mt-1 line-clamp-2 leading-relaxed">{m.overview}</p>
              )}
            </div>

            {/* Actions */}
            <div className="flex-shrink-0 flex items-center gap-2">
              {m.letterboxdUrl && (
                <a href={m.letterboxdUrl} target="_blank" rel="noopener noreferrer"
                  className="text-[10px] text-[#00E054]/60 hover:text-[#00E054] transition-colors hidden sm:block">
                  LBD →
                </a>
              )}
              <button
                onClick={() => onPick(m)}
                disabled={!m.tmdbId || isPicking}
                className="text-xs px-3 py-1.5 rounded-lg border border-[#2c3440] text-[#99AABB]
                  hover:border-[#40BCF4]/50 hover:text-[#40BCF4] hover:bg-[#40BCF4]/8
                  disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-150"
              >
                {isPicking ? "…" : "Pick"}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── Skeleton loader ── */
function LoadingState() {
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i}>
            <div className="rounded-lg shimmer" style={{ aspectRatio: "2/3" }} />
            <div className="mt-1.5 space-y-1">
              <div className="h-2.5 rounded shimmer w-full" />
              <div className="h-2 rounded shimmer w-2/3" />
            </div>
          </div>
        ))}
      </div>
      <p className="text-center text-xs text-[#99AABB]/40 pt-2">Fetching & enriching movies…</p>
    </div>
  );
}

/* ── Icons ── */
function ListIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/>
      <line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/>
      <line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
    </svg>
  );
}
function ChevronDownIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9"/>
    </svg>
  );
}
function ChevronUpIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="18 15 12 9 6 15"/>
    </svg>
  );
}
function SearchIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#99AABB]/40 pointer-events-none">
      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  );
}
function GridIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
      <rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
    </svg>
  );
}
function RowsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/>
      <line x1="3" y1="18" x2="21" y2="18"/>
    </svg>
  );
}
