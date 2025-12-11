import { ReactNode } from 'react';
import { AppSidebar } from './AppSidebar';
import { AppHeader } from './AppHeader';
import { MobileBottomNav } from '@/components/MobileBottomNav';

interface AppLayoutProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
}

export function AppLayout({ children, title, subtitle, actions }: AppLayoutProps) {
  return (
    <div className="min-h-screen flex w-full bg-background">
      <AppSidebar />
      
      <div className="flex-1 flex flex-col min-w-0">
        <AppHeader title={title} subtitle={subtitle} actions={actions} />
        
        <main className="flex-1 overflow-auto pb-20 md:pb-0">
          {children}
        </main>
      </div>
      
      <MobileBottomNav />
    </div>
  );
}
