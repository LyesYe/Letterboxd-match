"use client";

import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "lbreco_username_history";
const MAX_HISTORY = 15;

export function useUsernameHistory() {
  const [history, setHistory] = useState<string[]>([]);

  // Load from localStorage once mounted
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setHistory(JSON.parse(raw));
    } catch {}
  }, []);

  const persist = (next: string[]) => {
    setHistory(next);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
  };

  const addUsernames = useCallback((usernames: string[]) => {
    setHistory((prev) => {
      const merged = [
        ...usernames.filter(Boolean),
        ...prev.filter((h) => !usernames.includes(h)),
      ].slice(0, MAX_HISTORY);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(merged)); } catch {}
      return merged;
    });
  }, []);

  const remove = useCallback((username: string) => {
    setHistory((prev) => {
      const next = prev.filter((h) => h !== username);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  return { history, addUsernames, remove };
}
