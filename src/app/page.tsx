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

/* ───── helper components ───── */
const StatusBanner = ({
  loading,
  error,
  label,
}: {
  loading: boolean;
  error: string | null;
  label: string;
}) => {
  if (loading) {
    return (
      <div className="flex items-center gap-3 p-4 bg-primary/5 border border-primary/20 rounded-lg text-primary animate-pulse">
        <Loader2 className="h-5 w-5 animate-spin" />
        <p className="font-medium">
          Fetching data for “{label}”…
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className="border border-destructive/20">
        <AlertTriangle className="h-5 w-5" />
        <AlertTitle className="font-semibold">Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return null;
};

const NoDataBanner = ({
  loading,
  error,
}: {
  loading: boolean;
  error: string | null;
}) =>
  !loading && !error ? (
    <Alert className="bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
      <InfoIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
      <AlertTitle className="font-semibold text-blue-800 dark:text-blue-300">
        No Data
      </AlertTitle>
      <AlertDescription className="text-blue-700 dark:text-blue-400">
        Enter a company name or email domain and click one of the actions.
      </AlertDescription>
    </Alert>
  ) : null;

/* ───── main component ───── */
export default function Home() {
  const [input, setInput] = useState("");

  const [chartData, setChartData] = useState<MonthlyData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentLabel, setCurrentLabel] = useState("");

  /* ─── generic fetch helper ─── */
  const runQuery = async (path: string, body: Record<string, unknown>) => {
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
  };

  /* ─── button handlers ─── */
  const handleMentions = () => {
    if (!input) return;
    setCurrentLabel(input);
    runQuery("/api/monthly", { keyword: input });
  };

  const handleCredentials = () => {
    if (!input) return;
    setCurrentLabel(input);
    runQuery("/api/credentials", { domain: input });
  };

  /* ───── JSX ───── */
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="max-w-7xl mx-auto border-0 shadow-lg dark:bg-slate-950">
        {/* ─ header ─ */}
        <CardHeader className="border-b pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-primary/10 text-primary">
              <BarChart3 className="h-6 w-6" />
            </div>
            <div>
              <CardTitle className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/70">
                Threat Intelligence Dashboard
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                Deep &amp; Dark Web Insights
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        {/* ─ content ─ */}
        <CardContent className="p-0">
          <div className="flex flex-col lg:flex-row">
            {/* left column 25 % */}
            <div className="lg:w-1/4 w-full border-r p-6 space-y-6">
              <div className="space-y-2">
                <label
                  htmlFor="companyInput"
                  className="block text-sm font-semibold"
                >
                  Company Name or Email Domain
                </label>
                <Input
                  id="companyInput"
                  placeholder="Flashpoint   |   flashpoint.io"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                />
              </div>

              <Button
                className="w-full"
                onClick={handleMentions}
                disabled={loading || !input}
              >
                Check Your Companyʼs Deep and Dark Web Mentions
              </Button>

              <Button
                variant="secondary"
                className="w-full"
                onClick={handleCredentials}
                disabled={loading || !input}
              >
                Check Number of Exposed Employee Credentials
              </Button>
            </div>

            {/* right column 75 % */}
            <div className="lg:w-3/4 w-full p-6 space-y-6">
              <StatusBanner
                loading={loading}
                error={error}
                label={currentLabel}
              />

              {chartData.length > 0 && (
                <ThreatChart data={chartData} keyword={currentLabel} />
              )}

              <NoDataBanner loading={loading} error={error} />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
