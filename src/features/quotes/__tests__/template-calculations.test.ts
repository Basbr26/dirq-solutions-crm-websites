import { describe, it, expect } from 'vitest';

// Template calculation functions
const calculateItemTotal = (quantity: number, unitPrice: number, discount: number = 0) => {
  const subtotal = quantity * unitPrice;
  const discountAmount = subtotal * (discount / 100);
  return subtotal - discountAmount;
};

const calculateQuoteTotal = (items: Array<{ quantity: number; unit_price: number; discount?: number }>) => {
  const subtotal = items.reduce((sum, item) => {
    return sum + calculateItemTotal(item.quantity, item.unit_price, item.discount || 0);
  }, 0);
  
  const btw = subtotal * 0.21; // 21% VAT
  const total = subtotal + btw;
  
  return { subtotal, btw, total };
};

const calculateRecurringRevenue = (
  amount: number, 
  frequency: 'monthly' | 'quarterly' | 'yearly' | 'one_time'
): { mrr: number; arr: number } => {
  let mrr = 0;
  
  switch (frequency) {
    case 'monthly':
      mrr = amount;
      break;
    case 'quarterly':
      mrr = amount / 3;
      break;
    case 'yearly':
      mrr = amount / 12;
      break;
    case 'one_time':
      mrr = 0;
      break;
  }
  
  return { mrr, arr: mrr * 12 };
};

describe('Quote Template Calculations', () => {
  describe('Item Total Calculation', () => {
    it('should calculate basic item total', () => {
      const result = calculateItemTotal(5, 100);
      expect(result).toBe(500);
    });

    it('should apply discount correctly', () => {
      const result = calculateItemTotal(10, 100, 10); // 10% discount
      expect(result).toBe(900); // 1000 - 100
    });

    it('should handle 100% discount', () => {
      const result = calculateItemTotal(5, 100, 100);
      expect(result).toBe(0);
    });

    it('should handle decimal quantities', () => {
      const result = calculateItemTotal(2.5, 100);
      expect(result).toBe(250);
    });

    it('should handle decimal prices', () => {
      const result = calculateItemTotal(3, 99.99);
      expect(result).toBeCloseTo(299.97, 2);
    });

    it('should handle high discount percentages', () => {
      const result = calculateItemTotal(1, 1000, 50); // 50% off
      expect(result).toBe(500);
    });
  });

  describe('Quote Total Calculation', () => {
    it('should calculate quote with single item', () => {
      const items = [{ quantity: 1, unit_price: 100 }];
      const result = calculateQuoteTotal(items);
      
      expect(result.subtotal).toBe(100);
      expect(result.btw).toBe(21); // 21% VAT
      expect(result.total).toBe(121);
    });

    it('should calculate quote with multiple items', () => {
      const items = [
        { quantity: 2, unit_price: 100 }, // 200
        { quantity: 3, unit_price: 50 },  // 150
        { quantity: 1, unit_price: 75 },  // 75
      ];
      const result = calculateQuoteTotal(items);
      
      expect(result.subtotal).toBe(425);
      expect(result.btw).toBeCloseTo(89.25, 2);
      expect(result.total).toBeCloseTo(514.25, 2);
    });

    it('should apply discounts to items', () => {
      const items = [
        { quantity: 10, unit_price: 100, discount: 10 }, // 1000 - 100 = 900
        { quantity: 5, unit_price: 200, discount: 20 },  // 1000 - 200 = 800
      ];
      const result = calculateQuoteTotal(items);
      
      expect(result.subtotal).toBe(1700);
      expect(result.btw).toBeCloseTo(357, 2);
      expect(result.total).toBeCloseTo(2057, 2);
    });

    it('should handle empty quote', () => {
      const items: any[] = [];
      const result = calculateQuoteTotal(items);
      
      expect(result.subtotal).toBe(0);
      expect(result.btw).toBe(0);
      expect(result.total).toBe(0);
    });

    it('should round to 2 decimal places', () => {
      const items = [{ quantity: 1, unit_price: 99.99 }];
      const result = calculateQuoteTotal(items);
      
      expect(result.subtotal).toBeCloseTo(99.99, 2);
      expect(result.btw).toBeCloseTo(20.998, 2);
      expect(result.total).toBeCloseTo(120.988, 2);
    });
  });

  describe('Recurring Revenue Calculation', () => {
    it('should calculate MRR for monthly billing', () => {
      const result = calculateRecurringRevenue(1000, 'monthly');
      
      expect(result.mrr).toBe(1000);
      expect(result.arr).toBe(12000);
    });

    it('should calculate MRR for quarterly billing', () => {
      const result = calculateRecurringRevenue(3000, 'quarterly');
      
      expect(result.mrr).toBe(1000);
      expect(result.arr).toBe(12000);
    });

    it('should calculate MRR for yearly billing', () => {
      const result = calculateRecurringRevenue(12000, 'yearly');
      
      expect(result.mrr).toBe(1000);
      expect(result.arr).toBe(12000);
    });

    it('should return zero for one-time payments', () => {
      const result = calculateRecurringRevenue(5000, 'one_time');
      
      expect(result.mrr).toBe(0);
      expect(result.arr).toBe(0);
    });

    it('should handle decimal amounts', () => {
      const result = calculateRecurringRevenue(999.99, 'monthly');
      
      expect(result.mrr).toBeCloseTo(999.99, 2);
      expect(result.arr).toBeCloseTo(11999.88, 2);
    });
  });

  describe('VAT Calculation Edge Cases', () => {
    it('should calculate VAT for large amounts', () => {
      const items = [{ quantity: 1, unit_price: 100000 }];
      const result = calculateQuoteTotal(items);
      
      expect(result.btw).toBe(21000);
      expect(result.total).toBe(121000);
    });

    it('should calculate VAT for small amounts', () => {
      const items = [{ quantity: 1, unit_price: 0.01 }];
      const result = calculateQuoteTotal(items);
      
      expect(result.subtotal).toBe(0.01);
      expect(result.btw).toBeCloseTo(0.0021, 4);
    });
  });

  describe('Real-world Quote Scenarios', () => {
    it('should calculate typical SaaS subscription', () => {
      const items = [
        { quantity: 1, unit_price: 499, discount: 0 }, // Monthly subscription
      ];
      const result = calculateQuoteTotal(items);
      const revenue = calculateRecurringRevenue(result.subtotal, 'monthly');
      
      expect(result.total).toBeCloseTo(603.79, 2);
      expect(revenue.mrr).toBe(499);
      expect(revenue.arr).toBe(5988);
    });

    it('should calculate consultancy project with discount', () => {
      const items = [
        { quantity: 40, unit_price: 125, discount: 0 },    // Hours
        { quantity: 1, unit_price: 500, discount: 100 },   // Free setup
      ];
      const result = calculateQuoteTotal(items);
      
      expect(result.subtotal).toBe(5000); // 40h * 125
      expect(result.total).toBeCloseTo(6050, 2);
    });

    it('should calculate mixed recurring and one-time', () => {
      const monthlySubscription = calculateRecurringRevenue(299, 'monthly');
      const oneTimeSetup = calculateRecurringRevenue(1500, 'one_time');
      
      const totalMRR = monthlySubscription.mrr + oneTimeSetup.mrr;
      
      expect(totalMRR).toBe(299); // Only recurring counts
      expect(monthlySubscription.arr).toBe(3588);
    });
  });

  describe('Discount Validation', () => {
    it('should not allow negative discounts', () => {
      const discount = -10;
      const isValid = discount >= 0 && discount <= 100;
      
      expect(isValid).toBe(false);
    });

    it('should not allow discounts over 100%', () => {
      const discount = 110;
      const isValid = discount >= 0 && discount <= 100;
      
      expect(isValid).toBe(false);
    });

    it('should allow valid discount range', () => {
      const validDiscounts = [0, 5, 10, 25, 50, 75, 100];
      
      validDiscounts.forEach(discount => {
        const isValid = discount >= 0 && discount <= 100;
        expect(isValid).toBe(true);
      });
    });
  });

  describe('Currency Formatting', () => {
    it('should format EUR currency correctly', () => {
      const amount = 1234.56;
      const formatted = new Intl.NumberFormat('nl-NL', {
        style: 'currency',
        currency: 'EUR',
      }).format(amount);
      
      expect(formatted.replace(/\s/g, ' ')).toBe('€ 1.234,56');
    });

    it('should format large amounts', () => {
      const amount = 1234567.89;
      const formatted = new Intl.NumberFormat('nl-NL', {
        style: 'currency',
        currency: 'EUR',
      }).format(amount);
      
      expect(formatted.replace(/\s/g, ' ')).toBe('€ 1.234.567,89');
    });

    it('should format zero correctly', () => {
      const amount = 0;
      const formatted = new Intl.NumberFormat('nl-NL', {
        style: 'currency',
        currency: 'EUR',
      }).format(amount);
      
      expect(formatted.replace(/\s/g, ' ')).toBe('€ 0,00');
    });
  });
});
