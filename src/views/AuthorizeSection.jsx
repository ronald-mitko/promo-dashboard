import { useState } from 'react'
import { REQUEST_TYPES } from '../lib/constants'
import WorkflowSection from './workflows/WorkflowSection'

// Authorize hub: choose "new item build" or "authorize an existing item".
export default function AuthorizeSection({ requests, refData, onAddRequest, onBulkImport, onSubmitRequest, initialMode }) {
  const [mode, setMode] = useState(initialMode === 'existing' ? 'existing' : 'new')
  const type = mode === 'existing' ? REQUEST_TYPES.AUTHORIZE_EXISTING : REQUEST_TYPES.AUTHORIZE

  const modes = [
    { id: 'new', label: 'New item build', desc: 'Enter brand-new UPCs to authorize' },
    { id: 'existing', label: 'Authorize existing item', desc: 'Pick an existing item and assign it to a new account' },
  ]

  return (
    <div className="animate-fade-in-up">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
        {modes.map((m) => (
          <button
            key={m.id}
            onClick={() => setMode(m.id)}
            className={`text-left px-4 py-3 rounded-xl border transition-colors ${mode === m.id ? 'border-green-2 bg-green-2/10' : 'border-green-4/15 hover:border-green-2'}`}
          >
            <div className="text-sm font-bold text-green-4">{m.label}</div>
            <div className="text-xs text-green-4/50 mt-0.5">{m.desc}</div>
          </button>
        ))}
      </div>
      {/* key forces a fresh wizard/list when switching modes */}
      <WorkflowSection key={type} type={type} requests={requests} refData={refData} onAddRequest={onAddRequest} onBulkImport={onBulkImport} onSubmitRequest={onSubmitRequest} />
    </div>
  )
}
