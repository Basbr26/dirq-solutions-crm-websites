import { useAuth } from '@/hooks/useAuth';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { LogOut, Shield, Users, BarChart3 } from 'lucide-react';
import { DirqLogo } from './DirqLogo';
import { NotificationBell } from './NotificationBell';
import { ThemeToggle } from './ThemeToggle';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface DashboardHeaderProps {
  title: string;
  children?: React.ReactNode;
}

export function DashboardHeader({ title, children }: DashboardHeaderProps) {
  const { profile, signOut, role } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const getRoleLabel = () => {
    if (role === 'super_admin') return 'Super Admin';
    if (role === 'ADMIN') return 'Admin';
    if (role === 'SALES') return 'Sales';
    if (role === 'MANAGER') return 'Manager';
    if (role === 'SUPPORT') return 'Support';
    return 'Gebruiker';
  };

  const isOnExecutiveDashboard = location.pathname === '/dashboard/executive';

  return (
    <header className="bg-card border-b border-border">
      <div className="container mx-auto px-4 sm:px-6 py-3 sm:py-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0 flex-1">
            <DirqLogo size="sm" className="hidden sm:block flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <h1 className="text-lg sm:text-2xl font-bold text-foreground truncate">{title}</h1>
              <p className="text-xs sm:text-sm text-muted-foreground truncate">
                Welkom, {profile?.voornaam} {profile?.achternaam}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
            {children}
            
            {/* Executive Dashboard button for Admin/Super Admin */}
            {(role === 'ADMIN' || role === 'super_admin') && !isOnExecutiveDashboard && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => navigate('/dashboard/executive')}
                className="gap-2 hidden sm:flex"
              >
                <BarChart3 className="h-4 w-4" />
                Executive
              </Button>
            )}
            
            <ThemeToggle />
            <NotificationBell />
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2 px-2 sm:px-4">
                  <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-xs sm:text-sm font-semibold text-primary">
                      {profile?.voornaam?.[0]}{profile?.achternaam?.[0]}
                    </span>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div>
                    <p className="font-medium">{profile?.voornaam} {profile?.achternaam}</p>
                    <p className="text-xs text-muted-foreground">{getRoleLabel()}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                
                {/* Executive Dashboard for Admin/Super Admin (mobile) */}
                {(role === 'ADMIN' || role === 'super_admin') && !isOnExecutiveDashboard && (
                  <DropdownMenuItem onClick={() => navigate('/dashboard/executive')} className="cursor-pointer sm:hidden">
                    <BarChart3 className="mr-2 h-4 w-4" />
                    Executive Dashboard
                  </DropdownMenuItem>
                )}
                
                <DropdownMenuItem onClick={() => signOut()} className="text-destructive cursor-pointer">
                  <LogOut className="mr-2 h-4 w-4" />
                  Uitloggen
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
}
