import { REQUEST_TYPES } from './constants'
import { formatDateRange } from './helpers'
import {
  ConfirmStep, TeamStep, ClientStep, ChainsStep, StoresStep, ItemsStep,
  NewItemsStep, WorkflagDetailsStep, AuthorizeDetailsStep, ReviewStep,
} from '../components/wizard/steps'

// Required contract confirmation shown first in every wizard flow.
const confirmStep = { id: 'confirm', label: 'Confirm', Component: ConfirmStep, validate: (s) => s.contractConfirmed === true }

// Master chain of the first selected store — used for RCSM routing.
function storeMaster(state, refData) {
  const first = state.stores[0]
  const hit = refData.stores.find((s) => s.storeId === first)
  return hit ? hit.artsMasterChainName : null
}

// Master chain of the first selected leaf chain — used for RCSM routing.
function chainMaster(state, refData) {
  const first = state.chains[0]
  const hit = (refData.chains || []).find((c) => c.chain === first)
  return hit ? hit.master : null
}

export const REQUEST_CONFIG = {
  // ── Workflag build: full mirror of the WF builder ──
  [REQUEST_TYPES.WORKFLAG]: {
    type: REQUEST_TYPES.WORKFLAG,
    title: 'Home Location Check',
    steps: [
      confirmStep,
      { id: 'team', label: 'Team', Component: TeamStep, validate: (s) => !!s.teamId },
      { id: 'client', label: 'Client', Component: ClientStep, validate: (s) => !!s.clientId },
      { id: 'stores', label: 'Chains', Component: StoresStep, validate: (s) => s.stores.length > 0 },
      { id: 'items', label: 'Items', Component: ItemsStep, validate: (s) => s.items.length > 0 },
      { id: 'details', label: 'Dates', Component: WorkflagDetailsStep, validate: (s) => !!s.startDate && !!s.endDate },
      { id: 'review', label: 'Review', Component: ReviewStep, validate: () => true },
    ],
    summarize: (s) => [
      { label: 'Team', value: s.teamName },
      { label: 'Client', value: s.clientName },
      { label: 'Chains', value: s.chains.join(', ') || '—' },
      { label: 'Stores', value: String(s.stores.length) },
      { label: 'Items', value: String(s.items.length) },
      { label: 'Total rows', value: String(s.stores.length * s.items.length) },
      { label: 'Dates', value: formatDateRange(s.startDate, s.endDate) },
    ],
    buildRecord: (s, refData) => ({
      type: REQUEST_TYPES.WORKFLAG,
      teamId: s.teamId,
      teamName: s.teamName,
      clientName: s.clientName,
      masterChain: storeMaster(s, refData),
      chains: s.chains,
      stores: s.stores,
      items: s.items,
      storeCount: s.stores.length,
      itemCount: s.items.length,
      totalRows: s.stores.length * s.items.length,
      payload: { startDate: s.startDate, endDate: s.endDate },
    }),
  },

  // ── Authorize items: new UPCs, chains (no stores) ──
  [REQUEST_TYPES.AUTHORIZE]: {
    type: REQUEST_TYPES.AUTHORIZE,
    title: 'Authorize Items',
    steps: [
      confirmStep,
      { id: 'team', label: 'Team', Component: TeamStep, validate: (s) => !!s.teamId },
      { id: 'client', label: 'Client', Component: ClientStep, validate: (s) => !!s.clientId },
      { id: 'chains', label: 'Chains', Component: ChainsStep, validate: (s) => s.chains.length > 0 },
      { id: 'newitems', label: 'New Items', Component: NewItemsStep, validate: (s) => s.newItems.length > 0 && s.newItems.every((it) => it.upc && it.description) },
      { id: 'details', label: 'Authorization', Component: AuthorizeDetailsStep, validate: (s) => !!s.payload.authType && !!s.payload.effectiveDate },
      { id: 'review', label: 'Review', Component: ReviewStep, validate: () => true },
    ],
    summarize: (s) => [
      { label: 'Team', value: s.teamName },
      { label: 'Client', value: s.clientName },
      { label: 'Chains', value: s.chains.join(', ') || '—' },
      { label: 'New items', value: String(s.newItems.length) },
      { label: 'Auth type', value: s.payload.authType || '—' },
      { label: 'Effective', value: s.payload.effectiveDate || '—' },
      { label: 'Comment', value: s.comment || '—' },
    ],
    buildRecord: (s, refData) => ({
      type: REQUEST_TYPES.AUTHORIZE,
      teamName: s.teamName,
      clientName: s.clientName,
      masterChain: chainMaster(s, refData),
      chains: s.chains,
      newItems: s.newItems,
      itemCount: s.newItems.length,
      totalRows: s.chains.length * s.newItems.length,
      comment: s.comment,
      payload: { authType: s.payload.authType, effectiveDate: s.payload.effectiveDate },
    }),
  },
}
