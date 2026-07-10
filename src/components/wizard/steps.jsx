import { useEffect, useMemo, useState } from 'react'
import { DATE_PRESETS, NEW_ITEM_FIELDS, CONTRACT_CONFIRM_TEXT } from '../../lib/constants'
import { formatDateRange, toLocalYMD } from '../../lib/helpers'
import { apiEnabled } from '../../lib/api'
import { FIELD, LABEL } from '../../lib/ui'

// Shared field/label style tokens (single source in lib/ui).
const labelCls = LABEL
const inputCls = FIELD

function ChoiceButton({ active, onClick, children }) {
  return (
    <button type="button" onClick={onClick} className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors border ${active ? 'bg-green-2 text-white border-green-2' : 'bg-white text-green-4/70 border-green-4/15 hover:border-green-2'}`}>{children}</button>
  )
}

function CheckRow({ checked, onChange, title, subtitle }) {
  return (
    <label className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-green-2/5 cursor-pointer transition-colors">
      <input type="checkbox" checked={checked} onChange={onChange} className="w-4 h-4 accent-[#00C48D]" />
      <span>
        <span className="block text-sm font-medium text-green-4">{title}</span>
        {subtitle && <span className="block text-xs text-green-4/50">{subtitle}</span>}
      </span>
    </label>
  )
}

// Step 0: Required contract confirmation ────────────────────────────────────
export function ConfirmStep({ state, dispatch }) {
  return (
    <div>
      <label className={labelCls}>Confirmation</label>
      <label className="flex items-start gap-3 mt-3 p-4 border border-green-4/15 rounded-xl cursor-pointer hover:border-green-2 transition-colors">
        <input type="checkbox" checked={!!state.contractConfirmed} onChange={(e) => dispatch({ type: 'SET', field: 'contractConfirmed', value: e.target.checked })} className="mt-0.5 w-4 h-4 accent-[#00C48D]" />
        <span className="text-sm font-medium text-green-4">{CONTRACT_CONFIRM_TEXT}</span>
      </label>
      <p className="text-xs text-green-4/50 mt-2">You must confirm this before continuing.</p>
    </div>
  )
}

// Step 1: Team ────────────────────────────────────────────────────────────
export function TeamStep({ state, dispatch, refData }) {
  return (
    <div>
      <label className={labelCls}>Select Team</label>
      <div className="flex flex-wrap gap-2 mt-2">
        {refData.teams.map((t) => (
          <ChoiceButton key={t.id} active={state.teamId === t.id} onClick={() => { dispatch({ type: 'SET', field: 'teamId', value: t.id }); dispatch({ type: 'SET', field: 'teamName', value: t.name }) }}>{t.name}</ChoiceButton>
        ))}
      </div>
    </div>
  )
}

// Step 2: Client ────────────────────────────────────────────────────────────
export function ClientStep({ state, dispatch, refData }) {
  const clients = refData.clients.filter((c) => !state.teamId || c.teamId === state.teamId)
  return (
    <div>
      <label className={labelCls}>Select Client</label>
      <select
        value={state.clientId}
        onChange={(e) => {
          const c = clients.find((x) => x.clientId === e.target.value)
          dispatch({ type: 'SET', field: 'clientId', value: e.target.value })
          dispatch({ type: 'SET', field: 'clientName', value: c ? c.name : '' })
        }}
        className={`${inputCls} w-full mt-2`}
      >
        <option value="">{clients.length ? 'Select a client…' : 'No clients available'}</option>
        {clients.map((c) => (
          <option key={c.clientId} value={c.clientId}>{c.name}</option>
        ))}
      </select>
    </div>
  )
}

// Group leaf chains by master chain only (sub-master collapsed).
function groupChains(chains) {
  const map = {}
  chains.forEach((c) => {
    map[c.master] = map[c.master] || []
    if (!map[c.master].includes(c.chain)) map[c.master].push(c.chain)
  })
  return Object.entries(map).map(([master, leaves]) => ({ master, leaves }))
}

// Chain selector: MasterChain header (with select-all) → Chain checkboxes.
export function ChainPicker({ chains, selectedChains, dispatch }) {
  const [search, setSearch] = useState('')
  const filtered = search ? chains.filter((c) => `${c.chain} ${c.master}`.toLowerCase().includes(search.toLowerCase())) : chains
  const groups = groupChains(filtered)
  const setMany = (leaves, add) => {
    const values = add ? [...new Set([...selectedChains, ...leaves])] : selectedChains.filter((c) => !leaves.includes(c))
    dispatch({ type: 'SET_ARRAY', field: 'chains', values })
  }
  return (
    <div>
      <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search chains…" className={`${inputCls} w-full mb-2`} />
      <div className="border border-green-4/10 rounded-xl divide-y divide-green-4/5 max-h-64 overflow-y-auto">
      {groups.map((g) => {
        const allSel = g.leaves.every((l) => selectedChains.includes(l))
        return (
          <div key={g.master}>
            <div className="flex items-center justify-between px-3 py-2 bg-cream/60">
              <span className="text-xs font-bold text-green-4 uppercase tracking-wider">{g.master}</span>
              <button type="button" onClick={() => setMany(g.leaves, !allSel)} className="text-[11px] font-bold text-green-3 hover:text-green-4">{allSel ? 'Clear' : 'Select all'}</button>
            </div>
            {g.leaves.map((ch) => (
              <CheckRow key={ch} title={ch} checked={selectedChains.includes(ch)} onChange={() => dispatch({ type: 'TOGGLE_IN_ARRAY', field: 'chains', value: ch })} />
            ))}
          </div>
        )
      })}
      </div>
    </div>
  )
}

// Step: Chains (authorize) ──────────────────────────────────────────────────
export function ChainsStep({ state, dispatch, refData }) {
  return (
    <div>
      <label className={labelCls}>Select Chains</label>
      <p className="text-xs text-green-4/40 mt-1 mb-2">Which chains will the new items be authorized in?</p>
      <ChainPicker chains={refData.chains} selectedChains={state.chains} dispatch={dispatch} />
      <p className="text-xs text-green-4/50 mt-2">{state.chains.length} selected</p>
    </div>
  )
}

// Step: Chains (workflag) — pick chains; all their stores are included ───────
export function StoresStep({ state, dispatch, refData }) {
  const selectedChains = state.chains
  // Live API already returns stores for the selected chains; seed mode filters by chain name.
  const chainStores = apiEnabled() ? refData.stores : refData.stores.filter((s) => selectedChains.includes(s.artsChainName))
  const idsKey = chainStores.map((s) => s.storeId).join(',')

  // Auto-include every store in the selected chains (no individual selection).
  useEffect(() => {
    const ids = chainStores.map((s) => s.storeId)
    if (ids.join(',') !== state.stores.join(',')) dispatch({ type: 'SET_ARRAY', field: 'stores', values: ids })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey])

  return (
    <div>
      <label className={labelCls}>Select Chains</label>
      <p className="text-xs text-green-4/40 mt-1 mb-2">All stores in the selected chains are included automatically.</p>
      <ChainPicker chains={refData.chains} selectedChains={selectedChains} dispatch={dispatch} />
      <p className="text-xs text-green-4/50 mt-2">
        {selectedChains.length === 0
          ? 'Select one or more chains.'
          : `${state.stores.length} store${state.stores.length !== 1 ? 's' : ''} across ${selectedChains.length} chain${selectedChains.length !== 1 ? 's' : ''} included`}
      </p>
    </div>
  )
}

// Step: Items (workflag) — drill down Category → Brand → Item ────────────────
export function ItemsStep({ state, dispatch, refData }) {
  const [search, setSearch] = useState('')
  const [openCat, setOpenCat] = useState({})
  const [openBrand, setOpenBrand] = useState({})

  const items = useMemo(() => {
    if (!search) return refData.items
    const q = search.toLowerCase()
    return refData.items.filter((it) => `${it.description} ${it.brand} ${it.category} ${it.itemUpc}`.toLowerCase().includes(q))
  }, [refData.items, search])

  // Category → Brand → [items]
  const tree = useMemo(() => {
    const map = {}
    items.forEach((it) => {
      const cat = it.category || 'Uncategorized'
      const brand = it.brand || 'Other'
      map[cat] = map[cat] || {}
      map[cat][brand] = map[cat][brand] || []
      map[cat][brand].push(it)
    })
    return map
  }, [items])

  const searching = !!search
  const toggleItem = (upc) => dispatch({ type: 'TOGGLE_IN_ARRAY', field: 'items', value: upc })
  const toggleMany = (upcs, add) => dispatch({ type: 'SET_ARRAY', field: 'items', values: add ? [...new Set([...state.items, ...upcs])] : state.items.filter((u) => !upcs.includes(u)) })

  return (
    <div>
      <label className={labelCls}>Select Items</label>
      <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search items…" className={`${inputCls} w-full my-2`} />
      <div className="border border-green-4/10 rounded-xl divide-y divide-green-4/5 max-h-72 overflow-y-auto">
        {Object.entries(tree).map(([cat, brands]) => {
          const catUpcs = Object.values(brands).flat().map((it) => it.itemUpc)
          const catSel = catUpcs.filter((u) => state.items.includes(u)).length
          const catOpen = searching || openCat[cat]
          return (
            <div key={cat}>
              <button type="button" onClick={() => setOpenCat((o) => ({ ...o, [cat]: !o[cat] }))} className="w-full flex items-center justify-between px-3 py-2 bg-cream/60 text-left">
                <span className="text-xs font-bold text-green-4 uppercase tracking-wider">{cat}</span>
                <span className="text-[11px] text-green-4/50">{catSel ? `${catSel}/` : ''}{catUpcs.length} {catOpen ? '▾' : '▸'}</span>
              </button>
              {catOpen && Object.entries(brands).map(([brand, list]) => {
                const upcs = list.map((it) => it.itemUpc)
                const allSel = upcs.every((u) => state.items.includes(u))
                const bk = `${cat}|${brand}`
                const bOpen = searching || openBrand[bk]
                return (
                  <div key={bk}>
                    <div className="flex items-center justify-between px-3 py-1.5 pl-5">
                      <button type="button" onClick={() => setOpenBrand((o) => ({ ...o, [bk]: !o[bk] }))} className="text-[13px] font-semibold text-green-4 text-left">{brand} <span className="text-green-4/40">({list.length})</span> {bOpen ? '▾' : '▸'}</button>
                      <button type="button" onClick={() => toggleMany(upcs, !allSel)} className="text-[11px] font-bold text-green-3 hover:text-green-4">{allSel ? 'Clear' : 'All'}</button>
                    </div>
                    {bOpen && list.map((it) => (
                      <div key={it.itemUpc} className="pl-5">
                        <CheckRow title={it.description} subtitle={`${it.itemUpc}${it.size ? ` · ${it.size}` : ''}`} checked={state.items.includes(it.itemUpc)} onChange={() => toggleItem(it.itemUpc)} />
                      </div>
                    ))}
                  </div>
                )
              })}
            </div>
          )
        })}
        {Object.keys(tree).length === 0 && <p className="text-sm text-green-4/40 px-3 py-3">No items match.</p>}
      </div>
      <p className="text-xs text-green-4/50 mt-2">{state.items.length} items selected</p>
    </div>
  )
}

// Step: New items (authorize/pricing — manual creation) ─────────────────────
export function NewItemsStep({ state, dispatch, config }) {
  const fields = config?.itemFields || NEW_ITEM_FIELDS
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className={labelCls}>New Items</label>
        <button type="button" onClick={() => dispatch({ type: 'ADD_NEW_ITEM', item: {} })} className="px-3 py-1.5 rounded-lg bg-green-3 hover:bg-green-4 text-white text-xs font-bold">+ Add item</button>
      </div>
      {state.newItems.length === 0 && <p className="text-sm text-green-4/40">No items yet. Click “Add item” to enter a new UPC.</p>}
      <p className="text-xs text-green-4/50 mb-2">Enter UPCs as 12 digits (numbers only).</p>
      <div className="space-y-3">
        {state.newItems.map((item, idx) => (
          <div key={idx} className="border border-green-4/10 rounded-xl p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-green-4/50">Item {idx + 1}</span>
              <button type="button" onClick={() => dispatch({ type: 'REMOVE_NEW_ITEM', index: idx })} className="text-red-400 hover:text-red-600 text-xs font-bold">Remove</button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {fields.map((f) => {
                const isUpc = f.key === 'upc'
                const val = item[f.key] || ''
                const badUpc = isUpc && val.length > 0 && val.length !== 12
                return (
                  <div key={f.key} className={f.key === 'description' ? 'col-span-2' : ''}>
                    <input
                      value={val}
                      inputMode={isUpc ? 'numeric' : undefined}
                      maxLength={isUpc ? 12 : undefined}
                      onChange={(e) => dispatch({ type: 'UPDATE_NEW_ITEM', index: idx, field: f.key, value: isUpc ? e.target.value.replace(/\D/g, '').slice(0, 12) : e.target.value })}
                      placeholder={f.label + (f.required ? ' *' : '')}
                      className={`${inputCls} w-full ${badUpc ? 'border-orange-3' : ''}`}
                    />
                    {badUpc && <div className="text-[10px] text-orange-3 mt-0.5">UPC must be 12 digits ({val.length}/12)</div>}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// Step: Workflag details (reason, frequency, dates, comment) ────────────────
function addWeeks(dateStr, weeks) {
  if (!dateStr) return ''
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + weeks * 7)
  return toLocalYMD(d) // local fields, not toISOString() (UTC) — avoids day shift
}

export function WorkflagDetailsStep({ state, dispatch }) {
  return (
    <div className="space-y-4">
      <div>
        <label className={labelCls}>Date Range</label>
        <div className="flex flex-wrap items-center gap-2 mt-2">
          <input type="date" value={state.startDate} onChange={(e) => dispatch({ type: 'SET', field: 'startDate', value: e.target.value })} className={inputCls} />
          <span className="text-green-4/40">to</span>
          <input type="date" value={state.endDate} onChange={(e) => dispatch({ type: 'SET', field: 'endDate', value: e.target.value })} className={inputCls} />
        </div>
        <div className="flex flex-wrap gap-2 mt-2">
          {DATE_PRESETS.map((w) => (
            <button key={w} type="button" onClick={() => state.startDate && dispatch({ type: 'SET', field: 'endDate', value: addWeeks(state.startDate, w) })} className="px-2.5 py-1 rounded-lg border border-green-4/15 text-green-4/70 text-xs font-bold hover:border-green-2">{w}wk</button>
          ))}
        </div>
      </div>
    </div>
  )
}

// Step: Authorize details ───────────────────────────────────────────────────
const AUTH_TYPES = [
  { id: 'new', label: 'New authorization' },
  { id: 'reauthorize', label: 'Reauthorize' },
  { id: 'delete', label: 'Delete' },
]

export function AuthorizeDetailsStep({ state, dispatch }) {
  return (
    <div className="space-y-4">
      <div>
        <label className={labelCls}>Authorization Type</label>
        <div className="flex flex-wrap gap-2 mt-2">
          {AUTH_TYPES.map((a) => (
            <ChoiceButton key={a.id} active={state.payload.authType === a.id} onClick={() => dispatch({ type: 'SET_PAYLOAD', field: 'authType', value: a.id })}>{a.label}</ChoiceButton>
          ))}
        </div>
      </div>
      <div>
        <label className={labelCls}>Effective Date</label>
        <div className="mt-1">
          <input type="date" value={state.payload.effectiveDate || ''} onChange={(e) => dispatch({ type: 'SET_PAYLOAD', field: 'effectiveDate', value: e.target.value })} className={inputCls} />
        </div>
      </div>
      <div>
        <label className={labelCls}>Comment</label>
        <textarea value={state.comment} onChange={(e) => dispatch({ type: 'SET', field: 'comment', value: e.target.value })} rows={2} className={`${inputCls} w-full mt-1`} placeholder="Optional notes" />
      </div>
    </div>
  )
}

// Step: Review ──────────────────────────────────────────────────────────────
export function ReviewStep({ state, config }) {
  const summary = useMemo(() => config.summarize(state), [state, config])
  return (
    <div>
      <label className={labelCls}>Review &amp; Submit</label>
      <div className="mt-2 border border-green-4/10 rounded-xl divide-y divide-green-4/5">
        {summary.map((row) => (
          <div key={row.label} className="flex items-start justify-between gap-4 px-3 py-2">
            <span className="text-xs font-semibold text-green-4/50 uppercase tracking-wider">{row.label}</span>
            <span className="text-sm text-green-4 text-right">{row.value}</span>
          </div>
        ))}
      </div>
      <p className="text-xs text-green-4/40 mt-3">On submit, this routes to the owning RCSM for approval.</p>
    </div>
  )
}

export { addWeeks, formatDateRange }
