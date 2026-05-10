import * as cheerio from "cheerio";

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
};

const MAX_PAGES = 8; // ~224 films — covers most casual users

async function fetchWatchedPage(username: string, page: number): Promise<{ slugs: string[]; hasNext: boolean }> {
  const url = page === 1
    ? `https://letterboxd.com/${encodeURIComponent(username)}/films/`
    : `https://letterboxd.com/${encodeURIComponent(username)}/films/page/${page}/`;

  try {
    const res = await fetch(url, { headers: HEADERS });
    if (!res.ok) return { slugs: [], hasNext: false };

    const html = await res.text();
    const $    = cheerio.load(html);
    const slugs: string[] = [];

    $("[data-item-slug]").each((_, el) => {
      const s = $(el).attr("data-item-slug");
      if (s) slugs.push(s);
    });

    return { slugs, hasNext: $("a.next").length > 0 };
  } catch {
    return { slugs: [], hasNext: false };
  }
}

/** Returns the set of Letterboxd film slugs a user has watched (up to MAX_PAGES pages). */
export async function fetchWatchedSlugs(username: string): Promise<Set<string>> {
  const all = new Set<string>();
  for (let page = 1; page <= MAX_PAGES; page++) {
    const { slugs, hasNext } = await fetchWatchedPage(username, page);
    slugs.forEach((s) => all.add(s));
    if (!hasNext) break;
  }
  return all;
}

/** Fetch watched slugs for multiple users in parallel. Returns username → Set<slug>. */
export async function fetchWatchedForUsers(usernames: string[]): Promise<Map<string, Set<string>>> {
  const results = await Promise.all(usernames.map((u) => fetchWatchedSlugs(u)));
  return new Map(usernames.map((u, i) => [u, results[i]]));
}

/** Extract Letterboxd slug from a film URL like https://letterboxd.com/film/motel-destino/ */
export function slugFromUrl(url: string): string {
  return url.match(/\/film\/([^/]+)/)?.[1] ?? "";
}
