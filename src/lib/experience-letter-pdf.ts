// Generate professional Experience Letter as printable HTML (opens in new window for PDF/print)
// Format is FIXED — official document layout, world-class typography, A4 with paginated multi-page support.
// Brand colors: electric blue #0084D1 → bright green #00E68A gradient, primary green #00B36B, deep blue #1E4C91.

const LOGO_URL = "https://lksorcvlwtbhjwzirweg.supabase.co/storage/v1/object/public/employee-documents/company%2Fnetlink-logo.png";

const COMPANY = {
  name: "Netlink General Solutions PLC",
  address: "Addis Ababa, Ethiopia",
  email: "info@netlink-gs.com",
  phone: "+251913671010",
  website: "www.netlink-gs.com",
  location: "Addis Ababa, Ethiopia",
};

const BRAND = {
  gradient: "linear-gradient(135deg, #0084D1 0%, #00B36B 50%, #00E68A 100%)",
  electricBlue: "#0084D1",
  primaryGreen: "#00B36B",
  brightGreen: "#00E68A",
  deepBlue: "#1E4C91",
  ink: "#1a2235",
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
  approvalAudit?: Array<{ action: string; by: string; role: string; at: string; reason?: string }>;
}

function cleanContent(text: string): string {
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

  out = out.replace(/Netting General Solutions(\s+PLC)?/gi, "Netlink General Solutions PLC");
  out = out.replace(/Net\s?Link General Solutions/gi, "Netlink General Solutions PLC");

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

  // Zigzag SVG mask data URI — creates triangular sawtooth bottom edge
  const zigzagBottom = `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 6' preserveAspectRatio='none'><polygon points='0,0 100,0 100,2 95,6 90,2 85,6 80,2 75,6 70,2 65,6 60,2 55,6 50,2 45,6 40,2 35,6 30,2 25,6 20,2 15,6 10,2 5,6 0,2' fill='black'/></svg>`)}`;
  const zigzagTop = `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 6' preserveAspectRatio='none'><polygon points='0,6 100,6 100,4 95,0 90,4 85,0 80,4 75,0 70,4 65,0 60,4 55,0 50,4 45,0 40,4 35,0 30,4 25,0 20,4 15,0 10,4 5,0 0,4' fill='black'/></svg>`)}`;

  const styles = `
    *{margin:0;padding:0;box-sizing:border-box}
    @page{size:A4;margin:20mm 14mm 18mm 14mm}
    html,body{font-family:'Georgia','Times New Roman',serif;color:${BRAND.ink};background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact}
    body{padding:0}
    .letter-page{max-width:210mm;margin:0 auto;position:relative;padding:0}
    .watermark{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-30deg);font-size:90px;color:rgba(0,179,107,0.05);font-weight:900;white-space:nowrap;z-index:0;pointer-events:none;letter-spacing:8px;text-transform:uppercase}
    .content-wrapper{position:relative;z-index:1}

    /* ===== RUNNING (every-page) HEADER & FOOTER — slim, zigzag, brand gradient ===== */
    .page-header{position:fixed;top:0;left:0;right:0;height:16mm;background-image:${BRAND.gradient};background-color:#0084D1;color:#fff;display:flex;align-items:center;justify-content:space-between;padding:0 14mm;z-index:100;-webkit-mask-image:url("${zigzagBottom}");mask-image:url("${zigzagBottom}");-webkit-mask-size:100% 100%;mask-size:100% 100%;-webkit-mask-repeat:no-repeat;mask-repeat:no-repeat;box-shadow:0 2px 8px rgba(0,132,209,0.25)}
    .page-header .left{display:flex;align-items:center;gap:8px}
    .page-header .left img{height:28px;width:28px;background:#fff;border-radius:6px;padding:3px;box-shadow:0 1px 4px rgba(0,0,0,0.18)}
    .page-header .left .brand{line-height:1.1}
    .page-header .left .brand .name{font-size:11.5px;font-weight:700;letter-spacing:0.5px;font-family:'Helvetica',Arial,sans-serif}
    .page-header .left .brand .tag{font-size:7.5px;opacity:0.95;letter-spacing:1px;text-transform:uppercase}
    .page-header .right{text-align:right;font-size:8.5px;line-height:1.35;opacity:0.96;font-family:'Helvetica',Arial,sans-serif}
    .page-header .right .ref{font-weight:700;font-size:9.5px;letter-spacing:0.3px}

    .page-footer{position:fixed;bottom:0;left:0;right:0;height:12mm;background-image:${BRAND.gradient};background-color:#00B36B;color:#fff;display:flex;align-items:center;justify-content:space-between;padding:0 14mm;z-index:100;font-size:8.5px;font-family:'Helvetica',Arial,sans-serif;-webkit-mask-image:url("${zigzagTop}");mask-image:url("${zigzagTop}");-webkit-mask-size:100% 100%;mask-size:100% 100%;-webkit-mask-repeat:no-repeat;mask-repeat:no-repeat;box-shadow:0 -2px 8px rgba(0,179,107,0.25)}
    .page-footer .meta{display:flex;gap:10px;flex-wrap:wrap;align-items:center}
    .page-footer .meta span{white-space:nowrap}
    .page-footer .sep{opacity:0.6}
    .page-footer .pn{font-weight:700;letter-spacing:0.4px;font-size:9px}

    /* ===== Body ===== */
    .body{padding:4mm 18mm 4mm 18mm;position:relative;z-index:1}
    .first-page-meta{display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;padding-bottom:8px;border-bottom:2px solid ${BRAND.primaryGreen};color:${BRAND.deepBlue};font-size:11px}
    .first-page-meta .left{font-weight:700}
    .first-page-meta .right{color:#666}
    .letter-title{text-align:center;font-size:18px;font-weight:700;color:${BRAND.deepBlue};text-transform:uppercase;letter-spacing:3px;margin-bottom:18px;padding-bottom:6px;border-bottom:1px solid ${BRAND.primaryGreen}}
    .letter-body{font-size:12.5px;line-height:1.8;text-align:justify;hyphens:auto;color:${BRAND.ink}}
    .letter-body p{margin-bottom:12px;orphans:3;widows:3}

    .stats-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:20px 0;padding:14px;background:linear-gradient(135deg,rgba(0,132,209,0.06),rgba(0,230,138,0.06));border-radius:8px;border:1px solid ${BRAND.primaryGreen}33;page-break-inside:avoid}
    .stat-item{text-align:center;padding:6px}
    .stat-value{font-size:20px;font-weight:700;color:${BRAND.deepBlue}}
    .stat-label{font-size:9px;color:#777;text-transform:uppercase;letter-spacing:1px;margin-top:3px}

    .signature-section{margin-top:36px;display:flex;justify-content:space-between;padding:0 10px;page-break-inside:avoid}
    .sig-block{text-align:center;width:200px}
    .sig-line{border-top:1.5px solid ${BRAND.deepBlue};margin-top:46px;padding-top:6px}
    .sig-name{font-size:12px;font-weight:600;color:${BRAND.deepBlue}}
    .sig-title{font-size:10px;color:#666;font-style:italic}

    .audit-trail{margin-top:22px;padding:10px 12px;background:#f6fbf8;border-left:4px solid ${BRAND.primaryGreen};border-radius:4px;font-size:10px;color:#444;page-break-inside:avoid}
    .audit-trail .title{font-weight:700;color:${BRAND.deepBlue};font-size:10.5px;margin-bottom:4px;text-transform:uppercase;letter-spacing:0.6px}
    .audit-trail .row{display:flex;gap:8px;padding:2px 0;border-bottom:1px dashed #e0e7e3}
    .audit-trail .row:last-child{border-bottom:none}
    .audit-trail .row .when{font-weight:600;min-width:120px;color:${BRAND.primaryGreen}}
    .audit-trail .row .what{font-weight:600;color:${BRAND.deepBlue};min-width:80px}

    .qr-section{display:flex;align-items:center;gap:12px;margin-top:22px;padding:10px;background:#f0f7f4;border-radius:6px;border:1px dashed ${BRAND.primaryGreen}66;page-break-inside:avoid}
    .qr-section img{width:64px;height:64px}
    .qr-text{font-size:9.5px;color:#555;line-height:1.5}
    .qr-ref{font-weight:700;color:${BRAND.deepBlue};font-size:10.5px}

    @media print{
      .no-print{display:none!important}
      .letter-page{box-shadow:none;border:none;max-width:none}
      body{padding:0}
      /* Use pure CSS multi-page repeating header/footer */
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

  const auditTrailHtml = (data.approvalAudit && data.approvalAudit.length > 0) ? `
    <div class="audit-trail">
      <div class="title">Approval Audit Trail</div>
      ${data.approvalAudit.map(a => `
        <div class="row">
          <span class="when">${new Date(a.at).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}</span>
          <span class="what">${a.action.toUpperCase()}</span>
          <span>${a.role} — ${a.by}${a.reason ? ` · "${a.reason}"` : ""}</span>
        </div>
      `).join("")}
    </div>
  ` : "";

  const letterTypeDisplay = (data.letterType || "experience").replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());

  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><title>${letterTypeDisplay} Letter - ${data.staffName}</title>
<style>${styles}</style></head><body>
<div class="no-print" style="text-align:center;padding:12px;background:linear-gradient(135deg,#0084D1,#00E68A);color:#fff;font-size:13px">
  <button onclick="window.print()" style="padding:9px 26px;background:#fff;color:${BRAND.deepBlue};border:none;border-radius:6px;cursor:pointer;font-size:13px;margin-right:8px;font-weight:700;box-shadow:0 2px 6px rgba(0,0,0,0.2)">⬇ Download / Print PDF</button>
  <button onclick="window.close()" style="padding:9px 18px;background:rgba(255,255,255,0.2);border:1px solid rgba(255,255,255,0.4);color:#fff;border-radius:6px;cursor:pointer;font-size:13px">Close</button>
</div>

<!-- Repeating header on every page -->
<div class="page-header">
  <div class="left">
    <img src="${LOGO_URL}" alt="" />
    <div class="brand">
      <div class="name">${COMPANY.name}</div>
      <div class="tag">Information Technology &amp; Business Solutions</div>
    </div>
  </div>
  <div class="right">
    <div class="ref">Ref: ${refNum}</div>
    <div>${COMPANY.address}</div>
    <div>${COMPANY.phone} · ${COMPANY.email}</div>
  </div>
</div>

<!-- Repeating footer on every page -->
<div class="page-footer">
  <div class="meta">
    <span>${COMPANY.email}</span>
    <span class="sep">|</span>
    <span>${COMPANY.phone}</span>
    <span class="sep">|</span>
    <span>${COMPANY.website}</span>
  </div>
  <div class="pn">${COMPANY.name}</div>
</div>

<div class="letter-page">
  <div class="watermark">${COMPANY.name}</div>
  <div class="content-wrapper">
    <div class="body">
      <div class="first-page-meta">
        <div class="left">${letterTypeDisplay} Letter</div>
        <div class="right">Date: ${today}</div>
      </div>
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
      ${auditTrailHtml}
      <div class="qr-section">
        <img src="${qrUrl}" alt="QR Verification" />
        <div class="qr-text">
          <div class="qr-ref">Document Reference: ${refNum}</div>
          <div>Scan to verify this document's authenticity.</div>
          <div>Issued: ${today} · Valid for official use</div>
        </div>
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
    // Auto-trigger print dialog after render so users can save as PDF directly
    setTimeout(() => { try { w.focus(); } catch {} }, 400);
  }
}

// Direct PDF download (uses browser print-to-PDF; auto-opens print dialog)
export function downloadAsPDF(data: ExperienceLetterPDFData) {
  const html = generateExperienceLetterHTML(data);
  const w = window.open("", "_blank");
  if (w) {
    w.document.write(html);
    w.document.close();
    setTimeout(() => { try { w.focus(); w.print(); } catch {} }, 600);
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

// Excel-compatible download
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
  if (data.approvalAudit && data.approvalAudit.length) {
    rows.push(["", ""], ["Approval Audit Trail", ""]);
    data.approvalAudit.forEach(a => {
      rows.push([new Date(a.at).toLocaleString(), `${a.action.toUpperCase()} by ${a.role} — ${a.by}${a.reason ? ` (${a.reason})` : ""}`]);
    });
  }
  const escape = (v: string) => `"${(v || "").replace(/"/g, '""')}"`;
  const csv = rows.map(r => r.map(escape).join(",")).join("\r\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${data.letterType}_letter_${data.staffName.replace(/\s+/g, "_")}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
