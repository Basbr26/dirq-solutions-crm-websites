import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { DirqLogo } from '@/components/DirqLogo';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { supabase } from '@/integrations/supabase/client';
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
  Mail,
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

const getNavGroups = (role: string | null, t: (key: string) => string, draftCount?: number): NavGroup[] => {
  const baseGroups: NavGroup[] = [
    {
      title: t('common.overview'),
      items: [
        { 
          title: t('navigation.dashboard'), 
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
        { title: t('navigation.companies'), icon: Building2, href: '/companies', roles: ['ADMIN', 'SALES', 'MANAGER', 'SUPPORT', 'super_admin'] },
        { title: t('navigation.contacts'), icon: Users, href: '/contacts', roles: ['ADMIN', 'SALES', 'MANAGER', 'SUPPORT', 'super_admin'] },
        { title: t('navigation.projects'), icon: FolderKanban, href: '/projects', roles: ['ADMIN', 'SALES', 'MANAGER', 'super_admin'] },
        { title: t('navigation.salesOverview'), icon: TrendingUp, href: '/pipeline', roles: ['ADMIN', 'SALES', 'MANAGER', 'super_admin'] },
        { title: t('navigation.quotes'), icon: FileText, href: '/quotes', roles: ['ADMIN', 'SALES', 'MANAGER', 'super_admin'] },
        { title: t('navigation.activities'), icon: MessageSquare, href: '/interactions', roles: ['ADMIN', 'SALES', 'MANAGER', 'SUPPORT', 'super_admin'] },
        { title: t('common.calendar') || 'Agenda', icon: Calendar, href: '/calendar', roles: ['ADMIN', 'SALES', 'MANAGER', 'super_admin'] },
      ],
    },
    {
      title: t('common.automation') || 'Automatisering',
      items: [
        { title: t('navigation.emailDrafts'), icon: Mail, href: '/email-drafts', roles: ['ADMIN', 'MANAGER', 'SALES', 'super_admin'], badge: draftCount },
        { title: t('common.documents') || 'Documenten', icon: FileText, href: '/documents/templates', roles: ['ADMIN', 'MANAGER', 'SALES', 'super_admin'] },
      ],
    },
  ];

  // Admin-only section
  if (role === 'ADMIN' || role === 'super_admin') {
    baseGroups.push({
      title: t('common.administration'),
      items: [
        { title: t('navigation.settings'), icon: Settings, href: '/settings', roles: ['ADMIN', 'super_admin'] },
        { title: t('common.userManagement'), icon: Shield, href: '/admin/gebruikers', roles: ['ADMIN', 'super_admin'] },
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
  const { t } = useTranslation();
  const [collapsed, setCollapsed] = useState(false);
  const [draftCount, setDraftCount] = useState<number>(0);
  const location = useLocation();
  const navigate = useNavigate();
  const { role } = useAuth();

  // Fetch draft count
  useEffect(() => {
    async function fetchDraftCount() {
      const { count, error } = await supabase
        .from('email_drafts')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'draft');
      
      if (!error && count !== null) {
        setDraftCount(count);
      }
    }

    fetchDraftCount();

    // Set up realtime subscription for draft count updates
    const channel = supabase
      .channel('email_drafts_count')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'email_drafts',
          filter: 'status=eq.draft'
        },
        () => {
          fetchDraftCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const navGroups = getNavGroups(role, t, draftCount);

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
        'flex items-center h-16 border-b border-border px-4 bg-card cursor-pointer hover:bg-muted/50 transition-colors',
        collapsed ? 'justify-center' : 'justify-between'
      )}
      onClick={() => navigate(role === 'super_admin' ? '/dashboard/super-admin' 
               : role === 'ADMIN' ? '/dashboard/executive'
               : '/dashboard/crm')}
      >
        {!collapsed && (
          <div className="flex items-center gap-3">
            <DirqLogo size="sm" />
            <div className="flex flex-col">
              <span className="font-semibold text-sm">CRM</span>
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
              <span>{t('common.collapse') || 'Inklappen'}</span>
            </>
          )}
        </Button>
      </div>
    </aside>
  );
}
