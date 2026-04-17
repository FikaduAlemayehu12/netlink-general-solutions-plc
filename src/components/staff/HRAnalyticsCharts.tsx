import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";

const COLORS = ["#2563eb", "#16a34a", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16"];

interface Props {
  profiles: any[];
  userRoles: Record<string, string[]>;
  employeeProfiles: any[];
  qualifications: any[];
  letters: any[];
  attendance: any[];
}

export default function HRAnalyticsCharts({ profiles, userRoles, employeeProfiles, qualifications, letters, attendance }: Props) {
  const deptData = useMemo(() => {
    const counts: Record<string, number> = {};
    employeeProfiles.forEach(ep => {
      const dept = ep.department || "Unassigned";
      counts[dept] = (counts[dept] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [employeeProfiles]);

  const qualData = useMemo(() => {
    const counts: Record<string, number> = {};
    qualifications.forEach(q => {
      counts[q.qualification_type] = (counts[q.qualification_type] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [qualifications]);

  const hiringData = useMemo(() => {
    const monthly: Record<string, number> = {};
    employeeProfiles.forEach(ep => {
      if (ep.hiring_date) {
        const m = ep.hiring_date.substring(0, 7);
        monthly[m] = (monthly[m] || 0) + 1;
      }
    });
    return Object.entries(monthly).sort().slice(-12).map(([month, count]) => ({ month: month.substring(5), count }));
  }, [employeeProfiles]);

  const letterStatusData = useMemo(() => {
    const counts: Record<string, number> = {};
    letters.forEach(l => {
      const s = l.status || "draft";
      counts[s] = (counts[s] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name: name.replace(/_/g, " "), value }));
  }, [letters]);

  return (
    <div className="grid md:grid-cols-2 gap-4">
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Department Headcount</CardTitle></CardHeader>
        <CardContent className="h-[220px]">
          {deptData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={deptData}>
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="value" fill="var(--primary, #2563eb)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="text-sm text-muted-foreground text-center pt-12">No department data</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Qualification Distribution</CardTitle></CardHeader>
        <CardContent className="h-[220px]">
          {qualData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={qualData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, value }) => `${name} (${value})`}>
                  {qualData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : <p className="text-sm text-muted-foreground text-center pt-12">No qualification data</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Hiring Trends (Monthly)</CardTitle></CardHeader>
        <CardContent className="h-[220px]">
          {hiringData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={hiringData}>
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="var(--primary, #2563eb)" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : <p className="text-sm text-muted-foreground text-center pt-12">No hiring data</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Experience Letter Status</CardTitle></CardHeader>
        <CardContent className="h-[220px]">
          {letterStatusData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={letterStatusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, value }) => `${name} (${value})`}>
                  {letterStatusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : <p className="text-sm text-muted-foreground text-center pt-12">No letter data</p>}
        </CardContent>
      </Card>
    </div>
  );
}
