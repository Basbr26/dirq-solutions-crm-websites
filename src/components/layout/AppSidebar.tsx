import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { DirqLogo } from '@/components/DirqLogo';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  LayoutDashboard,
  Users,
  Building2,
  FolderKanban,
  FileText,
  MessageSquare,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  Settings,
  Shield,
  Layers,
  Calendar,
} from 'lucide-react';

interface NavItem {
  title: string;
  icon: React.ElementType;
  href: string;
  roles?: string[];
  badge?: number;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const getNavGroups = (role: string | null): NavGroup[] => {
  const baseGroups: NavGroup[] = [
    {
      title: 'Overzicht',
      items: [
        { 
          title: 'Dashboard', 
          icon: LayoutDashboard, 
          href: role === 'super_admin' ? '/dashboard/super-admin' 
               : role === 'ADMIN' ? '/dashboard/executive'
               : '/dashboard/crm'
        },
      ],
    },
    {
      title: 'CRM',
      items: [
        { title: 'Bedrijven', icon: Building2, href: '/companies', roles: ['ADMIN', 'SALES', 'MANAGER', 'SUPPORT', 'super_admin'] },
        { title: 'Contacten', icon: Users, href: '/contacts', roles: ['ADMIN', 'SALES', 'MANAGER', 'SUPPORT', 'super_admin'] },
        { title: 'Projecten', icon: FolderKanban, href: '/projects', roles: ['ADMIN', 'SALES', 'MANAGER', 'super_admin'] },
        { title: 'Pipeline', icon: TrendingUp, href: '/pipeline', roles: ['ADMIN', 'SALES', 'MANAGER', 'super_admin'] },
        { title: 'Offertes', icon: FileText, href: '/quotes', roles: ['ADMIN', 'SALES', 'MANAGER', 'super_admin'] },
        { title: 'Activiteiten', icon: MessageSquare, href: '/interactions', roles: ['ADMIN', 'SALES', 'MANAGER', 'SUPPORT', 'super_admin'] },
        { title: 'Agenda', icon: Calendar, href: '/calendar', roles: ['ADMIN', 'SALES', 'MANAGER', 'super_admin'] },
      ],
    },
  ];

  // Admin-only section
  if (role === 'ADMIN' || role === 'super_admin') {
    baseGroups.push({
      title: 'Administratie',
      items: [
        { title: 'Instellingen', icon: Settings, href: '/settings', roles: ['ADMIN', 'super_admin'] },
        { title: 'Gebruikersbeheer', icon: Shield, href: '/admin/gebruikers', roles: ['ADMIN', 'super_admin'] },
      ],
    });
  }

  // Filter items based on role
  return baseGroups.map(group => ({
    ...group,
    items: group.items.filter(item => !item.roles || (role && item.roles.includes(role))),
  })).filter(group => group.items.length > 0);
};

export function AppSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { role } = useAuth();

  const navGroups = getNavGroups(role);

  const isActive = (href: string) => {
    return location.pathname === href || location.pathname.startsWith(href + '/');
  };

  const NavButton = ({ item }: { item: NavItem }) => {
    const active = isActive(item.href);
    const Icon = item.icon;

    const button = (
      <Button
        variant="ghost"
        className={cn(
          'w-full justify-start gap-3 h-10 px-3 font-normal',
          active && 'bg-primary/10 text-primary font-medium hover:bg-primary/15',
          !active && 'text-muted-foreground hover:text-foreground hover:bg-muted/50',
          collapsed && 'justify-center px-0'
        )}
        onClick={() => navigate(item.href)}
      >
        <Icon className={cn('h-4 w-4 flex-shrink-0', active && 'text-primary')} />
        {!collapsed && (
          <span className="truncate">{item.title}</span>
        )}
        {!collapsed && item.badge && (
          <span className="ml-auto bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full">
            {item.badge}
          </span>
        )}
      </Button>
    );

    if (collapsed) {
      return (
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>{button}</TooltipTrigger>
          <TooltipContent side="right" className="flex items-center gap-2">
            {item.title}
            {item.badge && (
              <span className="bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full">
                {item.badge}
              </span>
            )}
          </TooltipContent>
        </Tooltip>
      );
    }

    return button;
  };

  return (
    <aside
      className={cn(
        'hidden md:flex flex-col border-r border-border bg-card transition-all duration-300 sticky top-0 h-screen',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Header */}
      <div className={cn(
        'flex items-center h-16 border-b border-border px-4 bg-card',
        collapsed ? 'justify-center' : 'justify-between'
      )}>
        {!collapsed && (
          <div className="flex items-center gap-3">
            <DirqLogo size="sm" />
            <div className="flex flex-col">
              <span className="font-semibold text-sm">Dirq CRM</span>
              <span className="text-xs text-muted-foreground">Website Sales</span>
            </div>
          </div>
        )}
        {collapsed && <DirqLogo size="sm" />}
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 py-4">
        <nav className="space-y-6 px-3">
          {navGroups.map((group) => (
            <div key={group.title}>
              {!collapsed && (
                <h3 className="px-3 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {group.title}
                </h3>
              )}
              <div className="space-y-1">
                {group.items.map((item) => (
                  <NavButton key={item.href} item={item} />
                ))}
              </div>
            </div>
          ))}
        </nav>
      </ScrollArea>

      {/* Footer - Collapse toggle */}
      <div className="border-t border-border p-3">
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            'w-full text-muted-foreground hover:text-foreground',
            collapsed ? 'justify-center' : 'justify-start gap-2'
          )}
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <>
              <ChevronLeft className="h-4 w-4" />
              <span>Inklappen</span>
            </>
          )}
        </Button>
      </div>
    </aside>
  );
}
