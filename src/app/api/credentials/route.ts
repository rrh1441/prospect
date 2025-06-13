// ────────────────────────────────────────────────────────────────
// Monthly credential-sighting counts for an affected domain
// using Flashpoint Identity-Intelligence /analysis endpoint.
// ────────────────────────────────────────────────────────────────

import { NextResponse } from "next/server";

/* ───────── types ───────── */

interface MonthRange { start: string; end: string; label: string; }
interface MonthlyResult { date: string; count: number; }

interface AnalysisPage {
  num_results?: number;
  scroll_id?: string;
}

/* ───────── helpers ───────── */

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
    out.push({
      start: new Date(Date.UTC(y, m, 1)).toISOString(),
      end:   new Date(Date.UTC(y, m + 1, 0, 23, 59, 59)).toISOString(),
      label: `${y}-${String(m + 1).padStart(2, "0")}`,
    });
  }
  return out.reverse();
}

const BASE_URL =
  process.env.CUSTOMER_API_URL ??
  "https://api.flashpoint.io/identity-intelligence/v1";
const API_KEY = process.env.THREAT_API_KEY;

/* small wrapper with proper typing */
async function fpPost<T>(endpoint: string, body: unknown): Promise<T> {
  if (!API_KEY) throw new Error("THREAT_API_KEY undefined");
  const r = await fetch(`${BASE_URL}${endpoint}`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`${r.status}: ${await r.text()}`);
  return (await r.json()) as T;
}

/* count results for one month */
async function monthTotal(domain: string, start: string, end: string): Promise<number> {
  /* first page */
  const first = await fpPost<AnalysisPage>(
    "/analysis?page_size=100&scroll=true",
    {
      type: "affected_domain",
      keys: [domain],
      filters: {
        "breach.first_observed_at.date-time": { gte: start, lte: end },
      },
    },
  );

  let total = first.num_results ?? 0;
  let scrollId = first.scroll_id;

  /* scroll pages */
  while (scrollId) {
    const page = await fpPost<AnalysisPage>("/analysis/scroll", { scroll_id: scrollId });
    total    += page.num_results ?? 0;
    scrollId  = page.scroll_id;
  }
  return total;
}

/* ───────── route handler ───────── */

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
        results.push({ date: label, count: await monthTotal(clean, start, end) });
      } catch (e) {
        console.error(`FP error ${clean} ${label}`, e);
        results.push({ date: label, count: 0 });
      }
      await new Promise((r) => setTimeout(r, 250));
    }

    return NextResponse.json({ data: results });
  } catch (e) {
    console.error("credential analysis route error", e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
