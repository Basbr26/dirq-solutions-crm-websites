import { ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { NotificationBell } from '@/components/NotificationBell';
import { ThemeToggle } from '@/components/ThemeToggle';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { LogOut, Menu, X } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { DirqLogo } from '@/components/DirqLogo';
import { useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Users,
  Building2,
  FolderKanban,
  FileText,
  MessageSquare,
  TrendingUp,
  Settings,
  Shield,
} from 'lucide-react';

interface AppHeaderProps {
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
}

export function AppHeader({ title, subtitle, actions }: AppHeaderProps) {
  const { t } = useTranslation();
  const { profile, signOut, role } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const getRoleLabel = () => {
    if (role === 'ADMIN' || role === 'super_admin') return 'Administrator';
    if (role === 'SALES') return 'Sales';
    if (role === 'MANAGER') return 'Manager';
    if (role === 'SUPPORT') return 'Support';
    return t('common.user') || 'Gebruiker';
  };

  const getNavGroups = () => {
    const baseGroups = [
      {
        title: t('common.overview') || 'Overzicht',
        items: [
          { 
            title: t('navigation.dashboard'), 
            icon: LayoutDashboard, 
            href: role === 'ADMIN' || role === 'super_admin' ? '/dashboard/super-admin' : '/companies'
          },
        ],
      },
      {
        title: 'CRM',
        items: [
          { title: t('navigation.companies'), icon: Building2, href: '/companies' },
          { title: t('navigation.contacts'), icon: Users, href: '/contacts' },
          ...(role === 'ADMIN' || role === 'SALES' || role === 'MANAGER' || role === 'super_admin' ? [
            { title: t('navigation.projects'), icon: FolderKanban, href: '/projects' },
            { title: t('navigation.salesOverview'), icon: TrendingUp, href: '/pipeline' },
            { title: t('navigation.quotes'), icon: FileText, href: '/quotes' },
          ] : []),
          { title: t('navigation.activities'), icon: MessageSquare, href: '/interactions' },
        ],
      },
    ];

    if (role === 'ADMIN' || role === 'super_admin') {
      baseGroups.push({
        title: t('common.administration') || 'Administratie',
        items: [
          { title: t('navigation.settings'), icon: Settings, href: '/settings' },
          { title: t('common.userManagement') || 'Gebruikersbeheer', icon: Shield, href: '/admin/gebruikers' },
        ],
      });
    }

    return baseGroups.map(group => ({
      ...group,
      items: group.items.filter(item => item),
    })).filter(group => group.items.length > 0);
  };

  const navGroups = getNavGroups();

  const handleNavClick = (href: string) => {
    navigate(href);
    setMobileMenuOpen(false);
  };

  const isActive = (href: string) => {
    return location.pathname === href || location.pathname.startsWith(href + '/');
  };

  return (
    <>
    <header className="sticky top-0 z-40 bg-card border-b border-border">
      <div className="flex items-center justify-between h-16 px-4 md:px-6 gap-4">
        {/* Mobile Menu Button & Logo */}
        <div className="flex items-center gap-2 md:hidden">
          <Button
            variant="ghost"
            size="sm"
            className="h-10 w-10 p-0"
            onClick={() => setMobileMenuOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <DirqLogo size="sm" />
        </div>

        {/* Title section - hidden on mobile, visible on desktop */}
        <div className="hidden md:block min-w-0 flex-1">
          {title && (
            <div>
              <h1 className="text-xl font-semibold text-foreground truncate">{title}</h1>
              {subtitle && (
                <p className="text-sm text-muted-foreground truncate">{subtitle}</p>
              )}
            </div>
          )}
        </div>

        {/* Actions & Profile */}
        <div className="flex items-center gap-2 md:gap-4">
          {/* Hide actions on mobile - they'll show in FAB instead */}
          <div className="hidden md:flex items-center gap-2">
            {actions}
          </div>
          
          <LanguageSwitcher />
          <ThemeToggle />
          <NotificationBell />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-2 px-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={profile?.avatar_url || undefined} alt={`${profile?.voornaam} ${profile?.achternaam}`} />
                  <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                    {profile?.voornaam?.[0]}{profile?.achternaam?.[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden md:block text-left">
                  <p className="text-sm font-medium">{profile?.voornaam} {profile?.achternaam}</p>
                  <p className="text-xs text-muted-foreground">{getRoleLabel()}</p>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <p className="font-medium">{profile?.voornaam} {profile?.achternaam}</p>
                <p className="text-xs text-muted-foreground">{profile?.email}</p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => signOut()} className="text-destructive cursor-pointer">
                <LogOut className="mr-2 h-4 w-4" />
                {t('auth.logout')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>

    {/* Mobile Navigation Sheet */}
    <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
      <SheetContent side="left" className="w-[280px] p-0">
        <SheetHeader className="border-b p-4">
          <div className="flex items-center justify-center">
            <DirqLogo size="md" />
          </div>
        </SheetHeader>
        <div className="overflow-y-auto h-[calc(100vh-5rem)] py-4">
          <nav className="space-y-6 px-3">
            {navGroups.map((group) => (
              <div key={group.title}>
                <h3 className="px-3 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {group.title}
                </h3>
                <div className="space-y-1">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.href);
                    return (
                      <Button
                        key={item.href}
                        variant="ghost"
                        className={cn(
                          'w-full justify-start gap-3 h-11 px-3 font-normal',
                          active && 'bg-primary/10 text-primary font-medium hover:bg-primary/15',
                          !active && 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                        )}
                        onClick={() => handleNavClick(item.href)}
                      >
                        <Icon className={cn('h-5 w-5 flex-shrink-0', active && 'text-primary')} />
                        <span className="truncate">{item.title}</span>
                      </Button>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </div>
      </SheetContent>
    </Sheet>
    </>
  );
}
