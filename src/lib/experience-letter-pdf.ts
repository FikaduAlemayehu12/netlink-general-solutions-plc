// Generate professional Experience Letter as printable HTML (opens in new window for PDF/print)

const LOGO_URL = "https://lksorcvlwtbhjwzirweg.supabase.co/storage/v1/object/public/employee-documents/company%2Fnetlink-logo.png";

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
  // Remove markdown asterisks and clean up formatting
  return text
    .replace(/\*\*/g, "")
    .replace(/\*/g, "")
    .replace(/#{1,6}\s/g, "")
    .replace(/`/g, "")
    .replace(/---/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function generateExperienceLetterHTML(data: ExperienceLetterPDFData): string {
  const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const refNum = data.referenceNumber || `NGL-EXP-${Date.now().toString(36).toUpperCase()}`;
  const qrData = encodeURIComponent(`https://netlink-gs.com/verify/${refNum}`);
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${qrData}`;
  const cleanedContent = cleanContent(data.content || "");

  const styles = `
    *{margin:0;padding:0;box-sizing:border-box}
    @page{size:A4;margin:0}
    body{font-family:'Georgia','Times New Roman',serif;color:#1a1a2e;background:#fff;padding:0}
    .letter-page{max-width:210mm;min-height:297mm;margin:0 auto;position:relative;padding:0}
    .watermark{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-30deg);font-size:48px;color:rgba(26,26,46,0.04);font-weight:900;white-space:nowrap;z-index:0;pointer-events:none;letter-spacing:8px;text-transform:uppercase}
    .content-wrapper{position:relative;z-index:1;display:flex;flex-direction:column;min-height:297mm}

    .header{text-align:center;padding:30px 50px 20px;border-bottom:3px solid #1a1a2e}
    .logo-section{margin-bottom:10px}
    .logo-section img{height:80px;margin-bottom:8px;display:block;margin-left:auto;margin-right:auto}
    .company-name{font-size:22px;font-weight:700;color:#1a1a2e;letter-spacing:2px;text-transform:uppercase}
    .company-tagline{font-size:11px;color:#666;letter-spacing:3px;margin-top:2px}

    .ref-bar{display:flex;justify-content:space-between;padding:12px 50px;font-size:11px;color:#555;border-bottom:1px solid #e0e0e0;background:#fafafa}

    .body{flex:1;padding:30px 50px}
    .letter-title{text-align:center;font-size:18px;font-weight:700;color:#1a1a2e;text-transform:uppercase;letter-spacing:3px;margin-bottom:24px;text-decoration:underline;text-underline-offset:6px}
    .letter-body{font-size:13px;line-height:1.8;text-align:justify;white-space:pre-wrap}
    .letter-body p{margin-bottom:12px}

    .stats-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:20px 0;padding:16px;background:#f8f9fa;border-radius:8px;border:1px solid #e8e8e8}
    .stat-item{text-align:center;padding:8px}
    .stat-value{font-size:20px;font-weight:700;color:#1a1a2e}
    .stat-label{font-size:9px;color:#777;text-transform:uppercase;letter-spacing:1px;margin-top:2px}

    .signature-section{margin-top:40px;display:flex;justify-content:space-between;padding:0 20px}
    .sig-block{text-align:center;width:200px}
    .sig-line{border-top:1px solid #333;margin-top:50px;padding-top:6px}
    .sig-name{font-size:12px;font-weight:600}
    .sig-title{font-size:10px;color:#666}

    .qr-section{display:flex;align-items:center;gap:12px;margin-top:30px;padding:12px;background:#f0f4f8;border-radius:6px;border:1px dashed #c0c8d0}
    .qr-section img{width:70px;height:70px}
    .qr-text{font-size:9px;color:#666;line-height:1.5}
    .qr-ref{font-weight:700;color:#1a1a2e;font-size:10px}

    .footer{text-align:center;padding:16px 50px;border-top:3px solid #1a1a2e;background:#1a1a2e;color:#fff}
    .footer-content{display:flex;justify-content:center;gap:24px;font-size:10px;flex-wrap:wrap}
    .footer-item{display:flex;align-items:center;gap:4px}
    .footer-separator{color:rgba(255,255,255,0.3)}

    @media print{
      body{padding:0}
      .letter-page{box-shadow:none;border:none}
      .no-print{display:none!important}
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
<div class="letter-page">
  <div class="watermark">NETLINK GENERAL SOLUTIONS PLC</div>
  <div class="content-wrapper">
    <div class="header">
      <div class="logo-section">
        <img src="${LOGO_URL}" alt="Netlink General Solutions PLC Logo" />
        <div class="company-name">Netlink General Solutions PLC</div>
        <div class="company-tagline">Information Technology &amp; Business Solutions</div>
      </div>
    </div>
    <div class="ref-bar">
      <span>Ref: ${refNum}</span>
      <span>Date: ${today}</span>
    </div>
    <div class="body">
      <div class="letter-title">${letterTypeDisplay} Letter</div>
      <div class="letter-body">${cleanedContent}</div>
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
            <div class="sig-name">CEO</div>
            <div class="sig-title">Chief Executive Officer</div>
          </div>
        </div>
      </div>
      <div class="qr-section">
        <img src="${qrUrl}" alt="QR Verification" />
        <div class="qr-text">
          <div class="qr-ref">Document Reference: ${refNum}</div>
          <div>Scan to verify this document's authenticity.</div>
          <div>Issued: ${today} | Valid for official use</div>
        </div>
      </div>
    </div>
    <div class="footer">
      <div class="footer-content">
        <span class="footer-item">info@netlink-gs.com</span>
        <span class="footer-separator">|</span>
        <span class="footer-item">+251913671010</span>
        <span class="footer-separator">|</span>
        <span class="footer-item">www.netlink-gs.com</span>
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

// Generate Word-compatible HTML for download
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
