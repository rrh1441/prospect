"use client";

import { useRef } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Label,
} from "recharts";
import {
  Card,
  CardHeader,
  CardContent,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DownloadIcon,
  ImageIcon,
  ExternalLink,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*                              Typing                                */
/* ------------------------------------------------------------------ */

interface DataPoint {
  date: string; // always "YYYY-MM"
  count: number;
}

interface ThreatChartProps {
  data: DataPoint[];
  keyword?: string;
}

/* ------------------------------------------------------------------ */
/*                         Helper Components                          */
/* ------------------------------------------------------------------ */

/** Small label printed above each point. Props are optional because Recharts
 *  instantiates the element with {} at compile-time, then injects real props
 *  at runtime. */
type PointLabelProps = {
  x?: number;
  y?: number;
  value?: string | number;
};

const PointLabel: React.FC<PointLabelProps> = ({ x, y, value }) =>
  x !== undefined && y !== undefined ? (
    <text
      x={x}
      y={y}
      dy={-8}
      fill="#000"
      fontSize={12}
      textAnchor="middle"
    >
      {value}
    </text>
  ) : null;

/** Convert "YYYY-MM" → "Jun 24" */
const formatTick = (ym: string): string => {
  const [y, m] = ym.split("-");
  const d = new Date(Number(y), Number(m) - 1, 1);
  return d.toLocaleDateString("en-US", {
    month: "short",
    year: "2-digit",
  });
};

/* ------------------------------------------------------------------ */
/*                          Main Component                            */
/* ------------------------------------------------------------------ */

export default function ThreatChart({ data, keyword }: ThreatChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);

  /* ------------- PNG export ------------- */
  const exportPng = (): void => {
    const svg = chartRef.current?.querySelector("svg");
    if (!svg) return;

    const svgString = new XMLSerializer().serializeToString(svg);
    const { width, height } = svg.getBoundingClientRect();
    const headerH = 40;

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height + headerH;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (keyword) {
      ctx.font = "16px Arial";
      ctx.fillStyle = "#000";
      ctx.textAlign = "center";
      ctx.fillText(`Keyword: ${keyword}`, canvas.width / 2, 20);
    }

    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 0, headerH);
      const png = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.download = "threat_chart.png";
      link.href = png;
      link.click();
    };
    img.src =
      "data:image/svg+xml;base64," +
      btoa(unescape(encodeURIComponent(svgString)));
  };

  /* ------------- CSV export ------------- */
  const exportCsv = (): void => {
    const header = keyword ? `Keyword: ${keyword}\n` : "";
    const rows = data.map((r) => `${r.date},${r.count}`).join("\n");
    const blob = new Blob(
      [`${header}Date,Count\n${rows}`],
      { type: "text/csv;charset=utf-8;" },
    );
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "threat_data.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  /* ------------- Render ------------- */
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          Deep and Dark Web Mentions{" "}
          {keyword ? `for “${keyword}”` : ""}
        </CardTitle>
        <CardDescription>
          Monthly count over last 12 months
        </CardDescription>
      </CardHeader>

      <CardContent>
        {/* Chart */}
        <div ref={chartRef} className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={data}
              margin={{ top: 20, right: 30, left: 60, bottom: 60 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tickFormatter={formatTick}
                angle={-45}
                textAnchor="end"
                interval={0}
                dy={16}
                padding={{ left: 20, right: 20 }}
              >
                <Label
                  value="Date"
                  offset={-5}
                  position="insideBottom"
                />
              </XAxis>
              <YAxis>
                <Label
                  value="Count"
                  angle={-90}
                  position="insideLeft"
                  dy={-40}
                />
              </YAxis>
              <Tooltip />
              <Line
                type="monotone"
                dataKey="count"
                stroke="#2563eb"
                strokeWidth={2}
                dot={{ r: 4 }}
                label={<PointLabel />}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Actions */}
        <div className="mt-4 flex flex-wrap gap-2 justify-end">
          <Button
            variant="outline"
            onClick={exportPng}
            className="flex items-center gap-2"
          >
            <ImageIcon className="h-4 w-4" />
            Export as PNG
          </Button>

          <Button
            variant="outline"
            onClick={exportCsv}
            className="flex items-center gap-2"
          >
            <DownloadIcon className="h-4 w-4" />
            Export as CSV
          </Button>

          <Button
            variant="link"
            asChild
            className="text-orange-600 hover:text-orange-700 flex items-center gap-1"
          >
            <a
              href="https://www.flashpoint.io/demo/"
              target="_blank"
              rel="noopener noreferrer"
            >
              Do a Deep Dive
              <ExternalLink className="h-4 w-4" />
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
