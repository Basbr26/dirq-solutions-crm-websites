import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { PersonalFeed } from '@/components/employee/PersonalFeed';
import { QuickActions } from '@/components/employee/QuickActions';
import { AchievementBadges } from '@/components/employee/AchievementBadges';
import { motion } from 'framer-motion';
import {
  Home,
  Zap,
  Award,
  Settings,
} from 'lucide-react';

export default function EmployeePortal() {
  const { user, profile } = useAuth();
  const [activeTab, setActiveTab] = useState('home');

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-950 dark:to-gray-900">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-40 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 backdrop-blur-md bg-opacity-80"
      >
        <div className="px-4 py-3 max-w-lg mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                👋 Welkom, {profile?.voornaam || 'Medewerker'}
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Employee Self-Service Portal
              </p>
            </div>
            <div className="text-3xl">
              👤
            </div>
          </div>
        </div>
      </motion.div>

      {/* Main Content */}
      <div className="max-w-lg mx-auto">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          {/* Tab Navigation */}
          <TabsList className="sticky top-16 z-30 grid w-full grid-cols-4 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 p-0 h-auto rounded-none">
            <TabsTrigger
              value="home"
              className="flex flex-col items-center gap-1 py-3 rounded-none border-b-2 data-[state=active]:border-b-blue-500"
            >
              <Home className="w-5 h-5" />
              <span className="text-xs">Home</span>
            </TabsTrigger>
            <TabsTrigger
              value="benefits"
              className="flex flex-col items-center gap-1 py-3 rounded-none border-b-2 data-[state=active]:border-b-blue-500"
            >
              <Zap className="w-5 h-5" />
              <span className="text-xs">Benefits</span>
            </TabsTrigger>
            <TabsTrigger
              value="achievements"
              className="flex flex-col items-center gap-1 py-3 rounded-none border-b-2 data-[state=active]:border-b-blue-500"
            >
              <Award className="w-5 h-5" />
              <span className="text-xs">Badges</span>
            </TabsTrigger>
            <TabsTrigger
              value="settings"
              className="flex flex-col items-center gap-1 py-3 rounded-none border-b-2 data-[state=active]:border-b-blue-500"
            >
              <Settings className="w-5 h-5" />
              <span className="text-xs">Instellingen</span>
            </TabsTrigger>
          </TabsList>

          {/* Home Tab */}
          <TabsContent value="home" className="mt-0">
            <PersonalFeed />
          </TabsContent>

          {/* Benefits Tab */}
          <TabsContent value="benefits" className="mt-0 p-4 pb-24">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <Card className="p-4 bg-gradient-to-br from-teal-50 to-blue-50 dark:from-teal-950 dark:to-blue-950">
                <p className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  👷 Benefits Dashboard
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Overzicht van je verlof, pensioenen trainingen en meer
                </p>
              </Card>

              <div className="grid grid-cols-2 gap-3">
                <Card className="p-4 bg-gradient-to-br from-green-50 to-teal-50 dark:from-green-950 dark:to-teal-950">
                  <p className="text-3xl mb-2">25</p>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Verlof dagen
                  </p>
                </Card>
                <Card className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950 dark:to-pink-950">
                  <p className="text-3xl mb-2">€500</p>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Training budget
                  </p>
                </Card>
              </div>

              {/* Coming Soon */}
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <p className="text-sm">🚀 Meer features coming soon...</p>
              </div>
            </motion.div>
          </TabsContent>

          {/* Achievements Tab */}
          <TabsContent value="achievements" className="mt-0 p-4 pb-24">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <AchievementBadges />
            </motion.div>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="mt-0 p-4 pb-24">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <Card className="p-4">
                <p className="font-medium text-gray-900 dark:text-white mb-4">
                  Instellingen
                </p>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between pb-3 border-b border-gray-200 dark:border-gray-700">
                    <span className="text-gray-700 dark:text-gray-300">
                      Email Notificaties
                    </span>
                    <input type="checkbox" defaultChecked className="w-4 h-4" />
                  </div>
                  <div className="flex items-center justify-between pb-3 border-b border-gray-200 dark:border-gray-700">
                    <span className="text-gray-700 dark:text-gray-300">
                      Push Notificaties
                    </span>
                    <input type="checkbox" defaultChecked className="w-4 h-4" />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-700 dark:text-gray-300">
                      Dark Mode
                    </span>
                    <input type="checkbox" className="w-4 h-4" />
                  </div>
                </div>
              </Card>

              <Card className="p-4 bg-gray-50 dark:bg-gray-800">
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  <strong>App Info</strong>
                  <br />
                  Version: 1.0.0
                  <br />
                  Werkgever: DIRQ Solutions
                </p>
              </Card>
            </motion.div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Quick Actions (Always visible) */}
      <QuickActions />
    </div>
  );
}
