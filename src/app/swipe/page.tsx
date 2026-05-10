"use client";

import {
  useState, useEffect, useRef, useCallback,
  forwardRef, useImperativeHandle,
} from "react";
import { useDrag } from "@use-gesture/react";
import Image from "next/image";
import Link from "next/link";
import { PoolMovie, MatchMode } from "@/types";
import { useUsernameHistory } from "@/hooks/useUsernameHistory";
import UserBadges from "@/components/UserBadges";

const TMDB_IMG = "https://image.tmdb.org/t/p";

// Resting transforms for each depth level
const DEPTH = [
  { scale: 1,    y: 0,  opacity: 1    },
  { scale: 0.93, y: 18, opacity: 0.65 },
  { scale: 0.86, y: 36, opacity: 0.4  },
];

type Phase = "setup" | "loading" | "swiping" | "results";

/* ─────────────────────────────────────────
   Page root
───────────────────────────────────────── */
export default function SwipePage() {
  const [phase, setPhase]       = useState<Phase>("setup");
  const [pool, setPool]         = useState<PoolMovie[]>([]);
  const [index, setIndex]       = useState(0);
  const [liked, setLiked]       = useState<PoolMovie[]>([]);
  const [undoStack, setUndoStack] = useState<{ movie: PoolMovie; wasLiked: boolean }[]>([]);
  const [mode, setMode]         = useState<MatchMode>("union");
  const [usernames, setUsernames] = useState(["", ""]);
  const [loadErr, setLoadErr]   = useState("");
  const [mounted, setMounted]   = useState(false);
  useEffect(() => setMounted(true), []);
  const { history: usernameHistory, addUsernames, remove: removeHistory } = useUsernameHistory();

  const filled = usernames.filter((u) => u.trim());

  const startSession = useCallback(async () => {
    if (!filled.length) return;
    addUsernames(filled);
    setPhase("loading");
    setLoadErr("");
    setLiked([]);
    setUndoStack([]);
    setIndex(0);
    try {
      const res  = await fetch("/api/pool", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usernames: filled, mode }),
      });
      const data = await res.json();
      if (!res.ok || !data.movies?.length) {
        setLoadErr(data.error ?? "No movies found."); setPhase("setup"); return;
      }
      setPool(data.movies);
      setPhase("swiping");
    } catch {
      setLoadErr("Network error."); setPhase("setup");
    }
  }, [filled, mode, addUsernames]);

  const handleSwipe = useCallback((dir: "left" | "right") => {
    const movie = pool[index];
    if (!movie) return;
    const wasLiked = dir === "right";
    setUndoStack((s) => [...s, { movie, wasLiked }]);
    if (wasLiked) setLiked((l) => [...l, movie]);
    setIndex((i) => {
      const next = i + 1;
      if (next >= pool.length) setTimeout(() => setPhase("results"), 50);
      return next;
    });
  }, [pool, index]);

  const handleUndo = useCallback(() => {
    const last = undoStack[undoStack.length - 1];
    if (!last) return;
    setUndoStack((s) => s.slice(0, -1));
    if (last.wasLiked) setLiked((l) => l.slice(0, -1));
    setIndex((i) => Math.max(0, i - 1));
  }, [undoStack]);

  return (
    <div className="fixed inset-0 bg-[#0d1014] flex flex-col overflow-hidden select-none">
      {phase === "setup"   && <SetupScreen usernames={usernames} setUsernames={setUsernames} mode={mode} setMode={setMode} onStart={startSession} error={loadErr} usernameHistory={usernameHistory} onRemoveHistory={removeHistory} filledCount={filled.length} mounted={mounted} />}
      {phase === "loading" && <LoadingScreen />}
      {phase === "swiping" && index < pool.length && (
        <SwipeScreen pool={pool} index={index} liked={liked} usernames={filled} onSwipe={handleSwipe} onUndo={handleUndo} canUndo={undoStack.length > 0} />
      )}
      {phase === "results" && <ResultsScreen liked={liked} usernames={filled} onRestart={() => { setPhase("setup"); setPool([]); }} onReshuffle={() => { setIndex(0); setLiked([]); setUndoStack([]); setPhase("swiping"); }} />}
    </div>
  );
}

/* ─────────────────────────────────────────
   Setup
───────────────────────────────────────── */
function SetupScreen({ usernames, setUsernames, mode, setMode, onStart, error, usernameHistory, onRemoveHistory, filledCount, mounted }: {
  usernames: string[]; setUsernames: (u: string[]) => void;
  mode: MatchMode; setMode: (m: MatchMode) => void;
  onStart: () => void; error: string;
  usernameHistory: string[]; onRemoveHistory: (u: string) => void;
  filledCount: number; mounted: boolean;
}) {
  const [openDrop, setOpenDrop] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const fn = (e: MouseEvent) => { if (!containerRef.current?.contains(e.target as Node)) setOpenDrop(null); };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);

  const update  = (i: number, v: string) => { const n = [...usernames]; n[i] = v; setUsernames(n); };
  const add     = () => setUsernames([...usernames, ""]);
  const remove  = (i: number) => setUsernames(usernames.filter((_, j) => j !== i));

  const MODES: { key: MatchMode; label: string; sub: string; color: string }[] = [
    { key: "union",        label: "Union",    sub: "All lists combined",     color: "#FF8000" },
    { key: "intersection", label: "Everyone", sub: "Only on every list",     color: "#00E054" },
    ...(filledCount >= 3 ? [{ key: "partial" as MatchMode, label: "Any 2", sub: "At least 2 lists", color: "#40BCF4" }] : []),
  ];

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 py-10 overflow-y-auto">
      <Link href="/" className="absolute top-5 left-5 flex items-center gap-1.5 text-sm text-[#99AABB]/60 hover:text-[#e8ecf0] transition-colors">
        <ChevronLeft size={16} /> Home
      </Link>

      <div className="w-full max-w-sm space-y-7">
        <div className="text-center">
          <div className="text-5xl mb-3">🃏</div>
          <h1 className="text-3xl font-bold text-[#e8ecf0] tracking-tight">Swipe Mode</h1>
          <p className="text-[#99AABB] text-sm mt-1">Right to like · Left to skip</p>
        </div>

        <div ref={containerRef} className="space-y-2">
          <label className="block text-xs font-semibold tracking-widest uppercase text-[#99AABB]">Usernames</label>
          {usernames.map((u, i) => {
            const sugs = usernameHistory.filter((h) => h !== u && !usernames.includes(h) && (u === "" || h.toLowerCase().includes(u.toLowerCase())));
            return (
              <div key={i} className="flex gap-2 items-center">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#99AABB]/50 text-sm pointer-events-none">@</span>
                  <input value={u} onChange={(e) => { update(i, e.target.value); setOpenDrop(i); }} onFocus={() => setOpenDrop(i)}
                    onKeyDown={(e) => e.key === "Enter" && i === usernames.length - 1 && add()}
                    placeholder={i === 0 ? "your_username" : `friend_${i}`}
                    autoComplete="off" autoCapitalize="none" spellCheck={false}
                    className="w-full bg-[#14181C] border border-[#2c3440] rounded-xl pl-7 pr-3 py-3 text-sm text-[#e8ecf0] placeholder-[#99AABB]/40 focus:outline-none focus:border-[#00E054]/50 transition-colors" />
                  {openDrop === i && sugs.length > 0 && (
                    <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-[#1c2228] border border-[#2c3440] rounded-xl overflow-hidden shadow-xl">
                      {sugs.map((s) => (
                        <div key={s} className="flex items-center group">
                          <button onMouseDown={(e) => { e.preventDefault(); update(i, s); setOpenDrop(null); }}
                            className="flex-1 flex items-center gap-2 px-3 py-2 text-sm text-[#e8ecf0] hover:bg-[#2c3440] transition-colors">
                            <ClockIcon />&nbsp;@{s}
                          </button>
                          <button onMouseDown={(e) => { e.preventDefault(); onRemoveHistory(s); }}
                            className="px-3 py-2 text-[#99AABB]/30 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all">
                            <XIcon size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {usernames.length > 1 && (
                  <button onClick={() => remove(i)} className="w-9 h-9 flex items-center justify-center rounded-xl text-[#99AABB]/40 hover:text-red-400 hover:bg-red-400/10 transition-colors flex-shrink-0"><XIcon size={14} /></button>
                )}
              </div>
            );
          })}
          <button onClick={add} className="flex items-center gap-1.5 text-sm text-[#40BCF4] hover:text-white transition-colors mt-1">
            <PlusIcon /> Add friend
          </button>
        </div>

        {filledCount > 1 && (
          <div className="space-y-2">
            <label className="block text-xs font-semibold tracking-widest uppercase text-[#99AABB]">Mode</label>
            <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${MODES.length}, 1fr)` }}>
              {MODES.map((m) => (
                <button key={m.key} onClick={() => setMode(m.key)}
                  className="flex flex-col items-center gap-1 py-3 px-2 rounded-xl border transition-all duration-150 text-center"
                  style={{ background: mode === m.key ? `${m.color}14` : "#14181C", borderColor: mode === m.key ? `${m.color}60` : "#2c3440", color: mode === m.key ? m.color : "#99AABB", boxShadow: mode === m.key ? `0 0 16px ${m.color}18` : "none" }}>
                  <span className="text-sm font-bold">{m.label}</span>
                  <span className="text-[10px] opacity-70 leading-tight">{m.sub}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {error && <p className="text-red-400 text-sm text-center">{error}</p>}

        <button onClick={onStart} disabled={mounted && filledCount === 0}
          className="w-full py-4 rounded-2xl font-bold text-base text-[#14181C] bg-[#00E054] hover:bg-[#00c949] active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed">
          Start Swiping
        </button>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   Loading
───────────────────────────────────────── */
function LoadingScreen() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-5">
      <div className="relative w-16 h-16">
        <div className="absolute inset-0 rounded-full border-2 border-[#2c3440] border-t-[#00E054] animate-spin" />
        <span className="absolute inset-0 flex items-center justify-center text-2xl">🎬</span>
      </div>
      <p className="text-[#e8ecf0] font-semibold">Loading watchlists…</p>
      <p className="text-[#99AABB] text-sm">Enriching with TMDB data</p>
    </div>
  );
}

/* ─────────────────────────────────────────
   Swipe screen
───────────────────────────────────────── */
function SwipeScreen({ pool, index, liked, usernames, onSwipe, onUndo, canUndo }: {
  pool: PoolMovie[]; index: number; liked: PoolMovie[]; usernames: string[];
  onSwipe: (dir: "left" | "right") => void;
  onUndo: () => void; canUndo: boolean;
}) {
  const cardRef    = useRef<SwipeCardHandle>(null);
  const behind1Ref = useRef<HTMLDivElement>(null);
  const behind2Ref = useRef<HTMLDivElement>(null);
  const progress   = Math.round((index / pool.length) * 100);

  // Keyboard
  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") { e.preventDefault(); cardRef.current?.swipe("right"); }
      if (e.key === "ArrowLeft")                    { e.preventDefault(); cardRef.current?.swipe("left"); }
      if ((e.key === "z") && (e.metaKey || e.ctrlKey)) { e.preventDefault(); onUndo(); }
    };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [onUndo]);

  // Called by SwipeCard to animate behind cards in sync with drag
  const onDragStart = useCallback(() => {
    behind1Ref.current && (behind1Ref.current.style.transition = "none");
    behind2Ref.current && (behind2Ref.current.style.transition = "none");
  }, []);

  const onDragProgress = useCallback((p: number) => {
    if (behind1Ref.current) {
      behind1Ref.current.style.transform = `scale(${DEPTH[1].scale + (DEPTH[0].scale - DEPTH[1].scale) * p}) translateY(${DEPTH[1].y * (1 - p)}px)`;
      behind1Ref.current.style.opacity   = String(DEPTH[1].opacity + (DEPTH[0].opacity - DEPTH[1].opacity) * p);
    }
    if (behind2Ref.current) {
      behind2Ref.current.style.transform = `scale(${DEPTH[2].scale + (DEPTH[1].scale - DEPTH[2].scale) * p}) translateY(${DEPTH[2].y - (DEPTH[2].y - DEPTH[1].y) * p}px)`;
      behind2Ref.current.style.opacity   = String(DEPTH[2].opacity + (DEPTH[1].opacity - DEPTH[2].opacity) * p);
    }
  }, []);

  const onDragSnap = useCallback(() => {
    const ease = "transform 0.45s cubic-bezier(0.34,1.56,0.64,1), opacity 0.4s ease";
    if (behind1Ref.current) {
      behind1Ref.current.style.transition = ease;
      behind1Ref.current.style.transform  = `scale(${DEPTH[1].scale}) translateY(${DEPTH[1].y}px)`;
      behind1Ref.current.style.opacity    = String(DEPTH[1].opacity);
    }
    if (behind2Ref.current) {
      behind2Ref.current.style.transition = ease;
      behind2Ref.current.style.transform  = `scale(${DEPTH[2].scale}) translateY(${DEPTH[2].y}px)`;
      behind2Ref.current.style.opacity    = String(DEPTH[2].opacity);
    }
  }, []);

  const current = pool[index];
  const next1   = pool[index + 1];
  const next2   = pool[index + 2];

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 pt-5 pb-2 flex-shrink-0">
        <Link href="/" className="flex items-center gap-1 text-sm text-[#99AABB]/60 hover:text-[#e8ecf0] transition-colors">
          <ChevronLeft size={16} /> Home
        </Link>
        <div className="flex items-center gap-3">
          <span className="text-sm text-[#99AABB]">{index} <span className="text-[#99AABB]/40">/ {pool.length}</span></span>
          <span className="flex items-center gap-1 text-[#00E054] text-sm font-semibold"><HeartIcon filled /> {liked.length}</span>
        </div>
      </div>

      {/* Progress */}
      <div className="mx-5 mb-3 h-[3px] bg-[#2c3440] rounded-full overflow-hidden flex-shrink-0">
        <div className="h-full bg-[#00E054] rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
      </div>

      {/* Card stack */}
      <div className="flex-1 flex items-center justify-center px-5 pb-2 min-h-0">
        {/* Fixed aspect-ratio container centred in available space */}
        <div className="relative w-full" style={{ maxWidth: 360, height: "min(66vh, 510px)" }}>

          {/* Depth card 2 (furthest back) */}
          {next2 && (
            <div ref={behind2Ref} className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none"
              style={{ transform: `scale(${DEPTH[2].scale}) translateY(${DEPTH[2].y}px)`, opacity: DEPTH[2].opacity, transition: "transform 0.3s ease, opacity 0.3s ease", boxShadow: "0 4px 20px rgba(0,0,0,0.4)", zIndex: 1 }}>
              <CardFace movie={next2} usernames={usernames} />
            </div>
          )}

          {/* Depth card 1 */}
          {next1 && (
            <div ref={behind1Ref} className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none"
              style={{ transform: `scale(${DEPTH[1].scale}) translateY(${DEPTH[1].y}px)`, opacity: DEPTH[1].opacity, transition: "transform 0.3s ease, opacity 0.3s ease", boxShadow: "0 10px 40px rgba(0,0,0,0.55)", zIndex: 2 }}>
              <CardFace movie={next1} usernames={usernames} />
            </div>
          )}

          {/* Top (interactive) card */}
          {current && (
            <SwipeCard
              key={`${current.tmdbId ?? current.title}-${index}`}
              ref={cardRef}
              movie={current}
              usernames={usernames}
              onSwipe={onSwipe}
              onDragStart={onDragStart}
              onDragProgress={onDragProgress}
              onDragSnap={onDragSnap}
            />
          )}
        </div>
      </div>

      {/* Buttons */}
      <div className="flex items-center justify-center gap-5 px-5 pb-6 flex-shrink-0">
        <button onClick={onUndo} disabled={!canUndo} title="Undo (Ctrl+Z)"
          className="w-11 h-11 flex items-center justify-center rounded-full border border-[#2c3440] text-[#99AABB]/50 hover:text-[#99AABB] hover:border-[#99AABB]/40 disabled:opacity-25 transition-all">
          <UndoIcon />
        </button>

        <button onClick={() => cardRef.current?.swipe("left")}
          className="w-[68px] h-[68px] flex items-center justify-center rounded-full border-2 border-red-500/30 text-red-400 hover:bg-red-500/10 hover:border-red-400/60 active:scale-90 transition-all duration-150"
          style={{ boxShadow: "0 4px 24px rgba(255,80,80,0.12)" }}>
          <XLargeIcon />
        </button>

        <button onClick={() => cardRef.current?.swipe("right")}
          className="w-[68px] h-[68px] flex items-center justify-center rounded-full border-2 border-[#00E054]/30 text-[#00E054] hover:bg-[#00E054]/10 hover:border-[#00E054]/60 active:scale-90 transition-all duration-150"
          style={{ boxShadow: "0 4px 24px rgba(0,224,84,0.12)" }}>
          <HeartLargeIcon />
        </button>

        <button onClick={() => onSwipe("left")} title="Skip remaining"
          className="w-11 h-11 flex items-center justify-center rounded-full border border-[#2c3440] text-[#99AABB]/50 hover:text-[#99AABB] hover:border-[#99AABB]/40 transition-all">
          <SkipIcon />
        </button>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   Card face (poster fills card, info overlaid)
───────────────────────────────────────── */
function CardFace({ movie, usernames }: { movie: PoolMovie; usernames: string[] }) {
  const ratingColor = movie.tmdbRating >= 7.5 ? "#00E054" : movie.tmdbRating >= 6 ? "#FF8000" : "#99AABB";
  const posterUrl   = movie.posterPath ? `${TMDB_IMG}/w500${movie.posterPath}` : null;
  return (
    <div className="absolute inset-0 bg-[#1c2228] rounded-2xl overflow-hidden">
      {/* Poster fills card */}
      {posterUrl
        ? <Image src={posterUrl} alt={movie.title} fill className="object-cover" sizes="360px" priority />
        : <div className="absolute inset-0 bg-[#14181C] flex items-center justify-center text-7xl">🎬</div>
      }

      {/* Gradient: transparent top → solid dark bottom */}
      <div className="absolute inset-0 rounded-2xl" style={{
        background: "linear-gradient(to bottom, rgba(0,0,0,0.05) 30%, rgba(10,13,16,0.6) 58%, rgba(10,13,16,0.93) 78%, #0a0d10 100%)"
      }} />

      {/* Info overlay at bottom */}
      <div className="absolute bottom-0 left-0 right-0 p-5 z-10">
        <h2 className="text-xl font-bold text-white leading-tight line-clamp-2 drop-shadow-lg">{movie.title}</h2>

        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 mt-1.5">
          {movie.year && <span className="text-sm text-[#e8ecf0]/80">{movie.year}</span>}
          {movie.tmdbRating > 0 && (
            <span className="text-sm font-bold drop-shadow" style={{ color: ratingColor }}>★ {movie.tmdbRating.toFixed(1)}</span>
          )}
          {movie.genres.slice(0, 2).map((g) => (
            <span key={g} className="text-[11px] px-2 py-0.5 rounded-full bg-white/10 text-white/70 backdrop-blur-sm">{g}</span>
          ))}
        </div>

        {movie.overview && (
          <p className="text-xs text-white/60 mt-2 leading-relaxed line-clamp-2">{movie.overview}</p>
        )}

        {usernames.length > 1 && (
          <div className="mt-2">
            <UserBadges
              usernames={usernames}
              foundInUsers={movie.foundInUsers ?? []}
              watchedByUsers={movie.watchedByUsers ?? []}
              size="md"
            />
          </div>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   Draggable top card
───────────────────────────────────────── */
interface SwipeCardHandle { swipe: (dir: "left" | "right") => void; }
interface SwipeCardProps {
  movie: PoolMovie; usernames: string[];
  onSwipe: (dir: "left" | "right") => void;
  onDragStart: () => void;
  onDragProgress: (p: number) => void;
  onDragSnap: () => void;
}

const SwipeCard = forwardRef<SwipeCardHandle, SwipeCardProps>(
  ({ movie, usernames, onSwipe, onDragStart, onDragProgress, onDragSnap }, ref) => {
    const wrapRef = useRef<HTMLDivElement>(null);
    const likeRef = useRef<HTMLDivElement>(null);
    const skipRef = useRef<HTMLDivElement>(null);
    const flying  = useRef(false);

    const doFly = useCallback((dir: "left" | "right") => {
      if (flying.current) return;
      flying.current = true;
      const el = wrapRef.current; if (!el) return;
      const tx = dir === "right" ? window.innerWidth + 400 : -(window.innerWidth + 400);
      el.style.transition = "transform 0.38s ease-out";
      el.style.transform  = `translate(${tx}px, 60px) rotate(${dir === "right" ? 28 : -28}deg)`;
      if (likeRef.current) likeRef.current.style.opacity = dir === "right" ? "1" : "0";
      if (skipRef.current) skipRef.current.style.opacity = dir === "left"  ? "1" : "0";
      setTimeout(() => { flying.current = false; onSwipe(dir); }, 380);
    }, [onSwipe]);

    const doSnap = useCallback(() => {
      const el = wrapRef.current; if (!el) return;
      el.style.transition = "transform 0.5s cubic-bezier(0.34,1.56,0.64,1)";
      el.style.transform  = "translate(0px,0px) rotate(0deg)";
      if (likeRef.current) likeRef.current.style.opacity = "0";
      if (skipRef.current) skipRef.current.style.opacity = "0";
      onDragSnap();
    }, [onDragSnap]);

    useImperativeHandle(ref, () => ({ swipe: doFly }));

    const bind = useDrag(
      ({ first, active, last, movement: [mx, my], velocity: [vx], direction: [dx] }) => {
        if (flying.current) return;
        const el = wrapRef.current; if (!el) return;

        if (first) {
          el.style.transition = "none";
          onDragStart();
        }

        if (active) {
          const rot = (mx / 300) * 20;          // ±20° over 300px drag
          el.style.transform = `translate(${mx}px,${my}px) rotate(${rot}deg)`;
          const p = Math.min(Math.abs(mx) / 80, 1);
          if (likeRef.current) likeRef.current.style.opacity = mx >  20 ? String(p) : "0";
          if (skipRef.current) skipRef.current.style.opacity = mx < -20 ? String(p) : "0";
          onDragProgress(p);
        }

        if (last) {
          // Trigger swipe on velocity flick OR distance threshold
          if (vx > 0.15 || Math.abs(mx) > 80) {
            doFly(dx > 0 ? "right" : "left");
          } else {
            doSnap();
          }
        }
      },
      {
        filterTaps: true,
        pointer: { touch: true },
      }
    );

    return (
      <div
        ref={wrapRef}
        {...bind()}
        className="absolute inset-0 rounded-2xl overflow-hidden cursor-grab active:cursor-grabbing card-promote"
        style={{ touchAction: "none", willChange: "transform", zIndex: 3, boxShadow: "0 24px 64px rgba(0,0,0,0.75)" }}
      >
        <CardFace movie={movie} usernames={usernames} />

        {/* LIKE stamp */}
        <div ref={likeRef} className="absolute inset-0 pointer-events-none z-20 flex items-start justify-end pt-10 pr-6"
          style={{ opacity: 0, background: "linear-gradient(135deg, transparent 45%, rgba(0,224,84,0.18))" }}>
          <span className="font-black text-[#00E054] text-3xl border-[3px] border-[#00E054] px-4 py-1.5 rounded-xl rotate-[-20deg] tracking-widest"
            style={{ textShadow: "0 0 20px rgba(0,224,84,0.7)" }}>
            LIKE
          </span>
        </div>

        {/* SKIP stamp */}
        <div ref={skipRef} className="absolute inset-0 pointer-events-none z-20 flex items-start justify-start pt-10 pl-6"
          style={{ opacity: 0, background: "linear-gradient(225deg, transparent 45%, rgba(255,70,70,0.18))" }}>
          <span className="font-black text-red-400 text-3xl border-[3px] border-red-400 px-4 py-1.5 rounded-xl rotate-[20deg] tracking-widest"
            style={{ textShadow: "0 0 20px rgba(255,70,70,0.7)" }}>
            SKIP
          </span>
        </div>
      </div>
    );
  }
);
SwipeCard.displayName = "SwipeCard";

/* ─────────────────────────────────────────
   Results
───────────────────────────────────────── */
function ResultsScreen({ liked, usernames, onRestart, onReshuffle }: {
  liked: PoolMovie[]; usernames: string[];
  onRestart: () => void; onReshuffle: () => void;
}) {
  const [pick, setPick] = useState<PoolMovie | null>(null);
  const pickRandom = () => liked.length && setPick(liked[Math.floor(Math.random() * liked.length)]);
  const rc = (m: PoolMovie) => m.tmdbRating >= 7.5 ? "#00E054" : m.tmdbRating >= 6 ? "#FF8000" : "#99AABB";

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex-shrink-0 flex items-center justify-between px-5 pt-5 pb-3">
        <button onClick={onRestart} className="flex items-center gap-1 text-sm text-[#99AABB]/60 hover:text-[#e8ecf0] transition-colors">
          <ChevronLeft size={16} /> New session
        </button>
        <h2 className="text-base font-semibold text-[#e8ecf0]">{liked.length === 0 ? "Nothing liked" : `${liked.length} liked`}</h2>
        <div className="w-24" />
      </div>

      {liked.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-5 px-6 text-center">
          <span className="text-6xl">😶</span>
          <p className="text-[#e8ecf0] font-semibold text-lg">Nothing liked</p>
          <p className="text-[#99AABB] text-sm">Swipe right on movies you&apos;d watch</p>
          <button onClick={onReshuffle} className="mt-2 px-6 py-3 rounded-xl border border-[#2c3440] text-[#99AABB] hover:text-[#e8ecf0] hover:border-[#99AABB]/40 transition-all">Swipe again</button>
        </div>
      ) : (
        <>
          {pick && (
            <div className="flex-shrink-0 mx-5 mb-3 rounded-2xl border border-[#2c3440] bg-[#1c2228] p-4 flex gap-4 fade-in-up">
              {pick.posterPath && (
                <div className="relative w-14 rounded-lg overflow-hidden flex-shrink-0 border border-[#2c3440]" style={{ aspectRatio: "2/3" }}>
                  <Image src={`${TMDB_IMG}/w185${pick.posterPath}`} alt={pick.title} fill className="object-cover" sizes="56px" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-semibold tracking-widest uppercase text-[#00E054] mb-0.5">Tonight&apos;s Pick ✨</p>
                <p className="font-bold text-[#e8ecf0] leading-tight line-clamp-2">{pick.title}</p>
                <div className="flex items-center gap-2 mt-1">
                  {pick.year && <span className="text-xs text-[#99AABB]">{pick.year}</span>}
                  {pick.tmdbRating > 0 && <span className="text-xs font-bold" style={{ color: rc(pick) }}>★ {pick.tmdbRating.toFixed(1)}</span>}
                </div>
                {pick.letterboxdUrl && (
                  <a href={pick.letterboxdUrl} target="_blank" rel="noopener noreferrer" className="inline-block mt-1 text-[10px] text-[#00E054]/70 hover:text-[#00E054] transition-colors">View on Letterboxd →</a>
                )}
              </div>
              <button onClick={() => setPick(null)} className="text-[#99AABB]/40 hover:text-[#99AABB] transition-colors self-start flex-shrink-0"><XIcon size={14} /></button>
            </div>
          )}

          <div className="flex-shrink-0 flex gap-3 px-5 mb-4">
            <button onClick={pickRandom} className="flex-1 py-3 rounded-xl font-semibold text-sm bg-[#00E054] text-[#14181C] hover:bg-[#00c949] active:scale-[0.98] transition-all">
              🎲 Pick one for tonight
            </button>
            <button onClick={onReshuffle} className="px-4 py-3 rounded-xl border border-[#2c3440] text-sm font-semibold text-[#99AABB] hover:text-[#e8ecf0] hover:border-[#99AABB]/40 transition-all">
              Redo
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-5 pb-6">
            <p className="text-xs font-semibold tracking-widest uppercase text-[#99AABB]/50 mb-3">Your Liked Movies</p>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
              {liked.map((m, i) => {
                const isPick = pick === m;
                return (
                  <button key={m.tmdbId ?? i} onClick={() => setPick(m)}
                    className="group text-left pop-in" style={{ animationDelay: `${i * 25}ms`, animationFillMode: "both" }}>
                    <div className="relative rounded-xl overflow-hidden border transition-all duration-200"
                      style={{ aspectRatio: "2/3", borderColor: isPick ? "#00E054" : "#2c3440", boxShadow: isPick ? "0 0 16px rgba(0,224,84,0.35)" : "none" }}>
                      {m.posterPath
                        ? <Image src={`${TMDB_IMG}/w185${m.posterPath}`} alt={m.title} fill sizes="120px" className="object-cover group-hover:scale-105 transition-transform duration-300" />
                        : <div className="w-full h-full bg-[#14181C] flex items-center justify-center text-2xl">🎬</div>
                      }
                      {isPick && <div className="absolute inset-0 bg-[#00E054]/10 flex items-center justify-center"><span className="text-xl">✨</span></div>}
                    </div>
                    <div className="mt-1.5 px-0.5">
                      <p className="text-[11px] font-semibold text-[#e8ecf0] line-clamp-2 leading-tight">{m.title}</p>
                      <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                        {m.year && <span className="text-[10px] text-[#99AABB]/60">{m.year}</span>}
                        {m.tmdbRating > 0 && <span className="text-[10px] font-semibold" style={{ color: rc(m) }}>★ {m.tmdbRating.toFixed(1)}</span>}
                        {usernames.length > 1 && (
                          <UserBadges usernames={usernames} foundInUsers={m.foundInUsers ?? []} watchedByUsers={m.watchedByUsers ?? []} />
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* ─── Icons ─── */
function ChevronLeft({ size = 14 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>;
}
function XIcon({ size = 14 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
}
function PlusIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
}
function ClockIcon() {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#99AABB]/40 flex-shrink-0"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;
}
function HeartIcon({ filled = false }: { filled?: boolean }) {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>;
}
function HeartLargeIcon() {
  return <svg width="30" height="30" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>;
}
function XLargeIcon() {
  return <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
}
function UndoIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 14 4 9 9 4"/><path d="M20 20v-7a4 4 0 0 0-4-4H4"/></svg>;
}
function SkipIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 19 22 12 13 5 13 19"/><polygon points="2 19 11 12 2 5 2 19"/></svg>;
}
