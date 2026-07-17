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
    header: ['Client', 'Retailer', 'Chains', 'Product', 'Brand', 'Category', 'PromoType', 'StartDate', 'EndDate', 'Mechanic', 'RetailPrice', 'PromoPrice', 'ExpectedLift', 'Display', 'PhotoRequested'],
    example: [
      ['Mars', 'Walmart', 'Walmart Supercenter', "M&M's Party Size 38oz", 'Mars', 'Candy', 'TPR', '2026-08-01', '2026-08-31', '$2 off Party Size', 10.99, 8.99, 25, 'Candy aisle endcap', 'no'],
    ],
    notes: [
      'One row = one priority (it will be created as a draft to review and submit).',
      'PromoType must be one of: TPR, Feature, Display, Feature and Display.',
      'Dates use YYYY-MM-DD. Chains: separate multiple with a semicolon (;).',
      'PhotoRequested: yes or no. Client is required (drives routing to the RCSM).',
    ],
  },

  authorize: {
    label: 'Authorize new items',
    filename: 'authorize_new_items_template.xlsx',
    grouped: true, // rows sharing header fields become one request
    header: ['Client', 'Team', 'Chains', 'AuthType', 'EffectiveDate', 'UPC', 'Description', 'Brand', 'Category', 'Family', 'Size', 'Pack'],
    example: [
      ['Mars', 'Syndicated Grocery', 'Walmart Supercenter', 'new', '2026-08-01', '012345678905', 'New Item A', 'Mars', 'Candy', 'Chocolate', '3.5oz', '12'],
      ['Mars', 'Syndicated Grocery', 'Walmart Supercenter', 'new', '2026-08-01', '012345678912', 'New Item B', 'Mars', 'Candy', 'Chocolate', '5oz', '12'],
    ],
    notes: [
      'Each row = one new item. Rows sharing the same Client + Team + Chains + AuthType + EffectiveDate are bundled into ONE authorize request (draft).',
      'Repeat the Client/Team/Chains/AuthType/EffectiveDate values on every row.',
      'UPC = 12 digits. Chains: separate multiple with a semicolon (;). AuthType: new, reauthorize, or delete.',
    ],
  },

  authorize_existing: {
    label: 'Authorize existing items',
    filename: 'authorize_existing_items_template.xlsx',
    grouped: true,
    header: ['Client', 'Team', 'Accounts', 'AuthType', 'EffectiveDate', 'UPC', 'Description'],
    example: [
      ['Mars', 'Syndicated Grocery', 'Walmart Supercenter', 'new', '2026-08-01', '040000000017', "M&M's Peanut Party Size 38oz"],
    ],
    notes: [
      'Each row = one existing item to authorize into the listed account(s). Rows sharing Client + Team + Accounts + AuthType + EffectiveDate become ONE request (draft).',
      'Accounts (total routing chains): separate multiple with a semicolon (;). UPC = 12 digits.',
    ],
  },

  workflag: {
    label: 'Home Location Check',
    filename: 'home_location_check_template.xlsx',
    grouped: true,
    // Chains (not stores) — HQ picks chains; upload splits each chain into stores.
    header: ['Client', 'Team', 'Chains', 'StartDate', 'EndDate', 'UPC'],
    needsChains: true, // template download requires Team + Client (chain dropdown)
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

// Home Location Check template with a real in-cell Chains dropdown (ExcelJS),
// sourced from the site's chains for the chosen Team + Client (both pre-filled).
export async function downloadWorkflagTemplate({ teamName, clientName, chains }) {
  const ExcelJS = (await import('exceljs')).default
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('Template')
  const header = ['Client', 'Team', 'Chains', 'StartDate', 'EndDate', 'UPC']
  ws.addRow(header)
  const c0 = chains[0] || ''
  ws.addRow([clientName, teamName, c0, '2026-08-01', '2026-08-28', '040000000017'])
  ws.addRow([clientName, teamName, c0, '2026-08-01', '2026-08-28', '046100358825'])
  ws.columns = header.map((h) => ({ width: Math.max(16, h.length + 2) }))
  ws.getRow(1).font = { bold: true }

  // Reference sheet holding the valid chains (dropdown source).
  const cs = wb.addWorksheet('Chains')
  cs.addRow(['ValidChains'])
  chains.forEach((c) => cs.addRow([c]))
  const lastRow = chains.length + 1

  // In-cell dropdown on the Chains column (C) for a generous row range.
  for (let r = 2; r <= 1000; r++) {
    ws.getCell(`C${r}`).dataValidation = {
      type: 'list',
      allowBlank: false,
      formulae: [`=Chains!$A$2:$A$${Math.max(lastRow, 2)}`],
      showErrorMessage: true,
      errorTitle: 'Invalid chain',
      error: 'Pick a chain from the dropdown list.',
    }
  }

  const ins = wb.addWorksheet('Instructions')
  const lines = [
    'Instructions', '',
    'One row = one item to check. Rows sharing Client + Team + Chains + StartDate + EndDate become ONE Home Location Check (draft).',
    'Pick Chains from the dropdown in column C (sourced from the site for this client).',
    'On upload, each chain is automatically split into its stores.',
    'UPC = 12 digits. Dates: YYYY-MM-DD.',
  ]
  lines.forEach((t) => ins.addRow([t]))
  ins.getColumn(1).width = 110

  triggerDownload(await wb.xlsx.writeBuffer(), 'home_location_check_template.xlsx')
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
