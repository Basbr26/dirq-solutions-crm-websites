import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { captureException } from '@/lib/sentry';
import { logger } from '@/lib/logger';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logger.error(error, { 
      context: 'error_boundary', 
      component_stack: errorInfo.componentStack,
      error_boundary: true 
    });
    
    this.setState({
      error,
      errorInfo,
    });

    // Send error to Sentry
    captureException(error, {
      componentStack: errorInfo.componentStack,
      errorBoundary: true,
    });
  }

  private handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <Card className="max-w-2xl w-full">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-destructive/10 rounded-lg">
                  <AlertTriangle className="h-6 w-6 text-destructive" />
                </div>
                <div>
                  <CardTitle className="text-2xl">Er is iets misgegaan</CardTitle>
                  <CardDescription>
                    Er is een onverwachte fout opgetreden in de applicatie
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Error details for development */}
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <div className="space-y-2">
                  <details className="cursor-pointer">
                    <summary className="text-sm font-medium text-muted-foreground hover:text-foreground">
                      Foutdetails (alleen zichtbaar in development)
                    </summary>
                    <div className="mt-2 p-4 bg-muted rounded-lg">
                      <p className="text-sm font-mono text-destructive">
                        {this.state.error.toString()}
                      </p>
                      {this.state.errorInfo && (
                        <pre className="mt-2 text-xs overflow-auto max-h-64">
                          {this.state.errorInfo.componentStack}
                        </pre>
                      )}
                    </div>
                  </details>
                </div>
              )}

              {/* User-friendly message */}
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  Dit is waarschijnlijk een tijdelijk probleem. Probeer de volgende stappen:
                </p>
                <ul className="mt-2 ml-4 text-sm text-muted-foreground list-disc space-y-1">
                  <li>Ververs de pagina</li>
                  <li>Ga terug naar de homepagina</li>
                  <li>Log uit en opnieuw in</li>
                  <li>Wis je browser cache</li>
                </ul>
              </div>

              {/* Action buttons */}
              <div className="flex gap-3 pt-2">
                <Button
                  onClick={this.handleReset}
                  variant="default"
                  className="flex-1"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Probeer opnieuw
                </Button>
                <Button
                  onClick={this.handleGoHome}
                  variant="outline"
                  className="flex-1"
                >
                  <Home className="h-4 w-4 mr-2" />
                  Naar homepagina
                </Button>
              </div>

              {/* Contact support */}
              <p className="text-xs text-center text-muted-foreground">
                Blijft het probleem zich voordoen? Neem contact op met{' '}
                <a
                  href="mailto:support@dirq.nl"
                  className="text-primary hover:underline"
                >
                  support@dirq.nl
                </a>
              </p>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
