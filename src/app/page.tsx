"use client";

import { useState } from "react";
import Head from "next/head";
import ThreatChart from "@/components/ThreatChart";
import {
  Card,
  CardHeader,
  CardContent,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Alert,
  AlertTitle,
  AlertDescription,
} from "@/components/ui/alert";
import {
  Loader2,
  AlertTriangle,
  Flame,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*                                Types                               */
/* ------------------------------------------------------------------ */

interface MonthlyData {
  date: string;
  count: number;
}
interface ApiResponse {
  data: MonthlyData[];
}

/* ------------------------------------------------------------------ */
/*                           Helper Banners                           */
/* ------------------------------------------------------------------ */

function StatusBanner({
  loading,
  error,
  label,
}: {
  loading: boolean;
  error: string | null;
  label: string;
}) {
  if (loading)
    return (
      <div className="flex items-center gap-3 p-4 bg-orange-50 border border-orange-200 rounded-lg text-orange-700 animate-pulse">
        <Loader2 className="h-5 w-5 animate-spin" />
        <p className="font-medium">Fetching data for “{label}”…</p>
      </div>
    );

  if (error)
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-5 w-5" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );

  return null;
}

function AwaitBanner({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <div className="flex items-center justify-center h-full text-gray-500">
      Awaiting your info
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*                           Main Component                           */
/* ------------------------------------------------------------------ */

export default function Home() {
  /* ---- inputs ---- */
  const [company, setCompany] = useState("");
  const [domain, setDomain] = useState("");

  /* ---- chart / state ---- */
  const [chartData, setChartData] = useState<MonthlyData[]>([]);
  const [chartTitle, setChartTitle] = useState("");
  const [keyword, setKeyword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* ---- generic fetch ---- */
  async function run(
    path: string,
    body: Record<string, unknown>,
    title: string,
    label: string,
  ) {
    /* set title/keyword immediately so UI updates during loading */
    setChartTitle(title);
    setKeyword(label);

    setLoading(true);
    setError(null);
    setChartData([]);

    try {
      const res = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`${res.status}: ${res.statusText}`);

      const json: ApiResponse = await res.json();
      setChartData(json.data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  /* ---- handlers ---- */
  const handleMentions = () => {
    if (!company) return;
    run(
      "/api/monthly",
      { keyword: company },
      `Deep and Dark Web Mentions for “${company}”`,
      company,
    );
  };

  const handleCreds = () => {
    if (!domain) return;
    run(
      "/api/credentials",
      { domain },
      `Exposed Credentials for “${domain}”`,
      domain,
    );
  };

  /* ------------------------------------------------------------------ */
  /*                                JSX                                */
  /* ------------------------------------------------------------------ */
  return (
    <>
      <Head>
        <title>Flashpoint Threat Snapshot</title>
      </Head>

      <div className="min-h-screen bg-white py-12 px-4 sm:px-6 lg:px-8">
        <Card className="max-w-7xl mx-auto border-0 shadow-sm">
          {/* header */}
          <CardHeader className="border-b pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-gray-900 text-white">
                <Flame className="h-5 w-5" />
              </div>
              <CardTitle className="text-3xl font-extrabold text-gray-800">
                Threat Snapshot by Flashpoint
              </CardTitle>
            </div>
          </CardHeader>

          {/* content */}
          <CardContent className="p-0">
            <div className="flex flex-col lg:flex-row">
              {/* left 33 % */}
              <div className="lg:w-1/3 w-full p-6 space-y-6 border-r">
                {/* company name */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold">Company Name</label>
                  <Input
                    placeholder="Flashpoint"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                  />
                  <Button
                    disabled={loading}
                    onClick={handleMentions}
                    className={`w-full text-white ${
                      loading
                        ? "bg-orange-600/50"
                        : "bg-orange-600 hover:bg-orange-700"
                    }`}
                  >
                    Check Your Companyʼs Deep & Dark Web Mentions
                  </Button>
                </div>

                {/* email domain */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold">Company Email Domain</label>
                  <Input
                    placeholder="flashpoint.io"
                    value={domain}
                    onChange={(e) => setDomain(e.target.value)}
                  />
                  <Button
                    disabled={loading}
                    onClick={handleCreds}
                    className={`w-full text-white ${
                      loading ? "bg-gray-900/50" : "bg-gray-900 hover:bg-gray-800"
                    }`}
                  >
                    Check Number of Exposed Credentials
                  </Button>
                </div>
              </div>

              {/* right 66 % */}
              <div className="lg:w-2/3 w-full p-6 space-y-6 min-h-[420px]">
                <StatusBanner loading={loading} error={error} label={keyword} />

                {chartData.length > 0 && !loading && (
                  <ThreatChart data={chartData} keyword={keyword} title={chartTitle} />
                )}

                <AwaitBanner show={keyword === ""} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
