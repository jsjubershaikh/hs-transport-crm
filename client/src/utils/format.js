// Formatting helpers: currency (INR), dates, and relative "time ago".

/** ₹1,500 style currency. */
export function formatCurrency(value, { decimals = 0 } = {}) {
  const n = Number(value) || 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(n);
}

/** Compact number e.g. 12,345. */
export function formatNumber(value) {
  return new Intl.NumberFormat('en-IN').format(Number(value) || 0);
}

/** 15 Aug 2025 */
export function formatDate(date, opts = {}) {
  if (!date) return '—';
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', ...opts });
}

/** 15 August 2025 (long) */
export function formatDateLong(date) {
  if (!date) return '—';
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
}

/** "2h ago", "3d ago", etc. */
export function timeAgo(date) {
  if (!date) return '';
  const d = new Date(date);
  const seconds = Math.floor((Date.now() - d.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

/** First letters of a name for avatar fallback. */
export function initials(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
}

/** Deterministic-ish pastel color from a string (for avatar backgrounds). */
export function colorFromString(str = '') {
  const colors = ['#1A3A7C', '#0B1F4B', '#2563EB', '#7C3AED', '#0891B2', '#059669', '#D97706', '#DB2777'];
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

/** Map a fee status to a badge class. */
export function feeStatusClass(status) {
  return { paid: 'badge-paid', partial: 'badge-partial', pending: 'badge-pending' }[status] || 'badge-pending';
}
