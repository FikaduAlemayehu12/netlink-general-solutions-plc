// Attendance export utilities for CSV, Excel-compatible CSV, and PDF

export interface StaffAttendanceSummary {
  userId: string;
  fullName: string;
  position: string;
  dailyHours: Record<string, { hours: number; overtime: number; sessions: number }>;
  weeklyHours: Record<string, { hours: number; overtime: number }>;
  monthlyHours: Record<string, { hours: number; overtime: number }>;
  quarterlyHours: Record<string, { hours: number; overtime: number }>;
  totalHours: number;
  totalOvertime: number;
  totalDaysWorked: number;
}

export function getWeekKey(date: Date): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  const weekNum = 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
  return `${d.getFullYear()}-W${String(weekNum).padStart(2, "0")}`;
}

export function getQuarterKey(date: Date): string {
  const q = Math.ceil((date.getMonth() + 1) / 3);
  return `${date.getFullYear()}-Q${q}`;
}

export function getMonthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function buildStaffSummaries(
  allAttendance: any[],
  profiles: Record<string, any>
): StaffAttendanceSummary[] {
  const byUser: Record<string, any[]> = {};
  allAttendance.forEach((a) => {
    if (!byUser[a.user_id]) byUser[a.user_id] = [];
    byUser[a.user_id].push(a);
  });

  return Object.entries(byUser).map(([userId, records]) => {
    const profile = profiles[userId] || { full_name: "Unknown", position: "" };
    const dailyHours: StaffAttendanceSummary["dailyHours"] = {};
    const weeklyHours: StaffAttendanceSummary["weeklyHours"] = {};
    const monthlyHours: StaffAttendanceSummary["monthlyHours"] = {};
    const quarterlyHours: StaffAttendanceSummary["quarterlyHours"] = {};
    let totalHours = 0;
    let totalOvertime = 0;

    records.forEach((r) => {
      const d = new Date(r.clock_in);
      const dateKey = d.toISOString().slice(0, 10);
      const wk = getWeekKey(d);
      const mo = getMonthKey(d);
      const qt = getQuarterKey(d);
      const hrs = r.work_hours || 0;
      const ot = r.overtime_hours || 0;

      if (!dailyHours[dateKey]) dailyHours[dateKey] = { hours: 0, overtime: 0, sessions: 0 };
      dailyHours[dateKey].hours += hrs;
      dailyHours[dateKey].overtime += ot;
      dailyHours[dateKey].sessions += 1;

      if (!weeklyHours[wk]) weeklyHours[wk] = { hours: 0, overtime: 0 };
      weeklyHours[wk].hours += hrs;
      weeklyHours[wk].overtime += ot;

      if (!monthlyHours[mo]) monthlyHours[mo] = { hours: 0, overtime: 0 };
      monthlyHours[mo].hours += hrs;
      monthlyHours[mo].overtime += ot;

      if (!quarterlyHours[qt]) quarterlyHours[qt] = { hours: 0, overtime: 0 };
      quarterlyHours[qt].hours += hrs;
      quarterlyHours[qt].overtime += ot;

      totalHours += hrs;
      totalOvertime += ot;
    });

    return {
      userId,
      fullName: profile.full_name,
      position: profile.position || "",
      dailyHours,
      weeklyHours,
      monthlyHours,
      quarterlyHours,
      totalHours,
      totalOvertime,
      totalDaysWorked: Object.keys(dailyHours).length,
    };
  });
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportCSV(summary: StaffAttendanceSummary) {
  const rows: string[][] = [
    ["Date", "Sessions", "Work Hours", "Overtime Hours"],
  ];
  Object.entries(summary.dailyHours)
    .sort(([a], [b]) => a.localeCompare(b))
    .forEach(([date, d]) => {
      rows.push([date, String(d.sessions), d.hours.toFixed(2), d.overtime.toFixed(2)]);
    });

  rows.push([]);
  rows.push(["Period Summary"]);
  rows.push(["Period", "Work Hours", "Overtime"]);
  
  rows.push(["--- Weekly ---"]);
  Object.entries(summary.weeklyHours).sort(([a], [b]) => a.localeCompare(b)).forEach(([wk, d]) => {
    rows.push([wk, d.hours.toFixed(2), d.overtime.toFixed(2)]);
  });

  rows.push(["--- Monthly ---"]);
  Object.entries(summary.monthlyHours).sort(([a], [b]) => a.localeCompare(b)).forEach(([mo, d]) => {
    rows.push([mo, d.hours.toFixed(2), d.overtime.toFixed(2)]);
  });

  rows.push(["--- Quarterly ---"]);
  Object.entries(summary.quarterlyHours).sort(([a], [b]) => a.localeCompare(b)).forEach(([qt, d]) => {
    rows.push([qt, d.hours.toFixed(2), d.overtime.toFixed(2)]);
  });

  rows.push([]);
  rows.push(["TOTAL", "", summary.totalHours.toFixed(2), summary.totalOvertime.toFixed(2)]);
  rows.push(["Days Worked", String(summary.totalDaysWorked)]);

  const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
  const bom = "\uFEFF"; // UTF-8 BOM for Excel compatibility
  downloadBlob(new Blob([bom + csv], { type: "text/csv;charset=utf-8;" }), `${summary.fullName.replace(/\s+/g, "_")}_attendance.csv`);
}

export function exportExcel(summary: StaffAttendanceSummary) {
  // Export as tab-delimited .xls (Excel-compatible)
  const rows: string[][] = [
    ["Employee", summary.fullName],
    ["Position", summary.position],
    [],
    ["Date", "Sessions", "Work Hours", "Overtime Hours"],
  ];
  Object.entries(summary.dailyHours)
    .sort(([a], [b]) => a.localeCompare(b))
    .forEach(([date, d]) => {
      rows.push([date, String(d.sessions), d.hours.toFixed(2), d.overtime.toFixed(2)]);
    });

  rows.push([]);
  rows.push(["Weekly Summary"]);
  rows.push(["Week", "Work Hours", "Overtime"]);
  Object.entries(summary.weeklyHours).sort(([a], [b]) => a.localeCompare(b)).forEach(([wk, d]) => {
    rows.push([wk, d.hours.toFixed(2), d.overtime.toFixed(2)]);
  });

  rows.push([]);
  rows.push(["Monthly Summary"]);
  rows.push(["Month", "Work Hours", "Overtime"]);
  Object.entries(summary.monthlyHours).sort(([a], [b]) => a.localeCompare(b)).forEach(([mo, d]) => {
    rows.push([mo, d.hours.toFixed(2), d.overtime.toFixed(2)]);
  });

  rows.push([]);
  rows.push(["Quarterly Summary"]);
  rows.push(["Quarter", "Work Hours", "Overtime"]);
  Object.entries(summary.quarterlyHours).sort(([a], [b]) => a.localeCompare(b)).forEach(([qt, d]) => {
    rows.push([qt, d.hours.toFixed(2), d.overtime.toFixed(2)]);
  });

  rows.push([]);
  rows.push(["OVERALL TOTAL", "", summary.totalHours.toFixed(2), summary.totalOvertime.toFixed(2)]);
  rows.push(["Days Worked", String(summary.totalDaysWorked)]);

  const tsv = rows.map((r) => r.join("\t")).join("\n");
  downloadBlob(
    new Blob([tsv], { type: "application/vnd.ms-excel" }),
    `${summary.fullName.replace(/\s+/g, "_")}_attendance.xls`
  );
}

export function exportPDF(summary: StaffAttendanceSummary) {
  const styles = `
    body{font-family:Arial,sans-serif;margin:24px;color:#222}
    h1{font-size:18px;margin-bottom:4px}
    h2{font-size:14px;margin:16px 0 6px;color:#555}
    table{border-collapse:collapse;width:100%;margin-bottom:12px}
    th,td{border:1px solid #ddd;padding:6px 10px;text-align:left;font-size:12px}
    th{background:#f5f5f5;font-weight:600}
    .total-row{font-weight:700;background:#e8f0fe}
    .subtitle{color:#777;font-size:12px}
  `;

  const dailyRows = Object.entries(summary.dailyHours)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, d]) => `<tr><td>${date}</td><td>${d.sessions}</td><td>${d.hours.toFixed(2)}</td><td>${d.overtime.toFixed(2)}</td></tr>`)
    .join("");

  const weeklyRows = Object.entries(summary.weeklyHours)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([wk, d]) => `<tr><td>${wk}</td><td>${d.hours.toFixed(2)}</td><td>${d.overtime.toFixed(2)}</td></tr>`)
    .join("");

  const monthlyRows = Object.entries(summary.monthlyHours)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([mo, d]) => `<tr><td>${mo}</td><td>${d.hours.toFixed(2)}</td><td>${d.overtime.toFixed(2)}</td></tr>`)
    .join("");

  const quarterlyRows = Object.entries(summary.quarterlyHours)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([qt, d]) => `<tr><td>${qt}</td><td>${d.hours.toFixed(2)}</td><td>${d.overtime.toFixed(2)}</td></tr>`)
    .join("");

  const html = `<!DOCTYPE html><html><head><style>${styles}</style><title>Attendance - ${summary.fullName}</title></head><body>
    <h1>${summary.fullName}</h1>
    <p class="subtitle">${summary.position} · ${summary.totalDaysWorked} days worked · Generated ${new Date().toLocaleDateString()}</p>
    
    <h2>Daily Attendance</h2>
    <table><thead><tr><th>Date</th><th>Sessions</th><th>Hours</th><th>Overtime</th></tr></thead><tbody>${dailyRows}
    <tr class="total-row"><td>TOTAL</td><td></td><td>${summary.totalHours.toFixed(2)}</td><td>${summary.totalOvertime.toFixed(2)}</td></tr></tbody></table>
    
    <h2>Weekly Summary</h2>
    <table><thead><tr><th>Week</th><th>Hours</th><th>Overtime</th></tr></thead><tbody>${weeklyRows}</tbody></table>
    
    <h2>Monthly Summary</h2>
    <table><thead><tr><th>Month</th><th>Hours</th><th>Overtime</th></tr></thead><tbody>${monthlyRows}</tbody></table>
    
    <h2>Quarterly Summary</h2>
    <table><thead><tr><th>Quarter</th><th>Hours</th><th>Overtime</th></tr></thead><tbody>${quarterlyRows}</tbody></table>
    
    <h2>Overall Achievement</h2>
    <table><tbody>
      <tr><td><strong>Total Work Hours</strong></td><td>${summary.totalHours.toFixed(2)}</td></tr>
      <tr><td><strong>Total Overtime</strong></td><td>${summary.totalOvertime.toFixed(2)}</td></tr>
      <tr><td><strong>Days Worked</strong></td><td>${summary.totalDaysWorked}</td></tr>
    </tbody></table>
  </body></html>`;

  const win = window.open("", "_blank");
  if (win) {
    win.document.write(html);
    win.document.close();
    setTimeout(() => { win.print(); }, 500);
  }
}
