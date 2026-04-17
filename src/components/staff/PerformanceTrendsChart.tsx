import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartConfig } from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, CartesianGrid } from "recharts";
import { TrendingUp } from "lucide-react";

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--accent-foreground))",
  "#06b6d4",
  "#f59e0b",
  "#10b981",
  "#8b5cf6",
  "#ef4444",
  "#ec4899",
];

interface Props {
  summaries: any[];
  profiles: any[];
  profileMap: Record<string, any>;
  trendStaff: string;
  setTrendStaff: (v: string) => void;
  trendPeriod: string;
  setTrendPeriod: (v: string) => void;
  isExecutive: boolean;
  isCeo: boolean;
  userId?: string;
}

export default function PerformanceTrendsChart({
  summaries, profiles, profileMap, trendStaff, setTrendStaff,
  trendPeriod, setTrendPeriod, isExecutive, isCeo, userId,
}: Props) {

  const { chartData, chartConfig, staffIds } = useMemo(() => {
    const filtered = summaries.filter((s: any) => {
      if (s.period_type !== trendPeriod) return false;
      if (trendStaff && s.staff_id !== trendStaff) return false;
      if (!isExecutive && !isCeo && s.staff_id !== userId) return false;
      return true;
    });

    // Get unique staff and periods
    const staffSet = new Set<string>();
    const periodSet = new Set<string>();
    filtered.forEach((s: any) => {
      staffSet.add(s.staff_id);
      periodSet.add(s.period_key);
    });

    const staffIds = Array.from(staffSet);
    const periods = Array.from(periodSet).sort();

    // Build chart data: one row per period, one key per staff
    const chartData = periods.map((period) => {
      const row: any = { period };
      staffIds.forEach((sid) => {
        const record = filtered.find((s: any) => s.staff_id === sid && s.period_key === period);
        row[sid] = record ? Number(record.ceo_adjusted_grade ?? record.average_grade) : null;
      });
      return row;
    });

    // Build chart config
    const chartConfig: ChartConfig = {};
    staffIds.forEach((sid, i) => {
      chartConfig[sid] = {
        label: profileMap[sid]?.full_name || "Staff",
        color: COLORS[i % COLORS.length],
      };
    });

    return { chartData, chartConfig, staffIds };
  }, [summaries, trendPeriod, trendStaff, isExecutive, isCeo, userId, profileMap]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="font-heading flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />Performance Trends
          </CardTitle>
          <div className="flex gap-2">
            <select value={trendPeriod} onChange={(e) => setTrendPeriod(e.target.value)}
              className="rounded-md border border-input bg-background px-3 py-1.5 text-xs">
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
            </select>
            {(isCeo || isExecutive) && (
              <select value={trendStaff} onChange={(e) => setTrendStaff(e.target.value)}
                className="rounded-md border border-input bg-background px-3 py-1.5 text-xs">
                <option value="">All Staff</option>
                {profiles.map((p: any) => <option key={p.user_id} value={p.user_id}>{p.full_name}</option>)}
              </select>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-12">
            No {trendPeriod} performance data available yet.
          </p>
        ) : (
          <ChartContainer config={chartConfig} className="h-[350px] w-full">
            <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
              <XAxis dataKey="period" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} className="fill-muted-foreground" />
              <ChartTooltip content={<ChartTooltipContent />} />
              {staffIds.map((sid, i) => (
                <Line
                  key={sid}
                  type="monotone"
                  dataKey={sid}
                  name={profileMap[sid]?.full_name || "Staff"}
                  stroke={COLORS[i % COLORS.length]}
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                  connectNulls
                />
              ))}
            </LineChart>
          </ChartContainer>
        )}

        {/* Legend */}
        {staffIds.length > 1 && (
          <div className="flex flex-wrap gap-3 mt-4 justify-center">
            {staffIds.map((sid, i) => (
              <div key={sid} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                {profileMap[sid]?.full_name || "Staff"}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
