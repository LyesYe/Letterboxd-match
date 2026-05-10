import { NextRequest, NextResponse } from "next/server";

const SECRET    = process.env.ADMIN_SECRET;
const REDIS_KEY = "pickd:letterboxd_usernames";

function getRedisCredentials() {
  const url   = process.env.KV_REST_API_URL   || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  return { url, auth: token };
}

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("secret");
  if (!SECRET || token !== SECRET) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { url, auth } = getRedisCredentials();
  if (!url || !auth) return NextResponse.json({ error: "Redis not configured" }, { status: 500 });

  const res  = await fetch(url, {
    method:  "POST",
    headers: { Authorization: `Bearer ${auth}`, "Content-Type": "application/json" },
    body:    JSON.stringify(["SMEMBERS", REDIS_KEY]),
  });
  const data      = await res.json();
  const usernames = ((data.result ?? []) as string[]).sort();

  // Return HTML for easy browsing
  const rows = usernames.map((u, i) => `
    <tr>
      <td style="color:#99AABB;padding:10px 16px;border-bottom:1px solid #2c3440">${i + 1}</td>
      <td style="padding:10px 16px;border-bottom:1px solid #2c3440;font-weight:600;color:#e8ecf0">${u}</td>
      <td style="padding:10px 16px;border-bottom:1px solid #2c3440">
        <a href="https://letterboxd.com/${u}/" target="_blank"
          style="color:#00E054;text-decoration:none;font-size:13px">
          letterboxd.com/${u} ↗
        </a>
      </td>
    </tr>`).join("");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>Pickd Users (${usernames.length})</title>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{background:#14181C;color:#e8ecf0;font-family:system-ui,sans-serif;padding:32px 24px}
    h1{font-size:22px;font-weight:700;margin-bottom:4px}
    p{color:#99AABB;font-size:13px;margin-bottom:24px}
    table{width:100%;max-width:700px;border-collapse:collapse;background:#1c2228;border-radius:12px;overflow:hidden}
    tr:last-child td{border-bottom:none!important}
    a:hover{color:#00c949!important}
  </style>
</head>
<body>
  <h1>Pickd Users</h1>
  <p>${usernames.length} registered user${usernames.length !== 1 ? "s" : ""}</p>
  <table>
    <thead>
      <tr style="background:#2c3440">
        <th style="padding:10px 16px;text-align:left;color:#99AABB;font-size:11px;text-transform:uppercase;letter-spacing:.05em">#</th>
        <th style="padding:10px 16px;text-align:left;color:#99AABB;font-size:11px;text-transform:uppercase;letter-spacing:.05em">Username</th>
        <th style="padding:10px 16px;text-align:left;color:#99AABB;font-size:11px;text-transform:uppercase;letter-spacing:.05em">Profile</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
</body>
</html>`;

  return new NextResponse(html, { headers: { "Content-Type": "text/html" } });
}
