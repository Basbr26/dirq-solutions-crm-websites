import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { User, Bell, Palette, Shield } from 'lucide-react';
import { ProfileSettings } from '@/components/settings/ProfileSettings';
import { NotificationPreferences } from '@/components/settings/NotificationPreferences';
import { AppearanceSettings } from '@/components/settings/AppearanceSettings';
import { AccountSettings } from '@/components/settings/AccountSettings';

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState('profile');

  return (
    <AppLayout 
      title="Instellingen" 
      subtitle="Beheer je account, voorkeuren en notificaties"
    >
      <div className="py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-[600px]">
            <TabsTrigger value="profile" className="gap-2">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">Profiel</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="gap-2">
              <Bell className="h-4 w-4" />
              <span className="hidden sm:inline">Notificaties</span>
            </TabsTrigger>
            <TabsTrigger value="appearance" className="gap-2">
              <Palette className="h-4 w-4" />
              <span className="hidden sm:inline">Weergave</span>
            </TabsTrigger>
            <TabsTrigger value="account" className="gap-2">
              <Shield className="h-4 w-4" />
              <span className="hidden sm:inline">Account</span>
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

          <TabsContent value="account" className="space-y-4">
            <AccountSettings />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
