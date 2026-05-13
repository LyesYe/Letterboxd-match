"use client";

import { useState } from "react";
import CinemaSessionModal, { CinemaMovie } from "@/components/CinemaSessionModal";

interface Props {
  lbSlug: string;   // Letterboxd film slug
  className?: string;
}

/** Small "En salle?" button — checks lazily on first click, opens modal if found. */
export default function CinemaButton({ lbSlug, className = "" }: Props) {
  const [state, setState]     = useState<"idle" | "loading" | "found" | "not_found">("idle");
  const [movie, setMovie]     = useState<CinemaMovie | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const handleClick = async () => {
    if (state === "found") { setModalOpen(true); return; }
    if (state === "not_found" || state === "loading") return;

    setState("loading");
    try {
      const res  = await fetch(`/api/paris-cinema/check?slug=${encodeURIComponent(lbSlug)}`);
      const data = await res.json();
      if (data.found) {
        setMovie(data.movie);
        setState("found");
        setModalOpen(true);
      } else {
        setState("not_found");
      }
    } catch {
      setState("not_found");
    }
  };

  const label = {
    idle:      "🎬 En salle ?",
    loading:   "…",
    found:     "🎬 En salle",
    not_found: "Pas en salle",
  }[state];

  const style = {
    idle:      "border-[#2c3440] text-[#99AABB]/60 hover:border-[#40BCF4]/40 hover:text-[#40BCF4]",
    loading:   "border-[#2c3440] text-[#99AABB]/40 cursor-wait",
    found:     "border-[#40BCF4]/50 text-[#40BCF4] bg-[#40BCF4]/8",
    not_found: "border-[#2c3440] text-[#99AABB]/30 cursor-default",
  }[state];

  return (
    <>
      <button
        onClick={handleClick}
        disabled={state === "loading" || state === "not_found"}
        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-[11px] font-medium
          transition-all duration-150 ${style} ${className}`}
      >
        {state === "loading"
          ? <span className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
          : null
        }
        {label}
      </button>

      {modalOpen && movie && (
        <CinemaSessionModal movie={movie} onClose={() => setModalOpen(false)} />
      )}
    </>
  );
}

/** Extract Letterboxd slug from a film URL like https://letterboxd.com/film/some-slug/ */
export function slugFromLetterboxdUrl(url: string): string {
  return url.match(/\/film\/([^/]+)/)?.[1] ?? "";
}
