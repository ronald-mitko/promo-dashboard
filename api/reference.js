// ─────────────────────────────────────────────
// GET /api/reference?resource=teams|clients|chains|stores|items&teamId=&clientId=&chainId=
// Read-only reference data from Fabric SQL. SQL mirrors the workflag-submission app.
// ─────────────────────────────────────────────
import { queryRows, TYPES, fabricConfigured, getLast12PeriodStart } from '../server/fabric.js'

const TEAMS = [
  { id: '1', name: 'Syndicated Grocery' },
  { id: '27', name: 'Hispanic Sales' },
]

const BATCH_SIZE = 2000

export default async function handler(req, res) {
  const resource = req.query.resource
  const teamId = req.query.teamId
  const clientId = req.query.clientId
  const chainIds = [].concat(req.query.chainId || []).flatMap((s) => String(s).split(',')).filter(Boolean)

  try {
    if (resource === 'teams') return res.status(200).json(TEAMS)

    if (!fabricConfigured()) return res.status(503).json({ error: 'Fabric SQL not configured (set FABRIC_SQL_* env vars)' })

    if (resource === 'clients') {
      if (!teamId) return res.status(400).json({ error: 'teamId is required' })
      const rows = await queryRows(
        `SELECT DISTINCT a.PrincipalID AS ClientID, a.PrincipalDescription AS ClientName
         FROM dim_AUTHS_T2 a
         WHERE a.TeamID = @TeamID AND a.ItemStatus NOT IN ('X','D')
         ORDER BY a.PrincipalDescription`,
        [{ name: 'TeamID', type: TYPES.VarChar, value: teamId }],
      )
      return res.status(200).json(rows.map((r) => ({ clientId: r.ClientID, name: r.ClientName, teamId })))
    }

    if (resource === 'chains') {
      if (!teamId || !clientId) return res.status(400).json({ error: 'teamId and clientId are required' })
      const rows = await queryRows(
        `SELECT DISTINCT a.MasterChain, a.MasterChainID, a.ChainID, a.Chain
         FROM dim_AUTHS_T2 a
         INNER JOIN t_Ref_MCC m ON m.[Chain Id] = a.ChainID AND m.[Master Client ID] = a.PrincipalID
         WHERE a.PrincipalID = @ClientID AND a.TeamID = @TeamID AND a.ItemStatus NOT IN ('X','D')
           AND m.Period >= @Last12PeriodStart
         GROUP BY a.MasterChain, a.MasterChainID, a.ChainID, a.Chain
         ORDER BY a.MasterChain, a.Chain`,
        [
          { name: 'ClientID', type: TYPES.VarChar, value: clientId },
          { name: 'TeamID', type: TYPES.VarChar, value: teamId },
          { name: 'Last12PeriodStart', type: TYPES.BigInt, value: getLast12PeriodStart() },
        ],
      )
      // Map to the app's chain shape (master > subMaster > chain). The chains query
      // has no sub-master, so we mirror master into subMaster for grouping.
      return res.status(200).json(rows.map((r) => ({ chain: r.Chain, subMaster: r.MasterChain, master: r.MasterChain, chainId: r.ChainID, masterChainId: r.MasterChainID })))
    }

    if (resource === 'stores') {
      if (!teamId || !clientId || chainIds.length === 0) return res.status(400).json({ error: 'teamId, clientId, and chainId(s) are required' })
      const seen = new Set()
      const stores = []
      for (let i = 0; i < chainIds.length; i += BATCH_SIZE) {
        const batch = chainIds.slice(i, i + BATCH_SIZE)
        const chainParams = batch.map((id, j) => ({ name: `Chain${j}`, type: TYPES.VarChar, value: id }))
        const placeholders = batch.map((_, j) => `@Chain${j}`).join(', ')
        const rows = await queryRows(
          `SELECT DISTINCT s.StoreId, s.StoreName, s.City, s.State, s.ArtsChainName, s.ArtsMasterChainName, s.ArtsSubMasterChainName
           FROM t_Ref_MCC m
           INNER JOIN dim_SL_Latest_Team_StoreDetails s ON CAST(m.StoreID AS VARCHAR) = s.StoreId AND m.Team = s.Team
           WHERE m.[Master Client ID] = @ClientID AND m.[Chain Id] IN (${placeholders}) AND m.Period >= @Last12PeriodStart
           ORDER BY s.ArtsMasterChainName, s.ArtsChainName, s.State, s.City`,
          [
            { name: 'ClientID', type: TYPES.VarChar, value: clientId },
            { name: 'Last12PeriodStart', type: TYPES.Int, value: getLast12PeriodStart() },
            ...chainParams,
          ],
        )
        for (const r of rows) {
          if (seen.has(r.StoreId)) continue
          seen.add(r.StoreId)
          stores.push({ storeId: r.StoreId, name: r.StoreName, city: r.City, state: r.State, artsChainName: r.ArtsChainName, artsMasterChainName: r.ArtsMasterChainName, artsSubMasterChainName: r.ArtsSubMasterChainName })
        }
      }
      return res.status(200).json(stores)
    }

    if (resource === 'items') {
      if (!teamId || !clientId) return res.status(400).json({ error: 'teamId and clientId are required' })
      const base = [
        { name: 'ClientID', type: TYPES.VarChar, value: clientId },
        { name: 'TeamID', type: TYPES.VarChar, value: teamId },
      ]
      const select = `SELECT DISTINCT a.ItemCode, a.ItemDescription, a.ItemUPC, a.BrandDescription, a.CategoryDescription, a.FamilyDescription, p.item_size, p.item_pack
        FROM dim_AUTHS_T2 a LEFT JOIN dim_Products p ON a.ItemUPC = p.item_upc AND a.TEAM_KEY = p.team_key
        WHERE a.PrincipalID = @ClientID AND a.TeamID = @TeamID`
      const order = ` ORDER BY a.CategoryDescription, a.BrandDescription, a.ItemDescription`
      const seen = new Set()
      const items = []
      const collect = (rows) => {
        for (const r of rows) {
          if (seen.has(r.ItemUPC)) continue
          seen.add(r.ItemUPC)
          items.push({ itemUpc: r.ItemUPC, itemCode: r.ItemCode, description: r.ItemDescription, brand: r.BrandDescription, category: r.CategoryDescription, family: r.FamilyDescription, size: r.item_size, pack: r.item_pack })
        }
      }
      if (chainIds.length === 0) {
        collect(await queryRows(select + ` AND a.ItemStatus NOT IN ('X','D')` + order, base))
      } else {
        for (let i = 0; i < chainIds.length; i += BATCH_SIZE) {
          const batch = chainIds.slice(i, i + BATCH_SIZE)
          const chainParams = batch.map((id, j) => ({ name: `Chain${j}`, type: TYPES.VarChar, value: id }))
          const placeholders = batch.map((_, j) => `@Chain${j}`).join(', ')
          collect(await queryRows(select + ` AND a.ChainID IN (${placeholders}) AND a.ItemStatus NOT IN ('X','D')` + order, [...base, ...chainParams]))
        }
      }
      return res.status(200).json(items)
    }

    return res.status(400).json({ error: 'Unknown resource' })
  } catch (err) {
    return res.status(500).json({ error: String(err.message || err) })
  }
}
