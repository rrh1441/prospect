"use client";

import { useState } from "react";
import QueryForm from "@/components/QueryForm";
import ThreatChart from "@/components/ThreatChart";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import {
  InfoIcon,
  AlertTriangle,
  Loader2,
  BarChart3,
} from "lucide-react";

interface MonthlyData {
  date: string; // "YYYY-MM"
  count: number;
}

interface ApiResponse {
  data: MonthlyData[];
}

const Home: React.FC = () => {
  const [chartData, setChartData] = useState<MonthlyData[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [currentKeyword, setCurrentKeyword] = useState<string>("");

  const handleMonthlySearch = async ({
    keyword,
  }: {
    keyword: string;
  }): Promise<void> => {
    setCurrentKeyword(keyword);
    setLoading(true);
    setError(null);
    setChartData([]);

    try {
      const response = await fetch("/api/monthly", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword }),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch data. Status=${response.status}`);
      }

      const json: ApiResponse = await response.json();
      setChartData(json.data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An unknown error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        <Card className="border-0 shadow-lg dark:bg-slate-950">
          <CardHeader className="pb-4 border-b">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-primary/10 text-primary">
                <BarChart3 className="h-6 w-6" />
              </div>
              <div>
                <CardTitle className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/70">
                  Threat Intelligence Dashboard
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                  Monthly Deep and Dark Web Results
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-6 space-y-6">
            <div className="bg-card rounded-lg p-4 border shadow-sm">
              <QueryForm
                onSubmit={handleMonthlySearch}
                placeholder="Enter keyword for monthly search..."
              />
            </div>

            {loading && (
              <div className="flex items-center justify-center space-x-3 text-primary p-4 bg-primary/5 rounded-lg border border-primary/20 animate-pulse">
                <Loader2 className="animate-spin h-5 w-5" />
                <p className="font-medium">
                  Fetching monthly data for &quot;{currentKeyword}&quot;…
                </p>
              </div>
            )}

            {error && (
              <Alert variant="destructive" className="border border-destructive/20">
                <AlertTriangle className="h-5 w-5" />
                <AlertTitle className="font-semibold">Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {chartData.length > 0 && (
              <div className="mt-6">
                <ThreatChart data={chartData} keyword={currentKeyword} />
              </div>
            )}

            {!loading && !error && chartData.length === 0 && (
              <Alert className="bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800 mt-6">
                <InfoIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                <AlertTitle className="font-semibold text-blue-800 dark:text-blue-300">
                  No Data
                </AlertTitle>
                <AlertDescription className="text-blue-700 dark:text-blue-400">
                  Enter a keyword above to analyze threat data for the last 12 months.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Home;
