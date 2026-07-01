import { useState, useEffect } from "react"
import { FIELD, LABEL } from '../lib/ui'
import * as XLSX from "xlsx"
import { useReferenceData } from "../hooks/useReferenceData"
import { ChainPicker } from "./wizard/steps"
import { REQUEST_TYPES } from "../lib/constants"
import { formatDate, formatCurrency, formatDateRange, computeStatus } from "../lib/helpers"
import { CalendarIcon, CloseIcon, getRetailerIcon } from "./icons"
import StatusBadge, { PROMO_TYPE_STYLES } from "./StatusBadge"

// Add / edit a promotion (Priority). Three input modes: manual form, CSV/Excel
// upload, and AI parse. Extracted from App.jsx unchanged.
export default function AddPromoModal({ isOpen, onClose, onAddPromo, onAddMultiplePromos, onUpdatePromo, editPromo, promotions, brandColors, retailerChainData, seedRefData, onAddRequest, initialPriorityType }) {
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
    // Date.now() alone collides when called in a tight loop (bulk CSV/Excel import):
    // every row resolves the same millisecond. Add a random suffix so each id is unique.
    const unique = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`.toUpperCase()
    return `${abbrev[retailer] || 'GEN'}-${typeAbbrev[promoType] || 'PRO'}-${unique}`
  }

  // computeStatus imported from ./lib/helpers (single source, uses TODO)

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
                  <label className={LABEL}>Team *</label>
                  <select value={formData.teamId} onChange={(e) => { const t = refData.teams.find((x) => x.id === e.target.value); setFormData((prev) => ({ ...prev, teamId: e.target.value, teamName: t ? t.name : '', clientId: '', clientName: '', chains: [] })); setFormError('') }} className={FIELD}>
                    <option value="">Select a team…</option>
                    {refData.teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className={LABEL}>Client *</label>
                  <select value={formData.clientId} disabled={!formData.teamId} onChange={(e) => { const c = clientOptions.find((x) => x.clientId === e.target.value); setFormData((prev) => ({ ...prev, clientId: e.target.value, clientName: c ? c.name : '' })); setFormError('') }} className={`${FIELD} disabled:opacity-50`}>
                    <option value="">{formData.teamId ? 'Select a client…' : 'Select a team first'}</option>
                    {clientOptions.map((c) => <option key={c.clientId} value={c.clientId}>{c.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <label className={LABEL}>Retailer * — master / sub-master / chain</label>
                {formData.teamId ? (
                  <ChainPicker chains={refData.chains} selectedChains={formData.chains} dispatch={chainDispatch} />
                ) : (
                  <p className="text-xs text-green-4/40 mt-1">Select a team to choose retailers.</p>
                )}
                <p className="text-xs text-green-4/50 mt-1">{formData.chains.length} selected</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className={LABEL}>Product Name *</label>
                  <input type="text" value={formData.product} onChange={(e) => handleFormChange('product', e.target.value)} placeholder="e.g. Product Name 15lb" className={`${FIELD} placeholder:text-green-4/30`}/>
                </div>
                <div className="flex flex-col gap-1">
                  <label className={LABEL}>Brand *</label>
                  <input list="brands-list" value={formData.brand} onChange={(e) => handleFormChange('brand', e.target.value)} placeholder="e.g. Brand name" className={`${FIELD} placeholder:text-green-4/30`}/>
                  <datalist id="brands-list">
                    {[...new Set(promotions.map(p => p.brand))].map(b => <option key={b} value={b}/>)}
                  </datalist>
                </div>
                <div className="flex flex-col gap-1">
                  <label className={LABEL}>Category *</label>
                  <input list="categories-list" value={formData.category} onChange={(e) => handleFormChange('category', e.target.value)} placeholder="e.g. Product category" className={`${FIELD} placeholder:text-green-4/30`}/>
                  <datalist id="categories-list">
                    {[...new Set(promotions.map(p => p.category))].map(c => <option key={c} value={c}/>)}
                  </datalist>
                </div>
                <div className="flex flex-col gap-1">
                  <label className={LABEL}>Promo Type *</label>
                  <select value={formData.promo_type} onChange={(e) => handleFormChange('promo_type', e.target.value)} className={FIELD}>
                    {['TPR', 'Feature', 'Display', 'Feature and Display'].map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className={LABEL}>Mechanic *</label>
                  <input type="text" value={formData.mechanic} onChange={(e) => handleFormChange('mechanic', e.target.value)} placeholder="e.g. $2 off regular price" className={`${FIELD} placeholder:text-green-4/30`}/>
                </div>
                <div className="flex flex-col gap-1">
                  <label className={LABEL}>Start Date *</label>
                  <input type="date" value={formData.start_date} onChange={(e) => handleFormChange('start_date', e.target.value)} className={FIELD}/>
                </div>
                <div className="flex flex-col gap-1">
                  <label className={LABEL}>End Date *</label>
                  <input type="date" value={formData.end_date} onChange={(e) => handleFormChange('end_date', e.target.value)} className={FIELD}/>
                </div>
                <div className="flex flex-col gap-1">
                  <label className={LABEL}>Retail Price *</label>
                  <input type="number" step="0.01" min="0" value={formData.retail_price} onChange={(e) => handleFormChange('retail_price', e.target.value)} placeholder="18.99" className={`${FIELD} placeholder:text-green-4/30`}/>
                </div>
                <div className="flex flex-col gap-1">
                  <label className={LABEL}>Promo Price *</label>
                  <input type="number" step="0.01" min="0" value={formData.promo_price} onChange={(e) => handleFormChange('promo_price', e.target.value)} placeholder="16.99" className={`${FIELD} placeholder:text-green-4/30`}/>
                </div>
                <div className="flex flex-col gap-1">
                  <label className={LABEL}>Expected Lift %</label>
                  <input type="number" step="1" min="0" value={formData.expected_lift} onChange={(e) => handleFormChange('expected_lift', e.target.value)} placeholder="15" className={`${FIELD} placeholder:text-green-4/30`}/>
                </div>
                {formData.retail_price && formData.promo_price && parseFloat(formData.retail_price) > 0 && (
                  <div className="flex flex-col gap-1 justify-center">
                    <label className={LABEL}>Depth of Discount</label>
                    <div className="text-lg font-bold text-green-2">{((1 - parseFloat(formData.promo_price) / parseFloat(formData.retail_price)) * 100).toFixed(1)}%</div>
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-1">
                <label className={LABEL}>Display Requirements</label>
                <textarea value={formData.display} onChange={(e) => handleFormChange('display', e.target.value)} placeholder="e.g. Endcap display in pet aisle" rows={2} className={`${FIELD} placeholder:text-green-4/30 resize-none`}/>
              </div>
              <div className="flex flex-col gap-1">
                <label className={LABEL}>Compliance Checklist (one item per line)</label>
                <textarea value={formData.checklist_text} onChange={(e) => handleFormChange('checklist_text', e.target.value)} placeholder={"Verify price tag updated\nCheck stock levels\nPhoto verification required"} rows={3} className={`${FIELD} placeholder:text-green-4/30 resize-none`}/>
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
                    <label className={LABEL}>Anthropic API Key</label>
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
                      className={`flex-1 ${FIELD} placeholder:text-green-4/30 font-mono`}
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
                  <label className={LABEL}>Describe the promotion</label>
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
                            Save {aiParsedPromo.retail_price > 0 ? ((1 - aiParsedPromo.promo_price / aiParsedPromo.retail_price) * 100).toFixed(0) : 0}%
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
