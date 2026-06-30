import { formatCurrency } from '../lib/helpers'
import { TrendUpIcon, FireIcon, ClipboardIcon, getRetailerIcon } from '../components/icons'
import StatusBadge from '../components/StatusBadge'

// Summary dashboard (metrics, what's-hot, by-retailer/brand, action items).
// Extracted from App.jsx unchanged. NOTE: not currently routed to any tab.
export default function DashboardView({ promotions, brandColors, onShowAddModal }) {
  // Top 3 by expected lift
  const hotPromos = [...promotions]
    .sort((a, b) => b.expected_lift - a.expected_lift)
    .slice(0, 3)

  // Promos by retailer
  const retailerCounts = {}
  promotions.forEach((p) => {
    retailerCounts[p.retailer] = (retailerCounts[p.retailer] || 0) + 1
  })
  const maxRetailerCount = Math.max(...Object.values(retailerCounts), 1)

  // Promos by brand
  const brandCounts = {}
  promotions.forEach((p) => {
    brandCounts[p.brand] = (brandCounts[p.brand] || 0) + 1
  })

  // Active promo checklist items
  const activePromos = promotions.filter((p) => p.status === 'active')

  // Key metrics
  const totalSavings = promotions.reduce((sum, p) => sum + (p.retail_price - p.promo_price), 0)
  const avgLift = promotions.length > 0 ? (promotions.reduce((sum, p) => sum + p.expected_lift, 0) / promotions.length).toFixed(0) : 0

  // Empty state
  if (promotions.length === 0) {
    return (
      <div className="animate-fade-in-up text-center py-20">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-2/10 flex items-center justify-center">
          <TrendUpIcon className="w-8 h-8 text-green-2/60"/>
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
    <div className="animate-fade-in-up space-y-6">
      {/* Key metrics row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl shadow-sm border border-green-4/8 p-5 text-center hover:shadow-md transition-shadow">
          <div className="text-3xl font-bold text-green-3">{promotions.length}</div>
          <div className="text-xs font-medium text-green-4/50 uppercase tracking-wider mt-1">Total Promotions</div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-green-4/8 p-5 text-center hover:shadow-md transition-shadow">
          <div className="text-3xl font-bold text-green-2">{activePromos.length}</div>
          <div className="text-xs font-medium text-green-4/50 uppercase tracking-wider mt-1">Active Now</div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-green-4/8 p-5 text-center hover:shadow-md transition-shadow">
          <div className="text-3xl font-bold text-orange-3">+{avgLift}%</div>
          <div className="text-xs font-medium text-green-4/50 uppercase tracking-wider mt-1">Avg Expected Lift</div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-green-4/8 p-5 text-center hover:shadow-md transition-shadow">
          <div className="text-3xl font-bold text-green-4">{formatCurrency(totalSavings)}</div>
          <div className="text-xs font-medium text-green-4/50 uppercase tracking-wider mt-1">Total Consumer Savings</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* What's Hot */}
        <div className="bg-white rounded-2xl shadow-sm border border-green-4/8 overflow-hidden">
          <div className="bg-gradient-to-r from-orange-3 to-orange-3/80 px-5 py-4">
            <h3 className="text-white font-bold text-lg flex items-center gap-2">
              <FireIcon className="w-6 h-6"/>
              What's Hot This Week
            </h3>
            <p className="text-white/70 text-sm mt-0.5">Highest impact promotions</p>
          </div>
          <div className="p-4 space-y-3">
            {hotPromos.map((promo, i) => (
              <div key={promo.promo_id} className={`opacity-0 animate-slide-in-right stagger-${i + 1} flex items-center gap-4 p-3 rounded-xl hover:bg-cream transition-colors`}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-lg shrink-0" style={{ backgroundColor: brandColors[promo.brand]?.bar || '#007B4E' }}>
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm font-bold text-green-4 truncate">{promo.product}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-green-4/60">
                    <span>{promo.retailer}</span>
                    <span className="text-green-4/20">|</span>
                    <span>{promo.promo_type}</span>
                    <span className="text-green-4/20">|</span>
                    <span>{promo.mechanic}</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-lg font-bold text-green-2">+{promo.expected_lift}%</div>
                  <div className="text-[10px] text-green-4/40 uppercase">Lift</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Promos by Retailer */}
        <div className="bg-white rounded-2xl shadow-sm border border-green-4/8 p-5">
          <h3 className="text-base font-bold text-green-4 mb-4">Promotions by Retailer</h3>
          <div className="space-y-4">
            {Object.entries(retailerCounts).map(([retailer, count]) => (
              <div key={retailer}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-green-3">{getRetailerIcon(retailer)}</span>
                    <span className="text-sm font-semibold text-green-4">{retailer}</span>
                  </div>
                  <span className="text-sm font-bold text-green-3">{count}</span>
                </div>
                <div className="h-3 bg-green-4/5 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-green-3 to-green-2 rounded-full transition-all duration-1000 ease-out"
                    style={{ width: `${(count / maxRetailerCount) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Promos by Brand */}
          <h3 className="text-base font-bold text-green-4 mt-8 mb-4">Promotions by Brand</h3>
          <div className="flex flex-wrap gap-3">
            {Object.entries(brandCounts).map(([brand, count]) => (
              <div
                key={brand}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 transition-shadow hover:shadow-md"
                style={{ borderColor: brandColors[brand]?.bar || '#007B4E', backgroundColor: (brandColors[brand]?.bar || '#007B4E') + '10' }}
              >
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: brandColors[brand]?.bar || '#007B4E' }}/>
                <span className="text-sm font-semibold text-green-4">{brand}</span>
                <span className="text-sm font-bold" style={{ color: brandColors[brand]?.bar || '#007B4E' }}>{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Action Items */}
      <div className="bg-white rounded-2xl shadow-sm border border-green-4/8 overflow-hidden">
        <div className="bg-gradient-to-r from-green-3 to-green-2 px-5 py-4">
          <h3 className="text-white font-bold text-lg flex items-center gap-2">
            <ClipboardIcon className="w-5 h-5"/>
            Action Items - Active Promotions
          </h3>
          <p className="text-white/70 text-sm mt-0.5">{activePromos.reduce((sum, p) => sum + p.checklist.length, 0)} tasks across {activePromos.length} active promotions</p>
        </div>
        <div className="divide-y divide-green-4/5">
          {activePromos.map((promo) => (
            <div key={promo.promo_id} className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-green-3">{getRetailerIcon(promo.retailer)}</span>
                <span className="text-sm font-bold text-green-4">{promo.retailer}</span>
                <span className="text-green-4/20">-</span>
                <span className="text-sm font-semibold text-green-4/70">{promo.product}</span>
                <StatusBadge status={promo.status}/>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {promo.checklist.map((item, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm text-green-4/70 py-1.5 px-2 rounded-lg hover:bg-cream transition-colors">
                    <span className="text-orange-3 mt-0.5 shrink-0">&#9675;</span>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
