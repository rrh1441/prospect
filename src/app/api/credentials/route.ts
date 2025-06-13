// ────────────────────────────────────────────────────────────────
// Monthly credential-sighting totals for an affected domain
// Identity-Intelligence  /analysis  +  /analysis/scroll
// Short-circuits when results fall outside the last 12 calendar
// months (UTC), so it stops paging early.
// ENV:
//   CUSTOMER_API_URL  – full analysis URL
//   THREAT_API_KEY    – Bearer token
// ────────────────────────────────────────────────────────────────

import { NextResponse } from "next/server";

/* ---------- helper types ---------- */
interface MonthRange { start: string; end: string; label: string; }
interface MonthlyResult { date: string; count: number; }

interface AnalysisCred {
  breach?: { first_observed_at?: { "date-time"?: string } };
}
interface KeyBlock { results?: AnalysisCred[]; }
interface AnalysisPage {
  num_results?: number;
  scroll_id?: string;
  results?: KeyBlock[];
}

/* ---------- compute last 12 complete months ---------- */
function last12Months(): MonthRange[] {
  const out: MonthRange[] = [];
  const now = new Date();
  now.setUTCDate(1);
  now.setUTCHours(0, 0, 0, 0);

  for (let i = 1; i <= 12; i += 1) {
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
const MONTHS          = last12Months();
const EARLIEST_ISO    = MONTHS[0].start;              // oldest boundary
const EARLIEST_MS     = new Date(EARLIEST_ISO).getTime();
const LATEST_ISO      = MONTHS[MONTHS.length - 1].end;

/* ---------- constants ---------- */
const ANALYSIS_URL =
  process.env.CUSTOMER_API_URL ??
  "https://api.flashpoint.io/identity-intelligence/v1/analysis";
const SCROLL_URL = `${ANALYSIS_URL}/scroll`;
const API_KEY    = process.env.THREAT_API_KEY;
if (!API_KEY) throw new Error("THREAT_API_KEY undefined");

/* ---------- minimal fetch wrapper ---------- */
async function fpPost<T>(url: string, body: unknown): Promise<T> {
  const r = await fetch(url, {
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

/* ---------- retrieve one year of creds, bucket locally ---------- */
async function fetchYear(domain: string): Promise<Map<string, number>> {
  /* init counts map with zeros */
  const counts = new Map<string, number>(
    MONTHS.map(({ label }) => [label, 0]),
  );

  /* internal helper – returns true if we should continue scrolling */
  const processPage = (page: AnalysisPage): boolean => {
    let keepScrolling = true;

    page.results?.forEach((kb) =>
      kb.results?.forEach((cred) => {
        const ts = cred.breach?.first_observed_at?.["date-time"];
        if (!ts) return;

        const tsMs = new Date(ts).getTime();
        if (tsMs < EARLIEST_MS) keepScrolling = false;

        const label = ts.slice(0, 7); // YYYY-MM
        if (counts.has(label)) {
          counts.set(label, (counts.get(label) ?? 0) + 1);
        }
      }),
    );

    return keepScrolling && Boolean(page.scroll_id);
  };

  /* first request */
  let page = await fpPost<AnalysisPage>(
    `${ANALYSIS_URL}?page_size=100&scroll=true`,
    {
      type: "affected_domain",
      keys: [domain],
      filters: {
        "breach.first_observed_at.date-time": { gte: EARLIEST_ISO, lte: LATEST_ISO },
      },
    },
  );

  /* handle first page */
  let keep = processPage(page);

  /* scroll pages until cutoff reached */
  while (keep) {
    page = await fpPost<AnalysisPage>(SCROLL_URL, { scroll_id: page.scroll_id });
    keep = processPage(page);
  }
  return counts;
}

/* ---------- route handler ---------- */
export async function POST(req: Request) {
  try {
    const { domain } = (await req.json()) as { domain?: string };
    if (!domain) {
      return NextResponse.json({ error: "Missing 'domain'" }, { status: 400 });
    }
    const clean = domain.trim().toLowerCase();

    const counts = await fetchYear(clean);

    const data: MonthlyResult[] = MONTHS.map(({ label }) => ({
      date: label,
      count: counts.get(label) ?? 0,
    }));

    return NextResponse.json({ data });
  } catch (e) {
    console.error("credentials route error", e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
