/**
 * Structured logging utility
 * 
 * Provides consistent logging across the application with:
 * - Debug logs only in development
 * - Production error tracking (Sentry integration ready)
 * - Type-safe logging with proper error handling
 */

const isDev = import.meta.env.DEV;

export const logger = {
  /**
   * Debug logging - only visible in development
   * Use for detailed debugging information
   */
  debug: (...args: unknown[]) => {
    if (isDev) {
      console.log('[DEBUG]', ...args);
    }
  },

  /**
   * Info logging - only visible in development
   * Use for general information
   */
  info: (...args: unknown[]) => {
    if (isDev) {
      console.info('[INFO]', ...args);
    }
  },

  /**
   * Warning logging - visible in all environments
   * Use for recoverable issues
   */
  warn: (...args: unknown[]) => {
    console.warn('[WARN]', ...args);
  },

  /**
   * Error logging - visible in all environments
   * Automatically sends to Sentry in production
   */
  error: (error: Error | unknown, context?: Record<string, unknown>) => {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;

    console.error('[ERROR]', errorMessage, errorStack, context);

    // In production, send to Sentry
    if (!isDev && error instanceof Error) {
      // TODO: Uncomment when Sentry is fully configured
      // Sentry.captureException(error, { extra: context });
    }
  },
};
