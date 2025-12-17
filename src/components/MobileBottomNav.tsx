import { useLocation, useNavigate } from 'react-router-dom';
import { Home, ClipboardList, FileText, BarChart3, User, Users, Bell, Building2, Shield, Calendar, Heart } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

interface NavItem {
  icon: React.ElementType;
  label: string;
  path?: string;
  action?: string;
}

export function MobileBottomNav() {
  const { role } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const getNavItems = (): NavItem[] => {
    switch (role) {
      case 'super_admin':
        return [
          { icon: Home, label: 'Dashboard', path: '/hr/dashboard' },
          { icon: Users, label: 'Medewerkers', path: '/hr/medewerkers' },
          { icon: Heart, label: 'Verzuim', path: '/hr/dashboard' },
          { icon: Calendar, label: 'Verlof', path: '/hr/verlof' },
        ];
      case 'hr':
        return [
          { icon: Home, label: 'Dashboard', path: '/hr/dashboard' },
          { icon: Users, label: 'Medewerkers', path: '/hr/medewerkers' },
          { icon: Heart, label: 'Verzuim', path: '/hr/dashboard', action: 'cases' },
          { icon: Calendar, label: 'Verlof', path: '/hr/verlof' },
        ];
      case 'manager':
        return [
          { icon: Home, label: 'Dashboard', path: '/dashboard/manager' },
          { icon: Users, label: 'Team', path: '/hr/medewerkers' },
          { icon: Heart, label: 'Verzuim', path: '/dashboard/manager' },
          { icon: Calendar, label: 'Verlof', path: '/hr/verlof' },
        ];
      case 'medewerker':
        return [
          { icon: Home, label: 'Portal', path: '/employee' },
          { icon: Calendar, label: 'Verlof', path: '/employee', action: 'leave' },
          { icon: FileText, label: 'Documenten', path: '/employee', action: 'documents' },
          { icon: Bell, label: 'Updates', path: '/employee', action: 'feed' },
        ];
      default:
        return [];
    }
  };

  const navItems = getNavItems();

  if (navItems.length === 0) return null;

  const handleNavClick = (item: NavItem) => {
    if (item.path) {
      navigate(item.path);
      if (item.action) {
        window.dispatchEvent(new CustomEvent('nav-tab-change', { detail: item.action }));
      }
    }
  };

  const isActive = (item: NavItem) => {
    if (!item.path) return false;
    return location.pathname === item.path || location.pathname.startsWith(item.path + '/');
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border md:hidden">
      <div className="flex items-center justify-around h-16 px-2 safe-area-inset-bottom">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item);
          
          return (
            <button
              key={item.label}
              onClick={() => handleNavClick(item)}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors",
                active 
                  ? "text-primary" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className={cn("h-5 w-5", active && "text-primary")} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
