import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface ErrorFallbackProps {
  error: Error;
  resetErrorBoundary: () => void;
}

export function ErrorFallback({ error, resetErrorBoundary }: ErrorFallbackProps) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </div>
          <CardTitle className="text-xl">Er is iets misgegaan</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground text-center">
            Er is een onverwachte fout opgetreden. Probeer de pagina te vernieuwen of ga terug naar de homepage.
          </p>
          
          {(import.meta.env.DEV || window.location.search.includes('debug=true')) && (
            <details className="mt-4" open>
              <summary className="text-sm text-muted-foreground cursor-pointer hover:text-foreground font-semibold">
                🔍 Technische details (DEBUG MODE)
              </summary>
              <div className="mt-2 space-y-2">
                <div className="p-3 bg-destructive/10 rounded-md">
                  <p className="text-xs font-semibold mb-1">Error:</p>
                  <pre className="text-xs overflow-auto">
                    {error.message}
                  </pre>
                </div>
                <div className="p-3 bg-muted rounded-md">
                  <p className="text-xs font-semibold mb-1">Stack Trace:</p>
                  <pre className="text-xs overflow-auto max-h-48">
                    {error.stack}
                  </pre>
                </div>
                {error.message?.includes('createContext') && (
                  <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-md">
                    <p className="text-xs font-semibold mb-1 text-yellow-600 dark:text-yellow-400">
                      ⚠️ Diagnose: createContext Error
                    </p>
                    <p className="text-xs text-yellow-700 dark:text-yellow-300">
                      Dit betekent meestal dat een React-gerelateerde module undefined is.
                      Check de browser console voor meer details over welke module het probleem veroorzaakt.
                    </p>
                  </div>
                )}
              </div>
            </details>
          )}
          
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => window.location.href = '/'}
            >
              <Home className="h-4 w-4 mr-2" />
              Homepage
            </Button>
            <Button
              className="flex-1"
              onClick={resetErrorBoundary}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Opnieuw proberen
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
