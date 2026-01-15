import { describe, it, expect } from 'vitest';
import {
  calculateFixedCostAllocation,
  calculateProjectCosts,
  calculateProjectMargin,
  calculateMonthlyRecurring,
  calculateBreakEven,
  formatCurrency,
  formatPercentage,
  FIXED_COSTS_PER_MONTH,
  VARIABLE_COST_PER_CLIENT,
} from '../financialCalculations';

describe('financialCalculations', () => {
  describe('calculateFixedCostAllocation', () => {
    it('should calculate fixed cost allocation correctly', () => {
      const result = calculateFixedCostAllocation(10);
      expect(result).toBe(FIXED_COSTS_PER_MONTH / 10);
      expect(result).toBe(26.2);
    });

    it('should handle single project', () => {
      const result = calculateFixedCostAllocation(1);
      expect(result).toBe(FIXED_COSTS_PER_MONTH);
    });

    it('should handle zero projects gracefully', () => {
      const result = calculateFixedCostAllocation(0);
      expect(result).toBe(0);
    });
  });

  describe('calculateProjectCosts', () => {
    it('should calculate project costs correctly', () => {
      const result = calculateProjectCosts({
        projectRevenue: 5000,
        activeProjectCount: 5,
      });

      expect(result.fixedCost).toBe(52.4); // 262 / 5
      expect(result.variableCost).toBe(VARIABLE_COST_PER_CLIENT);
      expect(result.totalCost).toBe(64.4); // 52.4 + 12
    });

    it('should handle custom variable cost', () => {
      const result = calculateProjectCosts({
        projectRevenue: 3000,
        activeProjectCount: 1,
        customVariableCost: 50,
      });

      expect(result.variableCost).toBe(50);
      expect(result.totalCost).toBe(FIXED_COSTS_PER_MONTH + 50);
    });
  });

  describe('calculateProjectMargin', () => {
    it('should calculate positive margin correctly', () => {
      const result = calculateProjectMargin({
        revenue: 5000,
        fixedCost: 52.4,
        variableCost: 12,
      });

      expect(result.totalCost).toBe(64.4);
      expect(result.grossProfit).toBe(4935.6); // 5000 - 64.4
      expect(result.marginPercentage).toBeCloseTo(98.71, 1);
    });

    it('should calculate negative margin for loss', () => {
      const result = calculateProjectMargin({
        revenue: 50,
        fixedCost: 262,
        variableCost: 12,
      });

      expect(result.grossProfit).toBeLessThan(0);
      expect(result.marginPercentage).toBeLessThan(0);
    });

    it('should handle zero revenue', () => {
      const result = calculateProjectMargin({
        revenue: 0,
        fixedCost: 100,
        variableCost: 50,
      });

      expect(result.marginPercentage).toBe(0);
      expect(result.grossProfit).toBe(-150);
    });
  });

  describe('calculateMonthlyRecurring', () => {
    it('should calculate monthly recurring costs correctly', () => {
      const result = calculateMonthlyRecurring(10);

      expect(result.fixedCosts).toBe(262);
      expect(result.variableCosts).toBe(120); // 10 * 12
      expect(result.totalMonthlyCost).toBe(382); // 262 + 120
      expect(result.costPerClient).toBe(38.2);
    });

    it('should handle single client', () => {
      const result = calculateMonthlyRecurring(1);

      expect(result.fixedCosts).toBe(262);
      expect(result.variableCosts).toBe(12);
      expect(result.totalMonthlyCost).toBe(274); // 262 + 12
      expect(result.costPerClient).toBe(274);
    });

    it('should handle zero clients', () => {
      const result = calculateMonthlyRecurring(0);

      expect(result.fixedCosts).toBe(FIXED_COSTS_PER_MONTH);
      expect(result.variableCosts).toBe(0);
      expect(result.totalMonthlyCost).toBe(FIXED_COSTS_PER_MONTH);
      expect(result.costPerClient).toBe(0);
    });
  });

  describe('calculateBreakEven', () => {
    it('should calculate break-even units correctly', () => {
      const result = calculateBreakEven({
        fixedCosts: FIXED_COSTS_PER_MONTH,
        pricePerUnit: 119,
        variableCostPerUnit: VARIABLE_COST_PER_CLIENT,
      });

      // Break-even: 262 / (119 - 12) = 2.45 → round up to 3
      expect(result.breakEvenUnits).toBe(3);
      expect(result.breakEvenRevenue).toBe(357);
    });

    it('should handle custom pricing', () => {
      const result = calculateBreakEven({
        fixedCosts: 1000,
        pricePerUnit: 200,
        variableCostPerUnit: 50,
      });

      // 1000 / (200 - 50) = 6.67 → round up to 7
      expect(result.breakEvenUnits).toBe(7);
    });
  });

  describe('formatCurrency', () => {
    it('should format EUR correctly', () => {
      // Note: Intl.NumberFormat uses non-breaking space (U+00A0)
      expect(formatCurrency(1234.56)).toBe('€\u00A01.234,56');
      expect(formatCurrency(1234.56, 'EUR')).toBe('€\u00A01.234,56');
    });

    it('should handle whole numbers', () => {
      expect(formatCurrency(1000)).toBe('€\u00A01.000,00');
    });

    it('should handle negative amounts', () => {
      expect(formatCurrency(-500)).toBe('€\u00A0-500,00');
    });

    it('should handle zero', () => {
      expect(formatCurrency(0)).toBe('€\u00A00,00');
    });

    it('should handle large numbers', () => {
      expect(formatCurrency(1234567.89)).toBe('€\u00A01.234.567,89');
    });
  });

  describe('formatPercentage', () => {
    it('should format percentage with 1 decimal by default', () => {
      expect(formatPercentage(25.5)).toBe('25.5%');
    });

    it('should format percentage with custom decimals', () => {
      expect(formatPercentage(25.567, 2)).toBe('25.57%');
      expect(formatPercentage(25.567, 0)).toBe('26%');
    });

    it('should handle negative percentages', () => {
      expect(formatPercentage(-10.5)).toBe('-10.5%');
    });

    it('should handle zero', () => {
      expect(formatPercentage(0)).toBe('0.0%');
    });

    it('should handle whole numbers', () => {
      expect(formatPercentage(50)).toBe('50.0%');
    });
  });
});
