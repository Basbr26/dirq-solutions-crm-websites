import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Home, Building2, Workflow, CheckSquare, BarChart3, Plus } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

interface NavItem {
  icon: React.ElementType;
  label: string;
  path: string;
  roles?: string[];
}

interface MobileBottomNavProps {
  onPrimaryAction?: () => void;
}

export function MobileBottomNav({ onPrimaryAction }: MobileBottomNavProps) {
  const { t } = useTranslation();
  const { role } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // CRM-focused navigation items
  const allNavItems: NavItem[] = [
    { 
      icon: Home, 
      label: 'Dashboard', 
      path: '/dashboard/crm',
      roles: ['ADMIN', 'SALES', 'MANAGER', 'SUPPORT']
    },
    { 
      icon: Building2, 
      label: 'Bedrijven', 
      path: '/companies',
      roles: ['ADMIN', 'SALES', 'MANAGER', 'SUPPORT']
    },
    { 
      icon: Workflow, 
      label: 'Pipeline', 
      path: '/pipeline',
      roles: ['ADMIN', 'SALES', 'MANAGER']
    },
    { 
      icon: CheckSquare, 
      label: 'Taken', 
      path: '/calendar',
      roles: ['ADMIN', 'SALES', 'MANAGER', 'SUPPORT']
    },
  ];

  // Super admin gets executive dashboard
  const superAdminNavItems: NavItem[] = [
    { icon: BarChart3, label: 'Executive', path: '/dashboard/executive' },
    { icon: Building2, label: 'Bedrijven', path: '/companies' },
    { icon: Workflow, label: 'Pipeline', path: '/pipeline' },
    { icon: CheckSquare, label: 'Taken', path: '/calendar' },
  ];

  // Filter nav items based on user role
  const navItems = role === 'super_admin' || role === 'ADMIN'
    ? superAdminNavItems
    : allNavItems.filter(item => !item.roles || item.roles.includes(role || ''));

  if (navItems.length === 0) return null;

  const handleNavClick = (item: NavItem) => {
    navigate(item.path);
  };

  const isActive = (item: NavItem) => {
    return location.pathname === item.path || location.pathname.startsWith(item.path + '/');
  };

  // Split nav items if we have a center action button
  const leftItems = onPrimaryAction ? navItems.slice(0, 2) : navItems;
  const rightItems = onPrimaryAction ? navItems.slice(2) : [];

  return (
    <nav 
      className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-t border-border md:hidden supports-[backdrop-filter]:bg-background/60"
      style={{
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      <div className="flex items-center justify-around h-16 px-2">
        {/* Left nav items */}
        {leftItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item);
          
          return (
            <button
              key={item.label}
              onClick={() => handleNavClick(item)}
              className={cn(
                // Minimum 44x44px touch target
                "flex flex-col items-center justify-center flex-1 h-full gap-1 transition-all duration-200 min-h-[44px]",
                "active:scale-95 touch-manipulation", // Touch feedback
                active 
                  ? "text-primary" 
                  : "text-muted-foreground active:text-foreground"
              )}
              aria-label={item.label}
              aria-current={active ? 'page' : undefined}
            >
              <Icon 
                className={cn(
                  "h-6 w-6 transition-all duration-200", // Larger icons for better visibility
                  active && "text-primary scale-110"
                )} 
              />
              <span className={cn(
                "text-[11px] font-medium transition-colors",
                active && "font-semibold"
              )}>
                {item.label}
              </span>
            </button>
          );
        })}
        
        {/* Center action button */}
        {onPrimaryAction && (
          <button
            onClick={onPrimaryAction}
            className="flex flex-col items-center justify-center flex-1 h-full gap-1 active:scale-95 touch-manipulation min-h-[44px]"
            aria-label={t('common.add')}
          >
            <div className="relative flex items-center justify-center">
              <div className="absolute inset-0 bg-primary rounded-full blur-md opacity-20" />
              <div className="relative h-12 w-12 bg-primary rounded-full flex items-center justify-center shadow-lg">
                <Plus className="h-6 w-6 text-primary-foreground" />
              </div>
            </div>
            <span className="text-[11px] font-medium text-primary">{t('common.add')}</span>
          </button>
        )}
        
        {/* Right nav items */}
        {rightItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item);
          
          return (
            <button
              key={item.label}
              onClick={() => handleNavClick(item)}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full gap-1 transition-all duration-200 min-h-[44px]",
                "active:scale-95 touch-manipulation",
                active 
                  ? "text-primary" 
                  : "text-muted-foreground active:text-foreground"
              )}
              aria-label={item.label}
              aria-current={active ? 'page' : undefined}
            >
              <Icon 
                className={cn(
                  "h-6 w-6 transition-all duration-200",
                  active && "text-primary scale-110"
                )} 
              />
              <span className={cn(
                "text-[11px] font-medium transition-colors",
                active && "font-semibold"
              )}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
