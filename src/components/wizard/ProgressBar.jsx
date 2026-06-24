// Wizard step indicator. Completed = green, current = orange, upcoming = gray.
export default function ProgressBar({ steps, current, onStep }) {
  return (
    <div className="flex items-center gap-1 overflow-x-auto pb-1">
      {steps.map((s, i) => {
        const done = i < current
        const active = i === current
        const color = done ? 'bg-green-2 text-white' : active ? 'bg-orange-3 text-white' : 'bg-gray-200 text-gray-500'
        return (
          <div key={s.id} className="flex items-center shrink-0">
            <button
              type="button"
              onClick={() => done && onStep && onStep(i)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors ${color} ${done ? 'cursor-pointer hover:opacity-90' : 'cursor-default'}`}
            >
              <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${done || active ? 'bg-white/25' : 'bg-white/60'}`}>{done ? '✓' : i + 1}</span>
              <span className="hidden sm:inline">{s.label}</span>
            </button>
            {i < steps.length - 1 && <span className="w-3 h-px bg-green-4/15 mx-0.5" />}
          </div>
        )
      })}
    </div>
  )
}
