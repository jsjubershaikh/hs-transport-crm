import { MapPin, Phone, Mail } from 'lucide-react';
import { formatCurrency, formatDateLong } from '../utils/format.js';
import { MONTH_LABELS } from '../utils/constants.js';

/**
 * Bulk/advance receipt template — shows all months covered by one lump payment.
 * Used inside ReceiptModal when receiptType === 'bulk'.
 */
export default function BulkReceiptTemplate({ receipt, settings }) {
  if (!receipt) return null;
  const student = receipt.studentId || {};
  const company = settings?.company || {};
  const receiptCfg = settings?.receipt || {};
  const bulkDetails = receipt.bulkDetails || [];
  const logoSrc = company.logo || '/logo.png';

  return (
    <div
      id="receipt-print-area"
      className="print-area mx-auto w-full max-w-[420px] rounded-xl border border-border bg-white p-6 font-sans text-text-primary shadow-sm relative overflow-hidden"
    >
      {/* Decorative top accent line */}
      <div className="absolute top-0 left-0 right-0 h-1.5 bg-primary" />

      {/* Brand Header */}
      <div className="flex items-start justify-between border-b border-border pb-4 pt-2">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-50 p-1 border border-border">
            <img src={logoSrc} alt="logo" className="h-full w-full rounded-lg object-contain" />
          </div>
          <div>
            <h2 className="font-heading text-base font-extrabold uppercase tracking-tight text-primary">
              {company.name || 'HS School Bus'}
            </h2>
            <p className="text-[10px] text-text-secondary uppercase tracking-wider font-semibold">School Bus Services</p>
          </div>
        </div>

        <div className="text-right flex flex-col items-end gap-1">
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-primary">
            Bulk Receipt
          </span>
        </div>
      </div>

      {/* Contact Details */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 py-2 text-[10px] text-text-secondary border-b border-dashed border-border mb-3">
        {company.address && (
          <span className="flex items-center gap-1">
            <MapPin size={10} /> {company.address}
          </span>
        )}
        {company.phone && (
          <span className="flex items-center gap-1">
            <Phone size={10} /> {company.phone}
          </span>
        )}
        {company.email && (
          <span className="flex items-center gap-1">
            <Mail size={10} /> {company.email}
          </span>
        )}
      </div>

      {/* Receipt Info Section */}
      <div className="flex justify-between items-start gap-4 mb-4 text-xs">
        <div>
          <p className="text-[10px] uppercase tracking-wide text-text-secondary font-semibold">Receipt Number</p>
          <p className="font-mono font-bold text-primary text-sm">{receipt.receiptNumber}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-wide text-text-secondary font-semibold">Date Issued</p>
          <p className="font-medium text-text-primary">{formatDateLong(receipt.generatedAt)}</p>
        </div>
      </div>

      {/* Student Details Panel */}
      <div className="rounded-lg bg-slate-50 p-3 mb-4 border border-border/40">
        <h4 className="text-[10px] font-bold uppercase tracking-wider text-text-secondary mb-2 border-b border-border/60 pb-1">
          Student Details
        </h4>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-xs">
          <Detail label="Student" value={student.name} />
          <Detail label="Father's Name" value={student.fatherName} />
          <Detail label="Class / Section" value={`${student.class || ''}${student.section ? ' - ' + student.section : ''}`} />
          <Detail label="Months Covered" value={bulkDetails.length} />
        </div>
      </div>

      {/* Month-wise breakdown */}
      {bulkDetails.length > 0 && (
        <div className="mb-4 overflow-hidden rounded-lg border border-border/80 text-xs">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-slate-50 text-left text-[9px] font-semibold uppercase tracking-wider text-text-secondary">
                <th className="px-3 py-1.5">Month</th>
                <th className="px-3 py-1.5 text-right">Applied</th>
                <th className="px-3 py-1.5 text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {bulkDetails.map((d, i) => (
                <tr key={i} className="border-b border-border/40 last:border-0">
                  <td className="px-3 py-1.5 font-medium">{MONTH_LABELS[d.month] || d.month}</td>
                  <td className="px-3 py-1.5 text-right font-mono font-semibold text-success">{formatCurrency(d.amount)}</td>
                  <td className="px-3 py-1.5 text-center">
                    <span className="inline-block rounded-full bg-success/15 px-2 py-0.2 text-[9px] font-bold uppercase text-success">
                      Paid
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Total block */}
      <div className="space-y-1.5 rounded-lg bg-slate-50 p-3.5 border border-border/40 text-xs">
        <Row label="Months Covered" value={bulkDetails.length} />
        {receipt.collectedBy && <Row label="Collected By" value={receipt.collectedBy} />}
        {receipt.paymentMode && <Row label="Payment Mode" value={receipt.paymentMode.toUpperCase()} />}
        <div className="flex items-center justify-between border-t border-border/60 pt-2 mt-2">
          <span className="font-semibold text-text-primary text-xs">Total Amount Paid</span>
          <span className="font-heading text-base font-extrabold text-primary">{formatCurrency(receipt.amount)}</span>
        </div>
      </div>

      {/* Footer / Signature */}
      <div className="flex justify-between items-end mt-6 border-t border-border/60 pt-4">
        <p className="max-w-[60%] text-[10px] italic leading-relaxed text-text-secondary">
          {receiptCfg.footerText || 'Thank you for your bulk/advance payment. Keep this receipt for your records.'}
        </p>
        <div className="text-center min-w-[100px]">
          {receiptCfg.signature ? (
            <img src={receiptCfg.signature} alt="signature" className="mx-auto h-8 object-contain mb-1" />
          ) : (
            <div className="h-8" />
          )}
          <div className="border-t border-text-secondary/40 pt-1 text-[9px] font-semibold uppercase tracking-wider text-text-secondary">
            Authorized Signatory
          </div>
        </div>
      </div>
    </div>
  );
}

function Detail({ label, value }) {
  return (
    <div>
      <p className="text-[9px] uppercase tracking-wider font-semibold text-text-secondary">{label}</p>
      <p className="font-medium text-text-primary leading-tight mt-0.5">{value || '—'}</p>
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
