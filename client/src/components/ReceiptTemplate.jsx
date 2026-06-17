import { MapPin, Phone, Mail } from 'lucide-react';
import { formatCurrency, formatDateLong } from '../utils/format.js';
import { MONTH_LABELS } from '../utils/constants.js';

/**
 * Professional A5 print-optimized receipt. Given a populated receipt + settings
 * it mirrors the spec layout. Wrap in `.print-area` so @media print isolates it.
 */
export default function ReceiptTemplate({ receipt, settings }) {
  if (!receipt) return null;
  const student = receipt.studentId || {};
  const fee = receipt.feeRecordId || {};
  const company = settings?.company || {};
  const receiptCfg = settings?.receipt || {};
  const monthLabel = MONTH_LABELS[receipt.month] || receipt.month;
  const monthlyFee = fee.monthlyFee ?? receipt.amount;
  const remaining = fee.remainingAmount ?? 0;
  const status = fee.status || (remaining <= 0 ? 'paid' : 'partial');
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

        <div className="text-right">
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
              status === 'paid' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'
            }`}
          >
            {status} {status === 'paid' ? '✓' : ''}
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
          <Detail label="Billing Month" value={monthLabel} />
        </div>
      </div>

      {/* Payment Itemized Table */}
      <div className="mb-4">
        <div className="border-b border-border/80 pb-1.5 mb-1.5 flex justify-between text-[10px] font-bold uppercase tracking-wider text-text-secondary">
          <span>Item Description</span>
          <span className="text-right">Amount</span>
        </div>

        <div className="flex justify-between items-center text-xs py-2">
          <div>
            <p className="font-semibold text-text-primary">Transport Fee Payment</p>
            <p className="text-[10px] text-text-secondary">Month of {monthLabel}</p>
          </div>
          <span className="font-mono font-semibold text-text-primary">{formatCurrency(receipt.amount)}</span>
        </div>

        <div className="border-t border-border/60 pt-2 mt-2 space-y-1.5 text-xs">
          <Row label="Monthly Fee Rate" value={formatCurrency(monthlyFee)} />
          <Row label="Total Amount Paid" value={formatCurrency(receipt.amount)} strong />
          <Row label="Remaining Balance" value={formatCurrency(remaining)} highlight={remaining > 0} />
          <Row label="Payment Mode" value={(fee.paymentMode || '—').toUpperCase()} />
          {receipt.collectedBy && <Row label="Collected By" value={receipt.collectedBy} />}
        </div>
      </div>

      {/* Footer / Signature */}
      <div className="flex justify-between items-end mt-6 border-t border-border/60 pt-4">
        <p className="max-w-[60%] text-[10px] italic leading-relaxed text-text-secondary">
          {receiptCfg.footerText || 'Thank you for your prompt payment. Keep this receipt for your records.'}
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

function Row({ label, value, strong, highlight }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-text-secondary">{label}</span>
      <span
        className={`font-mono ${
          strong ? 'font-bold text-text-primary text-sm' : highlight ? 'font-bold text-danger' : 'text-text-primary'
        }`}
      >
        {value}
      </span>
    </div>
  );
}
