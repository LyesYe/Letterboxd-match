const REDIS_KEY = "pickd:letterboxd_usernames";

export function getRedisCredentials() {
  const url   = process.env.KV_REST_API_URL   || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  return { url, token };
}

async function redisCmd(cmd: unknown[]): Promise<unknown> {
  const { url, token } = getRedisCredentials();
  if (!url || !token) return null;
  const res  = await fetch(url, {
    method:  "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body:    JSON.stringify(cmd),
  });
  return (await res.json()).result;
}

/**
 * Add usernames to a sorted set scored by Unix timestamp.
 * NX = only add if not already present (preserves original join date).
 */
export async function trackUsernames(usernames: string[]): Promise<void> {
  if (!usernames.length) return;
  const now  = Math.floor(Date.now() / 1000);
  const args = usernames.flatMap((u) => [now, u.toLowerCase()]);
  // ZADD key NX score member [score member ...]
  await redisCmd(["ZADD", REDIS_KEY, "NX", ...args]);
}

export async function cacheFavorites(username: string, slugs: string[]): Promise<void> {
  if (!username || !slugs.length) return;
  await redisCmd(["SETEX", `pickd:fav:${username.toLowerCase()}`, 604800, JSON.stringify(slugs)]);
}

export async function getCachedFavorites(username: string): Promise<string[] | null> {
  const result = await redisCmd(["GET", `pickd:fav:${username.toLowerCase()}`]);
  if (!result || typeof result !== "string") return null;
  try { return JSON.parse(result); } catch { return null; }
}

export async function getAllUsernames(): Promise<string[]> {
  // ZREVRANGE returns newest-first
  const result = await redisCmd(["ZREVRANGE", REDIS_KEY, 0, -1]);
  return Array.isArray(result) ? (result as string[]) : [];
}
