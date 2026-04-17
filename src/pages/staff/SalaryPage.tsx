import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Wallet, Plus, Save, Trash2, Calendar, Clock, User, DollarSign,
  CheckCircle, AlertTriangle, FileText, Calculator, Edit2, X, Download,
  Shield, History, Receipt
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import StaffLayout from "@/components/staff/StaffLayout";
import { format, endOfMonth, parseISO, eachDayOfInterval, differenceInCalendarDays } from "date-fns";
import { calculateDeductions, getTaxBracketLabel } from "@/lib/ethiopian-tax";
import { openPayslipPDF, type PayslipData } from "@/lib/payslip-pdf";
import { calculateMonthlyAbsences, type MonthlyAbsenceSummary } from "@/lib/absence-penalty";
import { isEthiopianHoliday, getExpectedHours } from "@/lib/ethiopian-holidays";
import { toast } from "sonner";

const PAYMENT_TYPES = [
  { value: "hourly", label: "Hourly", unit: "hour" },
  { value: "daily", label: "Daily", unit: "day" },
  { value: "weekly", label: "Weekly", unit: "week" },
  { value: "monthly", label: "Monthly", unit: "month" },
];

interface Profile {
  user_id: string;
  full_name: string;
  position: string | null;
  avatar_url: string | null;
  email: string;
}

interface SalaryConfig {
  id: string;
  staff_id: string;
  payment_type: string;
  amount: number;
  currency: string;
  effective_from: string;
  effective_to: string | null;
  notes: string | null;
  created_by: string;
  created_at: string;
}

interface SalaryPayment {
  id: string;
  staff_id: string;
  payment_type: string;
  period_start: string;
  period_end: string;
  units: number;
  base_amount: number;
  gross_salary: number;
  deductions: number;
  net_salary: number;
  status: string;
  notes: string | null;
  created_by: string;
  created_at: string;
  approved_by: string | null;
  approved_at: string | null;
  paid_at: string | null;
}

const OVERTIME_MULTIPLIER = 2;

export default function SalaryPage() {
  const { user, isExecutive, isCeo, profile } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [configs, setConfigs] = useState<SalaryConfig[]>([]);
  const [payments, setPayments] = useState<SalaryPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "configure" | "calculate" | "history">("overview");

  // Config form
  const [selectedStaff, setSelectedStaff] = useState("");
  const [configForm, setConfigForm] = useState({
    payment_type: "monthly",
    amount: "",
    effective_from: format(new Date(), "yyyy-MM-dd"),
    effective_to: "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Calculation
  const [calcStaff, setCalcStaff] = useState("");
  const [calcMonth, setCalcMonth] = useState(format(new Date(), "yyyy-MM"));
  const [calcResult, setCalcResult] = useState<any>(null);
  const [calculating, setCalculating] = useState(false);
  const [savingPayment, setSavingPayment] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    const [profilesRes, configsRes, paymentsRes] = await Promise.all([
      supabase.from("profiles").select("user_id, full_name, position, avatar_url, email"),
      supabase.from("salary_configs").select("*").order("effective_from", { ascending: false }),
      supabase.from("salary_payments").select("*").order("created_at", { ascending: false }),
    ]);
    setProfiles(profilesRes.data || []);
    setConfigs(configsRes.data || []);
    setPayments(paymentsRes.data || []);
    setLoading(false);
  };

  const profileMap = useMemo(() => {
    const m: Record<string, Profile> = {};
    profiles.forEach(p => { m[p.user_id] = p; });
    return m;
  }, [profiles]);

  const staffConfigs = useMemo(() => {
    if (!selectedStaff) return [];
    return configs.filter(c => c.staff_id === selectedStaff);
  }, [configs, selectedStaff]);

  // Save / update salary config
  const saveConfig = async () => {
    if (!user || !selectedStaff || !configForm.amount) return;
    setSaving(true);
    const payload = {
      staff_id: selectedStaff,
      payment_type: configForm.payment_type,
      amount: parseFloat(configForm.amount),
      effective_from: configForm.effective_from,
      effective_to: configForm.effective_to || null,
      notes: configForm.notes || null,
      created_by: user.id,
    };
    if (editingId) {
      await supabase.from("salary_configs").update(payload).eq("id", editingId);
    } else {
      await supabase.from("salary_configs").insert(payload);
    }
    setConfigForm({ payment_type: "monthly", amount: "", effective_from: format(new Date(), "yyyy-MM-dd"), effective_to: "", notes: "" });
    setEditingId(null);
    toast.success(editingId ? "Rate updated" : "Rate saved");
    await loadData();
    setSaving(false);
  };

  const deleteConfig = async (id: string) => {
    await supabase.from("salary_configs").delete().eq("id", id);
    toast.success("Rate deleted");
    await loadData();
  };

  const startEdit = (c: SalaryConfig) => {
    setEditingId(c.id);
    setSelectedStaff(c.staff_id);
    setConfigForm({
      payment_type: c.payment_type,
      amount: String(c.amount),
      effective_from: c.effective_from,
      effective_to: c.effective_to || "",
      notes: c.notes || "",
    });
    setActiveTab("configure");
  };

  // Calculate salary with Ethiopian deductions
  const calculateSalary = async () => {
    if (!calcStaff || !calcMonth) return;
    setCalculating(true);

    const periodStart = `${calcMonth}-01`;
    const periodEndDate = endOfMonth(parseISO(periodStart));
    const periodEnd = format(periodEndDate, "yyyy-MM-dd");

    const { data: attendanceData } = await supabase
      .from("attendance")
      .select("*")
      .eq("user_id", calcStaff)
      .gte("clock_in", `${periodStart}T00:00:00`)
      .lte("clock_in", `${periodEnd}T23:59:59`)
      .order("clock_in");

    const records = attendanceData || [];

    const staffSalaryConfigs = configs.filter(c => {
      if (c.staff_id !== calcStaff) return false;
      const cfgStart = parseISO(c.effective_from);
      const cfgEnd = c.effective_to ? parseISO(c.effective_to) : new Date("2099-12-31");
      const pStart = parseISO(periodStart);
      const pEnd = periodEndDate;
      return cfgStart <= pEnd && cfgEnd >= pStart;
    });

    let totalRegularHours = 0;
    let totalOvertimeHours = 0;
    const workedDates = new Set<string>();

    records.forEach(r => {
      if (r.work_hours) totalRegularHours += Number(r.work_hours);
      if (r.overtime_hours) totalOvertimeHours += Number(r.overtime_hours);
      workedDates.add(r.clock_in.slice(0, 10));
    });

    const daysWorked = workedDates.size;

    // Calculate gross
    let grossSalary = 0;
    const configContributions: { config: SalaryConfig; units: number; amount: number }[] = [];

    for (const cfg of staffSalaryConfigs) {
      const cfgStart = parseISO(cfg.effective_from);
      const cfgEnd = cfg.effective_to ? parseISO(cfg.effective_to) : new Date("2099-12-31");
      const allDays = eachDayOfInterval({ start: parseISO(periodStart), end: periodEndDate });

      const cfgRecords = records.filter(r => {
        const d = parseISO(r.clock_in.slice(0, 10));
        return d >= cfgStart && d <= cfgEnd;
      });

      let cfgRegularHours = 0;
      const cfgWorkedDates = new Set<string>();
      cfgRecords.forEach(r => {
        if (r.work_hours) cfgRegularHours += Number(r.work_hours);
        cfgWorkedDates.add(r.clock_in.slice(0, 10));
      });

      const cfgDaysWorked = cfgWorkedDates.size;
      const cfgDaysInPeriod = allDays.filter(d => d >= cfgStart && d <= cfgEnd).length;

      let units: number;
      switch (cfg.payment_type) {
        case "hourly": units = cfgRegularHours; break;
        case "daily": units = cfgDaysWorked; break;
        case "weekly": units = cfgDaysInPeriod / 7; break;
        case "monthly": units = staffSalaryConfigs.length === 1 ? 1 : cfgDaysInPeriod / allDays.length; break;
        default: units = 0;
      }

      const amount = units * cfg.amount;
      configContributions.push({ config: cfg, units: parseFloat(units.toFixed(2)), amount: parseFloat(amount.toFixed(2)) });
      grossSalary += amount;
    }

    // Overtime pay
    let hourlyRate = 0;
    for (const cfg of staffSalaryConfigs) {
      let hr = 0;
      switch (cfg.payment_type) {
        case "hourly": hr = cfg.amount; break;
        case "daily": hr = cfg.amount / 8; break;
        case "weekly": hr = cfg.amount / 40; break;
        case "monthly": hr = cfg.amount / 176; break;
      }
      if (hr > hourlyRate) hourlyRate = hr;
    }
    const overtimePay = parseFloat((totalOvertimeHours * hourlyRate * OVERTIME_MULTIPLIER).toFixed(2));
    grossSalary = parseFloat((grossSalary + overtimePay).toFixed(2));

    // Calculate absence penalties
    const dailyRate = staffSalaryConfigs.length > 0
      ? (() => {
          const cfg = staffSalaryConfigs[0];
          switch (cfg.payment_type) {
            case "hourly": return cfg.amount * 8;
            case "daily": return cfg.amount;
            case "weekly": return cfg.amount / 5;
            case "monthly": return cfg.amount / 22;
            default: return 0;
          }
        })()
      : 0;

    const absenceSummary = await calculateMonthlyAbsences(calcStaff, parseISO(periodStart), dailyRate);
    const absencePenalty = absenceSummary.totalPenaltyDeduction;

    // Apply penalty to gross before tax
    const adjustedGross = Math.max(0, grossSalary - absencePenalty);

    // Ethiopian deductions on adjusted gross
    const deductions = calculateDeductions(adjustedGross);

    setCalcResult({
      staffId: calcStaff,
      periodStart,
      periodEnd,
      regularHours: parseFloat(totalRegularHours.toFixed(2)),
      overtimeHours: parseFloat(totalOvertimeHours.toFixed(2)),
      daysWorked,
      configs: configContributions,
      baseSalary: parseFloat((grossSalary - overtimePay).toFixed(2)),
      overtimePay,
      grossSalary,
      absencePenalty,
      absenceSummary,
      adjustedGross,
      deductions,
    });
    setCalculating(false);
  };

  // Save calculated salary as a payment record
  const savePaymentRecord = async () => {
    if (!user || !calcResult) return;
    setSavingPayment(true);

    const { error } = await supabase.from("salary_payments").insert({
      staff_id: calcResult.staffId,
      payment_type: calcResult.configs[0]?.config.payment_type || "monthly",
      period_start: calcResult.periodStart,
      period_end: calcResult.periodEnd,
      units: calcResult.daysWorked,
      base_amount: calcResult.baseSalary,
      gross_salary: calcResult.grossSalary,
      deductions: calcResult.deductions.totalDeductions,
      net_salary: calcResult.deductions.netSalary,
      status: "draft",
      notes: `Tax: ${calcResult.deductions.incomeTax}, Pension(E): ${calcResult.deductions.pensionEmployee}, Pension(R): ${calcResult.deductions.pensionEmployer}`,
      created_by: user.id,
    });

    if (error) {
      toast.error("Failed to save payment record");
    } else {
      toast.success("Payment record saved as draft");
      await loadData();
    }
    setSavingPayment(false);
  };

  // Approve payment
  const approvePayment = async (paymentId: string) => {
    if (!user) return;
    const { error } = await supabase.from("salary_payments").update({
      status: "approved",
      approved_by: user.id,
      approved_at: new Date().toISOString(),
    }).eq("id", paymentId);
    if (error) toast.error("Failed to approve");
    else { toast.success("Payment approved"); await loadData(); }
  };

  // Mark as paid
  const markPaid = async (paymentId: string) => {
    if (!user) return;
    const { error } = await supabase.from("salary_payments").update({
      status: "paid",
      paid_at: new Date().toISOString(),
    }).eq("id", paymentId);
    if (error) toast.error("Failed to mark paid");
    else { toast.success("Payment marked as paid"); await loadData(); }
  };

  // Download payslip
  const downloadPayslip = (payment: SalaryPayment) => {
    const staff = profileMap[payment.staff_id];
    const deductions = calculateDeductions(payment.gross_salary);
    const payslipData: PayslipData = {
      staffName: staff?.full_name || "Unknown",
      staffPosition: staff?.position || "Staff",
      staffEmail: staff?.email || "",
      periodStart: payment.period_start,
      periodEnd: payment.period_end,
      daysWorked: payment.units,
      regularHours: payment.units * 8,
      overtimeHours: 0,
      baseSalary: payment.base_amount,
      overtimePay: payment.gross_salary - payment.base_amount,
      grossSalary: payment.gross_salary,
      deductions,
      paymentStatus: payment.status,
      paymentDate: payment.paid_at ? format(parseISO(payment.paid_at), "yyyy-MM-dd") : null,
      paymentId: payment.id,
    };
    openPayslipPDF(payslipData);
  };

  const tabs = isExecutive
    ? [
        { key: "overview" as const, label: "Overview", icon: Wallet },
        { key: "configure" as const, label: "Configure", icon: Edit2 },
        { key: "calculate" as const, label: "Calculate", icon: Calculator },
        { key: "history" as const, label: "Payment History", icon: History },
      ]
    : [
        { key: "overview" as const, label: "My Salary", icon: Wallet },
        { key: "history" as const, label: "My Payments", icon: History },
      ];

  const statusColor = (s: string) => {
    switch (s) {
      case "draft": return "bg-muted text-muted-foreground";
      case "approved": return "bg-primary/10 text-primary";
      case "paid": return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const myPayments = payments.filter(p => p.staff_id === user?.id);
  const displayPayments = isExecutive ? payments : myPayments;

  return (
    <StaffLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-heading font-bold text-foreground flex items-center gap-2">
            <Wallet className="w-6 h-6 text-primary" /> Salary Management
          </h1>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-muted p-1 rounded-xl w-fit flex-wrap">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-heading font-medium transition-colors ${
                activeTab === t.key ? "bg-card text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <t.icon className="w-4 h-4" />
              {t.label}
            </button>
          ))}
        </div>

        {/* ===== OVERVIEW TAB ===== */}
        {activeTab === "overview" && (
          <div className="space-y-4">
            {isExecutive ? (
              <Card>
                <CardHeader><CardTitle className="font-heading text-lg">All Salary Configurations</CardTitle></CardHeader>
                <CardContent>
                  {configs.length === 0 ? (
                    <p className="text-muted-foreground text-sm py-8 text-center">No salary configurations yet.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border text-left">
                            <th className="pb-3 font-heading font-semibold text-muted-foreground">Staff</th>
                            <th className="pb-3 font-heading font-semibold text-muted-foreground">Type</th>
                            <th className="pb-3 font-heading font-semibold text-muted-foreground">Amount (ETB)</th>
                            <th className="pb-3 font-heading font-semibold text-muted-foreground">Effective</th>
                            <th className="pb-3 font-heading font-semibold text-muted-foreground">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {configs.map(c => (
                            <tr key={c.id} className="border-b border-border/50 hover:bg-muted/30">
                              <td className="py-3">
                                <div className="flex items-center gap-2">
                                  <div className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0">
                                    {profileMap[c.staff_id]?.avatar_url ? (
                                      <img src={profileMap[c.staff_id].avatar_url!} className="w-full h-full object-cover" alt="" />
                                    ) : (
                                      <div className="w-full h-full gradient-brand flex items-center justify-center text-primary-foreground text-xs font-bold">
                                        {profileMap[c.staff_id]?.full_name?.charAt(0) || "?"}
                                      </div>
                                    )}
                                  </div>
                                  <span className="font-medium text-foreground">{profileMap[c.staff_id]?.full_name || "Unknown"}</span>
                                </div>
                              </td>
                              <td className="py-3"><Badge variant="secondary" className="font-heading capitalize">{c.payment_type}</Badge></td>
                              <td className="py-3 font-semibold text-foreground">{Number(c.amount).toLocaleString()}</td>
                              <td className="py-3 text-muted-foreground text-xs">{c.effective_from} → {c.effective_to || "Present"}</td>
                              <td className="py-3">
                                <div className="flex gap-1">
                                  <Button size="sm" variant="ghost" onClick={() => startEdit(c)}><Edit2 className="w-3.5 h-3.5" /></Button>
                                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => deleteConfig(c.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                <Card>
                  <CardHeader><CardTitle className="font-heading text-lg">My Salary Structure</CardTitle></CardHeader>
                  <CardContent>
                    {configs.filter(c => c.staff_id === user?.id).length === 0 ? (
                      <p className="text-muted-foreground text-sm py-8 text-center">No salary configuration set yet. Contact your administrator.</p>
                    ) : (
                      <div className="space-y-3">
                        {configs.filter(c => c.staff_id === user?.id).map(c => (
                          <div key={c.id} className="flex items-center justify-between p-4 rounded-xl border border-border bg-muted/20">
                            <div>
                              <div className="flex items-center gap-2">
                                <Badge variant="secondary" className="capitalize font-heading">{c.payment_type}</Badge>
                                <span className="font-heading font-bold text-lg text-foreground">
                                  ETB {Number(c.amount).toLocaleString()}
                                </span>
                                <span className="text-muted-foreground text-sm">/ {PAYMENT_TYPES.find(p => p.value === c.payment_type)?.unit}</span>
                              </div>
                              <div className="text-xs text-muted-foreground mt-1">{c.effective_from} → {c.effective_to || "Present"}</div>
                            </div>
                            {!c.effective_to && <Badge className="bg-primary/10 text-primary border-primary/20">Active</Badge>}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Quick deduction preview for staff */}
                {configs.filter(c => c.staff_id === user?.id && !c.effective_to).length > 0 && (
                  <Card>
                    <CardHeader><CardTitle className="font-heading text-lg flex items-center gap-2"><Receipt className="w-5 h-5 text-primary" />Estimated Monthly Deductions</CardTitle></CardHeader>
                    <CardContent>
                      {(() => {
                        const activeConfig = configs.find(c => c.staff_id === user?.id && !c.effective_to);
                        if (!activeConfig) return null;
                        const gross = activeConfig.payment_type === "monthly" ? activeConfig.amount
                          : activeConfig.payment_type === "daily" ? activeConfig.amount * 22
                          : activeConfig.payment_type === "hourly" ? activeConfig.amount * 176
                          : activeConfig.amount * 4;
                        const ded = calculateDeductions(gross);
                        return (
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                            <div className="p-3 rounded-xl bg-muted/40 text-center">
                              <div className="text-xs text-muted-foreground font-heading">Gross (est.)</div>
                              <div className="font-heading font-bold text-lg text-foreground">ETB {ded.grossSalary.toLocaleString()}</div>
                            </div>
                            <div className="p-3 rounded-xl bg-destructive/5 text-center">
                              <div className="text-xs text-muted-foreground font-heading">Income Tax ({getTaxBracketLabel(ded.grossSalary - ded.pensionEmployee)})</div>
                              <div className="font-heading font-bold text-lg text-destructive">- {ded.incomeTax.toLocaleString()}</div>
                            </div>
                            <div className="p-3 rounded-xl bg-destructive/5 text-center">
                              <div className="text-xs text-muted-foreground font-heading">Pension (7%)</div>
                              <div className="font-heading font-bold text-lg text-destructive">- {ded.pensionEmployee.toLocaleString()}</div>
                            </div>
                            <div className="p-3 rounded-xl bg-primary/5 text-center">
                              <div className="text-xs text-muted-foreground font-heading">Net Pay</div>
                              <div className="font-heading font-bold text-lg text-primary">ETB {ded.netSalary.toLocaleString()}</div>
                            </div>
                          </div>
                        );
                      })()}
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </div>
        )}

        {/* ===== CONFIGURE TAB ===== */}
        {activeTab === "configure" && isExecutive && (
          <div className="grid lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="font-heading text-lg flex items-center gap-2">
                  <Plus className="w-4 h-4" />{editingId ? "Edit Rate" : "Add Salary Rate"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium font-heading text-foreground">Staff Member</label>
                  <Select value={selectedStaff} onValueChange={setSelectedStaff}>
                    <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select staff..." /></SelectTrigger>
                    <SelectContent>
                      {profiles.map(p => (
                        <SelectItem key={p.user_id} value={p.user_id}>
                          {p.full_name} {p.position && <span className="text-muted-foreground text-xs">({p.position})</span>}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium font-heading text-foreground">Payment Type</label>
                  <Select value={configForm.payment_type} onValueChange={v => setConfigForm(f => ({ ...f, payment_type: v }))}>
                    <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PAYMENT_TYPES.map(t => (<SelectItem key={t.value} value={t.value}>{t.label} (per {t.unit})</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium font-heading text-foreground">
                    Amount (ETB per {PAYMENT_TYPES.find(p => p.value === configForm.payment_type)?.unit})
                  </label>
                  <Input type="number" className="mt-1.5" placeholder="e.g. 15000" value={configForm.amount}
                    onChange={e => setConfigForm(f => ({ ...f, amount: e.target.value }))} />
                </div>

                {/* Deduction preview */}
                {configForm.amount && parseFloat(configForm.amount) > 0 && (
                  <div className="p-3 rounded-xl bg-muted/50 border border-border space-y-1">
                    <div className="text-xs font-heading font-semibold text-muted-foreground mb-2">Deduction Preview (monthly estimate)</div>
                    {(() => {
                      const amt = parseFloat(configForm.amount);
                      const gross = configForm.payment_type === "monthly" ? amt
                        : configForm.payment_type === "daily" ? amt * 22
                        : configForm.payment_type === "hourly" ? amt * 176
                        : amt * 4;
                      const ded = calculateDeductions(gross);
                      return (
                        <>
                          <div className="flex justify-between text-xs"><span>Gross (est.)</span><span className="font-semibold">ETB {ded.grossSalary.toLocaleString()}</span></div>
                          <div className="flex justify-between text-xs"><span>Income Tax ({getTaxBracketLabel(ded.grossSalary - ded.pensionEmployee)})</span><span className="text-destructive">- {ded.incomeTax.toLocaleString()}</span></div>
                          <div className="flex justify-between text-xs"><span>Pension (Employee 7%)</span><span className="text-destructive">- {ded.pensionEmployee.toLocaleString()}</span></div>
                          <div className="flex justify-between text-xs font-semibold border-t border-border pt-1 mt-1"><span>Est. Net Pay</span><span className="text-primary">ETB {ded.netSalary.toLocaleString()}</span></div>
                        </>
                      );
                    })()}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium font-heading text-foreground">Effective From</label>
                    <Input type="date" className="mt-1.5" value={configForm.effective_from}
                      onChange={e => setConfigForm(f => ({ ...f, effective_from: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-sm font-medium font-heading text-foreground">Effective To</label>
                    <Input type="date" className="mt-1.5" value={configForm.effective_to}
                      onChange={e => setConfigForm(f => ({ ...f, effective_to: e.target.value }))} />
                    <p className="text-xs text-muted-foreground mt-1">Leave empty if active</p>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium font-heading text-foreground">Notes</label>
                  <Input className="mt-1.5" placeholder="e.g. Promotion raise" value={configForm.notes}
                    onChange={e => setConfigForm(f => ({ ...f, notes: e.target.value }))} />
                </div>

                <div className="flex gap-2">
                  <Button onClick={saveConfig} disabled={saving || !selectedStaff || !configForm.amount} className="gradient-brand text-primary-foreground font-heading gap-2 shadow-glow">
                    <Save className="w-4 h-4" />{saving ? "Saving..." : editingId ? "Update" : "Save Rate"}
                  </Button>
                  {editingId && (
                    <Button variant="outline" onClick={() => { setEditingId(null); setConfigForm({ payment_type: "monthly", amount: "", effective_from: format(new Date(), "yyyy-MM-dd"), effective_to: "", notes: "" }); }}>
                      <X className="w-4 h-4 mr-1" /> Cancel
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="font-heading text-lg">{selectedStaff ? `History — ${profileMap[selectedStaff]?.full_name}` : "Select Staff"}</CardTitle></CardHeader>
              <CardContent>
                {!selectedStaff ? (
                  <p className="text-muted-foreground text-sm py-8 text-center">Select a staff member.</p>
                ) : staffConfigs.length === 0 ? (
                  <p className="text-muted-foreground text-sm py-8 text-center">No rates yet.</p>
                ) : (
                  <div className="space-y-3">
                    {staffConfigs.map((c, i) => (
                      <motion.div key={c.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                        className={`p-4 rounded-xl border ${!c.effective_to ? "border-primary/30 bg-primary/5" : "border-border bg-muted/20"}`}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="capitalize font-heading">{c.payment_type}</Badge>
                            {!c.effective_to && <Badge className="bg-primary/10 text-primary text-[10px]">Active</Badge>}
                          </div>
                          <div className="flex gap-1">
                            <Button size="sm" variant="ghost" onClick={() => startEdit(c)}><Edit2 className="w-3.5 h-3.5" /></Button>
                            <Button size="sm" variant="ghost" className="text-destructive" onClick={() => deleteConfig(c.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                          </div>
                        </div>
                        <div className="font-heading font-bold text-xl text-foreground">
                          ETB {Number(c.amount).toLocaleString()}
                          <span className="text-sm font-normal text-muted-foreground ml-1">/ {PAYMENT_TYPES.find(p => p.value === c.payment_type)?.unit}</span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />{c.effective_from} → {c.effective_to || "Present"}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* ===== CALCULATE TAB ===== */}
        {activeTab === "calculate" && isExecutive && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="font-heading text-lg flex items-center gap-2">
                  <Calculator className="w-5 h-5 text-primary" />Calculate Salary with Deductions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid sm:grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium font-heading text-foreground">Staff Member</label>
                    <Select value={calcStaff} onValueChange={setCalcStaff}>
                      <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select staff..." /></SelectTrigger>
                      <SelectContent>
                        {profiles.map(p => (<SelectItem key={p.user_id} value={p.user_id}>{p.full_name}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium font-heading text-foreground">Month</label>
                    <Input type="month" className="mt-1.5" value={calcMonth} onChange={e => setCalcMonth(e.target.value)} />
                  </div>
                  <div className="flex items-end">
                    <Button onClick={calculateSalary} disabled={calculating || !calcStaff} className="gradient-brand text-primary-foreground font-heading gap-2 shadow-glow w-full">
                      <Calculator className="w-4 h-4" />{calculating ? "Calculating..." : "Calculate"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <AnimatePresence>
              {calcResult && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
                  <Card>
                    <CardContent className="p-6">
                      {/* Staff header */}
                      <div className="flex items-center gap-4 mb-6 pb-4 border-b border-border">
                        <div className="w-14 h-14 rounded-full overflow-hidden flex-shrink-0">
                          {profileMap[calcResult.staffId]?.avatar_url ? (
                            <img src={profileMap[calcResult.staffId].avatar_url!} className="w-full h-full object-cover" alt="" />
                          ) : (
                            <div className="w-full h-full gradient-brand flex items-center justify-center text-primary-foreground font-bold text-xl">
                              {profileMap[calcResult.staffId]?.full_name?.charAt(0)}
                            </div>
                          )}
                        </div>
                        <div>
                          <h3 className="font-heading font-bold text-xl text-foreground">{profileMap[calcResult.staffId]?.full_name}</h3>
                          <p className="text-sm text-muted-foreground">{profileMap[calcResult.staffId]?.position || "Staff"}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">Period: {calcResult.periodStart} to {calcResult.periodEnd}</p>
                        </div>
                      </div>

                      {/* Attendance grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                        <div className="p-3 rounded-xl bg-muted/40 text-center">
                          <div className="text-xs text-muted-foreground font-heading">Days Worked</div>
                          <div className="font-heading font-bold text-xl text-foreground">{calcResult.daysWorked}</div>
                        </div>
                        <div className="p-3 rounded-xl bg-muted/40 text-center">
                          <div className="text-xs text-muted-foreground font-heading">Regular Hours</div>
                          <div className="font-heading font-bold text-xl text-foreground">{calcResult.regularHours}</div>
                        </div>
                        <div className="p-3 rounded-xl bg-muted/40 text-center">
                          <div className="text-xs text-muted-foreground font-heading">Overtime</div>
                          <div className="font-heading font-bold text-xl text-primary">{calcResult.overtimeHours}</div>
                        </div>
                        <div className="p-3 rounded-xl bg-muted/40 text-center">
                          <div className="text-xs text-muted-foreground font-heading">Total Hours</div>
                          <div className="font-heading font-bold text-xl text-foreground">{(calcResult.regularHours + calcResult.overtimeHours).toFixed(2)}</div>
                        </div>
                      </div>

                      {/* Earnings */}
                      <div className="mb-6">
                        <h4 className="font-heading font-semibold text-sm text-muted-foreground mb-3">Earnings</h4>
                        {calcResult.configs.map((cc: any, i: number) => (
                          <div key={i} className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-card mb-2">
                            <div>
                              <Badge variant="secondary" className="capitalize font-heading mr-2">{cc.config.payment_type}</Badge>
                              <span className="text-sm text-muted-foreground">ETB {Number(cc.config.amount).toLocaleString()} × {cc.units}</span>
                            </div>
                            <span className="font-heading font-bold text-foreground">ETB {cc.amount.toLocaleString()}</span>
                          </div>
                        ))}
                        {calcResult.overtimePay > 0 && (
                          <div className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-card">
                            <span className="text-sm text-muted-foreground">Overtime Pay (2×)</span>
                            <span className="font-heading font-bold text-primary">ETB {calcResult.overtimePay.toLocaleString()}</span>
                          </div>
                        )}
                      </div>

                      {/* Absence Penalties */}
                      {calcResult.absenceSummary && (calcResult.absenceSummary.daysUnjustified > 0 || calcResult.absenceSummary.daysUnpaidLeave > 0) && (
                        <div className="mb-6">
                          <h4 className="font-heading font-semibold text-sm text-destructive mb-3 flex items-center gap-1">
                            <AlertTriangle className="w-4 h-4" /> Absence Penalties
                          </h4>
                          <div className="space-y-2">
                            {calcResult.absenceSummary.daysUnjustified > 0 && (
                              <div className="flex justify-between p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                                <span className="text-sm">
                                  Unjustified Absences ({calcResult.absenceSummary.daysUnjustified} days × 3x daily rate)
                                </span>
                                <span className="font-heading font-bold text-destructive">
                                  - ETB {(calcResult.absenceSummary.daysUnjustified * calcResult.absenceSummary.dailyRate * 3).toLocaleString()}
                                </span>
                              </div>
                            )}
                            {calcResult.absenceSummary.daysUnpaidLeave > 0 && (
                              <div className="flex justify-between p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                                <span className="text-sm">
                                  Unpaid Leave ({calcResult.absenceSummary.daysUnpaidLeave} days)
                                </span>
                                <span className="font-heading font-bold text-amber-600">
                                  - ETB {(calcResult.absenceSummary.daysUnpaidLeave * calcResult.absenceSummary.dailyRate).toLocaleString()}
                                </span>
                              </div>
                            )}
                            <div className="flex justify-between p-2 text-xs text-muted-foreground">
                              <span>Working days: {calcResult.absenceSummary.totalWorkingDays} | Present: {calcResult.absenceSummary.daysPresent} | Leave: {calcResult.absenceSummary.daysApprovedLeave}</span>
                              <span>Total penalty: ETB {calcResult.absencePenalty.toLocaleString()}</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Deductions */}
                      <div className="mb-6">
                        <h4 className="font-heading font-semibold text-sm text-muted-foreground mb-3">Ethiopian Tax & Deductions</h4>
                        <div className="space-y-2">
                          <div className="flex justify-between p-3 rounded-lg bg-destructive/5 border border-destructive/10">
                            <span className="text-sm">Income Tax ({getTaxBracketLabel(calcResult.deductions.grossSalary - calcResult.deductions.pensionEmployee)})</span>
                            <span className="font-heading font-bold text-destructive">- ETB {calcResult.deductions.incomeTax.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between p-3 rounded-lg bg-destructive/5 border border-destructive/10">
                            <span className="text-sm">Pension (Employee 7%)</span>
                            <span className="font-heading font-bold text-destructive">- ETB {calcResult.deductions.pensionEmployee.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between p-3 rounded-lg bg-muted/30 border border-border/50">
                            <span className="text-sm text-muted-foreground">Pension (Employer 11%) — not deducted from pay</span>
                            <span className="font-heading font-semibold text-muted-foreground">ETB {calcResult.deductions.pensionEmployer.toLocaleString()}</span>
                          </div>
                        </div>
                      </div>

                      {/* Summary */}
                      <div className="rounded-xl border-2 border-primary/30 bg-primary/5 p-5">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                          <div>
                            <div className="text-xs text-muted-foreground font-heading">Gross</div>
                            <div className="font-heading font-bold text-lg text-foreground">ETB {calcResult.grossSalary.toLocaleString()}</div>
                          </div>
                          {calcResult.absencePenalty > 0 && (
                            <div>
                              <div className="text-xs text-muted-foreground font-heading">Absence Penalty</div>
                              <div className="font-heading font-bold text-lg text-destructive">- ETB {calcResult.absencePenalty.toLocaleString()}</div>
                            </div>
                          )}
                          <div>
                            <div className="text-xs text-muted-foreground font-heading">Tax & Pension</div>
                            <div className="font-heading font-bold text-lg text-destructive">- ETB {calcResult.deductions.totalDeductions.toLocaleString()}</div>
                          </div>
                          <div>
                            <div className="text-xs text-muted-foreground font-heading">Net Pay</div>
                            <div className="font-heading font-bold text-2xl text-primary">ETB {calcResult.deductions.netSalary.toLocaleString()}</div>
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-3 mt-6">
                        <Button onClick={savePaymentRecord} disabled={savingPayment} className="gradient-brand text-primary-foreground font-heading gap-2 shadow-glow flex-1">
                          <Save className="w-4 h-4" />{savingPayment ? "Saving..." : "Save as Payment Record"}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* ===== PAYMENT HISTORY TAB ===== */}
        {activeTab === "history" && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="font-heading text-lg flex items-center gap-2">
                  <History className="w-5 h-5 text-primary" />
                  {isExecutive ? "All Payment Records" : "My Payment History"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {displayPayments.length === 0 ? (
                  <p className="text-muted-foreground text-sm py-8 text-center">No payment records yet.</p>
                ) : (
                  <div className="space-y-3">
                    {displayPayments.map((p, i) => {
                      const staff = profileMap[p.staff_id];
                      const approver = p.approved_by ? profileMap[p.approved_by] : null;
                      return (
                        <motion.div key={p.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                          className="p-4 rounded-xl border border-border bg-card hover:bg-muted/20 transition-colors">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-3">
                              {isExecutive && (
                                <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
                                  {staff?.avatar_url ? (
                                    <img src={staff.avatar_url!} className="w-full h-full object-cover" alt="" />
                                  ) : (
                                    <div className="w-full h-full gradient-brand flex items-center justify-center text-primary-foreground text-xs font-bold">
                                      {staff?.full_name?.charAt(0) || "?"}
                                    </div>
                                  )}
                                </div>
                              )}
                              <div>
                                {isExecutive && <div className="font-heading font-semibold text-foreground">{staff?.full_name || "Unknown"}</div>}
                                <div className="text-xs text-muted-foreground">{p.period_start} → {p.period_end}</div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge className={`text-[10px] border-0 capitalize ${statusColor(p.status)}`}>{p.status}</Badge>
                              <span className="font-heading font-bold text-foreground">ETB {Number(p.net_salary).toLocaleString()}</span>
                            </div>
                          </div>

                          <div className="grid grid-cols-4 gap-2 text-xs text-muted-foreground mb-2">
                            <div>Gross: <span className="font-semibold text-foreground">ETB {Number(p.gross_salary).toLocaleString()}</span></div>
                            <div>Deductions: <span className="font-semibold text-destructive">ETB {Number(p.deductions).toLocaleString()}</span></div>
                            <div>Net: <span className="font-semibold text-primary">ETB {Number(p.net_salary).toLocaleString()}</span></div>
                            <div>Days: <span className="font-semibold text-foreground">{p.units}</span></div>
                          </div>

                          {/* Audit trail */}
                          <div className="text-[10px] text-muted-foreground space-y-0.5">
                            <div>Created: {format(parseISO(p.created_at), "MMM d, yyyy HH:mm")} by {profileMap[p.created_by]?.full_name || "System"}</div>
                            {p.approved_by && <div>Approved: {p.approved_at ? format(parseISO(p.approved_at), "MMM d, yyyy HH:mm") : ""} by {approver?.full_name || "Unknown"}</div>}
                            {p.paid_at && <div>Paid: {format(parseISO(p.paid_at), "MMM d, yyyy HH:mm")}</div>}
                          </div>

                          {/* Actions */}
                          <div className="flex gap-2 mt-3">
                            <Button size="sm" variant="outline" onClick={() => downloadPayslip(p)} className="gap-1 text-xs">
                              <FileText className="w-3 h-3" />Payslip PDF
                            </Button>
                            {isExecutive && p.status === "draft" && (
                              <Button size="sm" variant="outline" onClick={() => approvePayment(p.id)} className="gap-1 text-xs">
                                <Shield className="w-3 h-3" />Approve
                              </Button>
                            )}
                            {isExecutive && p.status === "approved" && (
                              <Button size="sm" variant="outline" onClick={() => markPaid(p.id)} className="gap-1 text-xs text-green-600">
                                <CheckCircle className="w-3 h-3" />Mark Paid
                              </Button>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </StaffLayout>
  );
}
