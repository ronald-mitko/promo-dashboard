// ─────────────────────────────────────────────
// Parse an uploaded bulk-template workbook into draft records per type.
// Returns { records, errors }. Records match the shapes the App handlers expect
// (promotions for 'priority'; request records for the others).
// ─────────────────────────────────────────────
import * as XLSX from 'xlsx'
import { computeStatus, toLocalYMD } from './helpers'

const str = (v) => String(v ?? '').trim()
const num = (v) => { const n = parseFloat(v); return isNaN(n) ? 0 : n }
const splitMulti = (v) => str(v).split(/[;\n,]/).map((s) => s.trim()).filter(Boolean)

function toYMD(v) {
  if (v == null || v === '') return ''
  if (v instanceof Date) return toLocalYMD(v)
  const s = String(v).trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
  const d = new Date(s)
  return isNaN(d.getTime()) ? s : toLocalYMD(d)
}

export function parseBulk(type, arrayBuffer) {
  let data
  try {
    const wb = XLSX.read(arrayBuffer, { cellDates: true })
    const ws = wb.Sheets[wb.SheetNames[0]]
    const rows = XLSX.utils.sheet_to_json(ws, { defval: '' })
    data = rows.filter((r) => Object.values(r).some((v) => str(v) !== ''))
  } catch {
    return { records: [], errors: ['Could not read the file. Please upload a filled-in .xlsx template.'] }
  }
  if (data.length === 0) return { records: [], errors: ['No data rows found. Fill in the Template sheet and try again.'] }

  switch (type) {
    case 'priority': return parsePriorities(data)
    case 'authorize': return parseAuthorize(data, false)
    case 'authorize_existing': return parseAuthorize(data, true)
    case 'workflag': return parseWorkflag(data)
    default: return { records: [], errors: ['Unknown template type'] }
  }
}

function parsePriorities(data) {
  const records = []
  const errors = []
  data.forEach((r, i) => {
    const line = i + 2
    const clientName = str(r.Client)
    const product = str(r.Product)
    if (!clientName || !product) { errors.push(`Row ${line}: Client and Product are required`); return }
    const retail = num(r.RetailPrice)
    const promo = num(r.PromoPrice)
    const start = toYMD(r.StartDate)
    const end = toYMD(r.EndDate)
    const chains = splitMulti(r.Chains)
    records.push({
      clientName,
      retailer: str(r.Retailer),
      chains,
      chain: chains[0] || str(r.Retailer),
      product,
      brand: str(r.Brand),
      category: str(r.Category),
      priority_type: 'promo_display',
      promo_type: str(r.PromoType) || 'TPR',
      start_date: start,
      end_date: end,
      mechanic: str(r.Mechanic),
      retail_price: retail,
      promo_price: promo,
      depth_of_discount: retail > 0 ? Number(((1 - promo / retail) * 100).toFixed(1)) : 0,
      expected_lift: num(r.ExpectedLift) || 10,
      display: str(r.Display) || 'None specified',
      photo_requested: /^y/i.test(str(r.PhotoRequested)) ? 'yes' : 'no',
      status: computeStatus(start, end),
      checklist: [],
    })
  })
  return { records, errors }
}

function parseAuthorize(data, existing) {
  const errors = []
  const groups = new Map()
  const accountsCol = existing ? 'Accounts' : 'Chains'
  data.forEach((r, i) => {
    const line = i + 2
    const client = str(r.Client)
    const upc = str(r.UPC)
    const accounts = splitMulti(r[accountsCol])
    if (!client || !upc || accounts.length === 0) { errors.push(`Row ${line}: Client, ${accountsCol}, and UPC are required`); return }
    const team = str(r.Team)
    const authType = str(r.AuthType) || 'new'
    const eff = toYMD(r.EffectiveDate)
    const key = [client, team, accounts.join('|'), authType, eff].join('~~')
    if (!groups.has(key)) groups.set(key, { client, team, accounts, authType, eff, items: [] })
    groups.get(key).items.push({
      upc, description: str(r.Description), brand: str(r.Brand), category: str(r.Category),
      family: str(r.Family), size: str(r.Size), pack: str(r.Pack),
    })
  })
  const records = [...groups.values()].map((g) => ({
    type: existing ? 'authorize_existing' : 'authorize',
    teamName: g.team,
    clientName: g.client,
    chains: g.accounts,
    newItems: g.items,
    itemCount: g.items.length,
    totalRows: g.accounts.length * g.items.length,
    comment: '',
    payload: { authType: g.authType, effectiveDate: g.eff, ...(existing ? { existing: true } : {}) },
  }))
  return { records, errors }
}

function parseWorkflag(data) {
  const errors = []
  const groups = new Map()
  data.forEach((r, i) => {
    const line = i + 2
    const client = str(r.Client)
    const upc = str(r.UPC)
    const stores = splitMulti(r.Stores)
    if (!client || !upc || stores.length === 0) { errors.push(`Row ${line}: Client, Stores, and UPC are required`); return }
    const team = str(r.Team)
    const start = toYMD(r.StartDate)
    const end = toYMD(r.EndDate)
    const key = [client, team, stores.join('|'), start, end].join('~~')
    if (!groups.has(key)) groups.set(key, { client, team, stores, start, end, items: [] })
    groups.get(key).items.push(upc)
  })
  const records = [...groups.values()].map((g) => ({
    type: 'workflag',
    teamName: g.team,
    clientName: g.client,
    stores: g.stores,
    items: g.items,
    storeCount: g.stores.length,
    itemCount: g.items.length,
    totalRows: g.stores.length * g.items.length,
    payload: { startDate: g.start, endDate: g.end },
  }))
  return { records, errors }
}
