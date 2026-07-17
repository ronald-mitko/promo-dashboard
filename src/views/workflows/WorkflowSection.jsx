import { useState } from 'react'
import { REQUEST_CONFIG } from '../../lib/requestConfig'
import Wizard from '../../components/wizard/Wizard'
import RequestList from '../../components/workflows/RequestList'
import BulkUpload from '../../components/BulkUpload'

// Generic HQ workflow section: "New request" → Wizard + a list of past requests.
export default function WorkflowSection({ type, requests, refData, onAddRequest, onBulkImport, onSubmitRequest }) {
  const config = REQUEST_CONFIG[type]
  const [building, setBuilding] = useState(false)
  const [cloneState, setCloneState] = useState(null)

  const mine = requests.filter((r) => r.type === type)

  const startNew = () => { setCloneState(null); setBuilding(true) }
  const startClone = (req) => {
    // Re-hydrate wizard from a past request (jump fields back into wizard state).
    const p = req.payload || {}
    setCloneState({
      teamName: req.teamName, clientName: req.clientName,
      chains: req.chains || [], stores: req.stores || [], items: req.items || [],
      newItems: req.newItems || [],
      existingItems: req.type === 'authorize_existing'
        ? (req.newItems || []).map((n) => ({ itemUpc: n.upc, description: n.description, brand: n.brand, category: n.category, size: n.size, pack: n.pack }))
        : [],
      reasonCode: p.reasonCode || '', frequency: p.frequency || 'once',
      startDate: p.startDate || '', endDate: p.endDate || '',
      comment: req.comment || '', payload: p,
    })
    setBuilding(true)
  }

  const handleSubmit = (record) => {
    onAddRequest(record)
    setBuilding(false)
    setCloneState(null)
  }

  return (
    <div className="animate-fade-in-up">
      {building ? (
        <Wizard config={config} refData={refData} initialClone={cloneState} onSubmit={handleSubmit} onCancel={() => setBuilding(false)} />
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <p className="text-sm text-green-4/50">{mine.length} request{mine.length !== 1 ? 's' : ''}</p>
            <div className="flex items-center gap-2">
              {onBulkImport && <BulkUpload type={type} onImport={onBulkImport} refData={refData} />}
              <button onClick={startNew} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-green-2 hover:bg-green-3 text-white font-bold text-sm transition-colors shadow-sm">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                New request
              </button>
            </div>
          </div>
          <RequestList requests={mine} onClone={startClone} onAddRequest={onAddRequest} onSubmitRequest={onSubmitRequest} />
        </>
      )}
    </div>
  )
}
