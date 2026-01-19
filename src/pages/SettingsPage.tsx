import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AppLayout } from '@/components/layout/AppLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { User, Bell, Palette, Shield, Plug } from 'lucide-react';
import { 
  ProfileSettings, 
  NotificationPreferences, 
  AppearanceSettings, 
  AccountSettings,
  IntegrationsSettings 
} from '@/components/settings';

export function SettingsPage() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('profile');

  return (
    <AppLayout 
      title={t('settings.title')} 
      subtitle={t('settings.subtitle')}
    >
      <div className="py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 lg:w-[750px]">
            <TabsTrigger value="profile" className="gap-2">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">{t('settings.profile')}</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="gap-2">
              <Bell className="h-4 w-4" />
              <span className="hidden sm:inline">{t('settings.notifications')}</span>
            </TabsTrigger>
            <TabsTrigger value="appearance" className="gap-2">
              <Palette className="h-4 w-4" />
              <span className="hidden sm:inline">{t('settings.appearance')}</span>
            </TabsTrigger>
            <TabsTrigger value="integrations" className="gap-2">
              <Plug className="h-4 w-4" />
              <span className="hidden sm:inline">{t('settings.integrations')}</span>
            </TabsTrigger>
            <TabsTrigger value="account" className="gap-2">
              <Shield className="h-4 w-4" />
              <span className="hidden sm:inline">{t('settings.account')}</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-4">
            <ProfileSettings />
          </TabsContent>

          <TabsContent value="notifications" className="space-y-4">
            <NotificationPreferences />
          </TabsContent>

          <TabsContent value="appearance" className="space-y-4">
            <AppearanceSettings />
          </TabsContent>

          <TabsContent value="integrations" className="space-y-4">
            <IntegrationsSettings />
          </TabsContent>

          <TabsContent value="account" className="space-y-4">
            <AccountSettings />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
