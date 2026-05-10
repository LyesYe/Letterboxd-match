import { NextRequest, NextResponse } from "next/server";
import { getRedisCredentials } from "@/lib/trackUsernames";

const SECRET    = process.env.ADMIN_SECRET;
const REDIS_KEY = "pickd:letterboxd_usernames";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("secret");
  if (!SECRET || token !== SECRET) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { url, token: auth } = getRedisCredentials();
  if (!url || !auth) return NextResponse.json({ error: "Redis not configured" }, { status: 500 });

  const res  = await fetch(url, {
    method:  "POST",
    headers: { Authorization: `Bearer ${auth}`, "Content-Type": "application/json" },
    body:    JSON.stringify(["ZREVRANGEBYSCORE", REDIS_KEY, "+inf", "-inf", "WITHSCORES"]),
  });
  const raw: string[] = (await res.json()).result ?? [];

  // Upstash returns [member, score, member, score, ...]
  const entries: { username: string; ts: number }[] = [];
  for (let i = 0; i < raw.length; i += 2) {
    entries.push({ username: raw[i], ts: parseInt(raw[i + 1], 10) });
  }

  const fmt = (ts: number) => {
    if (!ts) return "—";
    const d = new Date(ts * 1000);
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
      + " " + d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  };

  const rows = entries.map((e, i) => `
    <tr>
      <td style="color:#99AABB;padding:10px 16px;border-bottom:1px solid #2c3440">${i + 1}</td>
      <td style="padding:10px 16px;border-bottom:1px solid #2c3440;font-weight:600;color:#e8ecf0">${e.username}</td>
      <td style="padding:10px 16px;border-bottom:1px solid #2c3440">
        <a href="https://letterboxd.com/${e.username}/" target="_blank"
          style="color:#00E054;text-decoration:none;font-size:13px">
          letterboxd.com/${e.username} ↗
        </a>
      </td>
      <td style="padding:10px 16px;border-bottom:1px solid #2c3440;color:#99AABB;font-size:12px;white-space:nowrap">
        ${fmt(e.ts)}
      </td>
    </tr>`).join("");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>Pickd Users (${entries.length})</title>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{background:#14181C;color:#e8ecf0;font-family:system-ui,sans-serif;padding:32px 24px}
    h1{font-size:22px;font-weight:700;margin-bottom:4px}
    p{color:#99AABB;font-size:13px;margin-bottom:24px}
    table{width:100%;max-width:860px;border-collapse:collapse;background:#1c2228;border-radius:12px;overflow:hidden}
    tr:last-child td{border-bottom:none!important}
    a:hover{color:#00c949!important}
  </style>
</head>
<body>
  <h1>Pickd Users</h1>
  <p>${entries.length} registered user${entries.length !== 1 ? "s" : ""} · newest first</p>
  <table>
    <thead>
      <tr style="background:#2c3440">
        <th style="padding:10px 16px;text-align:left;color:#99AABB;font-size:11px;text-transform:uppercase;letter-spacing:.05em">#</th>
        <th style="padding:10px 16px;text-align:left;color:#99AABB;font-size:11px;text-transform:uppercase;letter-spacing:.05em">Username</th>
        <th style="padding:10px 16px;text-align:left;color:#99AABB;font-size:11px;text-transform:uppercase;letter-spacing:.05em">Profile</th>
        <th style="padding:10px 16px;text-align:left;color:#99AABB;font-size:11px;text-transform:uppercase;letter-spacing:.05em">First seen</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
</body>
</html>`;

  return new NextResponse(html, { headers: { "Content-Type": "text/html" } });
}
