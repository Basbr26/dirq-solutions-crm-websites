import { ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { NotificationBell } from '@/components/NotificationBell';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Button } from '@/components/ui/button';
import { LogOut, Menu } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { DirqLogo } from '@/components/DirqLogo';

interface AppHeaderProps {
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
}

export function AppHeader({ title, subtitle, actions }: AppHeaderProps) {
  const { profile, signOut, role } = useAuth();

  const getRoleLabel = () => {
    if (role === 'super_admin') return 'Super Admin';
    if (role === 'hr') return 'HR Medewerker';
    if (role === 'manager') return 'Manager';
    return 'Medewerker';
  };

  return (
    <header className="sticky top-0 z-40 bg-card border-b border-border">
      <div className="flex items-center justify-between h-16 px-4 md:px-6 gap-4">
        {/* Mobile Logo */}
        <div className="flex items-center gap-3 md:hidden">
          <DirqLogo size="sm" />
          <span className="font-semibold">Dirq HR</span>
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
          {actions}
          
          <ThemeToggle />
          <NotificationBell />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-2 px-2">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-sm font-semibold text-primary">
                    {profile?.voornaam?.[0]}{profile?.achternaam?.[0]}
                  </span>
                </div>
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
                Uitloggen
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
