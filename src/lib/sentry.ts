import * as Sentry from '@sentry/react';

// Initialize Sentry
export function initSentry() {
  if (import.meta.env.PROD && import.meta.env.VITE_SENTRY_DSN) {
    Sentry.init({
      dsn: import.meta.env.VITE_SENTRY_DSN,
      environment: import.meta.env.MODE,
      integrations: [
        Sentry.browserTracingIntegration(),
        Sentry.replayIntegration({
          // Mask all text content, images, and media by default
          maskAllText: true,
          blockAllMedia: true,
        }),
      ],
      
      // Set trace propagation targets
      tracePropagationTargets: ['localhost', /^https:\/\/.*\.dirq\.nl/],
      
      // Performance Monitoring
      tracesSampleRate: 0.1, // 10% of transactions
      
      // Session Replay
      replaysSessionSampleRate: 0.1, // 10% of sessions
      replaysOnErrorSampleRate: 1.0, // 100% of sessions with errors
      
      // Filter out non-critical errors
      beforeSend(event, hint) {
        const error = hint.originalException;
        
        // Don't send network errors from dev environment
        if (import.meta.env.DEV) {
          return null;
        }
        
        // Filter out known non-critical errors
        if (error && typeof error === 'object' && 'message' in error) {
          const message = String(error.message);
          
          // Ignore ResizeObserver errors (common benign error)
          if (message.includes('ResizeObserver loop')) {
            return null;
          }
          
          // Ignore cancelled requests
          if (message.includes('cancelled') || message.includes('aborted')) {
            return null;
          }
        }
        
        return event;
      },
      
      // Add custom context
      beforeBreadcrumb(breadcrumb) {
        // Filter out noisy console logs
        if (breadcrumb.category === 'console' && breadcrumb.level === 'log') {
          return null;
        }
        return breadcrumb;
      },
    });
  }
}

// Helper to capture exception with context
export function captureException(error: Error, context?: Record<string, any>) {
  if (import.meta.env.PROD) {
    Sentry.captureException(error, {
      extra: context,
    });
  } else {
    console.error('Error:', error, context);
  }
}

// Helper to set user context
export function setUser(user: { id: string; email?: string; role?: string } | null) {
  if (import.meta.env.PROD) {
    if (user) {
      Sentry.setUser({
        id: user.id,
        email: user.email,
        username: user.email,
        role: user.role,
      });
    } else {
      Sentry.setUser(null);
    }
  }
}

// Helper to add breadcrumb
export function addBreadcrumb(message: string, data?: Record<string, any>) {
  if (import.meta.env.PROD) {
    Sentry.addBreadcrumb({
      message,
      level: 'info',
      data,
    });
  }
}

// Helper to capture message
export function captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info') {
  if (import.meta.env.PROD) {
    Sentry.captureMessage(message, level);
  } else {
    console[level]('Message:', message);
  }
}
