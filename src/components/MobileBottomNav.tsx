import { useLocation, useNavigate } from 'react-router-dom';
import { Home, ClipboardList, FileText, BarChart3, User, Users, Bell, Building2, Shield } from 'lucide-react';
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
          { icon: Home, label: 'Overzicht', path: '/dashboard/super-admin' },
          { icon: Users, label: 'Gebruikers', path: '/dashboard/super-admin', action: 'users' },
          { icon: Building2, label: 'Afdelingen', path: '/dashboard/super-admin', action: 'departments' },
          { icon: Shield, label: 'HR View', path: '/dashboard/hr' },
        ];
      case 'hr':
        return [
          { icon: Home, label: 'Overzicht', path: '/dashboard/hr', action: 'overview' },
          { icon: Users, label: 'Dossiers', path: '/dashboard/hr', action: 'cases' },
          { icon: ClipboardList, label: 'Taken', path: '/dashboard/hr', action: 'tasks' },
          { icon: BarChart3, label: 'Analyse', path: '/dashboard/hr', action: 'analytics' },
        ];
      case 'manager':
        return [
          { icon: Home, label: 'Overzicht', path: '/dashboard/manager', action: 'overview' },
          { icon: ClipboardList, label: 'Taken', path: '/dashboard/manager', action: 'tasks' },
          { icon: BarChart3, label: 'Analyse', path: '/dashboard/manager', action: 'analytics' },
        ];
      case 'medewerker':
        return [
          { icon: Home, label: 'Status', path: '/dashboard/medewerker' },
          { icon: FileText, label: 'Documenten', path: '/dashboard/medewerker', action: 'documents' },
          { icon: Bell, label: 'Updates', path: '/dashboard/medewerker', action: 'timeline' },
        ];
      default:
        return [];
    }
  };

  const navItems = getNavItems();

  if (navItems.length === 0) return null;

  const handleNavClick = (item: NavItem) => {
    if (item.path) {
      // Navigate to the path and emit a custom event for tab switching
      navigate(item.path);
      if (item.action) {
        // Dispatch custom event for tab switching within the page
        window.dispatchEvent(new CustomEvent('nav-tab-change', { detail: item.action }));
      }
    }
  };

  const isActive = (item: NavItem) => {
    return location.pathname === item.path;
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border sm:hidden">
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
