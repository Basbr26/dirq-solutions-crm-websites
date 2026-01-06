import { ReactNode, useState } from 'react';
import { AppSidebar } from './AppSidebar';
import { AppHeader } from './AppHeader';
import { MobileBottomNav } from '@/components/MobileBottomNav';
import { QuickActionSheet } from './QuickActionSheet';

interface AppLayoutProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  hideQuickAction?: boolean; // Hide the quick action button on specific pages
}

export function AppLayout({ children, title, subtitle, actions, hideQuickAction = false }: AppLayoutProps) {
  const [showQuickActions, setShowQuickActions] = useState(false)
  
  return (
    <div className="min-h-screen flex w-full bg-background">
      <AppSidebar />
      
      <div className="flex-1 flex flex-col min-w-0">
        <AppHeader title={title} subtitle={subtitle} actions={actions} />
        
        {/* Mobile: Add bottom padding for nav + safe area. Desktop: No padding */}
        <main 
          className="flex-1 overflow-y-auto md:pb-0"
          style={{
            paddingBottom: 'calc(4rem + env(safe-area-inset-bottom, 0px))', // 4rem = 64px (h-16 nav height)
          }}
        >
          {/* Desktop: Max-width container with padding. Mobile: Full width with minimal horizontal padding */}
          <div className="w-full lg:max-w-[1400px] lg:mx-auto px-4 md:px-8 py-4 md:py-6">
            {children}
          </div>
        </main>
      </div>
      
      {/* Mobile bottom nav */}
      <MobileBottomNav />
      
      {/* Quick actions sheet */}
      {!hideQuickAction && (
        <QuickActionSheet
          open={showQuickActions}
          onClose={() => setShowQuickActions(false)}
        />
      )}
    </div>
  );
}
