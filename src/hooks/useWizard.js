import { useReducer, useCallback } from 'react'

export const WIZARD_DEFAULTS = {
  stepIndex: 0,
  contractConfirmed: false,   // required gate at the front of the flow
  teamId: '', teamName: '',
  clientId: '', clientName: '',
  chains: [],      // chain names (authorize)
  stores: [],      // store ids (workflag)
  items: [],       // item upcs (workflag)
  newItems: [],    // [{upc, description, brand, category, family, size, pack}] (authorize new)
  existingItems: [], // [{itemUpc, description, brand, category}] (authorize existing, from dim_Products)
  reasonCode: '',
  frequency: 'once',
  startDate: '', endDate: '',
  comment: '',
  payload: {},     // type-specific
}

function reducer(state, action) {
  switch (action.type) {
    case 'SET':
      return { ...state, [action.field]: action.value }
    case 'SET_PAYLOAD':
      return { ...state, payload: { ...state.payload, [action.field]: action.value } }
    case 'TOGGLE_IN_ARRAY': {
      const arr = state[action.field] || []
      const next = arr.includes(action.value) ? arr.filter((v) => v !== action.value) : [...arr, action.value]
      return { ...state, [action.field]: next }
    }
    case 'SET_ARRAY':
      return { ...state, [action.field]: action.values }
    case 'ADD_NEW_ITEM':
      return { ...state, newItems: [...state.newItems, action.item || {}] }
    case 'UPDATE_NEW_ITEM': {
      const newItems = state.newItems.map((it, i) => (i === action.index ? { ...it, [action.field]: action.value } : it))
      return { ...state, newItems }
    }
    case 'REMOVE_NEW_ITEM':
      return { ...state, newItems: state.newItems.filter((_, i) => i !== action.index) }
    case 'NEXT':
      return { ...state, stepIndex: Math.min(state.stepIndex + 1, action.max) }
    case 'BACK':
      return { ...state, stepIndex: Math.max(state.stepIndex - 1, 0) }
    case 'GOTO':
      return { ...state, stepIndex: action.index }
    case 'HYDRATE':
      return { ...WIZARD_DEFAULTS, ...action.state }
    case 'RESET':
      return { ...WIZARD_DEFAULTS, ...(action.initial || {}) }
    default:
      return state
  }
}

export function useWizard(config) {
  const [state, dispatch] = useReducer(reducer, undefined, () => ({
    ...WIZARD_DEFAULTS,
    ...(config.initialState || {}),
  }))

  const steps = config.steps
  const stepIndex = state.stepIndex
  const step = steps[stepIndex]
  const isFirst = stepIndex === 0
  const isLast = stepIndex === steps.length - 1
  const canNext = !step.validate || step.validate(state)

  const next = useCallback(() => dispatch({ type: 'NEXT', max: steps.length - 1 }), [steps.length])
  const back = useCallback(() => dispatch({ type: 'BACK' }), [])
  const goto = useCallback((index) => dispatch({ type: 'GOTO', index }), [])
  const reset = useCallback((initial) => dispatch({ type: 'RESET', initial }), [])
  const hydrate = useCallback((s) => dispatch({ type: 'HYDRATE', state: s }), [])

  return { state, dispatch, steps, step, stepIndex, isFirst, isLast, canNext, next, back, goto, reset, hydrate }
}
