import { NextRequest, NextResponse } from "next/server";
import * as cheerio from "cheerio";
import { WatchlistMovie } from "@/types";

const BROWSER_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  "Cache-Control": "no-cache",
};

// Phrases Letterboxd shows on private or restricted profiles
const PRIVATE_SIGNALS = [
  "this member",
  "is private",
  "private profile",
  "make their account private",
];

function isPrivatePage(html: string): boolean {
  const lower = html.toLowerCase();
  return PRIVATE_SIGNALS.some((s) => lower.includes(s));
}

function watchlistUrl(username: string, page: number) {
  return page === 1
    ? `https://letterboxd.com/${encodeURIComponent(username)}/watchlist/`
    : `https://letterboxd.com/${encodeURIComponent(username)}/watchlist/page/${page}/`;
}

async function fetchPage(username: string, page: number): Promise<{ movies: WatchlistMovie[]; hasNext: boolean; html: string }> {
  const res = await fetch(watchlistUrl(username, page), { headers: BROWSER_HEADERS });

  if (!res.ok) {
    if (res.status === 404) throw Object.assign(new Error(`"${username}" doesn't exist on Letterboxd.`), { code: "not_found" });
    if (res.status === 403) throw Object.assign(new Error(`"${username}"'s profile is private.`), { code: "private" });
    throw Object.assign(new Error(`Failed to load watchlist for "${username}" (HTTP ${res.status}).`), { code: "error" });
  }

  const html = await res.text();
  const $    = cheerio.load(html);
  const movies: WatchlistMovie[] = [];

  $("[data-item-name]").each((_, el) => {
    const rawName = $(el).attr("data-item-name") ?? "";
    const slug    = $(el).attr("data-item-slug") ?? "";
    const link    = $(el).attr("data-item-link") ?? "";
    if (!rawName || !slug) return;
    const yearMatch = rawName.match(/\s\((\d{4})\)$/);
    movies.push({
      title:         rawName.replace(/\s\(\d{4}\)$/, "").trim(),
      year:          yearMatch ? parseInt(yearMatch[1], 10) : null,
      letterboxdUrl: link ? `https://letterboxd.com${link}` : "",
    });
  });

  return { movies, hasNext: $("a.next").length > 0, html };
}

export async function GET(req: NextRequest) {
  const username = req.nextUrl.searchParams.get("username")?.trim() ?? "";

  if (!username)
    return NextResponse.json({ error: "Username is required." }, { status: 400 });
  if (!/^[a-zA-Z0-9_.-]{1,50}$/.test(username))
    return NextResponse.json({ error: "Invalid username format." }, { status: 400 });

  try {
    const allMovies: WatchlistMovie[] = [];
    let firstPageHtml = "";
    let page = 1;

    while (page <= 20) {
      const { movies, hasNext, html } = await fetchPage(username, page);
      if (page === 1) firstPageHtml = html;
      allMovies.push(...movies);
      if (!hasNext) break;
      page++;
    }

    if (allMovies.length === 0) {
      // Distinguish between private and genuinely empty
      if (isPrivatePage(firstPageHtml)) {
        return NextResponse.json(
          { error: `"${username}"'s profile is private.`, status: "private" },
          { status: 403 }
        );
      }
      // Page loaded fine, account exists, watchlist just has no movies
      return NextResponse.json(
        { username, movies: [], count: 0, status: "empty" },
        { status: 200 }
      );
    }

    return NextResponse.json({ username, movies: allMovies, count: allMovies.length, status: "ok" });

  } catch (err) {
    const e = err as Error & { code?: string };
    const code = e.code ?? "error";
    const status = code === "not_found" ? 404 : code === "private" ? 403 : 500;
    return NextResponse.json({ error: e.message, status: code }, { status });
  }
}
