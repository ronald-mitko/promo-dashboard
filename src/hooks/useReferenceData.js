import { useState, useEffect } from 'react'
import { apiEnabled, reference } from '../lib/api'
import { REQUEST_TYPES } from '../lib/constants'

// Provides reference data to a wizard. When the API is on, fetches each level
// on demand from Fabric (clients by team → chains by client → stores by selected
// chains → items by client). When off, returns the passed-in seed unchanged.
// `type` selects the chain source: Authorize pulls the team's full chain universe
// from SL_Combined; Workflag pulls the client's authorized chains.
export function useReferenceData(state, seed, type) {
  const enabled = apiEnabled()
  const [teams, setTeams] = useState(seed.teams)
  const [clients, setClients] = useState([])
  const [chains, setChains] = useState([])
  const [stores, setStores] = useState([])
  const [items, setItems] = useState([])

  const { teamId, clientId } = state
  const selectedChainNames = state.chains
  const chainsKey = selectedChainNames.join(',')

  useEffect(() => {
    if (!enabled) return
    reference.teams().then(setTeams).catch(() => {})
  }, [enabled])

  useEffect(() => {
    if (!enabled || !teamId) { setClients([]); return }
    reference.clients(teamId).then(setClients).catch(() => setClients([]))
  }, [enabled, teamId])

  useEffect(() => {
    if (!enabled || !teamId) { setChains([]); return }
    if (type === REQUEST_TYPES.AUTHORIZE) {
      // Authorize: full team chain universe from SL_Combined (no client needed)
      reference.authChains(teamId).then(setChains).catch(() => setChains([]))
    } else if (clientId) {
      reference.chains(teamId, clientId).then(setChains).catch(() => setChains([]))
    } else {
      setChains([])
    }
  }, [enabled, type, teamId, clientId])

  // Stores: map selected chain names → chainIds, then fetch.
  useEffect(() => {
    if (!enabled || !teamId || !clientId) { setStores([]); return }
    const ids = chains.filter((c) => selectedChainNames.includes(c.chain)).map((c) => c.chainId)
    if (ids.length === 0) { setStores([]); return }
    reference.stores(teamId, clientId, ids).then(setStores).catch(() => setStores([]))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, teamId, clientId, chainsKey, chains])

  useEffect(() => {
    if (!enabled || !teamId || !clientId) { setItems([]); return }
    reference.items(teamId, clientId).then(setItems).catch(() => setItems([]))
  }, [enabled, teamId, clientId])

  if (!enabled) return seed
  return { teams, clients, chains, stores, items }
}
