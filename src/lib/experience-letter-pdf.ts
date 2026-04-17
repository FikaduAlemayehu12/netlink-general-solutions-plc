// Generate professional Experience Letter as printable HTML (opens in new window for PDF/print)
// Format is FIXED — official document layout, world-class typography, A4 single-page preferred.

const LOGO_URL = "https://lksorcvlwtbhjwzirweg.supabase.co/storage/v1/object/public/employee-documents/company%2Fnetlink-logo.png";

const COMPANY = {
  name: "Netlink General Solutions PLC",
  address: "Addis Ababa, Ethiopia",
  email: "info@netlink-gs.com",
  phone: "+251913671010",
  website: "www.netlink-gs.com",
  location: "Addis Ababa, Ethiopia",
};

export interface ExperienceLetterPDFData {
  staffName: string;
  position: string;
  department: string;
  periodStart: string;
  periodEnd: string;
  content: string;
  referenceNumber: string;
  generatedData?: any;
  letterType: string;
  approvedDate?: string;
}

function cleanContent(text: string): string {
  // Strip markdown noise, normalize whitespace, fix common typos.
  let out = text
    .replace(/\*\*/g, "")
    .replace(/\*/g, "")
    .replace(/#{1,6}\s/g, "")
    .replace(/`/g, "")
    .replace(/^---+$/gm, "")
    .replace(/_{2,}/g, "")
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  // Common name corrections
  out = out.replace(/Netting General Solutions(\s+PLC)?/gi, "Netlink General Solutions PLC");
  out = out.replace(/Net Link General Solutions/gi, "Netlink General Solutions PLC");

  // Smart-quote / dash typography
  out = out
    .replace(/--/g, "—")
    .replace(/(\w)'(\w)/g, "$1\u2019$2");

  return out;
}

function paragraphs(text: string): string {
  return text
    .split(/\n{2,}/)
    .map((p) => `<p>${p.replace(/\n/g, "<br/>")}</p>`)
    .join("");
}

export function generateExperienceLetterHTML(data: ExperienceLetterPDFData): string {
  const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const refNum = data.referenceNumber || `NGL-EXP-${Date.now().toString(36).toUpperCase()}`;
  const qrData = encodeURIComponent(`https://netlink-gs.com/verify/${refNum}`);
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${qrData}`;
  const cleanedContent = cleanContent(data.content || "");
  const bodyHtml = paragraphs(cleanedContent);

  const styles = `
    *{margin:0;padding:0;box-sizing:border-box}
    @page{size:A4;margin:18mm 18mm 20mm 18mm}
    @page :first{margin:0}
    html,body{font-family:'Georgia','Times New Roman',serif;color:#1a1a2e;background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact}
    body{padding:0}
    .letter-page{max-width:210mm;margin:0 auto;position:relative;padding:0}
    .watermark{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-30deg);font-size:90px;color:rgba(26,26,46,0.04);font-weight:900;white-space:nowrap;z-index:0;pointer-events:none;letter-spacing:8px;text-transform:uppercase}
    .content-wrapper{position:relative;z-index:1}

    /* Full header — only on first page */
    .header{text-align:center;padding:26px 50px 16px;border-bottom:3px solid #1a1a2e}
    .logo-section img{height:72px;margin:0 auto 6px;display:block}
    .company-name{font-size:22px;font-weight:700;color:#1a1a2e;letter-spacing:1.5px;text-transform:uppercase}
    .company-tagline{font-size:10px;color:#666;letter-spacing:2px;margin-top:2px;text-transform:uppercase}
    .company-meta{margin-top:8px;font-size:11px;color:#444;line-height:1.55}
    .company-meta .row{display:flex;justify-content:center;gap:14px;flex-wrap:wrap}
    .company-meta .row span{white-space:nowrap}
    .meta-sep{color:#bbb}

    .ref-bar{display:flex;justify-content:space-between;padding:10px 50px;font-size:11px;color:#555;border-bottom:1px solid #e0e0e0;background:#fafafa}

    .body{padding:24px 50px 30px}
    .letter-title{text-align:center;font-size:17px;font-weight:700;color:#1a1a2e;text-transform:uppercase;letter-spacing:3px;margin-bottom:20px;text-decoration:underline;text-underline-offset:6px}
    .letter-body{font-size:12.5px;line-height:1.75;text-align:justify;hyphens:auto}
    .letter-body p{margin-bottom:11px;text-indent:0}
    .letter-body p:first-child{margin-top:0}

    .stats-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:18px 0;padding:14px;background:#f8f9fa;border-radius:6px;border:1px solid #e8e8e8;page-break-inside:avoid}
    .stat-item{text-align:center;padding:6px}
    .stat-value{font-size:18px;font-weight:700;color:#1a1a2e}
    .stat-label{font-size:9px;color:#777;text-transform:uppercase;letter-spacing:1px;margin-top:2px}

    .signature-section{margin-top:36px;display:flex;justify-content:space-between;padding:0 20px;page-break-inside:avoid}
    .sig-block{text-align:center;width:200px}
    .sig-line{border-top:1px solid #333;margin-top:46px;padding-top:6px}
    .sig-name{font-size:12px;font-weight:600}
    .sig-title{font-size:10px;color:#666}

    .qr-section{display:flex;align-items:center;gap:12px;margin-top:24px;padding:10px;background:#f0f4f8;border-radius:6px;border:1px dashed #c0c8d0;page-break-inside:avoid}
    .qr-section img{width:64px;height:64px}
    .qr-text{font-size:9px;color:#666;line-height:1.5}
    .qr-ref{font-weight:700;color:#1a1a2e;font-size:10px}

    .footer{text-align:center;padding:14px 50px;border-top:3px solid #1a1a2e;background:#1a1a2e;color:#fff;margin-top:24px}
    .footer-content{display:flex;justify-content:center;gap:18px;font-size:10px;flex-wrap:wrap}
    .footer-separator{color:rgba(255,255,255,0.3)}

    /* Continuation header (page 2+) — minimal: logo + company name only */
    .running-header{display:none;position:fixed;top:6mm;left:0;right:0;text-align:center;font-size:10px;color:#666;border-bottom:1px solid #e0e0e0;padding:0 18mm 4px}
    .running-header img{height:18px;vertical-align:middle;margin-right:8px}
    .running-footer{display:none;position:fixed;bottom:6mm;left:0;right:0;text-align:center;font-size:9px;color:#888;padding:0 18mm}

    @media print{
      .no-print{display:none!important}
      .running-header,.running-footer{display:block}
      .header,.ref-bar,.footer{page-break-inside:avoid}
      .letter-page{box-shadow:none;border:none;max-width:none}
      body{padding:0}
    }
  `;

  const statsHtml = data.generatedData?.statistics ? `
    <div class="stats-grid">
      <div class="stat-item"><div class="stat-value">${data.generatedData.statistics.projectsParticipated || 0}</div><div class="stat-label">Projects</div></div>
      <div class="stat-item"><div class="stat-value">${data.generatedData.statistics.tasksCompleted || 0}</div><div class="stat-label">Tasks Completed</div></div>
      <div class="stat-item"><div class="stat-value">${data.generatedData.statistics.ticketsResolved || 0}</div><div class="stat-label">Tickets Resolved</div></div>
      <div class="stat-item"><div class="stat-value">${data.generatedData.statistics.totalWorkHours || 0}</div><div class="stat-label">Work Hours</div></div>
      <div class="stat-item"><div class="stat-value">${data.generatedData.statistics.attendanceDays || 0}</div><div class="stat-label">Attendance Days</div></div>
      <div class="stat-item"><div class="stat-value">${data.generatedData.statistics.averagePerformanceGrade || 0}</div><div class="stat-label">Avg Grade</div></div>
    </div>
  ` : "";

  const letterTypeDisplay = (data.letterType || "experience").replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());

  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><title>${letterTypeDisplay} Letter - ${data.staffName}</title>
<style>${styles}</style></head><body>
<div class="no-print" style="text-align:center;padding:12px;background:#f0f4f8;font-size:13px">
  <button onclick="window.print()" style="padding:8px 24px;background:#1a1a2e;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:13px;margin-right:8px">Print / Save as PDF</button>
  <button onclick="window.close()" style="padding:8px 16px;background:#eee;border:1px solid #ccc;border-radius:4px;cursor:pointer;font-size:13px">Close</button>
</div>

<div class="running-header"><img src="${LOGO_URL}" alt="" />${COMPANY.name}</div>
<div class="running-footer">${COMPANY.name} — Ref: ${refNum}</div>

<div class="letter-page">
  <div class="watermark">${COMPANY.name}</div>
  <div class="content-wrapper">
    <div class="header">
      <div class="logo-section">
        <img src="${LOGO_URL}" alt="${COMPANY.name} Logo" />
        <div class="company-name">${COMPANY.name}</div>
        <div class="company-tagline">Information Technology &amp; Business Solutions</div>
      </div>
      <div class="company-meta">
        <div class="row">
          <span>${COMPANY.address}</span>
          <span class="meta-sep">|</span>
          <span>Email: ${COMPANY.email}</span>
        </div>
        <div class="row">
          <span>Location: ${COMPANY.location}</span>
          <span class="meta-sep">|</span>
          <span>Phone: ${COMPANY.phone}</span>
          <span class="meta-sep">|</span>
          <span>Date: ${today}</span>
        </div>
      </div>
    </div>
    <div class="ref-bar">
      <span>Ref: ${refNum}</span>
      <span>Issued: ${today}</span>
    </div>
    <div class="body">
      <div class="letter-title">${letterTypeDisplay} Letter</div>
      <div class="letter-body">${bodyHtml}</div>
      ${statsHtml}
      <div class="signature-section">
        <div class="sig-block">
          <div class="sig-line">
            <div class="sig-name">HR Manager</div>
            <div class="sig-title">Human Resources</div>
          </div>
        </div>
        <div class="sig-block">
          <div class="sig-line">
            <div class="sig-name">Chief Executive Officer</div>
            <div class="sig-title">${COMPANY.name}</div>
          </div>
        </div>
      </div>
      <div class="qr-section">
        <img src="${qrUrl}" alt="QR Verification" />
        <div class="qr-text">
          <div class="qr-ref">Document Reference: ${refNum}</div>
          <div>Scan to verify this document's authenticity.</div>
          <div>Issued: ${today} &middot; Valid for official use</div>
        </div>
      </div>
    </div>
    <div class="footer">
      <div class="footer-content">
        <span>${COMPANY.email}</span>
        <span class="footer-separator">|</span>
        <span>${COMPANY.phone}</span>
        <span class="footer-separator">|</span>
        <span>${COMPANY.website}</span>
        <span class="footer-separator">|</span>
        <span>${COMPANY.address}</span>
      </div>
    </div>
  </div>
</div>
</body></html>`;
}

export function openExperienceLetterPDF(data: ExperienceLetterPDFData) {
  const html = generateExperienceLetterHTML(data);
  const w = window.open("", "_blank");
  if (w) {
    w.document.write(html);
    w.document.close();
  }
}

// Word-compatible download
export function downloadAsWord(data: ExperienceLetterPDFData) {
  const html = generateExperienceLetterHTML(data);
  const blob = new Blob([`<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word'><head><meta charset='utf-8'></head><body>${html}</body></html>`], { type: "application/msword" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${data.letterType}_letter_${data.staffName.replace(/\s+/g, "_")}.doc`;
  a.click();
  URL.revokeObjectURL(url);
}

// Excel-compatible download (single sheet, structured)
export function downloadAsExcel(data: ExperienceLetterPDFData) {
  const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const stats = data.generatedData?.statistics || {};
  const rows: Array<[string, string]> = [
    ["Company", COMPANY.name],
    ["Address", COMPANY.address],
    ["Email", COMPANY.email],
    ["Phone", COMPANY.phone],
    ["Date", today],
    ["", ""],
    ["Reference", data.referenceNumber || ""],
    ["Letter Type", data.letterType || "experience"],
    ["Staff Name", data.staffName || ""],
    ["Position", data.position || ""],
    ["Department", data.department || ""],
    ["Period Start", data.periodStart || ""],
    ["Period End", data.periodEnd || ""],
    ["", ""],
    ["Projects", String(stats.projectsParticipated ?? "")],
    ["Tasks Completed", String(stats.tasksCompleted ?? "")],
    ["Tickets Resolved", String(stats.ticketsResolved ?? "")],
    ["Plans Completed", String(stats.plansCompleted ?? "")],
    ["Total Work Hours", String(stats.totalWorkHours ?? "")],
    ["Attendance Days", String(stats.attendanceDays ?? "")],
    ["Avg Performance Grade", String(stats.averagePerformanceGrade ?? "")],
    ["", ""],
    ["Letter Content", cleanContent(data.content || "")],
  ];
  const escape = (v: string) => `"${(v || "").replace(/"/g, '""')}"`;
  const csv = rows.map(r => r.map(escape).join(",")).join("\r\n");
  // BOM so Excel detects UTF-8
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${data.letterType}_letter_${data.staffName.replace(/\s+/g, "_")}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
