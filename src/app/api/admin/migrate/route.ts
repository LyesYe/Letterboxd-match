import { NextRequest, NextResponse } from "next/server";
import { getRedisCredentials } from "@/lib/trackUsernames";

const SECRET     = process.env.ADMIN_SECRET;
const REDIS_KEY  = "pickd:letterboxd_usernames";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("secret");
  if (!SECRET || token !== SECRET) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { url, token: auth } = getRedisCredentials();
  if (!url || !auth) return NextResponse.json({ error: "Redis not configured" }, { status: 500 });

  const headers = { Authorization: `Bearer ${auth}`, "Content-Type": "application/json" };
  const post    = (cmd: unknown[]) =>
    fetch(url, { method: "POST", headers, body: JSON.stringify(cmd) }).then((r) => r.json());

  // 1. Get all current members
  const { result: members } = await post(["SMEMBERS", REDIS_KEY]);
  const all: string[] = members ?? [];

  // 2. Find entries that aren't already lowercase
  const mixedCase = all.filter((u: string) => u !== u.toLowerCase());
  if (mixedCase.length === 0) return NextResponse.json({ message: "Nothing to migrate.", total: all.length });

  // 3. Remove mixed-case entries and add their lowercase equivalents
  // Use pipeline: SREM the old ones, SADD the lowercase ones
  await post(["SREM", REDIS_KEY, ...mixedCase]);
  await post(["SADD", REDIS_KEY, ...mixedCase.map((u: string) => u.toLowerCase())]);

  return NextResponse.json({
    message:   `Migrated ${mixedCase.length} username(s) to lowercase.`,
    migrated:  mixedCase,
    total:     all.length,
  });
}
