/**
 * Financial Calculations Utility
 * Centralized financial logic for project profitability and margins
 */

// Company-wide fixed costs per month
export const FIXED_COSTS_PER_MONTH = 262; // €262/maand

// Variable costs per client/project
export const VARIABLE_COST_PER_CLIENT = 12; // €12 per klant

/**
 * Calculate monthly fixed cost allocation per project
 * Distributes fixed costs across active projects
 */
export function calculateFixedCostAllocation(activeProjectCount: number): number {
  if (activeProjectCount === 0) return 0;
  return FIXED_COSTS_PER_MONTH / activeProjectCount;
}

/**
 * Calculate total cost for a project
 * Includes both fixed cost allocation and variable costs
 */
export function calculateProjectCosts(params: {
  projectRevenue: number;
  activeProjectCount: number;
  customVariableCost?: number;
}): {
  fixedCost: number;
  variableCost: number;
  totalCost: number;
} {
  const fixedCost = calculateFixedCostAllocation(params.activeProjectCount);
  const variableCost = params.customVariableCost ?? VARIABLE_COST_PER_CLIENT;
  const totalCost = fixedCost + variableCost;

  return {
    fixedCost,
    variableCost,
    totalCost,
  };
}

/**
 * Calculate project margin and profitability
 */
export function calculateProjectMargin(params: {
  revenue: number;
  fixedCost: number;
  variableCost: number;
}): {
  totalCost: number;
  grossProfit: number;
  marginPercentage: number;
  marginEuros: number;
} {
  const totalCost = params.fixedCost + params.variableCost;
  const grossProfit = params.revenue - totalCost;
  const marginPercentage = params.revenue > 0 ? (grossProfit / params.revenue) * 100 : 0;

  return {
    totalCost,
    grossProfit,
    marginPercentage,
    marginEuros: grossProfit,
  };
}

/**
 * Calculate monthly recurring costs
 */
export function calculateMonthlyRecurring(clientCount: number): {
  fixedCosts: number;
  variableCosts: number;
  totalMonthlyCost: number;
  costPerClient: number;
} {
  const variableCosts = clientCount * VARIABLE_COST_PER_CLIENT;
  const totalMonthlyCost = FIXED_COSTS_PER_MONTH + variableCosts;
  const costPerClient = clientCount > 0 ? totalMonthlyCost / clientCount : 0;

  return {
    fixedCosts: FIXED_COSTS_PER_MONTH,
    variableCosts,
    totalMonthlyCost,
    costPerClient,
  };
}

/**
 * Calculate break-even point
 * How much revenue needed to cover costs
 */
export function calculateBreakEven(params: {
  fixedCosts: number;
  variableCostPerUnit: number;
  pricePerUnit: number;
}): {
  breakEvenUnits: number;
  breakEvenRevenue: number;
} {
  const contributionMargin = params.pricePerUnit - params.variableCostPerUnit;
  
  if (contributionMargin <= 0) {
    return {
      breakEvenUnits: Infinity,
      breakEvenRevenue: Infinity,
    };
  }

  const breakEvenUnits = Math.ceil(params.fixedCosts / contributionMargin);
  const breakEvenRevenue = breakEvenUnits * params.pricePerUnit;

  return {
    breakEvenUnits,
    breakEvenRevenue,
  };
}

/**
 * Calculate profitability forecast for multiple months
 */
export function forecastProfitability(params: {
  monthlyRevenue: number;
  clientCount: number;
  months: number;
}): Array<{
  month: number;
  revenue: number;
  fixedCost: number;
  variableCost: number;
  totalCost: number;
  profit: number;
  marginPercentage: number;
}> {
  const forecast = [];

  for (let month = 1; month <= params.months; month++) {
    const revenue = params.monthlyRevenue * month;
    const fixedCost = FIXED_COSTS_PER_MONTH;
    const variableCost = VARIABLE_COST_PER_CLIENT * params.clientCount;
    const totalCost = fixedCost + variableCost;
    const profit = revenue - totalCost;
    const marginPercentage = revenue > 0 ? (profit / revenue) * 100 : 0;

    forecast.push({
      month,
      revenue,
      fixedCost,
      variableCost,
      totalCost,
      profit,
      marginPercentage,
    });
  }

  return forecast;
}

/**
 * Format currency for display
 */
export function formatCurrency(amount: number, currency: string = 'EUR'): string {
  return new Intl.NumberFormat('nl-NL', {
    style: 'currency',
    currency,
  }).format(amount);
}

/**
 * Format percentage for display
 */
export function formatPercentage(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`;
}
