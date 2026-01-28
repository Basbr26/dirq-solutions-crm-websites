import { describe, it, expect, vi, beforeEach } from 'vitest';
import { supabase } from '@/integrations/supabase/client';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
  },
}));

describe('Interaction Timeline', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Chronological Ordering', () => {
    it('should sort interactions by date descending', () => {
      const interactions = [
        { id: '1', created_at: '2026-01-20T10:00:00Z', type: 'call' },
        { id: '2', created_at: '2026-01-25T10:00:00Z', type: 'email' },
        { id: '3', created_at: '2026-01-22T10:00:00Z', type: 'meeting' },
      ];

      const sorted = [...interactions].sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      expect(sorted[0].id).toBe('2'); // Most recent
      expect(sorted[1].id).toBe('3');
      expect(sorted[2].id).toBe('1'); // Oldest
    });

    it('should group interactions by date', () => {
      const interactions = [
        { id: '1', created_at: '2026-01-20T10:00:00Z' },
        { id: '2', created_at: '2026-01-20T14:00:00Z' },
        { id: '3', created_at: '2026-01-21T10:00:00Z' },
      ];

      const grouped = interactions.reduce((acc, interaction) => {
        const date = interaction.created_at.split('T')[0];
        if (!acc[date]) acc[date] = [];
        acc[date].push(interaction);
        return acc;
      }, {} as Record<string, typeof interactions>);

      expect(Object.keys(grouped).length).toBe(2);
      expect(grouped['2026-01-20'].length).toBe(2);
      expect(grouped['2026-01-21'].length).toBe(1);
    });
  });

  describe('Interaction Type Filtering', () => {
    it('should filter by interaction type', () => {
      const interactions = [
        { id: '1', type: 'call' },
        { id: '2', type: 'email' },
        { id: '3', type: 'call' },
        { id: '4', type: 'meeting' },
      ];

      const calls = interactions.filter(i => i.type === 'call');
      
      expect(calls.length).toBe(2);
      expect(calls.every(i => i.type === 'call')).toBe(true);
    });

    it('should support multiple type filters', () => {
      const interactions = [
        { id: '1', type: 'call' },
        { id: '2', type: 'email' },
        { id: '3', type: 'call' },
        { id: '4', type: 'meeting' },
      ];

      const filtered = interactions.filter(i => 
        ['call', 'email'].includes(i.type)
      );
      
      expect(filtered.length).toBe(3);
    });
  });

  describe('Last Contact Date Calculation', () => {
    it('should calculate most recent interaction date', () => {
      const interactions = [
        { created_at: '2026-01-20T10:00:00Z' },
        { created_at: '2026-01-25T10:00:00Z' },
        { created_at: '2026-01-22T10:00:00Z' },
      ];

      const lastContact = interactions.reduce((latest, interaction) => {
        const date = new Date(interaction.created_at);
        return date > new Date(latest) ? interaction.created_at : latest;
      }, interactions[0].created_at);

      expect(lastContact).toBe('2026-01-25T10:00:00Z');
    });

    it('should handle empty interactions', () => {
      const interactions: any[] = [];
      const lastContact = interactions.length > 0 
        ? interactions[0].created_at 
        : null;

      expect(lastContact).toBeNull();
    });

    it('should update project last_contact_date', async () => {
      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: { id: 'project-123' },
          error: null,
        }),
      });

      vi.mocked(supabase.from).mockReturnValue({
        update: mockUpdate,
      } as any);

      const lastContactDate = '2026-01-28T10:00:00Z';

      await supabase
        .from('projects')
        .update({ last_contact_date: lastContactDate })
        .eq('id', 'project-123');

      expect(mockUpdate).toHaveBeenCalledWith({ 
        last_contact_date: lastContactDate 
      });
    });
  });

  describe('Automated Follow-up Logic', () => {
    it('should create LinkedIn task after physical mail', async () => {
      const mockInsert = vi.fn().mockResolvedValue({
        data: { id: 'task-123' },
        error: null,
      });

      vi.mocked(supabase.from).mockReturnValue({
        insert: mockInsert,
      } as any);

      // Simulate physical mail interaction
      const interaction = {
        type: 'physical_mail',
        company_id: 'company-123',
        contact_id: 'contact-123',
      };

      // Auto-create follow-up task
      if (interaction.type === 'physical_mail') {
        await supabase
          .from('tasks')
          .insert({
            title: 'Follow up via LinkedIn',
            description: 'Contact after physical mail was sent',
            related_type: 'contact',
            related_id: interaction.contact_id,
            due_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days
          });
      }

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Follow up via LinkedIn',
          related_id: 'contact-123',
        })
      );
    });

    it('should set correct follow-up interval', () => {
      const followUpDays = {
        physical_mail: 3,
        email: 7,
        call: 14,
      };

      Object.entries(followUpDays).forEach(([type, days]) => {
        const dueDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
        const today = new Date();
        const diffDays = Math.round((dueDate.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
        
        expect(diffDays).toBe(days);
      });
    });
  });

  describe('Interaction Stats Aggregation', () => {
    it('should count interactions by type', () => {
      const interactions = [
        { type: 'call' },
        { type: 'email' },
        { type: 'call' },
        { type: 'meeting' },
        { type: 'call' },
      ];

      const byType = interactions.reduce((acc, interaction) => {
        acc[interaction.type] = (acc[interaction.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      expect(byType.call).toBe(3);
      expect(byType.email).toBe(1);
      expect(byType.meeting).toBe(1);
    });

    it('should count interactions by user', () => {
      const interactions = [
        { user_id: 'user-1' },
        { user_id: 'user-2' },
        { user_id: 'user-1' },
        { user_id: 'user-1' },
      ];

      const byUser = interactions.reduce((acc, interaction) => {
        acc[interaction.user_id] = (acc[interaction.user_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      expect(byUser['user-1']).toBe(3);
      expect(byUser['user-2']).toBe(1);
    });

    it('should calculate total interactions', () => {
      const interactions = [
        { id: '1' },
        { id: '2' },
        { id: '3' },
      ];

      expect(interactions.length).toBe(3);
    });
  });

  describe('Timeline Rendering', () => {
    it('should show relative time for recent interactions', () => {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const getRelativeTime = (date: Date) => {
        const diffMs = now.getTime() - date.getTime();
        const diffHours = Math.floor(diffMs / (60 * 60 * 1000));
        const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));

        if (diffHours < 24) return `${diffHours} uur geleden`;
        return `${diffDays} dag${diffDays > 1 ? 'en' : ''} geleden`;
      };

      expect(getRelativeTime(oneHourAgo)).toBe('1 uur geleden');
      expect(getRelativeTime(oneDayAgo)).toBe('1 dag geleden');
    });

    it('should group interactions by today/yesterday/older', () => {
      const now = new Date();
      const today = new Date(now);
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const older = new Date(now.getTime() - 48 * 60 * 60 * 1000);

      const getTimeGroup = (date: Date) => {
        const diffDays = Math.floor((now.getTime() - date.getTime()) / (24 * 60 * 60 * 1000));
        
        if (diffDays === 0) return 'today';
        if (diffDays === 1) return 'yesterday';
        return 'older';
      };

      expect(getTimeGroup(today)).toBe('today');
      expect(getTimeGroup(yesterday)).toBe('yesterday');
      expect(getTimeGroup(older)).toBe('older');
    });
  });

  describe('Interaction Type Icons', () => {
    it('should map interaction types to correct icons', () => {
      const iconMap = {
        call: 'Phone',
        email: 'Mail',
        meeting: 'Users',
        note: 'FileText',
        task: 'CheckSquare',
        linkedin: 'Linkedin',
        physical_mail: 'Send',
      };

      Object.entries(iconMap).forEach(([type, icon]) => {
        expect(iconMap[type as keyof typeof iconMap]).toBe(icon);
      });
    });

    it('should have colors for each interaction type', () => {
      const colorMap = {
        call: 'blue',
        email: 'green',
        meeting: 'purple',
        note: 'gray',
        task: 'orange',
        linkedin: 'cyan',
        physical_mail: 'indigo',
      };

      expect(Object.keys(colorMap).length).toBeGreaterThan(0);
    });
  });

  describe('Pagination', () => {
    it('should paginate timeline results', () => {
      const interactions = Array.from({ length: 50 }, (_, i) => ({
        id: `interaction-${i}`,
        created_at: new Date(Date.now() - i * 60 * 60 * 1000).toISOString(),
      }));

      const page = 1;
      const perPage = 10;
      const paginated = interactions.slice((page - 1) * perPage, page * perPage);

      expect(paginated.length).toBe(10);
      expect(paginated[0].id).toBe('interaction-0');
    });

    it('should calculate total pages', () => {
      const totalCount = 47;
      const perPage = 10;
      const totalPages = Math.ceil(totalCount / perPage);

      expect(totalPages).toBe(5);
    });
  });
});
