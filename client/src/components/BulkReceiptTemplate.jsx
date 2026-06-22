import { formatCurrency, formatDateLong } from '../utils/format.js';
import { MONTH_LABELS } from '../utils/constants.js';
import SiblingsCovered from './SiblingsCovered.jsx';

/**
 * Bulk/advance receipt — shows all months covered by one lump payment.
 * Mirrors the downloadable PDF (utils/receiptPdf.js) so view, print, and PDF match.
 * Used inside ReceiptModal when receiptType === 'bulk'.
 */
export default function BulkReceiptTemplate({ receipt, settings }) {
  if (!receipt) return null;
  const student = receipt.studentId || {};
  const company = settings?.company || {};
  const receiptCfg = settings?.receipt || {};
  const bulkDetails = receipt.bulkDetails || [];
  const logoSrc = company.logo || '/logo.png';
  const classVal = student.class || '';
  const contact = [company.phone, company.email].filter(Boolean).join('   •   ');

  return (
    <div
      id="receipt-print-area"
      className="print-area mx-auto w-full max-w-[420px] overflow-hidden rounded-xl border border-border bg-white font-sans text-text-primary shadow-sm"
    >
      {/* Brand Header band */}
      <div className="relative bg-primary px-5 pb-4 pt-4 text-white">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-white p-1.5">
              <img src={logoSrc} alt="logo" className="h-full w-full object-contain" />
            </div>
            <div>
              <h2 className="font-heading text-base font-extrabold uppercase leading-tight tracking-tight">
                {company.name || 'HS School Bus'}
              </h2>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-300">
                School Bus Services
              </p>
              {contact && <p className="mt-0.5 text-[9px] text-slate-300">{contact}</p>}
            </div>
          </div>

          <div className="flex flex-col items-end gap-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wide">Bulk Receipt</span>
            <span className="rounded-full bg-accent px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white">
              Advance
            </span>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-accent" />
      </div>

      <div className="p-5">
        {/* Receipt number / Date */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-text-secondary">Receipt Number</p>
            <p className="font-mono text-sm font-bold text-primary">{receipt.receiptNumber}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-text-secondary">Date Issued</p>
            <p className="text-sm font-bold text-text-primary">{formatDateLong(receipt.generatedAt)}</p>
          </div>
        </div>

        <div className="my-4 border-t border-border" />

        {/* Student Details */}
        <h4 className="mb-2 text-[10px] font-bold uppercase tracking-wider text-text-secondary">Student Details</h4>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 rounded-lg border border-border bg-slate-50 p-3">
          <Field label="Student" value={student.name} />
          <Field label="Father's Name" value={student.fatherName} />
          <Field label="Class" value={classVal} />
          <Field label="Months Covered" value={bulkDetails.length} />
        </div>

        {/* Siblings covered — only when this student has siblings */}
        {student.siblings?.length > 0 && <SiblingsCovered siblings={student.siblings} />}

        {/* Month-wise breakdown */}
        <h4 className="mb-2 mt-5 text-[10px] font-bold uppercase tracking-wider text-text-secondary">
          Month-wise Breakdown
        </h4>
        {bulkDetails.length > 0 && (
          <div className="overflow-hidden rounded-lg border border-border">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-slate-50 text-left text-[9px] font-bold uppercase tracking-wider text-text-secondary">
                  <th className="px-3 py-2">Month</th>
                  <th className="px-3 py-2 text-right">Amount</th>
                  <th className="px-3 py-2 text-right">Status</th>
                </tr>
              </thead>
              <tbody>
                {bulkDetails.map((d, i) => (
                  <tr key={i} className="border-b border-border/50 last:border-0">
                    <td className="px-3 py-2 font-medium text-text-primary">{MONTH_LABELS[d.month] || d.month}</td>
                    <td className="px-3 py-2 text-right font-mono font-semibold text-success">{formatCurrency(d.amount)}</td>
                    <td className="px-3 py-2 text-right">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-success">Paid</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Summary rows */}
        <div className="mt-3 space-y-1.5 text-xs">
          {receipt.collectedBy && <Row label="Collected By" value={receipt.collectedBy} />}
          {receipt.paymentMode && <Row label="Payment Mode" value={String(receipt.paymentMode).toUpperCase()} />}
        </div>

        {/* Total paid highlight */}
        <div className="mt-4 flex items-center justify-between rounded-lg bg-primary px-4 py-3 text-white">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300">Total Paid</span>
          <span className="font-mono text-lg font-extrabold">{formatCurrency(receipt.amount)}</span>
        </div>

        {/* Footer: note + signature */}
        <div className="mt-6 flex items-end justify-between gap-4">
          <p className="max-w-[55%] text-[10px] italic leading-relaxed text-text-secondary">
            {receiptCfg.footerText || 'Thank you for your bulk/advance payment. Please keep this receipt for your records.'}
          </p>
          <div className="min-w-[110px] text-center">
            {receiptCfg.signature ? (
              <img src={receiptCfg.signature} alt="signature" className="mx-auto mb-1 h-8 object-contain" />
            ) : (
              <div className="h-8" />
            )}
            <div className="border-t border-text-secondary/50 pt-1 text-[9px] font-bold uppercase tracking-wider text-text-secondary">
              Authorized Signatory
            </div>
          </div>
        </div>
      </div>

      {/* Bottom brand strip */}
      <div className="bg-primary py-1.5 text-center text-[9px] text-slate-300">
        {company.name || 'HS School Bus'} — Computer-generated receipt
      </div>
    </div>
  );
}

function Field({ label, value }) {
  return (
    <div>
      <p className="text-[9px] font-semibold uppercase tracking-wider text-text-secondary">{label}</p>
      <p className="mt-0.5 text-xs font-semibold leading-tight text-text-primary">{value || '—'}</p>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-text-secondary">{label}</span>
      <span className="font-mono text-text-primary">{value}</span>
    </div>
  );
}
