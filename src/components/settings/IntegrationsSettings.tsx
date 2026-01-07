import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { GoogleCalendarSync } from '@/components/calendar/GoogleCalendarSync';

export function IntegrationsSettings() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Google Calendar</CardTitle>
          <CardDescription>
            Synchroniseer uw CRM agenda automatisch met Google Calendar
          </CardDescription>
        </CardHeader>
        <CardContent>
          <GoogleCalendarSync />
        </CardContent>
      </Card>

      {/* Future integrations can be added here */}
      {/* 
      <Card>
        <CardHeader>
          <CardTitle>Outlook Calendar</CardTitle>
          <CardDescription>
            Synchroniseer met Microsoft Outlook Calendar
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Binnenkort beschikbaar</p>
        </CardContent>
      </Card>
      */}
    </div>
  );
}
