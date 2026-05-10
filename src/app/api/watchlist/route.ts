import { NextRequest, NextResponse } from "next/server";
import * as cheerio from "cheerio";
import { WatchlistMovie } from "@/types";

const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  "Cache-Control": "no-cache",
};

function watchlistUrl(username: string, page: number) {
  return page === 1
    ? `https://letterboxd.com/${encodeURIComponent(username)}/watchlist/`
    : `https://letterboxd.com/${encodeURIComponent(username)}/watchlist/page/${page}/`;
}

async function fetchPage(
  username: string,
  page: number
): Promise<{ movies: WatchlistMovie[]; hasNext: boolean }> {
  const url = watchlistUrl(username, page);
  const res = await fetch(url, { headers: BROWSER_HEADERS });

  if (!res.ok) {
    if (res.status === 404) throw new Error(`User "${username}" not found on Letterboxd.`);
    if (res.status === 403) throw new Error(`Access denied for "${username}". Their watchlist may be private.`);
    throw new Error(`Failed to load watchlist for "${username}" (HTTP ${res.status}).`);
  }

  const html = await res.text();
  const $ = cheerio.load(html);

  const movies: WatchlistMovie[] = [];

  // Each film is a react-component div with data-item-name="Title (Year)"
  $('[data-item-name]').each((_, el) => {
    const rawName = $(el).attr("data-item-name") ?? "";
    const slug = $(el).attr("data-item-slug") ?? "";
    const link = $(el).attr("data-item-link") ?? "";

    if (!rawName || !slug) return;

    // "Motel Destino (2024)" → title="Motel Destino", year=2024
    const yearMatch = rawName.match(/\s\((\d{4})\)$/);
    const year = yearMatch ? parseInt(yearMatch[1], 10) : null;
    const title = rawName.replace(/\s\(\d{4}\)$/, "").trim();

    movies.push({
      title,
      year,
      letterboxdUrl: link ? `https://letterboxd.com${link}` : "",
    });
  });

  // Check for a "next page" link
  const hasNext = $("a.next").length > 0;

  return { movies, hasNext };
}

export async function GET(req: NextRequest) {
  const username = req.nextUrl.searchParams.get("username")?.trim() ?? "";

  if (!username) {
    return NextResponse.json({ error: "Username is required." }, { status: 400 });
  }
  if (!/^[a-zA-Z0-9_.-]{1,50}$/.test(username)) {
    return NextResponse.json({ error: "Invalid username format." }, { status: 400 });
  }

  try {
    const allMovies: WatchlistMovie[] = [];
    let page = 1;

    // Fetch pages sequentially until no next page (cap at 20 pages = 560 films)
    while (page <= 20) {
      const { movies, hasNext } = await fetchPage(username, page);
      allMovies.push(...movies);
      if (!hasNext) break;
      page++;
    }

    if (allMovies.length === 0) {
      return NextResponse.json(
        { error: `Watchlist for "${username}" is empty or private.` },
        { status: 404 }
      );
    }

    return NextResponse.json({ username, movies: allMovies, count: allMovies.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
