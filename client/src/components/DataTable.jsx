import { ChevronLeft, ChevronRight } from 'lucide-react';
import { SkeletonTable } from './Skeleton.jsx';

/**
 * Data table with server-side pagination, loading skeletons, empty state,
 * optional row selection, and a responsive card fallback on mobile.
 *
 * columns: [{ key, header, render?(row, index), align?, className?, headerClassName? }]
 */
export default function DataTable({
  columns,
  data = [],
  loading = false,
  empty,
  meta,
  onPageChange,
  rowKey = (r) => r._id || r.id,
  onRowClick,
  selectable = false,
  selectedIds = [],
  onToggleRow,
  onToggleAll,
  renderMobileCard,
  rowClassName,
}) {
  const allSelected = selectable && data.length > 0 && data.every((r) => selectedIds.includes(rowKey(r)));

  if (loading) {
    return (
      <div className="card p-5">
        <SkeletonTable rows={6} cols={columns.length} />
      </div>
    );
  }

  if (!data.length) {
    return <div className="card">{empty}</div>;
  }

  return (
    <div className="card overflow-hidden">
      {/* Desktop table */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-slate-50/70 text-left">
              {selectable && (
                <th className="w-10 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={(e) => onToggleAll?.(e.target.checked)}
                    className="h-4 w-4 cursor-pointer rounded border-slate-300 accent-accent"
                  />
                </th>
              )}
              {columns.map((c) => (
                <th
                  key={c.key}
                  className={`px-4 py-3 text-xs font-semibold uppercase tracking-wide text-text-secondary ${
                    c.align === 'right' ? 'text-right' : c.align === 'center' ? 'text-center' : ''
                  } ${c.headerClassName || ''}`}
                >
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => {
              const key = rowKey(row);
              const selected = selectedIds.includes(key);
              return (
                <tr
                  key={key}
                  onClick={() => onRowClick?.(row)}
                  className={`border-b border-border/70 transition-colors last:border-0 ${
                    onRowClick ? 'cursor-pointer' : ''
                  } ${selected ? 'bg-accent/5' : rowClassName?.(row) || 'hover:bg-slate-50/80'}`}
                >
                  {selectable && (
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => onToggleRow?.(key)}
                        className="h-4 w-4 cursor-pointer rounded border-slate-300 accent-accent"
                      />
                    </td>
                  )}
                  {columns.map((c) => (
                    <td
                      key={c.key}
                      className={`px-4 py-3 text-text-primary ${
                        c.align === 'right' ? 'text-right' : c.align === 'center' ? 'text-center' : ''
                      } ${c.className || ''}`}
                    >
                      {c.render ? c.render(row, i) : row[c.key]}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="divide-y divide-border md:hidden">
        {data.map((row, i) =>
          renderMobileCard ? (
            <div key={rowKey(row)} onClick={() => onRowClick?.(row)} className={onRowClick ? 'cursor-pointer' : ''}>
              {renderMobileCard(row, i)}
            </div>
          ) : (
            <div key={rowKey(row)} className="space-y-1.5 p-4" onClick={() => onRowClick?.(row)}>
              {columns.map((c) => (
                <div key={c.key} className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-xs font-medium uppercase text-text-secondary">{c.header}</span>
                  <span className="text-right text-text-primary">{c.render ? c.render(row, i) : row[c.key]}</span>
                </div>
              ))}
            </div>
          )
        )}
      </div>

      {meta && meta.totalPages > 1 && (
        <Pagination meta={meta} onPageChange={onPageChange} />
      )}
    </div>
  );
}

function Pagination({ meta, onPageChange }) {
  const { page, totalPages, total, limit } = meta;
  const from = (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);
  return (
    <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-3">
      <p className="text-xs text-text-secondary">
        Showing <b>{from}</b>–<b>{to}</b> of <b>{total}</b>
      </p>
      <div className="flex items-center gap-1.5">
        <button
          className="btn btn-outline btn-sm px-2"
          disabled={page <= 1}
          onClick={() => onPageChange?.(page - 1)}
          aria-label="Previous page"
        >
          <ChevronLeft size={16} />
        </button>
        <span className="px-2 text-sm font-medium text-text-primary">
          {page} / {totalPages}
        </span>
        <button
          className="btn btn-outline btn-sm px-2"
          disabled={page >= totalPages}
          onClick={() => onPageChange?.(page + 1)}
          aria-label="Next page"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
