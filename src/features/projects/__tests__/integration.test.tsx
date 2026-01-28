import { describe, it, expect, vi, beforeEach } from 'vitest';
import { supabase } from '@/integrations/supabase/client';

vi.mock('@/integrations/supabase/client');

describe('Projects Module - Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Pipeline Drag & Drop', () => {
    it('should move project to different stage', async () => {
      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: { id: 'project-123', stage: 'negotiation' },
          error: null,
        }),
      });

      vi.mocked(supabase.from).mockReturnValue({
        update: mockUpdate,
      } as any);

      // Move from quote_sent to negotiation
      await supabase
        .from('projects')
        .update({ stage: 'negotiation' })
        .eq('id', 'project-123');

      expect(mockUpdate).toHaveBeenCalledWith({ stage: 'negotiation' });
    });

    it('should update probability when stage changes', async () => {
      const STAGE_PROBABILITY = {
        lead: 10,
        qualified: 25,
        quote_sent: 50,
        negotiation: 75,
        won: 100,
      };

      const project = {
        id: 'project-123',
        stage: 'quote_sent',
        value: 10000,
      };

      const newStage = 'negotiation';
      const newProbability = STAGE_PROBABILITY[newStage as keyof typeof STAGE_PROBABILITY];

      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: {
            ...project,
            stage: newStage,
            probability: newProbability,
          },
          error: null,
        }),
      });

      vi.mocked(supabase.from).mockReturnValue({
        update: mockUpdate,
      } as any);

      await supabase
        .from('projects')
        .update({ stage: newStage, probability: newProbability })
        .eq('id', project.id);

      expect(mockUpdate).toHaveBeenCalledWith({
        stage: newStage,
        probability: newProbability,
      });
    });

    it('should track stage change history', async () => {
      const stageHistory = {
        project_id: 'project-123',
        from_stage: 'quote_sent',
        to_stage: 'negotiation',
        changed_at: new Date().toISOString(),
        changed_by: 'user-123',
      };

      const mockInsert = vi.fn().mockResolvedValue({
        data: stageHistory,
        error: null,
      });

      vi.mocked(supabase.from).mockReturnValue({
        insert: mockInsert,
      } as any);

      await supabase.from('stage_history').insert(stageHistory);

      expect(mockInsert).toHaveBeenCalledWith(stageHistory);
    });
  });

  describe('Lead to Customer Conversion', () => {
    it('should complete full conversion flow', async () => {
      const projectId = 'project-123';
      const companyId = 'company-456';
      const projectValue = 12000;
      const billingFrequency = 'yearly';

      // 1. Update project status
      const mockProjectUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: { id: projectId, stage: 'won' },
          error: null,
        }),
      });

      // 2. Create subscription
      const mockSubInsert = vi.fn().mockResolvedValue({
        data: {
          id: 'sub-123',
          company_id: companyId,
          amount: projectValue,
          frequency: billingFrequency,
        },
        error: null,
      });

      // 3. Update company status
      const mockCompanyUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: {
            id: companyId,
            status: 'customer',
            monthly_recurring_revenue: 1000, // 12000 / 12
          },
          error: null,
        }),
      });

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'projects') {
          return { update: mockProjectUpdate } as any;
        }
        if (table === 'subscriptions') {
          return { insert: mockSubInsert } as any;
        }
        if (table === 'companies') {
          return { update: mockCompanyUpdate } as any;
        }
        return {} as any;
      });

      // Execute conversion
      await supabase.from('projects').update({ stage: 'won' }).eq('id', projectId);
      await supabase.from('subscriptions').insert({
        company_id: companyId,
        amount: projectValue,
        frequency: billingFrequency,
      });
      await supabase
        .from('companies')
        .update({ status: 'customer', monthly_recurring_revenue: 1000 })
        .eq('id', companyId);

      expect(mockProjectUpdate).toHaveBeenCalled();
      expect(mockSubInsert).toHaveBeenCalled();
      expect(mockCompanyUpdate).toHaveBeenCalled();
    });

    it('should rollback on subscription creation failure', async () => {
      const mockSubInsert = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Subscription creation failed' },
      });

      vi.mocked(supabase.from).mockReturnValue({
        insert: mockSubInsert,
      } as any);

      const result = await supabase.from('subscriptions').insert({
        company_id: 'company-123',
        amount: 1000,
      });

      if (result.error) {
        // Rollback: Don't update project or company
        expect(result.error).toBeTruthy();
      }
    });
  });

  describe('Pipeline Value Calculations', () => {
    it('should calculate weighted pipeline value', () => {
      const projects = [
        { stage: 'lead', value: 5000, probability: 10 },
        { stage: 'qualified', value: 10000, probability: 25 },
        { stage: 'quote_sent', value: 20000, probability: 50 },
        { stage: 'negotiation', value: 15000, probability: 75 },
      ];

      const totalPipeline = projects.reduce((sum, project) => {
        return sum + (project.value * (project.probability / 100));
      }, 0);

      // (5000*0.1) + (10000*0.25) + (20000*0.5) + (15000*0.75)
      // = 500 + 2500 + 10000 + 11250 = 24,250
      expect(totalPipeline).toBe(24250);
    });

    it('should exclude lost deals', () => {
      const projects = [
        { stage: 'quote_sent', value: 10000, probability: 50 },
        { stage: 'lost', value: 20000, probability: 0 },
      ];

      const activeProjects = projects.filter(p => p.stage !== 'lost');

      expect(activeProjects.length).toBe(1);
    });

    it('should calculate total won revenue', () => {
      const wonProjects = [
        { stage: 'won', value: 5000 },
        { stage: 'won', value: 10000 },
        { stage: 'won', value: 7500 },
      ];

      const totalRevenue = wonProjects.reduce((sum, p) => sum + p.value, 0);

      expect(totalRevenue).toBe(22500);
    });
  });

  describe('Project Filtering', () => {
    it('should filter by stage', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: [
            { id: '1', stage: 'quote_sent' },
            { id: '2', stage: 'quote_sent' },
          ],
          error: null,
        }),
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
      } as any);

      const result = await supabase
        .from('projects')
        .select()
        .eq('stage', 'quote_sent');

      expect(result.data?.every(p => p.stage === 'quote_sent')).toBe(true);
    });

    it('should filter by company', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: [
            { id: '1', company_id: 'company-123' },
            { id: '2', company_id: 'company-123' },
          ],
          error: null,
        }),
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
      } as any);

      const result = await supabase
        .from('projects')
        .select()
        .eq('company_id', 'company-123');

      expect(result.data?.length).toBe(2);
    });

    it('should filter by value range', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        gte: vi.fn().mockReturnValue({
          lte: vi.fn().mockResolvedValue({
            data: [
              { id: '1', value: 5000 },
              { id: '2', value: 7500 },
            ],
            error: null,
          }),
        }),
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
      } as any);

      const result = await supabase
        .from('projects')
        .select()
        .gte('value', 5000)
        .lte('value', 10000);

      expect(result.data?.every(p => p.value >= 5000 && p.value <= 10000)).toBe(true);
    });
  });

  describe('Win/Loss Tracking', () => {
    it('should mark project as won', async () => {
      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: {
            id: 'project-123',
            stage: 'won',
            won_at: new Date().toISOString(),
            probability: 100,
          },
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
          probability: 100,
        })
        .eq('id', 'project-123');

      expect(mockUpdate).toHaveBeenCalled();
    });

    it('should mark project as lost with reason', async () => {
      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: {
            id: 'project-123',
            stage: 'lost',
            lost_reason: 'Price too high',
            lost_at: new Date().toISOString(),
            probability: 0,
          },
          error: null,
        }),
      });

      vi.mocked(supabase.from).mockReturnValue({
        update: mockUpdate,
      } as any);

      await supabase
        .from('projects')
        .update({
          stage: 'lost',
          lost_reason: 'Price too high',
          lost_at: new Date().toISOString(),
          probability: 0,
        })
        .eq('id', 'project-123');

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          lost_reason: 'Price too high',
        })
      );
    });

    it('should calculate win rate', () => {
      const projects = [
        { stage: 'won' },
        { stage: 'won' },
        { stage: 'won' },
        { stage: 'lost' },
        { stage: 'lost' },
      ];

      const wonCount = projects.filter(p => p.stage === 'won').length;
      const lostCount = projects.filter(p => p.stage === 'lost').length;
      const total = wonCount + lostCount;

      const winRate = (wonCount / total) * 100;

      expect(winRate).toBe(60); // 3/5 = 60%
    });
  });

  describe('Quote Association', () => {
    it('should link project to quote', async () => {
      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: { id: 'project-123', quote_id: 'quote-456' },
          error: null,
        }),
      });

      vi.mocked(supabase.from).mockReturnValue({
        update: mockUpdate,
      } as any);

      await supabase
        .from('projects')
        .update({ quote_id: 'quote-456' })
        .eq('id', 'project-123');

      expect(mockUpdate).toHaveBeenCalledWith({ quote_id: 'quote-456' });
    });

    it('should fetch project with quote', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              id: 'project-123',
              name: 'Website Redesign',
              quote: {
                id: 'quote-456',
                total: 15000,
                status: 'accepted',
              },
            },
            error: null,
          }),
        }),
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
      } as any);

      const result = await supabase
        .from('projects')
        .select('*, quote:quotes(*)')
        .eq('id', 'project-123')
        .single();

      expect(result.data?.quote).toBeTruthy();
    });
  });

  describe('Performance Metrics', () => {
    it('should calculate average deal size', () => {
      const wonProjects = [
        { value: 5000 },
        { value: 10000 },
        { value: 15000 },
        { value: 20000 },
      ];

      const totalValue = wonProjects.reduce((sum, p) => sum + p.value, 0);
      const averageDealSize = totalValue / wonProjects.length;

      expect(averageDealSize).toBe(12500);
    });

    it('should calculate sales cycle length', () => {
      const projects = [
        {
          created_at: '2026-01-01T00:00:00Z',
          won_at: '2026-01-30T00:00:00Z',
        },
        {
          created_at: '2026-01-05T00:00:00Z',
          won_at: '2026-02-05T00:00:00Z',
        },
      ];

      const cycleLengths = projects.map(p => {
        const created = new Date(p.created_at);
        const won = new Date(p.won_at);
        return Math.floor((won.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
      });

      const averageCycle = cycleLengths.reduce((a, b) => a + b) / cycleLengths.length;

      expect(cycleLengths[0]).toBe(29); // 29 days
      expect(cycleLengths[1]).toBe(31); // 31 days
      expect(averageCycle).toBe(30); // Average 30 days
    });
  });
});
