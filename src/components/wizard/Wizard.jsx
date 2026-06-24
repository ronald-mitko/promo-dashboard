import { useWizard } from '../../hooks/useWizard'
import { useReferenceData } from '../../hooks/useReferenceData'
import ProgressBar from './ProgressBar'

// Generic multi-step wizard host. Driven by a requestConfig entry.
// `refData` is the seed fallback; live Fabric data is fetched when the API is on.
export default function Wizard({ config, refData: seedRefData, onSubmit, onCancel, initialClone }) {
  const wiz = useWizard({ steps: config.steps, initialState: initialClone })
  const steps = config.steps
  const { state, dispatch, stepIndex, goto, back } = wiz
  const refData = useReferenceData(state, seedRefData)
  const step = steps[stepIndex]
  const isFirst = stepIndex === 0
  const isLast = stepIndex === steps.length - 1
  const canNext = !step.validate || step.validate(state)
  const StepComponent = step.Component

  const handleNext = () => dispatch({ type: 'NEXT', max: steps.length - 1 })
  const handleSubmit = () => onSubmit(config.buildRecord(state, refData))

  const btn = 'px-4 py-2 rounded-lg text-sm font-bold transition-colors'

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-green-4/8 p-5 animate-fade-in-up">
      <ProgressBar steps={steps} current={stepIndex} onStep={goto} />
      <div className="mt-5 min-h-[200px]">
        <StepComponent state={state} dispatch={dispatch} config={config} refData={refData} />
      </div>
      <div className="mt-5 pt-4 border-t border-green-4/8 flex items-center justify-between">
        <button type="button" onClick={isFirst ? onCancel : back} className={`${btn} border border-green-4/15 text-green-4/70 hover:bg-cream`}>
          {isFirst ? 'Cancel' : 'Back'}
        </button>
        {isLast ? (
          <button type="button" onClick={handleSubmit} className={`${btn} bg-green-2 hover:bg-green-3 text-white`}>Submit to RCSM</button>
        ) : (
          <button type="button" onClick={handleNext} disabled={!canNext} className={`${btn} ${canNext ? 'bg-green-2 hover:bg-green-3 text-white' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}>Next</button>
        )}
      </div>
    </div>
  )
}
