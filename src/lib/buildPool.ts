import { WatchlistMovie, MatchMode } from "@/types";

export const normalize = (t: string) => t.toLowerCase().replace(/[^a-z0-9]/g, "");

export function buildPool(
  watchlists: WatchlistMovie[][],
  mode: MatchMode
): WatchlistMovie[] {
  if (mode === "intersection" && watchlists.length > 1) {
    const firstSet = new Map(watchlists[0].map((m) => [normalize(m.title), m]));
    for (let i = 1; i < watchlists.length; i++) {
      const others = new Set(watchlists[i].map((m) => normalize(m.title)));
      for (const key of Array.from(firstSet.keys())) {
        if (!others.has(key)) firstSet.delete(key);
      }
    }
    return Array.from(firstSet.values());
  }

  if (mode === "partial" && watchlists.length > 1) {
    const countMap = new Map<string, { movie: WatchlistMovie; count: number }>();
    for (const list of watchlists) {
      for (const movie of list) {
        const key = normalize(movie.title);
        const entry = countMap.get(key);
        if (entry) entry.count++;
        else countMap.set(key, { movie, count: 1 });
      }
    }
    return Array.from(countMap.values()).filter((e) => e.count >= 2).map((e) => e.movie);
  }

  // Union
  const seen = new Map<string, WatchlistMovie>();
  for (const list of watchlists) {
    for (const movie of list) {
      const key = normalize(movie.title);
      if (!seen.has(key)) seen.set(key, movie);
    }
  }
  return Array.from(seen.values());
}

export function buildTitleToUsers(
  usernames: string[],
  watchlists: WatchlistMovie[][]
): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (let i = 0; i < watchlists.length; i++) {
    for (const movie of watchlists[i]) {
      const key = normalize(movie.title);
      const existing = map.get(key);
      if (existing) existing.push(usernames[i]);
      else map.set(key, [usernames[i]]);
    }
  }
  return map;
}
