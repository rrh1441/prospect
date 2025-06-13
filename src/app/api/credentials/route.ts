// ────────────────────────────────────────────────────────────────
// FILE: src/app/api/credentials/route.ts
// PURPOSE: Monthly counts of compromised credentials for an
//          affected-domain using Flashpoint Identity-Intelligence
//          analysis endpoint.
// ENV:
//   • CUSTOMER_API_URL  – https://api.flashpoint.io/identity-intelligence/v1
//   • THREAT_API_KEY    – Bearer token
// ────────────────────────────────────────────────────────────────

import { NextResponse } from "next/server";

interface MonthRange {
  start: string;                 // 2024-05-01T00:00:00Z
  end:   string;                 // 2024-05-31T23:59:59Z
  label: string;                 // 2024-05
}
interface MonthlyResult { date: string; count: number; }

/* ─── 12 full months, oldest→newest ─── */
function last12Months(): MonthRange[] {
  const out: MonthRange[] = [];
  const now = new Date();
  now.setUTCDate(1);
  now.setUTCHours(0, 0, 0, 0);

  for (let i = 1; i <= 12; i++) {
    const d = new Date(now);
    d.setUTCMonth(d.getUTCMonth() - i);
    const y = d.getUTCFullYear();
    const m = d.getUTCMonth();
    const start = new Date(Date.UTC(y, m, 1)).toISOString();
    const end   = new Date(Date.UTC(y, m + 1, 0, 23, 59, 59)).toISOString();
    out.push({ start, end, label: `${y}-${String(m + 1).padStart(2, "0")}` });
  }
  return out.reverse();
}

/* ─── single-month total via /analysis + scroll ─── */
async function monthTotal(domain: string, start: string, end: string): Promise<number> {
  const base = process.env.CUSTOMER_API_URL || "https://api.flashpoint.io/identity-intelligence/v1";
  const key  = process.env.THREAT_API_KEY;
  if (!key) throw new Error("THREAT_API_KEY undefined");

  const qs = "page_size=100&scroll=true";     // page of 100, start scroll
  const body = JSON.stringify({
    type: "affected_domain",
    keys: [domain],
    filters: {
      "breach.first_observed_at.date-time": { gte: start, lte: end },
    },
  });

  /* helper to POST */
  const post = async (url: string, bodyObj: unknown) => {
    const r = await fetch(url, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify(bodyObj),
    });
    if (!r.ok) throw new Error(`${r.status}: ${await r.text()}`);
    return (await r.json()) as any;
  };

  /* first page */
  let url  = `${base}/analysis?${qs}`;
  let resp = await post(url, JSON.parse(body));

  let total = resp.num_results ?? 0;

  /* scroll pages */
  while (resp.scroll_id) {
    resp = await post(`${base}/analysis/scroll`, { scroll_id: resp.scroll_id });
    total += resp.num_results ?? 0;
  }
  return total;
}

/* ─── Next.js route handler ─── */
export async function POST(req: Request) {
  try {
    const { domain } = (await req.json()) as { domain?: string };
    if (!domain) {
      return NextResponse.json({ error: "Missing 'domain'" }, { status: 400 });
    }
    const clean = domain.trim().toLowerCase();

    const results: MonthlyResult[] = [];
    for (const { start, end, label } of last12Months()) {
      try {
        const count = await monthTotal(clean, start, end);
        results.push({ date: label, count });
      } catch (e) {
        console.error(`FP error ${clean} ${label}`, e);
        results.push({ date: label, count: 0 });
      }
      await new Promise((r) => setTimeout(r, 250)); // throttle
    }
    return NextResponse.json({ data: results });
  } catch (e) {
    console.error("cred-analysis route error", e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
