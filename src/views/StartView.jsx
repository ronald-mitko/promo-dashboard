import { useState } from 'react'
import { PRIORITY_TYPES } from '../lib/constants'
import BulkUpload from '../components/BulkUpload'

function Icon({ path }) {
  return (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{path}</svg>
  )
}

// HQ launcher: pick what you want to do, then drop into the matching flow.
export default function StartView({ onAuthorize, onHomeLocationCheck, onViewPriorities, onAddPriority, onBulkImportPromo, refData }) {
  const [showTypes, setShowTypes] = useState(false)

  const Card = ({ title, desc, onClick, accent, icon }) => (
    <button onClick={onClick} className="text-left bg-white rounded-2xl shadow-sm border border-green-4/8 p-5 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200">
      <div className={`w-11 h-11 rounded-xl mb-3 flex items-center justify-center ${accent}`}><Icon path={icon} /></div>
      <div className="text-base font-bold text-green-4">{title}</div>
      <div className="text-sm text-green-4/50 mt-0.5">{desc}</div>
    </button>
  )

  return (
    <div className="animate-fade-in-up">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card
          title="Add priority"
          desc="Shelf conditions, promotion/display, or competitive activity"
          accent="bg-green-2/15 text-green-2"
          icon={<><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></>}
          onClick={() => setShowTypes((v) => !v)}
        />
        <Card
          title="Authorize items"
          desc="Build a new item, or authorize an existing item into a new account"
          accent="bg-orange-3/15 text-orange-3"
          icon={<><circle cx="12" cy="12" r="9" /><path d="M9 12l2 2 4-4" /></>}
          onClick={onAuthorize}
        />
        <Card
          title="View current priorities"
          desc="Browse and manage entered priorities"
          accent="bg-green-3/15 text-green-3"
          icon={<><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10z" /><circle cx="7" cy="7" r="1" /></>}
          onClick={onViewPriorities}
        />
      </div>

      {showTypes && (
        <div className="mt-5 bg-white rounded-2xl border border-green-4/8 shadow-sm p-5 animate-fade-in-up">
          <div className="text-sm font-bold text-green-4 mb-3">What kind of priority?</div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {PRIORITY_TYPES.map((t) => (
              <button
                key={t.id}
                onClick={() => (t.id === 'shelf' ? onHomeLocationCheck() : onAddPriority(t.id))}
                className="text-left px-4 py-3 rounded-xl border border-green-4/15 hover:border-green-2 hover:bg-green-2/5 transition-colors"
              >
                <div className="text-sm font-bold text-green-4">{t.label}</div>
                <div className="text-xs text-green-4/50 mt-0.5">{t.desc}</div>
              </button>
            ))}
          </div>
          {onBulkImportPromo && (
            <div className="mt-3 pt-3 border-t border-green-4/8 flex flex-wrap items-center gap-2">
              <span className="text-xs text-green-4/50">Adding many promotions / displays at once?</span>
              <BulkUpload type="priority" onImport={onBulkImportPromo} refData={refData} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
