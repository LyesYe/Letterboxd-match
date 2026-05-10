/**
 * Stores Letterboxd usernames in Upstash Redis.
 * Uses a Redis Set so each username is stored only once (deduped automatically).
 *
 * Setup:
 *  1. npm install @upstash/redis
 *  2. Add UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN to Vercel env vars
 *     (Vercel ↔ Upstash integration sets these automatically)
 *
 * If the env vars are missing (local dev), this function is a no-op.
 */

const REDIS_KEY = "pickd:letterboxd_usernames";

export async function trackUsernames(usernames: string[]): Promise<void> {
  const url   = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token || !usernames.length) return;

  // SADD adds each username to a Redis Set — duplicates are ignored automatically
  await fetch(`${url}/sadd/${REDIS_KEY}/${usernames.map(encodeURIComponent).join("/")}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });
}
