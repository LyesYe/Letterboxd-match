import { NextRequest, NextResponse } from "next/server";

const SECRET = process.env.ADMIN_SECRET;

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("secret");
  if (!SECRET || token !== SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Show which Redis-related env vars are present (names only, not values)
  const vars = [
    "KV_REST_API_URL",
    "KV_REST_API_TOKEN",
    "KV_REST_API_READ_ONLY_TOKEN",
    "KV_URL",
    "UPSTASH_REDIS_REST_URL",
    "UPSTASH_REDIS_REST_TOKEN",
    "UPSTASH_URL",
    "UPSTASH_TOKEN",
    "REDIS_URL",
  ];

  const found: Record<string, boolean> = {};
  for (const v of vars) {
    found[v] = !!process.env[v];
  }

  return NextResponse.json({ found });
}
