"use client";

import { useState } from "react";
import QueryForm from "@/components/QueryForm";
import ThreatChart from "@/components/ThreatChart";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import {
  Alert,
  AlertTitle,
  AlertDescription,
} from "@/components/ui/alert";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import {
  BarChart3,
  InfoIcon,
  AlertTriangle,
  Loader2,
} from "lucide-react";

interface MonthlyData {
  date: string; // YYYY-MM
  count: number;
}

interface ApiResponse {
  data: MonthlyData[];
}

type TabKey = "keyword" | "credentials";

export default function Home() {
  /* ------------------------------------------------------------------
   * Generic tab state
   * ------------------------------------------------------------------ */
  const [activeTab, setActiveTab] = useState<TabKey>("keyword");

  /* ------------------------------------------------------------------
   * Keyword tab state
   * ------------------------------------------------------------------ */
  const [kwChartData, setKwChartData] = useState<MonthlyData[]>([]);
  const [kwLoading, setKwLoading] = useState<boolean>(false);
  const [kwError, setKwError] = useState<string | null>(null);
  const [currentKeyword, setCurrentKeyword] = useState<string>("");

  /* ------------------------------------------------------------------
   * Credentials tab state
   * ------------------------------------------------------------------ */
  const [credChartData, setCredChartData] = useState<MonthlyData[]>([]);
  const [credLoading, setCredLoading] = useState<boolean>(false);
  const [credError, setCredError] = useState<string | null>(null);
  const [currentDomain, setCurrentDomain] = useState<string>("");

  /* ------------------------------------------------------------------
   * Handlers
   * ------------------------------------------------------------------ */
  const handleKeywordSearch = async ({
    keyword,
  }: {
    keyword: string;
  }): Promise<void> => {
    setCurrentKeyword(keyword);
    setKwLoading(true);
    setKwError(null);
    setKwChartData([]);

    try {
      const res = await fetch("/api/monthly", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword }),
      });

      if (!res.ok) {
        throw new Error(`Failed to fetch keyword data (status ${res.status}).`);
      }

      const json: ApiResponse = await res.json();
      setKwChartData(json.data);
    } catch (err: unknown) {
      setKwError(err instanceof Error ? err.message : "Unknown error.");
    } finally {
      setKwLoading(false);
    }
  };

  const handleCredentialSearch = async ({
    keyword: domain,
  }: {
    keyword: string; // QueryForm still returns { keyword }
  }): Promise<void> => {
    setCurrentDomain(domain);
    setCredLoading(true);
    setCredError(null);
    setCredChartData([]);

    try {
      const res = await fetch("/api/credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain }),
      });

      if (!res.ok) {
        throw new Error(
          `Failed to fetch credential data (status ${res.status}).`,
        );
      }

      const json: ApiResponse = await res.json();
      setCredChartData(json.data);
    } catch (err: unknown) {
      setCredError(err instanceof Error ? err.message : "Unknown error.");
    } finally {
      setCredLoading(false);
    }
  };

  /* ------------------------------------------------------------------
   * Render helpers
   * ------------------------------------------------------------------ */
  const renderStatus = (
    loading: boolean,
    error: string | null,
    queryLabel: string,
  ) => {
    if (loading) {
      return (
        <div className="flex items-center justify-center space-x-3 text-primary p-4 bg-primary/5 rounded-lg border border-primary/20 animate-pulse">
          <Loader2 className="animate-spin h-5 w-5" />
          <p className="font-medium">Fetching data for “{queryLabel}”…</p>
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

  const renderNoData = (loading: boolean, error: string | null) => {
    if (!loading && !error) {
      return (
        <Alert className="bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
          <InfoIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          <AlertTitle className="font-semibold text-blue-800 dark:text-blue-300">
            No Data
          </AlertTitle>
          <AlertDescription className="text-blue-700 dark:text-blue-400">
            Submit a query above to retrieve the last 12 months of results.
          </AlertDescription>
        </Alert>
      );
    }
    return null;
  };

  /* ------------------------------------------------------------------
   * Main JSX
   * ------------------------------------------------------------------ */
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        <Card className="border-0 shadow-lg dark:bg-slate-950">
          {/* ───────── Header ───────── */}
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
                  Monthly Deep &amp; Dark Web Results
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          {/* ───────── Content ───────── */}
          <CardContent className="p-6">
            <Tabs
              defaultValue="keyword"
              value={activeTab}
              onValueChange={(val) => setActiveTab(val as TabKey)}
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="keyword">Keyword</TabsTrigger>
                <TabsTrigger value="credentials">Credentials</TabsTrigger>
              </TabsList>

              {/* ─────── Keyword Tab ─────── */}
              <TabsContent value="keyword" className="space-y-6">
                <div className="bg-card rounded-lg p-4 border shadow-sm">
                  <QueryForm
                    onSubmit={handleKeywordSearch}
                    placeholder="Enter keyword..."
                  />
                </div>

                {renderStatus(kwLoading, kwError, currentKeyword)}

                {kwChartData.length > 0 && (
                  <ThreatChart data={kwChartData} keyword={currentKeyword} />
                )}

                {renderNoData(kwLoading, kwError)}
              </TabsContent>

              {/* ─────── Credentials Tab ─────── */}
              <TabsContent value="credentials" className="space-y-6">
                <div className="bg-card rounded-lg p-4 border shadow-sm">
                  <QueryForm
                    onSubmit={handleCredentialSearch}
                    placeholder="Enter email domain (e.g., example.com)…"
                  />
                </div>

                {renderStatus(credLoading, credError, currentDomain)}

                {credChartData.length > 0 && (
                  <ThreatChart data={credChartData} keyword={currentDomain} />
                )}

                {renderNoData(credLoading, credError)}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
