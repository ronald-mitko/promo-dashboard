import { useMemo, useState } from 'react'
import { REASON_CODES, FREQUENCIES, DATE_PRESETS, NEW_ITEM_FIELDS } from '../../lib/constants'
import { formatDateRange } from '../../lib/helpers'
import { apiEnabled } from '../../lib/api'

// Shared little UI helpers ───────────────────────────────────────────────
const labelCls = 'text-xs font-semibold text-green-4/60 uppercase tracking-wider'
const inputCls = 'bg-white border border-green-4/15 rounded-lg px-3 py-2 text-sm text-green-4 font-medium focus:outline-none focus:ring-2 focus:ring-green-2/40 focus:border-green-2 transition-all'

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
      <div className="flex flex-wrap gap-2 mt-2">
        {clients.map((c) => (
          <ChoiceButton key={c.clientId} active={state.clientId === c.clientId} onClick={() => { dispatch({ type: 'SET', field: 'clientId', value: c.clientId }); dispatch({ type: 'SET', field: 'clientName', value: c.name }) }}>{c.name}</ChoiceButton>
        ))}
      </div>
      {clients.length === 0 && <p className="text-sm text-green-4/40 mt-3">No clients for this team.</p>}
    </div>
  )
}

// Group leaf chains by master > sub-master (mirrors DB ARTS chain levels).
function groupChains(chains) {
  const map = {}
  chains.forEach((c) => {
    map[c.master] = map[c.master] || {}
    map[c.master][c.subMaster] = map[c.master][c.subMaster] || []
    if (!map[c.master][c.subMaster].includes(c.chain)) map[c.master][c.subMaster].push(c.chain)
  })
  return Object.entries(map).map(([master, subs]) => ({ master, subs: Object.entries(subs).map(([sub, leaves]) => ({ sub, leaves })) }))
}

// Hierarchical chain selector: master headers (with select-all), sub-master
// sub-headers, and leaf-chain checkboxes. Selection is at the leaf-chain level.
export function ChainPicker({ chains, selectedChains, dispatch }) {
  const groups = groupChains(chains)
  const setMany = (leaves, add) => {
    const values = add ? [...new Set([...selectedChains, ...leaves])] : selectedChains.filter((c) => !leaves.includes(c))
    dispatch({ type: 'SET_ARRAY', field: 'chains', values })
  }
  return (
    <div className="border border-green-4/10 rounded-xl divide-y divide-green-4/5 max-h-64 overflow-y-auto">
      {groups.map((g) => {
        const masterLeaves = g.subs.flatMap((s) => s.leaves)
        const allSel = masterLeaves.every((l) => selectedChains.includes(l))
        return (
          <div key={g.master}>
            <div className="flex items-center justify-between px-3 py-2 bg-cream/60">
              <span className="text-xs font-bold text-green-4 uppercase tracking-wider">{g.master}</span>
              <button type="button" onClick={() => setMany(masterLeaves, !allSel)} className="text-[11px] font-bold text-green-3 hover:text-green-4">{allSel ? 'Clear' : 'Select all'}</button>
            </div>
            {g.subs.map((s) => (
              <div key={s.sub}>
                {s.sub !== s.leaves[0] && <div className="px-3 pt-1.5 text-[11px] font-semibold text-green-4/40 uppercase tracking-wider">{s.sub}</div>}
                {s.leaves.map((ch) => (
                  <CheckRow key={ch} title={ch} checked={selectedChains.includes(ch)} onChange={() => dispatch({ type: 'TOGGLE_IN_ARRAY', field: 'chains', value: ch })} />
                ))}
              </div>
            ))}
          </div>
        )
      })}
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

// Step: Stores (workflag) — chain-first, mirrors the WF submission app ───────
export function StoresStep({ state, dispatch, refData }) {
  const [paste, setPaste] = useState('')
  const [search, setSearch] = useState('')
  const selectedChains = state.chains
  // Live API already returns stores for the selected chains; seed mode filters by chain name.
  const chainStores = apiEnabled() ? refData.stores : refData.stores.filter((s) => selectedChains.includes(s.artsChainName))
  const visibleStores = chainStores.filter((s) => `${s.storeId} ${s.name} ${s.city} ${s.state}`.toLowerCase().includes(search.toLowerCase()))

  const applyPaste = () => {
    const ids = paste.split(/[\s,\n\t]+/).map((s) => s.trim()).filter(Boolean)
    const valid = chainStores.filter((s) => ids.includes(s.storeId)).map((s) => s.storeId)
    dispatch({ type: 'SET_ARRAY', field: 'stores', values: [...new Set([...state.stores, ...valid])] })
    setPaste('')
  }
  const allVisibleSelected = visibleStores.length > 0 && visibleStores.every((s) => state.stores.includes(s.storeId))
  const toggleAll = () => {
    const ids = visibleStores.map((s) => s.storeId)
    dispatch({ type: 'SET_ARRAY', field: 'stores', values: allVisibleSelected ? state.stores.filter((id) => !ids.includes(id)) : [...new Set([...state.stores, ...ids])] })
  }

  return (
    <div>
      {/* Step 1: chains (master > sub-master > chain) */}
      <label className={labelCls}>1. Browse by Chain</label>
      <p className="text-xs text-green-4/40 mt-1 mb-2">Select chains, then load their stores.</p>
      <ChainPicker chains={refData.chains} selectedChains={selectedChains} dispatch={dispatch} />

      {/* Step 2: stores within selected chains */}
      {selectedChains.length === 0 ? (
        <p className="text-sm text-green-4/40 mt-4">Select one or more chains above to load stores.</p>
      ) : (
        <div className="mt-4">
          <div className="flex items-center justify-between mb-1">
            <label className={labelCls}>2. Select Stores</label>
            <button type="button" onClick={toggleAll} className="text-xs font-bold text-green-3 hover:text-green-4">{allVisibleSelected ? 'Clear all' : 'Select all'}</button>
          </div>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search stores…" className={`${inputCls} w-full mb-2`} />
          <div className="border border-green-4/10 rounded-xl divide-y divide-green-4/5 max-h-56 overflow-y-auto">
            {visibleStores.map((s) => (
              <CheckRow key={s.storeId} title={`${s.storeId} — ${s.name}`} subtitle={`${s.city}, ${s.state} · ${s.artsChainName}`} checked={state.stores.includes(s.storeId)} onChange={() => dispatch({ type: 'TOGGLE_IN_ARRAY', field: 'stores', value: s.storeId })} />
            ))}
            {visibleStores.length === 0 && <p className="text-sm text-green-4/40 px-3 py-3">No stores match.</p>}
          </div>
          <div className="mt-3">
            <label className={labelCls}>Or quick paste store IDs</label>
            <div className="flex gap-2 mt-1">
              <input value={paste} onChange={(e) => setPaste(e.target.value)} placeholder="1023, 1044, 2210" className={`${inputCls} flex-1`} />
              <button type="button" onClick={applyPaste} className="px-3 py-2 rounded-lg bg-green-3 hover:bg-green-4 text-white text-sm font-bold">Add</button>
            </div>
          </div>
        </div>
      )}
      <p className="text-xs text-green-4/50 mt-2">{state.stores.length} stores selected across {selectedChains.length} chain{selectedChains.length !== 1 ? 's' : ''}</p>
    </div>
  )
}

// Step: Items (workflag — existing items) ───────────────────────────────────
export function ItemsStep({ state, dispatch, refData }) {
  const [paste, setPaste] = useState('')
  const applyPaste = () => {
    const ups = paste.split(/[\s,\n\t]+/).map((s) => s.trim().padStart(12, '0')).filter(Boolean)
    const valid = refData.items.filter((it) => ups.includes(it.itemUpc)).map((it) => it.itemUpc)
    dispatch({ type: 'SET_ARRAY', field: 'items', values: [...new Set([...state.items, ...valid])] })
    setPaste('')
  }
  return (
    <div>
      <label className={labelCls}>Select Items</label>
      <div className="border border-green-4/10 rounded-xl divide-y divide-green-4/5 max-h-60 overflow-y-auto mt-2">
        {refData.items.map((it) => (
          <CheckRow key={it.itemUpc} title={it.description} subtitle={`${it.itemUpc} · ${it.brand} · ${it.category}`} checked={state.items.includes(it.itemUpc)} onChange={() => dispatch({ type: 'TOGGLE_IN_ARRAY', field: 'items', value: it.itemUpc })} />
        ))}
      </div>
      <div className="mt-3">
        <label className={labelCls}>Quick paste UPCs</label>
        <div className="flex gap-2 mt-1">
          <input value={paste} onChange={(e) => setPaste(e.target.value)} placeholder="040000000017, 037600000013" className={`${inputCls} flex-1`} />
          <button type="button" onClick={applyPaste} className="px-3 py-2 rounded-lg bg-green-3 hover:bg-green-4 text-white text-sm font-bold">Add</button>
        </div>
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
      <div className="space-y-3">
        {state.newItems.map((item, idx) => (
          <div key={idx} className="border border-green-4/10 rounded-xl p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-green-4/50">Item {idx + 1}</span>
              <button type="button" onClick={() => dispatch({ type: 'REMOVE_NEW_ITEM', index: idx })} className="text-red-400 hover:text-red-600 text-xs font-bold">Remove</button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {fields.map((f) => (
                <input
                  key={f.key}
                  value={item[f.key] || ''}
                  onChange={(e) => dispatch({ type: 'UPDATE_NEW_ITEM', index: idx, field: f.key, value: e.target.value })}
                  placeholder={f.label + (f.required ? ' *' : '')}
                  className={`${inputCls} ${f.key === 'description' ? 'col-span-2' : ''}`}
                />
              ))}
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
  return d.toISOString().slice(0, 10)
}

export function WorkflagDetailsStep({ state, dispatch }) {
  return (
    <div className="space-y-4">
      <div>
        <label className={labelCls}>Reason Code</label>
        <div className="flex flex-wrap gap-2 mt-2">
          {REASON_CODES.map((rc) => (
            <ChoiceButton key={rc} active={state.reasonCode === rc} onClick={() => dispatch({ type: 'SET', field: 'reasonCode', value: rc })}>{rc}</ChoiceButton>
          ))}
        </div>
      </div>
      <div>
        <label className={labelCls}>Frequency</label>
        <div className="flex flex-wrap gap-2 mt-2">
          {FREQUENCIES.map((f) => (
            <ChoiceButton key={f.id} active={state.frequency === f.id} onClick={() => dispatch({ type: 'SET', field: 'frequency', value: f.id })}>{f.label}</ChoiceButton>
          ))}
        </div>
      </div>
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
      <div>
        <label className={labelCls}>Comment</label>
        <textarea value={state.comment} onChange={(e) => dispatch({ type: 'SET', field: 'comment', value: e.target.value })} rows={2} className={`${inputCls} w-full mt-1`} placeholder="Optional notes" />
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
