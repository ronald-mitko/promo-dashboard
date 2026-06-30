// ─────────────────────────────────────────────
// Inline SVG icons (no external deps) + retailer icon lookup.
// Extracted from App.jsx — pure presentational leaves, shared across views.
// ─────────────────────────────────────────────

export function CalendarIcon({ className = "w-4 h-4" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2"/>
      <line x1="16" y1="2" x2="16" y2="6"/>
      <line x1="8" y1="2" x2="8" y2="6"/>
      <line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  )
}

export function TrendUpIcon({ className = "w-4 h-4" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
      <polyline points="17 6 23 6 23 12"/>
    </svg>
  )
}

export function TagIcon({ className = "w-4 h-4" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/>
      <circle cx="7" cy="7" r="1" fill="currentColor"/>
    </svg>
  )
}

export function CheckCircleIcon({ className = "w-4 h-4", checked }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" fill={checked ? '#00C48D' : 'none'} stroke={checked ? '#00C48D' : 'currentColor'}/>
      {checked && <path d="M9 12l2 2 4-4" stroke="white" strokeWidth="2.5"/>}
      {!checked && <circle cx="12" cy="12" r="10"/>}
    </svg>
  )
}

export function ChevronDownIcon({ className = "w-4 h-4" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9"/>
    </svg>
  )
}

export function MenuIcon({ className = "w-6 h-6" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="3" y1="6" x2="21" y2="6"/>
      <line x1="3" y1="12" x2="21" y2="12"/>
      <line x1="3" y1="18" x2="21" y2="18"/>
    </svg>
  )
}

export function CloseIcon({ className = "w-6 h-6" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18"/>
      <line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  )
}

export function FireIcon({ className = "w-5 h-5" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 23c-4.97 0-9-3.58-9-8 0-3.19 2.13-6.28 3.42-7.65.38-.41 1.04-.12 1.04.42 0 1.54.75 2.96 1.87 3.87.17.13.42.01.42-.2 0-2.59 1.34-5.64 4.2-7.93.37-.3.92-.07.95.4.14 2.08.9 3.88 2.36 5.3C19 11.05 21 13.58 21 15c0 4.42-4.03 8-9 8z"/>
    </svg>
  )
}

export function StoreIcon({ className = "w-5 h-5" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
      <polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  )
}

export function ClipboardIcon({ className = "w-5 h-5" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2"/>
      <rect x="8" y="2" width="8" height="4" rx="1"/>
      <line x1="8" y1="11" x2="16" y2="11"/>
      <line x1="8" y1="15" x2="16" y2="15"/>
    </svg>
  )
}

// ── Retailer icons (known brands fall back to a generic storefront) ──
const KNOWN_RETAILER_ICONS = {
  Walmart: (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
      <path d="M12 2L12 8M12 16L12 22M2 12L8 12M16 12L22 12M4.93 4.93L9.17 9.17M14.83 14.83L19.07 19.07M4.93 19.07L9.17 14.83M14.83 9.17L19.07 4.93" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none"/>
    </svg>
  ),
  Target: (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
      <circle cx="12" cy="12" r="6" stroke="currentColor" strokeWidth="2"/>
      <circle cx="12" cy="12" r="2" fill="currentColor"/>
    </svg>
  ),
  Kroger: (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
      <rect x="3" y="3" width="18" height="18" rx="3" stroke="currentColor" strokeWidth="2"/>
      <path d="M8 8L12 12L8 16M13 8H17M13 12H17M13 16H17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),
  PetSmart: (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
      <path d="M10 5.5C10 4.12 8.88 3 7.5 3S5 4.12 5 5.5 6.12 8 7.5 8 10 6.88 10 5.5zM19 5.5C19 4.12 17.88 3 16.5 3S14 4.12 14 5.5 15.12 8 16.5 8 19 6.88 19 5.5zM6 12.5C6 11.12 4.88 10 3.5 10S1 11.12 1 12.5 2.12 15 3.5 15 6 13.88 6 12.5zM23 12.5C23 11.12 21.88 10 20.5 10S18 11.12 18 12.5 19.12 15 20.5 15 23 13.88 23 12.5zM12 21c2.5 0 5-2 5-5.5S14.5 9 12 9s-5 3-5 6.5S9.5 21 12 21z" fill="currentColor"/>
    </svg>
  ),
}

const DEFAULT_RETAILER_ICON = (
  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
    <polyline points="9 22 9 12 15 12 15 22"/>
  </svg>
)

export function getRetailerIcon(retailer) {
  return KNOWN_RETAILER_ICONS[retailer] || DEFAULT_RETAILER_ICON
}
