import { NextResponse } from 'next/server';

// Must be defined in the V  ercel project settings (noncommunities endpoint URL).
const CREDENTIALS_API_URL = process.env.CREDENTIALS_API_URL;
const THREAT_API_KEY = process.env.THREAT_API_KEY;

interface MonthRange {
  start: string;
  end: string;
  label: string; // YYYY-MM
}

interface CredentialPayload {
  query: string;
  size: number;
  source: boolean;
}

/** Produce the previous 12 full months, newest → oldest, excluding the current month. */
function last12Months(): MonthRange[] {
  const anchor = new Date();
  anchor.setDate(1);
  anchor.setHours(0, 0, 0, 0);

  const out: MonthRange[] = [];
  for (let i = 1; i <= 12; i += 1) {
    const first = new Date(anchor);
    first.setMonth(first.getMonth() - i);

    const last = new Date(first.getFullYear(), first.getMonth() + 1, 0);

    out.push({
      start: first.toISOString(),
      end: last.toISOString(),
      label: first.toISOString().slice(0, 7),
    });
  }
  return out.reverse();
}

/** Build request body for one month slice. */
function buildBody(domain: string, start: string, end: string): CredentialPayload {
  const query =
    `+domain:("${domain}") ` +
    '+basetypes:(credential-sighting) ' +
    `+last_observed_at.date-time:[${start} TO ${end}]`;
  return { query, size: 0, source: false };
}

async function monthlyCount(domain: string, start: string, end: string): Promise<number> {
  if (!CREDENTIALS_API_URL) {
    throw new Error('CREDENTIALS_API_URL is not set.');
  }

  const res = await fetch(CREDENTIALS_API_URL, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${THREAT_API_KEY ?? ''}`,
    },
    body: JSON.stringify(buildBody(domain, start, end)),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Flashpoint ${res.status} for ${start}-${end}: ${txt}`);
  }

  const json = (await res.json()) as { total?: { value?: number } };
  return json.total?.value ?? 0;
}

/** POST /api/credentials – body: { domain: "example.com" } */
export async function POST(req: Request) {
  if (!CREDENTIALS_API_URL || !THREAT_API_KEY) {
    return NextResponse.json(
      { error: 'Backend environment variables are not configured.' },
      { status: 500 },
    );
  }

  try {
    const { domain } = (await req.json()) as { domain?: string };
    if (!domain) {
      return NextResponse.json({ error: "Missing 'domain'." }, { status: 400 });
    }

    const months = last12Months();
    const data: { date: string; count: number }[] = [];

    for (const m of months) {
      try {
        const count = await monthlyCount(domain, m.start, m.end);
        data.push({ date: m.label, count });
      } catch (err) {
        console.error(`Month ${m.label} failed`, err);
        data.push({ date: m.label, count: 0 });
      }
      // eslint-disable-next-line no-await-in-loop -- intentional throttle
      await new Promise((r) => setTimeout(r, 300));
    }

    return NextResponse.json({ data }, { status: 200 });
  } catch (err) {
    console.error('Credentials route error', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
