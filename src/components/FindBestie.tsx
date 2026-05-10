"use client";

import { useState } from "react";
import Image from "next/image";
import { FavoriteFilm } from "@/app/api/bestie/route";
import { useUsernameHistory } from "@/hooks/useUsernameHistory";

const TMDB_IMG = "https://image.tmdb.org/t/p";

interface Props { defaultUsername?: string; defaultOpen?: boolean; }

export default function FindBestie({ defaultUsername = "", defaultOpen = false }: Props) {
  const [open, setOpen]             = useState(defaultOpen);
  const [username, setUsername]     = useState(defaultUsername);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState("");
  const [favorites, setFavorites]   = useState<FavoriteFilm[]>([]);
  const [searchUrls, setSearchUrls] = useState<Record<number, string>>({});
  const [minCommon, setMinCommon]   = useState(3);
  const [done, setDone]             = useState(false);
  const [showDrop, setShowDrop]     = useState(false);

  const { history, remove } = useUsernameHistory();
  const sugs = history.filter(
    (h) => h !== username && (username === "" || h.toLowerCase().includes(username.toLowerCase()))
  );

  const handleFind = async () => {
    if (!username.trim()) return;
    setLoading(true); setError(""); setDone(false); setFavorites([]); setSearchUrls({});
    try {
      const res  = await fetch("/api/bestie", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Something went wrong."); return; }
      setFavorites(data.favorites ?? []);
      setSearchUrls(data.searchUrls ?? {});
      setMinCommon(Math.min(3, data.favorites?.length ?? 2));
      setDone(true);
    } catch { setError("Network error."); }
    finally { setLoading(false); }
  };

  const minOptions = favorites.length > 0
    ? Array.from({ length: favorites.length }, (_, i) => i + 1)
    : [1, 2, 3];

  const minLabel = (n: number) => n === favorites.length ? "All films" : `At least ${n}`;
  const searchUrl = searchUrls[minCommon];

  return (
    <div className="mt-8 w-full">
      {!open ? (
        <button onClick={() => setOpen(true)}
          className="w-full flex items-center justify-center gap-2.5 py-3 rounded-xl
            border border-[#2c3440] text-sm font-medium text-[#99AABB]
            hover:border-[#E879F9]/40 hover:text-[#E879F9] hover:bg-[#E879F9]/5 transition-all duration-200">
          <BestieIcon /> Find Your Letterboxd Bestie
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#E879F9]/10 text-[#E879F9]">New</span>
        </button>
      ) : (
        <div className="rounded-2xl border border-[#2c3440] bg-[#1c2228] overflow-hidden">

          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#2c3440]">
            <div className="flex items-center gap-2.5">
              <BestieIcon color="#E879F9" />
              <div>
                <span className="font-semibold text-[#e8ecf0]">Find Your Letterboxd Bestie</span>
                <p className="text-[10px] text-[#99AABB]/60 mt-0.5">Match with people who share your favourite films</p>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="text-[#99AABB]/40 hover:text-[#99AABB] transition-colors">
              <XIcon />
            </button>
          </div>

          <div className="p-5 space-y-4">

            {/* Username input */}
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#99AABB]/50 text-sm pointer-events-none z-10">@</span>
              <input value={username}
                onChange={(e) => { setUsername(e.target.value); setShowDrop(true); }}
                onFocus={() => setShowDrop(true)}
                onBlur={() => setTimeout(() => setShowDrop(false), 150)}
                onKeyDown={(e) => e.key === "Enter" && handleFind()}
                placeholder="your_letterboxd_username"
                autoComplete="off" autoCapitalize="none" spellCheck={false}
                className="w-full bg-[#14181C] border border-[#2c3440] rounded-xl pl-7 pr-3 py-2.5
                  text-sm text-[#e8ecf0] placeholder-[#99AABB]/40
                  focus:outline-none focus:border-[#E879F9]/40 transition-colors"
              />
              {showDrop && sugs.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-[#1c2228] border border-[#2c3440] rounded-xl overflow-hidden shadow-xl">
                  {sugs.slice(0, 5).map((s) => (
                    <div key={s} className="flex items-center group">
                      <button onMouseDown={() => { setUsername(s); setShowDrop(false); }}
                        className="flex-1 flex items-center gap-2 px-3 py-2 text-sm text-[#e8ecf0] hover:bg-[#2c3440]">
                        <ClockIcon /> @{s}
                      </button>
                      <button onMouseDown={() => remove(s)}
                        className="px-3 py-2 text-[#99AABB]/30 hover:text-red-400 opacity-0 group-hover:opacity-100"><XSmIcon /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button onClick={handleFind} disabled={loading || !username.trim()}
              className="w-full py-2.5 rounded-xl font-semibold text-sm
                border border-[#E879F9]/30 text-[#E879F9]
                hover:bg-[#E879F9]/10 hover:border-[#E879F9]/60 active:scale-[0.98]
                disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-150">
              {loading
                ? <span className="flex items-center justify-center gap-2"><Spinner /> Loading favourites…</span>
                : "Load My Favourites"
              }
            </button>

            {error && <p className="text-red-400 text-sm text-center">{error}</p>}

            {/* ── Favourite film poster cards ── */}
            {done && favorites.length > 0 && (
              <div className="space-y-3">
                <p className="text-xs font-semibold tracking-widest uppercase text-[#99AABB]/50">Your Favourite Films</p>
                <div className="grid grid-cols-4 gap-3">
                  {favorites.map((f) => (
                    <a key={f.slug}
                      href={`https://letterboxd.com/film/${f.slug}/`}
                      target="_blank" rel="noopener noreferrer"
                      className="group flex flex-col gap-1.5">
                      <div className="relative rounded-xl overflow-hidden border border-[#2c3440]
                        group-hover:border-[#E879F9]/50 transition-all duration-200"
                        style={{ aspectRatio: "2/3" }}>
                        {f.posterPath
                          ? <Image src={`${TMDB_IMG}/w185${f.posterPath}`} alt={f.title} fill sizes="100px"
                              className="object-cover group-hover:scale-105 transition-transform duration-300" />
                          : <div className="w-full h-full bg-[#14181C] flex items-center justify-center text-2xl">🎬</div>
                        }
                      </div>
                      <p className="text-[10px] text-[#99AABB] line-clamp-2 leading-tight text-center
                        group-hover:text-[#E879F9] transition-colors">
                        {f.title}{f.year ? ` (${f.year})` : ""}
                      </p>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* ── Min overlap + CTA ── */}
            {done && favorites.length > 0 && (
              <div className="space-y-3 pt-1">
                <div className="space-y-2">
                  <p className="text-xs font-semibold tracking-widest uppercase text-[#99AABB]/50">Find people who share</p>
                  <div className="flex gap-2 flex-wrap">
                    {minOptions.map((n) => (
                      <button key={n} onClick={() => setMinCommon(n)}
                        className="px-3 py-1.5 rounded-lg text-sm font-medium border transition-all duration-150"
                        style={{
                          background:  minCommon === n ? "#E879F918" : "#14181C",
                          borderColor: minCommon === n ? "#E879F960" : "#2c3440",
                          color:       minCommon === n ? "#E879F9" : "#99AABB",
                        }}>
                        {minLabel(n)}
                      </button>
                    ))}
                  </div>
                </div>

                {searchUrl && (
                  <a href={searchUrl} target="_blank" rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full py-3 rounded-xl font-semibold text-sm
                      bg-[#E879F9] text-[#14181C] hover:bg-[#d946ef] active:scale-[0.98] transition-all">
                    <BestieIcon color="#14181C" />
                    Find my Letterboxd bestie →
                  </a>
                )}

                <p className="text-[10px] text-[#99AABB]/40 text-center">
                  Opens member search on Letterboxd
                </p>
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  );
}

function BestieIcon({ color = "currentColor" }: { color?: string }) {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
}
function XIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
}
function XSmIcon() {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
}
function ClockIcon() {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#99AABB]/40 flex-shrink-0"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;
}
function Spinner() {
  return <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z"/></svg>;
}
