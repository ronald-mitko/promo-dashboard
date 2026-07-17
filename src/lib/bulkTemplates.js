// ─────────────────────────────────────────────
// Excel bulk-upload templates + column specs. One place defines each type's
// columns (used to generate the downloadable template AND to parse uploads).
// ─────────────────────────────────────────────
import * as XLSX from 'xlsx'

// Column spec per bulk type. `header` = exact column names; `example` = a sample
// row (or rows); `notes` = instruction lines shown on a second sheet.
export const BULK_SPECS = {
  priority: {
    label: 'Priorities',
    filename: 'priorities_template.xlsx',
    grouped: false, // one row per priority
    needsChains: true,
    chainColumn: 'Chains',
    chainSource: 'clientChains', // the client's chains (same as manual promo entry)
    dropdowns: { PromoType: ['TPR', 'Feature', 'Display', 'Feature and Display'], PhotoRequested: ['yes', 'no'] },
    dateColumns: ['StartDate', 'EndDate'],
    header: ['Client', 'Chains', 'Product', 'Brand', 'Category', 'PromoType', 'StartDate', 'EndDate', 'Mechanic', 'RetailPrice', 'PromoPrice', 'ExpectedLift', 'Display', 'PhotoRequested'],
    example: [
      ['Mars', 'Walmart Supercenter', "M&M's Party Size 38oz", 'Mars', 'Candy', 'TPR', '2026-08-01', '2026-08-31', '$2 off Party Size', 10.99, 8.99, 25, 'Candy aisle endcap', 'no'],
    ],
    notes: [
      'One row = one priority (it will be created as a draft to review and submit).',
      'Pick Chains from the dropdown (the selected client’s chains). Client is pre-filled and drives routing to the RCSM.',
      'PromoType must be one of: TPR, Feature, Display, Feature and Display.',
      'Dates use YYYY-MM-DD. For multiple chains in one row, separate with a semicolon (;). PhotoRequested: yes or no.',
    ],
  },

  authorize: {
    label: 'Authorize new items',
    filename: 'authorize_new_items_template.xlsx',
    grouped: true, // rows sharing header fields become one request
    needsChains: true,
    chainColumn: 'Chains',
    chainSource: 'authChains', // total routing (SL_Combined, StorePriority = 1)
    dropdowns: { AuthType: ['new', 'reauthorize', 'delete'] },
    dateColumns: ['EffectiveDate'],
    header: ['Client', 'Team', 'Chains', 'AuthType', 'EffectiveDate', 'UPC', 'Description', 'Brand', 'Category', 'Family', 'Size', 'Pack'],
    example: [
      ['Mars', 'Syndicated Grocery', 'Walmart Supercenter', 'new', '2026-08-01', '012345678905', 'New Item A', 'Mars', 'Candy', 'Chocolate', '3.5oz', '12'],
      ['Mars', 'Syndicated Grocery', 'Walmart Supercenter', 'new', '2026-08-01', '012345678912', 'New Item B', 'Mars', 'Candy', 'Chocolate', '5oz', '12'],
    ],
    notes: [
      'Each row = one new item. Rows sharing the same Client + Team + Chains + AuthType + EffectiveDate are bundled into ONE authorize request (draft).',
      'Pick Chains from the dropdown (sourced from the site). Repeat the Client/Team/Chains/AuthType/EffectiveDate values on every row.',
      'UPC = 12 digits. For multiple chains in one row, separate with a semicolon (;). AuthType: new, reauthorize, or delete.',
    ],
  },

  authorize_existing: {
    label: 'Authorize existing items',
    filename: 'authorize_existing_items_template.xlsx',
    grouped: true,
    needsChains: true,
    chainColumn: 'Accounts',
    chainSource: 'authChains', // total routing (SL_Combined, StorePriority = 1)
    dropdowns: { AuthType: ['new', 'reauthorize', 'delete'] },
    dateColumns: ['EffectiveDate'],
    header: ['Client', 'Team', 'Accounts', 'AuthType', 'EffectiveDate', 'UPC', 'Description'],
    example: [
      ['Mars', 'Syndicated Grocery', 'Walmart Supercenter', 'new', '2026-08-01', '040000000017', "M&M's Peanut Party Size 38oz"],
    ],
    notes: [
      'Each row = one existing item to authorize into the listed account(s). Rows sharing Client + Team + Accounts + AuthType + EffectiveDate become ONE request (draft).',
      'Pick Accounts from the dropdown (total-routing chains from the site). For multiple in one row, separate with a semicolon (;). UPC = 12 digits.',
    ],
  },

  workflag: {
    label: 'Home Location Check',
    filename: 'home_location_check_template.xlsx',
    grouped: true,
    // Chains (not stores) — HQ picks chains; upload splits each chain into stores.
    header: ['Client', 'Team', 'Chains', 'StartDate', 'EndDate', 'UPC'],
    needsChains: true, // template download requires Team + Client (chain dropdown)
    chainColumn: 'Chains',
    chainSource: 'clientChains', // the client's chains (each splits into stores on upload)
    dateColumns: ['StartDate', 'EndDate'],
    example: [
      ['Mars', 'Syndicated Grocery', 'Walmart Supercenter', '2026-08-01', '2026-08-28', '040000000017'],
    ],
    notes: [
      'Each row = one item to check. Rows sharing Client + Team + Chains + StartDate + EndDate become ONE Home Location Check (draft).',
      'Pick Chains from the dropdown (sourced from the site). On upload, each chain is automatically split into its stores.',
      'UPC = 12 digits. Dates: YYYY-MM-DD. For multiple chains in one row, separate with a semicolon (;).',
    ],
  },
}

function triggerDownload(buffer, filename) {
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

const colLetter = (i) => String.fromCharCode(65 + i) // 0→A, 1→B, …

// Template with a real in-cell dropdown on the chain/account column (ExcelJS),
// sourced from the site's chains for the chosen Team + Client (both pre-filled).
// Works for any spec flagged needsChains (workflag, authorize, authorize_existing).
export async function downloadChainTemplate(type, { teamName, clientName, chains }) {
  const spec = BULK_SPECS[type]
  const ExcelJS = (await import('exceljs')).default
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('Template')
  const header = spec.header
  const chainIdx = header.indexOf(spec.chainColumn)
  ws.addRow(header)

  // Example rows: use the spec's examples but override Client / Team / chain column.
  const examples = spec.example.length ? spec.example : [header.map(() => '')]
  examples.forEach((ex) => {
    ws.addRow(header.map((h, idx) => {
      if (h === 'Client') return clientName
      if (h === 'Team') return teamName
      if (idx === chainIdx) return chains[0] || ''
      return ex[idx] != null ? ex[idx] : ''
    }))
  })
  ws.columns = header.map((h) => ({ width: Math.max(16, h.length + 2) }))
  ws.getRow(1).font = { bold: true }

  // Reference sheet holding the valid chains (dropdown source).
  const cs = wb.addWorksheet('Chains')
  cs.addRow(['ValidChains'])
  chains.forEach((c) => cs.addRow([c]))
  const lastRow = Math.max(chains.length + 1, 2)

  const R = 1000 // validated row range
  // In-cell dropdown on the chain/account column, from the Chains sheet.
  ws.dataValidations.add(`${colLetter(chainIdx)}2:${colLetter(chainIdx)}${R}`, {
    type: 'list',
    allowBlank: false,
    formulae: [`=Chains!$A$2:$A$${lastRow}`],
    showErrorMessage: true,
    errorTitle: `Invalid ${spec.chainColumn.toLowerCase()}`,
    error: 'Pick a value from the dropdown list.',
  })

  // Per-column list dropdowns (PromoType, PhotoRequested, AuthType, …) and
  // locked date format + validation (StartDate/EndDate/EffectiveDate).
  const dropdowns = spec.dropdowns || {}
  const dateCols = spec.dateColumns || []
  header.forEach((h, idx) => {
    const letter = colLetter(idx)
    if (dropdowns[h]) {
      ws.dataValidations.add(`${letter}2:${letter}${R}`, {
        type: 'list', allowBlank: true, formulae: [`"${dropdowns[h].join(',')}"`],
        showErrorMessage: true, errorTitle: `Invalid ${h}`, error: 'Pick a value from the dropdown list.',
      })
    }
    if (dateCols.includes(h)) {
      ws.getColumn(idx + 1).numFmt = 'yyyy-mm-dd'
      ws.dataValidations.add(`${letter}2:${letter}${R}`, {
        type: 'date', operator: 'between', allowBlank: true,
        formulae: [new Date(2020, 0, 1), new Date(2100, 0, 1)],
        showErrorMessage: true, errorTitle: 'Invalid date', error: 'Enter a date in YYYY-MM-DD format.',
      })
    }
  })

  const ins = wb.addWorksheet('Instructions')
  ;['Instructions', '', ...spec.notes].forEach((t) => ins.addRow([t]))
  ins.getColumn(1).width = 110

  triggerDownload(await wb.xlsx.writeBuffer(), spec.filename)
}

// Build and download the .xlsx template for a bulk type.
export function downloadTemplate(type) {
  const spec = BULK_SPECS[type]
  if (!spec) return
  const wb = XLSX.utils.book_new()

  const rows = [spec.header, ...spec.example]
  const ws = XLSX.utils.aoa_to_sheet(rows)
  ws['!cols'] = spec.header.map((h) => ({ wch: Math.max(12, h.length + 2) }))
  XLSX.utils.book_append_sheet(wb, ws, 'Template')

  const notes = [['Instructions'], [''], ...spec.notes.map((n) => [n])]
  const wsN = XLSX.utils.aoa_to_sheet(notes)
  wsN['!cols'] = [{ wch: 110 }]
  XLSX.utils.book_append_sheet(wb, wsN, 'Instructions')

  XLSX.writeFile(wb, spec.filename)
}
