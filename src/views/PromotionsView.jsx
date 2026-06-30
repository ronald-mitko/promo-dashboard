import { useState, useMemo, useEffect } from 'react'
import FilterSelect from '../components/FilterSelect'
import MultiSelectFilter from '../components/MultiSelectFilter'
import PromoCard from '../components/PromoCard'
import { TrendUpIcon, TagIcon, FireIcon } from '../components/icons'

// Promo Dashboard view: filter bar, summary stat cards, and a grid of PromoCards.
// Extracted from App.jsx unchanged. StatCard is a local helper used only here.

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

export default PromotionsView
