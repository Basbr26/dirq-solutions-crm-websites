/**
 * PRICING CONFIGURATION - PROJECT VELOCITY PHASE 1
 * Type-safe pricing architecture for €240K ARR goal
 * 
 * Usage:
 * - Import FINANCE_PACKAGES for package selection
 * - Use calculateProjectTotal() for accurate quotes
 * - DB constraint validates against VALID_PACKAGE_IDS
 */

export const FINANCE_PACKAGES = {
  STARTER: {
    id: 'finance_starter' as const,
    name: 'Basis Finance Website',
    price: 799.95,
    description: 'Professionele one-pager + contactformulier.',
    features: ['Responsive Design', 'Basis SEO', 'Contactformulier', 'WhatsApp']
  },
  GROWTH: {
    id: 'finance_growth' as const,
    name: 'Premium Finance Portal',
    price: 1299.95,
    description: 'Volledige kantoorwebsite met team & afspraken.',
    features: ['Multi-page', 'Team sectie', 'Calendly', 'Advanced SEO']
  }
} as const;

export const RECURRING_SERVICES = {
  MAINTENANCE: {
    id: 'maint_basic' as const,
    name: 'Hosting & Security Suite',
    price: 50.00,
    interval: 'monthly' as const,
    description: 'Updates, hosting, backups, klein onderhoud.'
  }
} as const;

export const ADD_ONS = {
  LOGO: { id: 'addon_logo' as const, name: 'Logo Design', price: 350.00 },
  RUSH: { id: 'addon_rush' as const, name: 'Rush (7d)', price: 300.00 },
  PAGES: { id: 'addon_page' as const, name: 'Extra Pagina', price: 150.00 }
} as const;

// ============================================================
// TYPE-SAFE IDs (matches database constraints)
// ============================================================
export type PackageId = typeof FINANCE_PACKAGES[keyof typeof FINANCE_PACKAGES]['id'];
export type AddonId = typeof ADD_ONS[keyof typeof ADD_ONS]['id'];

// Export voor database inserts (validates against DB CHECK constraint)
export const VALID_PACKAGE_IDS = [
  FINANCE_PACKAGES.STARTER.id,
  FINANCE_PACKAGES.GROWTH.id
] as const;

export const VALID_ADDON_IDS = Object.values(ADD_ONS).map(a => a.id);

// ============================================================
// CALCULATION HELPER (matches database calculated_total)
// ============================================================
/**
 * Calculate total project cost matching database logic
 * 
 * @param packageKey - STARTER or GROWTH
 * @param addonKeys - Array of addon keys (LOGO, RUSH, PAGES)
 * @param customMonthlyFee - Override default monthly fee
 * @returns Object with oneTime, monthly totals and IDs for DB insert
 * 
 * @example
 * const quote = calculateProjectTotal('GROWTH', ['LOGO', 'RUSH'], 75);
 * // { oneTime: 1949.95, monthly: 75, packageId: 'finance_growth', addonIds: ['addon_logo', 'addon_rush'] }
 */
export function calculateProjectTotal(
  packageKey: keyof typeof FINANCE_PACKAGES,
  addonKeys: (keyof typeof ADD_ONS)[] = [],
  customMonthlyFee = 0
): { 
  oneTime: number; 
  monthly: number; 
  packageId: string; 
  addonIds: string[] 
} {
  const pkg = FINANCE_PACKAGES[packageKey];
  const addonsTotal = addonKeys.reduce(
    (sum, key) => sum + ADD_ONS[key].price, 
    0
  );
  
  return {
    oneTime: Number((pkg.price + addonsTotal).toFixed(2)),
    monthly: customMonthlyFee || RECURRING_SERVICES.MAINTENANCE.price,
    packageId: pkg.id,
    addonIds: addonKeys.map(k => ADD_ONS[k].id)
  };
}

// ============================================================
// ARR CALCULATION HELPERS
// ============================================================
/**
 * Calculate Annual Recurring Revenue from monthly fee
 */
export function calculateARR(monthlyFee: number): number {
  return Number((monthlyFee * 12).toFixed(2));
}

/**
 * Calculate MRR from company total
 */
export function calculateMRR(companyTotalMRR: number): number {
  return Number(companyTotalMRR.toFixed(2));
}

/**
 * Project LTV (Lifetime Value) calculation
 * Assumes 24-month average customer lifetime
 */
export function calculateProjectLTV(monthlyFee: number, oneTimeFee: number): number {
  const expectedLifetimeMonths = 24;
  return Number((monthlyFee * expectedLifetimeMonths + oneTimeFee).toFixed(2));
}

// ============================================================
// EXAMPLE QUOTES (for testing/demo)
// ============================================================
export const EXAMPLE_QUOTES = {
  BASIC_FINANCE: calculateProjectTotal('STARTER', [], 50),
  // { oneTime: 799.95, monthly: 50, packageId: 'finance_starter', addonIds: [] }
  
  PREMIUM_WITH_LOGO: calculateProjectTotal('GROWTH', ['LOGO'], 75),
  // { oneTime: 1649.95, monthly: 75, packageId: 'finance_growth', addonIds: ['addon_logo'] }
  
  RUSH_FULL_PACKAGE: calculateProjectTotal('GROWTH', ['LOGO', 'RUSH', 'PAGES'], 100),
  // { oneTime: 2099.95, monthly: 100, packageId: 'finance_growth', addonIds: ['addon_logo', 'addon_rush', 'addon_page'] }
} as const;
