import { initials, colorFromString } from '../utils/format.js';

const SIZES = { xs: 'h-7 w-7 text-[11px]', sm: 'h-9 w-9 text-xs', md: 'h-11 w-11 text-sm', lg: 'h-16 w-16 text-lg', xl: 'h-24 w-24 text-2xl' };

/** Image avatar with an initials fallback (deterministic background color). */
export default function Avatar({ src, name = '', size = 'md', className = '' }) {
  const sizeClass = SIZES[size] || SIZES.md;
  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={`${sizeClass} shrink-0 rounded-full object-cover ring-2 ring-white ${className}`}
      />
    );
  }
  return (
    <div
      className={`${sizeClass} flex shrink-0 items-center justify-center rounded-full font-semibold text-white ring-2 ring-white ${className}`}
      style={{ backgroundColor: colorFromString(name) }}
      aria-label={name}
    >
      {initials(name) || '?'}
    </div>
  );
}
