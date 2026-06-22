/**
 * StudentIdCard — renders a premium, print-ready transport ID card for a student
 * (and their siblings) in a popup window with Print + Download (PNG) actions.
 * Call via printStudentIdCard(student, settings).
 */

/* ─── Inline styles injected into the popup ─── */
const PRINT_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@600;700;800&family=Inter:wght@400;500;600;700&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: 'Inter', system-ui, sans-serif;
    background: radial-gradient(at 30% 10%, #eef2f9 0, #e2e8f0 100%);
    display: flex; align-items: center; justify-content: center;
    min-height: 100vh; padding: 28px;
  }
  .page { display: flex; flex-direction: column; gap: 22px; align-items: center; width: 100%; }

  /* Toolbar */
  .toolbar { display: flex; gap: 10px; }
  .btn {
    display: inline-flex; align-items: center; gap: 7px;
    padding: 11px 22px; border-radius: 11px; font-size: 13px; font-weight: 700;
    cursor: pointer; font-family: inherit; border: none; transition: all .18s;
  }
  .btn-print { background: #0B1F4B; color: #fff; }
  .btn-print:hover { background: #1A3A7C; }
  .btn-dl { background: #F97316; color: #fff; }
  .btn-dl:hover { background: #ea6a09; }
  .btn:disabled { opacity: .6; cursor: default; }

  /* ── Card: CR80 landscape ratio ── */
  .card {
    width: 364px;
    background: #fff;
    border-radius: 18px;
    overflow: hidden;
    position: relative;
    box-shadow: 0 18px 44px rgba(11,31,75,.24), 0 4px 12px rgba(11,31,75,.12);
    page-break-inside: avoid;
  }
  /* left accent stripe */
  .card::before {
    content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 6px;
    background: linear-gradient(180deg, #F97316, #fb923c); z-index: 4;
  }

  /* Header */
  .card-header {
    background: linear-gradient(135deg, #0B1F4B 0%, #1A3A7C 100%);
    padding: 14px 16px 13px 22px;
    display: flex; align-items: center; gap: 11px;
    position: relative; overflow: hidden;
  }
  .card-header::after {
    content: ''; position: absolute; right: -26px; top: -26px;
    width: 110px; height: 110px; border-radius: 50%;
    background: rgba(255,255,255,.06);
  }
  .logo-tile {
    width: 40px; height: 40px; border-radius: 10px; background: #fff;
    display: flex; align-items: center; justify-content: center; padding: 4px;
    box-shadow: 0 2px 8px rgba(0,0,0,.22); flex-shrink: 0; z-index: 1;
  }
  .logo-tile img { width: 100%; height: 100%; object-fit: contain; }
  .org { z-index: 1; }
  .org-name { color: #fff; font-family: 'Plus Jakarta Sans', sans-serif; font-size: 13px; font-weight: 800; letter-spacing: .01em; line-height: 1.15; }
  .org-tag { color: rgba(255,255,255,.62); font-size: 8px; font-weight: 600; letter-spacing: .16em; text-transform: uppercase; margin-top: 2px; }
  .id-pill {
    margin-left: auto; background: #F97316; color: #fff;
    font-size: 8px; font-weight: 800; letter-spacing: .1em; text-transform: uppercase;
    padding: 4px 9px; border-radius: 30px; z-index: 1;
  }

  /* Body */
  .card-body { position: relative; display: flex; gap: 15px; padding: 16px 16px 13px 22px; }
  .watermark { position: absolute; right: -14px; bottom: -24px; width: 150px; height: 150px; opacity: .05; object-fit: contain; pointer-events: none; }
  .photo {
    width: 72px; height: 88px; border-radius: 11px; object-fit: cover;
    border: 3px solid #fff; box-shadow: 0 0 0 1.5px #cbd5e1, 0 4px 12px rgba(11,31,75,.18); flex-shrink: 0;
  }
  .photo-ph {
    width: 72px; height: 88px; border-radius: 11px; flex-shrink: 0;
    background: linear-gradient(135deg, #0B1F4B, #1A3A7C);
    display: flex; align-items: center; justify-content: center;
    font-family: 'Plus Jakarta Sans', sans-serif; font-size: 30px; font-weight: 800; color: #fff;
    box-shadow: 0 0 0 1.5px #cbd5e1, 0 4px 12px rgba(11,31,75,.18);
  }
  .info { flex: 1; min-width: 0; z-index: 1; }
  .name { font-family: 'Plus Jakarta Sans', sans-serif; font-size: 15.5px; font-weight: 800; color: #0B1F4B; line-height: 1.15; }
  .sub { font-size: 9.5px; color: #64748b; font-weight: 500; margin: 2px 0 10px; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 12px; }
  .lbl { font-size: 7px; font-weight: 700; letter-spacing: .07em; text-transform: uppercase; color: #94a3b8; }
  .val { font-size: 9.5px; font-weight: 600; color: #1e293b; margin-top: 1px; line-height: 1.25; }

  /* Footer */
  .card-footer {
    background: #0B1F4B; padding: 8px 16px 8px 22px;
    display: flex; align-items: center; justify-content: space-between; gap: 8px;
  }
  .foot-txt { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
  .foot-txt span { font-size: 7.5px; color: rgba(255,255,255,.72); font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .foot-id { font-size: 8.5px; font-weight: 800; color: #0B1F4B; background: #F97316; padding: 3px 9px; border-radius: 30px; flex-shrink: 0; }

  @media print {
    body { background: #fff; padding: 0; }
    .no-print { display: none !important; }
    .page { gap: 14px; }
    .card { box-shadow: none; border: 1px solid #e2e8f0; }
  }
`;

/* ─── HTML template builder ─── */
function buildIdCardHtml({ student, settings }) {
  const company = settings?.company || {};
  const companyName = company.name || 'HS School Bus';
  const companyAddress = company.address || 'Pandit Nagar Cidco Colony Nashik-422009';
  const companyPhone = company.phone || '9822920739 / 8668651801';
  const origin = (typeof window !== 'undefined' && window.location?.origin) || '';
  const logoUrl = company.logo || `${origin}/logo.png`;

  const esc = (v) => String(v ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const safe = (v) => String(v ?? 'student').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase();

  const buildCard = (cardStudent, isSibling) => {
    const photoHtml = cardStudent.photo
      ? `<img class="photo" crossorigin="anonymous" src="${esc(cardStudent.photo)}" alt="${esc(cardStudent.name)}" />`
      : `<div class="photo-ph">${esc((cardStudent.name || 'S').charAt(0).toUpperCase())}</div>`;

    const classLabel = cardStudent.class || '—';
    const dobFormatted = cardStudent.dob
      ? new Date(cardStudent.dob).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
      : '—';
    const routeName = student.routeId?.routeName || '—';
    const busNumber = student.busId?.busNumber || '—';
    const year = cardStudent.academicYearId?.label || student.academicYearId?.label || '—';
    const individualFee = isSibling
      ? cardStudent.monthlyFee
      : (student.siblings?.length > 0 ? student.baseFee : student.monthlyFee);
    const fee = individualFee ? `Rs. ${Number(individualFee).toLocaleString('en-IN')}/mo` : '—';
    const displayId = (cardStudent._id || '').toString().slice(-6).toUpperCase();

    return `
      <div class="card" data-name="id-card-${safe(cardStudent.name)}">
        <div class="card-header">
          <div class="logo-tile"><img crossorigin="anonymous" src="${esc(logoUrl)}" alt="logo" /></div>
          <div class="org">
            <div class="org-name">${esc(companyName)}</div>
            <div class="org-tag">Transport Division</div>
          </div>
          <span class="id-pill">Student ID</span>
        </div>

        <div class="card-body">
          <img class="watermark" crossorigin="anonymous" src="${esc(logoUrl)}" alt="" />
          ${photoHtml}
          <div class="info">
            <div class="name">${esc(cardStudent.name || '—')}</div>
            <div class="sub">S/o ${esc(student.fatherName || '—')}</div>
            <div class="grid">
              <div><div class="lbl">Class</div><div class="val">${esc(classLabel)}</div></div>
              <div><div class="lbl">School</div><div class="val">${esc(student.school || '—')}</div></div>
              <div><div class="lbl">Route</div><div class="val">${esc(routeName)}</div></div>
              <div><div class="lbl">Bus No.</div><div class="val">${esc(busNumber)}</div></div>
              <div><div class="lbl">Date of Birth</div><div class="val">${esc(dobFormatted)}</div></div>
              <div><div class="lbl">Monthly Fee</div><div class="val">${esc(fee)}</div></div>
              ${student.mobile ? `<div><div class="lbl">Mobile</div><div class="val">${esc(student.mobile)}</div></div>` : ''}
              <div><div class="lbl">Acad. Year</div><div class="val">${esc(year)}</div></div>
            </div>
          </div>
        </div>

        <div class="card-footer">
          <div class="foot-txt">
            <span>${esc(companyPhone)}</span>
            <span>${esc(companyAddress)}</span>
          </div>
          <span class="foot-id">ID ${esc(displayId)}</span>
        </div>
      </div>
    `;
  };

  const cardsHtml = [buildCard(student, false)];
  if (Array.isArray(student.siblings) && student.siblings.length > 0) {
    student.siblings.forEach((sibling) => cardsHtml.push(buildCard(sibling, true)));
  }
  const plural = student.siblings?.length > 0;
  const titleText = plural ? `Transport ID Cards — ${companyName}` : `Transport ID Card — ${student.name}`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${esc(titleText)}</title>
  <style>${PRINT_CSS}</style>
</head>
<body>
  <div class="page">
    <div class="toolbar no-print">
      <button class="btn btn-print" onclick="window.print()">🖨️ Print${plural ? ' Cards' : ''}</button>
      <button class="btn btn-dl" id="dlBtn">⬇️ Download${plural ? ' Cards' : ''}</button>
    </div>

    ${cardsHtml.join('\n')}

    <p class="no-print" style="font-size:12px;color:#94a3b8;text-align:center;">
      Download saves a high-resolution PNG. For PDF, use Print → Save as PDF.
    </p>
  </div>

  <script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
  <script>
    document.getElementById('dlBtn').addEventListener('click', async function () {
      if (typeof html2canvas === 'undefined') { alert('Still loading — please try again in a second.'); return; }
      var btn = this, cards = document.querySelectorAll('.card');
      btn.disabled = true; var orig = btn.textContent; btn.textContent = 'Preparing…';
      try {
        for (var i = 0; i < cards.length; i++) {
          var canvas = await html2canvas(cards[i], { scale: 3, useCORS: true, backgroundColor: '#ffffff' });
          var a = document.createElement('a');
          a.href = canvas.toDataURL('image/png');
          a.download = (cards[i].getAttribute('data-name') || ('id-card-' + (i + 1))) + '.png';
          document.body.appendChild(a); a.click(); document.body.removeChild(a);
          await new Promise(function (r) { setTimeout(r, 350); });
        }
      } catch (e) {
        alert('Could not generate the image (a student photo may be blocking it). Use Print → Save as PDF instead.');
      } finally { btn.disabled = false; btn.textContent = orig; }
    });
  </script>
</body>
</html>`;
}

/* ─── Static helper — opens a print/download window ─── */
export function printStudentIdCard(student, settings) {
  const html = buildIdCardHtml({ student, settings });
  const win = window.open('', '_blank', 'width=560,height=720,menubar=no,toolbar=no');
  if (!win) {
    alert('Please allow pop-ups for this site to open the ID card.');
    return;
  }
  win.document.open();
  win.document.write(html);
  win.document.close();
}

/* ─── Default export kept for compatibility ─── */
export default function StudentIdCard() {
  return null; // All rendering happens in the popup window
}
