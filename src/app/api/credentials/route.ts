// ────────────────────────────────────────────────────────────────
// FILE: src/app/api/credentials/route.ts
// DESCRIPTION: Return the last 12 full-month counts of credential
//              sightings for a supplied email domain.
// ENV VARS:
//   • CREDENTIALS_API_URL   – Flashpoint endpoint (non-communities)
//   • CREDENTIALS_API_KEY   – API token
// ────────────────────────────────────────────────────────────────

import { NextResponse } from "next/server";

interface MonthRange {
  start: string; // ISO 8601 date-time, inclusive (00:00:00Z)
  end: string;   // ISO 8601 date-time, inclusive (23:59:59Z)
  label: string; // YYYY-MM for frontend display
}

interface MonthlyResult {
  date: string;  // YYYY-MM
  count: number; // total credential-sighting hits
}

/**
 * Return the last 12 *complete* months (excluding the current month)
 * in chronological order.
 */
function getLast12MonthsExcludingCurrent(): MonthRange[] {
  const now = new Date();
  now.setUTCDate(1);
  now.setUTCHours(0, 0, 0, 0);          // first day of current month 00:00Z

  const months: MonthRange[] = [];

  for (let i = 1; i <= 12; i += 1) {
    const temp = new Date(now);
    temp.setUTCMonth(temp.getUTCMonth() - i);

    const y = temp.getUTCFullYear();
    const m = temp.getUTCMonth();       // 0-based

    const startDate = new Date(Date.UTC(y, m, 1));
    const endDate = new Date(Date.UTC(y, m + 1, 0, 23, 59, 59));

    const start = startDate.toISOString();   // e.g. 2024-05-01T00:00:00.000Z
    const end   = endDate.toISOString();     // e.g. 2024-05-31T23:59:59.000Z
    const label = `${y}-${String(m + 1).padStart(2, "0")}`;

    months.push({ start, end, label });
  }

  return months.reverse();
}

/**
 * Build the Flashpoint non-communities search payload for one month.
 * Sort is irrelevant because we request size 0, but kept for completeness.
 */
function buildPayload(
  domain: string,
  startIso: string,
  endIso: string,
): unknown {
  // Convert ISO timestamps to Unix epoch seconds for Lucene range query.
  const startEpoch = Math.floor(new Date(startIso).getTime() / 1000);
  const endEpoch   = Math.floor(new Date(endIso).getTime()   / 1000);

  return {
    // We only want the aggregated total; no documents returned.
    size: 0,
    // Lucene string:
    //  +domain:("example.com") +basetypes:(credential-sighting)
    //  +breach.first_observed_at.timestamp:[START TO END]
    query:
      `+domain:("${domain}") ` +
      `+basetypes:(credential-sighting) ` +
      `+breach.first_observed_at.timestamp:[${startEpoch} TO ${endEpoch}]`,
    sort: ["breach.first_observed_at.timestamp:desc"],
  };
}

/**
 * Perform the POST request to Flashpoint and extract the `hits.total` count.
 */
async function fetchMonthlyTotal(
  domain: string,
  startIso: string,
  endIso: string,
): Promise<number> {
  const url = process.env.CREDENTIALS_API_URL;
  const key = process.env.CREDENTIALS_API_KEY;

  if (!url || !key) {
    throw new Error("CREDENTIALS_API_URL or CREDENTIALS_API_KEY is undefined");
  }

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify(buildPayload(domain, startIso, endIso)),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `Flashpoint ${res.status} for ${domain} ${startIso}—${endIso}: ${text}`,
    );
  }

  interface FlashpointResponse {
    hits?: { total?: number };
  }

  const data: FlashpointResponse = await res.json();
  return data.hits?.total ?? 0;
}

/* ------------------------------------------------------------------ */
/*                       Next.js Route Handler                        */
/* ------------------------------------------------------------------ */

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const { domain } = (await request.json()) as { domain?: string };

    if (!domain) {
      return NextResponse.json(
        { error: "Missing 'domain' in request body." },
        { status: 400 },
      );
    }

    const months = getLast12MonthsExcludingCurrent();
    const results: MonthlyResult[] = [];

    for (const { start, end, label } of months) {
      try {
        const count = await fetchMonthlyTotal(domain, start, end);
        results.push({ date: label, count });
      } catch (err) {
        console.error(`Error fetching ${domain} for ${label}:`, err);
        results.push({ date: label, count: 0 });
      }

      // Minimal throttle to respect Flashpoint rate limits.
      // Adjust if you see 429s.
      await new Promise((r) => setTimeout(r, 250));
    }

    return NextResponse.json({ data: results }, { status: 200 });
  } catch (err) {
    console.error("Credential-count API error:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
