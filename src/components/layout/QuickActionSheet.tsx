import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { 
  UserPlus, 
  ClipboardList, 
  Calendar, 
  FileText,
  AlertCircle,
  CheckSquare
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'

interface QuickActionSheetProps {
  open: boolean
  onClose: () => void
}

export const QuickActionSheet = ({ open, onClose }: QuickActionSheetProps) => {
  const navigate = useNavigate()
  const { role } = useAuth()
  
  const getActions = () => {
    if (role === 'hr' || role === 'super_admin') {
      return [
        { icon: UserPlus, label: 'Nieuwe Medewerker', href: '/hr/medewerkers/new' },
        { icon: Calendar, label: 'Verlof Goedkeuren', href: '/hr/verlof' },
        { icon: AlertCircle, label: 'Ziekmelding', href: '/verzuim/new' },
        { icon: FileText, label: 'Document Genereren', href: '/documents/generate' },
      ]
    }
    
    if (role === 'manager') {
      return [
        { icon: Calendar, label: 'Team Planning', href: '/manager/planning' },
        { icon: CheckSquare, label: 'Goedkeuringen', href: '/manager/approvals' },
        { icon: AlertCircle, label: 'Ziekmelding Melden', href: '/verzuim/new' },
        { icon: ClipboardList, label: 'Taken Bekijken', href: '/manager/tasks' },
      ]
    }
    
    // Employee actions
    return [
      { icon: Calendar, label: 'Verlof Aanvragen', href: '/employee/verlof/new' },
      { icon: AlertCircle, label: 'Ziekmelding', href: '/employee/verzuim/new' },
      { icon: FileText, label: 'Documenten', href: '/employee/documents' },
      { icon: ClipboardList, label: 'Mijn Taken', href: '/employee/tasks' },
    ]
  }
  
  const actions = getActions()
  
  const handleAction = (href: string) => {
    navigate(href)
    onClose()
  }
  
  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent 
        side="bottom" 
        className="h-auto rounded-t-2xl"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 1rem)' }}
      >
        <SheetHeader>
          <SheetTitle>Snelle Acties</SheetTitle>
        </SheetHeader>
        
        <div className="grid grid-cols-2 gap-3 mt-4">
          {actions.map((action) => (
            <Button
              key={action.href}
              variant="outline"
              className="h-24 flex-col gap-2"
              onClick={() => handleAction(action.href)}
            >
              <action.icon className="h-6 w-6" />
              <span className="text-sm text-center">{action.label}</span>
            </Button>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  )
}
