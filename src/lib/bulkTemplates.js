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
    header: ['Client', 'Team', 'Stores', 'StartDate', 'EndDate', 'UPC'],
    example: [
      ['Mars', 'Syndicated Grocery', '1023;1044', '2026-08-01', '2026-08-28', '040000000017'],
      ['Mars', 'Syndicated Grocery', '1023;1044', '2026-08-01', '2026-08-28', '046100358825'],
    ],
    notes: [
      'Each row = one item to check. Rows sharing Client + Team + Stores + StartDate + EndDate become ONE Home Location Check (draft).',
      'Stores: list store numbers separated by a semicolon (;), repeated on every row. UPC = 12 digits. Dates: YYYY-MM-DD.',
    ],
  },
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
