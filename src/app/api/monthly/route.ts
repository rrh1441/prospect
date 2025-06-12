import { NextResponse } from "next/server";

interface MonthRange {
  start: string;
  end: string;
  label: string;
}

interface ThreatApiPayload {
  page: number;
  size: number;
  highlight: { enabled: boolean };
  include_total: boolean;
  query: string;
  include: {
    date: {
      start: string;
      end: string;
    };
  };
}

interface MonthlyResult {
  date: string;
  count: number;
}

/**
 * Get the last 12 full months (excluding the current month) in chronological order.
 * Each entry contains ISO-formatted start/end boundaries and a YYYY-MM label.
 */
function getLast12MonthsExcludingCurrent(): MonthRange[] {
  const months: MonthRange[] = [];
  const now = new Date();

  // Normalize to the first of the current month at 00:00:00.
  now.setDate(1);
  now.setHours(0, 0, 0, 0);

  for (let i = 1; i <= 12; i += 1) {
    const temp = new Date(now);
    temp.setMonth(temp.getMonth() - i);

    const startDate = new Date(temp.getFullYear(), temp.getMonth(), 1);
    const endDate = new Date(temp.getFullYear(), temp.getMonth() + 1, 0);

    const start = `${startDate.toISOString().split("T")[0]}T00:00:00Z`;
    const end = `${endDate.toISOString().split("T")[0]}T23:59:59Z`;
    const label = startDate.toISOString().slice(0, 7);

    months.push({ start, end, label });
  }

  return months.reverse();
}

/** Build the Threat-API POST body for a single month. */
function buildMonthlyPayload(keyword: string, start: string, end: string): ThreatApiPayload {
  return {
    page: 0,
    size: 0,
    highlight: { enabled: true },
    include_total: true,
    query: keyword,
    include: {
      date: { start, end },
    },
  };
}

/** Execute the Threat-API call and return the aggregated total. */
async function fetchMonthlyTotal(keyword: string, start: string, end: string): Promise<number> {
  const payload = buildMonthlyPayload(keyword, start, end);

  const apiResponse = await fetch(process.env.THREAT_API_URL ?? "", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.THREAT_API_KEY ?? ""}`,
    },
    body: JSON.stringify(payload),
  });

  if (!apiResponse.ok) {
    const errorText = await apiResponse.text();
    throw new Error(`Month ${start}–${end} for "${keyword}" ➜ ${apiResponse.status}: ${errorText}`);
  }

  const data = (await apiResponse.json()) as { total?: { value?: number } };
  return data.total?.value ?? 0;
}

/** POST /api/monthly-search */
export async function POST(req: Request) {
  try {
    const { keyword } = (await req.json()) as { keyword?: string };

    if (!keyword) {
      return NextResponse.json({ error: "Missing 'keyword' in request body." }, { status: 400 });
    }

    const months = getLast12MonthsExcludingCurrent();
    const monthlyResults: MonthlyResult[] = [];

    for (const { start, end, label } of months) {
      try {
        const count = await fetchMonthlyTotal(keyword, start, end);
        monthlyResults.push({ date: label, count });
      } catch (err) {
        console.error(`Error fetching "${keyword}" for ${label}:`, err);
        monthlyResults.push({ date: label, count: 0 });
      }

      // Throttle to avoid API-rate limits.
      await new Promise((resolve) => setTimeout(resolve, 250));
    }

    return NextResponse.json({ data: monthlyResults }, { status: 200 });
  } catch (err) {
    console.error("Monthly API Error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
