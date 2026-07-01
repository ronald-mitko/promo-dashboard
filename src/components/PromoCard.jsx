import { useState, memo } from 'react'
import { formatDateRange, formatCurrency } from '../lib/helpers'
import {
  CalendarIcon, TagIcon, StoreIcon, TrendUpIcon, ClipboardIcon, ChevronDownIcon, CheckCircleIcon, getRetailerIcon,
} from './icons'
import StatusBadge, { PROMO_TYPE_STYLES } from './StatusBadge'
import RequestStatusBadge from './RequestStatusBadge'
import RequestButtons from './RequestButtons'

// Single promotion card with hover-delete, compliance checklist, and submit/reporting
// actions. Extracted from App.jsx — markup unchanged. Memoized: the grid renders
// many cards and props are referentially stable (App handlers are useCallback,
// brandColors is useMemo), so unchanged cards skip re-render when filters change.
function PromoCard({ promo, index, role, onDelete, onSubmit, onEdit, onAddRequest, brandColors }) {
  const [expanded, setExpanded] = useState(false)
  const [checkedItems, setCheckedItems] = useState({})
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  // Brand color is applied via inline style (Tailwind can't JIT interpolated classes).
  // `${hex}26` appends ~15% alpha to the 6-digit hex for the pill background.
  const brandColor = brandColors[promo.brand]?.bar || '#007B4E'
  // Guard divide-by-zero: CSV/AI imports can store retail_price 0 when absent.
  const savings = promo.retail_price > 0 ? ((1 - promo.promo_price / promo.retail_price) * 100).toFixed(0) : 0

  const toggleCheck = (i) => {
    setCheckedItems((prev) => ({ ...prev, [i]: !prev[i] }))
  }

  const completedCount = Object.values(checkedItems).filter(Boolean).length

  return (
    <div
      className={`opacity-0 animate-fade-in-up stagger-${(index % 10) + 1} bg-white rounded-2xl shadow-sm hover:shadow-lg border border-green-4/8 transition-all duration-300 hover:-translate-y-1 overflow-hidden group relative`}
    >
      {/* Delete button - visible on hover */}
      {onDelete && (
        <div className="absolute top-3 right-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          {showDeleteConfirm ? (
            <div className="flex items-center gap-1 bg-white rounded-lg shadow-lg border border-red-200 p-1.5 animate-fade-in-up">
              <button
                onClick={() => { onDelete(promo.promo_id); setShowDeleteConfirm(false) }}
                className="px-2 py-1 text-xs font-semibold text-white bg-red-500 rounded-md hover:bg-red-600 transition-colors"
              >
                Delete
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-2 py-1 text-xs font-semibold text-green-4/60 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="w-7 h-7 flex items-center justify-center rounded-full bg-white/90 shadow-md border border-red-200 text-red-400 hover:text-red-600 hover:border-red-400 transition-all"
              title="Delete promotion"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
              </svg>
            </button>
          )}
        </div>
      )}

      {/* Top color accent bar */}
      <div className="h-1" style={{ background: `linear-gradient(90deg, ${brandColors[promo.brand]?.bar || '#007B4E'}, ${brandColors[promo.brand]?.bar || '#007B4E'}88)` }}/>

      <div className="p-5">
        {/* Header row */}
        <div className="flex items-start justify-between mb-3">
          <StatusBadge status={promo.status}/>
          <span className={`text-xs font-bold px-2.5 py-1 rounded-lg ${PROMO_TYPE_STYLES[promo.promo_type] || 'bg-gray-100 text-gray-700'}`}>
            {promo.promo_type}
          </span>
        </div>

        {/* Retailer */}
        <div className="flex items-center gap-2 mb-2">
          <span className="text-green-3">{getRetailerIcon(promo.retailer)}</span>
          <span className="text-sm font-semibold text-green-3">{promo.retailer}</span>
        </div>

        {/* Product name */}
        <h3 className="text-base font-bold text-green-4 mb-2 leading-snug">{promo.product}</h3>

        {/* Brand pill */}
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold mb-3" style={{ backgroundColor: `${brandColor}26`, color: brandColor }}>
          {promo.brand}
        </span>

        {/* Date range */}
        <div className="flex items-center gap-2 text-sm text-green-4/70 mb-3">
          <CalendarIcon className="w-4 h-4 text-green-3/60"/>
          <span>{formatDateRange(promo.start_date, promo.end_date)}</span>
        </div>

        {/* Price display */}
        <div className="bg-cream rounded-xl p-3 mb-3">
          <div className="flex items-baseline gap-3">
            <span className="text-lg line-through text-green-4/40 font-medium">{formatCurrency(promo.retail_price)}</span>
            <span className="text-2xl font-bold text-green-3">{formatCurrency(promo.promo_price)}</span>
            <span className="ml-auto bg-green-2/15 text-green-2 text-xs font-bold px-2 py-1 rounded-lg">
              Save {savings}%
            </span>
          </div>
        </div>

        {/* Mechanic */}
        <div className="flex items-start gap-2 mb-3">
          <TagIcon className="w-4 h-4 text-orange-3 shrink-0 mt-0.5"/>
          <p className="text-sm text-green-4/80">{promo.mechanic}</p>
        </div>

        {/* Display requirements */}
        <div className="flex items-start gap-2 mb-3">
          <StoreIcon className="w-4 h-4 text-green-3/60 shrink-0 mt-0.5"/>
          <p className="text-sm text-green-4/70">{promo.display}</p>
        </div>

        {/* Expected lift */}
        <div className="flex items-center gap-2 mb-4">
          <TrendUpIcon className="w-4 h-4 text-green-2"/>
          <span className="text-sm font-semibold text-green-2">+{promo.expected_lift}% expected lift</span>
          <div className="flex-1 h-2 bg-green-2/10 rounded-full overflow-hidden ml-1">
            <div
              className="h-full bg-gradient-to-r from-green-2 to-green-3 rounded-full transition-all duration-700"
              style={{ width: `${Math.min(promo.expected_lift * 3.3, 100)}%` }}
            />
          </div>
        </div>

        {/* Compliance checklist toggle */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-between py-2.5 px-3 rounded-xl bg-green-4/5 hover:bg-green-4/10 transition-colors text-sm font-semibold text-green-4"
        >
          <div className="flex items-center gap-2">
            <ClipboardIcon className="w-4 h-4 text-green-3"/>
            <span>Compliance Checklist</span>
            <span className="text-xs text-green-4/50 font-normal">({completedCount}/{promo.checklist.length})</span>
          </div>
          <ChevronDownIcon className={`w-4 h-4 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}/>
        </button>

        {/* Expandable checklist */}
        <div className={`overflow-hidden transition-all duration-300 ${expanded ? 'max-h-96 mt-2' : 'max-h-0'}`}>
          <div className="space-y-2 py-1">
            {promo.checklist.map((item, i) => (
              <button
                key={i}
                onClick={() => toggleCheck(i)}
                className={`w-full flex items-start gap-3 p-2.5 rounded-lg text-left transition-colors text-sm ${
                  checkedItems[i] ? 'bg-green-2/10 text-green-4/60' : 'hover:bg-cream text-green-4'
                }`}
              >
                <CheckCircleIcon className="w-5 h-5 shrink-0 mt-0" checked={checkedItems[i]}/>
                <span className={checkedItems[i] ? 'line-through' : ''}>{item}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Submission status / submit to RCSM */}
        {onSubmit && (
          <div className="mt-4 pt-3 border-t border-green-4/8 flex items-center justify-between gap-2">
            <RequestStatusBadge status={promo.submission_status} />
            {role === 'hq' && promo.submission_status === 'draft' ? (
              <div className="flex items-center gap-2">
                {onEdit && <button onClick={() => onEdit(promo)} className="px-3 py-1.5 rounded-lg border border-green-4/15 text-green-4/70 hover:border-green-2 text-xs font-bold transition-colors">Edit</button>}
                <button onClick={() => onSubmit(promo.promo_id)} className="px-3 py-1.5 rounded-lg bg-green-3 hover:bg-green-4 text-white text-xs font-bold transition-colors">Submit to RCSM</button>
              </div>
            ) : promo.submission_status && promo.submission_status !== 'draft' ? (
              <span className="text-[11px] text-green-4/40">Sent for approval</span>
            ) : null}
          </div>
        )}

        {/* Reporting (only once submitted) */}
        {role === 'hq' && onAddRequest && promo.submission_status && promo.submission_status !== 'draft' && (
          <div className="mt-2">
            <RequestButtons
              size="xs"
              types={['reporting']}
              onAddRequest={onAddRequest}
              linkedPromo={{ promo_id: promo.promo_id, retailer: promo.retailer, chain: promo.chain, brand: promo.brand, product: promo.product }}
            />
          </div>
        )}
      </div>
    </div>
  )
}

export default memo(PromoCard)
