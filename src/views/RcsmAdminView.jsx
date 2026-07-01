import { useState } from 'react'
import { SEED_TEAMS } from '../lib/seed'
import { REQUEST_TYPES } from '../lib/constants'
import { useReferenceData } from '../hooks/useReferenceData'
import { FIELD, LABEL } from '../lib/ui'

// Manage RCSMs and which clients each one owns. Ownership drives routing
// (a submission's client → the RCSM whose accounts include that client).
export default function RcsmAdminView({ rcsms, setRcsms, seedRefData }) {
  const [teamId, setTeamId] = useState(SEED_TEAMS[0]?.id || '')
  const ref = useReferenceData({ teamId, clientId: '', chains: [] }, seedRefData, REQUEST_TYPES.AUTHORIZE)
  const clientNames = [...new Set((ref.clients || []).filter((c) => !teamId || c.teamId === teamId).map((c) => c.name))].filter(Boolean).sort()

  const ownerOf = (client) => (rcsms.find((r) => (r.accounts || []).includes(client)) || {}).rcsmId || ''
  const assign = (client, rcsmId) => {
    setRcsms((prev) => prev.map((r) => ({
      ...r,
      accounts: r.rcsmId === rcsmId
        ? [...new Set([...(r.accounts || []), client])]
        : (r.accounts || []).filter((a) => a !== client),
    })))
  }
  const rename = (rcsmId, name) => setRcsms((prev) => prev.map((r) => (r.rcsmId === rcsmId ? { ...r, name } : r)))
  const removeAccount = (rcsmId, account) => setRcsms((prev) => prev.map((r) => (r.rcsmId === rcsmId ? { ...r, accounts: (r.accounts || []).filter((a) => a !== account) } : r)))
  const addRcsm = () => setRcsms((prev) => [...prev, { rcsmId: `rcsm_${Math.random().toString(36).slice(2, 8)}`, name: 'New RCSM', accounts: [] }])

  const input = FIELD
  const label = LABEL

  return (
    <div className="animate-fade-in-up space-y-6">
      {/* RCSMs */}
      <section className="bg-white rounded-2xl shadow-sm border border-green-4/8 p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-green-3 uppercase tracking-wider">Retail Client Services Managers</h3>
          <button onClick={addRcsm} className="px-3 py-1.5 rounded-lg bg-green-2 hover:bg-green-3 text-white text-xs font-bold transition-colors">+ Add RCSM</button>
        </div>
        <div className="space-y-3">
          {rcsms.map((r) => (
            <div key={r.rcsmId} className="border border-green-4/10 rounded-xl p-3">
              <div className="flex items-center gap-2 mb-2">
                <input value={r.name} onChange={(e) => rename(r.rcsmId, e.target.value)} className={`${input} flex-1`} />
                <button onClick={() => setRcsms((prev) => prev.filter((x) => x.rcsmId !== r.rcsmId))} className="text-red-400 hover:text-red-600 text-xs font-bold px-2">Remove</button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {(r.accounts || []).length === 0 && <span className="text-xs text-green-4/40">No clients assigned</span>}
                {(r.accounts || []).map((a) => (
                  <span key={a} className="inline-flex items-center gap-1 text-xs font-semibold bg-green-2/15 text-green-3 rounded-full px-2.5 py-0.5">
                    {a}
                    <button onClick={() => removeAccount(r.rcsmId, a)} className="text-green-3/60 hover:text-red-500">×</button>
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Assign clients by team */}
      <section className="bg-white rounded-2xl shadow-sm border border-green-4/8 p-4">
        <h3 className="text-sm font-bold text-green-3 uppercase tracking-wider mb-1">Assign Clients</h3>
        <p className="text-xs text-green-4/50 mb-3">Pick a team, then set the owning RCSM for each client. Submissions route to that RCSM.</p>
        <div className="flex flex-col gap-1 mb-3 max-w-xs">
          <label className={label}>Team</label>
          <select value={teamId} onChange={(e) => setTeamId(e.target.value)} className={input}>
            {SEED_TEAMS.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
        <div className="border border-green-4/10 rounded-xl divide-y divide-green-4/5 max-h-96 overflow-y-auto">
          {clientNames.length === 0 && <p className="text-sm text-green-4/40 px-3 py-3">No clients for this team (or API not configured).</p>}
          {clientNames.map((c) => (
            <div key={c} className="flex items-center justify-between gap-3 px-3 py-2">
              <span className="text-sm font-medium text-green-4">{c}</span>
              <select value={ownerOf(c)} onChange={(e) => assign(c, e.target.value)} className={`${input} max-w-[200px]`}>
                <option value="">Unassigned</option>
                {rcsms.map((r) => <option key={r.rcsmId} value={r.rcsmId}>{r.name}</option>)}
              </select>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
