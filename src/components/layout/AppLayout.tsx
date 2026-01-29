import { ReactNode, useState } from 'react';
import { AppSidebar } from './AppSidebar';
import { AppHeader } from './AppHeader';
import { MobileBottomNav } from '@/components/MobileBottomNav';
import { QuickActionSheet } from './QuickActionSheet';
import { CommandBar } from '@/components/CommandBar';
import { ChatWidget } from '@/components/ai/ChatWidget';

interface AppLayoutProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  hideQuickAction?: boolean; // Hide the quick action button on specific pages
  onPrimaryAction?: () => void; // Primary action for mobile FAB
}

export function AppLayout({ 
  children, 
  title, 
  subtitle, 
  actions, 
  hideQuickAction = false,
  onPrimaryAction,
}: AppLayoutProps) {
  const [showQuickActions, setShowQuickActions] = useState(false)
  
  return (
    // Layout with fixed sidebar and sticky header
    <div className="min-h-screen flex w-full bg-background overflow-hidden">
      <AppSidebar />
      
      {/* Main content area with sticky header */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <AppHeader title={title} subtitle={subtitle} actions={actions} />
        
        {/* Scrollable content area */}
        <main 
          className="flex-1 overflow-y-auto overflow-x-hidden md:pb-0"
          style={{
            paddingBottom: 'calc(4rem + env(safe-area-inset-bottom, 0px))', // 4rem = 64px (h-16 nav height)
          }}
        >
          {/* Desktop: Max-width container with padding. Mobile: Full width with minimal horizontal padding */}
          <div className="w-full lg:max-w-[1400px] lg:mx-auto px-3 sm:px-4 md:px-8 py-4 md:py-6 overflow-x-hidden">
            {children}
          </div>
        </main>
      </div>
      
      {/* Mobile bottom nav */}
      <MobileBottomNav onPrimaryAction={onPrimaryAction} />
      
      {/* Quick actions sheet */}
      {!hideQuickAction && (
        <QuickActionSheet
          open={showQuickActions}
          onClose={() => setShowQuickActions(false)}
        />
      )}
      
      {/* AI Command Bar - accessible via Cmd/Ctrl+K */}
      <CommandBar variant="floating" />

      {/* AI Chat Widget - accessible via Cmd/Ctrl+J */}
      <ChatWidget />
    </div>
  );
}
