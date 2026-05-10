"use client";

import { MatchMode } from "@/types";

interface Props {
  mode: MatchMode;
  onChange: (mode: MatchMode) => void;
  userCount: number;
}

const MODES = [
  {
    key: "union" as MatchMode,
    label: "Union",
    tagline: "Bigger pool",
    description: "Every movie from all watchlists",
    color: "#FF8000",
    icon: UnionIcon,
  },
  {
    key: "intersection" as MatchMode,
    label: "Everyone",
    tagline: "Perfect match",
    description: "Only movies on every watchlist",
    color: "#00E054",
    icon: IntersectionAllIcon,
  },
  {
    key: "partial" as MatchMode,
    label: "Any 2",
    tagline: "Best of both",
    description: "Movies shared by at least 2 people",
    color: "#40BCF4",
    icon: IntersectionTwoIcon,
    minUsers: 3,
  },
];

export default function ModeToggle({ mode, onChange, userCount }: Props) {
  const visible = MODES.filter((m) => !m.minUsers || userCount >= m.minUsers);

  return (
    <div>
      <label className="block text-xs font-semibold tracking-widest uppercase text-[#99AABB] mb-2.5">
        Matching Mode
      </label>
      <div className={`grid gap-2 ${visible.length === 3 ? "grid-cols-3" : "grid-cols-2"}`}>
        {visible.map((m) => {
          const active = mode === m.key;
          const Icon = m.icon;
          return (
            <button
              key={m.key}
              onClick={() => onChange(m.key)}
              className="relative flex flex-col items-center gap-1.5 px-3 py-3 rounded-xl text-center
                transition-all duration-200 select-none outline-none
                focus-visible:ring-2 focus-visible:ring-offset-1"
              style={{
                background: active ? `${m.color}14` : "#14181C",
                border: `1px solid ${active ? m.color + "60" : "#2c3440"}`,
                boxShadow: active ? `0 0 16px ${m.color}18` : "none",
                color: active ? m.color : "#99AABB",
              }}
            >
              {/* Active dot */}
              {active && (
                <span
                  className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full"
                  style={{ background: m.color }}
                />
              )}

              <Icon color={active ? m.color : "#99AABB"} />

              <span className="font-bold text-sm leading-none">{m.label}</span>

              <span
                className="text-[10px] font-semibold tracking-wide uppercase leading-none"
                style={{ color: active ? m.color + "bb" : "#99AABB55" }}
              >
                {m.tagline}
              </span>

              <span
                className="text-[11px] leading-snug mt-0.5"
                style={{ color: active ? "#e8ecf0aa" : "#99AABB66" }}
              >
                {m.description}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ── Icons ── */

function UnionIcon({ color }: { color: string }) {
  return (
    <svg width="28" height="20" viewBox="0 0 28 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* left circle */}
      <circle cx="10" cy="10" r="8" fill={color} fillOpacity="0.15" stroke={color} strokeWidth="1.4" />
      {/* right circle */}
      <circle cx="18" cy="10" r="8" fill={color} fillOpacity="0.15" stroke={color} strokeWidth="1.4" />
      {/* filled overlap */}
      <path
        d="M14 3.2a8 8 0 0 1 0 13.6A8 8 0 0 1 14 3.2z"
        fill={color} fillOpacity="0.3"
      />
    </svg>
  );
}

function IntersectionAllIcon({ color }: { color: string }) {
  return (
    <svg width="28" height="20" viewBox="0 0 28 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* left circle outline */}
      <circle cx="10" cy="10" r="8" fill="none" stroke={color} strokeWidth="1.4" strokeOpacity="0.5" />
      {/* right circle outline */}
      <circle cx="18" cy="10" r="8" fill="none" stroke={color} strokeWidth="1.4" strokeOpacity="0.5" />
      {/* filled overlap only */}
      <path
        d="M14 3.2a8 8 0 0 1 0 13.6A8 8 0 0 1 14 3.2z"
        fill={color} fillOpacity="0.5"
        stroke={color} strokeWidth="1.2"
      />
    </svg>
  );
}

function IntersectionTwoIcon({ color }: { color: string }) {
  return (
    <svg width="32" height="20" viewBox="0 0 32 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* third circle top-center, dimmed */}
      <circle cx="16" cy="5" r="5.5" fill="none" stroke={color} strokeWidth="1.2" strokeOpacity="0.3" strokeDasharray="2 2" />
      {/* left circle */}
      <circle cx="10" cy="13" r="6.5" fill={color} fillOpacity="0.12" stroke={color} strokeWidth="1.4" />
      {/* right circle */}
      <circle cx="22" cy="13" r="6.5" fill={color} fillOpacity="0.12" stroke={color} strokeWidth="1.4" />
      {/* overlap of left+right */}
      <path
        d="M16 7.8a6.5 6.5 0 0 1 0 10.4A6.5 6.5 0 0 1 16 7.8z"
        fill={color} fillOpacity="0.45"
        stroke={color} strokeWidth="1.1"
      />
    </svg>
  );
}
