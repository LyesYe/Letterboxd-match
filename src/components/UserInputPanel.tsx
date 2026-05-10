"use client";

import { useRef, useState, useEffect } from "react";

interface Props {
  usernames: string[];
  onChange: (usernames: string[]) => void;
  history: string[];
  onRemoveHistory: (username: string) => void;
}

export default function UserInputPanel({ usernames, onChange, history, onRemoveHistory }: Props) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const update = (index: number, value: string) => {
    const next = [...usernames];
    next[index] = value;
    onChange(next);
  };

  const addUser = () => {
    onChange([...usernames, ""]);
    setTimeout(() => inputRefs.current[usernames.length]?.focus(), 50);
  };

  const removeUser = (index: number) => {
    if (usernames.length <= 1) return;
    onChange(usernames.filter((_, i) => i !== index));
    setOpenIndex(null);
  };

  const pickSuggestion = (index: number, value: string) => {
    update(index, value);
    setOpenIndex(null);
    inputRefs.current[index]?.blur();
  };

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === "Escape") { setOpenIndex(null); return; }
    if (e.key === "Enter" && index === usernames.length - 1 && openIndex === null) addUser();
  };

  // Close dropdown on outside click
  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpenIndex(null);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={containerRef}>
      <label className="block text-xs font-semibold tracking-widest uppercase text-[#99AABB] mb-3">
        Letterboxd Usernames
      </label>

      <div className="flex flex-col gap-2">
        {usernames.map((username, i) => {
          const suggestions = history.filter(
            (h) =>
              h !== username &&
              !usernames.includes(h) &&
              (username === "" || h.toLowerCase().includes(username.toLowerCase()))
          );
          const isOpen = openIndex === i && suggestions.length > 0;

          return (
            <div key={i} className="flex items-center gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#99AABB]/50 text-sm select-none pointer-events-none z-10">
                  @
                </span>
                <input
                  ref={(el) => { inputRefs.current[i] = el; }}
                  type="text"
                  value={username}
                  onChange={(e) => { update(i, e.target.value); setOpenIndex(i); }}
                  onFocus={() => setOpenIndex(i)}
                  onKeyDown={(e) => handleKeyDown(e, i)}
                  placeholder={i === 0 ? "your_username" : `friend_${i}`}
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  className="w-full bg-[#14181C] border border-[#2c3440] rounded-lg pl-7 pr-3 py-2.5
                    text-sm text-[#e8ecf0] placeholder-[#99AABB]/40
                    focus:outline-none focus:border-[#00E054]/60 focus:ring-1 focus:ring-[#00E054]/20
                    transition-colors duration-150"
                />

                {/* Dropdown */}
                {isOpen && (
                  <div className="absolute left-0 right-0 top-full mt-1 z-50
                    bg-[#1c2228] border border-[#2c3440] rounded-xl overflow-hidden shadow-2xl"
                    style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.5)" }}
                  >
                    <p className="px-3 pt-2 pb-1 text-[10px] font-semibold tracking-widest uppercase text-[#99AABB]/50">
                      Recent
                    </p>
                    {suggestions.map((s) => (
                      <div key={s} className="flex items-center group">
                        <button
                          onMouseDown={(e) => { e.preventDefault(); pickSuggestion(i, s); }}
                          className="flex-1 flex items-center gap-2 px-3 py-2 text-left
                            hover:bg-[#00E054]/8 transition-colors duration-100"
                        >
                          <ClockIcon />
                          <span className="text-sm text-[#e8ecf0]">@{s}</span>
                        </button>
                        <button
                          onMouseDown={(e) => { e.preventDefault(); onRemoveHistory(s); }}
                          aria-label={`Remove ${s} from history`}
                          className="px-3 py-2 text-[#99AABB]/30 hover:text-red-400
                            opacity-0 group-hover:opacity-100 transition-all duration-100"
                        >
                          <XIcon size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {usernames.length > 1 && (
                <button
                  onClick={() => removeUser(i)}
                  aria-label="Remove user"
                  className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg
                    text-[#99AABB]/40 hover:text-red-400 hover:bg-red-400/10
                    transition-colors duration-150"
                >
                  <XIcon size={14} />
                </button>
              )}
            </div>
          );
        })}
      </div>

      <button
        onClick={addUser}
        className="mt-3 flex items-center gap-1.5 text-sm text-[#40BCF4] hover:text-white
          transition-colors duration-150"
      >
        <PlusIcon />
        Add friend
      </button>
    </div>
  );
}

function XIcon({ size = 14 }: { size?: number }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      className="text-[#99AABB]/40 flex-shrink-0">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}
