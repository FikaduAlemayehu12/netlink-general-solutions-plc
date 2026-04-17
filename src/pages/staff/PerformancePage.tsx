import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Trophy, Award, Star, TrendingUp, BarChart3, AlertTriangle, CheckCircle, Shield, Calendar, LineChart, Scale } from "lucide-react";
import { format, getISOWeek } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import StaffLayout from "@/components/staff/StaffLayout";
import PlanPerformanceTracker from "@/components/staff/PlanPerformanceTracker";
import PerformanceTrendsChart from "@/components/staff/PerformanceTrendsChart";
import WeightedPerformanceCard from "@/components/staff/WeightedPerformanceCard";
import { getQuarterKey, getWeekKey, getMonthKey } from "@/lib/performance-utils";
import { calculateWeightedPerformance, calculateAllStaffPerformance, type WeightedScore } from "@/lib/weighted-performance";

const currentQuarter = () => getQuarterKey(new Date());

export default function PerformancePage() {
  const { isExecutive, isCeo, user, roles } = useAuth();
  const isHR = roles.includes("hr");
  const canAssignPoints = isCeo || isHR;

  const [profiles, setProfiles] = useState<any[]>([]);
  const [scores, setScores] = useState<any[]>([]);
  const [winner, setWinner] = useState<any>(null);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [assignForm, setAssignForm] = useState({ staff_id: "", points: "", notes: "" });
  const [winnerForm, setWinnerForm] = useState({ winner_id: "", message: "" });
  const [loading, setLoading] = useState(true);
  const [myScores, setMyScores] = useState({ daily: 0, weekly: 0, quarterly: 0, total: 0 });
  const [perfRecords, setPerfRecords] = useState<any[]>([]);
  const [summaries, setSummaries] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState("overview");
  const [staffFilter, setStaffFilter] = useState("");
  const [recordStatusFilter, setRecordStatusFilter] = useState<"all" | "pending" | "approved" | "flagged">("all");
  const [periodFilter, setPeriodFilter] = useState("weekly");
  const [trendStaff, setTrendStaff] = useState("");
  const [trendPeriod, setTrendPeriod] = useState("weekly");
  const [myWeighted, setMyWeighted] = useState<WeightedScore | null>(null);
  const [allWeighted, setAllWeighted] = useState<any[]>([]);
  const [weightedMonth, setWeightedMonth] = useState(format(new Date(), "yyyy-MM"));

  useEffect(() => {
    loadData();
  }, [weightedMonth]);

  useEffect(() => {
    loadData();

    // Subscribe to realtime changes for live updates
    const perfChannel = supabase
      .channel('perf-records-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'plan_performance_records' }, () => {
        loadData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'performance_summaries' }, () => {
        loadData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'performance_scores' }, () => {
        loadData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'quarter_winners' }, () => {
        loadData();
      })
      .subscribe();

    return () => { supabase.removeChannel(perfChannel); };
  }, []);

  const loadData = async () => {
    const q = currentQuarter();
    const [profilesRes, scoresRes, winnerRes, perfRes, summaryRes] = await Promise.all([
      supabase.from("profiles").select("user_id, full_name, position, avatar_url").order("full_name"),
      supabase.from("performance_scores").select("*, staff:profiles!performance_scores_staff_id_fkey(full_name, position, avatar_url), assigner:profiles!performance_scores_assigned_by_fkey(full_name)").eq("quarter", q).order("created_at", { ascending: false }),
      supabase.from("quarter_winners").select("*, winner:profiles!quarter_winners_winner_id_fkey(full_name, position, avatar_url)").eq("quarter", q).maybeSingle(),
      supabase.from("plan_performance_records").select("*, plan:plans!plan_performance_records_plan_id_fkey(title)").order("created_at", { ascending: false }).limit(100),
      supabase.from("performance_summaries").select("*").order("period_key", { ascending: false }).limit(200),
    ]);
    setProfiles(profilesRes.data || []);
    setScores(scoresRes.data || []);
    if (winnerRes.data) setWinner(winnerRes.data);

    // Enrich performance records with staff names
    const profileMap = Object.fromEntries((profilesRes.data || []).map((p: any) => [p.user_id, p]));
    const enrichedRecords = (perfRes.data || []).map((r: any) => ({
      ...r,
      staff_name: profileMap[r.staff_id]?.full_name || "Unknown",
      plan_title: r.plan?.title || null,
    }));
    setPerfRecords(enrichedRecords);
    setSummaries(summaryRes.data || []);

    // Build leaderboard from summaries (quarterly) or fallback to scores
    const quarterlySummaries = (summaryRes.data || []).filter((s: any) => s.period_type === "quarterly" && s.period_key === q);
    if (quarterlySummaries.length > 0) {
      const board = quarterlySummaries
        .sort((a: any, b: any) => Number(b.average_grade) - Number(a.average_grade))
        .map((s: any, idx: number) => ({
          uid: s.staff_id,
          profile: profileMap[s.staff_id],
          total: Number(s.average_grade),
          rank: idx + 1,
          isGrade: true,
        }));
      setLeaderboard(board);
    } else {
      // Fallback to points-based leaderboard
      const totals: Record<string, { profile: any; total: number }> = {};
      for (const s of scoresRes.data || []) {
        if (!totals[s.staff_id]) totals[s.staff_id] = { profile: s.staff, total: 0 };
        totals[s.staff_id].total += s.points;
      }
      const board = Object.entries(totals).sort((a, b) => b[1].total - a[1].total).map(([uid, v], idx) => ({ uid, ...v, rank: idx + 1 }));
      setLeaderboard(board);
    }

    // My performance
    if (user) {
      const [dailyRes, weeklyRes, quarterlyRes] = await Promise.all([
        supabase.from("plans").select("id, plan_reactions(reaction)").eq("author_id", user.id).eq("plan_type", "daily"),
        supabase.from("plans").select("id, plan_reactions(reaction)").eq("author_id", user.id).eq("plan_type", "weekly"),
        supabase.from("plans").select("id, plan_reactions(reaction)").eq("author_id", user.id).eq("plan_type", "quarterly"),
      ]);
      const countApprovals = (data: any[]) => (data || []).reduce((sum, p) => sum + (p.plan_reactions || []).filter((r: any) => r.reaction === "approve").length, 0);
      const mySummary = quarterlySummaries.find((s: any) => s.staff_id === user.id);
      setMyScores({
        daily: countApprovals(dailyRes.data || []),
        weekly: countApprovals(weeklyRes.data || []),
        quarterly: countApprovals(quarterlyRes.data || []),
        total: mySummary ? Number(mySummary.average_grade) : 0,
      });
      // Calculate weighted performance for current user
      const monthDate = new Date(weightedMonth + "-01");
      const weighted = await calculateWeightedPerformance(user.id, monthDate);
      setMyWeighted(weighted);
    }

    // If executive, calculate all staff weighted scores
    if (isExecutive || isCeo) {
      const monthDate = new Date(weightedMonth + "-01");
      const all = await calculateAllStaffPerformance(monthDate);
      setAllWeighted(all);
    }

    setLoading(false);
  };

  const assignPoints = async () => {
    if (!assignForm.staff_id || !assignForm.points) return;
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return;
    await supabase.from("performance_scores").insert({
      staff_id: assignForm.staff_id, assigned_by: authUser.id,
      points: parseInt(assignForm.points), quarter: currentQuarter(), notes: assignForm.notes,
    });
    await supabase.from("notifications").insert({ user_id: assignForm.staff_id, type: "points", title: "Performance Points Awarded 🎉", message: `You received ${assignForm.points} points for ${currentQuarter()}` });
    setAssignForm({ staff_id: "", points: "", notes: "" });
    loadData();
  };

  const announceWinner = async () => {
    if (!winnerForm.winner_id) return;
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return;
    const q = currentQuarter();
    await supabase.from("quarter_winners").upsert({ winner_id: winnerForm.winner_id, quarter: q, message: winnerForm.message, posted_by: authUser.id });
    await supabase.from("notifications").insert({ user_id: winnerForm.winner_id, type: "winner", title: "🏆 You are the Champion of the Quarter!", message: winnerForm.message });
    const allStaff = profiles.filter((p) => p.user_id !== winnerForm.winner_id);
    for (const p of allStaff) {
      await supabase.from("notifications").insert({ user_id: p.user_id, type: "winner_announce", title: "Champion Announced! 🏆", message: `The Champion of ${q} has been announced. Check your dashboard!` });
    }
    setWinnerForm({ winner_id: "", message: "" });
    loadData();
  };

  const autoSelectWinner = () => {
    if (leaderboard.length > 0) {
      setWinnerForm(f => ({ ...f, winner_id: leaderboard[0].uid }));
    }
  };

  // Staff performance summaries for CEO review
  const filteredSummaries = summaries.filter((s: any) => {
    if (staffFilter && s.staff_id !== staffFilter) return false;
    if (s.period_type !== periodFilter) return false;
    return true;
  });

  const profileMap = Object.fromEntries(profiles.map((p) => [p.user_id, p]));

  const rankColors = ["text-gold font-bold", "text-muted-foreground font-semibold", "text-cyan-brand font-semibold"];

  return (
    <StaffLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground">Performance</h1>
          <p className="text-muted-foreground text-sm">Achievement tracking & champion recognition · {currentQuarter()}</p>
        </div>

        {/* Champion Banner */}
        {winner && (
          <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
            className="relative overflow-hidden rounded-2xl gradient-brand p-8 text-primary-foreground shadow-glow">
            <div className="absolute inset-0 network-pattern opacity-20" />
            <div className="relative z-10 flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left">
              <div className="relative">
                <div className="w-24 h-24 rounded-full bg-primary-foreground/20 border-4 border-gold flex items-center justify-center text-4xl font-heading font-bold shadow-[0_0_30px_hsl(220_100%_65%/0.6)]">
                  {winner.winner?.avatar_url ? (
                    <img src={winner.winner.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                  ) : winner.winner?.full_name?.charAt(0)}
                </div>
                <div className="absolute -bottom-2 -right-2 bg-gold text-navy rounded-full p-1.5 text-lg">🏆</div>
              </div>
              <div>
                <div className="text-xs font-heading tracking-widest opacity-70 uppercase mb-1">🎉 Champion of {winner.quarter}</div>
                <div className="text-3xl font-heading font-bold">{winner.winner?.full_name}</div>
                <div className="text-primary-foreground/70">{winner.winner?.position}</div>
                {winner.message && <p className="text-primary-foreground/80 text-sm mt-2 max-w-lg">{winner.message}</p>}
                <div className="mt-3 inline-block px-4 py-1 rounded-full bg-gold/20 text-gold text-xs font-heading font-bold tracking-wider">
                  ⭐ CHAMPION OF THE QUARTER ⭐
                </div>
                <p className="text-primary-foreground/60 text-xs mt-2 max-w-md">
                  Congratulations for your outstanding commitment to the company's development. You are a role model for all colleagues!
                </p>
              </div>
            </div>
          </motion.div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full flex-wrap">
            <TabsTrigger value="overview" className="flex-1 gap-1"><BarChart3 className="w-3 h-3" />Overview</TabsTrigger>
            <TabsTrigger value="weighted" className="flex-1 gap-1"><Scale className="w-3 h-3" />Weighted</TabsTrigger>
            <TabsTrigger value="records" className="flex-1 gap-1"><TrendingUp className="w-3 h-3" />Plan Records</TabsTrigger>
            <TabsTrigger value="trends" className="flex-1 gap-1"><LineChart className="w-3 h-3" />Trends</TabsTrigger>
            <TabsTrigger value="summaries" className="flex-1 gap-1"><Calendar className="w-3 h-3" />Period Summaries</TabsTrigger>
            {canAssignPoints && <TabsTrigger value="manage" className="flex-1 gap-1"><Shield className="w-3 h-3" />Manage</TabsTrigger>}
          </TabsList>

          {/* OVERVIEW TAB */}
          <TabsContent value="overview" className="space-y-6">
            {/* My Performance */}
            <Card>
              <CardHeader>
                <CardTitle className="font-heading flex items-center gap-2"><BarChart3 className="w-5 h-5 text-primary" />My Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-4 gap-4">
                  {[
                    { label: "Daily Approvals", value: myScores.daily, color: "text-primary" },
                    { label: "Weekly Approvals", value: myScores.weekly, color: "text-cyan-brand" },
                    { label: "Quarterly Approvals", value: myScores.quarterly, color: "text-gold" },
                    { label: "Avg Grade", value: `${myScores.total}%`, color: "text-primary" },
                  ].map((s) => (
                    <div key={s.label} className="text-center p-4 rounded-xl bg-muted/50">
                      <div className={`text-3xl font-heading font-bold ${s.color}`}>{loading ? "—" : s.value}</div>
                      <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Leaderboard */}
            <Card>
              <CardHeader><CardTitle className="font-heading flex items-center gap-2"><Trophy className="w-5 h-5 text-gold" />Leaderboard – {currentQuarter()}</CardTitle></CardHeader>
              <CardContent>
                {loading ? <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-12 bg-muted rounded animate-pulse" />)}</div> :
                  leaderboard.length === 0 ? <p className="text-muted-foreground text-sm text-center py-6">No scores yet for this quarter.</p> :
                  <div className="space-y-2">
                    {leaderboard.map((entry) => (
                      <div key={entry.uid} className={`flex items-center gap-3 p-3 rounded-xl ${entry.rank === 1 ? "bg-gold/10 border border-gold/30" : "bg-muted/50"}`}>
                        <div className={`text-lg font-heading w-8 text-center ${rankColors[entry.rank - 1] || "text-foreground"}`}>
                          {entry.rank === 1 ? "🥇" : entry.rank === 2 ? "🥈" : entry.rank === 3 ? "🥉" : `#${entry.rank}`}
                        </div>
                        <div className="w-9 h-9 rounded-full gradient-brand flex items-center justify-center text-primary-foreground font-bold text-sm overflow-hidden">
                          {entry.profile?.avatar_url ? (
                            <img src={entry.profile.avatar_url} alt="" className="w-full h-full object-cover" />
                          ) : entry.profile?.full_name?.charAt(0)}
                        </div>
                        <div className="flex-1">
                          <div className="font-heading font-semibold text-sm text-foreground">{entry.profile?.full_name}</div>
                          <div className="text-xs text-muted-foreground">{entry.profile?.position}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-heading font-bold text-primary text-lg">
                            {(entry as any).isGrade ? `${entry.total}%` : entry.total}
                          </div>
                          <div className="text-xs text-muted-foreground">{(entry as any).isGrade ? "avg grade" : "pts"}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                }
              </CardContent>
            </Card>
          </TabsContent>

          {/* WEIGHTED PERFORMANCE TAB */}
          <TabsContent value="weighted" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-heading font-semibold text-foreground">Weighted Performance (Plans 25% · Projects 25% · Tickets 25% · Attendance 25%)</h3>
              <input
                type="month"
                value={weightedMonth}
                onChange={(e) => { setWeightedMonth(e.target.value); }}
                className="rounded-md border border-input bg-background px-3 py-1.5 text-xs"
              />
            </div>

            {/* My Score */}
            {myWeighted && (
              <WeightedPerformanceCard score={myWeighted} staffName="My Performance" />
            )}

            {/* All Staff (executive view) */}
            {(isExecutive || isCeo) && allWeighted.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="font-heading text-sm flex items-center gap-2">
                    <Scale className="w-4 h-4 text-primary" />All Staff Weighted Scores — {weightedMonth}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {allWeighted.map((staff: any, idx: number) => (
                    <div key={staff.user_id} className={`flex items-center gap-3 p-3 rounded-xl ${idx === 0 ? "bg-gold/10 border border-gold/30" : "bg-muted/50"}`}>
                      <div className="text-sm font-heading w-6 text-center font-bold text-muted-foreground">
                        {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `${idx + 1}`}
                      </div>
                      <div className="w-9 h-9 rounded-full gradient-brand flex items-center justify-center text-primary-foreground font-bold text-sm overflow-hidden">
                        {staff.avatar_url ? <img src={staff.avatar_url} alt="" className="w-full h-full object-cover" /> : staff.full_name?.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-heading font-semibold text-sm text-foreground truncate">{staff.full_name}</div>
                        <div className="text-[11px] text-muted-foreground">
                          P:{staff.plansScore}% · Proj:{staff.projectsScore}% · T:{staff.ticketsScore}% · A:{staff.attendanceScore}%
                        </div>
                      </div>
                      <div className={`font-heading font-bold text-lg ${staff.overallScore >= 80 ? "text-green-600" : staff.overallScore >= 60 ? "text-amber-600" : "text-destructive"}`}>
                        {staff.overallScore}%
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="records">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <CardTitle className="font-heading flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-primary" />Plan Performance Records
                    {isCeo && (
                      <Badge className="ml-2 bg-primary/10 text-primary border-0 text-[10px]">
                        {perfRecords.filter((r: any) => r.status === "pending").length} pending approval
                      </Badge>
                    )}
                  </CardTitle>
                  <div className="flex gap-1">
                    {(["all", "pending", "approved", "flagged"] as const).map((f) => (
                      <Button
                        key={f}
                        size="sm"
                        variant={recordStatusFilter === f ? "default" : "outline"}
                        onClick={() => setRecordStatusFilter(f)}
                        className="text-xs capitalize"
                      >
                        {f}
                      </Button>
                    ))}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <PlanPerformanceTracker
                  records={perfRecords.filter((r: any) => {
                    if (recordStatusFilter === "all") return true;
                    if (recordStatusFilter === "flagged") return r.flagged || r.achievement_pct < 60;
                    return r.status === recordStatusFilter;
                  })}
                  onRefresh={loadData}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* TRENDS TAB */}
          <TabsContent value="trends" className="space-y-4">
            <PerformanceTrendsChart
              summaries={summaries}
              profiles={profiles}
              profileMap={profileMap}
              trendStaff={trendStaff}
              setTrendStaff={setTrendStaff}
              trendPeriod={trendPeriod}
              setTrendPeriod={setTrendPeriod}
              isExecutive={isExecutive}
              isCeo={isCeo}
              userId={user?.id}
            />
          </TabsContent>

          {/* PERIOD SUMMARIES TAB */}
          <TabsContent value="summaries" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="font-heading flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-primary" />Performance Summaries
                  </CardTitle>
                  <div className="flex gap-2">
                    <select value={periodFilter} onChange={(e) => setPeriodFilter(e.target.value)}
                      className="rounded-md border border-input bg-background px-3 py-1.5 text-xs">
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                      <option value="quarterly">Quarterly</option>
                    </select>
                    {(isCeo || isExecutive) && (
                      <select value={staffFilter} onChange={(e) => setStaffFilter(e.target.value)}
                        className="rounded-md border border-input bg-background px-3 py-1.5 text-xs">
                        <option value="">All Staff</option>
                        {profiles.map((p) => <option key={p.user_id} value={p.user_id}>{p.full_name}</option>)}
                      </select>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {filteredSummaries.length === 0 ? (
                  <p className="text-muted-foreground text-sm text-center py-6">No {periodFilter} summaries yet.</p>
                ) : (
                  <div className="space-y-2">
                    {filteredSummaries.map((s: any) => {
                      const p = profileMap[s.staff_id];
                      const grade = Number(s.ceo_adjusted_grade ?? s.average_grade);
                      const isFlagged = grade < 60;
                      return (
                        <div key={s.id} className={`flex items-center gap-3 p-3 rounded-xl ${isFlagged ? "bg-destructive/5 border border-destructive/20" : "bg-muted/50"}`}>
                          <div className="w-9 h-9 rounded-full gradient-brand flex items-center justify-center text-primary-foreground font-bold text-sm overflow-hidden">
                            {p?.avatar_url ? <img src={p.avatar_url} alt="" className="w-full h-full object-cover" /> : p?.full_name?.charAt(0)}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-heading font-semibold text-sm text-foreground">{p?.full_name || "Unknown"}</span>
                              <Badge className="text-[10px] border-0 bg-muted text-muted-foreground">{s.period_key}</Badge>
                              {isFlagged && <AlertTriangle className="w-3.5 h-3.5 text-destructive" />}
                              {s.flagged_count > 0 && <Badge variant="destructive" className="text-[10px]">{s.flagged_count} flagged</Badge>}
                            </div>
                            <div className="text-xs text-muted-foreground">{s.total_plans} plans · {s.period_type}</div>
                            {s.ceo_notes && <p className="text-xs text-muted-foreground italic mt-0.5">{s.ceo_notes}</p>}
                          </div>
                          <div className="text-right">
                            <div className={`font-heading font-bold text-lg ${grade >= 80 ? "text-green-600" : grade >= 60 ? "text-amber-600" : "text-destructive"}`}>
                              {grade}%
                            </div>
                            <div className="text-xs text-muted-foreground">avg grade</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* MANAGE TAB (CEO/HR) */}
          {canAssignPoints && (
            <TabsContent value="manage" className="space-y-4">
              <div className="grid lg:grid-cols-2 gap-4">
                <Card className="border-primary/20">
                  <CardHeader><CardTitle className="font-heading text-sm flex items-center gap-2"><Star className="w-4 h-4 text-primary" />Assign Performance Points</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-1">
                      {assignForm.staff_id && profileMap[assignForm.staff_id] && (
                        <div className="flex items-center gap-2 p-2 rounded-md bg-muted/50 mb-1">
                          <div className="w-7 h-7 rounded-full gradient-brand flex items-center justify-center text-primary-foreground text-xs font-bold overflow-hidden">
                            {profileMap[assignForm.staff_id]?.avatar_url ? <img src={profileMap[assignForm.staff_id].avatar_url} alt="" className="w-full h-full object-cover" /> : profileMap[assignForm.staff_id]?.full_name?.charAt(0)}
                          </div>
                          <span className="text-sm font-medium text-foreground">{profileMap[assignForm.staff_id]?.full_name}</span>
                        </div>
                      )}
                      <select value={assignForm.staff_id} onChange={(e) => setAssignForm((f) => ({ ...f, staff_id: e.target.value }))}
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                        <option value="">Select staff member…</option>
                        {profiles.map((p) => <option key={p.user_id} value={p.user_id}>{p.full_name} – {p.position}</option>)}
                      </select>
                    </div>
                    <Input type="number" placeholder="Points (e.g. 10)" value={assignForm.points} onChange={(e) => setAssignForm((f) => ({ ...f, points: e.target.value }))} min={1} max={100} />
                    <Input placeholder="Notes (optional)" value={assignForm.notes} onChange={(e) => setAssignForm((f) => ({ ...f, notes: e.target.value }))} />
                    <Button onClick={assignPoints} className="w-full gradient-brand text-primary-foreground font-heading gap-2">
                      <Award className="w-4 h-4" />Assign Points
                    </Button>
                  </CardContent>
                </Card>

                {isCeo && (
                  <Card className="border-gold/30">
                    <CardHeader><CardTitle className="font-heading text-sm flex items-center gap-2"><Trophy className="w-4 h-4 text-gold" />Announce Quarter Champion</CardTitle></CardHeader>
                    <CardContent className="space-y-3">
                      {winnerForm.winner_id && profileMap[winnerForm.winner_id] && (
                        <div className="flex items-center gap-3 p-3 rounded-xl bg-gold/10 border border-gold/30">
                          <div className="w-12 h-12 rounded-full border-2 border-gold gradient-brand flex items-center justify-center text-primary-foreground text-lg font-bold overflow-hidden">
                            {profileMap[winnerForm.winner_id]?.avatar_url ? <img src={profileMap[winnerForm.winner_id].avatar_url} alt="" className="w-full h-full object-cover" /> : profileMap[winnerForm.winner_id]?.full_name?.charAt(0)}
                          </div>
                          <div>
                            <div className="font-heading font-bold text-foreground">{profileMap[winnerForm.winner_id]?.full_name}</div>
                            <div className="text-xs text-muted-foreground">{profileMap[winnerForm.winner_id]?.position}</div>
                          </div>
                        </div>
                      )}
                      <div className="flex gap-2">
                        <select value={winnerForm.winner_id} onChange={(e) => setWinnerForm((f) => ({ ...f, winner_id: e.target.value }))}
                          className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm">
                          <option value="">Select champion…</option>
                          {leaderboard.map((e) => <option key={e.uid} value={e.uid}>{e.rank}. {e.profile?.full_name} ({(e as any).isGrade ? `${e.total}%` : `${e.total} pts`})</option>)}
                        </select>
                        <Button size="sm" variant="outline" onClick={autoSelectWinner} className="text-xs">Auto</Button>
                      </div>
                      <textarea value={winnerForm.message} onChange={(e) => setWinnerForm((f) => ({ ...f, message: e.target.value }))}
                        placeholder="Congratulatory message highlighting their commitment to the company's development and recognizing them as a role model…" rows={3}
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none" />
                      <Button onClick={announceWinner} className="w-full bg-gold text-navy font-heading font-bold gap-2 hover:opacity-90">
                        <Trophy className="w-4 h-4" />Announce Champion
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Score History */}
              <Card>
                <CardHeader><CardTitle className="font-heading flex items-center gap-2"><TrendingUp className="w-5 h-5 text-primary" />Score History – {currentQuarter()}</CardTitle></CardHeader>
                <CardContent>
                  {scores.length === 0 ? <p className="text-muted-foreground text-sm text-center py-4">No scores assigned yet.</p> :
                    <div className="space-y-2">
                      {scores.map((s) => (
                        <div key={s.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                          <div className="w-8 h-8 rounded-full gradient-brand flex items-center justify-center text-primary-foreground font-bold text-xs overflow-hidden">
                            {s.staff?.avatar_url ? <img src={s.staff.avatar_url} alt="" className="w-full h-full object-cover" /> : s.staff?.full_name?.charAt(0)}
                          </div>
                          <div className="flex-1">
                            <div className="text-sm font-semibold font-heading text-foreground">{s.staff?.full_name}</div>
                            <div className="text-xs text-muted-foreground">Assigned by {s.assigner?.full_name} · {new Date(s.created_at).toLocaleDateString()}</div>
                            {s.notes && <div className="text-xs text-muted-foreground italic mt-0.5">{s.notes}</div>}
                          </div>
                          <div className="font-heading font-bold text-primary text-lg">+{s.points}</div>
                        </div>
                      ))}
                    </div>
                  }
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </StaffLayout>
  );
}
