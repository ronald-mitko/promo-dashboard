// ─────────────────────────────────────────────
// GET /api/reference?resource=teams|clients|chains|stores|items&teamId=&clientId=&chainId=
// Read-only reference data from Fabric SQL. SQL mirrors the workflag-submission app.
// ─────────────────────────────────────────────
import { queryRows, TYPES, fabricConfigured, getLast12PeriodStart } from '../server/fabric.js'
import { requireAuth } from '../server/auth.js'

const TEAMS = [
  { id: '1', name: 'Syndicated Grocery' },
  { id: '27', name: 'Hispanic Sales' },
]

// SL_Combined uses different team labels than the workflag TeamID.
const SL_COMBINED_TEAM = { '1': 'Core', '27': 'Ethnic Sales' }

const BATCH_SIZE = 2000

export default async function handler(req, res) {
  if (!requireAuth(req, res)) return
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

    // Authorize chains: full chain universe for a team (new items have no auth yet).
    // Source = SL_Combined, latest Period, filtered to the team.
    // NOTE: adjust table/column names below to match your SL_Combined schema.
    if (resource === 'authChains') {
      if (!teamId) return res.status(400).json({ error: 'teamId is required' })
      const slTeam = SL_COMBINED_TEAM[teamId] || teamId
      const now = new Date()
      const period = now.getFullYear() * 100 + (now.getMonth() + 1) // YYYYMM, e.g. 202606
      const rows = await queryRows(
        `SELECT DISTINCT ArtsMasterChainName, ArtsSubMasterChainName, ArtsChainName, StoreArtsChainId
         FROM SL_Combined
         WHERE Team = @Team AND Period = @Period AND StorePriority = 1
         ORDER BY ArtsMasterChainName, ArtsSubMasterChainName, ArtsChainName`,
        [
          { name: 'Team', type: TYPES.VarChar, value: slTeam },
          { name: 'Period', type: TYPES.Int, value: period },
        ],
      )
      return res.status(200).json(rows.map((r) => ({
        chain: r.ArtsChainName,
        subMaster: r.ArtsSubMasterChainName || r.ArtsMasterChainName,
        master: r.ArtsMasterChainName,
        chainId: r.StoreArtsChainID != null ? String(r.StoreArtsChainID) : r.ArtsChainName,
      })))
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

    // Existing-item search over the products dimension (authorize-existing flow).
    // Columns confirmed against dim_Products.
    if (resource === 'products') {
      const search = String(req.query.search || '').trim()
      if (search.length < 2) return res.status(200).json([])
      const rows = await queryRows(
        `SELECT DISTINCT TOP 50 item_upc, item_description, brand_description, category_name, family_description, item_size, item_pack
         FROM dim_Products
         WHERE item_upc LIKE @Search OR item_description LIKE @Search
         ORDER BY item_description`,
        [{ name: 'Search', type: TYPES.VarChar, value: `%${search}%` }],
      )
      return res.status(200).json(rows.map((r) => ({
        itemUpc: r.item_upc, description: r.item_description, brand: r.brand_description,
        category: r.category_name, family: r.family_description, size: r.item_size, pack: r.item_pack,
      })))
    }

    // Distinct brand / family / category values from dim_Products, for the
    // new-item build dropdowns (keeps entered values consistent with the master).
    if (resource === 'productAttributes') {
      const distinct = async (col) => {
        const rows = await queryRows(
          `SELECT DISTINCT ${col} AS v FROM dim_Products WHERE ${col} IS NOT NULL AND ${col} <> '' ORDER BY ${col}`,
          [],
        )
        return rows.map((r) => r.v)
      }
      const [brands, families, categories] = await Promise.all([
        distinct('brand_description'), distinct('family_description'), distinct('category_name'),
      ])
      return res.status(200).json({ brands, families, categories })
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
