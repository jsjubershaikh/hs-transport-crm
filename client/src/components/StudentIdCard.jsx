import { useEffect, useRef } from 'react';
import { Bus, MapPin, Phone, Calendar, BookOpen, Route as RouteIcon } from 'lucide-react';

/**
 * StudentIdCard — renders a print-ready transport ID card for a student.
 * Opens in a new print window when called via StudentIdCard.print(student, settings).
 */

/* ─── Inline styles (string) injected into the print window ─── */
const PRINT_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: 'Inter', system-ui, sans-serif;
    background: #f1f5f9;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    padding: 24px;
  }

  .page {
    display: flex;
    flex-direction: column;
    gap: 24px;
    align-items: center;
  }

  /* ── Card shell: CR80 landscape = 85.6 × 54 mm ≈ 3.37 × 2.12 in ── */
  .card {
    width: 340px;
    min-height: 215px;
    border-radius: 16px;
    overflow: hidden;
    box-shadow: 0 8px 32px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.10);
    background: #fff;
    position: relative;
    page-break-inside: avoid;
  }

  /* ── Header band ── */
  .card-header {
    background: linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%);
    padding: 12px 16px 10px;
    display: flex;
    align-items: center;
    gap: 10px;
    position: relative;
    overflow: hidden;
  }
  .card-header::before {
    content: '';
    position: absolute;
    right: -20px; top: -20px;
    width: 90px; height: 90px;
    border-radius: 50%;
    background: rgba(255,255,255,0.07);
  }
  .card-header::after {
    content: '';
    position: absolute;
    right: 20px; top: 20px;
    width: 50px; height: 50px;
    border-radius: 50%;
    background: rgba(255,255,255,0.05);
  }
  .header-logo {
    width: 34px; height: 34px;
    border-radius: 8px;
    background: rgba(255,255,255,0.15);
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
  }
  .header-logo svg { color: #fff; }
  .header-text {}
  .header-org {
    color: #fff;
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 0.02em;
    line-height: 1.2;
  }
  .header-tag {
    color: rgba(255,255,255,0.72);
    font-size: 8.5px;
    font-weight: 500;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    margin-top: 1px;
  }
  .header-label {
    margin-left: auto;
    background: rgba(255,255,255,0.18);
    color: #fff;
    font-size: 7.5px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    padding: 3px 7px;
    border-radius: 20px;
    z-index: 1;
  }

  /* ── Body ── */
  .card-body {
    display: flex;
    gap: 14px;
    padding: 14px 16px 12px;
  }

  /* Photo column */
  .photo-wrap {
    flex-shrink: 0;
  }
  .photo {
    width: 66px; height: 80px;
    border-radius: 10px;
    object-fit: cover;
    border: 2.5px solid #e2e8f0;
    box-shadow: 0 2px 8px rgba(0,0,0,0.10);
  }
  .photo-placeholder {
    width: 66px; height: 80px;
    border-radius: 10px;
    background: linear-gradient(135deg, #dbeafe, #bfdbfe);
    display: flex; align-items: center; justify-content: center;
    font-size: 28px;
    font-weight: 800;
    color: #2563eb;
    border: 2.5px solid #bfdbfe;
    box-shadow: 0 2px 8px rgba(37,99,235,0.12);
  }

  /* Info column */
  .info {
    flex: 1;
    min-width: 0;
  }
  .student-name {
    font-size: 14px;
    font-weight: 800;
    color: #0f172a;
    line-height: 1.2;
    margin-bottom: 2px;
  }
  .father-name {
    font-size: 9.5px;
    color: #64748b;
    font-weight: 500;
    margin-bottom: 8px;
  }
  .details {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 5px 10px;
  }
  .detail-item {}
  .detail-label {
    font-size: 7.5px;
    font-weight: 600;
    color: #94a3b8;
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }
  .detail-value {
    font-size: 9.5px;
    font-weight: 600;
    color: #1e293b;
    line-height: 1.3;
    margin-top: 1px;
  }

  /* ── Footer band ── */
  .card-footer {
    background: #f8fafc;
    border-top: 1px solid #e2e8f0;
    padding: 7px 16px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }
  .footer-item {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 8px;
    color: #64748b;
    font-weight: 500;
  }
  .footer-item svg { color: #94a3b8; }
  .footer-id {
    font-size: 8px;
    font-weight: 700;
    color: #2563eb;
    background: #eff6ff;
    padding: 2px 7px;
    border-radius: 20px;
  }

  /* ── Print ── */
  @media print {
    body { background: white; padding: 0; }
    .card { box-shadow: none; border: 1px solid #e2e8f0; }
    .no-print { display: none !important; }
  }

  /* ── Print btn (screen only) ── */
  .print-btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 10px 24px;
    background: #2563eb;
    color: white;
    border: none;
    border-radius: 10px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    font-family: inherit;
    transition: background 0.2s;
  }
  .print-btn:hover { background: #1d4ed8; }
`;

/* ─── HTML template builder ─── */
function buildIdCardHtml({ student, settings }) {
  const company = settings?.company || {};
  const companyName = company.name || 'HS Transportation';
  const companyAddress = company.address || 'Pandit Nagar Cidco Colony Nashik-422009';
  const companyPhone = company.phone || '9822920739 / 8668651801';

  // Helper to build a single card HTML
  const buildCard = (cardStudent, isSibling) => {
    const photoHtml = cardStudent.photo
      ? `<img class="photo" src="${cardStudent.photo}" alt="${cardStudent.name}" />`
      : `<div class="photo-placeholder">${(cardStudent.name || 'S').charAt(0).toUpperCase()}</div>`;

    const classLabel = cardStudent.class
      ? `${cardStudent.class}${cardStudent.section ? `-${cardStudent.section}` : ''}`
      : '—';

    const dobFormatted = cardStudent.dob
      ? new Date(cardStudent.dob).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
      : '—';

    const routeName = student.routeId?.routeName || '—';
    const busNumber = student.busId?.busNumber || '—';
    const year = cardStudent.academicYearId?.label || student.academicYearId?.label || '—';

    // For primary student, if they have siblings, show their individual baseFee, otherwise show monthlyFee.
    // For siblings, show their sibling monthlyFee.
    const individualFee = isSibling 
      ? cardStudent.monthlyFee 
      : (student.siblings?.length > 0 ? student.baseFee : student.monthlyFee);

    const fee = individualFee
      ? `₹${Number(individualFee).toLocaleString('en-IN')}/mo`
      : '—';

    const displayId = (cardStudent._id || '').toString().slice(-6).toUpperCase();

    return `
      <!-- Card for ${cardStudent.name} -->
      <div class="card">
        <!-- Header -->
        <div class="card-header">
          <div class="header-logo">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
                 fill="none" stroke="currentColor" stroke-width="2.2"
                 stroke-linecap="round" stroke-linejoin="round">
              <path d="M8 6v6"/><path d="M15 6v6"/>
              <path d="M2 12h19.6"/><path d="M18 18h3s.5-1.7.8-2.8c.1-.4.2-.8.2-1.2 0-.4-.1-.8-.2-1.2l-1.4-5C20.1 6.8 19.1 6 18 6H4a2 2 0 0 0-2 2v10h3"/>
              <circle cx="7" cy="18" r="2"/><circle cx="15" cy="18" r="2"/>
            </svg>
          </div>
          <div class="header-text">
            <div class="header-org">${companyName}</div>
            <div class="header-tag">Transport Division</div>
          </div>
          <span class="header-label">Student ID</span>
        </div>

        <!-- Body -->
        <div class="card-body">
          <div class="photo-wrap">${photoHtml}</div>
          <div class="info">
            <div class="student-name">${cardStudent.name || '—'}</div>
            <div class="father-name">S/o ${student.fatherName || '—'}</div>
            <div class="details">
              <div class="detail-item">
                <div class="detail-label">Class</div>
                <div class="detail-value">${classLabel}</div>
              </div>
              <div class="detail-item">
                <div class="detail-label">School</div>
                <div class="detail-value">${student.school || '—'}</div>
              </div>
              <div class="detail-item">
                <div class="detail-label">Date of Birth</div>
                <div class="detail-value">${dobFormatted}</div>
              </div>
              <div class="detail-item">
                <div class="detail-label">Acad. Year</div>
                <div class="detail-value">${year}</div>
              </div>
              <div class="detail-item">
                <div class="detail-label">Route</div>
                <div class="detail-value">${routeName}</div>
              </div>
              <div class="detail-item">
                <div class="detail-label">Bus No.</div>
                <div class="detail-value">${busNumber}</div>
              </div>
              ${student.mobile ? `
              <div class="detail-item">
                <div class="detail-label">Mobile</div>
                <div class="detail-value">${student.mobile}</div>
              </div>` : ''}
              <div class="detail-item">
                <div class="detail-label">Monthly Fee</div>
                <div class="detail-value">${fee}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="card-footer">
          ${companyPhone ? `<span class="footer-item">📞 ${companyPhone}</span>` : ''}
          ${companyAddress ? `<span class="footer-item" style="flex:1;overflow:hidden;white-space:nowrap;text-overflow:ellipsis">📍 ${companyAddress}</span>` : ''}
          <span class="footer-id">ID: ${displayId}</span>
        </div>
      </div>
    `;
  };

  // Generate cards for primary student and siblings
  const cardsHtml = [];
  cardsHtml.push(buildCard(student, false));

  if (Array.isArray(student.siblings) && student.siblings.length > 0) {
    student.siblings.forEach((sibling) => {
      cardsHtml.push(buildCard(sibling, true));
    });
  }

  const titleText = student.siblings?.length > 0 
    ? `Transport ID Cards — ${student.name} & Siblings`
    : `Transport ID Card — ${student.name}`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${titleText}</title>
  <style>${PRINT_CSS}</style>
</head>
<body>
  <div class="page">

    <button class="print-btn no-print" onclick="window.print()">
      🖨️ Print ID Card${student.siblings?.length > 0 ? 's' : ''}
    </button>

    ${cardsHtml.join('\n')}

    <p class="no-print" style="font-size:12px;color:#94a3b8;text-align:center;margin-top:-8px;">
      Tip: Use your browser's Print → Scale = Fit or select A4/Letter paper for best results.
    </p>

  </div>
</body>
</html>`;
}

/* ─── Static helper — opens a print window ─── */
export function printStudentIdCard(student, settings) {
  const html = buildIdCardHtml({ student, settings });
  const win = window.open('', '_blank', 'width=520,height=680,menubar=no,toolbar=no');
  if (!win) {
    alert('Please allow pop-ups for this site to print the ID card.');
    return;
  }
  win.document.open();
  win.document.write(html);
  win.document.close();
}

/* ─── Default export: a React wrapper (not rendered, just for future use) ─── */
export default function StudentIdCard({ student, settings }) {
  return null; // All rendering happens in the print window
}
