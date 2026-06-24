// ─────────────────────────────────────────────
// SEED DATA for new collections (RCSMs + routing) and wizard reference data.
// Promotions / retailer-chain seed remain in App.jsx.
// ─────────────────────────────────────────────

// Retail Client Services Managers. `accounts` lists the chains each RCSM owns;
// HQ submissions route to the RCSM whose accounts include the submission's chain.
export const SEED_RCSMS = [
  { rcsmId: 'rcsm_dana', name: 'Dana Whitfield', accounts: ['Walmart Inc.', 'Target Corp.', 'Meijer Inc.'] },
  { rcsmId: 'rcsm_marcus', name: 'Marcus Lee', accounts: ['Kroger Co.', 'Albertsons Cos.'] },
  { rcsmId: 'rcsm_priya', name: 'Priya Nair', accounts: ['Publix Super Markets', 'Wegmans Food Markets'] },
]

// ── Wizard reference data (mirrors the workflag-submission team→client→… flow) ──

export const SEED_TEAMS = [
  { id: '1', name: 'Syndicated Grocery' },
  { id: '27', name: 'Hispanic Sales' },
]

// Clients (manufacturers) available per team.
export const SEED_CLIENTS = [
  { clientId: 'mars', name: 'Mars', teamId: '1' },
  { clientId: 'hormel', name: 'Hormel', teamId: '1' },
  { clientId: 'church_dwight', name: 'Church & Dwight', teamId: '1' },
  { clientId: 'hain', name: 'Hain Celestial', teamId: '1' },
  { clientId: 'planet_oat', name: 'Planet Oat', teamId: '27' },
  { clientId: 'tropicana', name: 'Tropicana', teamId: '27' },
]

// Stores. Chain hierarchy mirrors the DB columns:
// artsMasterChainName > artsSubMasterChainName > artsChainName.
// RCSM routing is by master chain (matches SEED_RCSMS.accounts).
export const SEED_STORES = [
  { storeId: '1023', name: 'Walmart Supercenter #1023', city: 'Bentonville', state: 'AR', artsMasterChainName: 'Walmart Inc.', artsSubMasterChainName: 'Walmart US', artsChainName: 'Walmart Supercenter' },
  { storeId: '1044', name: 'Walmart Supercenter #1044', city: 'Rogers', state: 'AR', artsMasterChainName: 'Walmart Inc.', artsSubMasterChainName: 'Walmart US', artsChainName: 'Walmart Supercenter' },
  { storeId: '1077', name: 'Walmart NM #1077', city: 'Fayetteville', state: 'AR', artsMasterChainName: 'Walmart Inc.', artsSubMasterChainName: 'Walmart US', artsChainName: 'Walmart Neighborhood Market' },
  { storeId: '2210', name: 'Target T-2210', city: 'Minneapolis', state: 'MN', artsMasterChainName: 'Target Corp.', artsSubMasterChainName: 'Target', artsChainName: 'Target' },
  { storeId: '2255', name: 'Target T-2255', city: 'St. Paul', state: 'MN', artsMasterChainName: 'Target Corp.', artsSubMasterChainName: 'Target', artsChainName: 'Target' },
  { storeId: '3301', name: 'Kroger #3301', city: 'Cincinnati', state: 'OH', artsMasterChainName: 'Kroger Co.', artsSubMasterChainName: 'Kroger Central', artsChainName: 'Kroger' },
  { storeId: '3318', name: 'Ralphs #3318', city: 'Los Angeles', state: 'CA', artsMasterChainName: 'Kroger Co.', artsSubMasterChainName: 'Kroger West', artsChainName: 'Ralphs' },
  { storeId: '3402', name: 'Fred Meyer #3402', city: 'Portland', state: 'OR', artsMasterChainName: 'Kroger Co.', artsSubMasterChainName: 'Kroger West', artsChainName: 'Fred Meyer' },
  { storeId: '4400', name: 'Publix #4400', city: 'Lakeland', state: 'FL', artsMasterChainName: 'Publix Super Markets', artsSubMasterChainName: 'Publix', artsChainName: 'Publix' },
  { storeId: '4412', name: 'Publix #4412', city: 'Orlando', state: 'FL', artsMasterChainName: 'Publix Super Markets', artsSubMasterChainName: 'Publix', artsChainName: 'Publix' },
  { storeId: '5500', name: 'Safeway #5500', city: 'Pleasanton', state: 'CA', artsMasterChainName: 'Albertsons Cos.', artsSubMasterChainName: 'Albertsons West', artsChainName: 'Safeway' },
  { storeId: '6600', name: 'Wegmans #6600', city: 'Rochester', state: 'NY', artsMasterChainName: 'Wegmans Food Markets', artsSubMasterChainName: 'Wegmans', artsChainName: 'Wegmans' },
  { storeId: '7700', name: 'Meijer #7700', city: 'Grand Rapids', state: 'MI', artsMasterChainName: 'Meijer Inc.', artsSubMasterChainName: 'Meijer', artsChainName: 'Meijer' },
]

// Existing authorized items (used by the Workflag wizard's item picker).
export const SEED_ITEMS = [
  { itemUpc: '040000000017', description: "M&M's Peanut Party Size 38oz", brand: 'Mars', category: 'Candy' },
  { itemUpc: '040000000024', description: "Snickers Share Size 3.29oz", brand: 'Mars', category: 'Candy' },
  { itemUpc: '037600000013', description: 'SPAM Classic 12oz', brand: 'Hormel', category: 'Canned Meat' },
  { itemUpc: '037600000020', description: 'Skippy Creamy Peanut Butter 40oz', brand: 'Hormel', category: 'Pantry' },
  { itemUpc: '033200000019', description: 'Arm & Hammer Plus OxiClean 100oz', brand: 'Church & Dwight', category: 'Laundry Care' },
  { itemUpc: '070000000015', description: 'Celestial Sleepytime Tea 20ct', brand: 'Hain Celestial', category: 'Tea & Coffee' },
  { itemUpc: '081300000012', description: 'Planet Oat Extra Creamy Oatmilk 64oz', brand: 'Planet Oat', category: 'Dairy Alternative' },
  { itemUpc: '048500000018', description: 'Tropicana Pure Premium OJ 89oz', brand: 'Tropicana', category: 'Beverages' },
]
