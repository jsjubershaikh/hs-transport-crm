/**
 * receiptPdf.js
 * Generates a PDF from the rendered receipt DOM node using html2canvas + jsPDF.
 */

/**
 * Capture the element with id="receipt-print-area" and return a jsPDF instance.
 * @returns {Promise<{pdf: import('jspdf').jsPDF, filename: string}>}
 */
export async function generateReceiptPdf(receiptNumber = 'receipt') {
  const { default: html2canvas } = await import('html2canvas');
  const { default: jsPDF } = await import('jspdf');

  const el = document.getElementById('receipt-print-area');
  if (!el) throw new Error('Receipt element not found');

  // Enforce absolute dimensions during html2canvas capture to prevent responsive stretch
  const originalWidth = el.style.width;
  const originalMinWidth = el.style.minWidth;
  const originalMaxWidth = el.style.maxWidth;
  const originalShadow = el.style.boxShadow;
  const originalBorder = el.style.border;

  el.style.width = '420px';
  el.style.minWidth = '420px';
  el.style.maxWidth = '420px';
  el.style.boxShadow = 'none';
  el.style.border = 'none';

  try {
    // Render at 2× scale for crisp output
    const canvas = await html2canvas(el, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a5' });

    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();

    // Fit image to A5 width while preserving aspect ratio
    const imgW = pageW;
    const imgH = (canvas.height * imgW) / canvas.width;
    const yOffset = imgH < pageH ? (pageH - imgH) / 2 : 0;

    pdf.addImage(imgData, 'PNG', 0, yOffset, imgW, Math.min(imgH, pageH));

    const filename = `receipt-${receiptNumber}.pdf`;
    return { pdf, filename };
  } finally {
    // Restore original styles
    el.style.width = originalWidth;
    el.style.minWidth = originalMinWidth;
    el.style.maxWidth = originalMaxWidth;
    el.style.boxShadow = originalShadow;
    el.style.border = originalBorder;
  }
}

/**
 * Download the receipt as a PDF file.
 */
export async function downloadReceiptPdf(receiptNumber) {
  const { pdf, filename } = await generateReceiptPdf(receiptNumber);
  pdf.save(filename);
}

/**
 * Download the PDF then open WhatsApp with a pre-filled message.
 */
export async function shareReceiptOnWhatsApp({ receiptNumber, studentName, month, amount, mobile, companyName }) {
  // 1. Generate + download the PDF first
  await downloadReceiptPdf(receiptNumber);

  // 2. Short pause so the download starts before the new tab
  await new Promise((r) => setTimeout(r, 600));

  // 3. Open WhatsApp with a message instructing the parent + receipt summary
  const msg =
    `Dear Parent of ${studentName}, please find the attached transport fee receipt.\n\n` +
    `📋 Receipt: ${receiptNumber}\n` +
    `📅 Month: ${month}\n` +
    `💰 Amount Paid: ₹${amount}\n\n` +
    `- ${companyName || 'HS School Bus'}`;

  window.open(`https://wa.me/91${mobile}?text=${encodeURIComponent(msg)}`, '_blank');
}
