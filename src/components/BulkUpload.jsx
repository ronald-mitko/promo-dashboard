import { useState, useRef } from 'react'
import { BULK_SPECS, downloadTemplate } from '../lib/bulkTemplates'
import { parseBulk } from '../lib/bulkParse'

// Download-template + upload-filled-template control. Parses the workbook, shows
// a preview + any errors, and on confirm calls onImport(records) (created as drafts).
export default function BulkUpload({ type, onImport }) {
  const spec = BULK_SPECS[type]
  const [open, setOpen] = useState(false)
  const [parsed, setParsed] = useState(null) // { records, errors, fileName }
  const [busy, setBusy] = useState(false)
  const fileRef = useRef(null)

  if (!spec) return null

  const onFile = async (e) => {
    const file = e.target.files && e.target.files[0]
    if (!file) return
    setBusy(true)
    try {
      const buf = await file.arrayBuffer()
      const { records, errors } = parseBulk(type, buf)
      setParsed({ records, errors, fileName: file.name })
    } catch (err) {
      setParsed({ records: [], errors: [(err && err.message) || 'Could not read the file.'], fileName: file.name })
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

            <div className="flex flex-wrap items-center gap-2 mb-4">
              <button onClick={() => downloadTemplate(type)} className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-green-3 hover:bg-green-4 text-white font-bold text-sm transition-colors">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                Download template
              </button>
              <label className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-green-4/15 text-green-4/70 hover:border-green-2 font-bold text-sm cursor-pointer transition-colors">
                {busy ? 'Reading…' : 'Upload filled template'}
                <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" onChange={onFile} disabled={busy} className="hidden" />
              </label>
            </div>

            {parsed && (
              <div className="border-t border-green-4/10 pt-3">
                <div className="text-sm font-bold text-green-4">{parsed.fileName}</div>
                <div className="text-sm text-green-4/70 mt-1">{parsed.records.length} draft{parsed.records.length !== 1 ? 's' : ''} ready{parsed.errors.length ? ` · ${parsed.errors.length} row issue${parsed.errors.length !== 1 ? 's' : ''}` : ''}</div>
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
