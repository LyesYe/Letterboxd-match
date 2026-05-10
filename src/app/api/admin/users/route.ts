import { NextRequest, NextResponse } from "next/server";

const SECRET   = process.env.ADMIN_SECRET;
const REDIS_KEY = "pickd:letterboxd_usernames";

function getRedisCredentials() {
  const url =
    process.env.KV_REST_API_URL ||
    process.env.UPSTASH_REDIS_REST_URL;
  const token =
    process.env.KV_REST_API_TOKEN ||
    process.env.UPSTASH_REDIS_REST_TOKEN;
  return { url, token };
}

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("secret");
  if (!SECRET || token !== SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { url, auth } = (() => {
    const { url, token } = getRedisCredentials();
    return { url, auth: token };
  })();

  if (!url || !auth) {
    return NextResponse.json({ error: "Redis not configured", hint: "Check KV_REST_API_URL / UPSTASH_REDIS_REST_URL env vars" }, { status: 500 });
  }

  const res  = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${auth}`, "Content-Type": "application/json" },
    body: JSON.stringify(["SMEMBERS", REDIS_KEY]),
  });

  const data      = await res.json();
  const usernames: string[] = data.result ?? [];

  return NextResponse.json({ count: usernames.length, usernames: usernames.sort() });
}
