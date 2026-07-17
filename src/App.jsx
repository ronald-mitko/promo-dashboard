import { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import { FIELD, LABEL } from './lib/ui'
import * as XLSX from 'xlsx'
import { useLocalStorageState } from './hooks/useLocalStorageState'
import { STORAGE_KEYS, ROLES, ROLE_LABELS } from './lib/constants'
import { SEED_RCSMS, SEED_TEAMS, SEED_CLIENTS, SEED_STORES, SEED_ITEMS } from './lib/seed'
import { loadInitialSession, withPromoDefaultsAll, withPromoDefaults, runMigration, genId } from './lib/storage'
import { toLocalYMD } from './lib/helpers'
import { resolveRcsmForRecord, rcsmName } from './lib/routing'
import { downloadExport } from './lib/exportFormat'
import { apiEnabled, listSubmissions, saveSubmission, deleteSubmission, toSubmissionRecord, getConfig, saveConfig } from './lib/api'
import { SUBMISSION_STATUS, REQUEST_TYPES, REQUEST_TYPE_LABELS, PRIORITY_TYPES } from './lib/constants'
import { notify } from './lib/notify'
import RequestStatusBadge from './components/RequestStatusBadge'
import RequestButtons from './components/RequestButtons'
import {
  CalendarIcon, TagIcon, CheckCircleIcon,
  MenuIcon, CloseIcon, FireIcon, StoreIcon, ClipboardIcon,
} from './components/icons'
import AddPromoModal from './components/AddPromoModal'
import { useAuth } from './components/AuthGate'
import { logout as authLogout } from './lib/auth'
import ChangePasswordModal from './components/ChangePasswordModal'
import UserAdminModal from './components/UserAdminModal'
import PromotionsView from './views/PromotionsView'
import CalendarView from './views/CalendarView'
import StartView from './views/StartView'
import PrioritiesListView from './views/PrioritiesListView'
import InboxView from './views/InboxView'
import MySubmissionsView from './views/MySubmissionsView'
import RcsmAdminView from './views/RcsmAdminView'
import WorkflowSection from './views/workflows/WorkflowSection'
import AuthorizeSection from './views/AuthorizeSection'

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

// Seed promo windows are expressed relative to "today" so the demo always shows
// a live mix of active/upcoming/ended, no matter when it's opened. (Real status
// is derived on load via withPromoDefaults; these offsets just keep the dates
// realistic.) [startOffsetDays, endOffsetDays] from today, per promo id.
const SEED_DATE_OFFSETS = {
  'WMT-TPR-DEMO01': [-5, 27],
  'TGT-FD-DEMO02': [-7, 21],
  'KRG-DIG-DEMO03': [-1, 20],
  'ALB-TPR-DEMO04': [23, 43],   // upcoming
  'PUB-FD-DEMO05': [-2, 22],
  'RAL-DIG-DEMO06': [-3, 18],
  'WEG-TPR-DEMO07': [-4, 24],
  'FRD-TPR-DEMO08': [-40, -14], // ended
}
SEED_PROMOTIONS.forEach((p) => {
  const off = SEED_DATE_OFFSETS[p.promo_id]
  if (!off) return
  const day = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return toLocalYMD(d) }
  p.start_date = day(off[0])
  p.end_date = day(off[1])
})

// ─────────────────────────────────────────────
// HELPER FUNCTIONS
// ─────────────────────────────────────────────
// formatDate / formatDateRange / formatCurrency imported from ./lib/helpers

// Generate brand colors dynamically from promo data.
// NOTE: brand colors must be applied via inline `style` (e.g. backgroundColor),
// NOT Tailwind classes. Tailwind's JIT only emits CSS for class names that
// appear literally in source; interpolated classes like `bg-[${color}]/15`
// are never generated, so they render as no-ops. We expose the raw hex only.
const BRAND_COLOR_PALETTE = ['#FF9527', '#007B4E', '#00C48D', '#5B8DEF', '#E74C8B', '#8B5CF6', '#F59E0B', '#10B981', '#EF4444', '#6366F1']

function getBrandColors(promotions) {
  const brands = [...new Set(promotions.map(p => p.brand))].sort()
  const colors = {}
  brands.forEach((brand, i) => {
    colors[brand] = { bar: BRAND_COLOR_PALETTE[i % BRAND_COLOR_PALETTE.length] }
  })
  return colors
}

// Retailer icons + getRetailerIcon imported from ./components/icons
// PROMO_TYPE_STYLES + StatusBadge imported from ./components/StatusBadge

// computeWeeks / promoOverlapsWeek moved into views/CalendarView.jsx

// SVG icons imported from ./components/icons
// StatusBadge imported from ./components/StatusBadge
// FilterSelect + MultiSelectFilter imported from ./components

// PromoCard imported from ./components/PromoCard

// PromotionsView (+ StatCard) -> views/PromotionsView.jsx
// CalendarView -> views/CalendarView.jsx
// DashboardView -> views/DashboardView.jsx (currently unused)


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
  const [showChangePw, setShowChangePw] = useState(false)
  const [showUserAdmin, setShowUserAdmin] = useState(false)

  // Signed-in identity from auth (user/name/admin + whether auth is enforced).
  const auth = useAuth()

  // Session: lightweight role switch (HQ enters/submits; RCSM approves/exports)
  const [session, setSession] = useLocalStorageState(STORAGE_KEYS.session, loadInitialSession)
  const role = session.role || ROLES.HQ
  // When auth is enforced, a person's name comes from their login account and
  // can't be self-edited; otherwise fall back to the local session name (demo).
  const userName = (auth.configured && auth.user) ? (auth.name || auth.user) : (session.userName || 'User')

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
    const liveIds = new Set()
    promotions.forEach((p) => {
      liveIds.add(p.promo_id)
      const rec = toSubmissionRecord(p, 'promotion')
      const sig = JSON.stringify(rec)
      if (savedPromoSig.current[p.promo_id] !== sig) { savedPromoSig.current[p.promo_id] = sig; saveSubmission(rec).catch(() => {}) }
    })
    // Propagate deletions: any id we've saved but is no longer present.
    Object.keys(savedPromoSig.current).forEach((id) => {
      if (!liveIds.has(id)) { delete savedPromoSig.current[id]; deleteSubmission(id).catch(() => {}) }
    })
  }, [promotions])
  useEffect(() => {
    if (!apiEnabled() || !apiLoadedRef.current) return
    const liveIds = new Set()
    requests.forEach((r) => {
      liveIds.add(r.requestId)
      const rec = toSubmissionRecord(r, 'request')
      const sig = JSON.stringify(rec)
      if (savedReqSig.current[r.requestId] !== sig) { savedReqSig.current[r.requestId] = sig; saveSubmission(rec).catch(() => {}) }
    })
    // Propagate deletions: any id we've saved but is no longer present.
    Object.keys(savedReqSig.current).forEach((id) => {
      if (!liveIds.has(id)) { delete savedReqSig.current[id]; deleteSubmission(id).catch(() => {}) }
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

  const requestLabel = (r) => `${REQUEST_TYPE_LABELS[r.type] || r.type}${r.clientName ? ` — ${r.clientName}` : ''}`

  const handleSubmitPromo = useCallback((promoId) => {
    const target = promotions.find(p => p.promo_id === promoId)
    const routed = target ? resolveRcsmForRecord(target, rcsms) : null
    setPromotions(prev => prev.map(p => p.promo_id === promoId
      ? { ...p, submission_status: SUBMISSION_STATUS.SUBMITTED, submitted_by: userName, submitter_email: auth.email || null, submitted_at: new Date().toISOString(), routed_rcsm: routed, approval_history: [...(p.approval_history || []), histEntry(p.submission_status, SUBMISSION_STATUS.SUBMITTED, userName)] }
      : p))
    if (target) notify('submitted', { routedRcsmId: routed, itemLabel: `Priority: ${target.product}`, submitterName: userName })
  }, [rcsms, userName, auth.email, promotions])

  const handleApprovePromo = useCallback((promoId) => {
    setPromotions(prev => prev.map(p => p.promo_id === promoId ? { ...p, submission_status: SUBMISSION_STATUS.APPROVED, approval_history: [...(p.approval_history || []), histEntry(p.submission_status, SUBMISSION_STATUS.APPROVED, userName)] } : p))
    const p = promotions.find(x => x.promo_id === promoId)
    if (p) notify('approved', { submitterEmail: p.submitter_email, itemLabel: `Priority: ${p.product}` })
  }, [userName, promotions])

  const handleRejectPromo = useCallback((promoId, note) => {
    setPromotions(prev => prev.map(p => p.promo_id === promoId ? { ...p, submission_status: SUBMISSION_STATUS.REJECTED, approval_history: [...(p.approval_history || []), histEntry(p.submission_status, SUBMISSION_STATUS.REJECTED, userName, note)] } : p))
    const p = promotions.find(x => x.promo_id === promoId)
    if (p) notify('rejected', { submitterEmail: p.submitter_email, itemLabel: `Priority: ${p.product}`, note })
  }, [userName, promotions])

  // Workflow requests (authorize/workflag/support/reporting) — added in later phases
  const handleAddRequest = useCallback((req) => {
    const routed = resolveRcsmForRecord(req, rcsms)
    setRequests(prev => [{
      ...req,
      requestId: req.requestId || genId('req'),
      submittedBy: userName,
      submitter_email: auth.email || null,
      submittedAt: new Date().toISOString(),
      status: SUBMISSION_STATUS.SUBMITTED,
      routed_rcsm: routed,
      approval_history: [histEntry('draft', SUBMISSION_STATUS.SUBMITTED, userName)],
    }, ...prev])
    notify('submitted', { routedRcsmId: routed, itemLabel: requestLabel(req), submitterName: userName })
  }, [rcsms, userName, auth.email, setRequests])

  // ── Bulk upload → create drafts to review, then submit ──
  const handleBulkAddPromos = useCallback((records) => {
    const drafts = records.map((r) => withPromoDefaults({ ...r, promo_id: genId('promo') }))
    setPromotions(prev => [...drafts, ...prev])
  }, [])

  const handleBulkAddRequests = useCallback((records) => {
    const drafts = records.map((r) => ({
      ...r,
      requestId: genId('req'),
      submittedBy: userName,
      submitter_email: auth.email || null,
      submittedAt: new Date().toISOString(),
      status: SUBMISSION_STATUS.DRAFT,
      routed_rcsm: null,
      approval_history: [],
    }))
    setRequests(prev => [...drafts, ...prev])
  }, [userName, auth.email, setRequests])

  // Submit a draft request → route to the owning RCSM + notify.
  const handleSubmitRequest = useCallback((id) => {
    const target = requests.find(r => r.requestId === id)
    const routed = target ? resolveRcsmForRecord(target, rcsms) : null
    setRequests(prev => prev.map(r => r.requestId === id
      ? { ...r, status: SUBMISSION_STATUS.SUBMITTED, routed_rcsm: routed, submittedAt: new Date().toISOString(), approval_history: [...(r.approval_history || []), histEntry(SUBMISSION_STATUS.DRAFT, SUBMISSION_STATUS.SUBMITTED, userName)] }
      : r))
    if (target) notify('submitted', { routedRcsmId: routed, itemLabel: requestLabel(target), submitterName: userName })
  }, [rcsms, userName, requests])

  const handleApproveRequest = useCallback((id, reason, frequency) => {
    setRequests(prev => prev.map(r => r.requestId === id ? {
      ...r,
      status: SUBMISSION_STATUS.APPROVED,
      // Reason + frequency chosen at approval → WorkFlag1ReasonJoin (doubled for
      // "work every") in the export.
      payload: reason ? { ...(r.payload || {}), reasonCode: reason, frequency: frequency || 'once' } : r.payload,
      approval_history: [...(r.approval_history || []), histEntry(r.status, SUBMISSION_STATUS.APPROVED, userName)],
    } : r))
    const r = requests.find(x => x.requestId === id)
    if (r) notify('approved', { submitterEmail: r.submitter_email, itemLabel: requestLabel(r) })
  }, [userName, setRequests, requests])

  const handleRejectRequest = useCallback((id, note) => {
    setRequests(prev => prev.map(r => r.requestId === id ? { ...r, status: SUBMISSION_STATUS.REJECTED, approval_history: [...(r.approval_history || []), histEntry(r.status, SUBMISSION_STATUS.REJECTED, userName, note)] } : r))
    const r = requests.find(x => x.requestId === id)
    if (r) notify('rejected', { submitterEmail: r.submitter_email, itemLabel: requestLabel(r), note })
  }, [userName, setRequests, requests])

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
            {/* Signed-in identity (only when auth is enforced) */}
            {auth.configured && auth.user && (
              <div className="mb-3 pb-3 border-b border-green-4/10">
                <label className={LABEL}>Signed in as</label>
                <div className="text-sm font-medium text-green-4 truncate">{auth.name || auth.user}</div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2">
                  <button onClick={() => setShowChangePw(true)} className="text-xs font-bold text-green-3 hover:text-green-4">Change password</button>
                  {auth.admin && <button onClick={() => setShowUserAdmin(true)} className="text-xs font-bold text-green-3 hover:text-green-4">Manage users</button>}
                  <button onClick={async () => { await authLogout(); window.location.reload() }} className="text-xs font-bold text-red-500 hover:text-red-600">Log out</button>
                </div>
              </div>
            )}
            {/* Role switch */}
            <div className="flex flex-col gap-1 mb-3">
              <label className={LABEL}>Viewing As</label>
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
                <label className={LABEL}>RCSM Identity</label>
                <select
                  value={settingsRcsmId}
                  onChange={(e) => setSettingsRcsmId(e.target.value)}
                  className={FIELD}
                >
                  {rcsms.map((r) => (
                    <option key={r.rcsmId} value={r.rcsmId}>{r.name} — {r.accounts.length} account{r.accounts.length !== 1 ? 's' : ''}</option>
                  ))}
                </select>
              </div>
            ) : (auth.configured && auth.user) ? null : (
              <div className="flex flex-col gap-1 mb-3">
                <label className={LABEL}>Your Name</label>
                <input type="text" value={settingsName} onChange={(e) => setSettingsName(e.target.value)} placeholder="Your name" className={`${FIELD} placeholder:text-green-4/30`}/>
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
            {activeTab === 'authorize' && 'Build a new item, or authorize an existing item into a new account'}
            {activeTab === 'workflag' && 'Direct the field to verify the home shelf location of specific products'}
            {activeTab === 'calendar' && 'Timeline view of all promotional events across retailers'}
            {activeTab === 'submissions' && 'Track the status of everything you have submitted'}
            {activeTab === 'rcsms' && 'Define RCSMs and assign the clients they own (drives routing)'}
          </p>
        </div>

        {/* Views */}
        {activeTab === 'start' && <StartView onAuthorize={() => setActiveTab('authorize')} onHomeLocationCheck={() => setActiveTab('workflag')} onViewPriorities={() => setActiveTab('promotions')} onAddPriority={(type) => { setAddPriorityType(type); openAddModal() }} onBulkImportPromo={role === ROLES.HQ ? handleBulkAddPromos : null} refData={refData}/>}
        {activeTab === 'inbox' && <InboxView session={session} promotions={promotions} requests={requests} onApprovePromo={handleApprovePromo} onRejectPromo={handleRejectPromo} onApproveRequest={handleApproveRequest} onRejectRequest={handleRejectRequest} onExportRequest={handleExportRequest} onExportPromo={handleExportPromo}/>}
        {activeTab === 'promotions' && <PrioritiesListView promotions={promotions} role={role} onSubmitPromo={role === ROLES.HQ ? handleSubmitPromo : null} onEditPromo={role === ROLES.HQ ? handleEditPromo : null} onAddRequest={handleAddRequest} onAddPriority={() => { setAddPriorityType('promo_display'); openAddModal() }}/>}
        {activeTab === 'promodash' && <PromotionsView promotions={promoOnly} role={role} onDeletePromo={role === ROLES.HQ ? handleDeletePromo : null} onSubmitPromo={handleSubmitPromo} onEditPromo={role === ROLES.HQ ? handleEditPromo : null} onAddRequest={role === ROLES.HQ ? handleAddRequest : null} brandColors={brandColors} onShowAddModal={openAddModal} retailerChainData={retailerChainData}/>}
        {activeTab === 'calendar' && <CalendarView promotions={promotions} brandColors={brandColors} onShowAddModal={openAddModal}/>}
        {activeTab === 'authorize' && <AuthorizeSection requests={requests} refData={refData} onAddRequest={handleAddRequest} onBulkImport={handleBulkAddRequests} onSubmitRequest={handleSubmitRequest}/>}
        {activeTab === 'workflag' && <WorkflowSection type={REQUEST_TYPES.WORKFLAG} requests={requests} refData={refData} onAddRequest={handleAddRequest} onBulkImport={handleBulkAddRequests} onSubmitRequest={handleSubmitRequest}/>}
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

      {showChangePw && <ChangePasswordModal onClose={() => setShowChangePw(false)} />}
      {showUserAdmin && <UserAdminModal onClose={() => setShowUserAdmin(false)} currentUser={auth.user} />}

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
