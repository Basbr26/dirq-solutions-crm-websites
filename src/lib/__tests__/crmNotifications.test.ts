import { describe, it, expect, vi, beforeEach } from 'vitest';
import { sendCRMNotification, notifyQuoteStatusChange } from '../crmNotifications';

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => {
  const mockInsertFn = vi.fn();
  const mockFromFn = vi.fn(() => ({
    insert: mockInsertFn,
  }));
  
  return {
    supabase: {
      from: mockFromFn,
    },
    __mockInsert: mockInsertFn,
    __mockFrom: mockFromFn,
  };
});

// Import mocks after vi.mock
const { __mockInsert: mockInsert, __mockFrom: mockFrom } = await import('@/integrations/supabase/client') as any;

describe('crmNotifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInsert.mockResolvedValue({ error: null });
  });

  describe('sendCRMNotification', () => {
    it('should send notification with all data', async () => {
      const data = {
        recipient_id: 'user-123',
        type: 'lead_assigned' as const,
        title: 'Test Notification',
        message: 'This is a test',
        entity_type: 'project' as const,
        entity_id: 'proj-123',
        deep_link: '/projects/proj-123',
        priority: 'high' as const,
      };

      const result = await sendCRMNotification(data);

      expect(result).toBe(true);
      expect(mockFrom).toHaveBeenCalledWith('notifications');
      expect(mockInsert).toHaveBeenCalledWith([
        expect.objectContaining({
          user_id: 'user-123',
          type: 'lead_assigned',
          title: 'Test Notification',
          message: 'This is a test',
          related_entity_type: 'project',
          related_entity_id: 'proj-123',
          deep_link: '/projects/proj-123',
          priority: 'high',
          read_at: null,
          is_digest: false,
        }),
      ]);
    });

    it('should use default priority of normal when not provided', async () => {
      const data = {
        recipient_id: 'user-123',
        type: 'lead_assigned' as const,
        title: 'Test',
        message: 'Message',
      };

      await sendCRMNotification(data);

      expect(mockInsert).toHaveBeenCalledWith([
        expect.objectContaining({
          priority: 'normal',
        }),
      ]);
    });

    it('should return false when database error occurs', async () => {
      mockInsert.mockResolvedValue({ error: { message: 'Database error' } });

      const result = await sendCRMNotification({
        recipient_id: 'user-123',
        type: 'lead_assigned' as const,
        title: 'Test',
        message: 'Message',
      });

      expect(result).toBe(false);
    });

    it('should handle exceptions gracefully', async () => {
      mockInsert.mockRejectedValue(new Error('Network error'));

      const result = await sendCRMNotification({
        recipient_id: 'user-123',
        type: 'lead_assigned' as const,
        title: 'Test',
        message: 'Message',
      });

      expect(result).toBe(false);
    });

    it('should handle optional fields correctly', async () => {
      const data = {
        recipient_id: 'user-123',
        type: 'lead_assigned' as const,
        title: 'Simple Notification',
        message: 'No extra data',
      };

      await sendCRMNotification(data);

      expect(mockInsert).toHaveBeenCalledWith([
        expect.objectContaining({
          user_id: 'user-123',
          type: 'lead_assigned',
          title: 'Simple Notification',
          message: 'No extra data',
          related_entity_type: undefined,
          related_entity_id: undefined,
          deep_link: undefined,
          priority: 'normal',
        }),
      ]);
    });
  });

  describe('notifyQuoteStatusChange', () => {
    it('should notify when quote is accepted', async () => {
      const result = await notifyQuoteStatusChange(
        'quote-123',
        'accepted',
        'user-456',
        'Acme Corp',
        'Website Development'
      );

      expect(result).toBe(true);
      expect(mockInsert).toHaveBeenCalledWith([
        expect.objectContaining({
          user_id: 'user-456',
          type: 'quote_accepted',
          title: 'Offerte geaccepteerd! 🎉',
          message: 'Acme Corp heeft je offerte "Website Development" geaccepteerd!',
          related_entity_type: 'quote',
          related_entity_id: 'quote-123',
          deep_link: '/quotes/quote-123',
          priority: 'high',
        }),
      ]);
    });

    it('should notify when quote is rejected', async () => {
      const result = await notifyQuoteStatusChange(
        'quote-789',
        'rejected',
        'user-456',
        'Beta Inc',
        'SEO Package'
      );

      expect(result).toBe(true);
      expect(mockInsert).toHaveBeenCalledWith([
        expect.objectContaining({
          user_id: 'user-456',
          type: 'quote_rejected',
          title: 'Offerte afgewezen',
          message: 'Beta Inc heeft je offerte "SEO Package" afgewezen.',
          related_entity_type: 'quote',
          related_entity_id: 'quote-789',
          deep_link: '/quotes/quote-789',
          priority: 'normal',
        }),
      ]);
    });

    it('should use high priority for accepted quotes', async () => {
      await notifyQuoteStatusChange(
        'quote-123',
        'accepted',
        'user-456',
        'Company',
        'Title'
      );

      expect(mockInsert).toHaveBeenCalledWith([
        expect.objectContaining({
          priority: 'high',
        }),
      ]);
    });

    it('should use normal priority for rejected quotes', async () => {
      await notifyQuoteStatusChange(
        'quote-123',
        'rejected',
        'user-456',
        'Company',
        'Title'
      );

      expect(mockInsert).toHaveBeenCalledWith([
        expect.objectContaining({
          priority: 'normal',
        }),
      ]);
    });
  });
});
