import { useState, useMemo } from 'react'
import { formatDate, formatDateRange, formatCurrency, toLocalYMD } from '../lib/helpers'
import { CalendarIcon, TrendUpIcon, TagIcon, CloseIcon, StoreIcon, ClipboardIcon, getRetailerIcon } from '../components/icons'
import StatusBadge, { PROMO_TYPE_STYLES } from '../components/StatusBadge'

// Calendar timeline view (retailer rows x 6 weeks) + promo detail modal.
// Extracted from App.jsx, with its week-math helpers.
// toLocalYMD (local-fields date format) is shared from lib/helpers.

function computeWeeks(promotions) {
  let earliest
  if (promotions.length > 0) {
    earliest = promotions.reduce((min, p) => p.start_date < min ? p.start_date : min, promotions[0].start_date)
  } else {
    earliest = toLocalYMD(new Date())
  }
  // Find the Monday on or before the earliest date
  const d = new Date(earliest + 'T00:00:00')
  const day = d.getDay()
  const diff = day === 0 ? 6 : day - 1 // days since Monday
  d.setDate(d.getDate() - diff)
  const weeks = []
  for (let i = 0; i < 6; i++) {
    const start = new Date(d)
    start.setDate(d.getDate() + i * 7)
    const end = new Date(start)
    end.setDate(start.getDate() + 6)
    const label = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    weeks.push({ start: toLocalYMD(start), end: toLocalYMD(end), label })
  }
  return weeks
}

function promoOverlapsWeek(promo, week) {
  return promo.start_date <= week.end && promo.end_date >= week.start
}

function CalendarView({ promotions, brandColors, onShowAddModal }) {
  const [selectedPromo, setSelectedPromo] = useState(null)

  // Group promos by retailer for row layout (dynamic)
  const retailers = useMemo(() => [...new Set(promotions.map(p => p.retailer))].sort(), [promotions])
  const weeks = useMemo(() => computeWeeks(promotions), [promotions])

  // Precompute the retailer x week promo buckets once per data change, so
  // toggling the detail modal (selectedPromo state) doesn't recompute the whole
  // O(retailers x weeks x promos) grid on every render.
  const grid = useMemo(
    () => retailers.map((retailer) => ({
      retailer,
      cells: weeks.map((week) => promotions.filter((p) => p.retailer === retailer && promoOverlapsWeek(p, week))),
    })),
    [retailers, weeks, promotions],
  )

  // Empty state
  if (promotions.length === 0) {
    return (
      <div className="animate-fade-in-up text-center py-20">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-2/10 flex items-center justify-center">
          <CalendarIcon className="w-8 h-8 text-green-2/60"/>
        </div>
        <h3 className="text-lg font-bold text-green-4/70 mb-1">No promotions yet</h3>
        <p className="text-sm text-green-4/40 mb-6">Get started by adding your first promotion</p>
        <button
          onClick={onShowAddModal}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-green-2 hover:bg-green-3 text-white font-bold text-sm transition-colors shadow-md hover:shadow-lg"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Add Promotion
        </button>
      </div>
    )
  }

  return (
    <div className="animate-fade-in-up">
      <div className="bg-white rounded-2xl shadow-sm border border-green-4/8 overflow-hidden">
        {/* Legend */}
        <div className="px-5 pt-5 pb-3 border-b border-green-4/8">
          <div className="flex flex-wrap items-center gap-4">
            <span className="text-sm font-semibold text-green-4/60">Brands:</span>
            {Object.entries(brandColors).map(([brand, style]) => (
              <div key={brand} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: style.bar }}/>
                <span className="text-sm font-medium text-green-4">{brand}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Scrollable calendar */}
        <div className="overflow-x-auto">
          <div className="min-w-[700px]">
            {/* Week headers */}
            <div className="grid grid-cols-[140px_repeat(6,1fr)] border-b border-green-4/8">
              <div className="p-3 text-xs font-bold text-green-4/50 uppercase tracking-wider">Retailer</div>
              {weeks.map((week) => (
                <div key={week.start} className="p-3 text-center border-l border-green-4/8">
                  <div className="text-xs font-bold text-green-3">{week.label}</div>
                  <div className="text-[10px] text-green-4/40 mt-0.5">
                    {formatDate(week.start)} - {formatDate(week.end)}
                  </div>
                </div>
              ))}
            </div>

            {/* Retailer rows (buckets precomputed in `grid`) */}
            {grid.map(({ retailer, cells }) => (
              <div key={retailer} className="grid grid-cols-[140px_repeat(6,1fr)] border-b border-green-4/5 last:border-b-0 hover:bg-cream/50 transition-colors">
                <div className="p-3 flex items-center gap-2">
                  <span className="text-green-3">{getRetailerIcon(retailer)}</span>
                  <span className="text-sm font-semibold text-green-4">{retailer}</span>
                </div>
                {cells.map((weekPromos, wi) => (
                  <div key={weeks[wi].start} className="p-2 border-l border-green-4/5 flex flex-col gap-1">
                    {weekPromos.map((promo) => (
                      <button
                        key={promo.promo_id}
                        onClick={() => setSelectedPromo(promo)}
                        className="w-full text-left px-2 py-1.5 rounded-lg text-[11px] font-semibold text-white truncate transition-all hover:scale-105 hover:shadow-md cursor-pointer"
                        style={{ backgroundColor: brandColors[promo.brand]?.bar || '#007B4E' }}
                        title={promo.product}
                      >
                        {(promo.brand || '').split(' ')[0]}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Detail modal overlay */}
      {selectedPromo && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSelectedPromo(null)}>
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[80vh] overflow-y-auto animate-fade-in-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="h-1.5" style={{ background: `linear-gradient(90deg, ${brandColors[selectedPromo.brand]?.bar || '#007B4E'}, ${brandColors[selectedPromo.brand]?.bar || '#007B4E'}66)` }}/>
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <StatusBadge status={selectedPromo.status}/>
                  <h3 className="text-lg font-bold text-green-4 mt-2">{selectedPromo.product}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-green-3">{getRetailerIcon(selectedPromo.retailer)}</span>
                    <span className="text-sm font-semibold text-green-3">{selectedPromo.retailer}</span>
                    <span className="text-green-4/30">|</span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-lg ${PROMO_TYPE_STYLES[selectedPromo.promo_type]}`}>{selectedPromo.promo_type}</span>
                  </div>
                </div>
                <button onClick={() => setSelectedPromo(null)} className="text-green-4/40 hover:text-green-4 transition-colors">
                  <CloseIcon className="w-5 h-5"/>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-cream rounded-xl p-3">
                  <div className="text-xs text-green-4/50 mb-1">Regular Price</div>
                  <div className="text-lg font-bold text-green-4/50 line-through">{formatCurrency(selectedPromo.retail_price)}</div>
                </div>
                <div className="bg-green-2/10 rounded-xl p-3">
                  <div className="text-xs text-green-3 mb-1">Promo Price</div>
                  <div className="text-lg font-bold text-green-3">{formatCurrency(selectedPromo.promo_price)}</div>
                </div>
              </div>

              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-2 text-green-4/70">
                  <CalendarIcon className="w-4 h-4 text-green-3/60"/>
                  <span>{formatDateRange(selectedPromo.start_date, selectedPromo.end_date)}</span>
                </div>
                <div className="flex items-start gap-2 text-green-4/70">
                  <TagIcon className="w-4 h-4 text-orange-3 shrink-0 mt-0.5"/>
                  <span>{selectedPromo.mechanic}</span>
                </div>
                <div className="flex items-start gap-2 text-green-4/70">
                  <StoreIcon className="w-4 h-4 text-green-3/60 shrink-0 mt-0.5"/>
                  <span>{selectedPromo.display}</span>
                </div>
                <div className="flex items-center gap-2">
                  <TrendUpIcon className="w-4 h-4 text-green-2"/>
                  <span className="font-semibold text-green-2">+{selectedPromo.expected_lift}% expected lift</span>
                  <span className="text-green-4/40">|</span>
                  <span className="text-green-4/60">{selectedPromo.depth_of_discount}% discount depth</span>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-green-4/8">
                <h4 className="text-sm font-bold text-green-4 mb-2 flex items-center gap-2">
                  <ClipboardIcon className="w-4 h-4 text-green-3"/>
                  Compliance Checklist
                </h4>
                <div className="space-y-1.5">
                  {selectedPromo.checklist.map((item, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm text-green-4/70 py-1">
                      <span className="text-green-4/30 mt-0.5">&#9675;</span>
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default CalendarView
