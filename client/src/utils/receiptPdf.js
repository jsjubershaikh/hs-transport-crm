/**
 * receiptPdf.js
 * Generates professional, print-perfect PDF receipts by drawing natively with
 * jsPDF (vector text + shapes). This avoids html2canvas DOM rasterization, so
 * the output never stretches and is identical regardless of screen size.
 *
 * Two layouts share the same brand header/footer:
 *  - generateReceiptPdf      → single monthly receipt
 *  - generateBulkReceiptPdf  → bulk/advance receipt (many months in one payment)
 */

import { MONTH_LABELS } from './constants.js';

/* ------------------------------------------------------------------ */
/* Brand palette (matches tailwind.config.js)                          */
/* ------------------------------------------------------------------ */
const C = {
  primary: [11, 31, 75],
  primaryLight: [26, 58, 124],
  accent: [249, 115, 22],
  success: [22, 163, 74],
  warning: [217, 119, 6],
  danger: [220, 38, 38],
  text: [15, 23, 42],
  textSec: [100, 116, 139],
  border: [226, 232, 240],
  slate: [248, 250, 252],
  white: [255, 255, 255],
  muted: [203, 213, 225],
};

const setColor = (pdf, c) => pdf.setTextColor(c[0], c[1], c[2]);
const fillColor = (pdf, c) => pdf.setFillColor(c[0], c[1], c[2]);
const strokeColor = (pdf, c) => pdf.setDrawColor(c[0], c[1], c[2]);

/** Currency for the PDF. jsPDF core fonts lack the ₹ glyph, so use "Rs.". */
function money(value) {
  const n = Number(value) || 0;
  return 'Rs. ' + new Intl.NumberFormat('en-IN').format(n);
}

/** 15 August 2025 */
function longDate(date) {
  if (!date) return '—';
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
}

/** Load an image URL into a data-URL + natural size (for aspect-correct logos). */
function loadImage(url) {
  return new Promise((resolve) => {
    if (!url) return resolve(null);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        canvas.getContext('2d').drawImage(img, 0, 0);
        resolve({ dataUrl: canvas.toDataURL('image/png'), w: img.naturalWidth, h: img.naturalHeight });
      } catch {
        resolve(null); // tainted canvas / CORS — skip the logo gracefully
      }
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

/* ------------------------------------------------------------------ */
/* Shared layout pieces                                                */
/* ------------------------------------------------------------------ */
/** Navy brand header band with logo, company info, title and a status badge. */
function drawHeaderBand(pdf, PW, M, { company, logo, title, badgeText, badgeColor }) {
  const headerH = 30;
  fillColor(pdf, C.primary);
  pdf.rect(0, 0, PW, headerH, 'F');
  fillColor(pdf, C.accent);
  pdf.rect(0, headerH, PW, 1.2, 'F');

  let textX = M;
  if (logo) {
    const box = 16, lx = M, ly = (headerH - box) / 2;
    fillColor(pdf, C.white);
    pdf.roundedRect(lx, ly, box, box, 2.5, 2.5, 'F');
    const pad = 1.6, avail = box - pad * 2, ratio = logo.w / logo.h;
    let iw = avail, ih = avail;
    if (ratio > 1) ih = avail / ratio; else iw = avail * ratio;
    pdf.addImage(logo.dataUrl, 'PNG', lx + (box - iw) / 2, ly + (box - ih) / 2, iw, ih);
    textX = lx + box + 4;
  }

  setColor(pdf, C.white);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(15);
  pdf.text((company.name || 'HS School Bus').toUpperCase(), textX, 13);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7.5);
  setColor(pdf, C.muted);
  pdf.text('SCHOOL BUS SERVICES', textX, 18);
  const contact = [company.phone, company.email].filter(Boolean).join('   •   ');
  if (contact) {
    pdf.setFontSize(6.5);
    pdf.text(contact, textX, 23);
  }

  setColor(pdf, C.white);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10);
  pdf.text(title, PW - M, 12, { align: 'right' });

  if (badgeText) {
    pdf.setFontSize(7);
    const bw = pdf.getTextWidth(badgeText) + 6;
    const bx = PW - M - bw, by = 15.5, bh = 5.5;
    fillColor(pdf, badgeColor || C.accent);
    pdf.roundedRect(bx, by, bw, bh, 2.7, 2.7, 'F');
    setColor(pdf, C.white);
    pdf.text(badgeText, bx + bw / 2, by + 3.7, { align: 'center' });
  }
  return headerH;
}

/** Navy footer strip with a "computer-generated" note. */
function drawBottomStrip(pdf, PW, company) {
  const PH = pdf.internal.pageSize.getHeight();
  fillColor(pdf, C.primary);
  pdf.rect(0, PH - 6, PW, 6, 'F');
  setColor(pdf, C.white);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(6.5);
  pdf.text(`${company.name || 'HS School Bus'} — Computer-generated receipt`, PW / 2, PH - 2.2, { align: 'center' });
}

/** Footer note (left) + signature line (right). Returns nothing. */
function drawSignatureFooter(pdf, PW, M, CW, y, { note, signature }) {
  const sigX = PW - M - 38;
  strokeColor(pdf, C.textSec);
  pdf.setLineWidth(0.3);
  pdf.line(sigX, y, PW - M, y);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(7);
  setColor(pdf, C.textSec);
  pdf.text('AUTHORIZED SIGNATORY', (sigX + PW - M) / 2, y + 4, { align: 'center' });

  if (signature) {
    const sw = 26, sh = 9;
    pdf.addImage(signature.dataUrl, 'PNG', (sigX + PW - M) / 2 - sw / 2, y - sh - 1, sw, sh);
  }

  pdf.setFont('helvetica', 'italic');
  pdf.setFontSize(7.5);
  setColor(pdf, C.textSec);
  const noteLines = pdf.splitTextToSize(note, CW - 45);
  pdf.text(noteLines, M, y - 4);
}

/* ------------------------------------------------------------------ */
/* Single monthly receipt                                              */
/* ------------------------------------------------------------------ */
export async function generateReceiptPdf(receipt, settings = {}) {
  const { default: jsPDF } = await import('jspdf');
  if (!receipt) throw new Error('No receipt data');

  const student = receipt.studentId || {};
  const fee = receipt.feeRecordId || {};
  const company = settings.company || {};
  const cfg = settings.receipt || {};

  const monthLabel = MONTH_LABELS[receipt.month] || receipt.month || '—';
  const monthlyFee = fee.monthlyFee ?? receipt.amount;
  const remaining = fee.remainingAmount ?? 0;
  const status = (fee.status || (remaining <= 0 ? 'paid' : 'partial')).toUpperCase();

  const logo = await loadImage(company.logo || '/logo.png');
  const signature = cfg.signature ? await loadImage(cfg.signature) : null;

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a5' });
  const PW = pdf.internal.pageSize.getWidth();
  const M = 12;
  const CW = PW - M * 2;

  const headerH = drawHeaderBand(pdf, PW, M, {
    company, logo,
    title: 'PAYMENT RECEIPT',
    badgeText: status,
    badgeColor: status === 'PAID' ? C.success : C.warning,
  });

  let y = headerH + 9;
  y = drawMetaRow(pdf, PW, M, y, receipt);

  // student details
  y = drawStudentPanel(pdf, PW, M, CW, y, {
    student,
    extraLabel: 'Billing Month',
    extraValue: monthLabel,
  });

  // siblings covered (only when present)
  y = drawSiblingsCovered(pdf, M, CW, y, student.siblings);

  // payment details
  y = drawSectionTitle(pdf, M, y, 'Payment Details');
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(7);
  setColor(pdf, C.textSec);
  pdf.text('DESCRIPTION', M, y);
  pdf.text('AMOUNT', PW - M, y, { align: 'right' });
  y += 2;
  strokeColor(pdf, C.border);
  pdf.setLineWidth(0.4);
  pdf.line(M, y, PW - M, y);
  y += 5.5;

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9.5);
  setColor(pdf, C.text);
  pdf.text('Transport Fee Payment', M, y);
  pdf.text(money(receipt.amount), PW - M, y, { align: 'right' });
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7);
  setColor(pdf, C.textSec);
  pdf.text(`Month of ${monthLabel}`, M, y + 4);
  y += 9;

  strokeColor(pdf, C.border);
  pdf.setLineWidth(0.2);
  pdf.line(M, y, PW - M, y);
  y += 5;

  y = drawRow(pdf, PW, M, y, 'Monthly Fee Rate', money(monthlyFee));
  y = drawRow(pdf, PW, M, y, 'Total Amount Paid', money(receipt.amount), { bold: true });
  y = drawRow(pdf, PW, M, y, 'Remaining Balance', money(remaining), { color: remaining > 0 ? C.danger : C.text });
  y = drawRow(pdf, PW, M, y, 'Payment Mode', (fee.paymentMode || '—').toUpperCase());
  if (receipt.collectedBy) y = drawRow(pdf, PW, M, y, 'Collected By', receipt.collectedBy);
  y += 3;

  y = drawTotalBox(pdf, PW, M, CW, y, receipt.amount);
  y += 10;

  drawSignatureFooter(pdf, PW, M, CW, y, {
    note: cfg.footerText || 'Thank you for your prompt payment. Please keep this receipt for your records.',
    signature,
  });
  drawBottomStrip(pdf, PW, company);

  return { pdf, filename: `receipt-${receipt.receiptNumber || 'receipt'}.pdf` };
}

/* ------------------------------------------------------------------ */
/* Bulk / advance receipt                                              */
/* ------------------------------------------------------------------ */
export async function generateBulkReceiptPdf(receipt, settings = {}) {
  const { default: jsPDF } = await import('jspdf');
  if (!receipt) throw new Error('No receipt data');

  const student = receipt.studentId || {};
  const company = settings.company || {};
  const cfg = settings.receipt || {};
  const bulk = receipt.bulkDetails || [];

  const logo = await loadImage(company.logo || '/logo.png');
  const signature = cfg.signature ? await loadImage(cfg.signature) : null;

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a5' });
  const PW = pdf.internal.pageSize.getWidth();
  const PH = pdf.internal.pageSize.getHeight();
  const M = 12;
  const CW = PW - M * 2;

  const headerH = drawHeaderBand(pdf, PW, M, {
    company, logo,
    title: 'BULK RECEIPT',
    badgeText: 'ADVANCE',
    badgeColor: C.accent,
  });

  let y = headerH + 9;
  y = drawMetaRow(pdf, PW, M, y, receipt);

  y = drawStudentPanel(pdf, PW, M, CW, y, {
    student,
    extraLabel: 'Months Covered',
    extraValue: String(bulk.length),
  });

  // siblings covered (only when present)
  y = drawSiblingsCovered(pdf, M, CW, y, student.siblings);

  // month-wise table — adaptive row height so the receipt always fits one page
  y = drawSectionTitle(pdf, M, y, 'Month-wise Breakdown');
  const colAmountR = PW - M - 22;
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(7);
  setColor(pdf, C.textSec);
  pdf.text('MONTH', M + 2, y);
  pdf.text('AMOUNT', colAmountR, y, { align: 'right' });
  pdf.text('STATUS', PW - M - 2, y, { align: 'right' });
  y += 2;
  strokeColor(pdf, C.border);
  pdf.setLineWidth(0.4);
  pdf.line(M, y, PW - M, y);
  y += 1.5;

  const tableTop = y;
  const nRows = bulk.length;
  const nSummary = (receipt.collectedBy ? 1 : 0) + (receipt.paymentMode ? 1 : 0);
  // space the fixed bottom block needs: summary + total box + signature + strip
  const bottomBlock = nSummary * 5.5 + 4 + 13 + 9 + 18 + 8;
  const avail = PH - bottomBlock - tableTop;
  let rowH = nRows > 0 ? Math.min(7, avail / nRows) : 7;
  rowH = Math.max(rowH, 4); // floor so text still fits
  const rowFont = rowH < 4.7 ? 7.5 : 9;
  const tableH = rowH * nRows;

  bulk.forEach((d, i) => {
    const ry = tableTop + i * rowH;
    if (i % 2 === 1) {
      fillColor(pdf, C.slate);
      pdf.rect(M, ry, CW, rowH, 'F');
    }
    const baseline = ry + rowH * 0.68;
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(rowFont);
    setColor(pdf, C.text);
    pdf.text(MONTH_LABELS[d.month] || d.month, M + 2, baseline);
    pdf.setFont('helvetica', 'bold');
    setColor(pdf, C.success);
    pdf.text(money(d.amount), colAmountR, baseline, { align: 'right' });
    pdf.setFontSize(rowFont - 1.5);
    pdf.text('PAID', PW - M - 2, baseline, { align: 'right' });
  });
  // outer border around the table body
  strokeColor(pdf, C.border);
  pdf.setLineWidth(0.3);
  pdf.rect(M, tableTop, CW, tableH);
  y = tableTop + tableH + 5;

  // summary rows
  if (receipt.collectedBy) y = drawRow(pdf, PW, M, y, 'Collected By', receipt.collectedBy);
  if (receipt.paymentMode) y = drawRow(pdf, PW, M, y, 'Payment Mode', String(receipt.paymentMode).toUpperCase());
  y += 2;

  y = drawTotalBox(pdf, PW, M, CW, y, receipt.amount);
  y += 10;

  drawSignatureFooter(pdf, PW, M, CW, y, {
    note: cfg.footerText || 'Thank you for your bulk/advance payment. Please keep this receipt for your records.',
    signature,
  });
  drawBottomStrip(pdf, PW, company);

  return { pdf, filename: `bulk-receipt-${receipt.receiptNumber || 'receipt'}.pdf` };
}

/* ------------------------------------------------------------------ */
/* Manual receipt                                                      */
/* ------------------------------------------------------------------ */
export async function generateManualReceiptPdf(receipt, settings = {}) {
  const { default: jsPDF } = await import('jspdf');
  if (!receipt) throw new Error('No receipt data');

  const student = receipt.studentId || receipt.studentSnapshot || {};
  const company = settings.company || {};
  const cfg = settings.receipt || {};
  const items = receipt.items || [];

  const logo = await loadImage(company.logo || '/logo.png');
  const signature = cfg.signature ? await loadImage(cfg.signature) : null;

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a5' });
  const PW = pdf.internal.pageSize.getWidth();
  const PH = pdf.internal.pageSize.getHeight();
  const M = 12;
  const CW = PW - M * 2;

  const headerH = drawHeaderBand(pdf, PW, M, {
    company, logo,
    title: 'MANUAL RECEIPT',
    badgeText: 'MANUAL',
    badgeColor: C.accent,
  });

  let y = headerH + 9;
  y = drawMetaRow(pdf, PW, M, y, receipt);

  y = drawStudentPanel(pdf, PW, M, CW, y, {
    student,
    extraLabel: 'Payment Mode',
    extraValue: (receipt.paymentMode || '—').toUpperCase(),
  });

  // line-items table (adaptive height so it always fits one page)
  y = drawSectionTitle(pdf, M, y, 'Receipt Details');
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(7);
  setColor(pdf, C.textSec);
  pdf.text('DESCRIPTION', M + 2, y);
  pdf.text('AMOUNT', PW - M - 2, y, { align: 'right' });
  y += 2;
  strokeColor(pdf, C.border);
  pdf.setLineWidth(0.4);
  pdf.line(M, y, PW - M, y);
  y += 1.5;

  const tableTop = y;
  const nRows = items.length;
  const bottomBlock = (receipt.collectedBy ? 5.5 : 0) + 4 + 13 + 9 + 18 + 8;
  const avail = PH - bottomBlock - tableTop;
  let rowH = nRows > 0 ? Math.min(9, avail / nRows) : 9;
  rowH = Math.max(rowH, 5.5);

  items.forEach((it, i) => {
    const ry = tableTop + i * rowH;
    if (i % 2 === 1) {
      fillColor(pdf, C.slate);
      pdf.rect(M, ry, CW, rowH, 'F');
    }
    const mid = ry + rowH / 2 + 0.4;
    const desc = it.description + (it.month ? ` (${MONTH_LABELS[it.month] || it.month})` : '');
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(rowH < 6 ? 8 : 9);
    setColor(pdf, C.text);
    pdf.text(desc, M + 2, mid, { baseline: 'middle' });
    pdf.text(money(it.amount), PW - M - 2, mid, { align: 'right', baseline: 'middle' });
  });
  strokeColor(pdf, C.border);
  pdf.setLineWidth(0.3);
  pdf.rect(M, tableTop, CW, rowH * nRows);
  y = tableTop + rowH * nRows + 5;

  if (receipt.collectedBy) y = drawRow(pdf, PW, M, y, 'Collected By', receipt.collectedBy);
  y += 2;

  y = drawTotalBox(pdf, PW, M, CW, y, receipt.amount);
  y += 10;

  drawSignatureFooter(pdf, PW, M, CW, y, {
    note: receipt.note || cfg.footerText || 'This is a manually issued receipt. Please keep it for your records.',
    signature,
  });
  drawBottomStrip(pdf, PW, company);

  return { pdf, filename: `manual-receipt-${receipt.receiptNumber || 'receipt'}.pdf` };
}

/** Download a manual receipt as a PDF file. */
export async function downloadManualReceiptPdf(receipt, settings) {
  const { pdf, filename } = await generateManualReceiptPdf(receipt, settings);
  pdf.save(filename);
}

/** Download a manual receipt PDF then open WhatsApp with a pre-filled message. */
export async function shareManualReceiptOnWhatsApp({ receipt, settings, mobile }) {
  await downloadManualReceiptPdf(receipt, settings);
  await new Promise((r) => setTimeout(r, 600));

  const student = receipt?.studentId || receipt?.studentSnapshot || {};
  const companyName = settings?.company?.name || 'HS School Bus';
  const amount = `Rs. ${new Intl.NumberFormat('en-IN').format(Number(receipt?.amount) || 0)}`;
  const msg =
    `Dear Parent of ${student.name || ''}, please find the attached receipt.\n\n` +
    `Receipt: ${receipt?.receiptNumber}\n` +
    `Amount: ${amount}\n\n` +
    `- ${companyName}`;

  window.open(`https://wa.me/91${mobile}?text=${encodeURIComponent(msg)}`, '_blank');
}

/* ------------------------------------------------------------------ */
/* Small reusable drawing helpers                                      */
/* ------------------------------------------------------------------ */
function drawMetaRow(pdf, PW, M, y, receipt) {
  const labelValue = (label, value, x, align, valueColor) => {
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7);
    setColor(pdf, C.textSec);
    pdf.text(label.toUpperCase(), x, y, { align });
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(11);
    setColor(pdf, valueColor || C.text);
    pdf.text(String(value || '—'), x, y + 5, { align });
  };
  labelValue('Receipt Number', receipt.receiptNumber, M, 'left', C.primary);
  labelValue('Date Issued', longDate(receipt.generatedAt), PW - M, 'right', C.text);
  y += 11;
  strokeColor(pdf, C.border);
  pdf.setLineWidth(0.3);
  pdf.line(M, y, PW - M, y);
  return y + 7;
}

function drawSectionTitle(pdf, M, y, title) {
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  setColor(pdf, C.textSec);
  pdf.text(title.toUpperCase(), M, y);
  return y + 3;
}

/** A clean Name/Class mini-table of the siblings covered — only when present. */
function drawSiblingsCovered(pdf, M, CW, y, siblings) {
  const list = Array.isArray(siblings) ? siblings : [];
  if (!list.length) return y;

  y = drawSectionTitle(pdf, M, y, 'Siblings Covered');

  // header row
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(7);
  setColor(pdf, C.textSec);
  pdf.text('NAME', M + 2, y);
  pdf.text('CLASS', M + CW - 2, y, { align: 'right' });
  y += 2;
  strokeColor(pdf, C.border);
  pdf.setLineWidth(0.4);
  pdf.line(M, y, M + CW, y);
  y += 1.5;

  const rowH = 5.4;
  const top = y;
  list.forEach((s, i) => {
    const ry = top + i * rowH;
    if (i % 2 === 1) {
      fillColor(pdf, C.slate);
      pdf.rect(M, ry, CW, rowH, 'F');
    }
    const mid = ry + rowH / 2 + 0.4;
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8.5);
    setColor(pdf, C.text);
    pdf.text(s.name || '—', M + 2, mid, { baseline: 'middle' });
    pdf.setFont('helvetica', 'normal');
    setColor(pdf, C.textSec);
    const cls = s.class ? `Class ${s.class}` : '—';
    pdf.text(cls, M + CW - 2, mid, { align: 'right', baseline: 'middle' });
  });
  const tableH = rowH * list.length;
  strokeColor(pdf, C.border);
  pdf.setLineWidth(0.3);
  pdf.rect(M, top, CW, tableH);
  return top + tableH + 4;
}

function drawStudentPanel(pdf, PW, M, CW, y, { student, extraLabel, extraValue }) {
  y = drawSectionTitle(pdf, M, y, 'Student Details');
  const panelH = 22;
  fillColor(pdf, C.slate);
  strokeColor(pdf, C.border);
  pdf.setLineWidth(0.3);
  pdf.roundedRect(M, y, CW, panelH, 2, 2, 'FD');

  const col2X = M + CW / 2 + 2;
  const field = (label, value, x, fy) => {
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(6.5);
    setColor(pdf, C.textSec);
    pdf.text(label.toUpperCase(), x, fy);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9.5);
    setColor(pdf, C.text);
    pdf.text(String(value || '—'), x, fy + 4.5);
  };
  const classVal = student.class || '';
  field('Student', student.name, M + 5, y + 6);
  field("Father's Name", student.fatherName, col2X, y + 6);
  field('Class', classVal, M + 5, y + 14);
  field(extraLabel, extraValue, col2X, y + 14);
  return y + panelH + 8;
}

function drawRow(pdf, PW, M, y, label, value, opts = {}) {
  pdf.setFont('helvetica', opts.bold ? 'bold' : 'normal');
  pdf.setFontSize(opts.bold ? 9.5 : 8.5);
  setColor(pdf, C.textSec);
  pdf.text(label, M, y);
  setColor(pdf, opts.color || C.text);
  pdf.text(String(value), PW - M, y, { align: 'right' });
  return y + (opts.bold ? 6.5 : 5.5);
}

function drawTotalBox(pdf, PW, M, CW, y, amount) {
  const totH = 13;
  fillColor(pdf, C.primary);
  pdf.roundedRect(M, y, CW, totH, 2.5, 2.5, 'F');
  setColor(pdf, C.muted);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.text('TOTAL PAID', M + 5, y + totH / 2 + 0.5, { baseline: 'middle' });
  setColor(pdf, C.white);
  pdf.setFontSize(15);
  pdf.text(money(amount), PW - M - 5, y + totH / 2 + 0.5, { align: 'right', baseline: 'middle' });
  return y + totH;
}

/* ------------------------------------------------------------------ */
/* Public download / share helpers                                     */
/* ------------------------------------------------------------------ */
function isBulk(receipt) {
  return receipt?.receiptType === 'bulk' || (Array.isArray(receipt?.bulkDetails) && receipt.bulkDetails.length > 0);
}

/** Build the right PDF for the receipt type. */
export async function buildReceiptPdf(receipt, settings) {
  return isBulk(receipt)
    ? generateBulkReceiptPdf(receipt, settings)
    : generateReceiptPdf(receipt, settings);
}

/** Download a single receipt as a PDF file. */
export async function downloadReceiptPdf(receipt, settings) {
  const { pdf, filename } = await buildReceiptPdf(receipt, settings);
  pdf.save(filename);
}

/** Download a bulk receipt as a PDF file. */
export async function downloadBulkReceiptPdf(receipt, settings) {
  const { pdf, filename } = await generateBulkReceiptPdf(receipt, settings);
  pdf.save(filename);
}

/** Download the PDF (single or bulk) then open WhatsApp with a pre-filled message. */
export async function shareReceiptOnWhatsApp({ receipt, settings, mobile }) {
  await downloadReceiptPdf(receipt, settings);
  await new Promise((r) => setTimeout(r, 600));

  const student = receipt?.studentId || {};
  const companyName = settings?.company?.name || 'HS School Bus';
  const amount = `Rs. ${new Intl.NumberFormat('en-IN').format(Number(receipt?.amount) || 0)}`;
  const monthLine = isBulk(receipt)
    ? `Months Covered: ${(receipt?.bulkDetails || []).length}`
    : `Month: ${MONTH_LABELS[receipt?.month] || receipt?.month}`;

  const msg =
    `Dear Parent of ${student.name || ''}, please find the attached transport fee receipt.\n\n` +
    `Receipt: ${receipt?.receiptNumber}\n` +
    `${monthLine}\n` +
    `Amount Paid: ${amount}\n\n` +
    `- ${companyName}`;

  window.open(`https://wa.me/91${mobile}?text=${encodeURIComponent(msg)}`, '_blank');
}
