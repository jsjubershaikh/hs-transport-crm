import * as XLSX from 'xlsx';

/**
 * Client-side exporters.
 * - exportToCSV: data-URI download, no dependency.
 * - exportToExcel: SheetJS (xlsx) workbook download.
 *
 * `columns` is an array of { key, label, format? } and `rows` an array of objects.
 */

function toMatrix(columns, rows) {
  const header = columns.map((c) => c.label);
  const body = rows.map((row) =>
    columns.map((c) => {
      const raw = getByPath(row, c.key);
      return c.format ? c.format(raw, row) : raw ?? '';
    })
  );
  return { header, body };
}

function getByPath(obj, path) {
  return path.split('.').reduce((o, k) => (o == null ? o : o[k]), obj);
}

export function exportToCSV(filename, columns, rows) {
  const { header, body } = toMatrix(columns, rows);
  const escape = (v) => {
    const s = String(v ?? '');
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [header, ...body].map((r) => r.map(escape).join(',')).join('\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  triggerDownload(blob, `${filename}.csv`);
}

export function exportToExcel(filename, columns, rows, sheetName = 'Sheet1') {
  const { header, body } = toMatrix(columns, rows);
  const ws = XLSX.utils.aoa_to_sheet([header, ...body]);
  // Auto-ish column widths.
  ws['!cols'] = header.map((h, i) => {
    const maxLen = Math.max(String(h).length, ...body.map((r) => String(r[i] ?? '').length));
    return { wch: Math.min(40, maxLen + 2) };
  });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * "Export to PDF" for tabular reports uses the browser's print-to-PDF. The
 * caller renders a print-friendly area and calls window.print(). For richer
 * server-independent PDFs, drop in jsPDF + jspdf-autotable here.
 */
export function exportToPDF() {
  window.print();
}
