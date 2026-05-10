const REDIS_KEY = "pickd:letterboxd_usernames";

export function getRedisCredentials() {
  const url   = process.env.KV_REST_API_URL   || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  return { url, token };
}

async function redisCmd(cmd: unknown[]): Promise<unknown> {
  const { url, token } = getRedisCredentials();
  if (!url || !token) return null;
  const res = await fetch(url, {
    method:  "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body:    JSON.stringify(cmd),
  });
  const data = await res.json();
  return data.result;
}

export async function trackUsernames(usernames: string[]): Promise<void> {
  if (!usernames.length) return;
  await redisCmd(["SADD", REDIS_KEY, ...usernames.map((u) => u.toLowerCase())]);
}

/** Cache a user's favorites for 7 days (86400 × 7 = 604800s) */
export async function cacheFavorites(username: string, slugs: string[]): Promise<void> {
  if (!username || !slugs.length) return;
  await redisCmd(["SETEX", `pickd:fav:${username}`, 604800, JSON.stringify(slugs)]);
}

/** Get cached favorites for a user, or null if not cached */
export async function getCachedFavorites(username: string): Promise<string[] | null> {
  const result = await redisCmd(["GET", `pickd:fav:${username}`]);
  if (!result || typeof result !== "string") return null;
  try { return JSON.parse(result); } catch { return null; }
}

/** Get all stored usernames */
export async function getAllUsernames(): Promise<string[]> {
  const result = await redisCmd(["SMEMBERS", REDIS_KEY]);
  return Array.isArray(result) ? result as string[] : [];
}
