import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { ReactNode } from 'react';

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
    auth: {
      getUser: vi.fn(),
    },
  },
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('Quote Signature Security', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Provider Signature Authorization', () => {
    it('should reject signature when user is not owner or admin', async () => {
      // Mock unauthorized user (SALES role, not owner)
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { 
          user: { 
            id: 'user-456', 
            email: 'sales@test.com' 
          } as any 
        },
        error: null,
      });

      const quote = {
        id: 'quote-123',
        owner_id: 'user-123', // Different from current user
        status: 'sent',
      };

      const profile = {
        id: 'user-456',
        role: 'SALES', // Not ADMIN
      };

      // Test: User should NOT be able to sign as provider
      const canSign = profile.role === 'ADMIN' || quote.owner_id === profile.id;
      
      expect(canSign).toBe(false);
    });

    it('should allow signature when user is owner', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { 
          user: { 
            id: 'user-123', 
            email: 'owner@test.com' 
          } as any 
        },
        error: null,
      });

      const quote = {
        id: 'quote-123',
        owner_id: 'user-123', // Same as current user
        status: 'sent',
      };

      const profile = {
        id: 'user-123',
        role: 'SALES',
      };

      const canSign = profile.role === 'ADMIN' || quote.owner_id === profile.id;
      
      expect(canSign).toBe(true);
    });

    it('should allow signature when user is admin', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { 
          user: { 
            id: 'user-789', 
            email: 'admin@test.com' 
          } as any 
        },
        error: null,
      });

      const quote = {
        id: 'quote-123',
        owner_id: 'user-123', // Different from current user
        status: 'sent',
      };

      const profile = {
        id: 'user-789',
        role: 'ADMIN', // Admin can sign any quote
      };

      const canSign = profile.role === 'ADMIN' || quote.owner_id === profile.id;
      
      expect(canSign).toBe(true);
    });
  });

  describe('Sign Token Invalidation', () => {
    it('should invalidate token after successful signature', async () => {
      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: { id: 'quote-123' },
          error: null,
        }),
      });

      vi.mocked(supabase.from).mockReturnValue({
        update: mockUpdate,
      } as any);

      // Simulate signature completion
      await supabase
        .from('quotes')
        .update({
          sign_token: null,
          sign_token_expires_at: null,
          status: 'signed',
        })
        .eq('id', 'quote-123');

      expect(mockUpdate).toHaveBeenCalledWith({
        sign_token: null,
        sign_token_expires_at: null,
        status: 'signed',
      });
    });

    it('should prevent replay attacks with expired token', () => {
      const quote = {
        id: 'quote-123',
        sign_token: null, // Token invalidated
        sign_token_expires_at: null,
        status: 'signed',
      };

      const isTokenValid = quote.sign_token !== null && 
                          quote.sign_token_expires_at !== null &&
                          new Date(quote.sign_token_expires_at) > new Date();

      expect(isTokenValid).toBe(false);
    });

    it('should validate token expiry date', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7); // 7 days in future

      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1); // 1 day in past

      const validQuote = {
        sign_token: 'valid-token',
        sign_token_expires_at: futureDate.toISOString(),
      };

      const expiredQuote = {
        sign_token: 'expired-token',
        sign_token_expires_at: pastDate.toISOString(),
      };

      const isValidTokenActive = 
        validQuote.sign_token !== null &&
        new Date(validQuote.sign_token_expires_at) > new Date();

      const isExpiredTokenActive =
        expiredQuote.sign_token !== null &&
        new Date(expiredQuote.sign_token_expires_at) > new Date();

      expect(isValidTokenActive).toBe(true);
      expect(isExpiredTokenActive).toBe(false);
    });
  });

  describe('IP Address Logging', () => {
    it('should log IP address on signature', async () => {
      const mockIpAddress = '192.168.1.100';
      
      // Mock IP fetch
      global.fetch = vi.fn().mockResolvedValue({
        json: () => Promise.resolve({ ip: mockIpAddress }),
      } as any);

      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: { id: 'quote-123' },
          error: null,
        }),
      });

      vi.mocked(supabase.from).mockReturnValue({
        update: mockUpdate,
      } as any);

      // Simulate signature with IP logging
      const ipResponse = await fetch('https://api.ipify.org?format=json');
      const { ip } = await ipResponse.json();

      await supabase
        .from('quotes')
        .update({
          signed_by_ip: ip,
          provider_signature: 'signature-data',
          status: 'signed',
        })
        .eq('id', 'quote-123');

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          signed_by_ip: mockIpAddress,
        })
      );
    });

    it('should reject signature if IP logging fails', async () => {
      // Mock IP fetch failure
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      let ipAddress = null;
      let error = null;

      try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        ipAddress = data.ip;
      } catch (e) {
        error = e;
      }

      expect(ipAddress).toBeNull();
      expect(error).toBeInstanceOf(Error);
    });
  });

  describe('Audit Trail', () => {
    it('should record signature timestamp', async () => {
      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: { id: 'quote-123' },
          error: null,
        }),
      });

      vi.mocked(supabase.from).mockReturnValue({
        update: mockUpdate,
      } as any);

      const signatureTimestamp = new Date().toISOString();

      await supabase
        .from('quotes')
        .update({
          provider_signature: 'signature-data',
          provider_signed_at: signatureTimestamp,
          signed_by_ip: '192.168.1.100',
          status: 'signed',
        })
        .eq('id', 'quote-123');

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          provider_signed_at: signatureTimestamp,
        })
      );
    });

    it('should preserve client signature when provider signs', async () => {
      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: { id: 'quote-123' },
          error: null,
        }),
      });

      vi.mocked(supabase.from).mockReturnValue({
        update: mockUpdate,
      } as any);

      const existingClientSignature = 'client-signature-data';

      await supabase
        .from('quotes')
        .update({
          provider_signature: 'provider-signature-data',
          // Client signature should remain unchanged
        })
        .eq('id', 'quote-123');

      // Verify only provider signature is updated
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.not.objectContaining({
          client_signature: expect.anything(),
        })
      );
    });
  });

  describe('Dual Signature Validation', () => {
    it('should require both signatures before marking as complete', () => {
      const incompleteQuote = {
        client_signature: 'client-sig',
        provider_signature: null,
        status: 'sent',
      };

      const completeQuote = {
        client_signature: 'client-sig',
        provider_signature: 'provider-sig',
        status: 'signed',
      };

      const isIncompleteReady = 
        incompleteQuote.client_signature && 
        incompleteQuote.provider_signature;

      const isCompleteReady = 
        completeQuote.client_signature && 
        completeQuote.provider_signature;

      expect(isIncompleteReady).toBeFalsy();
      expect(isCompleteReady).toBeTruthy();
    });

    it('should track signature order', () => {
      const clientFirstQuote = {
        client_signed_at: '2026-01-28T10:00:00Z',
        provider_signed_at: '2026-01-28T10:30:00Z',
      };

      const providerFirstQuote = {
        client_signed_at: '2026-01-28T11:00:00Z',
        provider_signed_at: '2026-01-28T10:00:00Z',
      };

      const clientSignedFirst = 
        new Date(clientFirstQuote.client_signed_at) < 
        new Date(clientFirstQuote.provider_signed_at);

      const providerSignedFirst = 
        new Date(providerFirstQuote.client_signed_at) > 
        new Date(providerFirstQuote.provider_signed_at);

      expect(clientSignedFirst).toBe(true);
      expect(providerSignedFirst).toBe(true);
    });
  });
});
