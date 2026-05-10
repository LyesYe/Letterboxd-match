const REDIS_KEY = "pickd:letterboxd_usernames";

function getRedisCredentials() {
  // Vercel KV (powered by Upstash) uses KV_ prefix
  // Direct Upstash integration uses UPSTASH_ prefix
  // Try both
  const url =
    process.env.KV_REST_API_URL ||
    process.env.UPSTASH_REDIS_REST_URL;
  const token =
    process.env.KV_REST_API_TOKEN ||
    process.env.UPSTASH_REDIS_REST_TOKEN;
  return { url, token };
}

export async function trackUsernames(usernames: string[]): Promise<void> {
  const { url, token } = getRedisCredentials();
  if (!url || !token || !usernames.length) return;

  // Use POST with JSON body — most reliable Upstash REST format
  await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(["SADD", REDIS_KEY, ...usernames]),
  });
}
