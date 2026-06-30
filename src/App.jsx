import { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import * as XLSX from 'xlsx'
import { useLocalStorageState } from './hooks/useLocalStorageState'
import { STORAGE_KEYS, ROLES, ROLE_LABELS } from './lib/constants'
import { SEED_RCSMS, SEED_TEAMS, SEED_CLIENTS, SEED_STORES, SEED_ITEMS } from './lib/seed'
import { loadInitialSession, withPromoDefaultsAll, withPromoDefaults, runMigration, genId } from './lib/storage'
import { formatDate, formatDateRange, formatCurrency } from './lib/helpers'
import { resolveRcsmForRecord, rcsmName } from './lib/routing'
import { downloadExport } from './lib/exportFormat'
import { apiEnabled, listSubmissions, saveSubmission, toSubmissionRecord, getConfig, saveConfig } from './lib/api'
import { SUBMISSION_STATUS, REQUEST_TYPES, PRIORITY_TYPES } from './lib/constants'
import RequestStatusBadge from './components/RequestStatusBadge'
import RequestButtons from './components/RequestButtons'
import FilterSelect from './components/FilterSelect'
import MultiSelectFilter from './components/MultiSelectFilter'
import {
  CalendarIcon, TrendUpIcon, TagIcon, CheckCircleIcon, ChevronDownIcon,
  MenuIcon, CloseIcon, FireIcon, StoreIcon, ClipboardIcon, getRetailerIcon,
} from './components/icons'
import StatusBadge, { PROMO_TYPE_STYLES } from './components/StatusBadge'
import PromoCard from './components/PromoCard'
import AddPromoModal from './components/AddPromoModal'
import StartView from './views/StartView'
import PrioritiesListView from './views/PrioritiesListView'
import InboxView from './views/InboxView'
import MySubmissionsView from './views/MySubmissionsView'
import RcsmAdminView from './views/RcsmAdminView'
import WorkflowSection from './views/workflows/WorkflowSection'

// Run additive localStorage migration once at module load.
runMigration()

// ─────────────────────────────────────────────
// PROMOTIONS DATA (demo seed — loads when localStorage is empty)
// ─────────────────────────────────────────────
const SEED_RETAILER_CHAIN_DATA = [
  { retailer: 'Walmart', chain: 'Walmart Inc.' },
  { retailer: 'Target', chain: 'Target Corp.' },
  { retailer: 'Kroger', chain: 'Kroger Co.' },
  { retailer: 'Ralphs', chain: 'Kroger Co.' },
  { retailer: 'Fred Meyer', chain: 'Kroger Co.' },
  { retailer: 'Publix', chain: 'Publix Super Markets' },
  { retailer: 'Albertsons', chain: 'Albertsons Cos.' },
  { retailer: 'Safeway', chain: 'Albertsons Cos.' },
  { retailer: 'Wegmans', chain: 'Wegmans Food Markets' },
  { retailer: 'Meijer', chain: 'Meijer Inc.' },
]

const SEED_PROMOTIONS = [
  {
    promo_id: 'WMT-TPR-DEMO01',
    retailer: 'Walmart',
    chain: 'Walmart Inc.',
    product: "M&M's Peanut Party Size 38oz",
    brand: 'Mars',
    category: 'Candy',
    promo_type: 'TPR',
    start_date: '2026-04-01',
    end_date: '2026-05-03',
    mechanic: '$2 off Party Size',
    depth_of_discount: 18.2,
    expected_lift: 25,
    retail_price: 10.99,
    promo_price: 8.99,
    display: 'Candy aisle endcap',
    status: 'active',
    checklist: ['Verify price tag updated', 'Check stock levels', 'Photo verification required'],
  },
  {
    promo_id: 'TGT-FD-DEMO02',
    retailer: 'Target',
    chain: 'Target Corp.',
    product: 'SPAM Classic 12oz',
    brand: 'Hormel',
    category: 'Canned Meat',
    promo_type: 'Feature+Display',
    start_date: '2026-03-30',
    end_date: '2026-04-27',
    mechanic: 'Buy 2, Save $2',
    depth_of_discount: 25.0,
    expected_lift: 32,
    retail_price: 3.99,
    promo_price: 2.99,
    display: 'Front-of-store pallet with weekly circular feature',
    status: 'active',
    checklist: ['Confirm circular placement', 'Verify pallet setup', 'Check signage matches POG'],
  },
  {
    promo_id: 'KRG-DIG-DEMO03',
    retailer: 'Kroger',
    chain: 'Kroger Co.',
    product: 'Celestial Seasonings Sleepytime Tea 20ct',
    brand: 'Hain Celestial',
    category: 'Tea & Coffee',
    promo_type: 'Digital Coupon',
    start_date: '2026-04-10',
    end_date: '2026-05-01',
    mechanic: '$1 off with digital coupon',
    depth_of_discount: 20.0,
    expected_lift: 22,
    retail_price: 4.99,
    promo_price: 3.99,
    display: 'None specified',
    status: 'active',
    checklist: ['Validate coupon in Kroger app', 'Confirm shelf tag', 'Monitor redemption weekly'],
  },
  {
    promo_id: 'ALB-TPR-DEMO04',
    retailer: 'Albertsons',
    chain: 'Albertsons Cos.',
    product: 'Arm & Hammer Plus OxiClean Detergent 100oz',
    brand: 'Church and Dwight',
    category: 'Laundry Care',
    promo_type: 'TPR',
    start_date: '2026-05-01',
    end_date: '2026-05-21',
    mechanic: '$3 off regular price',
    depth_of_discount: 23.1,
    expected_lift: 28,
    retail_price: 12.99,
    promo_price: 9.99,
    display: 'Laundry aisle endcap',
    status: 'upcoming',
    checklist: ['Verify shelf tag updated', 'Check stock levels', 'Confirm end-date signage'],
  },
  {
    promo_id: 'PUB-FD-DEMO05',
    retailer: 'Publix',
    chain: 'Publix Super Markets',
    product: 'Planet Oat Extra Creamy Oatmilk 64oz',
    brand: 'Planet Oat',
    category: 'Dairy Alternative',
    promo_type: 'Feature+Display',
    start_date: '2026-04-06',
    end_date: '2026-04-30',
    mechanic: '2 for $7',
    depth_of_discount: 22.0,
    expected_lift: 38,
    retail_price: 4.49,
    promo_price: 3.50,
    display: 'Refrigerated endcap with BOGO signage',
    status: 'active',
    checklist: ['Confirm cooler placement', 'Verify shelf tag pricing', 'Photo verification required'],
  },
  {
    promo_id: 'RAL-DIG-DEMO06',
    retailer: 'Ralphs',
    chain: 'Kroger Co.',
    product: 'Tropicana Pure Premium Orange Juice 89oz',
    brand: 'Tropicana',
    category: 'Beverages',
    promo_type: 'Digital Coupon',
    start_date: '2026-04-15',
    end_date: '2026-05-05',
    mechanic: 'Save $1.50 with digital coupon',
    depth_of_discount: 18.8,
    expected_lift: 24,
    retail_price: 7.99,
    promo_price: 6.49,
    display: 'None specified',
    status: 'active',
    checklist: ['Validate digital coupon load', 'Confirm shelf tag', 'Weekly redemption check'],
  },
  {
    promo_id: 'WEG-TPR-DEMO07',
    retailer: 'Wegmans',
    chain: 'Wegmans Food Markets',
    product: 'Sargento Shredded Mild Cheddar 8oz',
    brand: 'Sargento',
    category: 'Dairy',
    promo_type: 'TPR',
    start_date: '2026-04-05',
    end_date: '2026-05-02',
    mechanic: '2 for $5',
    depth_of_discount: 21.9,
    expected_lift: 19,
    retail_price: 3.20,
    promo_price: 2.50,
    display: 'Dairy cooler endcap with weekly ad feature',
    status: 'active',
    checklist: ['Verify shelf tag pricing', 'Confirm weekly ad placement', 'Monitor sell-through'],
  },
  {
    promo_id: 'FRD-TPR-DEMO08',
    retailer: 'Fred Meyer',
    chain: 'Kroger Co.',
    product: 'Skippy Creamy Peanut Butter 40oz',
    brand: 'Hormel',
    category: 'Pantry',
    promo_type: 'TPR',
    start_date: '2026-03-05',
    end_date: '2026-03-30',
    mechanic: '$1 off regular price',
    depth_of_discount: 15.4,
    expected_lift: 14,
    retail_price: 6.49,
    promo_price: 5.49,
    display: 'Pantry aisle endcap',
    status: 'ended',
    checklist: ['Verify price tag', 'Photo verification required', 'Remove display post-promo'],
  },
]

// ─────────────────────────────────────────────
// HELPER FUNCTIONS
// ─────────────────────────────────────────────
// formatDate / formatDateRange / formatCurrency imported from ./lib/helpers

// Generate brand colors dynamically from promo data
const BRAND_COLOR_PALETTE = ['#FF9527', '#007B4E', '#00C48D', '#5B8DEF', '#E74C8B', '#8B5CF6', '#F59E0B', '#10B981', '#EF4444', '#6366F1']

function getBrandColors(promotions) {
  const brands = [...new Set(promotions.map(p => p.brand))].sort()
  const colors = {}
  brands.forEach((brand, i) => {
    const color = BRAND_COLOR_PALETTE[i % BRAND_COLOR_PALETTE.length]
    colors[brand] = { bg: `bg-[${color}]/15`, text: `text-[${color}]`, bar: color }
  })
  return colors
}

// Retailer icons + getRetailerIcon imported from ./components/icons
// PROMO_TYPE_STYLES + StatusBadge imported from ./components/StatusBadge

// ─────────────────────────────────────────────
// WEEK DEFINITIONS FOR CALENDAR (dynamic)
// ─────────────────────────────────────────────
function computeWeeks(promotions) {
  let earliest
  if (promotions.length > 0) {
    earliest = promotions.reduce((min, p) => p.start_date < min ? p.start_date : min, promotions[0].start_date)
  } else {
    earliest = new Date().toISOString().slice(0, 10)
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
    const fmt = (dt) => dt.toISOString().slice(0, 10)
    const label = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    weeks.push({ start: fmt(start), end: fmt(end), label })
  }
  return weeks
}

function promoOverlapsWeek(promo, week) {
  return promo.start_date <= week.end && promo.end_date >= week.start
}

// SVG icons imported from ./components/icons
// StatusBadge imported from ./components/StatusBadge
// FilterSelect + MultiSelectFilter imported from ./components

// PromoCard imported from ./components/PromoCard

// ─────────────────────────────────────────────
// PROMOTIONS VIEW
// ─────────────────────────────────────────────
function PromotionsView({ promotions, role, onDeletePromo, onSubmitPromo, onEditPromo, onAddRequest, brandColors, onShowAddModal, retailerChainData }) {
  const [chainFilter, setChainFilter] = useState([])
  const [retailerFilter, setRetailerFilter] = useState('All')
  const [brandFilter, setBrandFilter] = useState('All')
  const [categoryFilter, setCategoryFilter] = useState('All')
  const [typeFilter, setTypeFilter] = useState('All')

  // Build chain list from reference data
  const chains = useMemo(() => {
    if (!retailerChainData || retailerChainData.length === 0) return []
    return [...new Set(retailerChainData.map(r => r.chain))].filter(Boolean).sort()
  }, [retailerChainData])

  // Build retailer-to-chain lookup
  const retailerToChain = useMemo(() => {
    const map = {}
    if (retailerChainData) {
      retailerChainData.forEach(r => { if (r.retailer && r.chain) map[r.retailer] = r.chain })
    }
    return map
  }, [retailerChainData])

  // Retailer options: from reference data (filtered by chain selection) + any in promo data
  const retailers = useMemo(() => {
    let refRetailers = []
    if (retailerChainData && retailerChainData.length > 0) {
      refRetailers = retailerChainData
        .filter(r => chainFilter.length === 0 || chainFilter.includes(r.chain))
        .map(r => r.retailer)
    }
    const promoRetailers = promotions.map(p => p.retailer)
    const all = [...new Set([...refRetailers, ...promoRetailers])].sort()
    return ['All', ...all]
  }, [retailerChainData, promotions, chainFilter])

  const brands = useMemo(() => ['All', ...new Set(promotions.map(p => p.brand))], [promotions])
  const categories = useMemo(() => ['All', ...new Set(promotions.map(p => p.category))], [promotions])
  const promoTypes = useMemo(() => ['All', ...new Set(promotions.map(p => p.promo_type))], [promotions])

  // Reset retailer filter if it's no longer in the options after chain selection changes
  useEffect(() => {
    if (retailerFilter !== 'All' && !retailers.includes(retailerFilter)) {
      setRetailerFilter('All')
    }
  }, [retailers, retailerFilter])

  const filtered = useMemo(() => {
    return promotions.filter((p) => {
      if (chainFilter.length > 0) {
        const promoChain = p.chain || retailerToChain[p.retailer]
        if (!promoChain || !chainFilter.includes(promoChain)) return false
      }
      if (retailerFilter !== 'All' && p.retailer !== retailerFilter) return false
      if (brandFilter !== 'All' && p.brand !== brandFilter) return false
      if (categoryFilter !== 'All' && p.category !== categoryFilter) return false
      if (typeFilter !== 'All' && p.promo_type !== typeFilter) return false
      return true
    })
  }, [promotions, chainFilter, retailerFilter, brandFilter, categoryFilter, typeFilter, retailerToChain])

  const activeCount = filtered.filter((p) => p.status === 'active').length
  const avgDiscount = filtered.length > 0
    ? (filtered.reduce((sum, p) => sum + p.depth_of_discount, 0) / filtered.length).toFixed(1)
    : 0
  const highestLift = filtered.length > 0
    ? Math.max(...filtered.map((p) => p.expected_lift))
    : 0

  // Empty state when no promotions at all
  if (promotions.length === 0) {
    return (
      <div className="animate-fade-in-up text-center py-20">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-2/10 flex items-center justify-center">
          <TagIcon className="w-8 h-8 text-green-2/60"/>
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
      {/* Filter bar */}
      <div className="bg-white rounded-2xl shadow-sm border border-green-4/8 p-4 mb-6">
        <div className={`grid grid-cols-2 gap-3 ${chains.length > 0 ? 'md:grid-cols-3 lg:grid-cols-5' : 'md:grid-cols-4'}`}>
          {chains.length > 0 && (
            <MultiSelectFilter
              label="Chain"
              selected={chainFilter}
              onChange={setChainFilter}
              options={chains}
            />
          )}
          <FilterSelect
            label="Retailer"
            value={retailerFilter}
            onChange={setRetailerFilter}
            options={retailers}
          />
          <FilterSelect
            label="Brand"
            value={brandFilter}
            onChange={setBrandFilter}
            options={brands}
          />
          <FilterSelect
            label="Category"
            value={categoryFilter}
            onChange={setCategoryFilter}
            options={categories}
          />
          <FilterSelect
            label="Promo Type"
            value={typeFilter}
            onChange={setTypeFilter}
            options={promoTypes}
          />
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Total Promos"
          value={filtered.length}
          icon={<TagIcon className="w-5 h-5"/>}
          color="green-3"
        />
        <StatCard
          label="Active Now"
          value={activeCount}
          icon={<FireIcon className="w-5 h-5"/>}
          color="green-2"
          pulse={activeCount > 0}
        />
        <StatCard
          label="Avg Discount"
          value={`${avgDiscount}%`}
          icon={<TagIcon className="w-5 h-5"/>}
          color="orange-3"
        />
        <StatCard
          label="Highest Lift"
          value={`+${highestLift}%`}
          icon={<TrendUpIcon className="w-5 h-5"/>}
          color="green-2"
        />
      </div>

      {/* Promo cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {filtered.map((promo, i) => (
          <PromoCard key={promo.promo_id} promo={promo} index={i} role={role} onDelete={onDeletePromo} onSubmit={onSubmitPromo} onEdit={onEditPromo} onAddRequest={onAddRequest} brandColors={brandColors}/>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16">
          <div className="text-6xl mb-4 opacity-30">&#128269;</div>
          <h3 className="text-lg font-semibold text-green-4/60">No promotions match your filters</h3>
          <p className="text-sm text-green-4/40 mt-1">Try adjusting your filter criteria</p>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────
// STAT CARD
// ─────────────────────────────────────────────
function StatCard({ label, value, icon, color, pulse }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-green-4/8 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-2">
        <span className={`text-${color}`}>{icon}</span>
        {pulse && <span className="w-2 h-2 rounded-full bg-green-2 animate-pulse"/>}
      </div>
      <div className="text-2xl font-bold text-green-4">{value}</div>
      <div className="text-xs font-medium text-green-4/50 uppercase tracking-wider mt-0.5">{label}</div>
    </div>
  )
}

// ─────────────────────────────────────────────
// CALENDAR VIEW
// ─────────────────────────────────────────────
function CalendarView({ promotions, brandColors, onShowAddModal }) {
  const [selectedPromo, setSelectedPromo] = useState(null)

  // Group promos by retailer for row layout (dynamic)
  const retailers = useMemo(() => [...new Set(promotions.map(p => p.retailer))].sort(), [promotions])
  const weeks = useMemo(() => computeWeeks(promotions), [promotions])

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

            {/* Retailer rows */}
            {retailers.map((retailer) => {
              const retailerPromos = promotions.filter((p) => p.retailer === retailer)
              return (
                <div key={retailer} className="grid grid-cols-[140px_repeat(6,1fr)] border-b border-green-4/5 last:border-b-0 hover:bg-cream/50 transition-colors">
                  <div className="p-3 flex items-center gap-2">
                    <span className="text-green-3">{getRetailerIcon(retailer)}</span>
                    <span className="text-sm font-semibold text-green-4">{retailer}</span>
                  </div>
                  {weeks.map((week) => {
                    const weekPromos = retailerPromos.filter((p) => promoOverlapsWeek(p, week))
                    return (
                      <div key={week.start} className="p-2 border-l border-green-4/5 flex flex-col gap-1">
                        {weekPromos.map((promo) => (
                          <button
                            key={promo.promo_id}
                            onClick={() => setSelectedPromo(promo)}
                            className="w-full text-left px-2 py-1.5 rounded-lg text-[11px] font-semibold text-white truncate transition-all hover:scale-105 hover:shadow-md cursor-pointer"
                            style={{ backgroundColor: brandColors[promo.brand]?.bar || '#007B4E' }}
                            title={promo.product}
                          >
                            {promo.brand.split(' ')[0]}
                          </button>
                        ))}
                      </div>
                    )
                  })}
                </div>
              )
            })}
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

// ─────────────────────────────────────────────
// DASHBOARD VIEW
// ─────────────────────────────────────────────
function DashboardView({ promotions, brandColors, onShowAddModal }) {
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

// AddPromoModal imported from ./components/AddPromoModal

// ─────────────────────────────────────────────
// MAIN APP
// ─────────────────────────────────────────────
function App() {
  const [activeTab, setActiveTab] = useState(() => {
    try {
      const s = JSON.parse(localStorage.getItem(STORAGE_KEYS.session) || 'null')
      return s?.role === ROLES.RCSM ? 'inbox' : 'start'
    } catch { return 'start' }
  })
  // Priority sub-type chosen from the launcher, passed into the entry modal
  const [addPriorityType, setAddPriorityType] = useState('promo_display')
  // Promotion currently being edited (draft only), or null for a new entry
  const [editPromo, setEditPromo] = useState(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showSettings, setShowSettings] = useState(false)

  // Session: lightweight role switch (HQ enters/submits; RCSM approves/exports)
  const [session, setSession] = useLocalStorageState(STORAGE_KEYS.session, loadInitialSession)
  const role = session.role || ROLES.HQ
  const userName = session.userName || 'User'

  // RCSM directory + workflow requests collection
  const [rcsms, setRcsms] = useLocalStorageState(STORAGE_KEYS.rcsms, () => SEED_RCSMS)
  const [requests, setRequests] = useLocalStorageState(STORAGE_KEYS.requests, () => [])

  // Settings popover draft fields
  const [settingsName, setSettingsName] = useState(session.userName || 'User')
  const [settingsRole, setSettingsRole] = useState(role)
  const [settingsRcsmId, setSettingsRcsmId] = useState(session.rcsmId || (SEED_RCSMS[0] && SEED_RCSMS[0].rcsmId))

  // Keep legacy advsol_user_name in sync for back-compat
  useEffect(() => { localStorage.setItem('advsol_user_name', session.userName || 'User') }, [session.userName])

  const openSettings = useCallback(() => {
    setSettingsName(session.userName || '')
    setSettingsRole(session.role || ROLES.HQ)
    setSettingsRcsmId(session.rcsmId || (rcsms[0] && rcsms[0].rcsmId))
    setShowSettings(true)
  }, [session, rcsms])

  const handleSaveSettings = useCallback(() => {
    const isRcsm = settingsRole === ROLES.RCSM
    const rcsmMatch = rcsms.find(r => r.rcsmId === settingsRcsmId)
    const name = isRcsm ? (rcsmMatch?.name || settingsName || 'User') : (settingsName || 'User')
    setSession({ role: settingsRole, userName: name, rcsmId: isRcsm ? settingsRcsmId : null })
    setActiveTab(isRcsm ? 'inbox' : 'start')
    setShowSettings(false)
  }, [settingsRole, settingsRcsmId, settingsName, rcsms, setSession])

  // Retailer/Chain reference data from flat file (persisted in localStorage)
  const [retailerChainData, setRetailerChainData] = useState(() => {
    try {
      const stored = localStorage.getItem('advsol_retailer_chain_data')
      if (stored) return JSON.parse(stored)
    } catch (e) { /* ignore */ }
    return SEED_RETAILER_CHAIN_DATA
  })
  const [refDataFileName, setRefDataFileName] = useState(() => localStorage.getItem('advsol_ref_data_filename') || 'Demo seed data')

  // Persist reference data to localStorage
  useEffect(() => {
    if (retailerChainData) {
      localStorage.setItem('advsol_retailer_chain_data', JSON.stringify(retailerChainData))
    } else {
      localStorage.removeItem('advsol_retailer_chain_data')
    }
  }, [retailerChainData])

  // Handle reference data file upload (Excel or CSV)
  const handleRefDataUpload = (file) => {
    if (!file) return
    const ext = file.name.split('.').pop().toLowerCase()
    const parseRefData = (rows) => {
      // rows is array of objects with arbitrary keys — find retailer and chain columns
      if (rows.length === 0) return
      const keys = Object.keys(rows[0]).map(k => k.toLowerCase().trim().replace(/\s+/g, '_'))
      const origKeys = Object.keys(rows[0])
      const retailerKey = origKeys[keys.indexOf('retailer')] || origKeys[keys.indexOf('retailer_name')] || origKeys[keys.indexOf('account')] || origKeys[keys.indexOf('banner')]
      const chainKey = origKeys[keys.indexOf('chain')] || origKeys[keys.indexOf('chain_name')] || origKeys[keys.indexOf('parent')] || origKeys[keys.indexOf('parent_company')]
      if (!retailerKey || !chainKey) {
        alert('Could not find "retailer" and "chain" columns in the file. Please ensure your file has columns named "retailer" (or "account"/"banner") and "chain" (or "parent"/"parent_company").')
        return
      }
      const data = rows
        .map(r => ({ retailer: String(r[retailerKey] || '').trim(), chain: String(r[chainKey] || '').trim() }))
        .filter(r => r.retailer && r.chain)
      if (data.length === 0) {
        alert('No valid retailer/chain rows found in the file.')
        return
      }
      setRetailerChainData(data)
      setRefDataFileName(file.name)
      localStorage.setItem('advsol_ref_data_filename', file.name)
    }

    if (ext === 'csv') {
      const reader = new FileReader()
      reader.onload = (e) => {
        const lines = e.target.result.trim().split('\n')
        if (lines.length < 2) return
        const headers = lines[0].split(',').map(h => h.trim())
        const rows = []
        for (let i = 1; i < lines.length; i++) {
          const vals = lines[i].split(',').map(v => v.trim())
          const row = {}
          headers.forEach((h, idx) => { row[h] = vals[idx] || '' })
          rows.push(row)
        }
        parseRefData(rows)
      }
      reader.readAsText(file)
    } else if (ext === 'xlsx' || ext === 'xls') {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const wb = XLSX.read(e.target.result, { type: 'array' })
          const ws = wb.Sheets[wb.SheetNames[0]]
          const rows = XLSX.utils.sheet_to_json(ws)
          parseRefData(rows)
        } catch (err) {
          alert('Failed to parse Excel file: ' + err.message)
        }
      }
      reader.readAsArrayBuffer(file)
    } else {
      alert('Please upload a .csv or .xlsx file.')
    }
  }

  const handleClearRefData = () => {
    setRetailerChainData(null)
    setRefDataFileName('')
    localStorage.removeItem('advsol_retailer_chain_data')
    localStorage.removeItem('advsol_ref_data_filename')
  }

  // State-driven promotions with localStorage persistence
  const [promotions, setPromotions] = useState(() => {
    try {
      const stored = localStorage.getItem('advsol_promotions')
      if (stored) {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed)) return withPromoDefaultsAll(parsed)
      }
    } catch (e) { /* ignore parse errors */ }
    return withPromoDefaultsAll(SEED_PROMOTIONS)
  })

  // Compute brand colors from current promotions
  const brandColors = useMemo(() => getBrandColors(promotions), [promotions])

  // Promotion Dashboard shows only promotion-type entries (legacy nulls count as promos)
  const promoOnly = useMemo(() => promotions.filter(p => (p.priority_type || 'promo_display') === 'promo_display'), [promotions])

  // Reference data for the workflow wizards. Chain hierarchy (master > submaster
  // > chain) is derived from store data, mirroring the DB ARTS chain columns.
  const refData = useMemo(() => {
    const chainMap = new Map()
    SEED_STORES.forEach((s) => {
      if (!chainMap.has(s.artsChainName)) {
        chainMap.set(s.artsChainName, { chain: s.artsChainName, subMaster: s.artsSubMasterChainName, master: s.artsMasterChainName })
      }
    })
    return {
      teams: SEED_TEAMS,
      clients: SEED_CLIENTS,
      chains: [...chainMap.values()],
      stores: SEED_STORES,
      items: SEED_ITEMS,
    }
  }, [])

  // Persist to localStorage on every change
  useEffect(() => {
    localStorage.setItem('advsol_promotions', JSON.stringify(promotions))
  }, [promotions])

  // ── Cloud persistence (Vercel Postgres) when VITE_API=1; else localStorage only ──
  // Per-record content signatures so we only POST records that actually changed,
  // instead of re-uploading the whole collection on every state change.
  const apiLoadedRef = useRef(false)
  const savedPromoSig = useRef({})
  const savedReqSig = useRef({})
  useEffect(() => {
    if (!apiEnabled()) { apiLoadedRef.current = true; return }
    listSubmissions()
      .then((recs) => {
        const promos = recs.filter((r) => r.kind === 'promotion').map(withPromoDefaults)
        const reqs = recs.filter((r) => r.kind === 'request')
        promos.forEach((p) => { savedPromoSig.current[p.promo_id] = JSON.stringify(toSubmissionRecord(p, 'promotion')) })
        reqs.forEach((r) => { savedReqSig.current[r.requestId] = JSON.stringify(toSubmissionRecord(r, 'request')) })
        setPromotions(promos)
        setRequests(reqs)
      })
      .catch(() => { /* fall back to local state */ })
      .finally(() => { apiLoadedRef.current = true })
  }, [])
  useEffect(() => {
    if (!apiEnabled() || !apiLoadedRef.current) return
    promotions.forEach((p) => {
      const rec = toSubmissionRecord(p, 'promotion')
      const sig = JSON.stringify(rec)
      if (savedPromoSig.current[p.promo_id] !== sig) { savedPromoSig.current[p.promo_id] = sig; saveSubmission(rec).catch(() => {}) }
    })
  }, [promotions])
  useEffect(() => {
    if (!apiEnabled() || !apiLoadedRef.current) return
    requests.forEach((r) => {
      const rec = toSubmissionRecord(r, 'request')
      const sig = JSON.stringify(rec)
      if (savedReqSig.current[r.requestId] !== sig) { savedReqSig.current[r.requestId] = sig; saveSubmission(rec).catch(() => {}) }
    })
  }, [requests])

  // Shared RCSM ↔ chain ownership config (Postgres) so routing is consistent across users
  const rcsmsLoadedRef = useRef(false)
  useEffect(() => {
    if (!apiEnabled()) { rcsmsLoadedRef.current = true; return }
    getConfig('rcsms').then((v) => { if (Array.isArray(v) && v.length) setRcsms(v) }).catch(() => {}).finally(() => { rcsmsLoadedRef.current = true })
  }, [])
  useEffect(() => {
    if (apiEnabled() && rcsmsLoadedRef.current) saveConfig('rcsms', rcsms).catch(() => {})
  }, [rcsms])

  const handleAddPromo = useCallback((promo) => {
    setPromotions(prev => [withPromoDefaults(promo), ...prev])
  }, [])

  const handleAddMultiplePromos = useCallback((promos) => {
    setPromotions(prev => [...promos.map(withPromoDefaults), ...prev])
  }, [])

  const handleDeletePromo = useCallback((promoId) => {
    setPromotions(prev => prev.filter(p => p.promo_id !== promoId))
  }, [])

  // Edit a draft priority in place (only drafts are editable)
  const handleUpdatePromo = useCallback((promoId, fields) => {
    setPromotions(prev => prev.map(p => p.promo_id === promoId ? { ...p, ...fields } : p))
  }, [])
  const handleEditPromo = useCallback((promo) => {
    setEditPromo(promo)
    setShowAddModal(true)
  }, [])
  const openAddModal = useCallback(() => {
    setEditPromo(null)
    setShowAddModal(true)
  }, [])

  // ── Approval flow: HQ submits → routed to owning RCSM → RCSM approves/rejects
  const histEntry = (from, to, by, note) => ({ at: new Date().toISOString(), from, to, by, ...(note ? { note } : {}) })

  const handleSubmitPromo = useCallback((promoId) => {
    setPromotions(prev => prev.map(p => {
      if (p.promo_id !== promoId) return p
      const routed = resolveRcsmForRecord(p, rcsms)
      return { ...p, submission_status: SUBMISSION_STATUS.SUBMITTED, submitted_by: userName, submitted_at: new Date().toISOString(), routed_rcsm: routed, approval_history: [...(p.approval_history || []), histEntry(p.submission_status, SUBMISSION_STATUS.SUBMITTED, userName)] }
    }))
  }, [rcsms, userName])

  const handleApprovePromo = useCallback((promoId) => {
    setPromotions(prev => prev.map(p => p.promo_id === promoId ? { ...p, submission_status: SUBMISSION_STATUS.APPROVED, approval_history: [...(p.approval_history || []), histEntry(p.submission_status, SUBMISSION_STATUS.APPROVED, userName)] } : p))
  }, [userName])

  const handleRejectPromo = useCallback((promoId, note) => {
    setPromotions(prev => prev.map(p => p.promo_id === promoId ? { ...p, submission_status: SUBMISSION_STATUS.REJECTED, approval_history: [...(p.approval_history || []), histEntry(p.submission_status, SUBMISSION_STATUS.REJECTED, userName, note)] } : p))
  }, [userName])

  // Workflow requests (authorize/workflag/support/reporting) — added in later phases
  const handleAddRequest = useCallback((req) => {
    const routed = resolveRcsmForRecord(req, rcsms)
    setRequests(prev => [{
      ...req,
      requestId: req.requestId || genId('req'),
      submittedBy: userName,
      submittedAt: new Date().toISOString(),
      status: SUBMISSION_STATUS.SUBMITTED,
      routed_rcsm: routed,
      approval_history: [histEntry('draft', SUBMISSION_STATUS.SUBMITTED, userName)],
    }, ...prev])
  }, [rcsms, userName, setRequests])

  const handleApproveRequest = useCallback((id) => {
    setRequests(prev => prev.map(r => r.requestId === id ? { ...r, status: SUBMISSION_STATUS.APPROVED, approval_history: [...(r.approval_history || []), histEntry(r.status, SUBMISSION_STATUS.APPROVED, userName)] } : r))
  }, [userName, setRequests])

  const handleRejectRequest = useCallback((id, note) => {
    setRequests(prev => prev.map(r => r.requestId === id ? { ...r, status: SUBMISSION_STATUS.REJECTED, approval_history: [...(r.approval_history || []), histEntry(r.status, SUBMISSION_STATUS.REJECTED, userName, note)] } : r))
  }, [userName, setRequests])

  const handleExportRequest = useCallback((id) => {
    const req = requests.find(r => r.requestId === id)
    if (req) downloadExport(req)
  }, [requests])

  const handleExportPromo = useCallback((promoId) => {
    const p = promotions.find(x => x.promo_id === promoId)
    if (p) downloadExport({ ...p, kind: 'promotion' })
  }, [promotions])

  const tabs = role === ROLES.RCSM
    ? [
        { id: 'inbox', label: 'Inbox', icon: <ClipboardIcon className="w-4 h-4"/> },
        { id: 'promotions', label: 'Priorities', icon: <TagIcon className="w-4 h-4"/> },
        { id: 'calendar', label: 'Promo Calendar', icon: <CalendarIcon className="w-4 h-4"/> },
        { id: 'rcsms', label: 'RCSMs', icon: <CheckCircleIcon className="w-4 h-4"/> },
      ]
    : [
        { id: 'start', label: 'Home', icon: <StoreIcon className="w-4 h-4"/> },
        { id: 'promotions', label: 'Priorities', icon: <TagIcon className="w-4 h-4"/> },
        { id: 'authorize', label: 'Authorize', icon: <CheckCircleIcon className="w-4 h-4"/> },
        { id: 'promodash', label: 'Promo Dashboard', icon: <FireIcon className="w-4 h-4"/> },
        { id: 'calendar', label: 'Promo Calendar', icon: <CalendarIcon className="w-4 h-4"/> },
        { id: 'submissions', label: 'My Submissions', icon: <ClipboardIcon className="w-4 h-4"/> },
        { id: 'rcsms', label: 'RCSMs', icon: <CheckCircleIcon className="w-4 h-4"/> },
      ]

  return (
    <div className="min-h-screen bg-cream">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-gradient-to-r from-green-3 to-green-2 shadow-lg">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between px-4 py-3 md:px-6">
            {/* Logo area */}
            <div className="flex items-center gap-3">
              {/* Advantage Solutions logo mark */}
              <div className="w-10 h-10 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
                <svg viewBox="0 0 24 24" className="w-6 h-6 text-white" fill="currentColor">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                </svg>
              </div>
              <div>
                <h1 className="text-white font-bold text-base md:text-lg leading-tight tracking-tight">HQ to Retail Connector</h1>
                <p className="text-white/70 text-xs md:text-sm leading-tight">Advantage Solutions</p>
              </div>
            </div>

            {/* Desktop nav */}
            <nav className="hidden md:flex items-center gap-1 bg-white/10 backdrop-blur rounded-xl p-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                    activeTab === tab.id
                      ? 'bg-white text-green-3 shadow-md'
                      : 'text-white/80 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </nav>

            {/* User profile pill + settings */}
            <div className="hidden md:flex items-center gap-2">
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur rounded-full px-3 py-1.5">
                <div className="w-7 h-7 rounded-full bg-orange-3 flex items-center justify-center text-white text-xs font-bold">{userName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}</div>
                <div className="text-right">
                  <div className="text-white text-sm font-semibold leading-tight">{userName}</div>
                  <div className="text-white/60 text-[10px] leading-tight">{ROLE_LABELS[role]}</div>
                </div>
              </div>
              <button onClick={openSettings} className="text-white/60 hover:text-white transition-colors p-1" title="Settings">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
                </svg>
              </button>
            </div>

            {/* Mobile hamburger */}
            <button
              className="md:hidden text-white p-1"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <CloseIcon className="w-6 h-6"/> : <MenuIcon className="w-6 h-6"/>}
            </button>
          </div>

          {/* Mobile menu */}
          {mobileMenuOpen && (
            <div className="md:hidden border-t border-white/10 pb-4 px-4 animate-fade-in-up">
              <div className="flex flex-col gap-1 mt-2">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => { setActiveTab(tab.id); setMobileMenuOpen(false) }}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                      activeTab === tab.id
                        ? 'bg-white text-green-3 shadow-md'
                        : 'text-white/80 hover:bg-white/10'
                    }`}
                  >
                    {tab.icon}
                    {tab.label}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-3 mt-3 px-4 py-3 bg-white/10 rounded-xl">
                <div className="w-8 h-8 rounded-full bg-orange-3 flex items-center justify-center text-white text-sm font-bold">{userName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}</div>
                <div className="flex-1">
                  <div className="text-white text-sm font-semibold">{userName}</div>
                  <div className="text-white/60 text-xs">{ROLE_LABELS[role]}</div>
                </div>
                <button onClick={openSettings} className="text-white/60 hover:text-white transition-colors p-1" title="Settings">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
                  </svg>
                </button>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Settings popover */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-start justify-end p-4 pt-16" onClick={() => setShowSettings(false)}>
          <div className="bg-white rounded-2xl shadow-2xl border border-green-4/10 p-5 w-80 animate-fade-in-up max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h4 className="text-sm font-bold text-green-4 mb-3">Settings</h4>
            {/* Role switch */}
            <div className="flex flex-col gap-1 mb-3">
              <label className="text-xs font-semibold text-green-4/60 uppercase tracking-wider">Viewing As</label>
              <div className="grid grid-cols-2 gap-2">
                {[{ id: ROLES.HQ, label: 'HQ' }, { id: ROLES.RCSM, label: 'RCSM' }].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setSettingsRole(opt.id)}
                    className={`py-2 rounded-lg text-sm font-bold transition-colors border ${settingsRole === opt.id ? 'bg-green-2 text-white border-green-2' : 'bg-white text-green-4/70 border-green-4/15 hover:border-green-2'}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {settingsRole === ROLES.RCSM ? (
              <div className="flex flex-col gap-1 mb-3">
                <label className="text-xs font-semibold text-green-4/60 uppercase tracking-wider">RCSM Identity</label>
                <select
                  value={settingsRcsmId}
                  onChange={(e) => setSettingsRcsmId(e.target.value)}
                  className="bg-white border border-green-4/15 rounded-lg px-3 py-2 text-sm text-green-4 font-medium focus:outline-none focus:ring-2 focus:ring-green-2/40 focus:border-green-2 transition-all"
                >
                  {rcsms.map((r) => (
                    <option key={r.rcsmId} value={r.rcsmId}>{r.name} — {r.accounts.length} account{r.accounts.length !== 1 ? 's' : ''}</option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="flex flex-col gap-1 mb-3">
                <label className="text-xs font-semibold text-green-4/60 uppercase tracking-wider">Your Name</label>
                <input type="text" value={settingsName} onChange={(e) => setSettingsName(e.target.value)} placeholder="Your name" className="bg-white border border-green-4/15 rounded-lg px-3 py-2 text-sm text-green-4 font-medium focus:outline-none focus:ring-2 focus:ring-green-2/40 focus:border-green-2 transition-all placeholder:text-green-4/30"/>
              </div>
            )}
            <button
              onClick={handleSaveSettings}
              className="w-full py-2 rounded-lg bg-green-2 hover:bg-green-3 text-white font-bold text-sm transition-colors"
            >
              Save
            </button>

            {/* Reference Data Upload */}
            <div className="border-t border-green-4/10 mt-4 pt-4">
              <h4 className="text-sm font-bold text-green-4 mb-1">Retailer / Chain Reference</h4>
              <p className="text-xs text-green-4/40 mb-3">Upload an Excel or CSV file with "retailer" and "chain" columns to populate filter options.</p>

              {retailerChainData ? (
                <div className="space-y-2">
                  <div className="bg-green-2/10 border border-green-2/30 rounded-lg p-3 flex items-start gap-2">
                    <svg className="w-4 h-4 text-green-3 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M9 12l2 2 4-4"/></svg>
                    <div>
                      <p className="text-xs font-semibold text-green-3">{refDataFileName || 'File loaded'}</p>
                      <p className="text-xs text-green-4/50 mt-0.5">{retailerChainData.length} retailer{retailerChainData.length !== 1 ? 's' : ''} &middot; {[...new Set(retailerChainData.map(r => r.chain))].length} chain{[...new Set(retailerChainData.map(r => r.chain))].length !== 1 ? 's' : ''}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <label className="flex-1 py-2 rounded-lg border border-green-4/15 text-green-4 font-bold text-xs text-center transition-colors hover:bg-cream cursor-pointer">
                      Replace
                      <input type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={(e) => handleRefDataUpload(e.target.files[0])}/>
                    </label>
                    <button onClick={handleClearRefData} className="flex-1 py-2 rounded-lg border border-red-200 text-red-500 font-bold text-xs transition-colors hover:bg-red-50">
                      Remove
                    </button>
                  </div>
                </div>
              ) : (
                <label className="block border-2 border-dashed border-green-4/15 rounded-xl p-4 text-center cursor-pointer hover:border-green-2/50 transition-colors">
                  <svg className="w-8 h-8 mx-auto mb-2 text-green-4/20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                    <polyline points="17 8 12 3 7 8"/>
                    <line x1="12" y1="3" x2="12" y2="15"/>
                  </svg>
                  <p className="text-xs font-semibold text-green-4/50">Upload .xlsx or .csv</p>
                  <p className="text-[10px] text-green-4/30 mt-0.5">from SharePoint or local file</p>
                  <input type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={(e) => handleRefDataUpload(e.target.files[0])}/>
                </label>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 md:px-6 py-6">
        {/* Page title */}
        <div className="mb-6">
          <h2 className="text-xl md:text-2xl font-bold text-green-4">
            {activeTab === 'start' && `Welcome${userName && userName !== 'User' ? `, ${userName.split(' ')[0]}` : ''}`}
            {activeTab === 'inbox' && 'Approval Inbox'}
            {activeTab === 'promotions' && 'Current Priorities'}
            {activeTab === 'promodash' && 'Promotion Dashboard'}
            {activeTab === 'authorize' && 'Authorize Items'}
            {activeTab === 'workflag' && 'Home Location Check'}
            {activeTab === 'calendar' && 'Promo Calendar'}
            {activeTab === 'submissions' && 'My Submissions'}
            {activeTab === 'rcsms' && 'Manage RCSMs'}
          </h2>
          <p className="text-sm text-green-4/50 mt-0.5">
            {activeTab === 'start' && 'What would you like to do?'}
            {activeTab === 'inbox' && 'Approve or reject items routed to you, then export for your system'}
            {activeTab === 'promotions' && 'All entered priorities — request reporting on any of them'}
            {activeTab === 'promodash' && 'Detailed promotion cards and filters'}
            {activeTab === 'authorize' && 'Enter new items and the chains to authorize them in'}
            {activeTab === 'workflag' && 'Direct the field to verify the home shelf location of specific products'}
            {activeTab === 'calendar' && 'Timeline view of all promotional events across retailers'}
            {activeTab === 'submissions' && 'Track the status of everything you have submitted'}
            {activeTab === 'rcsms' && 'Define RCSMs and assign the clients they own (drives routing)'}
          </p>
        </div>

        {/* Views */}
        {activeTab === 'start' && <StartView onAuthorize={() => setActiveTab('authorize')} onHomeLocationCheck={() => setActiveTab('workflag')} onViewPriorities={() => setActiveTab('promotions')} onAddPriority={(type) => { setAddPriorityType(type); openAddModal() }}/>}
        {activeTab === 'inbox' && <InboxView session={session} promotions={promotions} requests={requests} onApprovePromo={handleApprovePromo} onRejectPromo={handleRejectPromo} onApproveRequest={handleApproveRequest} onRejectRequest={handleRejectRequest} onExportRequest={handleExportRequest} onExportPromo={handleExportPromo}/>}
        {activeTab === 'promotions' && <PrioritiesListView promotions={promotions} role={role} onSubmitPromo={role === ROLES.HQ ? handleSubmitPromo : null} onEditPromo={role === ROLES.HQ ? handleEditPromo : null} onAddRequest={handleAddRequest} onAddPriority={() => { setAddPriorityType('promo_display'); openAddModal() }}/>}
        {activeTab === 'promodash' && <PromotionsView promotions={promoOnly} role={role} onDeletePromo={role === ROLES.HQ ? handleDeletePromo : null} onSubmitPromo={handleSubmitPromo} onEditPromo={role === ROLES.HQ ? handleEditPromo : null} onAddRequest={role === ROLES.HQ ? handleAddRequest : null} brandColors={brandColors} onShowAddModal={openAddModal} retailerChainData={retailerChainData}/>}
        {activeTab === 'calendar' && <CalendarView promotions={promotions} brandColors={brandColors} onShowAddModal={openAddModal}/>}
        {activeTab === 'authorize' && <WorkflowSection type={REQUEST_TYPES.AUTHORIZE} requests={requests} refData={refData} onAddRequest={handleAddRequest}/>}
        {activeTab === 'workflag' && <WorkflowSection type={REQUEST_TYPES.WORKFLAG} requests={requests} refData={refData} onAddRequest={handleAddRequest}/>}
        {activeTab === 'submissions' && <MySubmissionsView promotions={promotions} requests={requests} rcsms={rcsms} onAddRequest={handleAddRequest}/>}
        {activeTab === 'rcsms' && <RcsmAdminView rcsms={rcsms} setRcsms={setRcsms} seedRefData={refData}/>}
      </main>

      {/* Floating Action Button (HQ only) */}
      {role === ROLES.HQ && (activeTab === 'promotions' || activeTab === 'promodash') && (
        <button
          onClick={() => { setAddPriorityType('promo_display'); openAddModal() }}
          className="fixed bottom-6 right-6 z-30 w-14 h-14 rounded-full bg-green-2 hover:bg-green-3 text-white shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center text-3xl font-light fab-pulse hover:scale-110"
          title="Add Promotion"
        >
          <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
        </button>
      )}

      {/* Add Promotion Modal */}
      <AddPromoModal
        isOpen={showAddModal}
        onClose={() => { setShowAddModal(false); setEditPromo(null) }}
        onAddPromo={handleAddPromo}
        onAddMultiplePromos={handleAddMultiplePromos}
        onUpdatePromo={handleUpdatePromo}
        editPromo={editPromo}
        promotions={promotions}
        brandColors={brandColors}
        retailerChainData={retailerChainData}
        seedRefData={refData}
        onAddRequest={handleAddRequest}
        initialPriorityType={addPriorityType}
      />

      {/* Footer */}
      <footer className="border-t border-green-4/8 bg-white/50 mt-8">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-2">
          <p className="text-xs text-green-4/40">Built by Advantage Solutions. Confidential.</p>
          <p className="text-xs text-green-4/30 italic">"We keep commerce and life moving"</p>
        </div>
      </footer>
    </div>
  )
}

export default App
