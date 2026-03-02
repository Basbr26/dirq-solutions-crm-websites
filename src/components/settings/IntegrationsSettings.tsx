import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { GoogleCalendarSync } from '@/components/calendar/GoogleCalendarSync';
import { GmailConnect } from '@/components/gmail/GmailConnect';
import { useTranslation } from 'react-i18next';

export function IntegrationsSettings() {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t('settings.integrations.googleCalendar')}</CardTitle>
          <CardDescription>
            {t('settings.integrations.googleCalendarDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <GoogleCalendarSync />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Gmail</CardTitle>
          <CardDescription>
            Verbind Gmail om emails te lezen, versturen en automatisch te koppelen aan contacten en bedrijven.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <GmailConnect />
        </CardContent>
      </Card>
    </div>
  );
}
