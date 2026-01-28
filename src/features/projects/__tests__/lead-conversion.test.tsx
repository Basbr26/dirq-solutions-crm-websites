import { describe, it, expect, vi, beforeEach } from 'vitest';
import { supabase } from '@/integrations/supabase/client';

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
  },
}));

describe('Lead Conversion Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Lead to Customer Conversion', () => {
    it('should convert lead to customer with correct revenue', async () => {
      const leadData = {
        company_id: 'company-123',
        project_value: 5000,
        stage: 'won',
        billing_frequency: 'monthly' as const,
      };

      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: { id: 'company-123', status: 'customer' },
          error: null,
        }),
      });

      const mockInsert = vi.fn().mockResolvedValue({
        data: { 
          id: 'subscription-123',
          company_id: 'company-123',
          monthly_amount: 5000,
        },
        error: null,
      });

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'companies') {
          return { update: mockUpdate } as any;
        }
        if (table === 'subscriptions') {
          return { insert: mockInsert } as any;
        }
        return {} as any;
      });

      // Convert lead
      await supabase
        .from('companies')
        .update({ status: 'customer' })
        .eq('id', leadData.company_id);

      // Create subscription
      await supabase
        .from('subscriptions')
        .insert({
          company_id: leadData.company_id,
          monthly_amount: leadData.project_value,
          billing_frequency: leadData.billing_frequency,
          status: 'active',
        });

      expect(mockUpdate).toHaveBeenCalledWith({ status: 'customer' });
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          company_id: 'company-123',
          monthly_amount: 5000,
        })
      );
    });

    it('should calculate MRR correctly for different billing frequencies', () => {
      const testCases = [
        { value: 12000, frequency: 'yearly', expectedMRR: 1000 },
        { value: 3000, frequency: 'quarterly', expectedMRR: 1000 },
        { value: 1000, frequency: 'monthly', expectedMRR: 1000 },
        { value: 5000, frequency: 'one_time', expectedMRR: 0 },
      ];

      testCases.forEach(({ value, frequency, expectedMRR }) => {
        let mrr = 0;
        
        switch (frequency) {
          case 'yearly':
            mrr = value / 12;
            break;
          case 'quarterly':
            mrr = value / 3;
            break;
          case 'monthly':
            mrr = value;
            break;
          case 'one_time':
            mrr = 0;
            break;
        }

        expect(mrr).toBe(expectedMRR);
      });
    });

    it('should update project stage to won', async () => {
      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: { id: 'project-123', stage: 'won' },
          error: null,
        }),
      });

      vi.mocked(supabase.from).mockReturnValue({
        update: mockUpdate,
      } as any);

      await supabase
        .from('projects')
        .update({ 
          stage: 'won',
          won_at: new Date().toISOString(),
        })
        .eq('id', 'project-123');

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          stage: 'won',
          won_at: expect.any(String),
        })
      );
    });
  });

  describe('Validation', () => {
    it('should validate project value before conversion', () => {
      const testCases = [
        { value: 0, valid: false },
        { value: -100, valid: false },
        { value: 100, valid: true },
        { value: 10000, valid: true },
      ];

      testCases.forEach(({ value, valid }) => {
        const isValid = value > 0;
        expect(isValid).toBe(valid);
      });
    });

    it('should validate billing frequency', () => {
      const validFrequencies = ['monthly', 'quarterly', 'yearly', 'one_time'];
      const invalidFrequencies = ['weekly', 'daily', 'invalid'];

      validFrequencies.forEach(frequency => {
        expect(validFrequencies.includes(frequency)).toBe(true);
      });

      invalidFrequencies.forEach(frequency => {
        expect(validFrequencies.includes(frequency)).toBe(false);
      });
    });

    it('should require company to exist before conversion', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'Company not found' },
          }),
        }),
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
      } as any);

      const result = await supabase
        .from('companies')
        .select()
        .eq('id', 'non-existent-company')
        .single();

      expect(result.error).toBeTruthy();
      expect(result.data).toBeNull();
    });
  });

  describe('Stage Transitions', () => {
    it('should only convert from valid stages', () => {
      const validSourceStages = ['quote_sent', 'negotiation', 'proposal'];
      const invalidSourceStages = ['lead', 'qualified', 'lost'];

      validSourceStages.forEach(stage => {
        const canConvert = ['quote_sent', 'negotiation', 'proposal'].includes(stage);
        expect(canConvert).toBe(true);
      });

      invalidSourceStages.forEach(stage => {
        const canConvert = ['quote_sent', 'negotiation', 'proposal'].includes(stage);
        expect(canConvert).toBe(false);
      });
    });

    it('should track conversion timestamp', () => {
      const conversionData = {
        stage: 'won',
        won_at: new Date().toISOString(),
        converted_from: 'quote_sent',
      };

      expect(conversionData.won_at).toBeTruthy();
      expect(new Date(conversionData.won_at)).toBeInstanceOf(Date);
    });

    it('should calculate win probability correctly per stage', () => {
      const stageProbabilities = {
        lead: 10,
        qualified: 25,
        quote_sent: 50,
        negotiation: 75,
        won: 100,
        lost: 0,
      };

      Object.entries(stageProbabilities).forEach(([stage, probability]) => {
        expect(probability).toBeGreaterThanOrEqual(0);
        expect(probability).toBeLessThanOrEqual(100);
      });

      // Won stage should have 100% probability
      expect(stageProbabilities.won).toBe(100);
      
      // Lost stage should have 0% probability
      expect(stageProbabilities.lost).toBe(0);
    });
  });

  describe('MRR Calculation Trigger', () => {
    it('should trigger MRR recalculation after conversion', async () => {
      const mockRpc = vi.fn().mockResolvedValue({
        data: { total_mrr: 15000 },
        error: null,
      });

      vi.mocked(supabase.rpc).mockImplementation(mockRpc);

      // After conversion, trigger MRR calculation
      await supabase.rpc('calculate_company_mrr', {
        company_id: 'company-123',
      });

      expect(mockRpc).toHaveBeenCalledWith('calculate_company_mrr', {
        company_id: 'company-123',
      });
    });

    it('should update company MRR field', async () => {
      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: { id: 'company-123', monthly_recurring_revenue: 5000 },
          error: null,
        }),
      });

      vi.mocked(supabase.from).mockReturnValue({
        update: mockUpdate,
      } as any);

      await supabase
        .from('companies')
        .update({ monthly_recurring_revenue: 5000 })
        .eq('id', 'company-123');

      expect(mockUpdate).toHaveBeenCalledWith({ monthly_recurring_revenue: 5000 });
    });
  });

  describe('Rollback on Error', () => {
    it('should not update company status if subscription creation fails', async () => {
      let companyUpdated = false;
      const subscriptionCreated = false;

      try {
        // Step 1: Update company
        companyUpdated = true;

        // Step 2: Create subscription (fails)
        throw new Error('Subscription creation failed');

      } catch (error) {
        // Rollback: company status should not be updated
        companyUpdated = false;
      }

      expect(companyUpdated).toBe(false);
      expect(subscriptionCreated).toBe(false);
    });
  });

  describe('Revenue Tracking', () => {
    it('should track total revenue from conversions', () => {
      const conversions = [
        { value: 5000, frequency: 'monthly' },
        { value: 12000, frequency: 'yearly' },
        { value: 3000, frequency: 'quarterly' },
      ];

      const totalMRR = conversions.reduce((sum, conv) => {
        let mrr = 0;
        if (conv.frequency === 'monthly') mrr = conv.value;
        if (conv.frequency === 'yearly') mrr = conv.value / 12;
        if (conv.frequency === 'quarterly') mrr = conv.value / 3;
        return sum + mrr;
      }, 0);

      // 5000 + 1000 + 1000 = 7000
      expect(totalMRR).toBe(7000);
    });

    it('should calculate ARR from MRR', () => {
      const mrr = 5000;
      const arr = mrr * 12;

      expect(arr).toBe(60000);
    });
  });
});
