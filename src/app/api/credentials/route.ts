// ────────────────────────────────────────────────────────────────
// Credentials monthly count route
// ────────────────────────────────────────────────────────────────
import { NextResponse } from "next/server";

interface MonthRange { start: string; end: string; label: string; }
interface MonthlyResult { date: string; count: number; }

/* → last 12 fully-closed months, oldest → newest */
function months(): MonthRange[] {
  const out: MonthRange[] = [];
  const now = new Date();
  now.setUTCDate(1); now.setUTCHours(0, 0, 0, 0);
  for (let i = 1; i <= 12; i++) {
    const d = new Date(now);
    d.setUTCMonth(d.getUTCMonth() - i);
    const y = d.getUTCFullYear();
    const m = d.getUTCMonth();
    const s = new Date(Date.UTC(y, m, 1));
    const e = new Date(Date.UTC(y, m + 1, 0, 23, 59, 59));
    out.push({
      start: s.toISOString(),
      end:   e.toISOString(),
      label: `${y}-${String(m + 1).padStart(2, "0")}`,
    });
  }
  return out.reverse();
}

/* choose date field (env override allowed) */
const DATE_FIELD =
  process.env.CRED_DATE_FIELD?.trim() ||
  "breach.first_observed_at.timestamp";

/* build FP search payload */
function payload(domain: string, start: string, end: string) {
  const from = Math.floor(new Date(start).getTime() / 1000);
  const to   = Math.floor(new Date(end).getTime()   / 1000);
  return {
    size: 0,
    query:
      `+domain:("${domain}") ` +
      `+basetypes:(credential-sighting) ` +
      `+${DATE_FIELD}:[${from} TO ${to}]`,
    sort: [`${DATE_FIELD}:desc`],
  };
}

async function total(domain: string, s: string, e: string) {
  const url = process.env.CREDENTIALS_API_URL;
  const key = process.env.THREAT_API_KEY;
  if (!url || !key) throw new Error("API url/key missing");

  const r = await fetch(url, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify(payload(domain, s, e)),
  });
  if (!r.ok) throw new Error(`${r.status}: ${await r.text()}`);
  const j = (await r.json()) as { hits?: { total?: number } };
  return j.hits?.total ?? 0;
}

/* ───────── route handler ───────── */
export async function POST(req: Request) {
  try {
    const { domain } = (await req.json()) as { domain?: string };
    if (!domain) {
      return NextResponse.json({ error: "Missing 'domain'" }, { status: 400 });
    }
    const d = domain.trim().toLowerCase();

    const results: MonthlyResult[] = [];
    for (const { start, end, label } of months()) {
      try {
        results.push({ date: label, count: await total(d, start, end) });
      } catch (e) {
        console.error(`FP error ${d} ${label}`, e);
        results.push({ date: label, count: 0 });
      }
      await new Promise((r) => setTimeout(r, 250)); // throttle
    }
    return NextResponse.json({ data: results });
  } catch (e) {
    console.error("credentials route error", e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
