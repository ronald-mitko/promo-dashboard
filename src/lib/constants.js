// ─────────────────────────────────────────────
// CENTRAL CONSTANTS — HQ to Retail Connector
// ─────────────────────────────────────────────

// Roles for the lightweight role switch (no real auth).
export const ROLES = {
  HQ: 'hq',     // Headquarters — enters & submits
  RCSM: 'rcsm', // Retail Client Services Manager — approves & exports
}

export const ROLE_LABELS = {
  [ROLES.HQ]: 'HQ',
  [ROLES.RCSM]: 'Retail Client Services Mgr',
}

// Workflow request types.
export const REQUEST_TYPES = {
  AUTHORIZE: 'authorize',
  WORKFLAG: 'workflag',
  SUPPORT: 'support',
  REPORTING: 'reporting',
}

export const REQUEST_TYPE_LABELS = {
  [REQUEST_TYPES.AUTHORIZE]: 'Authorize Items',
  [REQUEST_TYPES.WORKFLAG]: 'Home Location Check',
  [REQUEST_TYPES.SUPPORT]: 'Retail Support',
  [REQUEST_TYPES.REPORTING]: 'Reporting',
}

// Submission lifecycle (promotions + section requests share this spine).
export const SUBMISSION_STATUS = {
  DRAFT: 'draft',
  SUBMITTED: 'submitted',
  APPROVED: 'approved',
  REJECTED: 'rejected',
}

// Priority sub-types chosen from the launcher before entering a priority.
export const PRIORITY_TYPES = [
  { id: 'shelf', label: 'Shelf Conditions', desc: 'Verify the home shelf location of products' },
  { id: 'promo_display', label: 'Promotion / Display', desc: 'TPR, feature, display' },
]

export const PRIORITY_TYPE_LABELS = {
  shelf: 'Shelf Conditions',
  promo_display: 'Promotion / Display',
}

// Workflag reference values (mirrors the workflag-submission app).
export const REASON_CODES = ['M', 'Z', 'A', 'B', 'P', 'N']

export const FREQUENCIES = [
  { id: 'once', label: 'Work once' },
  { id: 'every_call', label: 'Every call' },
]

export const DATE_PRESETS = [2, 4, 6, 8] // weeks

// Fields collected when HQ enters a brand-new item in the Authorize wizard.
export const NEW_ITEM_FIELDS = [
  { key: 'upc', label: 'UPC', required: true },
  { key: 'description', label: 'Description', required: true },
  { key: 'brand', label: 'Brand', required: false },
  { key: 'category', label: 'Category', required: false },
  { key: 'family', label: 'Family', required: false },
  { key: 'size', label: 'Size', required: false },
  { key: 'pack', label: 'Pack', required: false },
]

// localStorage keys. Existing keys kept verbatim for back-compat.
export const STORAGE_KEYS = {
  schemaVersion: 'advsol_schema_version',
  promotions: 'advsol_promotions',
  userName: 'advsol_user_name',
  retailerChainData: 'advsol_retailer_chain_data',
  refDataFileName: 'advsol_ref_data_filename',
  apiKey: 'advsol_anthropic_api_key',
  session: 'advsol_session',
  rcsms: 'advsol_rcsms',
  requests: 'advsol_requests',
}

export const SCHEMA_VERSION = 2
