import { ReactNode, useState } from 'react';
import { AppSidebar } from './AppSidebar';
import { AppHeader } from './AppHeader';
import { MobileBottomNav } from '@/components/MobileBottomNav';
import { BottomNav } from './BottomNav';
import { QuickActionSheet } from './QuickActionSheet';

interface AppLayoutProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
}

export function AppLayout({ children, title, subtitle, actions }: AppLayoutProps) {
  const [showQuickActions, setShowQuickActions] = useState(false)
  
  return (
    <div className="min-h-screen flex w-full bg-background">
      <AppSidebar />
      
      <div className="flex-1 flex flex-col min-w-0">
        <AppHeader title={title} subtitle={subtitle} actions={actions} />
        
        <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
          {children}
        </main>
      </div>
      
      {/* Old mobile bottom nav (can be removed after testing) */}
      <MobileBottomNav />
      
      {/* New bottom nav with quick actions */}
      <BottomNav onActionClick={() => setShowQuickActions(true)} />
      
      {/* Quick actions sheet */}
      <QuickActionSheet
        open={showQuickActions}
        onClose={() => setShowQuickActions(false)}
      />
    </div>
  );
}
