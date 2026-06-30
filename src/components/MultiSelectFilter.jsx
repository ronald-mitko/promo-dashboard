import { useState, useEffect, useRef } from 'react'

// Multi-select dropdown with checkboxes + "Clear all" (used for Chain). Extracted from App.jsx.
export default function MultiSelectFilter({ label, selected, onChange, options }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const toggle = (val) => {
    if (selected.includes(val)) {
      onChange(selected.filter(v => v !== val))
    } else {
      onChange([...selected, val])
    }
  }

  const displayText = selected.length === 0 ? 'All' : selected.length === 1 ? selected[0] : `${selected.length} selected`

  return (
    <div className="flex flex-col gap-1 relative" ref={ref}>
      <label className="text-xs font-semibold text-green-4/60 uppercase tracking-wider">{label}</label>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="bg-white border border-green-4/15 rounded-lg px-3 py-2 text-sm text-green-4 font-medium cursor-pointer hover:border-green-2 focus:outline-none focus:ring-2 focus:ring-green-2/40 focus:border-green-2 transition-all text-left flex items-center justify-between gap-2"
      >
        <span className="truncate">{displayText}</span>
        <svg className={`w-3 h-3 text-green-4/50 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
      </button>
      {open && options.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-green-4/15 rounded-lg shadow-lg z-50 max-h-56 overflow-y-auto">
          {selected.length > 0 && (
            <button
              type="button"
              onClick={() => onChange([])}
              className="w-full px-3 py-2 text-xs font-semibold text-orange-3 hover:bg-orange-3/5 text-left border-b border-green-4/8"
            >
              Clear all
            </button>
          )}
          {options.map((opt) => (
            <label
              key={opt}
              className="flex items-center gap-2.5 px-3 py-2 text-sm text-green-4 hover:bg-green-2/5 cursor-pointer transition-colors"
            >
              <input
                type="checkbox"
                checked={selected.includes(opt)}
                onChange={() => toggle(opt)}
                className="w-3.5 h-3.5 rounded border-green-4/30 text-green-2 focus:ring-green-2/40 accent-[#00C48D]"
              />
              <span className="font-medium">{opt}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  )
}
