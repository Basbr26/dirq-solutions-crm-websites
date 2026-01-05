import { expect, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';

// Extend Vitest's expect with jest-dom matchers
expect.extend(matchers);

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: {
          session: {
            user: {
              id: 'user-123',
              email: 'test@example.com',
              user_metadata: { role: 'ADMIN' },
              app_metadata: {},
              aud: 'authenticated',
              created_at: new Date().toISOString(),
            },
            access_token: 'mock-token',
            refresh_token: 'mock-refresh-token',
          },
        },
        error: null,
      }),
      getUser: vi.fn().mockResolvedValue({
        data: {
          user: {
            id: 'user-123',
            email: 'test@example.com',
            user_metadata: { role: 'ADMIN' },
            app_metadata: {},
            aud: 'authenticated',
            created_at: new Date().toISOString(),
          },
        },
        error: null,
      }),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
    },
    from: vi.fn((table: string) => {
      // Create a chainable mock that returns itself for all query methods
      const chainableMock = {
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        ilike: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        range: vi.fn().mockReturnThis(),
        single: vi.fn(),
      };

      // Mock profiles table specifically
      if (table === 'profiles') {
        chainableMock.single = vi.fn().mockResolvedValue({
          data: {
            id: 'user-123',
            voornaam: 'Test',
            achternaam: 'User',
            full_name: 'Test User',
            email: 'test@example.com',
            role: 'ADMIN',
          },
          error: null,
        });
        return chainableMock;
      }

      // Mock user_roles table specifically
      if (table === 'user_roles') {
        chainableMock.single = vi.fn().mockResolvedValue({
          data: {
            user_id: 'user-123',
            role: 'ADMIN',
          },
          error: null,
        });
        return chainableMock;
      }

      // Default mock for other tables - returns empty data by default
      chainableMock.single = vi.fn().mockResolvedValue({
        data: null,
        error: null,
      });

      // For non-single queries, return as array
      chainableMock.ilike = vi.fn().mockResolvedValue({
        data: [],
        error: null,
      });

      return chainableMock;
    }),
  },
}));
