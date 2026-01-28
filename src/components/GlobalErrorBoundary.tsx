import { ErrorBoundary } from 'react-error-boundary';
import { ErrorFallback } from './ErrorFallback';
import { captureException } from '@/lib/sentry';
import { logger } from '@/lib/logger';

interface GlobalErrorBoundaryProps {
  children: React.ReactNode;
}

// Error logging functie (integreert met Sentry)
const logError = (error: Error, info: { componentStack: string }) => {
  // Log naar logger (development & production)
  logger.error(error, { 
    context: 'global_error_boundary',
    component_stack: info.componentStack,
    error_boundary: 'global'
  });
  
  // Log naar Sentry in production
  if (import.meta.env.PROD) {
    captureException(error, {
      extra: { 
        componentStack: info.componentStack,
        errorBoundary: 'global'
      }
    });
  }
};

export function GlobalErrorBoundary({ children }: GlobalErrorBoundaryProps) {
  return (
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onError={logError}
      onReset={() => {
        // Reset app state indien nodig
        window.location.href = '/';
      }}
    >
      {children}
    </ErrorBoundary>
  );
}
