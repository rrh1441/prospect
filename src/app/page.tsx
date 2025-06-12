"use client";

import { useState } from "react";
import ThreatChart from "@/components/ThreatChart";
import {
  Card,
  CardHeader,
  CardContent,
  CardTitle,
  CardDescription,
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
  InfoIcon,
  BarChart3,
} from "lucide-react";

/* ───── types ───── */
interface MonthlyData {
  date: string;
  count: number;
}
interface ApiResponse {
  data: MonthlyData[];
}

/* ───── helper banners ───── */
function Status({
  loading,
  error,
  label,
}: {
  loading: boolean;
  error: string | null;
  label: string;
}) {
  if (loading) {
    return (
      <div className="flex items-center gap-3 p-4 bg-orange-50 border border-orange-200 rounded-lg text-orange-700 animate-pulse">
        <Loader2 className="h-5 w-5 animate-spin" />
        <p className="font-medium">Fetching data for “{label}”…</p>
      </div>
    );
  }
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-5 w-5" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }
  return null;
}
function NoData({ loading, error }: { loading: boolean; error: string | null }) {
  if (loading || error) return null;
  return (
    <Alert className="bg-blue-50 border-blue-200">
      <InfoIcon className="h-5 w-5 text-blue-600" />
      <AlertTitle>No Data</AlertTitle>
      <AlertDescription>
        Enter a company name or email domain, then click an action.
      </AlertDescription>
    </Alert>
  );
}

/* ───── main component ───── */
export default function Home() {
  /* inputs */
  const [company, setCompany] = useState("");
  const [domain, setDomain] = useState("");

  /* chart state */
  const [chartData, setChart] = useState<MonthlyData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [label, setLabel] = useState("");

  /* generic fetch helper */
  async function run(path: string, body: Record<string, unknown>) {
    setLoading(true);
    setError(null);
    setChart([]);
    try {
      const res = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`${res.status}: ${res.statusText}`);
      const json: ApiResponse = await res.json();
      setChart(json.data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  /* handlers */
  const handleMentions = () => {
    if (!company) return;
    setLabel(company);
    run("/api/monthly", { keyword: company });
  };
  const handleCreds = () => {
    if (!domain) return;
    setLabel(domain);
    run("/api/credentials", { domain });
  };

  /* JSX */
  return (
    <div className="min-h-screen bg-white py-12 px-4 sm:px-6 lg:px-8">
      <Card className="max-w-7xl mx-auto border-0 shadow-sm">
        {/* header */}
        <CardHeader className="border-b pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-gray-900 text-white">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-3xl font-extrabold text-gray-800">
                Threat Intelligence Dashboard
              </CardTitle>
              <CardDescription className="text-gray-500">
                Deep &amp; Dark Web Insights
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        {/* content */}
        <CardContent className="p-0">
          <div className="flex flex-col lg:flex-row">
            {/* left 25 % */}
            <div className="lg:w-1/4 w-full p-6 space-y-6 border-r">
              {/* company name */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold">
                  Company Name
                </label>
                <Input
                  placeholder="Flashpoint"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                />
                <Button
                  disabled={loading || !company}
                  onClick={handleMentions}
                  className="w-full bg-orange-600 hover:bg-orange-700 text-white"
                >
                  Check Your Companyʼs Deep &amp; Dark Web Mentions
                </Button>
              </div>

              {/* email domain */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold">
                  Company Email Domain
                </label>
                <Input
                  placeholder="flashpoint.io"
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                />
                <Button
                  variant="secondary"
                  disabled={loading || !domain}
                  onClick={handleCreds}
                  className="w-full bg-gray-900 hover:bg-gray-800 text-white"
                >
                  Check Number of Exposed Employee Credentials
                </Button>
              </div>
            </div>

            {/* right 75 % */}
            <div className="lg:w-3/4 w-full p-6 space-y-6">
              <Status loading={loading} error={error} label={label} />

              {chartData.length > 0 && (
                <ThreatChart data={chartData} keyword={label} />
              )}

              <NoData loading={loading} error={error} />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
