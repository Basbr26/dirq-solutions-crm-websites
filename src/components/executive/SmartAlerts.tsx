import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  AlertTriangle, 
  Clock, 
  DollarSign, 
  FileWarning, 
  Users,
  ChevronRight,
  Bell
} from 'lucide-react';

export type AlertType = 'deadline' | 'budget' | 'compliance' | 'capacity';
export type AlertSeverity = 'critical' | 'warning' | 'info';

export interface SmartAlert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  description: string;
  metric?: string;
  threshold?: string;
  actionLabel?: string;
  actionUrl?: string;
}

interface SmartAlertsProps {
  alerts: SmartAlert[];
  onAction?: (alert: SmartAlert) => void;
}

const alertConfig: Record<AlertType, { icon: typeof Clock; color: string }> = {
  deadline: { icon: Clock, color: 'text-orange-500' },
  budget: { icon: DollarSign, color: 'text-red-500' },
  compliance: { icon: FileWarning, color: 'text-yellow-500' },
  capacity: { icon: Users, color: 'text-blue-500' },
};

const severityConfig: Record<AlertSeverity, { 
  variant: 'destructive' | 'default' | 'secondary';
  label: string;
}> = {
  critical: { variant: 'destructive', label: 'Kritiek' },
  warning: { variant: 'default', label: 'Waarschuwing' },
  info: { variant: 'secondary', label: 'Info' },
};

export function SmartAlerts({ alerts, onAction }: SmartAlertsProps) {
  // Group and sort alerts
  const sortedAlerts = [...alerts].sort((a, b) => {
    const severityOrder = { critical: 0, warning: 1, info: 2 };
    return severityOrder[a.severity] - severityOrder[b.severity];
  });

  const criticalCount = alerts.filter((a) => a.severity === 'critical').length;
  const warningCount = alerts.filter((a) => a.severity === 'warning').length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              Smart Alerts
            </CardTitle>
            <CardDescription>Real-time waarschuwingen en aandachtspunten</CardDescription>
          </div>
          <div className="flex gap-2">
            {criticalCount > 0 && (
              <Badge variant="destructive" className="gap-1">
                <AlertTriangle className="h-3 w-3" />
                {criticalCount}
              </Badge>
            )}
            {warningCount > 0 && (
              <Badge variant="outline" className="gap-1">
                {warningCount}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {sortedAlerts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Bell className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>Geen actieve waarschuwingen</p>
            <p className="text-xs mt-1">Alles ziet er goed uit! 🎉</p>
          </div>
        ) : (
          sortedAlerts.map((alert) => {
            const Icon = alertConfig[alert.type].icon;
            const severity = severityConfig[alert.severity];

            return (
              <Alert 
                key={alert.id}
                className={
                  alert.severity === 'critical' 
                    ? 'border-destructive bg-destructive/5' 
                    : ''
                }
              >
                <div className="flex items-start gap-3">
                  <Icon className={`h-5 w-5 mt-0.5 ${alertConfig[alert.type].color}`} />
                  <div className="flex-1 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-sm">{alert.title}</h4>
                          <Badge variant={severity.variant} className="text-xs">
                            {severity.label}
                          </Badge>
                        </div>
                        <AlertDescription className="text-xs">
                          {alert.description}
                        </AlertDescription>
                      </div>
                    </div>

                    {/* Metrics */}
                    {(alert.metric || alert.threshold) && (
                      <div className="flex gap-4 text-xs">
                        {alert.metric && (
                          <div>
                            <span className="text-muted-foreground">Huidige waarde: </span>
                            <span className="font-medium">{alert.metric}</span>
                          </div>
                        )}
                        {alert.threshold && (
                          <div>
                            <span className="text-muted-foreground">Limiet: </span>
                            <span className="font-medium">{alert.threshold}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Action Button */}
                    {alert.actionLabel && (
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="w-full sm:w-auto gap-1"
                        onClick={() => onAction?.(alert)}
                      >
                        {alert.actionLabel}
                        <ChevronRight className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              </Alert>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
