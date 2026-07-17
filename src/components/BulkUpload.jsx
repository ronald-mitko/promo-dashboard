import { useState, useRef, useEffect } from 'react'
import { BULK_SPECS, downloadTemplate, downloadWorkflagTemplate } from '../lib/bulkTemplates'
import { parseBulk } from '../lib/bulkParse'
import { expandWorkflagStores } from '../lib/bulkExpand'
import { apiEnabled, reference } from '../lib/api'
import { SEED_TEAMS } from '../lib/seed'
import { FIELD } from '../lib/ui'

// Download-template + upload-filled-template control. Parses the workbook, shows
// a preview + any issues, and on confirm calls onImport(records) (created as drafts).
// Chain-based templates (Home Location Check) require Team + Client at download so
// the chain dropdown is exact, and split chains → stores on upload.
export default function BulkUpload({ type, onImport, refData }) {
  const spec = BULK_SPECS[type]
  const needsChains = !!(spec && spec.needsChains)
  const [open, setOpen] = useState(false)
  const [parsed, setParsed] = useState(null) // { records, errors, fileName }
  const [busy, setBusy] = useState(false)
  const [dlBusy, setDlBusy] = useState(false)
  const [err, setErr] = useState('')
  const fileRef = useRef(null)

  const [teams, setTeams] = useState([])
  const [clients, setClients] = useState([])
  const [teamId, setTeamId] = useState('')
  const [clientId, setClientId] = useState('')

  useEffect(() => {
    if (!open || !needsChains) return
    let alive = true
    if (apiEnabled()) reference.teams().then((t) => { if (alive) setTeams(t) }).catch(() => {})
    else setTeams(SEED_TEAMS)
    return () => { alive = false }
  }, [open, needsChains])

  useEffect(() => {
    if (!needsChains || !teamId) { setClients([]); return }
    let alive = true
    if (apiEnabled()) reference.clients(teamId).then((c) => { if (alive) setClients(c) }).catch(() => setClients([]))
    else setClients((refData?.clients || []).filter((c) => c.teamId === teamId))
    return () => { alive = false }
  }, [needsChains, teamId, refData])

  if (!spec) return null

  const teamName = (teams.find((t) => t.id === teamId) || {}).name || ''
  const clientName = (clients.find((c) => c.clientId === clientId) || {}).name || ''

  const doDownload = async () => {
    if (!needsChains) { downloadTemplate(type); return }
    if (!teamId || !clientId) { setErr('Pick a Team and Client first.'); return }
    setErr('')
    setDlBusy(true)
    try {
      let chains = []
      if (apiEnabled()) {
        const rows = await reference.chains(teamId, clientId)
        chains = [...new Set((rows || []).map((c) => c.chain).filter(Boolean))].sort()
      } else {
        chains = [...new Set((refData?.stores || []).map((s) => s.artsChainName).filter(Boolean))].sort()
      }
      await downloadWorkflagTemplate({ teamName, clientName, chains })
    } catch (e) {
      setErr((e && e.message) || 'Could not build the template.')
    } finally {
      setDlBusy(false)
    }
  }

  const onFile = async (e) => {
    const file = e.target.files && e.target.files[0]
    if (!file) return
    setBusy(true)
    setErr('')
    try {
      const buf = await file.arrayBuffer()
      const res = parseBulk(type, buf)
      let records = res.records
      const errors = res.errors
      if (type === 'workflag' && records.length) records = await expandWorkflagStores(records, refData)
      setParsed({ records, errors, fileName: file.name })
    } catch (e2) {
      setParsed({ records: [], errors: [(e2 && e2.message) || 'Could not read the file.'], fileName: file.name })
    } finally {
      setBusy(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const confirm = () => {
    if (parsed && parsed.records.length) onImport(parsed.records)
    setParsed(null)
    setOpen(false)
  }

  const zeroStore = type === 'workflag' && parsed ? parsed.records.filter((r) => !r.storeCount).length : 0

  return (
    <div className="inline-block">
      <button onClick={() => setOpen((v) => !v)} className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-green-4/15 text-green-4/70 hover:border-green-2 font-bold text-sm transition-colors">
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
        Bulk upload
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] flex items-center justify-center p-4" onClick={() => { setOpen(false); setParsed(null) }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto p-5 animate-fade-in-up" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-base font-bold text-green-4">Bulk upload — {spec.label}</h3>
              <button onClick={() => { setOpen(false); setParsed(null) }} className="text-green-4/40 hover:text-green-4 text-sm font-bold">Close</button>
            </div>
            <p className="text-sm text-green-4/60 mb-3">Download the template, fill it in Excel, then upload it. Entries are created as drafts for you to review and submit.</p>

            {needsChains && (
              <div className="grid grid-cols-2 gap-2 mb-3">
                <div>
                  <label className="text-xs font-semibold text-green-4/60 uppercase tracking-wider">Team</label>
                  <select value={teamId} onChange={(e) => { setTeamId(e.target.value); setClientId('') }} className={`${FIELD} w-full mt-1`}>
                    <option value="">Select team…</option>
                    {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-green-4/60 uppercase tracking-wider">Client</label>
                  <select value={clientId} disabled={!teamId} onChange={(e) => setClientId(e.target.value)} className={`${FIELD} w-full mt-1 disabled:opacity-50`}>
                    <option value="">{teamId ? 'Select client…' : 'Pick a team first'}</option>
                    {clients.map((c) => <option key={c.clientId} value={c.clientId}>{c.name}</option>)}
                  </select>
                </div>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2 mb-4">
              <button onClick={doDownload} disabled={dlBusy || (needsChains && (!teamId || !clientId))} className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-green-3 hover:bg-green-4 disabled:opacity-50 text-white font-bold text-sm transition-colors">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                {dlBusy ? 'Building…' : 'Download template'}
              </button>
              <label className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-green-4/15 text-green-4/70 hover:border-green-2 font-bold text-sm cursor-pointer transition-colors">
                {busy ? 'Reading…' : 'Upload filled template'}
                <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" onChange={onFile} disabled={busy} className="hidden" />
              </label>
            </div>
            {needsChains && <p className="text-[11px] text-green-4/50 -mt-2 mb-3">Pick Team + Client — the template's Chains column becomes a dropdown of that client's chains, split into stores on upload.</p>}

            {err && <div className="mb-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">{err}</div>}

            {parsed && (
              <div className="border-t border-green-4/10 pt-3">
                <div className="text-sm font-bold text-green-4">{parsed.fileName}</div>
                <div className="text-sm text-green-4/70 mt-1">{parsed.records.length} draft{parsed.records.length !== 1 ? 's' : ''} ready{parsed.errors.length ? ` · ${parsed.errors.length} row issue${parsed.errors.length !== 1 ? 's' : ''}` : ''}</div>
                {zeroStore > 0 && <div className="mt-2 bg-orange-3/10 border border-orange-3/30 rounded-lg px-2 py-1.5 text-xs text-orange-3">{zeroStore} check{zeroStore !== 1 ? 's' : ''} matched no stores — verify the chain names against the client.</div>}
                {parsed.errors.length > 0 && (
                  <div className="mt-2 bg-orange-3/10 border border-orange-3/30 rounded-lg p-2 max-h-32 overflow-y-auto">
                    {parsed.errors.slice(0, 30).map((e, i) => <div key={i} className="text-xs text-orange-3">{e}</div>)}
                    {parsed.errors.length > 30 && <div className="text-xs text-orange-3/70">…and {parsed.errors.length - 30} more</div>}
                  </div>
                )}
                <button
                  onClick={confirm}
                  disabled={parsed.records.length === 0}
                  className={`w-full mt-3 py-2 rounded-lg text-white font-bold text-sm transition-colors ${parsed.records.length ? 'bg-green-2 hover:bg-green-3' : 'bg-green-2/40 cursor-not-allowed'}`}
                >
                  {parsed.records.length ? `Add ${parsed.records.length} draft${parsed.records.length !== 1 ? 's' : ''}` : 'Nothing to add'}
                </button>
                {parsed.errors.length > 0 && parsed.records.length > 0 && <p className="text-[11px] text-green-4/50 mt-1">Rows with issues are skipped; valid rows are still added.</p>}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
