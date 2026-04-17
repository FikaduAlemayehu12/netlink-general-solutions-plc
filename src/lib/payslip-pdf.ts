// Generate payslip as printable HTML (opens in new window for PDF print)

import type { DeductionBreakdown } from "./ethiopian-tax";

export interface PayslipData {
  staffName: string;
  staffPosition: string;
  staffEmail: string;
  periodStart: string;
  periodEnd: string;
  daysWorked: number;
  regularHours: number;
  overtimeHours: number;
  baseSalary: number;
  overtimePay: number;
  grossSalary: number;
  deductions: DeductionBreakdown;
  paymentStatus: string;
  paymentDate: string | null;
  paymentId: string;
}

export function generatePayslipHTML(data: PayslipData): string {
  const styles = `
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:'Segoe UI',Arial,sans-serif;padding:40px;color:#1a1a2e;background:#fff}
    .payslip{max-width:700px;margin:0 auto;border:2px solid #1a1a2e;border-radius:8px;overflow:hidden}
    .header{background:#1a1a2e;color:#fff;padding:24px;display:flex;justify-content:space-between;align-items:center}
    .header h1{font-size:22px;font-weight:700}
    .header .meta{text-align:right;font-size:12px;opacity:0.85}
    .section{padding:20px 24px;border-bottom:1px solid #e5e5e5}
    .section:last-child{border-bottom:none}
    .section-title{font-size:11px;text-transform:uppercase;letter-spacing:1.5px;color:#666;margin-bottom:12px;font-weight:600}
    .row{display:flex;justify-content:space-between;padding:6px 0;font-size:13px}
    .row.highlight{font-weight:700;font-size:15px;padding:10px 0;border-top:2px solid #1a1a2e;margin-top:8px}
    .row .label{color:#444}
    .row .value{font-weight:600;text-align:right}
    .row .value.deduction{color:#dc2626}
    .row .value.earning{color:#16a34a}
    .grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
    .info-box{background:#f8f9fa;border-radius:6px;padding:12px}
    .info-box .label{font-size:11px;color:#666;text-transform:uppercase;letter-spacing:0.5px}
    .info-box .value{font-size:14px;font-weight:600;margin-top:2px}
    .footer{background:#f8f9fa;padding:16px 24px;text-align:center;font-size:11px;color:#888}
    .net-box{background:#1a1a2e;color:#fff;border-radius:8px;padding:16px;text-align:center;margin-top:12px}
    .net-box .label{font-size:11px;text-transform:uppercase;letter-spacing:1px;opacity:0.8}
    .net-box .amount{font-size:28px;font-weight:700;margin-top:4px}
    @media print{body{padding:0}.payslip{border:none;border-radius:0}}
  `;

  return `<!DOCTYPE html><html><head>
    <meta charset="utf-8">
    <title>Payslip - ${data.staffName} - ${data.periodStart} to ${data.periodEnd}</title>
    <style>${styles}</style>
  </head><body>
    <div class="payslip">
      <div class="header">
        <div>
          <h1>Netlink Global Solutions</h1>
          <div style="font-size:12px;margin-top:4px;opacity:0.8">PAYSLIP</div>
        </div>
        <div class="meta">
          <div>Ref: ${data.paymentId.slice(0, 8).toUpperCase()}</div>
          <div>Period: ${data.periodStart} to ${data.periodEnd}</div>
          <div>Status: ${data.paymentStatus.toUpperCase()}</div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">Employee Information</div>
        <div class="grid">
          <div class="info-box">
            <div class="label">Name</div>
            <div class="value">${data.staffName}</div>
          </div>
          <div class="info-box">
            <div class="label">Position</div>
            <div class="value">${data.staffPosition || 'Staff'}</div>
          </div>
          <div class="info-box">
            <div class="label">Email</div>
            <div class="value">${data.staffEmail}</div>
          </div>
          <div class="info-box">
            <div class="label">Payment Date</div>
            <div class="value">${data.paymentDate || 'Pending'}</div>
          </div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">Attendance Summary</div>
        <div class="grid">
          <div class="info-box">
            <div class="label">Days Worked</div>
            <div class="value">${data.daysWorked}</div>
          </div>
          <div class="info-box">
            <div class="label">Regular Hours</div>
            <div class="value">${data.regularHours.toFixed(2)}</div>
          </div>
          <div class="info-box">
            <div class="label">Overtime Hours</div>
            <div class="value">${data.overtimeHours.toFixed(2)}</div>
          </div>
          <div class="info-box">
            <div class="label">Total Hours</div>
            <div class="value">${(data.regularHours + data.overtimeHours).toFixed(2)}</div>
          </div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">Earnings</div>
        <div class="row">
          <span class="label">Base Salary</span>
          <span class="value earning">ETB ${data.baseSalary.toLocaleString()}</span>
        </div>
        <div class="row">
          <span class="label">Overtime Pay (2×)</span>
          <span class="value earning">ETB ${data.overtimePay.toLocaleString()}</span>
        </div>
        <div class="row highlight">
          <span class="label">Gross Salary</span>
          <span class="value">ETB ${data.grossSalary.toLocaleString()}</span>
        </div>
      </div>

      <div class="section">
        <div class="section-title">Deductions</div>
        <div class="row">
          <span class="label">Income Tax</span>
          <span class="value deduction">- ETB ${data.deductions.incomeTax.toLocaleString()}</span>
        </div>
        <div class="row">
          <span class="label">Pension (Employee 7%)</span>
          <span class="value deduction">- ETB ${data.deductions.pensionEmployee.toLocaleString()}</span>
        </div>
        <div class="row highlight">
          <span class="label">Total Deductions</span>
          <span class="value deduction">- ETB ${data.deductions.totalDeductions.toLocaleString()}</span>
        </div>
      </div>

      <div class="section">
        <div class="section-title">Employer Contributions</div>
        <div class="row">
          <span class="label">Pension (Employer 11%)</span>
          <span class="value">ETB ${data.deductions.pensionEmployer.toLocaleString()}</span>
        </div>
      </div>

      <div class="section">
        <div class="net-box">
          <div class="label">Net Pay</div>
          <div class="amount">ETB ${data.deductions.netSalary.toLocaleString()}</div>
        </div>
      </div>

      <div class="footer">
        This is a computer-generated payslip. Generated on ${new Date().toLocaleDateString()} · Netlink Global Solutions PLC
      </div>
    </div>
  </body></html>`;
}

export function openPayslipPDF(data: PayslipData) {
  const html = generatePayslipHTML(data);
  const win = window.open("", "_blank");
  if (win) {
    win.document.write(html);
    win.document.close();
    setTimeout(() => win.print(), 500);
  }
}
