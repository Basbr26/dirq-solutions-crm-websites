import { useAuth } from '@/hooks/useAuth';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { LogOut, Shield, Users } from 'lucide-react';
import { DirqLogo } from './DirqLogo';
import { NotificationBell } from './NotificationBell';
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
    if (role === 'hr') return 'HR Medewerker';
    if (role === 'manager') return 'Manager';
    return 'Medewerker';
  };

  const isOnSuperAdminDashboard = location.pathname === '/dashboard/super-admin';
  const isOnHRDashboard = location.pathname === '/dashboard/hr';

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
            
            {/* Dashboard switcher for super_admin */}
            {role === 'super_admin' && (
              <div className="hidden sm:flex">
                {isOnSuperAdminDashboard ? (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => navigate('/dashboard/hr')}
                    className="gap-2"
                  >
                    <Users className="h-4 w-4" />
                    HR Dashboard
                  </Button>
                ) : isOnHRDashboard ? (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => navigate('/dashboard/super-admin')}
                    className="gap-2"
                  >
                    <Shield className="h-4 w-4" />
                    Admin Dashboard
                  </Button>
                ) : null}
              </div>
            )}
            
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
                
                {/* Mobile dashboard switcher for super_admin */}
                {role === 'super_admin' && (
                  <>
                    {isOnSuperAdminDashboard && (
                      <DropdownMenuItem onClick={() => navigate('/dashboard/hr')} className="cursor-pointer sm:hidden">
                        <Users className="mr-2 h-4 w-4" />
                        HR Dashboard
                      </DropdownMenuItem>
                    )}
                    {isOnHRDashboard && (
                      <DropdownMenuItem onClick={() => navigate('/dashboard/super-admin')} className="cursor-pointer sm:hidden">
                        <Shield className="mr-2 h-4 w-4" />
                        Admin Dashboard
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator className="sm:hidden" />
                  </>
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
