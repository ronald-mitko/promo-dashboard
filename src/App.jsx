import { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import * as XLSX from 'xlsx'
import { useLocalStorageState } from './hooks/useLocalStorageState'
import { STORAGE_KEYS, ROLES, ROLE_LABELS } from './lib/constants'
import { SEED_RCSMS, SEED_TEAMS, SEED_CLIENTS, SEED_STORES, SEED_ITEMS } from './lib/seed'
import { loadInitialSession, withPromoDefaultsAll, withPromoDefaults, runMigration, genId } from './lib/storage'
import { formatDate, formatDateRange, formatCurrency } from './lib/helpers'
import { resolveRcsmForRecord, rcsmName } from './lib/routing'
import { downloadExport } from './lib/exportFormat'
import { apiEnabled, listSubmissions, saveSubmission, toSubmissionRecord } from './lib/api'
import { useReferenceData } from './hooks/useReferenceData'
import { ChainPicker } from './components/wizard/steps'
import { SUBMISSION_STATUS, REQUEST_TYPES, PRIORITY_TYPES } from './lib/constants'
import RequestStatusBadge from './components/RequestStatusBadge'
import RequestButtons from './components/RequestButtons'
import StartView from './views/StartView'
import PrioritiesListView from './views/PrioritiesListView'
import InboxView from './views/InboxView'
import MySubmissionsView from './views/MySubmissionsView'
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

function getRetailerIcon(retailer) {
  return KNOWN_RETAILER_ICONS[retailer] || DEFAULT_RETAILER_ICON
}

const PROMO_TYPE_STYLES = {
  TPR: 'bg-blue-100 text-blue-800',
  Feature: 'bg-purple-100 text-purple-800',
  Display: 'bg-pink-100 text-pink-800',
  'Feature and Display': 'bg-indigo-100 text-indigo-800',
  'Feature+Display': 'bg-purple-100 text-purple-800',
  'Digital Coupon': 'bg-cyan-100 text-cyan-800',
  Shipper: 'bg-amber-100 text-amber-800',
}

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

// ─────────────────────────────────────────────
// SVG ICONS (inline, no external deps)
// ─────────────────────────────────────────────
function CalendarIcon({ className = "w-4 h-4" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2"/>
      <line x1="16" y1="2" x2="16" y2="6"/>
      <line x1="8" y1="2" x2="8" y2="6"/>
      <line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  )
}

function TrendUpIcon({ className = "w-4 h-4" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
      <polyline points="17 6 23 6 23 12"/>
    </svg>
  )
}

function TagIcon({ className = "w-4 h-4" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/>
      <circle cx="7" cy="7" r="1" fill="currentColor"/>
    </svg>
  )
}

function CheckCircleIcon({ className = "w-4 h-4", checked }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" fill={checked ? '#00C48D' : 'none'} stroke={checked ? '#00C48D' : 'currentColor'}/>
      {checked && <path d="M9 12l2 2 4-4" stroke="white" strokeWidth="2.5"/>}
      {!checked && <circle cx="12" cy="12" r="10"/>}
    </svg>
  )
}

function ChevronDownIcon({ className = "w-4 h-4" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9"/>
    </svg>
  )
}

function MenuIcon({ className = "w-6 h-6" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="3" y1="6" x2="21" y2="6"/>
      <line x1="3" y1="12" x2="21" y2="12"/>
      <line x1="3" y1="18" x2="21" y2="18"/>
    </svg>
  )
}

function CloseIcon({ className = "w-6 h-6" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18"/>
      <line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  )
}

function FireIcon({ className = "w-5 h-5" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 23c-4.97 0-9-3.58-9-8 0-3.19 2.13-6.28 3.42-7.65.38-.41 1.04-.12 1.04.42 0 1.54.75 2.96 1.87 3.87.17.13.42.01.42-.2 0-2.59 1.34-5.64 4.2-7.93.37-.3.92-.07.95.4.14 2.08.9 3.88 2.36 5.3C19 11.05 21 13.58 21 15c0 4.42-4.03 8-9 8z"/>
    </svg>
  )
}

function StoreIcon({ className = "w-5 h-5" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
      <polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  )
}

function ClipboardIcon({ className = "w-5 h-5" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2"/>
      <rect x="8" y="2" width="8" height="4" rx="1"/>
      <line x1="8" y1="11" x2="16" y2="11"/>
      <line x1="8" y1="15" x2="16" y2="15"/>
    </svg>
  )
}

// ─────────────────────────────────────────────
// STATUS BADGE
// ─────────────────────────────────────────────
function StatusBadge({ status }) {
  const styles = {
    active: 'bg-green-2/20 text-green-3 border border-green-2/40',
    upcoming: 'bg-orange-3/20 text-orange-3 border border-orange-3/40',
    ended: 'bg-gray-200 text-gray-500 border border-gray-300',
  }
  const dotStyles = {
    active: 'bg-green-2',
    upcoming: 'bg-orange-3',
    ended: 'bg-gray-400',
  }
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider ${styles[status]}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dotStyles[status]} ${status === 'active' ? 'animate-pulse' : ''}`}/>
      {status}
    </span>
  )
}

// ─────────────────────────────────────────────
// FILTER DROPDOWN
// ─────────────────────────────────────────────
function FilterSelect({ label, value, onChange, options }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold text-green-4/60 uppercase tracking-wider">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-white border border-green-4/15 rounded-lg px-3 py-2 text-sm text-green-4 font-medium cursor-pointer hover:border-green-2 focus:outline-none focus:ring-2 focus:ring-green-2/40 focus:border-green-2 transition-all appearance-none"
        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2314332D' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center', paddingRight: '32px' }}
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    </div>
  )
}

// ─────────────────────────────────────────────
// MULTI-SELECT FILTER (for Chain)
// ─────────────────────────────────────────────
function MultiSelectFilter({ label, selected, onChange, options }) {
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

// ─────────────────────────────────────────────
// PROMO CARD
// ─────────────────────────────────────────────
function PromoCard({ promo, index, role, onDelete, onSubmit, onEdit, onAddRequest, brandColors }) {
  const [expanded, setExpanded] = useState(false)
  const [checkedItems, setCheckedItems] = useState({})
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const brandStyle = brandColors[promo.brand] || { bg: 'bg-gray-100', text: 'text-gray-700', bar: '#007B4E' }
  const savings = ((1 - promo.promo_price / promo.retail_price) * 100).toFixed(0)

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
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${brandStyle.bg} ${brandStyle.text} mb-3`}>
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

// ─────────────────────────────────────────────
// MAIN APP
// ─────────────────────────────────────────────
// ─────────────────────────────────────────────
// ADD PROMOTION MODAL
// ─────────────────────────────────────────────
function AddPromoModal({ isOpen, onClose, onAddPromo, onAddMultiplePromos, onUpdatePromo, editPromo, promotions, brandColors, retailerChainData, seedRefData, onAddRequest, initialPriorityType }) {
  const [activeModalTab, setActiveModalTab] = useState('manual')
  // Manual form state
  const [formData, setFormData] = useState({
    teamId: '', teamName: '',
    clientId: '', clientName: '',
    chains: [],
    retailer: '',
    product: '',
    brand: '',
    category: '',
    priority_type: 'promo_display',
    promo_type: 'TPR',
    start_date: '',
    end_date: '',
    mechanic: '',
    retail_price: '',
    promo_price: '',
    expected_lift: '',
    display: '',
    checklist_text: '',
  })
  const [formError, setFormError] = useState('')

  // Reference data (Team → Client → Retailer chains) from SL_Combined when live, else seed.
  const refData = useReferenceData({ teamId: formData.teamId, clientId: formData.clientId, chains: formData.chains }, seedRefData || { teams: [], clients: [], chains: [], stores: [], items: [] }, REQUEST_TYPES.AUTHORIZE)
  const clientOptions = refData.clients.filter((c) => !formData.teamId || c.teamId === formData.teamId)
  // Adapter so ChainPicker (reducer-style) can drive formData.chains
  const chainDispatch = (action) => {
    if (action.type === 'TOGGLE_IN_ARRAY') {
      setFormData((prev) => {
        const arr = prev.chains || []
        return { ...prev, chains: arr.includes(action.value) ? arr.filter((v) => v !== action.value) : [...arr, action.value] }
      })
    } else if (action.type === 'SET_ARRAY') {
      setFormData((prev) => ({ ...prev, chains: action.values }))
    }
  }

  // CSV upload state
  const [csvDragOver, setCsvDragOver] = useState(false)
  const [csvParsed, setCsvParsed] = useState(null)
  const [csvError, setCsvError] = useState('')

  // AI parse state
  const [aiText, setAiText] = useState('')
  const [aiApiKey, setAiApiKey] = useState(() => localStorage.getItem('advsol_anthropic_api_key') || '')
  const [aiKeySaved, setAiKeySaved] = useState(() => !!localStorage.getItem('advsol_anthropic_api_key'))
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState('')
  const [aiParsedPromo, setAiParsedPromo] = useState(null)

  const modalTabs = [
    { id: 'manual', label: 'Manual Form' },
    { id: 'csv', label: 'CSV Upload' },
    { id: 'ai', label: 'AI Parse' },
  ]

  // Lookup chain from retailer using reference data
  const lookupChain = (retailer) => {
    if (!retailerChainData || !retailer) return ''
    const match = retailerChainData.find(r => r.retailer.toLowerCase() === retailer.toLowerCase())
    return match ? match.chain : ''
  }

  const generatePromoId = (retailer, promoType) => {
    const abbrev = { Walmart: 'WMT', Target: 'TGT', Kroger: 'KRG', PetSmart: 'PET' }
    const typeAbbrev = { TPR: 'TPR', 'Feature+Display': 'FD', 'Digital Coupon': 'DIG', Shipper: 'SHP' }
    return `${abbrev[retailer] || 'GEN'}-${typeAbbrev[promoType] || 'PRO'}-${Date.now().toString(36).toUpperCase()}`
  }

  const computeStatus = (startDate, endDate) => {
    const today = '2026-04-08'
    if (startDate <= today && endDate >= today) return 'active'
    if (startDate > today) return 'upcoming'
    return 'ended'
  }

  // On open: prefill from the edited promo, or apply the chosen priority type for a new entry
  useEffect(() => {
    if (!isOpen) return
    if (editPromo) {
      setActiveModalTab('manual')
      setFormData({
        teamId: editPromo.teamId || '',
        teamName: editPromo.teamName || '',
        clientId: editPromo.clientId || '',
        clientName: editPromo.clientName || '',
        chains: editPromo.chains || [],
        retailer: editPromo.retailer || '',
        product: editPromo.product || '',
        brand: editPromo.brand || '',
        category: editPromo.category || '',
        priority_type: editPromo.priority_type || 'promo_display',
        promo_type: editPromo.promo_type || 'TPR',
        start_date: editPromo.start_date || '',
        end_date: editPromo.end_date || '',
        mechanic: editPromo.mechanic || '',
        retail_price: editPromo.retail_price != null ? String(editPromo.retail_price) : '',
        promo_price: editPromo.promo_price != null ? String(editPromo.promo_price) : '',
        expected_lift: editPromo.expected_lift != null ? String(editPromo.expected_lift) : '',
        display: editPromo.display && editPromo.display !== 'None specified' ? editPromo.display : '',
        checklist_text: (editPromo.checklist || []).join('\n'),
      })
    } else {
      setFormData(prev => ({ ...prev, priority_type: initialPriorityType || 'promo_display' }))
    }
  }, [isOpen, editPromo, initialPriorityType])

  const handleFormChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setFormError('')
  }

  const handleManualSubmit = () => {
    if (!formData.teamId || !formData.clientId || formData.chains.length === 0 || !formData.product || !formData.brand || !formData.category || !formData.start_date || !formData.end_date || !formData.mechanic || !formData.retail_price || !formData.promo_price) {
      setFormError('Please fill in all required fields: Team, Client, Retailer (at least one chain), Product Name, Brand, Category, Start Date, End Date, Mechanic, Retail Price, and Promo Price.')
      return
    }
    const retailPrice = parseFloat(formData.retail_price)
    const promoPrice = parseFloat(formData.promo_price)
    if (isNaN(retailPrice) || isNaN(promoPrice) || retailPrice <= 0 || promoPrice <= 0) {
      setFormError('Please enter valid prices.')
      return
    }
    const primaryChain = refData.chains.find((c) => c.chain === formData.chains[0])
    const master = primaryChain ? primaryChain.master : ''
    const depthOfDiscount = parseFloat(((1 - promoPrice / retailPrice) * 100).toFixed(1))
    const fields = {
      teamId: formData.teamId,
      teamName: formData.teamName,
      clientId: formData.clientId,
      clientName: formData.clientName,
      chains: formData.chains,
      retailer: formData.chains.length === 1 ? formData.chains[0] : (master || `${formData.chains.length} chains`),
      chain: master,
      masterChain: master,
      priority_type: formData.priority_type || 'promo_display',
      product: formData.product,
      brand: formData.brand,
      category: formData.category,
      promo_type: formData.promo_type,
      start_date: formData.start_date,
      end_date: formData.end_date,
      mechanic: formData.mechanic,
      depth_of_discount: depthOfDiscount,
      expected_lift: parseFloat(formData.expected_lift) || 10,
      retail_price: retailPrice,
      promo_price: promoPrice,
      display: formData.display || 'None specified',
      status: computeStatus(formData.start_date, formData.end_date),
      checklist: formData.checklist_text ? formData.checklist_text.split('\n').filter(l => l.trim()) : ['Verify price tag updated', 'Check stock levels', 'Photo verification required'],
    }
    if (editPromo) {
      onUpdatePromo(editPromo.promo_id, fields)
    } else {
      onAddPromo({ promo_id: generatePromoId(fields.retailer, formData.promo_type), ...fields })
    }
    // Reset form
    setFormData({ teamId: '', teamName: '', clientId: '', clientName: '', chains: [], retailer: '', product: '', brand: '', category: '', priority_type: formData.priority_type || 'promo_display', promo_type: 'TPR', start_date: '', end_date: '', mechanic: '', retail_price: '', promo_price: '', expected_lift: '', display: '', checklist_text: '' })
    setFormError('')
    onClose()
  }

  // CSV parsing
  const parseCSV = (text) => {
    const lines = text.trim().split('\n')
    if (lines.length < 2) {
      setCsvError('CSV must have a header row and at least one data row.')
      return
    }
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/\s+/g, '_'))
    const promos = []
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim())
      if (values.length < headers.length) continue
      const row = {}
      headers.forEach((h, idx) => { row[h] = values[idx] })
      const retailPrice = parseFloat(row.retail_price) || 0
      const promoPrice = parseFloat(row.promo_price) || 0
      promos.push({
        promo_id: generatePromoId(row.retailer || 'Unknown', row.promo_type || 'TPR'),
        retailer: row.retailer || 'Unknown',
        chain: row.chain || lookupChain(row.retailer || ''),
        product: row.product_name || row.product || 'Unknown Product',
        brand: row.brand || 'Unknown',
        category: row.category || 'General',
        promo_type: row.promo_type || 'TPR',
        start_date: row.start_date || '2026-04-13',
        end_date: row.end_date || '2026-04-26',
        mechanic: row.mechanic || 'Promotional pricing',
        depth_of_discount: retailPrice > 0 ? parseFloat(((1 - promoPrice / retailPrice) * 100).toFixed(1)) : 0,
        expected_lift: parseFloat(row.expected_lift) || 10,
        retail_price: retailPrice,
        promo_price: promoPrice,
        display: row.display_requirements || row.display || 'None specified',
        status: computeStatus(row.start_date || '2026-04-13', row.end_date || '2026-04-26'),
        checklist: row.checklist_items ? row.checklist_items.split(';').map(s => s.trim()).filter(Boolean) : ['Verify price tag updated', 'Check stock levels', 'Photo verification required'],
      })
    }
    if (promos.length === 0) {
      setCsvError('No valid promotions found in file.')
      return
    }
    setCsvError('')
    setCsvParsed(promos)
  }

  const handleFileUpload = (file) => {
    if (!file) return
    const ext = file.name.split('.').pop().toLowerCase()
    if (ext === 'csv') {
      const reader = new FileReader()
      reader.onload = (e) => parseCSV(e.target.result)
      reader.readAsText(file)
    } else if (ext === 'xlsx' || ext === 'xls') {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const wb = XLSX.read(e.target.result, { type: 'array' })
          const ws = wb.Sheets[wb.SheetNames[0]]
          const csvText = XLSX.utils.sheet_to_csv(ws)
          parseCSV(csvText)
        } catch (err) {
          setCsvError('Failed to parse Excel file: ' + err.message)
        }
      }
      reader.readAsArrayBuffer(file)
    } else {
      setCsvError('Unsupported file type. Please upload a .csv or .xlsx file.')
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setCsvDragOver(false)
    const file = e.dataTransfer.files[0]
    handleFileUpload(file)
  }

  const handleCsvImport = () => {
    if (csvParsed && csvParsed.length > 0) {
      onAddMultiplePromos(csvParsed)
      setCsvParsed(null)
      onClose()
    }
  }

  // AI parsing
  const handleSaveApiKey = () => {
    localStorage.setItem('advsol_anthropic_api_key', aiApiKey)
    setAiKeySaved(true)
    setTimeout(() => setAiKeySaved(false), 2000)
  }

  const handleAiParse = async () => {
    if (!aiApiKey) {
      setAiError('Please enter your Anthropic API key first.')
      return
    }
    if (!aiText.trim()) {
      setAiError('Please describe the promotion before parsing.')
      return
    }
    setAiLoading(true)
    setAiError('')
    setAiParsedPromo(null)
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': aiApiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1024,
          system: `You are a CPG (consumer packaged goods) promotion data parser for Advantage Solutions. Parse the user's description of a retail promotion into a structured JSON object. Return ONLY valid JSON matching this schema:
{
  "retailer": "string (retailer/account name)",
  "product": "string (product name with size)",
  "brand": "string (brand name)",
  "category": "string (product category)",
  "promo_type": "TPR|Feature+Display|Digital Coupon|Shipper",
  "start_date": "YYYY-MM-DD",
  "end_date": "YYYY-MM-DD",
  "mechanic": "string describing the deal",
  "retail_price": number,
  "promo_price": number,
  "expected_lift": number (percentage),
  "display": "string describing display requirements or 'None'",
  "checklist": ["string array of 3-4 compliance check items"]
}
Infer any missing fields with reasonable defaults for CPG retail. Today's date is 2026-04-08.`,
          messages: [{ role: 'user', content: aiText }]
        })
      })
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}))
        throw new Error(errData.error?.message || `API request failed (${response.status})`)
      }
      const data = await response.json()
      const text = data.content?.[0]?.text || ''
      // Extract JSON from response (handle markdown code blocks)
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('Could not find JSON in AI response.')
      const parsed = JSON.parse(jsonMatch[0])
      const retailPrice = parseFloat(parsed.retail_price) || 0
      const promoPrice = parseFloat(parsed.promo_price) || 0
      const promo = {
        promo_id: generatePromoId(parsed.retailer || 'Unknown', parsed.promo_type || 'TPR'),
        retailer: parsed.retailer || 'Unknown',
        chain: lookupChain(parsed.retailer || ''),
        product: parsed.product || 'Unknown Product',
        brand: parsed.brand || 'Unknown',
        category: parsed.category || 'General',
        promo_type: parsed.promo_type || 'TPR',
        start_date: parsed.start_date || '2026-04-13',
        end_date: parsed.end_date || '2026-04-26',
        mechanic: parsed.mechanic || 'Promotional pricing',
        depth_of_discount: retailPrice > 0 ? parseFloat(((1 - promoPrice / retailPrice) * 100).toFixed(1)) : 0,
        expected_lift: parseFloat(parsed.expected_lift) || 10,
        retail_price: retailPrice,
        promo_price: promoPrice,
        display: parsed.display || 'None specified',
        status: computeStatus(parsed.start_date || '2026-04-13', parsed.end_date || '2026-04-26'),
        checklist: Array.isArray(parsed.checklist) && parsed.checklist.length > 0 ? parsed.checklist : ['Verify price tag updated', 'Check stock levels', 'Photo verification required'],
      }
      setAiParsedPromo(promo)
    } catch (err) {
      setAiError(err.message || 'Failed to parse promotion. Please try again.')
    } finally {
      setAiLoading(false)
    }
  }

  const handleAiAddPromo = () => {
    if (aiParsedPromo) {
      onAddPromo(aiParsedPromo)
      setAiParsedPromo(null)
      setAiText('')
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm"/>
      {/* Modal */}
      <div
        className="relative w-full md:max-w-2xl max-h-[90vh] bg-white md:rounded-2xl rounded-t-2xl shadow-2xl overflow-hidden flex flex-col modal-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-green-3 to-green-2 px-5 py-4 shrink-0">
          <div className="flex items-center justify-between">
            <h3 className="text-white font-bold text-lg">{editPromo ? 'Edit Priority' : 'Add Promotion'}</h3>
            <button onClick={onClose} className="text-white/70 hover:text-white transition-colors">
              <CloseIcon className="w-5 h-5"/>
            </button>
          </div>
          {/* Tabs (hidden when editing an existing entry) */}
          <div className={`items-center gap-1 mt-3 bg-white/10 rounded-xl p-1 ${editPromo ? 'hidden' : 'flex'}`}>
            {modalTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveModalTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition-all ${
                  activeModalTab === tab.id
                    ? 'bg-white text-green-3 shadow-md'
                    : 'text-white/80 hover:bg-white/10 hover:text-white'
                }`}
              >
                {tab.id === 'ai' && (
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/>
                  </svg>
                )}
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {/* Manual Form Tab */}
          {activeModalTab === 'manual' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-green-4/60 uppercase tracking-wider">Team *</label>
                  <select value={formData.teamId} onChange={(e) => { const t = refData.teams.find((x) => x.id === e.target.value); setFormData((prev) => ({ ...prev, teamId: e.target.value, teamName: t ? t.name : '', clientId: '', clientName: '', chains: [] })); setFormError('') }} className="bg-white border border-green-4/15 rounded-lg px-3 py-2 text-sm text-green-4 font-medium focus:outline-none focus:ring-2 focus:ring-green-2/40 focus:border-green-2 transition-all">
                    <option value="">Select a team…</option>
                    {refData.teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-green-4/60 uppercase tracking-wider">Client *</label>
                  <select value={formData.clientId} disabled={!formData.teamId} onChange={(e) => { const c = clientOptions.find((x) => x.clientId === e.target.value); setFormData((prev) => ({ ...prev, clientId: e.target.value, clientName: c ? c.name : '' })); setFormError('') }} className="bg-white border border-green-4/15 rounded-lg px-3 py-2 text-sm text-green-4 font-medium focus:outline-none focus:ring-2 focus:ring-green-2/40 focus:border-green-2 transition-all disabled:opacity-50">
                    <option value="">{formData.teamId ? 'Select a client…' : 'Select a team first'}</option>
                    {clientOptions.map((c) => <option key={c.clientId} value={c.clientId}>{c.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-green-4/60 uppercase tracking-wider">Retailer * — master / sub-master / chain</label>
                {formData.teamId ? (
                  <ChainPicker chains={refData.chains} selectedChains={formData.chains} dispatch={chainDispatch} />
                ) : (
                  <p className="text-xs text-green-4/40 mt-1">Select a team to choose retailers.</p>
                )}
                <p className="text-xs text-green-4/50 mt-1">{formData.chains.length} selected</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-green-4/60 uppercase tracking-wider">Product Name *</label>
                  <input type="text" value={formData.product} onChange={(e) => handleFormChange('product', e.target.value)} placeholder="e.g. Product Name 15lb" className="bg-white border border-green-4/15 rounded-lg px-3 py-2 text-sm text-green-4 font-medium focus:outline-none focus:ring-2 focus:ring-green-2/40 focus:border-green-2 transition-all placeholder:text-green-4/30"/>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-green-4/60 uppercase tracking-wider">Brand *</label>
                  <input list="brands-list" value={formData.brand} onChange={(e) => handleFormChange('brand', e.target.value)} placeholder="e.g. Brand name" className="bg-white border border-green-4/15 rounded-lg px-3 py-2 text-sm text-green-4 font-medium focus:outline-none focus:ring-2 focus:ring-green-2/40 focus:border-green-2 transition-all placeholder:text-green-4/30"/>
                  <datalist id="brands-list">
                    {[...new Set(promotions.map(p => p.brand))].map(b => <option key={b} value={b}/>)}
                  </datalist>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-green-4/60 uppercase tracking-wider">Category *</label>
                  <input list="categories-list" value={formData.category} onChange={(e) => handleFormChange('category', e.target.value)} placeholder="e.g. Product category" className="bg-white border border-green-4/15 rounded-lg px-3 py-2 text-sm text-green-4 font-medium focus:outline-none focus:ring-2 focus:ring-green-2/40 focus:border-green-2 transition-all placeholder:text-green-4/30"/>
                  <datalist id="categories-list">
                    {[...new Set(promotions.map(p => p.category))].map(c => <option key={c} value={c}/>)}
                  </datalist>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-green-4/60 uppercase tracking-wider">Promo Type *</label>
                  <select value={formData.promo_type} onChange={(e) => handleFormChange('promo_type', e.target.value)} className="bg-white border border-green-4/15 rounded-lg px-3 py-2 text-sm text-green-4 font-medium focus:outline-none focus:ring-2 focus:ring-green-2/40 focus:border-green-2 transition-all">
                    {['TPR', 'Feature', 'Display', 'Feature and Display'].map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-green-4/60 uppercase tracking-wider">Mechanic *</label>
                  <input type="text" value={formData.mechanic} onChange={(e) => handleFormChange('mechanic', e.target.value)} placeholder="e.g. $2 off regular price" className="bg-white border border-green-4/15 rounded-lg px-3 py-2 text-sm text-green-4 font-medium focus:outline-none focus:ring-2 focus:ring-green-2/40 focus:border-green-2 transition-all placeholder:text-green-4/30"/>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-green-4/60 uppercase tracking-wider">Start Date *</label>
                  <input type="date" value={formData.start_date} onChange={(e) => handleFormChange('start_date', e.target.value)} className="bg-white border border-green-4/15 rounded-lg px-3 py-2 text-sm text-green-4 font-medium focus:outline-none focus:ring-2 focus:ring-green-2/40 focus:border-green-2 transition-all"/>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-green-4/60 uppercase tracking-wider">End Date *</label>
                  <input type="date" value={formData.end_date} onChange={(e) => handleFormChange('end_date', e.target.value)} className="bg-white border border-green-4/15 rounded-lg px-3 py-2 text-sm text-green-4 font-medium focus:outline-none focus:ring-2 focus:ring-green-2/40 focus:border-green-2 transition-all"/>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-green-4/60 uppercase tracking-wider">Retail Price *</label>
                  <input type="number" step="0.01" min="0" value={formData.retail_price} onChange={(e) => handleFormChange('retail_price', e.target.value)} placeholder="18.99" className="bg-white border border-green-4/15 rounded-lg px-3 py-2 text-sm text-green-4 font-medium focus:outline-none focus:ring-2 focus:ring-green-2/40 focus:border-green-2 transition-all placeholder:text-green-4/30"/>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-green-4/60 uppercase tracking-wider">Promo Price *</label>
                  <input type="number" step="0.01" min="0" value={formData.promo_price} onChange={(e) => handleFormChange('promo_price', e.target.value)} placeholder="16.99" className="bg-white border border-green-4/15 rounded-lg px-3 py-2 text-sm text-green-4 font-medium focus:outline-none focus:ring-2 focus:ring-green-2/40 focus:border-green-2 transition-all placeholder:text-green-4/30"/>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-green-4/60 uppercase tracking-wider">Expected Lift %</label>
                  <input type="number" step="1" min="0" value={formData.expected_lift} onChange={(e) => handleFormChange('expected_lift', e.target.value)} placeholder="15" className="bg-white border border-green-4/15 rounded-lg px-3 py-2 text-sm text-green-4 font-medium focus:outline-none focus:ring-2 focus:ring-green-2/40 focus:border-green-2 transition-all placeholder:text-green-4/30"/>
                </div>
                {formData.retail_price && formData.promo_price && parseFloat(formData.retail_price) > 0 && (
                  <div className="flex flex-col gap-1 justify-center">
                    <label className="text-xs font-semibold text-green-4/60 uppercase tracking-wider">Depth of Discount</label>
                    <div className="text-lg font-bold text-green-2">{((1 - parseFloat(formData.promo_price) / parseFloat(formData.retail_price)) * 100).toFixed(1)}%</div>
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-green-4/60 uppercase tracking-wider">Display Requirements</label>
                <textarea value={formData.display} onChange={(e) => handleFormChange('display', e.target.value)} placeholder="e.g. Endcap display in pet aisle" rows={2} className="bg-white border border-green-4/15 rounded-lg px-3 py-2 text-sm text-green-4 font-medium focus:outline-none focus:ring-2 focus:ring-green-2/40 focus:border-green-2 transition-all placeholder:text-green-4/30 resize-none"/>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-green-4/60 uppercase tracking-wider">Compliance Checklist (one item per line)</label>
                <textarea value={formData.checklist_text} onChange={(e) => handleFormChange('checklist_text', e.target.value)} placeholder={"Verify price tag updated\nCheck stock levels\nPhoto verification required"} rows={3} className="bg-white border border-green-4/15 rounded-lg px-3 py-2 text-sm text-green-4 font-medium focus:outline-none focus:ring-2 focus:ring-green-2/40 focus:border-green-2 transition-all placeholder:text-green-4/30 resize-none"/>
              </div>
              {formError && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-2">{formError}</div>
              )}

              <button
                onClick={handleManualSubmit}
                className="w-full py-3 rounded-xl bg-green-2 hover:bg-green-3 text-white font-bold text-sm transition-colors shadow-md hover:shadow-lg"
              >
                {editPromo ? 'Save Changes' : 'Add Promotion'}
              </button>
            </div>
          )}

          {/* CSV Upload Tab */}
          {activeModalTab === 'csv' && (
            <div className="space-y-4">
              {!csvParsed ? (
                <>
                  <div
                    className={`border-2 border-dashed rounded-2xl p-10 text-center transition-all cursor-pointer ${
                      csvDragOver ? 'border-green-2 bg-green-2/5' : 'border-green-4/20 hover:border-green-2/50'
                    }`}
                    onDragOver={(e) => { e.preventDefault(); setCsvDragOver(true) }}
                    onDragLeave={() => setCsvDragOver(false)}
                    onDrop={handleDrop}
                    onClick={() => document.getElementById('csv-file-input').click()}
                  >
                    <svg className="w-12 h-12 mx-auto mb-3 text-green-4/30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                      <polyline points="17 8 12 3 7 8"/>
                      <line x1="12" y1="3" x2="12" y2="15"/>
                    </svg>
                    <p className="text-sm font-semibold text-green-4/60 mb-1">Drop your CSV or Excel file here</p>
                    <p className="text-xs text-green-4/40">or click to browse files (.csv, .xlsx)</p>
                    <input id="csv-file-input" type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={(e) => handleFileUpload(e.target.files[0])}/>
                  </div>
                  <div className="bg-cream rounded-xl p-4">
                    <p className="text-xs font-semibold text-green-4/60 mb-2">Expected CSV columns:</p>
                    <p className="text-xs text-green-4/40 font-mono leading-relaxed">retailer, product_name, brand, category, promo_type, start_date, end_date, mechanic, retail_price, promo_price, expected_lift, display_requirements, checklist_items</p>
                    <p className="text-xs text-green-4/40 mt-2 italic">Tip: For checklist_items, separate items with semicolons (;)</p>
                  </div>
                  {csvError && (
                    <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-2">{csvError}</div>
                  )}
                </>
              ) : (
                <>
                  <div className="bg-green-2/10 border border-green-2/30 rounded-xl p-3 flex items-center gap-2">
                    <svg className="w-5 h-5 text-green-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M9 12l2 2 4-4"/></svg>
                    <span className="text-sm font-semibold text-green-3">{csvParsed.length} promotion{csvParsed.length !== 1 ? 's' : ''} found in file</span>
                  </div>
                  <div className="overflow-x-auto rounded-xl border border-green-4/10">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-green-4/5">
                          <th className="text-left px-3 py-2 font-semibold text-green-4/60">Retailer</th>
                          <th className="text-left px-3 py-2 font-semibold text-green-4/60">Product</th>
                          <th className="text-left px-3 py-2 font-semibold text-green-4/60">Brand</th>
                          <th className="text-left px-3 py-2 font-semibold text-green-4/60">Type</th>
                          <th className="text-left px-3 py-2 font-semibold text-green-4/60">Dates</th>
                          <th className="text-right px-3 py-2 font-semibold text-green-4/60">Price</th>
                        </tr>
                      </thead>
                      <tbody>
                        {csvParsed.map((p, i) => (
                          <tr key={i} className="border-t border-green-4/5">
                            <td className="px-3 py-2 text-green-4">{p.retailer}</td>
                            <td className="px-3 py-2 text-green-4 max-w-[150px] truncate">{p.product}</td>
                            <td className="px-3 py-2 text-green-4">{p.brand}</td>
                            <td className="px-3 py-2 text-green-4">{p.promo_type}</td>
                            <td className="px-3 py-2 text-green-4/70">{formatDate(p.start_date)} - {formatDate(p.end_date)}</td>
                            <td className="px-3 py-2 text-right text-green-3 font-semibold">{formatCurrency(p.promo_price)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => setCsvParsed(null)} className="flex-1 py-3 rounded-xl border border-green-4/15 text-green-4 font-bold text-sm transition-colors hover:bg-cream">
                      Cancel
                    </button>
                    <button onClick={handleCsvImport} className="flex-1 py-3 rounded-xl bg-green-2 hover:bg-green-3 text-white font-bold text-sm transition-colors shadow-md hover:shadow-lg">
                      Import {csvParsed.length} Promotion{csvParsed.length !== 1 ? 's' : ''}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* AI Parse Tab */}
          {activeModalTab === 'ai' && (
            <div className="space-y-4">
              <div className="bg-gradient-to-br from-green-2/5 to-orange-3/5 rounded-2xl p-4 border border-green-2/10">
                {/* API Key section */}
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="w-4 h-4 text-green-4/50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
                    </svg>
                    <label className="text-xs font-semibold text-green-4/60 uppercase tracking-wider">Anthropic API Key</label>
                    {aiKeySaved && (
                      <span className="text-xs font-semibold text-green-2 flex items-center gap-1">
                        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M9 12l2 2 4-4"/></svg>
                        Key saved
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="password"
                      value={aiApiKey}
                      onChange={(e) => setAiApiKey(e.target.value)}
                      placeholder="sk-ant-..."
                      className="flex-1 bg-white border border-green-4/15 rounded-lg px-3 py-2 text-sm text-green-4 font-medium focus:outline-none focus:ring-2 focus:ring-green-2/40 focus:border-green-2 transition-all placeholder:text-green-4/30 font-mono"
                    />
                    <button
                      onClick={handleSaveApiKey}
                      className="px-4 py-2 rounded-lg bg-green-4/10 hover:bg-green-4/20 text-green-4 text-sm font-semibold transition-colors"
                    >
                      Save
                    </button>
                  </div>
                  {!aiApiKey && (
                    <p className="text-xs text-green-4/40 mt-1.5">Enter your Anthropic API key to enable AI parsing</p>
                  )}
                </div>

                {/* Text input */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-green-4/60 uppercase tracking-wider">Describe the promotion</label>
                  <textarea
                    value={aiText}
                    onChange={(e) => { setAiText(e.target.value); setAiError('') }}
                    placeholder="Describe the promotion in plain English... e.g. 'Walmart is running a $3 off TPR on Brand X Product 15lb starting May 1st through May 14th with an endcap display. Expected lift is 20%. Regular price is $18.99.'"
                    rows={5}
                    className="bg-white border border-green-4/15 rounded-lg px-3 py-3 text-sm text-green-4 font-medium focus:outline-none focus:ring-2 focus:ring-green-2/40 focus:border-green-2 transition-all placeholder:text-green-4/30 resize-none"
                  />
                </div>

                <button
                  onClick={handleAiParse}
                  disabled={aiLoading || !aiApiKey}
                  className={`w-full mt-3 py-3 rounded-xl text-white font-bold text-sm transition-all shadow-md flex items-center justify-center gap-2 ${
                    aiLoading || !aiApiKey ? 'bg-green-4/30 cursor-not-allowed' : 'bg-gradient-to-r from-green-3 to-green-2 hover:shadow-lg hover:scale-[1.01]'
                  }`}
                >
                  {aiLoading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full ai-spinner"/>
                      Parsing...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/>
                      </svg>
                      Parse with AI
                    </>
                  )}
                </button>
              </div>

              {aiError && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-2">{aiError}</div>
              )}

              {/* AI Parsed Preview */}
              {aiParsedPromo && (
                <div className="space-y-3">
                  <div className="bg-green-2/10 border border-green-2/30 rounded-xl p-3 flex items-center gap-2">
                    <svg className="w-5 h-5 text-green-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M9 12l2 2 4-4"/></svg>
                    <span className="text-sm font-semibold text-green-3">Promotion parsed successfully!</span>
                  </div>
                  {/* Preview card mimicking PromoCard style */}
                  <div className="bg-white rounded-2xl shadow-sm border border-green-4/8 overflow-hidden">
                    <div className="h-1" style={{ background: `linear-gradient(90deg, ${brandColors[aiParsedPromo.brand]?.bar || '#007B4E'}, ${brandColors[aiParsedPromo.brand]?.bar || '#007B4E'}88)` }}/>
                    <div className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <StatusBadge status={aiParsedPromo.status}/>
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-lg ${PROMO_TYPE_STYLES[aiParsedPromo.promo_type] || 'bg-gray-100 text-gray-700'}`}>{aiParsedPromo.promo_type}</span>
                      </div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-green-3">{getRetailerIcon(aiParsedPromo.retailer)}</span>
                        <span className="text-sm font-semibold text-green-3">{aiParsedPromo.retailer}</span>
                      </div>
                      <h3 className="text-base font-bold text-green-4 mb-2">{aiParsedPromo.product}</h3>
                      <div className="flex items-center gap-2 text-sm text-green-4/70 mb-2">
                        <CalendarIcon className="w-4 h-4 text-green-3/60"/>
                        <span>{formatDateRange(aiParsedPromo.start_date, aiParsedPromo.end_date)}</span>
                      </div>
                      <div className="bg-cream rounded-xl p-3 mb-2">
                        <div className="flex items-baseline gap-3">
                          <span className="text-lg line-through text-green-4/40 font-medium">{formatCurrency(aiParsedPromo.retail_price)}</span>
                          <span className="text-2xl font-bold text-green-3">{formatCurrency(aiParsedPromo.promo_price)}</span>
                          <span className="ml-auto bg-green-2/15 text-green-2 text-xs font-bold px-2 py-1 rounded-lg">
                            Save {((1 - aiParsedPromo.promo_price / aiParsedPromo.retail_price) * 100).toFixed(0)}%
                          </span>
                        </div>
                      </div>
                      <p className="text-sm text-green-4/80 mb-1">{aiParsedPromo.mechanic}</p>
                      <p className="text-sm text-green-4/60">{aiParsedPromo.display}</p>
                    </div>
                  </div>
                  <button
                    onClick={handleAiAddPromo}
                    className="w-full py-3 rounded-xl bg-green-2 hover:bg-green-3 text-white font-bold text-sm transition-colors shadow-md hover:shadow-lg"
                  >
                    Add Promotion
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

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
  const apiLoadedRef = useRef(false)
  useEffect(() => {
    if (!apiEnabled()) { apiLoadedRef.current = true; return }
    listSubmissions()
      .then((recs) => {
        setPromotions(recs.filter((r) => r.kind === 'promotion').map(withPromoDefaults))
        setRequests(recs.filter((r) => r.kind === 'request'))
      })
      .catch(() => { /* fall back to local state */ })
      .finally(() => { apiLoadedRef.current = true })
  }, [])
  useEffect(() => {
    if (apiEnabled() && apiLoadedRef.current) promotions.forEach((p) => saveSubmission(toSubmissionRecord(p, 'promotion')).catch(() => {}))
  }, [promotions])
  useEffect(() => {
    if (apiEnabled() && apiLoadedRef.current) requests.forEach((r) => saveSubmission(toSubmissionRecord(r, 'request')).catch(() => {}))
  }, [requests])

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
      ]
    : [
        { id: 'start', label: 'Home', icon: <StoreIcon className="w-4 h-4"/> },
        { id: 'promotions', label: 'Priorities', icon: <TagIcon className="w-4 h-4"/> },
        { id: 'authorize', label: 'Authorize', icon: <CheckCircleIcon className="w-4 h-4"/> },
        { id: 'promodash', label: 'Promo Dashboard', icon: <FireIcon className="w-4 h-4"/> },
        { id: 'calendar', label: 'Promo Calendar', icon: <CalendarIcon className="w-4 h-4"/> },
        { id: 'submissions', label: 'My Submissions', icon: <ClipboardIcon className="w-4 h-4"/> },
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
