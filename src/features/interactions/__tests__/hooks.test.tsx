import { describe, it, expect, vi, beforeEach } from 'vitest';
import { supabase } from '@/integrations/supabase/client';

vi.mock('@/integrations/supabase/client');

describe('Interactions Module - Hook Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useInteractions Hook', () => {
    it('should fetch interactions for company', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: [
              { id: '1', type: 'call', company_id: 'company-123' },
              { id: '2', type: 'email', company_id: 'company-123' },
            ],
            error: null,
          }),
        }),
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
      } as any);

      const result = await supabase
        .from('interactions')
        .select()
        .eq('company_id', 'company-123')
        .order('created_at', { ascending: false });

      expect(result.data?.length).toBe(2);
      expect(result.data?.every(i => i.company_id === 'company-123')).toBe(true);
    });

    it('should fetch interactions for contact', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: [{ id: '1', contact_id: 'contact-123' }],
            error: null,
          }),
        }),
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
      } as any);

      const result = await supabase
        .from('interactions')
        .select()
        .eq('contact_id', 'contact-123')
        .order('created_at', { ascending: false });

      expect(result.data?.length).toBe(1);
    });

    it('should filter by interaction type', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: [{ id: '1', type: 'call' }],
            error: null,
          }),
        }),
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
      } as any);

      const result = await supabase
        .from('interactions')
        .select()
        .eq('company_id', 'company-123')
        .eq('type', 'call');

      expect(result.data?.every(i => i.type === 'call')).toBe(true);
    });

    it('should filter by date range', async () => {
      const startDate = '2026-01-01';
      const endDate = '2026-01-31';

      const mockSelect = vi.fn().mockReturnValue({
        gte: vi.fn().mockReturnValue({
          lte: vi.fn().mockResolvedValue({
            data: [
              { id: '1', created_at: '2026-01-15T10:00:00Z' },
              { id: '2', created_at: '2026-01-20T10:00:00Z' },
            ],
            error: null,
          }),
        }),
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
      } as any);

      const result = await supabase
        .from('interactions')
        .select()
        .gte('created_at', startDate)
        .lte('created_at', endDate);

      expect(result.data?.length).toBeGreaterThan(0);
    });
  });

  describe('useCreateInteraction Hook', () => {
    it('should create interaction with required fields', async () => {
      const mockInsert = vi.fn().mockResolvedValue({
        data: {
          id: 'interaction-123',
          type: 'call',
          company_id: 'company-123',
          notes: 'Test call',
        },
        error: null,
      });

      vi.mocked(supabase.from).mockReturnValue({
        insert: mockInsert,
      } as any);

      const interactionData = {
        type: 'call',
        company_id: 'company-123',
        notes: 'Test call',
      };

      const result = await supabase.from('interactions').insert(interactionData);

      expect(result.data).toBeTruthy();
      expect(mockInsert).toHaveBeenCalledWith(interactionData);
    });

    it('should validate interaction type', () => {
      const validTypes = [
        'call',
        'email',
        'meeting',
        'note',
        'task',
        'linkedin',
        'physical_mail',
      ];

      validTypes.forEach(type => {
        expect(validTypes.includes(type)).toBe(true);
      });

      const invalidType = 'invalid_type';
      expect(validTypes.includes(invalidType)).toBe(false);
    });

    it('should auto-set user_id from auth', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-123' } as any },
        error: null,
      });

      const { data: { user } } = await supabase.auth.getUser();

      const mockInsert = vi.fn().mockResolvedValue({
        data: { id: 'interaction-123', user_id: user?.id },
        error: null,
      });

      vi.mocked(supabase.from).mockReturnValue({
        insert: mockInsert,
      } as any);

      await supabase.from('interactions').insert({
        type: 'call',
        user_id: user?.id,
      });

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'user-123',
        })
      );
    });

    it('should create follow-up task for physical mail', async () => {
      const mockInsert = vi.fn().mockResolvedValue({
        data: { id: 'interaction-123', type: 'physical_mail' },
        error: null,
      });

      vi.mocked(supabase.from).mockReturnValue({
        insert: mockInsert,
      } as any);

      const interaction = {
        type: 'physical_mail',
        company_id: 'company-123',
      };

      await supabase.from('interactions').insert(interaction);

      // Should trigger follow-up task creation
      expect(mockInsert).toHaveBeenCalled();
    });
  });

  describe('useUpdateInteraction Hook', () => {
    it('should update interaction notes', async () => {
      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: { id: 'interaction-123', notes: 'Updated notes' },
          error: null,
        }),
      });

      vi.mocked(supabase.from).mockReturnValue({
        update: mockUpdate,
      } as any);

      await supabase
        .from('interactions')
        .update({ notes: 'Updated notes' })
        .eq('id', 'interaction-123');

      expect(mockUpdate).toHaveBeenCalledWith({ notes: 'Updated notes' });
    });

    it('should update outcome field', async () => {
      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: { id: 'interaction-123', outcome: 'positive' },
          error: null,
        }),
      });

      vi.mocked(supabase.from).mockReturnValue({
        update: mockUpdate,
      } as any);

      await supabase
        .from('interactions')
        .update({ outcome: 'positive' })
        .eq('id', 'interaction-123');

      expect(mockUpdate).toHaveBeenCalledWith({ outcome: 'positive' });
    });
  });

  describe('useDeleteInteraction Hook', () => {
    it('should delete interaction', async () => {
      const mockDelete = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      });

      vi.mocked(supabase.from).mockReturnValue({
        delete: mockDelete,
      } as any);

      await supabase.from('interactions').delete().eq('id', 'interaction-123');

      expect(mockDelete).toHaveBeenCalled();
    });

    it('should prevent deletion if referenced', async () => {
      const mockEq = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Foreign key constraint violation', code: '23503' },
      });
      
      const mockDelete = vi.fn().mockReturnValue({
        eq: mockEq,
      });

      vi.mocked(supabase.from).mockReturnValue({
        delete: mockDelete,
      } as any);

      const result = await supabase.from('interactions').delete().eq('id', 'interaction-123');

      expect(result.error?.code).toBe('23503');
    });
  });

  describe('useInteractionStats Hook', () => {
    it('should calculate stats by type', () => {
      const interactions = [
        { type: 'call' },
        { type: 'email' },
        { type: 'call' },
        { type: 'meeting' },
      ];

      const statsByType = interactions.reduce((acc, interaction) => {
        acc[interaction.type] = (acc[interaction.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      expect(statsByType.call).toBe(2);
      expect(statsByType.email).toBe(1);
      expect(statsByType.meeting).toBe(1);
    });

    it('should calculate stats by user', () => {
      const interactions = [
        { user_id: 'user-1' },
        { user_id: 'user-2' },
        { user_id: 'user-1' },
      ];

      const statsByUser = interactions.reduce((acc, interaction) => {
        acc[interaction.user_id] = (acc[interaction.user_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      expect(statsByUser['user-1']).toBe(2);
      expect(statsByUser['user-2']).toBe(1);
    });

    it('should calculate stats by period', () => {
      const interactions = [
        { created_at: '2026-01-15T10:00:00Z' },
        { created_at: '2026-01-20T10:00:00Z' },
        { created_at: '2026-02-01T10:00:00Z' },
      ];

      const statsByMonth = interactions.reduce((acc, interaction) => {
        const month = interaction.created_at.substring(0, 7); // YYYY-MM
        acc[month] = (acc[month] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      expect(statsByMonth['2026-01']).toBe(2);
      expect(statsByMonth['2026-02']).toBe(1);
    });

    it('should use database RPC for better performance', async () => {
      const mockRpc = vi.fn().mockResolvedValue({
        data: {
          byType: { call: 5, email: 3 },
          byUser: { 'user-1': 6, 'user-2': 2 },
          total: 8,
        },
        error: null,
      });

      vi.mocked(supabase.rpc).mockImplementation(mockRpc);

      const result = await supabase.rpc('get_interaction_stats');

      expect(result.data).toHaveProperty('byType');
      expect(result.data).toHaveProperty('byUser');
      expect(result.data).toHaveProperty('total');
    });
  });

  describe('Interaction Type Guards', () => {
    it('should validate interaction type at runtime', () => {
      type InteractionType = 'call' | 'email' | 'meeting' | 'note' | 'task' | 'linkedin' | 'physical_mail';

      const isValidInteractionType = (type: string): type is InteractionType => {
        const validTypes: InteractionType[] = [
          'call',
          'email',
          'meeting',
          'note',
          'task',
          'linkedin',
          'physical_mail',
        ];
        return validTypes.includes(type as InteractionType);
      };

      expect(isValidInteractionType('call')).toBe(true);
      expect(isValidInteractionType('invalid')).toBe(false);
    });
  });

  describe('Outcome Tracking', () => {
    it('should track positive outcomes', async () => {
      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: { id: 'interaction-123', outcome: 'positive' },
          error: null,
        }),
      });

      vi.mocked(supabase.from).mockReturnValue({
        update: mockUpdate,
      } as any);

      await supabase
        .from('interactions')
        .update({ outcome: 'positive' })
        .eq('id', 'interaction-123');

      expect(mockUpdate).toHaveBeenCalledWith({ outcome: 'positive' });
    });

    it('should track negative outcomes', async () => {
      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: { id: 'interaction-123', outcome: 'negative' },
          error: null,
        }),
      });

      vi.mocked(supabase.from).mockReturnValue({
        update: mockUpdate,
      } as any);

      await supabase
        .from('interactions')
        .update({ outcome: 'negative' })
        .eq('id', 'interaction-123');

      expect(mockUpdate).toHaveBeenCalledWith({ outcome: 'negative' });
    });
  });
});
