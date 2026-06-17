import { Bus, MapPin, Phone, Mail } from 'lucide-react';
import { formatCurrency, formatDateLong } from '../utils/format.js';
import { MONTH_LABELS } from '../utils/constants.js';

/**
 * A5 print-optimized layout for Manual Receipts.
 * Reuses the branding and styling of standard receipts.
 */
export default function ManualReceiptTemplate({ receipt, settings }) {
  if (!receipt) return null;
  const student = receipt.studentId || {};
  const route = receipt.routeId || {};
  const company = settings?.company || {};
  const receiptCfg = settings?.receipt || {};
  const yearLabel = receipt.academicYearId?.label || '';
  const monthLabel = receipt.month ? (MONTH_LABELS[receipt.month] || receipt.month) : '';

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
            {company.name || 'HS School Bus'}
          </h2>
          <p className="text-xs text-text-secondary">School Bus Services</p>
        </div>
        <span className="rounded-full bg-amber-500/15 px-2 py-1 text-[10px] font-bold uppercase text-amber-600">Manual Receipt</span>
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
          <p className="text-text-secondary">{formatDateLong(receipt.receiptDate || receipt.createdAt)}</p>
        </div>
      </div>

      {/* Student details */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 py-4 text-sm">
        <Detail label="Student" value={student.name} />
        <Detail label="Father" value={student.fatherName} />
        <Detail label="Class" value={`${student.class || ''}${student.section ? ' - ' + student.section : ''}`} />
        <Detail label="Route" value={route.routeName || route.routeNumber} />
        <Detail label="Academic Year" value={yearLabel} />
        {monthLabel && <Detail label="For Month" value={monthLabel} />}
      </div>

      {/* Amount block */}
      <div className="space-y-1.5 rounded-lg bg-slate-50 p-4 text-sm">
        <Row label="Amount Paid" value={formatCurrency(receipt.amount)} strong />
        <Row label="Payment Mode" value={(receipt.paymentMode || 'cash').toUpperCase()} />
        {receipt.collectedBy && <Row label="Collected By" value={receipt.collectedBy} />}
        
        {receipt.remarks && (
          <div className="border-t border-border/60 mt-2 pt-2">
            <span className="text-[10px] uppercase tracking-wide text-text-secondary block mb-0.5">Remarks / Notes</span>
            <p className="text-xs text-text-primary italic whitespace-pre-wrap">{receipt.remarks}</p>
          </div>
        )}

        <div className="flex items-center justify-between border-t border-border pt-2">
          <span className="text-text-secondary">Status</span>
          <span className="font-heading text-sm font-bold uppercase text-success">
            PAID ✓
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
