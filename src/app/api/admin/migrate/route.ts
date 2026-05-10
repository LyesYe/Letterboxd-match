import { NextRequest, NextResponse } from "next/server";
import { getRedisCredentials } from "@/lib/trackUsernames";

const SECRET    = process.env.ADMIN_SECRET;
const REDIS_KEY = "pickd:letterboxd_usernames";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("secret");
  if (!SECRET || token !== SECRET) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { url, token: auth } = getRedisCredentials();
  if (!url || !auth) return NextResponse.json({ error: "Redis not configured" }, { status: 500 });

  const headers = { Authorization: `Bearer ${auth}`, "Content-Type": "application/json" };
  const post    = async (cmd: unknown[]) =>
    (await fetch(url, { method: "POST", headers, body: JSON.stringify(cmd) }).then((r) => r.json())).result;

  // Check current type
  const type = await post(["TYPE", REDIS_KEY]);

  if (type === "zset") {
    // Already a sorted set — just lowercase any mixed-case members
    const members: string[] = (await post(["ZRANGEBYSCORE", REDIS_KEY, "-inf", "+inf"])) ?? [];
    const mixed = members.filter((m: string) => m !== m.toLowerCase());
    if (!mixed.length) return NextResponse.json({ message: "Already migrated, nothing to do." });

    // Get their scores, remove old, add lowercase
    const withScores: string[] = (await post(["ZRANGEBYSCORE", REDIS_KEY, "-inf", "+inf", "WITHSCORES"])) ?? [];
    const toRemove: string[]    = [];
    const toAdd: unknown[]      = [];
    for (let i = 0; i < withScores.length; i += 2) {
      const m = withScores[i], s = withScores[i + 1];
      if (m !== m.toLowerCase()) { toRemove.push(m); toAdd.push(s, m.toLowerCase()); }
    }
    await post(["ZREM", REDIS_KEY, ...toRemove]);
    await post(["ZADD", REDIS_KEY, "NX", ...toAdd]);
    return NextResponse.json({ message: `Lowercased ${toRemove.length} members.`, fixed: toRemove });
  }

  if (type === "set") {
    // Old plain SET — convert to sorted set with score = 0 (unknown join date)
    const members: string[] = (await post(["SMEMBERS", REDIS_KEY])) ?? [];
    if (!members.length) return NextResponse.json({ message: "Set is empty." });

    const tmpKey = `${REDIS_KEY}_old`;
    await post(["RENAME", REDIS_KEY, tmpKey]);

    const args = members.flatMap((m: string) => [0, m.toLowerCase()]);
    await post(["ZADD", REDIS_KEY, "NX", ...args]);
    await post(["DEL", tmpKey]);

    return NextResponse.json({ message: `Migrated ${members.length} users from SET to SORTED SET.`, members });
  }

  return NextResponse.json({ message: `Key type is "${type}" — nothing to migrate.` });
}
