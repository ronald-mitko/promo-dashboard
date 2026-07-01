import { useState } from 'react'
import { REQUEST_TYPES } from '../lib/constants'
import { FIELD, LABEL } from '../lib/ui'

const SUPPORT_TYPES = ['merchandising', 'reset', 'audit', 'training', 'other']
const PRIORITIES = ['low', 'medium', 'high']
const REPORT_TYPES = ['compliance', 'sales-lift', 'execution-photos', 'custom']
const FORMATS = ['pdf', 'csv', 'dashboard']

const inputCls = `${FIELD} w-full`
const labelCls = LABEL

// Inline buttons that open a compact request modal. `linkedPromo` ties the
// request to a priority (and supplies routing chain/retailer).
export default function RequestButtons({ onAddRequest, linkedPromo, types = ['support', 'reporting'], size = 'sm' }) {
  const [open, setOpen] = useState(null) // 'support' | 'reporting' | null
  const [form, setForm] = useState({})

  const start = (type) => {
    setForm(type === 'support'
      ? { supportType: 'merchandising', priority: 'medium', neededBy: '', comment: '' }
      : { comment: '' })
    setOpen(type)
  }

  const submit = () => {
    const base = {
      type: open === 'support' ? REQUEST_TYPES.SUPPORT : REQUEST_TYPES.REPORTING,
      clientName: linkedPromo?.brand || null,
      chain: linkedPromo?.chain || null,
      retailer: linkedPromo?.retailer || null,
      linked_promo_id: linkedPromo?.promo_id || null,
      itemCount: linkedPromo ? 1 : 0,
      comment: form.comment || '',
      payload: { ...form },
      label: linkedPromo?.product || null,
    }
    onAddRequest(base)
    setOpen(null)
  }

  const btnBase = size === 'xs' ? 'px-2.5 py-1 text-[11px]' : 'px-3 py-1.5 text-xs'

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {types.includes('support') && (
          <button onClick={() => start('support')} className={`${btnBase} rounded-lg border border-orange-3/40 text-orange-3 hover:bg-orange-3/10 font-bold transition-colors`}>Request support</button>
        )}
        {types.includes('reporting') && (
          <button onClick={() => start('reporting')} className={`${btnBase} rounded-lg border border-green-3/40 text-green-3 hover:bg-green-2/10 font-bold transition-colors`}>Request reporting</button>
        )}
      </div>

      {open && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setOpen(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-5 animate-fade-in-up" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-bold text-green-4 mb-1">{open === 'support' ? 'Request Retail Support' : 'Request Reporting'}</h3>
            {linkedPromo && <p className="text-xs text-green-4/50 mb-3">For: {linkedPromo.product}</p>}

            <div className="space-y-3">
              {open === 'support' ? (
                <>
                  <div>
                    <label className={labelCls}>Support type</label>
                    <select value={form.supportType} onChange={(e) => setForm({ ...form, supportType: e.target.value })} className={inputCls}>
                      {SUPPORT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Priority</label>
                    <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className={inputCls}>
                      {PRIORITIES.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Needed by</label>
                    <input type="date" value={form.neededBy} onChange={(e) => setForm({ ...form, neededBy: e.target.value })} className={inputCls} />
                  </div>
                </>
              ) : null}
              <div>
                <label className={labelCls}>Comment</label>
                <textarea rows={2} value={form.comment} onChange={(e) => setForm({ ...form, comment: e.target.value })} className={inputCls} placeholder="Optional notes" />
              </div>
            </div>

            <div className="flex gap-2 mt-5">
              <button onClick={() => setOpen(null)} className="flex-1 py-2 rounded-lg border border-green-4/15 text-green-4/70 font-bold text-sm hover:bg-cream">Cancel</button>
              <button onClick={submit} className="flex-1 py-2 rounded-lg bg-green-2 hover:bg-green-3 text-white font-bold text-sm">Submit to RCSM</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
