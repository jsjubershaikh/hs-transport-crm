import { Search, X } from 'lucide-react';

/**
 * Composable filter bar: a search box plus a set of <select> dropdowns.
 *
 * @param {object} props
 * @param {string} props.search
 * @param {(v:string)=>void} props.onSearch
 * @param {Array<{key, value, onChange, options:[{value,label}], placeholder}>} props.filters
 * @param {ReactNode} props.right - extra controls (export buttons, etc.)
 */
export default function FilterBar({ search, onSearch, searchPlaceholder = 'Search…', filters = [], right, children }) {
  return (
    <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-1 flex-wrap items-center gap-2.5">
        {onSearch && (
          <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search || ''}
              onChange={(e) => onSearch(e.target.value)}
              placeholder={searchPlaceholder}
              className="input pl-9 pr-8"
            />
            {search && (
              <button
                onClick={() => onSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-slate-400 hover:text-slate-600"
                aria-label="Clear"
              >
                <X size={15} />
              </button>
            )}
          </div>
        )}
        {filters.map((f) => (
          <select
            key={f.key}
            value={f.value || ''}
            onChange={(e) => f.onChange(e.target.value)}
            className="input w-auto min-w-[130px] cursor-pointer"
          >
            <option value="">{f.placeholder || 'All'}</option>
            {f.options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        ))}
        {children}
      </div>
      {right && <div className="flex flex-wrap items-center gap-2">{right}</div>}
    </div>
  );
}
