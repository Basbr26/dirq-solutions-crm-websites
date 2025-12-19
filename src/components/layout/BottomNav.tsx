import { Home, Users, Plus, Calendar, MessageSquare } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'

interface NavItem {
  icon: React.ComponentType<{ className?: string }>
  label: string
  href: string
  badge?: number
  action?: boolean
}

interface BottomNavProps {
  onActionClick?: () => void
}

export const BottomNav = ({ onActionClick }: BottomNavProps) => {
  const location = useLocation()
  const { role } = useAuth()
  
  // Determine nav items based on user role
  const getNavItems = (): NavItem[] => {
    if (role === 'hr' || role === 'super_admin') {
      return [
        { icon: Home, label: 'Dashboard', href: '/hr/dashboard' },
        { icon: Users, label: 'Team', href: '/hr/medewerkers' },
        { icon: Plus, label: '', href: '#', action: true },
        { icon: Calendar, label: 'Verlof', href: '/hr/verlof' },
        { icon: MessageSquare, label: 'AI', href: '/ai-chat' },
      ]
    }
    
    if (role === 'manager') {
      return [
        { icon: Home, label: 'Dashboard', href: '/dashboard/manager' },
        { icon: Users, label: 'Team', href: '/manager/team' },
        { icon: Plus, label: '', href: '#', action: true },
        { icon: Calendar, label: 'Planning', href: '/manager/planning' },
        { icon: MessageSquare, label: 'Chat', href: '/ai-chat' },
      ]
    }
    
    // Employee navigation
    return [
      { icon: Home, label: 'Home', href: '/employee' },
      { icon: Calendar, label: 'Verlof', href: '/employee/verlof' },
      { icon: Plus, label: '', href: '#', action: true },
      { icon: Calendar, label: 'Afwezig', href: '/employee/absence' },
      { icon: MessageSquare, label: 'Help', href: '/ai-chat' },
    ]
  }
  
  const navItems = getNavItems()
  const isActive = (href: string) => location.pathname === href
  
  return (
    <nav 
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden"
      style={{
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      {/* Backdrop blur effect */}
      <div className="absolute inset-0 bg-background/80 backdrop-blur-md border-t" />
      
      {/* Nav items */}
      <div className="relative flex items-center justify-around h-16 px-2">
        {navItems.map((item, index) => {
          const Icon = item.icon
          const active = isActive(item.href)
          
          // Center action button (special styling)
          if (item.action) {
            return (
              <button
                key="action"
                onClick={onActionClick}
                className="flex items-center justify-center w-14 h-14 -mt-8 rounded-full bg-primary text-primary-foreground shadow-lg hover:scale-105 transition-transform"
              >
                <Icon className="h-6 w-6" />
              </button>
            )
          }
          
          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                "flex flex-col items-center justify-center min-w-[60px] h-full gap-1 transition-colors relative",
                active 
                  ? "text-primary" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {/* Badge indicator */}
              {item.badge && item.badge > 0 && (
                <span className="absolute top-1 right-1/2 translate-x-3 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-medium text-white bg-destructive rounded-full">
                  {item.badge > 9 ? '9+' : item.badge}
                </span>
              )}
              
              <Icon className={cn(
                "h-5 w-5 transition-all",
                active && "scale-110"
              )} />
              
              <span className={cn(
                "text-[11px] font-medium transition-all",
                active && "scale-105"
              )}>
                {item.label}
              </span>
              
              {/* Active indicator */}
              {active && (
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />
              )}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
