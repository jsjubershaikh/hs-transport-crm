import { Bus, MapPin, Phone, Mail } from 'lucide-react';
import { formatCurrency, formatDateLong } from '../utils/format.js';
import { MONTH_LABELS } from '../utils/constants.js';

/**
 * Professional A5 print-optimized receipt. Given a populated receipt + settings
 * it mirrors the spec layout. Wrap in `.print-area` so @media print isolates it.
 */
export default function ReceiptTemplate({ receipt, settings }) {
  if (!receipt) return null;
  const student = receipt.studentId || {};
  const route = receipt.routeId || {};
  const fee = receipt.feeRecordId || {};
  const company = settings?.company || {};
  const receiptCfg = settings?.receipt || {};
  const year = receipt.academicYearId?.label || '';
  const monthLabel = MONTH_LABELS[receipt.month] || receipt.month;
  const monthlyFee = fee.monthlyFee ?? receipt.amount;
  const remaining = fee.remainingAmount ?? 0;
  const status = fee.status || (remaining <= 0 ? 'paid' : 'partial');

  return (
    <div id="receipt-print-area" className="print-area mx-auto max-w-md rounded-xl border border-border bg-white p-6 font-sans text-text-primary">
      {/* Header */}
      <div className="flex items-center gap-3 border-b-2 border-primary pb-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-accent">
          {company.logo ? (
            <img src={company.logo} alt="logo" className="h-12 w-12 rounded-xl object-cover" />
          ) : (
            <Bus size={26} />
          )}
        </div>
        <div className="flex-1">
          <h2 className="font-heading text-lg font-extrabold uppercase tracking-tight text-primary">
            {company.name || 'HS Transportation'}
          </h2>
          <p className="text-xs text-text-secondary">School Bus Services</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 py-3 text-[11px] text-text-secondary">
        {company.address && (
          <span className="flex items-center gap-1">
            <MapPin size={11} /> {company.address}
          </span>
        )}
        {company.phone && (
          <span className="flex items-center gap-1">
            <Phone size={11} /> {company.phone}
          </span>
        )}
        {company.email && (
          <span className="flex items-center gap-1">
            <Mail size={11} /> {company.email}
          </span>
        )}
      </div>

      {/* Title row */}
      <div className="flex items-center justify-between border-y border-border py-2.5">
        <h3 className="font-heading text-sm font-bold uppercase tracking-wide">Transport Fee Receipt</h3>
        <div className="text-right text-[11px]">
          <p className="font-mono font-semibold text-primary">{receipt.receiptNumber}</p>
          <p className="text-text-secondary">{formatDateLong(receipt.generatedAt)}</p>
        </div>
      </div>

      {/* Student details */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 py-4 text-sm">
        <Detail label="Student" value={student.name} />
        <Detail label="Father" value={student.fatherName} />
        <Detail label="Class" value={`${student.class || ''}${student.section ? ' - ' + student.section : ''}`} />
        <Detail label="Route" value={route.routeName || route.routeNumber} />
        <Detail label="Academic Year" value={year} />
        <Detail label="Month" value={monthLabel} />
      </div>

      {/* Amount block */}
      <div className="space-y-1.5 rounded-lg bg-slate-50 p-4 text-sm">
        <Row label="Monthly Fee" value={formatCurrency(monthlyFee)} />
        <Row label="Amount Paid" value={formatCurrency(receipt.amount)} strong />
        <Row label="Remaining" value={formatCurrency(remaining)} />
        <Row label="Mode" value={(fee.paymentMode || '—').toUpperCase()} />
        {receipt.collectedBy && <Row label="Collected By" value={receipt.collectedBy} />}
        <div className="flex items-center justify-between border-t border-border pt-2">
          <span className="text-text-secondary">Status</span>
          <span className={`font-heading text-sm font-bold uppercase ${status === 'paid' ? 'text-success' : status === 'partial' ? 'text-warning' : 'text-danger'}`}>
            {status} {status === 'paid' ? '✓' : ''}
          </span>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-5 flex items-end justify-between">
        <p className="max-w-[55%] text-xs italic text-text-secondary">
          {receiptCfg.footerText || 'Thank you for timely payment!'}
        </p>
        <div className="text-center">
          {receiptCfg.signature ? (
            <img src={receiptCfg.signature} alt="signature" className="mx-auto h-10 object-contain" />
          ) : (
            <div className="h-10" />
          )}
          <div className="mt-1 border-t border-text-primary pt-1 text-[11px] text-text-secondary">
            Authorized Signature
          </div>
        </div>
      </div>
    </div>
  );
}

function Detail({ label, value }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-text-secondary">{label}</p>
      <p className="font-medium text-text-primary">{value || '—'}</p>
    </div>
  );
}

function Row({ label, value, strong }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-text-secondary">{label}</span>
      <span className={`font-mono ${strong ? 'font-bold text-text-primary' : 'text-text-primary'}`}>{value}</span>
    </div>
  );
}
