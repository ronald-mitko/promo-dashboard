import { useState } from 'react'

// Approve / Reject controls shown to the RCSM for a submitted item.
export default function ApprovalControls({ status, onApprove, onReject, exportLabel, onExport }) {
  const [rejecting, setRejecting] = useState(false)
  const [note, setNote] = useState('')

  if (status === 'submitted') {
    if (rejecting) {
      return (
        <div className="flex flex-col gap-2 items-stretch">
          <input
            autoFocus
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Reason (optional)"
            className="bg-white border border-green-4/15 rounded-lg px-2.5 py-1.5 text-xs text-green-4 focus:outline-none focus:ring-2 focus:ring-green-2/40"
          />
          <div className="flex gap-2">
            <button onClick={() => { onReject(note); setRejecting(false); setNote('') }} className="flex-1 px-3 py-1.5 rounded-lg bg-red-500 hover:bg-red-600 text-white text-xs font-bold transition-colors">Confirm reject</button>
            <button onClick={() => { setRejecting(false); setNote('') }} className="px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-green-4/60 text-xs font-bold transition-colors">Cancel</button>
          </div>
        </div>
      )
    }
    return (
      <div className="flex gap-2">
        <button onClick={onApprove} className="px-3 py-1.5 rounded-lg bg-green-2 hover:bg-green-3 text-white text-xs font-bold transition-colors">Approve</button>
        <button onClick={() => setRejecting(true)} className="px-3 py-1.5 rounded-lg border border-red-300 text-red-500 hover:bg-red-50 text-xs font-bold transition-colors">Reject</button>
      </div>
    )
  }

  if (status === 'approved' && onExport) {
    return (
      <button onClick={onExport} className="px-3 py-1.5 rounded-lg border border-green-3/40 text-green-3 hover:bg-green-2/10 text-xs font-bold transition-colors">
        {exportLabel || 'Export'}
      </button>
    )
  }

  return null
}
